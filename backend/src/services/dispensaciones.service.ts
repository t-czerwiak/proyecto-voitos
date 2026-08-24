import { supabase } from "../config/supabase";

export const getAllDispensaciones = async (usuario_id?: string) => {
  // El usuario viene por dos caminos a proposito: la columna propia de
  // dispensaciones, que es la fuente desde ahora, y el join con usuarios para
  // poder mostrar el nombre sin otra consulta.
  const select = usuario_id
    ? "*, usuarios(nombre, apellido, mail), horarios!inner(id, hora, minuto, dia, pastillas!inner(id, nombre, tipo, usuario_id))"
    : "*, usuarios(nombre, apellido, mail), horarios(id, hora, minuto, dia, pastillas(id, nombre, tipo))";

  let query = supabase
    .from("dispensaciones")
    .select(select)
    .order("timestamp", { ascending: false });

  if (usuario_id) {
    query = query.eq("horarios.pastillas.usuario_id", usuario_id);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};
