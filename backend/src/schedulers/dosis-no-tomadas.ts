import { supabase } from "../config/supabase";
import { getHoraArgentina, aMinutosDelDia } from "../utils/tiempo";
import { avisarDosisNoTomada } from "../services/email.service";

// Vigila las dosis que ya pasaron su horario y siguen sin dispensarse, y le
// avisa al cuidador por mail.
//
// El re-sonado de la alarma NO se maneja aca sino en el firmware: la ESP32 ya
// sabe que esta esperando el boton, asi que puede volver a sonar sola cada 5
// minutos aunque se corte el WiFi. Ademas, si el backend le mandara /dispense
// de nuevo, el firmware responde "ya hay una pastilla esperando" y no vuelve a
// sonar.
//
// Este scheduler se ocupa solo del mail, que es lo unico que el firmware no
// puede hacer por su cuenta.

// A los cuantos minutos del horario se da la dosis por perdida. Coincide con
// el final del ciclo de alarmas del firmware (suena a los 0, 5, 10 y 15).
const MINUTOS_PARA_AVISAR = 15;

// Cada cuanto revisa. Un minuto es suficiente: el aviso no necesita ser
// instantaneo y no queremos golpear la base de gusto.
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
    // Cuantos minutos pasaron desde que tendria que haberse tomado.
    // Si el dia es anterior a hoy, la dosis ya quedo vieja de entrada.
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

    // Se marca aunque el mail haya fallado, para no reintentar en loop cada
    // minuto. El fallo queda en el log.
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
