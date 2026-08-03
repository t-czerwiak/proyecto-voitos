import { supabase } from "../config/supabase";
import { Confirmacion, Dispensar } from "../schemas/sensor.schema";
import { getHoraArgentina, getTramosVentana } from "../utils/tiempo";
import { ErrorHttp } from "../utils/errores";

// Cada cuantos minutos consulta la ESP32. Define el tamano de la ventana de
// busqueda: si buscaramos la hora exacta, una dosis se perderia para siempre
// cuando cae entre dos consultas.
const MINUTOS_VENTANA = 5;

export const getPendiente = async () => {
  const { hoy, hora, minuto } = getHoraArgentina();

  // La ventana puede cruzar el cambio de hora, y a las 00:0X hasta el cambio
  // de dia, asi que el dia va dentro del filtro y no como un .eq() aparte.
  const filtro = getTramosVentana(hoy, hora, minuto, MINUTOS_VENTANA)
    .map(
      (t) =>
        `and(dia.eq.${t.dia},hora.eq.${t.hora},minuto.gte.${t.desde},minuto.lte.${t.hasta})`
    )
    .join(",");

  const { data, error } = await supabase
    .from("horarios")
    .select("id, pastilla_id, hora, minuto, cantidad")
    .eq("dispensado", false)
    .or(filtro)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!data) return { pendiente: false, horario: null, modulo: null };

  // Buscar que modulo tiene cargada esa pastilla, que es el que la ESP32 tiene
  // que activar. Si ningun modulo la tiene cargada, modulo queda null.
  const { data: modulo, error: errorModulo } = await supabase
    .from("modulos")
    .select("numero")
    .eq("pastilla_id", data.pastilla_id)
    .limit(1)
    .maybeSingle();

  if (errorModulo) throw new Error(errorModulo.message);

  return { pendiente: true, horario: data, modulo: modulo?.numero ?? null };
};

// Cuanto espera la respuesta del dispositivo antes de darlo por inalcanzable.
const TIMEOUT_DISPOSITIVO_MS = 6000;

// Le manda la orden de dispensar al dispositivo por WiFi.
//
// Esto es el sentido inverso al de getPendiente: aca el backend es el que
// inicia la conexion. Funciona porque el backend y el dispositivo estan en la
// misma red local, asi que se alcanzan por IP privada.
//
// El dispositivo expone GET /dispense (hace sonar el buzzer y queda esperando
// el boton). Que la senal llegue NO significa que la pastilla se dispenso: eso
// recien pasa cuando la persona aprieta el boton, y se registra por
// POST /api/sensor/confirmacion.
//
// El horario_id viaja como query param porque el dispositivo lo necesita para
// poder confirmar despues: confirmacion lo exige (es FK contra horarios) y en
// este sentido el dispositivo no tiene forma de saber cual es.
export const enviarSenalDispensar = async (body: Dispensar) => {
  const destino = body.destino ?? process.env.ESP32_URL;

  if (!destino) {
    throw new ErrorHttp(
      400,
      "No hay a donde mandar la senal: pasa 'destino' en el body o configura ESP32_URL en el .env"
    );
  }

  // Si no lo aclaran, se busca la dosis pendiente en este momento. Asi un push
  // sin body igual queda registrado. Si no hay ninguna, la senal se manda lo
  // mismo (sirve para probar el hardware) pero sin horario que confirmar.
  let horario_id = body.horario_id ?? null;
  let cantidadDelHorario: number | null = null;

  if (horario_id) {
    const { data } = await supabase
      .from("horarios")
      .select("cantidad")
      .eq("id", horario_id)
      .maybeSingle();
    cantidadDelHorario = data?.cantidad ?? null;
  } else {
    const pendiente = await getPendiente();
    horario_id = pendiente.horario?.id ?? null;
    cantidadDelHorario = pendiente.horario?.cantidad ?? null;
  }

  // Prioridad: lo que pidieron en el body, si no lo del horario, si no 1.
  const cantidad = body.cantidad ?? cantidadDelHorario ?? 1;

  // Se acepta tanto "192.168.1.50" como "http://192.168.1.50:80"
  const base = destino.startsWith("http://") || destino.startsWith("https://")
    ? destino
    : `http://${destino}`;

  const params = new URLSearchParams({ cantidad: String(cantidad) });
  if (horario_id) params.set("horario_id", horario_id);

  const url = `${base}/dispense?${params.toString()}`;

  // fetch no tiene timeout propio: sin esto, si el dispositivo esta apagado el
  // request queda colgado hasta que lo corta el sistema operativo.
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
    // El que se le mando al dispositivo, que es el que va a confirmar.
    // null significa que no habia dosis pendiente: la senal sirvio para probar
    // el hardware pero no se va a registrar nada.
    horario_id,
    cantidad,
  };
};

export const createConfirmacion = async (body: Confirmacion) => {
  // Marcar horario como dispensado
  const { error: updateError } = await supabase
    .from("horarios")
    .update({ dispensado: true })
    .eq("id", body.horario_id);

  if (updateError) throw new Error(updateError.message);

  // Registrar la dispensacion
  const { data, error: insertError } = await supabase
    .from("dispensaciones")
    .insert({
      horario_id: body.horario_id,
      dispositivo_id: body.dispositivo_id,
      bateria: body.bateria,
    })
    .select()
    .single();

  // Las dos escrituras no son una transaccion (el cliente de Supabase no
  // expone transacciones). Si falla la segunda, el horario quedaria marcado
  // como dispensado pero sin registro en el historial, y esa dosis
  // desapareceria de las alertas sin haberse tomado. Por eso se deshace el
  // update a mano antes de propagar el error.
  if (insertError) {
    await supabase
      .from("horarios")
      .update({ dispensado: false })
      .eq("id", body.horario_id);
    throw new Error(insertError.message);
  }

  return data;
};
