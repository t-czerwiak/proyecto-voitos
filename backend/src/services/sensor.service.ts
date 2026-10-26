import { supabase } from "../config/supabase";
import { Confirmacion, Dispensar } from "../schemas/sensor.schema";
import { getHoraArgentina, getTramosVentana } from "../utils/tiempo";
import { ErrorHttp } from "../utils/errores";
import { formatearFecha, formatearHora } from "./plantillas-mail";

const APP_URL = (process.env.APP_URL ?? "http://localhost:8081").replace(/\/$/, "");
import { getModuloDePastilla, descontarDelModulo } from "./modulos.service";
import { avisarDispensacionOk, avisarPastilleroVacio } from "./email.service";
import { Alcance, alcanceDe, filtrarPorAlcance } from "./pastilleros.service";

const MINUTOS_VENTANA = 15;

export const getPendiente = async (alcance: Alcance) => {
  const { hoy, hora, minuto } = getHoraArgentina();

  const filtro = getTramosVentana(hoy, hora, minuto, MINUTOS_VENTANA)
    .map(
      (t) =>
        `and(dia.eq.${t.dia},hora.eq.${t.hora},minuto.gte.${t.desde},minuto.lte.${t.hasta})`
    )
    .join(",");

  const consulta = supabase
    .from("horarios")
    .select("id, pastilla_id, hora, minuto, cantidad, pastillas!inner(usuario_id)")
    .eq("dispensado", false)
    .or(filtro);

  const { data: fila, error } = await filtrarPorAlcance(consulta, alcance, "pastillas.usuario_id")
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const data = fila ? (({ pastillas, ...h }: any) => h)(fila) : null;

  if (!data) {
    return { pendiente: false, horario: null, modulo: null, disponibles: null };
  }

  const modulo = await getModuloDePastilla(data.pastilla_id);

  return {
    pendiente: true,
    horario: data,
    modulo: modulo?.numero ?? null,
    disponibles: modulo?.cantidad_actual ?? null,
  };
};

const TIMEOUT_DISPOSITIVO_MS = 6000;

export const enviarSenalDispensar = async (body: Dispensar) => {
  const destino = body.destino ?? process.env.ESP32_URL;

  if (!destino) {
    throw new ErrorHttp(
      400,
      "No hay a donde mandar la senal: pasa 'destino' en el body o configura ESP32_URL en el .env"
    );
  }

  let horario_id = body.horario_id ?? null;
  let cantidadDelHorario: number | null = null;
  let pastillaId: string | null = null;

  if (horario_id) {
    const { data } = await supabase
      .from("horarios")
      .select("cantidad, pastilla_id")
      .eq("id", horario_id)
      .maybeSingle();
    cantidadDelHorario = data?.cantidad ?? null;
    pastillaId = data?.pastilla_id ?? null;
  } else {
    const pendiente = await getPendiente(await alcanceDe());
    horario_id = pendiente.horario?.id ?? null;
    cantidadDelHorario = pendiente.horario?.cantidad ?? null;
    pastillaId = pendiente.horario?.pastilla_id ?? null;
  }

  const cantidad = body.cantidad ?? cantidadDelHorario ?? 1;

  if (pastillaId) {
    const modulo = await getModuloDePastilla(pastillaId);

    if (modulo && modulo.cantidad_actual < cantidad) {
      throw new ErrorHttp(
        409,
        `Cantidad insuficiente: el modulo ${modulo.numero} tiene ${modulo.cantidad_actual} ` +
          `pastilla(s) y la dosis necesita ${cantidad}. Hay que recargarlo.`
      );
    }
  }

  const base = destino.startsWith("http://") || destino.startsWith("https://")
    ? destino
    : `http://${destino}`;

  const params = new URLSearchParams({ cantidad: String(cantidad) });
  if (horario_id) params.set("horario_id", horario_id);

  const url = `${base}/dispense?${params.toString()}`;

  const cancelar = AbortSignal.timeout(TIMEOUT_DISPOSITIVO_MS);

  let respuesta: Response;
  try {
    respuesta = await fetch(url, { method: "GET", signal: cancelar });
  } catch {
    throw new ErrorHttp(
      502,
      `No se pudo contactar al dispositivo en ${base}. Verifica que este encendido y en la misma red WiFi.`
    );
  }

  const texto = await respuesta.text();

  if (!respuesta.ok) {
    throw new ErrorHttp(
      502,
      `El dispositivo respondio ${respuesta.status}: ${texto}`
    );
  }

  return {
    enviado: true,
    destino: url,
    respuesta_dispositivo: texto,

    horario_id,
    cantidad,
  };
};

const MINUTOS_PARA_CONFIRMAR = 45;

const minutosDesdeLaDosis = (dia: string, hora: number, minuto: number) => {
  const dd = (n: number) => String(n).padStart(2, "0");
  const momento = Date.parse(`${dia}T${dd(hora)}:${dd(minuto)}:00-03:00`);
  return (Date.now() - momento) / 60000;
};

export const createConfirmacion = async (body: Confirmacion) => {
  const { data: horario } = await supabase
    .from("horarios")
    .select(
      `cantidad, dia, hora, minuto, pastilla_id,
       pastillas ( id, nombre, usuario_id, usuarios ( nombre, apellido, mail ) )`
    )
    .eq("id", body.horario_id)
    .maybeSingle();

  const cantidad = body.cantidad ?? horario?.cantidad ?? 1;

  if (!horario) {
    throw new ErrorHttp(404, "Horario no encontrado");
  }

  const minutos = minutosDesdeLaDosis(horario.dia, horario.hora, horario.minuto);
  if (minutos < 0) {
    throw new ErrorHttp(409, "Esa dosis todavia no es: no se puede confirmar antes de su hora");
  }
  if (minutos > MINUTOS_PARA_CONFIRMAR) {
    throw new ErrorHttp(409, "Esa dosis ya paso hace mucho para confirmarla");
  }

  const { data: marcado, error: updateError } = await supabase
    .from("horarios")
    .update({ dispensado: true })
    .eq("id", body.horario_id)
    .eq("dispensado", false)
    .select("id");

  if (updateError) throw new Error(updateError.message);

  if (!marcado?.length) {
    throw new ErrorHttp(409, "Esa dosis ya estaba registrada como dispensada");
  }

  const { data, error: insertError } = await supabase
    .from("dispensaciones")
    .insert({
      horario_id: body.horario_id,
      dispositivo_id: body.dispositivo_id,
      bateria: body.bateria,
      cantidad,

      detectadas: body.detectadas ?? null,

      usuario_id: (horario as any)?.pastillas?.usuario_id ?? null,
    })
    .select()
    .single();

  if (insertError) {
    await supabase
      .from("horarios")
      .update({ dispensado: false })
      .eq("id", body.horario_id);
    throw new Error(insertError.message);
  }

  let quedanEnModulo: number | null = null;
  if (horario?.pastilla_id) {
    const modulo = await getModuloDePastilla(horario.pastilla_id);
    if (modulo) {
      quedanEnModulo = await descontarDelModulo(modulo.id, cantidad);
    }
  }

  const pastilla = (horario as any)?.pastillas;
  const cuidador = pastilla?.usuarios;

  if (cuidador?.mail && quedanEnModulo === 0) {
    const { data: proxima } = await supabase
      .from("horarios")
      .select("dia, hora, minuto")
      .eq("pastilla_id", horario!.pastilla_id)
      .eq("dispensado", false)
      .order("dia", { ascending: true })
      .order("hora", { ascending: true })
      .limit(1)
      .maybeSingle();

    const moduloVacio = await getModuloDePastilla(horario!.pastilla_id);

    void avisarPastilleroVacio({
      cuidadorMail: cuidador.mail,
      cuidadorNombre: cuidador.nombre,
      pastilla: pastilla.nombre,
      modulo: moduloVacio?.numero ?? 1,
      proximaDosis: proxima
        ? `${formatearFecha(proxima.dia)} a las ${formatearHora(proxima.hora, proxima.minuto)}`
        : null,
      enlaceApp: APP_URL,
    });
  }

  if (cuidador?.mail) {
    void avisarDispensacionOk({
      cuidadorMail: cuidador.mail,
      cuidadorNombre: cuidador.nombre,
      pastilla: pastilla.nombre,
      cantidad,
      hora: horario!.hora,
      minuto: horario!.minuto,
      dia: horario!.dia,
      dispositivo: body.dispositivo_id,
      quedanEnModulo,
    });
  }

  return { ...data, quedan_en_modulo: quedanEnModulo };
};
