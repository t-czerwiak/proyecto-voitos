import { supabase } from "../config/supabase";
import { ActividadCreate, ActividadUpdate } from "../schemas/actividades.schema";

export const getAllActividades = async (usuario_id?: string, fecha?: string) => {
  let query = supabase
    .from("actividades")
    .select("*")
    .order("fecha", { ascending: true })
    .order("hora", { ascending: true });

  if (usuario_id) query = query.eq("usuario_id", usuario_id);
  if (fecha) query = query.eq("fecha", fecha);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const getActividadById = async (id: string) => {
  const { data, error } = await supabase
    .from("actividades")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

export const createActividad = async (body: ActividadCreate) => {
  const { data, error } = await supabase
    .from("actividades")
    .insert(body)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

export const updateActividad = async (id: string, body: ActividadUpdate) => {
  const { data, error } = await supabase
    .from("actividades")
    .update(body)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

export const deleteActividad = async (id: string) => {
  const { error } = await supabase.from("actividades").delete().eq("id", id);
  if (error) throw new Error(error.message);
};
