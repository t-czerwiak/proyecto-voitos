// Paleta de Voitos.
//
// Los colores son los mismos de siempre —el verde neon sobre el verde muy
// oscuro— pero dejaron de estar sueltos en cada pantalla. Aca estan una sola
// vez y con nombre de ROL, no de color: "peligro.texto" y no "#FF9B9B". Asi
// cambiar el rojo de las acciones destructivas es tocar una linea, y no
// buscar "#FF8080" en catorce archivos.
//
// Todas las combinaciones de texto sobre fondo que se usan en la aplicacion
// llegan como minimo a 4.5:1, el minimo que pide WCAG AA para texto normal.
// La verificacion esta en scripts/contraste.js y se corre con
// `npm run contraste`.

export const colores = {
  // FONDOS
  fondo: "#010D07",
  // El degradado historico de la marca. Se mantiene igual.
  degradado: ["#002B11", "#021108", "#000000"] as const,

  // Las tarjetas y los campos. Dos niveles: el normal y uno mas claro para
  // lo que tiene que despegarse del resto (la dosis que sigue, por ejemplo).
  superficie: "#04200F",
  superficieAlta: "#073019",

  borde: "#1A6B38",
  bordeFuerte: "#1E7A42",

  // ACENTO
  //
  // El verde de la marca. Sobre el fondo oscuro da 15:1, asi que sirve tanto
  // para texto como para rellenar el boton principal (con letra casi negra).
  acento: "#00FF7F",
  acentoSuave: "#90EE90",
  // Texto que va ARRIBA del acento cuando el acento es el relleno.
  sobreAcento: "#00190C",

  // TEXTO
  texto: "#FFFFFF",
  textoSuave: "#CFE8DA",
  // El mas apagado que se permite. Por debajo de esto no baja nada, porque
  // deja de leerse con luz de dia en la pantalla de un celular.
  textoTenue: "#9FC4AF",

  // ESTADOS
  //
  // Cada uno tiene fondo, borde y texto pensados juntos. El color nunca viaja
  // solo: siempre lo acompana un icono y una palabra (ver el componente
  // Estado), porque una persona daltonica no ve la diferencia entre el ambar
  // y el verde.
  ok: {
    fondo: "#04240F",
    borde: "#146A34",
    texto: "#7CFFB0",
  },

  atencion: {
    fondo: "#2A2005",
    borde: "#7A5C12",
    texto: "#F2D08A",
    solido: "#E0A82E",
  },

  peligro: {
    fondo: "#2A0D0D",
    borde: "#8B2E2E",
    texto: "#FF9B9B",
    solido: "#FF6B6B",
  },

  // Un gris verdoso para lo que todavia no paso: ni bien ni mal, pendiente.
  neutro: {
    fondo: "#0C2415",
    borde: "#1E7A42",
    texto: "#CFE8DA",
  },
} as const;

// Un color por rutina de medicacion.
//
// Se usan para distinguir rutinas de un vistazo en el calendario. NUNCA son
// la unica forma de saber cual es cual: al lado siempre esta el nombre de la
// pastilla escrito. El color ayuda a quien lo ve; el texto es para todos.
export const COLORES_RUTINA = [
  "#FF6B8B",
  "#66B8FF",
  "#FFD166",
  "#C2A3FF",
  "#5CE1FF",
  "#FFA94D",
] as const;
