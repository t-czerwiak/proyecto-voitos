import { supabase } from "../config/supabase";
import { ContactoCreate, ContactoUpdate } from "../schemas/contactos.schema";

export const getAllContactos = async (usuario_id?: string) => {
  let query = supabase.from("contactos_emergencia").select("*");
  if (usuario_id) query = query.eq("usuario_id", usuario_id);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
};

export const getContactoById = async (id: string) => {
  const { data, error } = await supabase
    .from("contactos_emergencia")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const createContacto = async (body: ContactoCreate) => {
  const { data, error } = await supabase
    .from("contactos_emergencia")
    .insert(body)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const updateContacto = async (id: string, body: ContactoUpdate) => {
  const { data, error } = await supabase
    .from("contactos_emergencia")
    .update(body)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data;
};

export const deleteContacto = async (id: string) => {
  const { error } = await supabase
    .from("contactos_emergencia")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
};
