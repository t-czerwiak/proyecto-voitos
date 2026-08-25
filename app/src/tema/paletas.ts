// Las dos paletas de Voitos.
//
// Los colores son los mismos de siempre —el verde de la marca sobre el verde
// muy oscuro— pero ahora hay dos versiones de todo. No es una preferencia
// estética: es la razón más común por la que alguien no puede leer una
// pantalla.
//
// Quien cuida usa esta aplicación en las dos puntas del día. A las siete de la
// mañana, con la persiana baja, una pantalla blanca encandila. A las tres de
// la tarde, junto a una ventana, una pantalla oscura se vuelve un espejo y no
// se lee nada. Un enfermero en un pasillo con tubos fluorescentes está en el
// segundo caso todo el turno. Ninguno de los dos modos sirve para los dos
// momentos, así que están los dos y se puede elegir.
//
// Las dos paletas tienen exactamente los mismos ROLES, así que ninguna
// pantalla necesita saber en cuál está: pide "el color del texto" y recibe el
// que corresponde. Y las dos están verificadas contra WCAG AA con el mismo
// script (npm run contraste), porque un modo claro improvisado suele terminar
// con gris claro sobre blanco, que es peor que no tenerlo.

export type Paleta = {
  // FONDOS
  fondo: string;
  degradado: readonly [string, string, string];
  superficie: string;
  superficieAlta: string;
  borde: string;
  bordeFuerte: string;

  // ACENTO
  acento: string;
  acentoSuave: string;
  // El texto que va ARRIBA del acento cuando el acento es el relleno.
  sobreAcento: string;

  // TEXTO
  texto: string;
  textoSuave: string;
  textoTenue: string;

  // ESTADOS
  ok: { fondo: string; borde: string; texto: string };
  atencion: { fondo: string; borde: string; texto: string; solido: string };
  peligro: { fondo: string; borde: string; texto: string; solido: string };
  neutro: { fondo: string; borde: string; texto: string };

  // EL FONDO ANIMADO
  //
  // Las burbujas de la lámpara de lava. Van en la paleta porque el verde neón
  // sobre un fondo claro no se ve —queda un fantasma blancuzco—, así que el
  // modo claro usa verdes profundos y con más opacidad.
  burbujas: readonly [string, string, string, string];
  opacidadBurbuja: number;

  // UN COLOR POR RUTINA
  //
  // Se usan para distinguir rutinas de un vistazo en el calendario. NUNCA son
  // la única forma de saber cuál es cuál: al lado siempre está escrito el
  // nombre de la pastilla. Los del modo claro son los mismos tonos bajados de
  // luminosidad, para que se vean sobre blanco.
  rutinas: readonly string[];
  // La letra que va encima de un color de rutina (los chips de los días).
  sobreRutina: string;
};

export const paletaOscura: Paleta = {
  fondo: "#010D07",
  // El degradado histórico de la marca. Se mantiene igual.
  degradado: ["#002B11", "#021108", "#000000"],

  // Las tarjetas y los campos. Dos niveles: el normal y uno más claro para lo
  // que tiene que despegarse del resto (la dosis que sigue, por ejemplo).
  superficie: "#04200F",
  superficieAlta: "#073019",

  borde: "#1A6B38",
  bordeFuerte: "#1E7A42",

  // El verde de la marca. Sobre el fondo oscuro da 15:1, así que sirve tanto
  // para texto como para rellenar el botón principal (con letra casi negra).
  acento: "#00FF7F",
  acentoSuave: "#90EE90",
  sobreAcento: "#00190C",

  texto: "#FFFFFF",
  textoSuave: "#CFE8DA",
  // El más apagado que se permite. Por debajo de esto no baja nada, porque
  // deja de leerse con luz de día en la pantalla de un celular.
  textoTenue: "#9FC4AF",

  ok: { fondo: "#04240F", borde: "#146A34", texto: "#7CFFB0" },
  atencion: { fondo: "#2A2005", borde: "#7A5C12", texto: "#F2D08A", solido: "#E0A82E" },
  peligro: { fondo: "#2A0D0D", borde: "#8B2E2E", texto: "#FF9B9B", solido: "#FF6B6B" },
  // Un gris verdoso para lo que todavía no pasó: ni bien ni mal, pendiente.
  neutro: { fondo: "#0C2415", borde: "#1E7A42", texto: "#CFE8DA" },

  burbujas: ["#00FF7F", "#90EE90", "#32CD32", "#00FF7F"],
  opacidadBurbuja: 0.13,

  rutinas: ["#FF6B8B", "#66B8FF", "#FFD166", "#C2A3FF", "#5CE1FF", "#FFA94D"],
  sobreRutina: "#0A0A0A",
};

export const paletaClara: Paleta = {
  // Papel con una pizca de verde, no blanco puro: sostiene mejor las horas de
  // lectura y mantiene el aire de la marca.
  fondo: "#F1F5F1",
  degradado: ["#E4EFE7", "#F1F5F1", "#FBFCFB"],

  superficie: "#FFFFFF",
  superficieAlta: "#EAF2EC",

  borde: "#6E8F7B",
  bordeFuerte: "#5F8670",

  // El neón no existe sobre blanco: da 1.2:1, es literalmente ilegible. El
  // acento del modo claro es el mismo verde de la marca bajado hasta que
  // aguanta como texto y como relleno de botón.
  acento: "#0A6631",
  acentoSuave: "#0C7E3B",
  sobreAcento: "#FFFFFF",

  texto: "#0A1912",
  textoSuave: "#33463C",
  textoTenue: "#4E6157",

  ok: { fondo: "#E3F2E8", borde: "#1E7A42", texto: "#0A5729" },
  atencion: { fondo: "#FDF2DC", borde: "#9A6206", texto: "#6B4404", solido: "#9A6206" },
  peligro: { fondo: "#FCEBEB", borde: "#B23B3B", texto: "#8C1D1D", solido: "#B22222" },
  neutro: { fondo: "#EAF0EC", borde: "#5F8670", texto: "#33463C" },

  // Verdes profundos y con algo más de cuerpo: sobre papel, una mancha muy
  // clara no se ve, se ensucia.
  burbujas: ["#0A6631", "#2E8B57", "#1E7A42", "#0C7E3B"],
  opacidadBurbuja: 0.1,

  // Los mismos seis tonos, oscurecidos hasta que se leen sobre blanco.
  rutinas: ["#B01F42", "#12579E", "#8A5B00", "#5B36A8", "#0B6A80", "#9A4A00"],
  sobreRutina: "#FFFFFF",
};
