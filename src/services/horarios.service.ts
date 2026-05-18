import { supabase } from "../config/supabase";
import { HorarioCreate, HorarioUpdate } from "../schemas/horarios.schema";

export const getAllHorarios = async (pastilla_id?: string) => {
  let query = supabase.from("horarios").select("*");
  if (pastilla_id) query = query.eq("pastilla_id", pastilla_id);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const getHorarioById = async (id: string) => {
  const { data, error } = await supabase
    .from("horarios")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const createHorario = async (body: HorarioCreate) => {
  const { data, error } = await supabase
    .from("horarios")
    .insert(body)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateHorario = async (id: string, body: HorarioUpdate) => {
  const { data, error } = await supabase
    .from("horarios")
    .update(body)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteHorario = async (id: string) => {
  const { error } = await supabase.from("horarios").delete().eq("id", id);
  if (error) throw new Error(error.message);
};
