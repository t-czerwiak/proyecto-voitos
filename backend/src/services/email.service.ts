import nodemailer, { Transporter } from "nodemailer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import {
  plantillaDispensacionOk,
  plantillaDosisNoTomada,
  plantillaVerificacion,
  plantillaBienvenida,
  plantillaPastilleroVacio,
  LOGO_CID,
  DatosOk,
  DatosNoTomada,
  DatosVerificacion,
  DatosBienvenida,
  DatosVacio,
  plantillaRecuperacion,
  DatosRecuperacion,
} from "./plantillas-mail";

// Este modulo lee las variables al cargarse, y los imports se ejecutan antes
// que el dotenv.config() de index.ts. Sin esta linea funcionaria solo por
// casualidad, porque config/supabase.ts se carga antes y ya lo llamo.
dotenv.config();

// Servicio de mails al cuidador.
//
// Si no hay credenciales SMTP configuradas en el .env, NO falla: escribe el
// mail por consola y sigue. Eso permite probar toda la logica (cuando se
// dispara, a quien, con que texto) sin mandar correos de verdad, y evita que
// una dispensacion valida se caiga solo porque el mail no salio.

const MAIL_HOST = process.env.MAIL_HOST ?? "smtp.gmail.com";
const MAIL_PORT = Number(process.env.MAIL_PORT ?? 587);
const MAIL_USER = process.env.MAIL_USER?.trim();

// Google muestra la contrasena de aplicacion como "abcd efgh ijkl mnop", pero
// los espacios son solo para que se lea: la clave son 16 caracteres seguidos.
// Se limpian aca para que no importe como se haya pegado en el .env.
const MAIL_PASS = process.env.MAIL_PASS?.replace(/\s/g, "");
const MAIL_FROM = process.env.MAIL_FROM ?? `Voitos <${MAIL_USER ?? "sin-configurar"}>`;

// Envio por API HTTPS, para produccion.
//
// Hace falta porque muchos hosting bloquean el trafico SMTP saliente para no
// ser usados como plataforma de spam, y Render en plan free es uno de ellos.
// La conexion no se rechaza: queda colgada hasta el timeout. El sintoma es
// peor que un error, porque todo "parece" funcionar y los mails simplemente
// nunca llegan.
//
// Resend manda por HTTPS comun, que ningun hosting bloquea.
const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const usaResend = Boolean(RESEND_API_KEY);

// Remitente para la API.
//
// NO se puede reusar MAIL_FROM, que apunta a la casilla de Gmail del proyecto:
// Resend solo deja enviar desde un dominio verificado por vos, y gmail.com no
// lo es. Rechaza el envio con 403 diciendo que el dominio no esta verificado.
//
// onboarding@resend.dev es la direccion que Resend habilita para probar sin
// tener dominio propio. Cuando el proyecto tenga uno, se verifica en
// resend.com/domains y se cambia esta variable.
const RESEND_FROM = process.env.RESEND_FROM ?? "Voitos <onboarding@resend.dev>";

// Brevo. Se prefiere a Resend cuando esta configurado.
//
// La diferencia que importa: Brevo deja mandar a CUALQUIER destinatario con
// solo verificar una casilla como remitente, sin dominio propio. Resend en su
// plan gratuito sin dominio solo entrega a la casilla del titular de la cuenta,
// y este proyecto le manda mails a cada cuidador que se registra.
const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim();
const usaBrevo = Boolean(BREVO_API_KEY);

// El remitente tiene que ser una casilla verificada en el panel de Brevo.
const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL ?? MAIL_USER ?? "sin-configurar";
const BREVO_FROM_NOMBRE = process.env.BREVO_FROM_NOMBRE ?? "Voitos";

// De donde sale el logo cuando el mail va por una API.
//
// Por SMTP el logo viaja adjunto y se referencia con cid:, que es lo mas
// confiable. Las APIs no manejan adjuntos en linea igual de bien, asi que en
// ese camino se apunta a la copia que sirve el backend por HTTPS. Gmail bloquea
// las imagenes en data: URI pero si carga las de una URL.
const API_URL_PUBLICA = (process.env.API_URL ?? "").replace(/\/$/, "");

// Ultimo error del proveedor, para poder verlo desde el panel de admin. Los
// mails salen sin await, asi que si algo falla no hay a quien devolverselo: el
// error solo quedaba en un log del servidor que nadie mira.
let ultimoError: string | null = null;
export const ultimoErrorDeMail = () => ultimoError;

// Cambia la referencia cid: del logo por la URL que sirve el backend.
//
// Si no hay API_URL configurada no se toca nada: es preferible un logo que no
// carga a una URL rota apuntando a localhost, que ademas delata la direccion
// interna a quien reciba el mail.
const conLogoPorUrl = (html: string): string => {
  if (!API_URL_PUBLICA) return html;
  return html.split(`cid:${LOGO_CID}`).join(`${API_URL_PUBLICA}/api/logo.png`);
};

const configurado = Boolean(usaBrevo || usaResend || (MAIL_USER && MAIL_PASS));

let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  if (!configurado) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: MAIL_PORT,
      secure: MAIL_PORT === 465, // 465 es SSL directo, 587 usa STARTTLS
      auth: { user: MAIL_USER, pass: MAIL_PASS },

      // Sin estos tres, un SMTP que no responde deja el envio colgado para
      // siempre en vez de fallar.
      //
      // Pasa de verdad: muchos hosting bloquean el trafico SMTP saliente para
      // no ser usados como plataforma de spam, y Render en plan free es uno de
      // ellos. La conexion no se rechaza, simplemente nunca completa. El
      // sintoma es peor que un error: el registro se colgaba dos minutos y el
      // usuario veia "no se pudo conectar" aunque su cuenta ya estuviera creada.
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
  }
  return transporter;
};

// El logo viaja adjunto y se referencia desde el HTML con cid:. Es la unica
// forma confiable de mostrar una imagen propia en Gmail sin publicarla en un
// servidor: las imagenes en data: URI las bloquea.
//
// La ruta sube dos niveles desde este archivo, asi funciona tanto en
// desarrollo (backend/src/services) como compilado (backend/dist/services).
const RUTA_LOGO = path.join(__dirname, "..", "..", "assets", "voitos-logo.png");
const hayLogo = fs.existsSync(RUTA_LOGO);

if (!hayLogo) {
  console.warn(`No se encontro el logo en ${RUTA_LOGO}: los mails salen sin el.`);
}

const adjuntos = hayLogo
  ? [{ filename: "voitos.png", path: RUTA_LOGO, cid: LOGO_CID }]
  : [];

interface Mail {
  para: string;
  asunto: string;
  texto: string;
  html: string;
}

// Cuanto se espera a la API antes de darla por caida. fetch no tiene timeout
// propio, asi que sin esto un envio lento cuelga a quien lo llamo.
const TIMEOUT_MS = 10000;

const enviarPorBrevo = async ({ para, asunto, texto, html }: Mail): Promise<boolean> => {
  const corte = new AbortController();
  const temporizador = setTimeout(() => corte.abort(), TIMEOUT_MS);

  try {
    const r = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY as string,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: BREVO_FROM_NOMBRE, email: BREVO_FROM_EMAIL },
        to: [{ email: para }],
        subject: asunto,
        htmlContent: conLogoPorUrl(html),
        textContent: texto,
      }),
      signal: corte.signal,
    });

    if (!r.ok) {
      const detalle = await r.text();
      ultimoError = `${r.status} ${detalle}`;
      console.error(`Brevo rechazo el mail a ${para}: ${ultimoError}`);
      return false;
    }

    ultimoError = null;
    console.log(`Mail enviado a ${para}: ${asunto}`);
    return true;
  } catch (error: any) {
    const porTimeout = error?.name === "AbortError";
    ultimoError = porTimeout ? `la API no respondio en ${TIMEOUT_MS / 1000}s` : error.message;
    console.error(`No se pudo enviar el mail a ${para}:`, ultimoError);
    return false;
  } finally {
    clearTimeout(temporizador);
  }
};

const enviarPorResend = async ({ para, asunto, texto, html }: Mail): Promise<boolean> => {
  const cuerpo: Record<string, unknown> = {
    from: RESEND_FROM,
    to: [para],
    subject: asunto,
    html: conLogoPorUrl(html),
    text: texto,
  };

  // El logo va en base64 y no por ruta: la API no tiene acceso al disco de
  // este servidor. content_id es lo que lo hace referenciable desde el HTML
  // con cid:, igual que el adjunto de SMTP.
  if (hayLogo) {
    cuerpo.attachments = [
      {
        filename: "voitos.png",
        content: fs.readFileSync(RUTA_LOGO).toString("base64"),
        content_id: LOGO_CID,
      },
    ];
  }

  const corte = new AbortController();
  const temporizador = setTimeout(() => corte.abort(), TIMEOUT_MS);

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(cuerpo),
      signal: corte.signal,
    });

    if (!r.ok) {
      const detalle = await r.text();
      ultimoError = `${r.status} ${detalle}`;
      console.error(`Resend rechazo el mail a ${para}: ${ultimoError}`);
      return false;
    }

    ultimoError = null;
    console.log(`Mail enviado a ${para}: ${asunto}`);
    return true;
  } catch (error: any) {
    const porTimeout = error?.name === "AbortError";
    ultimoError = porTimeout ? `la API no respondio en ${TIMEOUT_MS / 1000}s` : error.message;
    console.error(`No se pudo enviar el mail a ${para}:`, ultimoError);
    return false;
  } finally {
    clearTimeout(temporizador);
  }
};

const enviar = async ({ para, asunto, texto, html }: Mail): Promise<boolean> => {
  // Brevo primero: es el unico que entrega a cualquier destinatario sin tener
  // dominio propio, que es lo que este proyecto necesita.
  if (usaBrevo) {
    return enviarPorBrevo({ para, asunto, texto, html });
  }

  if (usaResend) {
    return enviarPorResend({ para, asunto, texto, html });
  }

  const t = getTransporter();

  if (!t) {
    console.log("--- MAIL (no enviado, falta configurar SMTP en el .env) ---");
    console.log(`Para:    ${para}`);
    console.log(`Asunto:  ${asunto}`);
    console.log(texto);
    console.log("--- fin del mail ---");
    return false;
  }

  try {
    // Se manda html y texto. Los clientes que no renderizan html, y los
    // lectores de pantalla, usan la version de texto.
    await t.sendMail({
      from: MAIL_FROM,
      to: para,
      subject: asunto,
      text: texto,
      html,
      attachments: adjuntos,
    });
    console.log(`Mail enviado a ${para}: ${asunto}`);
    return true;
  } catch (error: any) {
    // Un mail que no sale no puede tumbar la dispensacion, que es lo importante
    console.error(`No se pudo enviar el mail a ${para}:`, error.message);
    return false;
  }
};

export interface DatosDispensacion extends DatosOk {
  cuidadorMail: string;
}

export const avisarDispensacionOk = async (d: DatosDispensacion) => {
  const { asunto, html, texto } = plantillaDispensacionOk(d);
  return enviar({ para: d.cuidadorMail, asunto, html, texto });
};

export interface DatosDosisNoTomada extends DatosNoTomada {
  cuidadorMail: string;
}

export const avisarDosisNoTomada = async (d: DatosDosisNoTomada) => {
  const { asunto, html, texto } = plantillaDosisNoTomada(d);
  return enviar({ para: d.cuidadorMail, asunto, html, texto });
};

export interface DatosVerificacionMail extends DatosVerificacion {
  cuidadorMail: string;
}

export const avisarVerificacion = async (d: DatosVerificacionMail) => {
  const { asunto, html, texto } = plantillaVerificacion(d);
  return enviar({ para: d.cuidadorMail, asunto, html, texto });
};

export interface DatosBienvenidaMail extends DatosBienvenida {
  cuidadorMail: string;
}

export const avisarBienvenida = async (d: DatosBienvenidaMail) => {
  const { asunto, html, texto } = plantillaBienvenida(d);
  return enviar({ para: d.cuidadorMail, asunto, html, texto });
};

export interface DatosVacioMail extends DatosVacio {
  cuidadorMail: string;
}

export const avisarPastilleroVacio = async (d: DatosVacioMail) => {
  const { asunto, html, texto } = plantillaPastilleroVacio(d);
  return enviar({ para: d.cuidadorMail, asunto, html, texto });
};

export interface DatosRecuperacionMail extends DatosRecuperacion {
  cuidadorMail: string;
}

export const avisarRecuperacion = async (d: DatosRecuperacionMail) => {
  const { asunto, html, texto } = plantillaRecuperacion(d);
  return enviar({ para: d.cuidadorMail, asunto, html, texto });
};

export const smtpConfigurado = () => configurado;
