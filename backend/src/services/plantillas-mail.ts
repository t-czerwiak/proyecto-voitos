// Plantillas HTML de los mails al cuidador.
//
// Los clientes de mail son muy limitados: varios borran las hojas de estilo, no
// soportan flexbox ni grid, y muchos ignoran lo que no va en linea. Por eso
// todo se arma con tablas y con style="" en cada elemento, que es lo unico que
// se renderiza igual en todos lados. El bloque <style> del <head> se usa SOLO
// para mejoras que pueden perderse sin que el mail se rompa: el ajuste a
// pantalla chica y el modo oscuro.
//
// El ancho maximo de 600px es el estandar de facto: entra en la vista de
// lectura de escritorio sin cortarse y se ve bien en celular.
//
// La idea visual: hoja blanca, mucho aire, jerarquia por tipografia y no por
// color. El color aparece en tres lugares nada mas, y siempre es el mismo
// dentro de un mismo mail: la linea bajo la cabecera, la etiqueta de estado y
// el filete que la acompana. Asi el mail se lee como una pieza y no como un
// formulario.

const VERDE_OSCURO = "#02200F"; // banda de la cabecera; el logo es blanco sobre esto
const VERDE = "#0B7A38";        // acento positivo
const AMBAR = "#A15E00";        // acento de atencion, oscurecido para que contraste sobre blanco
const TINTA = "#0B1A11";        // titulares
const TEXTO = "#46554C";        // cuerpo
const SUAVE = "#7B8B81";        // secundario, etiquetas
const LINEA = "#E5EBE7";        // filetes
const BORDE = "#DFE7E2";        // borde de la hoja
const PANEL = "#F6F9F7";        // fondo de los avisos y del pie
const FONDO = "#EDF1EE";        // fondo de la pagina

// Identificador del logo adjunto. email.service lo adjunta con este mismo cid.
export const LOGO_CID = "voitos-logo";

const FUENTE =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

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

// ---------------------------------------------------------------------------
// Piezas
// ---------------------------------------------------------------------------

// Encabezado de estado.
//
// Es lo primero que se lee, asi que carga toda la jerarquia: una etiqueta
// chica en el color del estado, el titular grande en negro (que es donde mejor
// se lee) y un detalle opcional. El filete vertical del color ata las tres
// lineas y repite el acento que ya aparece bajo la cabecera.
const encabezadoEstado = (
  etiqueta: string,
  color: string,
  titular: string,
  detalle?: string
) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 30px;">
    <tr>
      <td style="border-left:2px solid ${color};padding:1px 0 1px 18px;">
        <p style="margin:0 0 9px;color:${color};font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;">${etiqueta}</p>
        <p class="titular tinta" style="margin:0;color:${TINTA};font-size:25px;line-height:33px;font-weight:700;letter-spacing:-0.2px;">${titular}</p>
        ${detalle ? `<p class="suave" style="margin:10px 0 0;color:${SUAVE};font-size:15px;line-height:22px;">${detalle}</p>` : ""}
      </td>
    </tr>
  </table>`;

// Rotulo de seccion: separa bloques sin gritar
const rotulo = (texto: string) => `
  <p class="suave" style="margin:30px 0 12px;color:${SUAVE};font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">${texto}</p>`;

// Una fila de dato: etiqueta a la izquierda, valor a la derecha.
// Se lee como una ficha tecnica, que es exactamente lo que es.
const fila = (etiqueta: string, valor: string) => `
  <tr>
    <td class="linea suave" style="padding:13px 0;border-bottom:1px solid ${LINEA};color:${SUAVE};font-size:14px;line-height:20px;">${etiqueta}</td>
    <td class="linea tinta" style="padding:13px 0;border-bottom:1px solid ${LINEA};color:${TINTA};font-size:15px;line-height:20px;font-weight:600;text-align:right;">${valor}</td>
  </tr>`;

// Envuelve filas con un filete arriba, para que la ficha cierre por los cuatro lados
const ficha = (filas: string) => `
  <table role="presentation" class="linea" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${LINEA};">
    ${filas}
  </table>`;

// Boton de accion. En mail se hace con una tabla y padding, no con un <a>
// estilado, porque Outlook ignora el padding de los enlaces.
const boton = (texto: string, url: string, color = VERDE) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:30px 0 4px;">
    <tr>
      <td style="background-color:${color};border-radius:10px;">
        <a href="${url}" style="display:inline-block;padding:15px 32px;color:#FFFFFF;font-size:15px;font-weight:600;letter-spacing:0.1px;text-decoration:none;">${texto}</a>
      </td>
    </tr>
  </table>`;

// Aviso secundario. Panel apenas tintado con un filete de color a la izquierda:
// se distingue del cuerpo sin robarle protagonismo al encabezado de estado.
const aviso = (titulo: string, detalle: string, color: string) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr>
      <td class="panel" style="background-color:${PANEL};border:1px solid ${LINEA};border-left:3px solid ${color};border-radius:8px;padding:16px 20px;">
        <p class="tinta" style="margin:0;color:${TINTA};font-size:14px;line-height:20px;font-weight:600;">${titulo}</p>
        <p class="texto" style="margin:6px 0 0;color:${TEXTO};font-size:14px;line-height:21px;">${detalle}</p>
      </td>
    </tr>
  </table>`;

// Parrafo del cuerpo
const p = (texto: string, margenArriba = 20) => `
  <p class="texto" style="margin:${margenArriba}px 0 0;color:${TEXTO};font-size:15px;line-height:24px;">${texto}</p>`;

interface Layout {
  preheader: string; // el resumen que Gmail muestra al lado del asunto
  titulo: string;
  saludo: string;
  cuerpo: string;
  acento: string; // color del estado: tine la linea bajo la cabecera
}

const envolver = ({ preheader, titulo, saludo, cuerpo, acento }: Layout) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${titulo}</title>
<style>
  /* Mejoras que pueden perderse sin romper nada: si el cliente borra este
     bloque, queda el estilo en linea, que es el que manda. */
  @media only screen and (max-width:620px) {
    .marco   { padding:16px 0 !important; }
    .hoja    { border-radius:0 !important; border-left:0 !important; border-right:0 !important; }
    .relleno { padding-left:24px !important; padding-right:24px !important; }
    .titular { font-size:22px !important; line-height:29px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .fondo { background-color:#0D1512 !important; }
    .hoja  { background-color:#141D19 !important; border-color:#243029 !important; }
    .tinta { color:#EEF3F0 !important; }
    .texto { color:#BFCCC5 !important; }
    .suave { color:#8C9C93 !important; }
    .panel { background-color:#1A2520 !important; border-color:#2A3831 !important; }
    .linea { border-color:#26332C !important; }
    .pie   { background-color:#101915 !important; border-color:#243029 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${FONDO};font-family:${FUENTE};-webkit-font-smoothing:antialiased;">

  <!-- Texto oculto: es lo que se lee en la bandeja antes de abrir el mail -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>

  <table role="presentation" class="fondo" width="100%" cellpadding="0" cellspacing="0" style="background-color:${FONDO};">
    <tr>
      <td class="marco" align="center" style="padding:32px 12px;">

        <table role="presentation" class="hoja" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:1px solid ${BORDE};border-radius:16px;overflow:hidden;">

          <!-- Cabecera. El logo va como adjunto embebido (cid) porque Gmail
               bloquea las imagenes en data: URI y no queremos depender de que
               el archivo este publicado en algun servidor. -->
          <tr>
            <td style="background-color:${VERDE_OSCURO};padding:26px 36px;">
              <img src="cid:${LOGO_CID}" width="112" alt="Voitos" style="display:block;border:0;width:112px;height:auto;">
            </td>
          </tr>

          <!-- Linea de acento: el color del estado, desde arriba de todo -->
          <tr>
            <td style="background-color:${acento};font-size:0;line-height:0;height:3px;">&nbsp;</td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td class="relleno" style="padding:36px;">
              <p class="texto" style="margin:0 0 22px;color:${TEXTO};font-size:16px;line-height:24px;">${saludo}</p>
              ${cuerpo}
            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td class="relleno pie linea" style="background-color:${PANEL};padding:24px 36px;border-top:1px solid ${LINEA};">
              <p class="tinta" style="margin:0 0 6px;color:${TINTA};font-size:12px;font-weight:700;letter-spacing:2px;">VOITOS</p>
              <p class="suave" style="margin:0;color:${SUAVE};font-size:12px;line-height:19px;">
                Aviso automático del pastillero.<br>
                Recibís este correo porque tu cuenta tiene los avisos activados.
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>`;

// ---------------------------------------------------------------------------
// Dosis retirada
// ---------------------------------------------------------------------------

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
      AMBAR
    );
  } else if (d.quedanEnModulo !== null && d.quedanEnModulo <= 3) {
    stock = aviso(
      `Quedan ${d.quedanEnModulo} pastillas`,
      "Es buen momento para recargar el pastillero.",
      AMBAR
    );
  } else if (d.quedanEnModulo !== null) {
    stock = `<p class="suave" style="margin:26px 0 0;color:${SUAVE};font-size:14px;line-height:21px;">
      Quedan ${d.quedanEnModulo} pastillas cargadas en el pastillero.
    </p>`;
  }

  const cuerpo = `
    ${encabezadoEstado(
      "Dosis retirada",
      VERDE,
      `Se retiró la ${esc(d.pastilla)} de las ${hhmm}`
    )}

    ${rotulo("Detalle")}
    ${ficha(`
      ${fila("Medicamento", esc(d.pastilla))}
      ${fila("Cantidad", pastillas)}
      ${fila("Día", formatearFecha(d.dia))}
      ${fila("Hora", hhmm)}
      ${fila("Dispositivo", esc(d.dispositivo))}
    `)}

    <p class="suave" style="margin:20px 0 0;color:${SUAVE};font-size:13px;line-height:20px;">
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
      acento: VERDE,
    }),
    texto,
  };
};

// ---------------------------------------------------------------------------
// Dosis sin retirar
// ---------------------------------------------------------------------------

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

  // El numero va como enlace tel: para que desde el celular se llame de una.
  // Es el gesto que este mail quiere provocar, asi que tiene que estar a un
  // toque de distancia.
  const contactos = d.contactos.length
    ? `
      ${rotulo("Contactos de emergencia")}
      ${ficha(
        d.contactos
          .map((c) =>
            fila(
              esc(`${c.nombre} ${c.apellido}`),
              `<a href="tel:${esc(c.numero)}" style="color:${VERDE};font-weight:600;text-decoration:none;">${esc(c.numero)}</a>`
            )
          )
          .join("")
      )}`
    : "";

  const cuerpo = `
    ${encabezadoEstado(
      "Sin retirar",
      AMBAR,
      `No se retiró la ${esc(d.pastilla)} de las ${hhmm}`,
      `Hace ${d.minutosDeRetraso} minutos que la dosis espera en el pastillero.`
    )}

    ${rotulo("Detalle")}
    ${ficha(`
      ${fila("Medicamento", esc(d.pastilla))}
      ${fila("Cantidad", pastillas)}
      ${fila("Día", formatearFecha(d.dia))}
      ${fila("Hora", hhmm)}
    `)}

    ${p("La alarma sonó cuatro veces y el botón nunca se apretó. Puede que no se haya escuchado, o que no haya nadie en casa.", 24)}
    ${p("Conviene que llames para chequear.", 14)}

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
      acento: AMBAR,
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
      VERDE,
      "Confirmá tu correo para activar los avisos"
    )}

    ${p(
      `Voitos te va a escribir a esta casilla cada vez que se retire una dosis, y sobre todo cuando <strong class="tinta" style="color:${TINTA};">no</strong> se retire. Confirmala para asegurarnos de que esos avisos te lleguen.`,
      0
    )}

    ${boton("Confirmar mi correo", d.enlace)}

    <p class="suave" style="margin:20px 0 0;color:${SUAVE};font-size:13px;line-height:20px;">
      El enlace vence en ${d.horasParaVencer} horas. Si el botón no funciona, copiá
      y pegá esta dirección en el navegador:<br>
      <span class="texto" style="color:${TEXTO};word-break:break-all;">${d.enlace}</span>
    </p>

    <p class="suave" style="margin:18px 0 0;color:${SUAVE};font-size:13px;line-height:20px;">
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
      acento: VERDE,
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
  const paso = (numero: number, titulo: string, detalle: string, ultimo = false) => `
    <tr>
      <td width="38" valign="top" style="padding:0 0 ${ultimo ? 0 : 20}px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td width="26" height="26" align="center" valign="middle" style="width:26px;height:26px;background-color:${VERDE};border-radius:13px;color:#FFFFFF;font-size:13px;font-weight:700;line-height:26px;text-align:center;">${numero}</td>
        </tr></table>
      </td>
      <td valign="top" style="padding:0 0 ${ultimo ? 0 : 20}px;">
        <p class="tinta" style="margin:2px 0 0;color:${TINTA};font-size:15px;line-height:21px;font-weight:600;">${titulo}</p>
        <p class="texto" style="margin:4px 0 0;color:${TEXTO};font-size:14px;line-height:21px;">${detalle}</p>
      </td>
    </tr>`;

  const cuerpo = `
    ${encabezadoEstado("Cuenta activa", VERDE, "Tu correo quedó confirmado")}

    ${p("Ya vas a recibir los avisos del pastillero. Para empezar a usarlo:", 0)}

    ${rotulo("Tres pasos")}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${paso(1, "Cargá los medicamentos", "Desde Pastillas, agregá cada uno con su nombre.")}
      ${paso(2, "Agendá los horarios", "Elegí a qué hora, qué días y cuántas pastillas por dosis.")}
      ${paso(3, "Cargá el pastillero", "Poné las pastillas en el módulo y anotá cuántas cargaste.", true)}
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
      acento: VERDE,
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
      AMBAR,
      `El módulo ${d.modulo} se quedó sin ${esc(d.pastilla)}`,
      d.proximaDosis
        ? `La próxima dosis está agendada para ${d.proximaDosis}.`
        : undefined
    )}

    ${p("Si el módulo sigue vacío cuando llegue el horario, el pastillero no va a poder entregar la medicación.", 0)}

    ${aviso(
      "Qué hacer",
      "Cargá las pastillas en el módulo y actualizá la cantidad desde la app, así el conteo queda al día.",
      AMBAR
    )}

    ${boton("Actualizar el pastillero", d.enlaceApp, AMBAR)}`;

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
      acento: AMBAR,
    }),
    texto,
  };
};

// ---------------------------------------------------------------------------
// Recuperar contrasena
// ---------------------------------------------------------------------------

export interface DatosRecuperacion {
  cuidadorNombre: string;
  enlace: string;
  horasParaVencer: number;
  // Las cuentas creadas con Google no tienen contrasena. Para ellas esto no es
  // "recuperar" sino "poner una por primera vez", y el mail tiene que decir eso
  // o la persona cree que le mandaron algo que no pidio.
  tienePassword: boolean;
}

export const plantillaRecuperacion = (d: DatosRecuperacion) => {
  const titular = d.tienePassword
    ? "Elegí una contraseña nueva"
    : "Poné una contraseña para tu cuenta";

  const explicacion = d.tienePassword
    ? `Pediste recuperar el acceso a tu cuenta de Voitos. El botón te lleva a
       elegir una contraseña nueva. Hasta que la cambies, la anterior sigue
       funcionando.`
    : `Tu cuenta entra con Google y todavía no tiene contraseña. Si querés
       agregarle una, para poder entrar también sin Google, elegila desde acá.`;

  const cuerpo = `
    ${encabezadoEstado("Recuperar acceso", VERDE, titular)}

    ${p(explicacion, 0)}

    ${boton(d.tienePassword ? "Elegir contraseña nueva" : "Poner una contraseña", d.enlace)}

    <p class="suave" style="margin:20px 0 0;color:${SUAVE};font-size:13px;line-height:20px;">
      El enlace vence en ${d.horasParaVencer === 1 ? "una hora" : `${d.horasParaVencer} horas`} y
      se puede usar una sola vez. Si el botón no funciona, copiá y pegá esta
      dirección en el navegador:<br>
      <span class="texto" style="color:${TEXTO};word-break:break-all;">${d.enlace}</span>
    </p>

    ${aviso(
      "Si no lo pediste vos",
      "Ignorá este mensaje. Tu contraseña no cambia sola: solo cambia si alguien abre este enlace y elige una nueva.",
      AMBAR
    )}`;

  const texto = [
    `Hola ${d.cuidadorNombre},`,
    ``,
    d.tienePassword
      ? `Pediste recuperar el acceso a tu cuenta de Voitos. Abri este enlace para elegir una contrasena nueva.`
      : `Tu cuenta entra con Google y todavia no tiene contrasena. Abri este enlace si querés agregarle una.`,
    ``,
    d.enlace,
    ``,
    `El enlace vence en ${d.horasParaVencer === 1 ? "una hora" : `${d.horasParaVencer} horas`} y se puede usar una sola vez.`,
    ``,
    `Si no lo pediste vos, ignora este mensaje: tu contrasena no cambia sola.`,
    ``,
    `Voitos · aviso automático del pastillero`,
  ].join("\n");

  return {
    asunto: d.tienePassword
      ? "Recuperá el acceso a tu cuenta de Voitos"
      : "Poné una contraseña para tu cuenta de Voitos",
    html: envolver({
      preheader: "El enlace vence en una hora y sirve una sola vez.",
      titulo: "Recuperar acceso",
      saludo: `Hola ${esc(d.cuidadorNombre)},`,
      cuerpo,
      acento: VERDE,
    }),
    texto,
  };
};
