import { supabase } from "../config/supabase";
import { getHoraArgentina, aMinutosDelDia, sumarUnDia } from "../utils/tiempo";
import { Alcance, filtrarPorAlcance } from "./pastilleros.service";

export interface Recordatorio {
  id: string;
  hora: string;
  texto: string;
  tipo: "dosis" | "actividad";
  faltan_min: number;
}

const MAXIMO = 3;

const LETRA_DEL_DIA = ["D", "L", "M", "X", "J", "V", "S"];

const letraDe = (fecha: string) =>
  LETRA_DEL_DIA[new Date(`${fecha}T00:00:00Z`).getUTCDay()];

const dosDigitos = (n: number) => String(n).padStart(2, "0");

const sinAcentos = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "");

export const getRecordatorios = async (alcance: Alcance): Promise<Recordatorio[]> => {
  const { hoy, hora, minuto } = getHoraArgentina();
  const manana = sumarUnDia(hoy);
  const ahora = aMinutosDelDia(hora, minuto);

  const [dosis, actividades] = await Promise.all([
    filtrarPorAlcance(
      supabase
        .from("horarios")
        .select("id, dia, hora, minuto, cantidad, recordatorio_min, pastillas!inner ( nombre, usuario_id )")
        .in("dia", [hoy, manana])
        .eq("dispensado", false)
        .not("recordatorio_min", "is", null),
      alcance,
      "pastillas.usuario_id"
    ),
    filtrarPorAlcance(
      supabase
        .from("actividades")
        .select("id, nombre, fecha, hora, tipo, dias, recordatorio_min")
        .not("recordatorio_min", "is", null),
      alcance,
      "usuario_id"
    ),
  ]);

  if (dosis.error) throw new Error(dosis.error.message);
  if (actividades.error) throw new Error(actividades.error.message);

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

  return candidatos
    .filter((c) => c.faltan_min > 0 && c.faltan_min <= c.aviso)
    .sort((x, y) => x.faltan_min - y.faltan_min)
    .slice(0, MAXIMO)
    .map(({ aviso, ...r }) => ({ ...r, texto: sinAcentos(r.texto) }));
};
