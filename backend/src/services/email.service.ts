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

dotenv.config();

const MAIL_HOST = process.env.MAIL_HOST ?? "smtp.gmail.com";
const MAIL_PORT = Number(process.env.MAIL_PORT ?? 587);
const MAIL_USER = process.env.MAIL_USER?.trim();

const MAIL_PASS = process.env.MAIL_PASS?.replace(/\s/g, "");
const MAIL_FROM = process.env.MAIL_FROM ?? `Voitos <${MAIL_USER ?? "sin-configurar"}>`;

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const usaResend = Boolean(RESEND_API_KEY);

const RESEND_FROM = process.env.RESEND_FROM ?? "Voitos <onboarding@resend.dev>";

const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim();
const usaBrevo = Boolean(BREVO_API_KEY);

const BREVO_FROM_EMAIL = process.env.BREVO_FROM_EMAIL ?? MAIL_USER ?? "sin-configurar";
const BREVO_FROM_NOMBRE = process.env.BREVO_FROM_NOMBRE ?? "Voitos";

const API_URL_PUBLICA = (process.env.API_URL ?? "").replace(/\/$/, "");

let ultimoError: string | null = null;
export const ultimoErrorDeMail = () => ultimoError;

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
      secure: MAIL_PORT === 465,
      auth: { user: MAIL_USER, pass: MAIL_PASS },

      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 10000,
    });
  }
  return transporter;
};

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
