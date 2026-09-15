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

// Borra la cuenta: el perfil y la cuenta de Auth.
//
// Antes borraba SOLO la fila de usuarios. La cuenta de Supabase Auth quedaba
// viva, asi que quien "borro su cuenta" seguia pudiendo iniciar sesion, entraba
// sin perfil y la app se comportaba de forma rara. Peor: ese mail quedaba
// tomado para siempre, asi que tampoco podia volver a registrarse.
//
// Es el mismo orden que usa el panel de admin: primero el perfil, que es lo que
// arrastra pastillas, horarios, contactos y actividades por las claves foraneas;
// despues Auth. Si Auth falla, el perfil ya no existe y la cuenta queda
// huerfana: se loguea el error para poder limpiarla a mano, pero no se tira la
// operacion abajo, porque desde afuera la cuenta ya esta borrada.
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
