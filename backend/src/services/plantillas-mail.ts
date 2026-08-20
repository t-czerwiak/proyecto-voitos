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
const VERDE_ACENTO = "#0B7A38";
const AMBAR_ACENTO = "#B26A00";
const TITULO = "#16221C";   // casi negro: maximo contraste sobre blanco
const GRIS_TEXTO = "#3C4A42";
const GRIS_SUAVE = "#78877E";
const LINEA = "#E4EAE6";

// Identificador del logo adjunto. email.service lo adjunta con este mismo cid.
export const LOGO_CID = "voitos-logo";

// Escapa el texto que viene de afuera antes de meterlo en el HTML del mail.
//
// Los mails se arman concatenando strings, asi que un dato con < o > entra
// crudo en el marcado. React escapa solo en la app, pero aca no hay nada que
// lo haga.
//
// El caso que importa no es el nombre de una pastilla, que va al mail del
// propio usuario, sino dispositivo_id: llega por POST /api/sensor/confirmacion,
// que es publico, asi que cualquiera puede mandar HTML ahi y terminar
// inyectandolo en el mail de otra persona.
//
// Los clientes de mail no ejecutan scripts, pero si respetan el marcado: se
// puede deformar el mensaje o colar contenido enganoso.
const esc = (texto: string | number | null | undefined): string =>
  String(texto ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const dosDigitos = (n: number) => String(n).padStart(2, "0");

export const formatearHora = (hora: number, minuto: number) =>
  `${dosDigitos(hora)}:${dosDigitos(minuto)}`;

// "2026-08-11" -> "hoy", "ayer" o "martes 11 de agosto".
// Decir "hoy" ubica mucho mas rapido que una fecha completa, que obliga a
// pensar que dia es hoy para saber si el aviso es viejo.
export const formatearFecha = (fecha: string): string => {
  const partes = fecha.split("-");
  if (partes.length !== 3) return fecha;

  // El sistema trabaja en hora de Argentina, no en la del servidor
  const ahora = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const hoy = ahora.toISOString().split("T")[0];

  const ayerDate = new Date(ahora);
  ayerDate.setUTCDate(ayerDate.getUTCDate() - 1);
  const ayer = ayerDate.toISOString().split("T")[0];

  if (fecha === hoy) return "hoy";
  if (fecha === ayer) return "ayer";

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

// Encabezado de estado.
//
// Antes esto era una caja con el fondo tintado y el texto del mismo tono, que
// ademas de leerse peor es el recurso mas trillado de las plantillas
// automaticas. Ahora el color aparece solo en una etiqueta chica y en una
// linea fina, y el titular va en negro sobre blanco, que es donde mejor se lee.
const encabezadoEstado = (etiqueta: string, color: string, titular: string, detalle?: string) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:26px;">
    <tr>
      <td style="border-left:3px solid ${color};padding:2px 0 2px 16px;">
        <p style="margin:0 0 7px;color:${color};font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">${etiqueta}</p>
        <p style="margin:0;color:${TITULO};font-size:22px;line-height:29px;font-weight:700;">${titular}</p>
        ${detalle ? `<p style="margin:8px 0 0;color:${GRIS_SUAVE};font-size:15px;line-height:21px;">${detalle}</p>` : ""}
      </td>
    </tr>
  </table>`;

// Boton de accion. En mail se hace con una tabla y padding, no con un <a>
// estilado, porque Outlook ignora el padding de los enlaces.
const boton = (texto: string, url: string, color = VERDE_ACENTO) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 4px;">
    <tr>
      <td style="background-color:${color};border-radius:8px;">
        <a href="${url}" style="display:inline-block;padding:14px 30px;color:#FFFFFF;font-size:15px;font-weight:600;text-decoration:none;">${texto}</a>
      </td>
    </tr>
  </table>`;

// Aviso secundario: linea fina de color y texto oscuro, sin fondo tintado
const aviso = (titulo: string, detalle: string, color: string) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
    <tr>
      <td style="border:1px solid ${LINEA};border-left:3px solid ${color};border-radius:6px;padding:14px 18px;">
        <p style="margin:0;color:${TITULO};font-size:14px;font-weight:600;">${titulo}</p>
        <p style="margin:5px 0 0;color:${GRIS_TEXTO};font-size:14px;line-height:20px;">${detalle}</p>
      </td>
    </tr>
  </table>`;

// Una fila de dato: etiqueta a la izquierda, valor a la derecha
const fila = (etiqueta: string, valor: string) => `
  <tr>
    <td style="padding:10px 0;border-bottom:1px solid ${LINEA};color:${GRIS_SUAVE};font-size:14px;">${etiqueta}</td>
    <td style="padding:10px 0;border-bottom:1px solid ${LINEA};color:${GRIS_TEXTO};font-size:15px;font-weight:600;text-align:right;">${valor}</td>
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

          <!-- Encabezado. El logo va como adjunto embebido (cid) porque Gmail
               bloquea las imagenes en data: URI y no queremos depender de que
               el archivo este publicado en algun servidor. -->
          <tr>
            <td style="background-color:${VERDE_OSCURO};padding:24px 32px;">
              <img src="cid:${LOGO_CID}" width="132" alt="Voitos" style="display:block;border:0;height:auto;">
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
                Voitos · aviso automático del pastillero
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
    stock = aviso(
      "El pastillero quedó vacío",
      "Conviene recargarlo antes de la próxima dosis.",
      AMBAR_ACENTO
    );
  } else if (d.quedanEnModulo !== null && d.quedanEnModulo <= 3) {
    stock = aviso(
      `Quedan ${d.quedanEnModulo} pastillas`,
      "Es buen momento para recargar el pastillero.",
      AMBAR_ACENTO
    );
  } else if (d.quedanEnModulo !== null) {
    stock = `<p style="margin:22px 0 0;color:${GRIS_SUAVE};font-size:14px;">
      Quedan ${d.quedanEnModulo} pastillas cargadas en el pastillero.
    </p>`;
  }

  const cuerpo = `
    ${encabezadoEstado(
      "Dosis retirada",
      VERDE_ACENTO,
      `Se retiró la ${esc(d.pastilla)} de las ${hhmm}`
    )}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${fila("Medicamento", esc(d.pastilla))}
      ${fila("Cantidad", pastillas)}
      ${fila("Día", formatearFecha(d.dia))}
      ${fila("Hora", hhmm)}
      ${fila("Dispositivo", esc(d.dispositivo))}
    </table>

    <p style="margin:18px 0 0;color:${GRIS_SUAVE};font-size:13px;line-height:19px;">
      El pastillero registra cuándo se retira la medicación. Que haya salido no
      confirma por sí solo que se haya tomado.
    </p>

    ${stock}`;

  const texto = [
    `Hola ${d.cuidadorNombre},`,
    ``,
    `Se retiró la ${d.pastilla} de las ${hhmm} del pastillero.`,
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
    `Voitos · aviso automático del pastillero`,
  ].join("\n");

  return {
    asunto: `Se retiró la ${esc(d.pastilla)} de las ${hhmm}`,
    html: envolver({
      preheader: `${esc(d.pastilla)}, ${pastillas}, a las ${hhmm}.`,
      titulo: "Dosis tomada",
      saludo: `Hola ${esc(d.cuidadorNombre)},`,
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
          .map((c) => fila(`${c.nombre} ${c.apellido}`, `<a href="tel:${c.numero}" style="color:${VERDE_ACENTO};text-decoration:none;">${c.numero}</a>`))
          .join("")}
      </table>`
    : "";

  const cuerpo = `
    ${encabezadoEstado(
      "Sin retirar",
      AMBAR_ACENTO,
      `No se retiró la ${esc(d.pastilla)} de las ${hhmm}`,
      `Hace ${d.minutosDeRetraso} minutos que la dosis espera en el pastillero.`
    )}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${fila("Medicamento", esc(d.pastilla))}
      ${fila("Cantidad", pastillas)}
      ${fila("Día", formatearFecha(d.dia))}
      ${fila("Hora", hhmm)}
    </table>

    <p style="margin:24px 0 0;color:${GRIS_TEXTO};font-size:15px;line-height:23px;">
      La alarma sonó cuatro veces y el botón nunca se apretó. Puede que no se haya
      escuchado, o que no haya nadie en casa.
    </p>

    <p style="margin:14px 0 0;color:${GRIS_TEXTO};font-size:15px;line-height:23px;">
      Conviene que llames para chequear.
    </p>

    ${contactos}`;

  const texto = [
    `Hola ${d.cuidadorNombre},`,
    ``,
    `No se retiró la ${d.pastilla} de las ${hhmm}. Hace ${d.minutosDeRetraso} minutos que la dosis espera en el pastillero.`,
    ``,
    `  Medicamento: ${d.pastilla}`,
    `  Cantidad:    ${pastillas}`,
    `  Día:         ${formatearFecha(d.dia)}`,
    `  Hora:        ${hhmm}`,
    ``,
    `La alarma sonó cuatro veces y el botón nunca se apretó. Puede que no se haya`,
    `escuchado, o que no haya nadie en casa. Conviene que llames para chequear.`,
    ``,
    ...(d.contactos.length
      ? ["Contactos de emergencia:", ...d.contactos.map((c) => `  ${c.nombre} ${c.apellido}: ${c.numero}`), ""]
      : []),
    `Voitos · aviso automático del pastillero`,
  ].join("\n");

  return {
    asunto: `No se retiró la ${esc(d.pastilla)} de las ${hhmm}`,
    html: envolver({
      preheader: `Pasaron ${d.minutosDeRetraso} minutos y la dosis sigue sin retirarse.`,
      titulo: "Dosis sin retirar",
      saludo: `Hola ${esc(d.cuidadorNombre)},`,
      cuerpo,
    }),
    texto,
  };
};


// ---------------------------------------------------------------------------
// Verificacion de la casilla
// ---------------------------------------------------------------------------

export interface DatosVerificacion {
  cuidadorNombre: string;
  enlace: string;
  horasParaVencer: number;
}

export const plantillaVerificacion = (d: DatosVerificacion) => {
  const cuerpo = `
    ${encabezadoEstado(
      "Falta un paso",
      VERDE_ACENTO,
      "Confirmá tu correo para activar los avisos"
    )}

    <p style="margin:0;color:${GRIS_TEXTO};font-size:15px;line-height:23px;">
      Voitos te va a escribir a esta casilla cada vez que se retire una dosis, y
      sobre todo cuando <strong>no</strong> se retire. Confirmala para asegurarnos
      de que esos avisos te lleguen.
    </p>

    ${boton("Confirmar mi correo", d.enlace)}

    <p style="margin:18px 0 0;color:${GRIS_SUAVE};font-size:13px;line-height:19px;">
      El enlace vence en ${d.horasParaVencer} horas. Si el botón no funciona, copiá
      y pegá esta dirección en el navegador:<br>
      <span style="color:${GRIS_TEXTO};word-break:break-all;">${d.enlace}</span>
    </p>

    <p style="margin:18px 0 0;color:${GRIS_SUAVE};font-size:13px;line-height:19px;">
      Si no creaste ninguna cuenta en Voitos, ignorá este mensaje.
    </p>`;

  const texto = [
    `Hola ${d.cuidadorNombre},`,
    ``,
    `Confirmá tu correo para activar los avisos de Voitos.`,
    ``,
    `Voitos te va a escribir a esta casilla cada vez que se retire una dosis, y`,
    `sobre todo cuando NO se retire.`,
    ``,
    `Abrí este enlace para confirmarla (vence en ${d.horasParaVencer} horas):`,
    d.enlace,
    ``,
    `Si no creaste ninguna cuenta en Voitos, ignorá este mensaje.`,
    ``,
    `Voitos · aviso automático del pastillero`,
  ].join("\n");

  return {
    asunto: "Confirmá tu correo para activar los avisos",
    html: envolver({
      preheader: "Un paso más y los avisos del pastillero quedan activos.",
      titulo: "Confirmá tu correo",
      saludo: `Hola ${esc(d.cuidadorNombre)},`,
      cuerpo,
    }),
    texto,
  };
};

// ---------------------------------------------------------------------------
// Bienvenida, despues de verificar
// ---------------------------------------------------------------------------

export interface DatosBienvenida {
  cuidadorNombre: string;
  enlaceApp: string;
}

export const plantillaBienvenida = (d: DatosBienvenida) => {
  const paso = (numero: number, titulo: string, detalle: string) => `
    <tr>
      <td width="34" valign="top" style="padding:0 0 18px;">
        <span style="display:inline-block;width:24px;height:24px;background-color:${VERDE_ACENTO};border-radius:12px;color:#FFFFFF;font-size:13px;font-weight:700;text-align:center;line-height:24px;">${numero}</span>
      </td>
      <td valign="top" style="padding:0 0 18px;">
        <p style="margin:0;color:${TITULO};font-size:15px;font-weight:600;">${titulo}</p>
        <p style="margin:3px 0 0;color:${GRIS_TEXTO};font-size:14px;line-height:20px;">${detalle}</p>
      </td>
    </tr>`;

  const cuerpo = `
    ${encabezadoEstado("Cuenta activa", VERDE_ACENTO, "Tu correo quedó confirmado")}

    <p style="margin:0 0 22px;color:${GRIS_TEXTO};font-size:15px;line-height:23px;">
      Ya vas a recibir los avisos del pastillero. Para empezar a usarlo:
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${paso(1, "Cargá los medicamentos", "Desde Pastillas, agregá cada uno con su nombre.")}
      ${paso(2, "Agendá los horarios", "Elegí a qué hora, qué días y cuántas pastillas por dosis.")}
      ${paso(3, "Cargá el pastillero", "Poné las pastillas en el módulo y anotá cuántas cargaste.")}
    </table>

    ${boton("Abrir Voitos", d.enlaceApp)}`;

  const texto = [
    `Hola ${d.cuidadorNombre},`,
    ``,
    `Tu correo quedó confirmado y ya vas a recibir los avisos del pastillero.`,
    ``,
    `Para empezar:`,
    `  1. Cargá los medicamentos desde Pastillas.`,
    `  2. Agendá los horarios: hora, días y cuántas pastillas por dosis.`,
    `  3. Cargá el pastillero y anotá cuántas pastillas pusiste.`,
    ``,
    d.enlaceApp,
    ``,
    `Voitos · aviso automático del pastillero`,
  ].join("\n");

  return {
    asunto: "Tu cuenta de Voitos ya está activa",
    html: envolver({
      preheader: "Tres pasos para dejar el pastillero funcionando.",
      titulo: "Cuenta activa",
      saludo: `Hola ${esc(d.cuidadorNombre)},`,
      cuerpo,
    }),
    texto,
  };
};

// ---------------------------------------------------------------------------
// Pastillero vacio
// ---------------------------------------------------------------------------

export interface DatosVacio {
  cuidadorNombre: string;
  pastilla: string;
  modulo: number;
  proximaDosis: string | null;
  enlaceApp: string;
}

export const plantillaPastilleroVacio = (d: DatosVacio) => {
  const cuerpo = `
    ${encabezadoEstado(
      "Sin stock",
      AMBAR_ACENTO,
      `El módulo ${d.modulo} se quedó sin ${esc(d.pastilla)}`,
      d.proximaDosis
        ? `La próxima dosis está agendada para ${d.proximaDosis}.`
        : undefined
    )}

    <p style="margin:0;color:${GRIS_TEXTO};font-size:15px;line-height:23px;">
      Si el módulo sigue vacío cuando llegue el horario, el pastillero no va a poder
      entregar la medicación.
    </p>

    ${aviso(
      "Qué hacer",
      "Cargá las pastillas en el módulo y actualizá la cantidad desde la app, así el conteo queda al día.",
      AMBAR_ACENTO
    )}

    ${boton("Actualizar el pastillero", d.enlaceApp, AMBAR_ACENTO)}`;

  const texto = [
    `Hola ${d.cuidadorNombre},`,
    ``,
    `El módulo ${d.modulo} se quedó sin ${d.pastilla}.`,
    d.proximaDosis ? `La próxima dosis está agendada para ${d.proximaDosis}.` : "",
    ``,
    `Si sigue vacío cuando llegue el horario, el pastillero no va a poder entregar`,
    `la medicación. Cargá las pastillas y actualizá la cantidad desde la app.`,
    ``,
    d.enlaceApp,
    ``,
    `Voitos · aviso automático del pastillero`,
  ].join("\n");

  return {
    asunto: `El pastillero se quedó sin ${esc(d.pastilla)}`,
    html: envolver({
      preheader: `Módulo ${d.modulo} vacío. Hay que recargarlo.`,
      titulo: "Pastillero vacío",
      saludo: `Hola ${esc(d.cuidadorNombre)},`,
      cuerpo,
    }),
    texto,
  };
};
