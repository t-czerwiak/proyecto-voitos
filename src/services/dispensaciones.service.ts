import { supabase } from "../config/supabase";

export const getAllDispensaciones = async (usuario_id?: string) => {
  let query = supabase
    .from("dispensaciones")
    .select("*, horarios(id, hora, minuto, dia, pastillas(id, nombre, tipo))")
    .order("timestamp", { ascending: false });

  if (usuario_id) {
    query = supabase
      .from("dispensaciones")
      .select("*, horarios(id, hora, minuto, dia, pastillas!inner(id, nombre, tipo, usuario_id))")
      .eq("horarios.pastillas.usuario_id", usuario_id)
      .order("timestamp", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};
