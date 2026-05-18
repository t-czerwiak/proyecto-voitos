import { supabase } from "../config/supabase";
import { PastillaCreate, PastillaUpdate } from "../schemas/pastillas.schema";

export const getAllPastillas = async (usuario_id?: string) => {
  let query = supabase.from("pastillas").select("*");
  if (usuario_id) query = query.eq("usuario_id", usuario_id);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const getPastillaById = async (id: string) => {
  const { data, error } = await supabase
    .from("pastillas")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const createPastilla = async (body: PastillaCreate) => {
  const { data, error } = await supabase
    .from("pastillas")
    .insert(body)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const updatePastilla = async (id: string, body: PastillaUpdate) => {
  const { data, error } = await supabase
    .from("pastillas")
    .update(body)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const deletePastilla = async (id: string) => {
  const { error } = await supabase.from("pastillas").delete().eq("id", id);
  if (error) throw new Error(error.message);
};
