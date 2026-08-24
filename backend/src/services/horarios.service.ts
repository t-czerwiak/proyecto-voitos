import { supabase } from "../config/supabase";
import { HorarioCreate, HorarioUpdate } from "../schemas/horarios.schema";

// El calendario necesita todas las dosis del usuario para poder marcar los
// dias, y horarios no tiene usuario_id: se llega por la pastilla. El !inner
// hace que el filtro del join descarte filas en vez de traerlas con la
// relacion en null.
export const getAllHorarios = async (filtros: {
  pastilla_id?: string;
  usuario_id?: string;
}) => {
  let query = supabase
    .from("horarios")
    .select("*, pastillas!inner(id, nombre, tipo, usuario_id)")
    .order("dia", { ascending: true })
    .order("hora", { ascending: true })
    .order("minuto", { ascending: true });

  if (filtros.pastilla_id) query = query.eq("pastilla_id", filtros.pastilla_id);
  if (filtros.usuario_id) query = query.eq("pastillas.usuario_id", filtros.usuario_id);

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

export const getHorariosByDia = async (fecha: string) => {
  const { data, error } = await supabase
    .from("horarios")
    .select("*, pastillas(id, nombre, tipo)")
    .eq("dia", fecha)
    .order("hora", { ascending: true })
    .order("minuto", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};
