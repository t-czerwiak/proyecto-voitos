import { supabase } from "../config/supabase";

export const getAllDispensaciones = async (usuario_id?: string) => {
  const select = usuario_id
    ? "*, horarios!inner(id, hora, minuto, dia, pastillas!inner(id, nombre, tipo, usuario_id))"
    : "*, horarios(id, hora, minuto, dia, pastillas(id, nombre, tipo))";

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
