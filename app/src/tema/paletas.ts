export type Paleta = {
  fondo: string;
  degradado: readonly [string, string, string];
  superficie: string;
  superficieAlta: string;
  borde: string;
  bordeFuerte: string;

  acento: string;
  acentoSuave: string;

  sobreAcento: string;

  texto: string;
  textoSuave: string;
  textoTenue: string;

  ok: { fondo: string; borde: string; texto: string };
  atencion: { fondo: string; borde: string; texto: string; solido: string };
  peligro: { fondo: string; borde: string; texto: string; solido: string };
  neutro: { fondo: string; borde: string; texto: string };

  burbujas: readonly [string, string, string, string];
  opacidadBurbuja: number;

  rutinas: readonly string[];

  sobreRutina: string;
};

export const paletaOscura: Paleta = {
  fondo: "#010D07",

  degradado: ["#002B11", "#021108", "#000000"],

  superficie: "#04200F",
  superficieAlta: "#073019",

  borde: "#1A6B38",
  bordeFuerte: "#1E7A42",

  acento: "#00FF7F",
  acentoSuave: "#90EE90",
  sobreAcento: "#00190C",

  texto: "#FFFFFF",
  textoSuave: "#CFE8DA",

  textoTenue: "#9FC4AF",

  ok: { fondo: "#04240F", borde: "#146A34", texto: "#7CFFB0" },
  atencion: { fondo: "#2A2005", borde: "#7A5C12", texto: "#F2D08A", solido: "#E0A82E" },
  peligro: { fondo: "#2A0D0D", borde: "#8B2E2E", texto: "#FF9B9B", solido: "#FF6B6B" },

  neutro: { fondo: "#0C2415", borde: "#1E7A42", texto: "#CFE8DA" },

  burbujas: ["#00FF7F", "#90EE90", "#32CD32", "#00FF7F"],
  opacidadBurbuja: 0.13,

  rutinas: ["#FF6B8B", "#66B8FF", "#FFD166", "#C2A3FF", "#5CE1FF", "#FFA94D"],
  sobreRutina: "#0A0A0A",
};
