import { supabase } from "../config/supabase";
import { UsuarioCreate, UsuarioUpdate } from "../schemas/usuarios.schema";

const CAMPOS_PUBLICOS =
  "id, nombre, apellido, mail, fecha_nacimiento, verificado, foto_url, created_at";

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

  await supabase.storage.from("avatares").remove([`${id}.jpg`]);

  const { error: errorAuth } = await supabase.auth.admin.deleteUser(id);
  if (errorAuth) {
    console.error(
      `Se borro el perfil ${id} pero no su cuenta de Auth:`,
      errorAuth.message
    );
  }
};

const BUCKET_FOTOS = "avatares";

export const guardarFoto = async (id: string, imagen: string) => {
  const contenido = Buffer.from(imagen.slice(imagen.indexOf(",") + 1), "base64");
  const ruta = `${id}.jpg`;

  const { error: errorSubida } = await supabase.storage
    .from(BUCKET_FOTOS)
    .upload(ruta, contenido, { contentType: "image/jpeg", upsert: true });
  if (errorSubida) throw new Error(errorSubida.message);

  const { publicUrl } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(ruta).data;

  const { data, error } = await supabase
    .from("usuarios")
    .update({ foto_url: `${publicUrl}?v=${Date.now()}` })
    .eq("id", id)
    .select(CAMPOS_PUBLICOS)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const quitarFoto = async (id: string) => {
  await supabase.storage.from(BUCKET_FOTOS).remove([`${id}.jpg`]);

  const { data, error } = await supabase
    .from("usuarios")
    .update({ foto_url: null })
    .eq("id", id)
    .select(CAMPOS_PUBLICOS)
    .single();
  if (error) throw new Error(error.message);
  return data;
};
