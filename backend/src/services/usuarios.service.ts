import { supabase } from "../config/supabase";
import { UsuarioCreate, UsuarioUpdate } from "../schemas/usuarios.schema";

// Columnas que se pueden devolver. Se listan a mano en vez de usar select("*")
// porque la tabla tiene dos campos que NUNCA tienen que salir de la base:
//
//   token_verificacion  es el token de un solo uso del mail de alta. Filtrarlo
//                       permite verificar una cuenta ajena.
//   token_expira        no es secreto en si, pero solo sirve acompañando al
//                       token, asi que no hay razon para exponerlo.
//
// Con select("*") esos dos viajaban en cada respuesta.
const CAMPOS_PUBLICOS = "id, nombre, apellido, mail, edad, verificado, created_at";

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
};
