import { Platform, TextStyle } from "react-native";

const REDONDA = Platform.select({
  web: "Nunito_400Regular, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  default: "Nunito_400Regular",
});

const NEGRITA = Platform.select({
  web: "Nunito_700Bold, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  default: "Nunito_700Bold",
});

export const fuentes = {
  redonda: REDONDA,
  negrita: NEGRITA,
};

export const texto = {
  titulo: {
    fontFamily: NEGRITA,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: 0.2,
  },

  seccion: {
    fontFamily: NEGRITA,
    fontSize: 21,
    lineHeight: 28,
  },

  item: {
    fontFamily: NEGRITA,
    fontSize: 19,
    lineHeight: 26,
  },

  cuerpo: {
    fontFamily: REDONDA,
    fontSize: 17,
    lineHeight: 26,
  },

  cuerpoFuerte: {
    fontFamily: NEGRITA,
    fontSize: 17,
    lineHeight: 26,
  },

  dato: {
    fontFamily: REDONDA,
    fontSize: 15,
    lineHeight: 22,
  },

  etiqueta: {
    fontFamily: NEGRITA,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.4,
  },

  hora: {
    fontFamily: NEGRITA,
    fontSize: 26,
    lineHeight: 32,
    fontVariant: ["tabular-nums"],
  },

  boton: {
    fontFamily: NEGRITA,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
} satisfies Record<string, TextStyle>;
