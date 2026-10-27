import { supabase, crearClienteAuth } from "../config/supabase";
import { Registro, Login, LoginGoogle, Recuperar, ConfirmarReset, CambiarPassword } from "../schemas/auth.schema";
import { ErrorHttp } from "../utils/errores";
import { randomBytes } from "crypto";
import { avisarVerificacion, avisarBienvenida, avisarRecuperacion } from "./email.service";
import { getHoraArgentina } from "../utils/tiempo";

const HORAS_VERIFICACION = 24;

const APP_URL = (process.env.APP_URL ?? "http://localhost:8081").replace(/\/$/, "");
const API_URL = (process.env.API_URL ?? "http://localhost:3000").replace(/\/$/, "");

const CAMPOS_PUBLICOS =
  "id, nombre, apellido, mail, fecha_nacimiento, verificado, foto_url, created_at";

const getPerfil = async (id: string) => {
  const { data, error } = await supabase
    .from("usuarios")
    .select(CAMPOS_PUBLICOS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

export const registro = async (body: Registro) => {
  const { data: cuenta, error: errorCuenta } = await supabase.auth.admin.createUser({
    email: body.mail,
    password: body.password,
    email_confirm: true,
  });

  if (errorCuenta || !cuenta.user) {
    if (errorCuenta?.status === 422) {
      throw new ErrorHttp(409, "Ya existe una cuenta con ese mail");
    }
    throw new Error(errorCuenta?.message ?? "No se pudo crear la cuenta");
  }

  const token = randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + HORAS_VERIFICACION * 60 * 60 * 1000);

  const { data: perfil, error: errorPerfil } = await supabase
    .from("usuarios")
    .insert({
      id: cuenta.user.id,
      nombre: body.nombre,
      apellido: body.apellido,
      mail: body.mail,

      fecha_nacimiento: body.fecha_nacimiento ?? getHoraArgentina().hoy,
      token_verificacion: token,
      token_expira: expira.toISOString(),
    })

    .select(CAMPOS_PUBLICOS)
    .single();

  if (errorPerfil) {
    await supabase.auth.admin.deleteUser(cuenta.user.id);
    throw new Error(errorPerfil.message);
  }

  void avisarVerificacion({
    cuidadorMail: body.mail,
    cuidadorNombre: body.nombre,
    enlace: `${API_URL}/api/auth/verificar/${token}`,
    horasParaVencer: HORAS_VERIFICACION,
  });

  const sesion = await login({ mail: body.mail, password: body.password });

  return { ...sesion, usuario: perfil };
};

export const login = async (body: Login) => {
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

export const reenviarVerificacion = async (id: string) => {
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, nombre, mail, verificado")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!usuario) throw new ErrorHttp(404, "Usuario no encontrado");

  if (usuario.verificado) {
    throw new ErrorHttp(409, "Esta cuenta ya esta verificada");
  }

  const token = randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + HORAS_VERIFICACION * 60 * 60 * 1000);

  const { error: errorUpdate } = await supabase
    .from("usuarios")
    .update({ token_verificacion: token, token_expira: expira.toISOString() })
    .eq("id", id);

  if (errorUpdate) throw new Error(errorUpdate.message);

  const salio = await avisarVerificacion({
    cuidadorMail: usuario.mail,
    cuidadorNombre: usuario.nombre,
    enlace: `${API_URL}/api/auth/verificar/${token}`,
    horasParaVencer: HORAS_VERIFICACION,
  });

  if (!salio) {
    throw new ErrorHttp(
      502,
      "No se pudo enviar el mail. Pedile a un administrador que verifique tu cuenta a mano."
    );
  }

  return { mail: usuario.mail };
};

const HORAS_RESET = 1;

const MINUTOS_ENTRE_MAILS = 5;

const leerPayload = (jwt: string): Record<string, any> | null => {
  const partes = jwt.split(".");
  if (partes.length !== 3) return null;

  try {
    return JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
};

const nombreYApellido = (m: Record<string, any>): { nombre: string; apellido: string } => {
  const completo = String(m.full_name ?? m.name ?? "").trim();
  const partes = completo ? completo.split(/\s+/) : [];

  return {
    nombre: String(m.given_name ?? partes[0] ?? "Cuidador").trim(),
    apellido: String(m.family_name ?? partes.slice(1).join(" ") ?? "").trim() || "-",
  };
};

const tienePassword = async (id: string): Promise<boolean> => {
  const { data } = await supabase.auth.admin.getUserById(id);
  return (data?.user?.identities ?? []).some((i) => i.provider === "email");
};

export const loginConGoogle = async ({ id_token }: LoginGoogle) => {
  const payload = leerPayload(id_token);
  const mail = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : null;

  if (!mail) {
    throw new ErrorHttp(400, "El token de Google no trae una casilla de correo");
  }

  const { data: existente, error: errorExistente } = await supabase
    .from("usuarios")
    .select("id, verificado")
    .eq("mail", mail)
    .maybeSingle();

  if (errorExistente) throw new Error(errorExistente.message);

  if (existente && !existente.verificado) {
    throw new ErrorHttp(
      409,
      "Ya hay una cuenta con ese mail que todavía no confirmó su casilla. " +
        "Confirmala desde el mail que te enviamos, o elegí una contraseña nueva " +
        "desde “olvidé mi contraseña”, y después entrá con Google."
    );
  }

  const { data, error } = await crearClienteAuth().auth.signInWithIdToken({
    provider: "google",
    token: id_token,
  });

  if (error || !data.session || !data.user) {
    throw new ErrorHttp(401, "No pudimos validar tu cuenta de Google");
  }

  let perfil = await getPerfil(data.user.id);

  if (!perfil) {
    const { nombre, apellido } = nombreYApellido(data.user.user_metadata ?? {});

    const { data: creado, error: errorPerfil } = await supabase
      .from("usuarios")
      .insert({
        id: data.user.id,
        nombre,
        apellido,
        mail,

        verificado: true,
      })
      .select(CAMPOS_PUBLICOS)
      .single();

    if (errorPerfil) throw new Error(errorPerfil.message);
    perfil = creado;

    const enlacePassword = await tokenParaPrimeraPassword(data.user.id);

    void avisarBienvenida({
      cuidadorMail: mail,
      cuidadorNombre: nombre,
      enlaceApp: APP_URL,
      enlacePassword,
      horasParaVencer: HORAS_PRIMERA_PASSWORD,
    });
  }

  return {
    token: data.session.access_token,
    expira_en: data.session.expires_at,
    usuario: perfil,
  };
};

const HORAS_PRIMERA_PASSWORD = 24;

const tokenParaPrimeraPassword = async (id: string): Promise<string | undefined> => {
  try {
    const token = randomBytes(32).toString("hex");
    const expira = new Date(Date.now() + HORAS_PRIMERA_PASSWORD * 60 * 60 * 1000);

    const { error } = await supabase
      .from("usuarios")
      .update({ token_reset: token, token_reset_expira: expira.toISOString() })
      .eq("id", id);

    if (error) throw new Error(error.message);

    return `${APP_URL}/recuperar?token=${token}`;
  } catch (e) {
    console.error("No se pudo emitir el enlace de primera contrasena:", e);
    return undefined;
  }
};

const RESPUESTA_GENERICA = {
  mensaje: "Si esa casilla tiene una cuenta, te mandamos el enlace para cambiar la contraseña.",
};

export const pedirRecuperacion = async ({ mail }: Recuperar) => {
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, nombre, mail, token_reset_expira")
    .eq("mail", mail.trim().toLowerCase())
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!usuario) return RESPUESTA_GENERICA;

  if (usuario.token_reset_expira) {
    const emitido = new Date(usuario.token_reset_expira).getTime() - HORAS_RESET * 60 * 60 * 1000;
    if (Date.now() - emitido < MINUTOS_ENTRE_MAILS * 60 * 1000) {
      return RESPUESTA_GENERICA;
    }
  }

  const token = randomBytes(32).toString("hex");
  const expira = new Date(Date.now() + HORAS_RESET * 60 * 60 * 1000);

  const { error: errorUpdate } = await supabase
    .from("usuarios")
    .update({ token_reset: token, token_reset_expira: expira.toISOString() })
    .eq("id", usuario.id);

  if (errorUpdate) throw new Error(errorUpdate.message);

  const salio = await avisarRecuperacion({
    cuidadorMail: usuario.mail,
    cuidadorNombre: usuario.nombre,
    enlace: `${APP_URL}/recuperar?token=${token}`,
    horasParaVencer: HORAS_RESET,
    tienePassword: await tienePassword(usuario.id),
  });

  if (!salio) {
    console.error(`No se pudo enviar el mail de recuperacion a ${usuario.mail}`);
  }

  return RESPUESTA_GENERICA;
};

export const confirmarRecuperacion = async ({ token, password }: ConfirmarReset) => {
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("id, nombre, mail, verificado, token_reset_expira")
    .eq("token_reset", token)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!usuario) throw new ErrorHttp(404, "Este enlace no es válido");

  if (!usuario.token_reset_expira || new Date(usuario.token_reset_expira) < new Date()) {
    throw new ErrorHttp(410, "Este enlace ya venció. Pedí uno nuevo desde la app.");
  }

  const { error: errorPass } = await supabase.auth.admin.updateUserById(usuario.id, {
    password,
  });

  if (errorPass) throw new Error(errorPass.message);

  const { error: errorUpdate } = await supabase
    .from("usuarios")
    .update({
      token_reset: null,
      token_reset_expira: null,
      verificado: true,
      token_verificacion: null,
      token_expira: null,
    })
    .eq("id", usuario.id);

  if (errorUpdate) throw new Error(errorUpdate.message);

  return login({ mail: usuario.mail, password });
};

export const cambiarPassword = async (id: string, { actual, nueva }: CambiarPassword) => {
  const { data: usuario, error } = await supabase.from("usuarios").select("mail").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!usuario) throw new ErrorHttp(404, "Usuario no encontrado");

  const { error: errorActual } = await crearClienteAuth().auth.signInWithPassword({
    email: usuario.mail,
    password: actual,
  });
  if (errorActual) throw new ErrorHttp(401, "La contraseña actual no es correcta");

  if (actual === nueva) throw new ErrorHttp(400, "La contraseña nueva tiene que ser distinta de la actual");

  const { error: errorNueva } = await supabase.auth.admin.updateUserById(id, { password: nueva });
  if (errorNueva) throw new ErrorHttp(400, "No se pudo cambiar la contraseña. Probá con otra.");
};
