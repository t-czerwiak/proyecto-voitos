// La paleta de Voitos.
//
// Es una sola: el verde de la marca sobre el verde muy oscuro. La aplicación
// no tiene modo claro ni interruptor de tema, y no es un olvido —es una
// decisión—. Dos paletas significan dos veces cada pantalla que revisar, dos
// veces cada contraste que verificar y un estado más que puede quedar a medio
// aplicar; para un equipo de tres eso se paga en pantallas rotas, no en
// comodidad. Quien necesite la pantalla más clara tiene el brillo del
// teléfono, que es el control que ya sabe usar.
//
// Los colores están organizados por ROL y no por tono: ninguna pantalla pide
// "el verde", pide "el color del texto". Todos los pares están verificados
// contra WCAG AA con el mismo script (npm run contraste).

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
  // Las burbujas de la lámpara de lava. Van en la paleta y no escritas en el
  // componente para que el fondo y el resto de la aplicación no puedan quedar
  // de dos verdes distintos.
  burbujas: readonly [string, string, string, string];
  opacidadBurbuja: number;

  // UN COLOR POR RUTINA
  //
  // Se usan para distinguir rutinas de un vistazo en el calendario. NUNCA son
  // la única forma de saber cuál es cuál: al lado siempre está escrito el
  // nombre de la pastilla, porque el color solo deja afuera a quien no
  // distingue esos tonos.
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

  // El verde de la marca. Sobre el fondo da 15:1, así que sirve tanto para
  // texto como para rellenar el botón principal (con letra casi negra).
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
