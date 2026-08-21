import { supabase, crearClienteAuth } from "../config/supabase";
import { Registro, Login, LoginGoogle, Recuperar, ConfirmarReset } from "../schemas/auth.schema";
import { ErrorHttp } from "../utils/errores";
import { randomBytes } from "crypto";
import { avisarVerificacion, avisarBienvenida, avisarRecuperacion } from "./email.service";

// Cuanto dura el enlace de verificacion. 24 horas es lo habitual: suficiente
// para que lo abran cuando revisen el mail, y corto para que un enlace viejo
// no sirva si la casilla queda expuesta.
const HORAS_VERIFICACION = 24;

// De donde salen los enlaces de los mails. En desarrollo apunta al front local.
const APP_URL = (process.env.APP_URL ?? "http://localhost:8081").replace(/\/$/, "");
const API_URL = (process.env.API_URL ?? "http://localhost:3000").replace(/\/$/, "");

// Trae la fila de la tabla usuarios que corresponde a una cuenta de Supabase
// Auth. Son la misma persona porque comparten el id (ver registro()).
// Las columnas van listadas y no select("*") porque esto es lo que devuelve el
// login, y la app guarda ese objeto en localStorage. Con el asterisco, el
// token_verificacion viajaba en cada inicio de sesion y quedaba escrito en el
// navegador: cualquiera con acceso a esa maquina podia verificar la cuenta.
const CAMPOS_PUBLICOS = "id, nombre, apellido, mail, edad, verificado, created_at";

const getPerfil = async (id: string) => {
  const { data, error } = await supabase
    .from("usuarios")
    .select(CAMPOS_PUBLICOS)
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
  //
  // Sin await a proposito. Con await, un SMTP que no responde dejaba el
  // registro colgado hasta el timeout: la cuenta quedaba creada pero el usuario
  // veia un error de conexion y volvia a intentar. Ahora la respuesta sale
  // enseguida y el mail viaja por su cuenta.
  void avisarVerificacion({
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

// Genera un enlace de verificacion nuevo y lo manda de nuevo.
//
// Hace falta porque el enlace vence a las 24 horas, y porque el mail puede
// no haber llegado o haber caido en spam. Sin esto, una cuenta que perdio su
// enlace no tenia forma de verificarse sola.
//
// El token viejo se pisa: solo el ultimo enlace enviado funciona.
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

  // Aca SI se espera y SI se mira el resultado, al reves que en el registro.
  //
  // La diferencia es el proposito: en el registro el mail es un extra y lo que
  // importa es que la cuenta quede creada. Aca el mail ES lo unico que se pidio,
  // asi que responder "te lo mandamos" sin haberlo mandado es mentirle a quien
  // lo esta esperando. Y despues no entiende por que nunca llega.
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

// ---------------------------------------------------------------------------
// Login con Google
// ---------------------------------------------------------------------------

// Cuanto dura el enlace para elegir contrasena nueva. Una hora, contra las 24
// de la verificacion: una contrasena es mas sensible que confirmar una casilla.
const HORAS_RESET = 1;

// Cada cuanto, como mucho, se le manda un mail de recuperacion a la misma
// casilla. Sin esto el endpoint sirve para inundar el correo de un tercero.
const MINUTOS_ENTRE_MAILS = 5;

// Lee el payload de un JWT sin validar la firma.
//
// Parece un agujero y no lo es, porque lo unico que se hace con esto es NEGAR
// el paso. La validacion de verdad la hace signInWithIdToken contra Google unas
// lineas mas abajo. Un token falsificado puede, como mucho, lograr que lo
// rechacemos antes de tiempo; jamas sirve para entrar, porque para entrar hace
// falta una firma que solo Google puede poner.
const leerPayload = (jwt: string): Record<string, any> | null => {
  const partes = jwt.split(".");
  if (partes.length !== 3) return null;

  try {
    return JSON.parse(Buffer.from(partes[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
};

// Parte el nombre completo de Google en nombre y apellido.
//
// Google casi siempre manda given_name y family_name por separado, pero no esta
// garantizado. Si no vienen, se parte el nombre completo por el primer espacio.
// Las dos columnas son NOT NULL, asi que siempre tiene que salir algo.
const nombreYApellido = (m: Record<string, any>): { nombre: string; apellido: string } => {
  const completo = String(m.full_name ?? m.name ?? "").trim();
  const partes = completo ? completo.split(/\s+/) : [];

  return {
    nombre: String(m.given_name ?? partes[0] ?? "Cuidador").trim(),
    apellido: String(m.family_name ?? partes.slice(1).join(" ") ?? "").trim() || "-",
  };
};

// Dice si la cuenta puede entrar con contrasena. Sale de las identidades que
// guarda Supabase Auth, no de una columna nuestra: quien tiene contrasena y
// quien entra solo con Google ya lo sabe Supabase, duplicarlo seria una fuente
// de verdad de mas que se puede desincronizar.
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

  // El candado.
  //
  // Supabase vincula sola una identidad nueva de Google a la cuenta que ya
  // tenga ese mail, y su unica proteccion es exigir que el mail este
  // confirmado. Pero aca TODAS las cuentas se crean con email_confirm: true
  // (ver registro()), asi que para Supabase todas estan confirmadas, incluidas
  // las de gente que nunca abrio el mail. La confirmacion de verdad la lleva
  // usuarios.verificado, que Supabase no mira.
  //
  // Sin este chequeo: alguien registra la casilla de otro con una contrasena
  // que el elige, nunca confirma nada, y cuando la victima entra con Google
  // Supabase la mete adentro de esa cuenta. La victima ve sus propios datos en
  // una cuenta cuya contrasena conoce un tercero.
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

  // Recien aca se valida de verdad: Supabase verifica la firma contra Google.
  // Cliente descartable por el mismo motivo que en login(): que la sesion no se
  // le pegue al cliente compartido y le rompa el bypass de RLS.
  const { data, error } = await crearClienteAuth().auth.signInWithIdToken({
    provider: "google",
    token: id_token,
  });

  if (error || !data.session || !data.user) {
    throw new ErrorHttp(401, "No pudimos validar tu cuenta de Google");
  }

  let perfil = await getPerfil(data.user.id);

  // Primera vez: la cuenta de Auth ya existe pero no hay perfil. Se inserta con
  // el MISMO id, igual que en registro(), que es lo que hace que auth.uid()
  // coincida con usuarios.id y las policies de RLS funcionen.
  if (!perfil) {
    const { nombre, apellido } = nombreYApellido(data.user.user_metadata ?? {});

    const { data: creado, error: errorPerfil } = await supabase
      .from("usuarios")
      .insert({
        id: data.user.id,
        nombre,
        apellido,
        mail,
        // Nace verificada: Google ya probo que la casilla es suya. Pedirle que
        // confirme por mail una direccion que acaba de usar para entrar no
        // agrega ninguna garantia, solo un paso.
        verificado: true,
      })
      .select(CAMPOS_PUBLICOS)
      .single();

    if (errorPerfil) throw new Error(errorPerfil.message);
    perfil = creado;

    // Sin await: la cuenta ya esta creada y la sesion ya se puede devolver.
    void avisarBienvenida({
      cuidadorMail: mail,
      cuidadorNombre: nombre,
      enlaceApp: APP_URL,
    });
  }

  return {
    token: data.session.access_token,
    expira_en: data.session.expires_at,
    usuario: perfil,
  };
};

// ---------------------------------------------------------------------------
// Recuperar contrasena
// ---------------------------------------------------------------------------

// La respuesta no cambia nunca, exista o no la cuenta. Si cambiara, este
// endpoint seria un buscador de casillas registradas: se le tiran mails de a
// uno y contesta cuales tienen cuenta.
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

  // Freno de mano. El vencimiento guardado dice cuando se emitio el ultimo
  // enlace (vencimiento menos su duracion); si fue recien, no se manda otro.
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

  // Aca SI se espera el mail, igual que en reenviarVerificacion y al reves que
  // en el registro: el mail ES lo unico que se pidio. Lo que no se hace es
  // contarle al cliente si salio o no, porque eso delataria que la cuenta
  // existe. El fallo queda en el log, que es donde se puede mirar.
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

  // El token se borra al usarlo: sirve una sola vez.
  //
  // Y la cuenta queda verificada. Abrir este enlace prueba exactamente lo mismo
  // que probaba el de verificacion: que la casilla es de quien dice ser. Ademas
  // es la salida de emergencia para alguien que quedo trabado por el candado de
  // Google, que exige justamente estar verificado.
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

  // Se devuelve la sesion ya iniciada: acaba de elegir la contrasena, hacerle
  // escribirla de nuevo en la pantalla siguiente no agrega nada.
  return login({ mail: usuario.mail, password });
};
