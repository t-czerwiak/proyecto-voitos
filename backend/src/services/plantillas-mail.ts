const FONDO = "#010D07";
const HOJA = "#04200F";
const HOJA_ALTA = "#073019";
const CABECERA = "#02200F";
const BORDE = "#1A6B38";

const LINEA = "#1A6B38";
const VERDE = "#00FF7F";
const SOBRE_VERDE = "#00190C";
const AMBAR = "#E0A82E";
const TINTA = "#FFFFFF";
const TEXTO = "#CFE8DA";
const SUAVE = "#9FC4AF";
const PANEL = "#073019";

export const LOGO_CID = "voitos-logo";

const FUENTE =
  "Nunito,'Segoe UI',-apple-system,BlinkMacSystemFont,Roboto,Helvetica,Arial,sans-serif";

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

export const formatearFecha = (fecha: string): string => {
  const partes = fecha.split("-");
  if (partes.length !== 3) return fecha;

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

const simboloDe = (color: string) => (color === AMBAR ? "!" : "✓");

const encabezadoEstado = (
  etiqueta: string,
  color: string,
  titular: string,
  detalle?: string
) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 30px;">
    <tr>
      <td style="border-left:3px solid ${color};padding:2px 0 2px 18px;">
        <p style="margin:0 0 10px;color:${color};font-size:13px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;">
          <span style="display:inline-block;width:20px;height:20px;line-height:20px;text-align:center;border-radius:10px;background-color:${color};color:${SOBRE_VERDE};font-size:13px;font-weight:800;">${simboloDe(color)}</span>&nbsp;&nbsp;${etiqueta}
        </p>
        <p class="titular tinta" style="margin:0;color:${TINTA};font-size:26px;line-height:34px;font-weight:800;letter-spacing:-0.2px;">${titular}</p>
        ${detalle ? `<p class="suave" style="margin:12px 0 0;color:${SUAVE};font-size:16px;line-height:24px;">${detalle}</p>` : ""}
      </td>
    </tr>
  </table>`;

const rotulo = (texto: string) => `
  <p class="suave" style="margin:32px 0 12px;color:${SUAVE};font-size:13px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;">${texto}</p>`;

const fila = (etiqueta: string, valor: string) => `
  <tr>
    <td class="linea suave" style="padding:14px 0;border-bottom:1px solid ${LINEA};color:${SUAVE};font-size:15px;line-height:22px;">${etiqueta}</td>
    <td class="linea tinta" style="padding:14px 0;border-bottom:1px solid ${LINEA};color:${TINTA};font-size:16px;line-height:22px;font-weight:700;text-align:right;">${valor}</td>
  </tr>`;

const ficha = (filas: string) => `
  <table role="presentation" class="linea" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${LINEA};">
    ${filas}
  </table>`;

const boton = (texto: string, url: string, color = VERDE) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px 0 4px;">
    <tr>
      <td bgcolor="${color}" style="background-color:${color};border-radius:12px;">
        <a href="${url}" style="display:inline-block;padding:17px 34px;color:${SOBRE_VERDE};font-size:17px;font-weight:800;letter-spacing:0.1px;text-decoration:none;">${texto}</a>
      </td>
    </tr>
  </table>`;

const aviso = (titulo: string, detalle: string, color: string) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr>
      <td class="panel" bgcolor="${PANEL}" style="background-color:${PANEL};border:1px solid ${LINEA};border-left:4px solid ${color};border-radius:10px;padding:18px 22px;">
        <p style="margin:0;color:${color};font-size:16px;line-height:23px;font-weight:800;">${titulo}</p>
        <p class="texto" style="margin:8px 0 0;color:${TEXTO};font-size:16px;line-height:24px;">${detalle}</p>
      </td>
    </tr>
  </table>`;

const p = (texto: string, margenArriba = 20) => `
  <p class="texto" style="margin:${margenArriba}px 0 0;color:${TEXTO};font-size:16px;line-height:25px;">${texto}</p>`;

interface Layout {
  preheader: string;
  titulo: string;
  saludo: string;
  cuerpo: string;
  acento: string;
}

const envolver = ({ preheader, titulo, saludo, cuerpo, acento }: Layout) => `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<!-- El mail ya es oscuro. Declararlo evita que el cliente le aplique ADEMAS
     su propia inversion y termine con un verde sobre verde ilegible. -->
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${titulo}</title>
<style>
  /* Mejoras que pueden perderse sin romper nada: si el cliente borra este
     bloque, queda el estilo en linea, que es el que manda. */
  :root { color-scheme: dark; supported-color-schemes: dark; }

  @media only screen and (max-width:620px) {
    .marco   { padding:16px 0 !important; }
    .hoja    { border-radius:0 !important; border-left:0 !important; border-right:0 !important; }
    .relleno { padding-left:24px !important; padding-right:24px !important; }
    .titular { font-size:23px !important; line-height:30px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:${FONDO};font-family:${FUENTE};-webkit-font-smoothing:antialiased;">

  <!-- Texto oculto: es lo que se lee en la bandeja antes de abrir el mail -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>

  <table role="presentation" class="fondo" width="100%" cellpadding="0" cellspacing="0" bgcolor="${FONDO}" style="background-color:${FONDO};">
    <tr>
      <td class="marco" align="center" style="padding:32px 12px;">

        <table role="presentation" class="hoja" width="600" cellpadding="0" cellspacing="0" bgcolor="${HOJA}" style="max-width:600px;width:100%;background-color:${HOJA};border:1px solid ${BORDE};border-radius:16px;overflow:hidden;">

          <!-- Cabecera. El logo va como adjunto embebido (cid) porque Gmail
               bloquea las imagenes en data: URI y no queremos depender de que
               el archivo este publicado en algun servidor. -->
          <tr>
            <td bgcolor="${CABECERA}" style="background-color:${CABECERA};padding:26px 36px;">
              <img src="cid:${LOGO_CID}" width="112" alt="Voitos" style="display:block;border:0;width:112px;height:auto;">
            </td>
          </tr>

          <!-- Linea de acento: el color del estado, desde arriba de todo -->
          <tr>
            <td bgcolor="${acento}" style="background-color:${acento};font-size:0;line-height:0;height:3px;">&nbsp;</td>
          </tr>

          <!-- Contenido -->
          <tr>
            <td class="relleno" style="padding:36px;">
              <p class="texto" style="margin:0 0 24px;color:${TEXTO};font-size:17px;line-height:26px;">${saludo}</p>
              ${cuerpo}
            </td>
          </tr>

          <!-- Pie -->
          <tr>
            <td class="relleno pie linea" bgcolor="${PANEL}" style="background-color:${PANEL};padding:26px 36px;border-top:1px solid ${LINEA};">
              <p style="margin:0 0 8px;color:${VERDE};font-size:13px;font-weight:800;letter-spacing:2px;">VOITOS</p>
              <p class="suave" style="margin:0;color:${SUAVE};font-size:14px;line-height:21px;">
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

export interface DatosBienvenida {
  cuidadorNombre: string;
  enlaceApp: string;

  enlacePassword?: string;
  horasParaVencer?: number;
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

    ${boton("Abrir Voitos", d.enlaceApp)}

    ${
      d.enlacePassword
        ? aviso(
            "¿Querés entrar también con una contraseña?",
            `Entraste con Google, así que no hace falta ninguna. Si igual querés poder ` +
              `entrar sin Google, elegí una acá: <a href="${d.enlacePassword}" style="color:${VERDE};font-weight:700;">poner una contraseña</a>. ` +
              `El enlace vale ${d.horasParaVencer ?? 24} horas y podés ignorarlo sin problema.`,
            VERDE
          )
        : ""
    }`;

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

export interface DatosRecuperacion {
  cuidadorNombre: string;
  enlace: string;
  horasParaVencer: number;

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
