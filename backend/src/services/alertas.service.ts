import { supabase } from "../config/supabase";
import { getHoraArgentina, aMinutosDelDia } from "../utils/tiempo";

export const getDosisNoTomadas = async (usuario_id?: string) => {
  const { hoy, hora, minuto } = getHoraArgentina();
  const ahoraEnMinutos = aMinutosDelDia(hora, minuto);

  let query = supabase
    .from("horarios")
    .select(
      `id, dia, hora, minuto, cantidad, dispensado,
       pastillas!inner (
         id, nombre, tipo,
         usuarios!inner (
           id, nombre, apellido,
           contactos_emergencia ( nombre, apellido, numero )
         )
       )`
    )
    .eq("dispensado", false)
    .lte("dia", hoy)
    .order("dia", { ascending: false })
    .order("hora", { ascending: false })
    .order("minuto", { ascending: false });

  if (usuario_id) {
    query = query.eq("pastillas.usuarios.id", usuario_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const vencidos = (data ?? []).filter((h: any) => {
    if (h.dia < hoy) return true;
    return aMinutosDelDia(h.hora, h.minuto) <= ahoraEnMinutos;
  });

  return vencidos;
};
