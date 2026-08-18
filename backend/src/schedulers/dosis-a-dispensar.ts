import { supabase } from "../config/supabase";
import { getHoraArgentina, aMinutosDelDia } from "../utils/tiempo";
import { enviarSenalDispensar } from "../services/sensor.service";
import { ErrorHttp } from "../utils/errores";

// Dispara las dosis agendadas: cuando llega la hora de un horario, le manda la
// senal de dispensar al pastillero.
//
// Sin esto, agendar una dosis solo escribia una fila en la base y a la hora no
// pasaba nada. El firmware de Olivia es push puro (expone GET /dispense y
// espera), no consulta al backend por su cuenta, asi que alguien tiene que
// iniciar la conexion. Ese alguien es este scheduler.
//
// Ojo con la diferencia entre las tres marcas del horario:
//   senal_enviada -> ya le avisamos al pastillero (esto)
//   dispensado    -> la persona apreto el boton y la pastilla salio
//   notificado    -> ya le mandamos el mail de "no la tomaste"

// Cada cuanto revisa. Un minuto alcanza: la dosis tiene una ventana de
// tolerancia mucho mas grande que eso.
const INTERVALO_MS = 60_000;

// Cuanto tiempo despues de la hora sigue teniendo sentido hacer sonar la
// alarma. Pasado esto la dosis se da por perdida y el que actua es el
// scheduler de dosis-no-tomadas, que manda el mail al cuidador. Coincide a
// proposito con su MINUTOS_PARA_AVISAR.
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

    // Todavia no es la hora, o ya se paso de la ventana util.
    if (minutosDeRetraso < 0 || minutosDeRetraso > MINUTOS_DE_GRACIA) continue;

    try {
      await enviarSenalDispensar({ horario_id: horario.id });
    } catch (e) {
      // 502 = el pastillero no contesta (apagado, fuera de la red). NO se
      // marca senal_enviada a proposito: si vuelve dentro de la ventana, al
      // minuto siguiente se reintenta y la dosis todavia suena.
      if (e instanceof ErrorHttp && e.status === 502) {
        console.error(
          `No se pudo avisar al pastillero de la dosis ${horario.id}: ${e.message}`
        );
        continue;
      }

      // 409 = no hay stock suficiente en el modulo. Reintentar no cambia nada
      // hasta que alguien lo recargue a mano, asi que se marca y se sigue.
      // El cuidador ya recibe el mail de modulo vacio por otro lado.
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
    // Si esto falla, el proximo ciclo vuelve a mandar la senal. El firmware
    // responde "ya hay una pastilla esperando" y no vuelve a sonar, asi que
    // molesta pero no dispensa de mas.
    console.error(`No se pudo marcar senal_enviada en ${id}: ${error.message}`);
  }
};

export const iniciarSchedulerDosisADispensar = (): NodeJS.Timeout => {
  console.log(
    `Scheduler de dosis a dispensar activo (revisa cada ${INTERVALO_MS / 1000}s, ventana de ${MINUTOS_DE_GRACIA} min)`
  );

  return setInterval(() => {
    revisarDosisADispensar().catch((e) =>
      console.error("Fallo la revision de dosis a dispensar:", e.message)
    );
  }, INTERVALO_MS);
};
