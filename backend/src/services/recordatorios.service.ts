import { supabase } from "../config/supabase";
import { getHoraArgentina, aMinutosDelDia, sumarUnDia } from "../utils/tiempo";

// Lo que el display OLED del pastillero tiene que mostrar AHORA.
//
// Un recordatorio aparece recordatorio_min minutos antes de su hora y se va a
// la hora justa: si es una dosis, a esa hora ya la toma la alarma del
// pastillero. Sale de dos lados, dosis (horarios) y actividades del
// calendario, que eligieron "recordatorio en el pastillero" al crearse.
//
// No se filtra por cuenta ni por dispositivo: en el MVP hay un solo
// pastillero y todas las cuentas lo comparten (ver docs/API.md, Modulos).

export interface Recordatorio {
  // Para que la placa recuerde cuales ya marco como vistos con el boton y no
  // los vuelva a mostrar. Dosis: el id del horario. Actividad: su id y el dia,
  // porque una rutina se repite y cada dia es un recordatorio nuevo.
  id: string;
  hora: string; // "08:30"
  texto: string; // "Aspirina x2" o el nombre de la actividad
  tipo: "dosis" | "actividad";
  faltan_min: number;
}

// Cuantos va rotando la pantalla, de a uno y con letra grande. Se corta aca y
// no en la placa para que el JSON que parsea la ESP32 sea chico.
const MAXIMO = 3;

// Las letras que usa actividades.dias, indexadas por getUTCDay (0 = domingo).
const LETRA_DEL_DIA = ["D", "L", "M", "X", "J", "V", "S"];

const letraDe = (fecha: string) =>
  LETRA_DEL_DIA[new Date(`${fecha}T00:00:00Z`).getUTCDay()];

const dosDigitos = (n: number) => String(n).padStart(2, "0");

// La fuente que trae el display (la de Adafruit GFX) es ASCII: una "í" o una
// "ñ" en UTF-8 salen como basura. Se sacan aca, que es una linea, y no en la
// placa, que tendria que decodificar UTF-8 a mano. "Kinesiología" -> "Kinesiologia".
const sinAcentos = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "");

export const getRecordatorios = async (): Promise<Recordatorio[]> => {
  const { hoy, hora, minuto } = getHoraArgentina();
  const manana = sumarUnDia(hoy);
  const ahora = aMinutosDelDia(hora, minuto);

  // Se mira tambien manana porque un recordatorio de 1 hora para una dosis de
  // las 00:30 tiene que aparecer a las 23:30 de hoy.
  const [dosis, actividades] = await Promise.all([
    supabase
      .from("horarios")
      .select("id, dia, hora, minuto, cantidad, recordatorio_min, pastillas ( nombre )")
      .in("dia", [hoy, manana])
      .eq("dispensado", false)
      .not("recordatorio_min", "is", null),
    supabase
      .from("actividades")
      .select("id, nombre, fecha, hora, tipo, dias, recordatorio_min")
      .not("recordatorio_min", "is", null),
  ]);

  if (dosis.error) throw new Error(dosis.error.message);
  if (actividades.error) throw new Error(actividades.error.message);

  // Cuantos minutos faltan desde ahora hasta (dia, hh:mm). Manana suma un dia.
  const faltan = (dia: string, h: number, m: number) =>
    (dia === manana ? 24 * 60 : 0) + aMinutosDelDia(h, m) - ahora;

  const candidatos: (Recordatorio & { aviso: number })[] = [];

  for (const d of dosis.data ?? []) {
    const nombre = (d as any).pastillas?.nombre ?? "Pastilla";
    candidatos.push({
      id: d.id,
      hora: `${dosDigitos(d.hora)}:${dosDigitos(d.minuto)}`,
      texto: d.cantidad > 1 ? `${nombre} x${d.cantidad}` : nombre,
      tipo: "dosis",
      faltan_min: faltan(d.dia, d.hora, d.minuto),
      aviso: d.recordatorio_min,
    });
  }

  for (const a of actividades.data ?? []) {
    const [h, m] = a.hora.split(":").map(Number);
    // Una de una vez cae en su fecha; una rutina, en los dias de semana que
    // eligio. Las dos se evaluan para hoy y para manana.
    const dias =
      a.tipo === "rutina"
        ? [hoy, manana].filter((f) => (a.dias ?? []).includes(letraDe(f)))
        : [hoy, manana].filter((f) => f === a.fecha);

    for (const dia of dias) {
      candidatos.push({
        id: `${a.id}@${dia}`,
        hora: a.hora,
        texto: a.nombre,
        tipo: "actividad",
        faltan_min: faltan(dia, h, m),
        aviso: a.recordatorio_min,
      });
    }
  }

  // Visible desde recordatorio_min antes hasta la hora (exclusive).
  return candidatos
    .filter((c) => c.faltan_min > 0 && c.faltan_min <= c.aviso)
    .sort((x, y) => x.faltan_min - y.faltan_min)
    .slice(0, MAXIMO)
    .map(({ aviso, ...r }) => ({ ...r, texto: sinAcentos(r.texto) }));
};
