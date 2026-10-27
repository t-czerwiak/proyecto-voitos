import { supabase } from "../config/supabase";
import { getHoraArgentina, aMinutosDelDia } from "../utils/tiempo";
import { avisarDosisNoTomada } from "../services/email.service";

const MINUTOS_PARA_AVISAR = 15;

const INTERVALO_MS = 60_000;

export const revisarDosisNoTomadas = async (): Promise<number> => {
  const { hoy, hora, minuto } = getHoraArgentina();
  const ahoraEnMinutos = aMinutosDelDia(hora, minuto);

  const { data, error } = await supabase
    .from("horarios")
    .select(
      `id, dia, hora, minuto, cantidad,
       pastillas!inner (
         nombre,
         usuarios!inner (
           nombre, apellido, mail,
           contactos_emergencia ( nombre, apellido, numero )
         )
       )`
    )
    .eq("dispensado", false)
    .eq("notificado", false)
    .lte("dia", hoy);

  if (error) throw new Error(error.message);

  let avisados = 0;

  for (const horario of (data ?? []) as any[]) {
    const minutosDeRetraso =
      horario.dia < hoy
        ? MINUTOS_PARA_AVISAR
        : ahoraEnMinutos - aMinutosDelDia(horario.hora, horario.minuto);

    if (minutosDeRetraso < MINUTOS_PARA_AVISAR) continue;

    const cuidador = horario.pastillas?.usuarios;
    if (!cuidador?.mail) continue;

    await avisarDosisNoTomada({
      cuidadorMail: cuidador.mail,
      cuidadorNombre: cuidador.nombre,
      pastilla: horario.pastillas.nombre,
      cantidad: horario.cantidad,
      hora: horario.hora,
      minuto: horario.minuto,
      dia: horario.dia,
      minutosDeRetraso,
      contactos: cuidador.contactos_emergencia ?? [],
    });

    await supabase
      .from("horarios")
      .update({ notificado: true })
      .eq("id", horario.id);

    avisados++;
  }

  return avisados;
};

export const iniciarSchedulerDosisNoTomadas = (): NodeJS.Timeout => {
  console.log(
    `Scheduler de dosis no tomadas activo (revisa cada ${INTERVALO_MS / 1000}s, avisa a los ${MINUTOS_PARA_AVISAR} min)`
  );

  return setInterval(() => {
    revisarDosisNoTomadas().catch((e) =>
      console.error("Fallo la revision de dosis no tomadas:", e.message)
    );
  }, INTERVALO_MS);
};
