import { supabase } from "../config/supabase";
import { UsuarioCreate, UsuarioUpdate } from "../schemas/usuarios.schema";

const CAMPOS_PUBLICOS =
  "id, nombre, apellido, mail, fecha_nacimiento, verificado, created_at";

export const getAllUsuarios = async () => {
  const { data, error } = await supabase.from("usuarios").select(CAMPOS_PUBLICOS);
  if (error) throw new Error(error.message);
  return data;
};

export const getUsuarioById = async (id: string) => {
  const { data, error } = await supabase
    .from("usuarios")
    .select(CAMPOS_PUBLICOS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

export const createUsuario = async (body: UsuarioCreate) => {
  const { data, error } = await supabase
    .from("usuarios")
    .insert(body)
    .select(CAMPOS_PUBLICOS)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateUsuario = async (id: string, body: UsuarioUpdate) => {
  const { data, error } = await supabase
    .from("usuarios")
    .update(body)
    .eq("id", id)
    .select(CAMPOS_PUBLICOS)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteUsuario = async (id: string) => {
  const { error } = await supabase.from("usuarios").delete().eq("id", id);
  if (error) throw new Error(error.message);

  const { error: errorAuth } = await supabase.auth.admin.deleteUser(id);
  if (errorAuth) {
    console.error(
      `Se borro el perfil ${id} pero no su cuenta de Auth:`,
      errorAuth.message
    );
  }
};
