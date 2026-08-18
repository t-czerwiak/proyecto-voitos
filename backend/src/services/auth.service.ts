import { supabase, crearClienteAuth } from "../config/supabase";
import { Registro, Login } from "../schemas/auth.schema";
import { ErrorHttp } from "../utils/errores";
import { randomBytes } from "crypto";
import { avisarVerificacion, avisarBienvenida } from "./email.service";

// Cuanto dura el enlace de verificacion. 24 horas es lo habitual: suficiente
// para que lo abran cuando revisen el mail, y corto para que un enlace viejo
// no sirva si la casilla queda expuesta.
const HORAS_VERIFICACION = 24;

// De donde salen los enlaces de los mails. En desarrollo apunta al front local.
const APP_URL = (process.env.APP_URL ?? "http://localhost:8081").replace(/\/$/, "");
const API_URL = (process.env.API_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Trae la fila de la tabla usuarios que corresponde a una cuenta de Supabase
// Auth. Son la misma persona porque comparten el id (ver registro()).
const getPerfil = async (id: string) => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

// Registro en dos pasos: primero la cuenta en Supabase Auth (que es quien
// guarda la password hasheada y emite los JWT) y despues la fila en la tabla
// usuarios con los datos del perfil.
//
// La clave esta en que la fila de usuarios se inserta con el MISMO id que le
// asigno Supabase Auth. Eso es lo que hace que auth.uid() coincida con
// usuarios.id, que es la condicion que usan las policies de RLS.
export const registro = async (body: Registro) => {
  const { data: cuenta, error: errorCuenta } = await supabase.auth.admin.createUser({
    email: body.mail,
    password: body.password,
    email_confirm: true, // sin verificacion por mail todavia, ver docs/API.md
  });

  if (errorCuenta || !cuenta.user) {
    // Supabase devuelve 422 cuando el mail ya tiene cuenta
    if (errorCuenta?.status === 422) {
      throw new ErrorHttp(409, "Ya existe una cuenta con ese mail");
    }
    throw new Error(errorCuenta?.message ?? "No se pudo crear la cuenta");
  }

  // Token de un solo uso para confirmar que la casilla existe y es suya
  const token = randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + HORAS_VERIFICACION * 60 * 60 * 1000);

  const { data: perfil, error: errorPerfil } = await supabase
    .from("usuarios")
    .insert({
      id: cuenta.user.id,
      nombre: body.nombre,
      apellido: body.apellido,
      mail: body.mail,
      edad: body.edad,
      token_verificacion: token,
      token_expira: expira.toISOString(),
    })
    .select()
    .single();

  // Si falla el perfil hay que borrar la cuenta de Auth, si no queda una cuenta
  // huerfana que puede loguearse pero no tiene datos en la aplicacion.
  if (errorPerfil) {
    await supabase.auth.admin.deleteUser(cuenta.user.id);
    throw new Error(errorPerfil.message);
  }

  // El mail de verificacion no bloquea el registro: si el envio falla, la
  // cuenta ya existe y el cuidador puede pedir el reenvio despues.
  await avisarVerificacion({
    cuidadorMail: body.mail,
    cuidadorNombre: body.nombre,
    enlace: `${API_URL}/api/auth/verificar/${token}`,
    horasParaVencer: HORAS_VERIFICACION,
  });

  // Se devuelve el token ya emitido para que la app entre directo despues de
  // registrarse, sin tener que hacer un login aparte.
  const sesion = await login({ mail: body.mail, password: body.password });

  return { ...sesion, usuario: perfil };
};

export const login = async (body: Login) => {
  // Cliente descartable: la sesion que devuelve Supabase queda aislada aca y no
  // contamina al cliente compartido que usa el resto del backend.
  const { data, error } = await crearClienteAuth().auth.signInWithPassword({
    email: body.mail,
    password: body.password,
  });

  if (error || !data.session) {
    throw new ErrorHttp(401, "Mail o password incorrectos");
  }

  return {
    token: data.session.access_token,
    expira_en: data.session.expires_at,
    usuario: await getPerfil(data.user.id),
  };
};

// Confirma la casilla a partir del token del mail. Devuelve el nombre para
// poder saludar en la pagina de confirmacion.
export const verificarMail = async (token: string) => {
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, nombre, mail, verificado, token_expira")
    .eq("token_verificacion", token)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!usuario) throw new ErrorHttp(404, "Este enlace no es válido");

  if (usuario.token_expira && new Date(usuario.token_expira) < new Date()) {
    throw new ErrorHttp(410, "Este enlace ya venció. Pedí uno nuevo desde la app.");
  }

  // El token se borra al usarlo: sirve una sola vez
  const { error: errorUpdate } = await supabase
    .from("usuarios")
    .update({ verificado: true, token_verificacion: null, token_expira: null })
    .eq("id", usuario.id);

  if (errorUpdate) throw new Error(errorUpdate.message);

  await avisarBienvenida({
    cuidadorMail: usuario.mail,
    cuidadorNombre: usuario.nombre,
    enlaceApp: APP_URL,
  });

  return { nombre: usuario.nombre };
};

export const yo = async (id: string) => {
  const perfil = await getPerfil(id);
  if (!perfil) {
    throw new ErrorHttp(404, "La cuenta no tiene un perfil asociado");
  }
  return perfil;
};
