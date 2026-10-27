import { supabase } from "../config/supabase";
import { getHoraArgentina, aMinutosDelDia } from "../utils/tiempo";
import { enviarSenalDispensar } from "../services/sensor.service";
import { ErrorHttp } from "../utils/errores";

const INTERVALO_MS = 60_000;

const MINUTOS_DE_GRACIA = 15;

export const revisarDosisADispensar = async (): Promise<number> => {
  const { hoy, hora, minuto } = getHoraArgentina();
  const ahoraEnMinutos = aMinutosDelDia(hora, minuto);

  const { data, error } = await supabase
    .from("horarios")
    .select("id, hora, minuto, cantidad")
    .eq("dia", hoy)
    .eq("dispensado", false)
    .eq("senal_enviada", false);

  if (error) throw new Error(error.message);

  let enviadas = 0;

  for (const horario of data ?? []) {
    const minutosDeRetraso =
      ahoraEnMinutos - aMinutosDelDia(horario.hora, horario.minuto);

    if (minutosDeRetraso < 0 || minutosDeRetraso > MINUTOS_DE_GRACIA) continue;

    try {
      await enviarSenalDispensar({ horario_id: horario.id });
    } catch (e) {
      if (e instanceof ErrorHttp && e.status === 502) {
        console.error(
          `No se pudo avisar al pastillero de la dosis ${horario.id}: ${e.message}`
        );
        continue;
      }

      console.error(
        `Dosis ${horario.id} no se pudo mandar: ${(e as Error).message}`
      );
      await marcarSenalEnviada(horario.id);
      continue;
    }

    await marcarSenalEnviada(horario.id);
    enviadas++;
  }

  return enviadas;
};

const marcarSenalEnviada = async (id: string) => {
  const { error } = await supabase
    .from("horarios")
    .update({ senal_enviada: true })
    .eq("id", id);

  if (error) {
    console.error(`No se pudo marcar senal_enviada en ${id}: ${error.message}`);
  }
};

export const iniciarSchedulerDosisADispensar = (): NodeJS.Timeout | null => {
  if (!process.env.ESP32_URL) {
    console.log(
      "Sin ESP32_URL: modo polling, el pastillero consulta por su cuenta. " +
        "No se inicia el scheduler de push."
    );
    return null;
  }

  console.log(
    `Scheduler de dosis a dispensar activo (revisa cada ${INTERVALO_MS / 1000}s, ventana de ${MINUTOS_DE_GRACIA} min)`
  );

  return setInterval(() => {
    revisarDosisADispensar().catch((e) =>
      console.error("Fallo la revision de dosis a dispensar:", e.message)
    );
  }, INTERVALO_MS);
};
