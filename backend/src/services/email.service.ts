import nodemailer, { Transporter } from "nodemailer";
import dotenv from "dotenv";
import {
  plantillaDispensacionOk,
  plantillaDosisNoTomada,
  DatosOk,
  DatosNoTomada,
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

const configurado = Boolean(MAIL_USER && MAIL_PASS);

let transporter: Transporter | null = null;

const getTransporter = (): Transporter | null => {
  if (!configurado) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: MAIL_PORT,
      secure: MAIL_PORT === 465, // 465 es SSL directo, 587 usa STARTTLS
      auth: { user: MAIL_USER, pass: MAIL_PASS },
    });
  }
  return transporter;
};

interface Mail {
  para: string;
  asunto: string;
  texto: string;
  html: string;
}

const enviar = async ({ para, asunto, texto, html }: Mail): Promise<boolean> => {
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
    await t.sendMail({ from: MAIL_FROM, to: para, subject: asunto, text: texto, html });
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

export const smtpConfigurado = () => configurado;
