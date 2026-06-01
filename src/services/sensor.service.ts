import { supabase } from "../config/supabase";
import { LecturaCreate } from "../schemas/sensor.schema";

export const createLectura = async (body: LecturaCreate) => {
  const { data, error } = await supabase
    .from("lecturas_sensor")
    .insert(body)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const getAllLecturas = async (pastilla_id?: string) => {
  let query = supabase
    .from("lecturas_sensor")
    .select("*")
    .order("timestamp", { ascending: false });
  if (pastilla_id) query = query.eq("pastilla_id", pastilla_id);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};
