import { supabase } from "../config/supabase";
import { getHoraArgentina, aMinutosDelDia } from "../utils/tiempo";

// Una dosis esta "no tomada" cuando su horario ya paso (la fecha es anterior
// a hoy, o es hoy pero la hora:minuto ya quedo atras) y sigue sin dispensarse.
// Para cada una devolvemos la pastilla, el usuario y sus contactos de
// emergencia, que son a quienes hay que avisar.
export const getDosisNoTomadas = async (usuario_id?: string) => {
  const { hoy, hora, minuto } = getHoraArgentina();
  const ahoraEnMinutos = aMinutosDelDia(hora, minuto);

  let query = supabase
    .from("horarios")
    .select(
      `id, dia, hora, minuto, dispensado,
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

  // De los horarios de hoy, descartamos los que todavia no llegaron a su hora:
  // esos no estan "vencidos", simplemente estan por venir.
  const vencidos = (data ?? []).filter((h: any) => {
    if (h.dia < hoy) return true;
    return aMinutosDelDia(h.hora, h.minuto) <= ahoraEnMinutos;
  });

  return vencidos;
};
