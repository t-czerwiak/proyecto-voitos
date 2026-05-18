import { supabase } from "../config/supabase";
import { UsuarioCreate, UsuarioUpdate } from "../schemas/usuarios.schema";

export const getAllUsuarios = async () => {
  const { data, error } = await supabase.from("usuarios").select("*");
  if (error) throw new Error(error.message);
  return data;
};

export const getUsuarioById = async (id: string) => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const createUsuario = async (body: UsuarioCreate) => {
  const { data, error } = await supabase
    .from("usuarios")
    .insert(body)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateUsuario = async (id: string, body: UsuarioUpdate) => {
  const { data, error } = await supabase
    .from("usuarios")
    .update(body)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteUsuario = async (id: string) => {
  const { error } = await supabase.from("usuarios").delete().eq("id", id);
  if (error) throw new Error(error.message);
};
