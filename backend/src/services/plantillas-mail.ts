// Plantillas HTML de los mails al cuidador.
//
// Los clientes de mail son muy limitados: Gmail borra las hojas de estilo, no
// soporta flexbox ni grid, y varios ignoran los estilos que no van en linea.
// Por eso todo se arma con tablas y con style="" en cada elemento, que es lo
// unico que se renderiza igual en todos lados.
//
// El ancho maximo de 600px es el estandar de facto: entra en la vista de
// lectura de escritorio sin cortarse y se ve bien en celular.

const VERDE_OSCURO = "#02200F";
const VERDE_BORDE = "#12592C";
const VERDE_CLARO = "#E8F3EC";
const VERDE_TEXTO = "#0B7A38";
const AMBAR_FONDO = "#FFF4E5";
const AMBAR_BORDE = "#E0A24A";
const AMBAR_TEXTO = "#8A5200";
const GRIS_TEXTO = "#3C4A42";
const GRIS_SUAVE = "#78877E";

const dosDigitos = (n: number) => String(n).padStart(2, "0");

export const formatearHora = (hora: number, minuto: number) =>
  `${dosDigitos(hora)}:${dosDigitos(minuto)}`;

// "2026-08-11" -> "martes 11 de agosto"
export const formatearFecha = (fecha: string): string => {
  const partes = fecha.split("-");
  if (partes.length !== 3) return fecha;

  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  const dias = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  const d = new Date(`${fecha}T12:00:00Z`);
  const nombreDia = dias[d.getUTCDay()];
  const nombreMes = meses[Number(partes[1]) - 1];

  return `${nombreDia} ${Number(partes[2])} de ${nombreMes}`;
};

// Una fila de dato: etiqueta a la izquierda, valor a la derecha
const fila = (etiqueta: string, valor: string) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid #E4EAE6;color:${GRIS_SUAVE};font-size:14px;">${etiqueta}</td>
    <td style="padding:10px 0;border-bottom:1px solid #E4EAE6;color:${GRIS_TEXTO};font-size:15px;font-weight:600;text-align:right;">${valor}</td>
  </tr>`;

interface Layout {
  preheader: string; // el resumen que Gmail muestra al lado del asunto
  titulo: string;
  saludo: string;
  cuerpo: string;
}

const envolver = ({ preheader, titulo, saludo, cuerpo }: Layout) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background-color:#F2F5F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Texto oculto: es lo que se lee en la bandeja antes de abrir el mail -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F2F5F3;padding:24px 12px;">
    <tr>
      <td align="center">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

          <!-- Encabezado -->
          <tr>
            <td style="background-color:${VERDE_OSCURO};padding:26px 32px;">
              <span style="color:#FFFFFF;font-size:22px;font-weight:700;letter-spacing:0.5px;">Voitos</span>
              <span style="color:#5FD68F;font-size:13px;padding-left:10px;">pastillero inteligente</span>
            </td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 18px;color:${GRIS_TEXTO};font-size:16px;">${saludo}</p>
              ${cuerpo}
            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td style="background-color:#F7FAF8;padding:20px 32px;border-top:1px solid #E4EAE6;">
              <p style="margin:0;color:${GRIS_SUAVE};font-size:12px;line-height:18px;">
                Este mensaje se envía automáticamente cuando el pastillero registra una dosis.
                No hace falta que respondas.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

export interface DatosOk {
  cuidadorNombre: string;
  pastilla: string;
  cantidad: number;
  hora: number;
  minuto: number;
  dia: string;
  dispositivo: string;
  quedanEnModulo: number | null;
}

export const plantillaDispensacionOk = (d: DatosOk) => {
  const hhmm = formatearHora(d.hora, d.minuto);
  const pastillas = d.cantidad === 1 ? "1 pastilla" : `${d.cantidad} pastillas`;

  let stock = "";
  if (d.quedanEnModulo === 0) {
    stock = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
        <tr>
          <td style="background-color:${AMBAR_FONDO};border-left:4px solid ${AMBAR_BORDE};border-radius:6px;padding:14px 16px;">
            <p style="margin:0;color:${AMBAR_TEXTO};font-size:14px;line-height:20px;">
              <strong>El pastillero quedó vacío.</strong><br>
              Conviene recargarlo antes de la próxima dosis.
            </p>
          </td>
        </tr>
      </table>`;
  } else if (d.quedanEnModulo !== null && d.quedanEnModulo <= 3) {
    stock = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:22px;">
        <tr>
          <td style="background-color:${AMBAR_FONDO};border-left:4px solid ${AMBAR_BORDE};border-radius:6px;padding:14px 16px;">
            <p style="margin:0;color:${AMBAR_TEXTO};font-size:14px;line-height:20px;">
              <strong>Quedan pocas pastillas:</strong> ${d.quedanEnModulo} en el pastillero.<br>
              Es buen momento para recargarlo.
            </p>
          </td>
        </tr>
      </table>`;
  } else if (d.quedanEnModulo !== null) {
    stock = `<p style="margin:22px 0 0;color:${GRIS_SUAVE};font-size:14px;">
      Quedan ${d.quedanEnModulo} pastillas cargadas en el pastillero.
    </p>`;
  }

  const cuerpo = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:${VERDE_CLARO};border-radius:10px;padding:18px 20px;">
          <p style="margin:0;color:${VERDE_TEXTO};font-size:17px;font-weight:600;">
            La medicación de las ${hhmm} ya fue tomada
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${fila("Medicamento", d.pastilla)}
      ${fila("Cantidad", pastillas)}
      ${fila("Día", formatearFecha(d.dia))}
      ${fila("Hora", hhmm)}
      ${fila("Dispositivo", d.dispositivo)}
    </table>

    ${stock}`;

  const texto = [
    `Hola ${d.cuidadorNombre},`,
    ``,
    `La medicación de las ${hhmm} ya fue tomada.`,
    ``,
    `  Medicamento: ${d.pastilla}`,
    `  Cantidad:    ${pastillas}`,
    `  Día:         ${formatearFecha(d.dia)}`,
    `  Hora:        ${hhmm}`,
    `  Dispositivo: ${d.dispositivo}`,
    ``,
    d.quedanEnModulo === null
      ? ""
      : d.quedanEnModulo === 0
      ? `El pastillero quedó vacío. Conviene recargarlo antes de la próxima dosis.`
      : d.quedanEnModulo <= 3
      ? `Quedan pocas pastillas: ${d.quedanEnModulo} en el pastillero.`
      : `Quedan ${d.quedanEnModulo} pastillas cargadas en el pastillero.`,
    ``,
    `Este mensaje se envía automáticamente. No hace falta que respondas.`,
  ].join("\n");

  return {
    asunto: `${d.pastilla} de las ${hhmm}: dosis tomada`,
    html: envolver({
      preheader: `${d.pastilla}, ${pastillas}, a las ${hhmm}.`,
      titulo: "Dosis tomada",
      saludo: `Hola ${d.cuidadorNombre}, todo en orden.`,
      cuerpo,
    }),
    texto,
  };
};

export interface DatosNoTomada {
  cuidadorNombre: string;
  pastilla: string;
  cantidad: number;
  hora: number;
  minuto: number;
  dia: string;
  minutosDeRetraso: number;
  contactos: Array<{ nombre: string; apellido: string; numero: string }>;
}

export const plantillaDosisNoTomada = (d: DatosNoTomada) => {
  const hhmm = formatearHora(d.hora, d.minuto);
  const pastillas = d.cantidad === 1 ? "1 pastilla" : `${d.cantidad} pastillas`;

  const contactos = d.contactos.length
    ? `
      <p style="margin:26px 0 10px;color:${GRIS_TEXTO};font-size:15px;font-weight:600;">
        Contactos de emergencia
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${d.contactos
          .map((c) => fila(`${c.nombre} ${c.apellido}`, `<a href="tel:${c.numero}" style="color:${VERDE_TEXTO};text-decoration:none;">${c.numero}</a>`))
          .join("")}
      </table>`
    : "";

  const cuerpo = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:${AMBAR_FONDO};border-radius:10px;padding:18px 20px;">
          <p style="margin:0;color:${AMBAR_TEXTO};font-size:17px;font-weight:600;">
            La medicación de las ${hhmm} todavía no se retiró
          </p>
          <p style="margin:6px 0 0;color:${AMBAR_TEXTO};font-size:14px;">
            Pasaron ${d.minutosDeRetraso} minutos del horario.
          </p>
        </td>
      </tr>
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${fila("Medicamento", d.pastilla)}
      ${fila("Cantidad", pastillas)}
      ${fila("Día", formatearFecha(d.dia))}
      ${fila("Hora", hhmm)}
    </table>

    <p style="margin:24px 0 0;color:${GRIS_TEXTO};font-size:15px;line-height:23px;">
      El pastillero avisó con la alarma sonora y volvió a insistir, pero nadie apretó
      el botón para retirar la medicación. Puede que no la haya escuchado, que no
      estuviera en casa, o que necesite una mano.
    </p>

    <p style="margin:14px 0 0;color:${GRIS_TEXTO};font-size:15px;line-height:23px;">
      Si podés, comunicate para chequear que esté todo bien.
    </p>

    ${contactos}`;

  const texto = [
    `Hola ${d.cuidadorNombre},`,
    ``,
    `La medicación de las ${hhmm} todavía no se retiró. Pasaron ${d.minutosDeRetraso} minutos del horario.`,
    ``,
    `  Medicamento: ${d.pastilla}`,
    `  Cantidad:    ${pastillas}`,
    `  Día:         ${formatearFecha(d.dia)}`,
    `  Hora:        ${hhmm}`,
    ``,
    `El pastillero avisó con la alarma sonora y volvió a insistir, pero nadie apretó`,
    `el botón para retirar la medicación. Si podés, comunicate para chequear que esté`,
    `todo bien.`,
    ``,
    ...(d.contactos.length
      ? ["Contactos de emergencia:", ...d.contactos.map((c) => `  ${c.nombre} ${c.apellido}: ${c.numero}`), ""]
      : []),
    `Este mensaje se envía automáticamente. No hace falta que respondas.`,
  ].join("\n");

  return {
    asunto: `${d.pastilla} de las ${hhmm}: la dosis no se retiró`,
    html: envolver({
      preheader: `Pasaron ${d.minutosDeRetraso} minutos y la dosis sigue sin retirarse.`,
      titulo: "Dosis sin retirar",
      saludo: `Hola ${d.cuidadorNombre}, necesitamos avisarte algo.`,
      cuerpo,
    }),
    texto,
  };
};
