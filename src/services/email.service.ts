import nodemailer, { Transporter } from "nodemailer";

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
}

const enviar = async ({ para, asunto, texto }: Mail): Promise<boolean> => {
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
    await t.sendMail({ from: MAIL_FROM, to: para, subject: asunto, text: texto });
    console.log(`Mail enviado a ${para}: ${asunto}`);
    return true;
  } catch (error: any) {
    // Un mail que no sale no puede tumbar la dispensacion, que es lo importante
    console.error(`No se pudo enviar el mail a ${para}:`, error.message);
    return false;
  }
};

const dosHDigitos = (n: number) => String(n).padStart(2, "0");

export interface DatosDispensacion {
  cuidadorMail: string;
  cuidadorNombre: string;
  pastilla: string;
  cantidad: number;
  hora: number;
  minuto: number;
  dia: string;
  dispositivo: string;
  quedanEnModulo: number | null;
}

export const avisarDispensacionOk = async (d: DatosDispensacion) => {
  const hhmm = `${dosHDigitos(d.hora)}:${dosHDigitos(d.minuto)}`;
  const pastillas = d.cantidad === 1 ? "1 pastilla" : `${d.cantidad} pastillas`;

  const stock =
    d.quedanEnModulo === null
      ? ""
      : d.quedanEnModulo === 0
      ? "\nATENCION: el modulo quedo vacio. Hay que recargarlo antes de la proxima dosis.\n"
      : d.quedanEnModulo <= 3
      ? `\nATENCION: quedan solo ${d.quedanEnModulo} pastillas en el modulo. Conviene recargarlo.\n`
      : `\nQuedan ${d.quedanEnModulo} pastillas en el modulo.\n`;

  return enviar({
    para: d.cuidadorMail,
    asunto: `Voitos: se tomo la dosis de ${d.pastilla} de las ${hhmm}`,
    texto: `Hola ${d.cuidadorNombre},

La dosis se dispenso correctamente.

  Medicamento:  ${d.pastilla}
  Cantidad:     ${pastillas}
  Horario:      ${d.dia} a las ${hhmm}
  Dispositivo:  ${d.dispositivo}
${stock}
Este es un aviso automatico de Voitos. No hace falta que respondas.`,
  });
};

export interface DatosDosisNoTomada {
  cuidadorMail: string;
  cuidadorNombre: string;
  pastilla: string;
  cantidad: number;
  hora: number;
  minuto: number;
  dia: string;
  minutosDeRetraso: number;
  contactos: Array<{ nombre: string; apellido: string; numero: string }>;
}

export const avisarDosisNoTomada = async (d: DatosDosisNoTomada) => {
  const hhmm = `${dosHDigitos(d.hora)}:${dosHDigitos(d.minuto)}`;
  const pastillas = d.cantidad === 1 ? "1 pastilla" : `${d.cantidad} pastillas`;

  const contactos = d.contactos.length
    ? "\nContactos de emergencia cargados:\n" +
      d.contactos.map((c) => `  - ${c.nombre} ${c.apellido}: ${c.numero}`).join("\n") +
      "\n"
    : "";

  return enviar({
    para: d.cuidadorMail,
    asunto: `Voitos: NO se tomo la dosis de ${d.pastilla} de las ${hhmm}`,
    texto: `Hola ${d.cuidadorNombre},

La dosis de las ${hhmm} no se dispenso, y ya pasaron ${d.minutosDeRetraso} minutos.

  Medicamento:  ${d.pastilla}
  Cantidad:     ${pastillas}
  Horario:      ${d.dia} a las ${hhmm}

El pastillero aviso con la alarma sonora, pero nadie apreto el boton para
retirar la medicacion. Puede que la persona no haya escuchado la alarma, que no
estuviera en casa, o que necesite ayuda.

Te sugerimos comunicarte para verificar que este todo bien.
${contactos}
Este es un aviso automatico de Voitos. No hace falta que respondas.`,
  });
};

export const smtpConfigurado = () => configurado;
