// Escala tipografica.
//
// El diseno anterior tenia titulos de 58px y acciones de 12px en la misma
// pantalla. Eso no es jerarquia, es ruido: lo mas grande era lo decorativo
// (la palabra "PASTILLAS") y lo mas chico, lo que habia que apretar
// ("CERRAR SESION").
//
// Aca el tamano sigue a la importancia. El cuerpo arranca en 17px porque la
// aplicacion la usa un cuidador —muchas veces un hijo de mas de cincuenta, o
// alguien leyendo de apuro en un pasillo— y 13px con poca luz no se lee.
//
// Ningun texto de la aplicacion baja de 14px, y 14 se reserva para etiquetas
// de una o dos palabras, nunca para frases.

import { Platform, TextStyle } from "react-native";

// Nunito viene de @expo-google-fonts/nunito y la carga el layout raiz.
// El segundo nombre es el respaldo del sistema: si la fuente todavia no
// cargo, el texto se ve con la del telefono en vez de desaparecer.
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

// Los interlineados son ~1.4 del tamano en los titulos y ~1.5 en el cuerpo.
// Un parrafo apretado es de las cosas que mas cuestan cuando se lee con
// dificultad, y no cuesta nada arreglarlo.
export const texto = {
  // Titulo de pantalla. Uno solo por pantalla.
  titulo: {
    fontFamily: NEGRITA,
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: 0.2,
  },

  // Titulo de seccion adentro de una pantalla.
  seccion: {
    fontFamily: NEGRITA,
    fontSize: 21,
    lineHeight: 28,
  },

  // El nombre de una pastilla, de una actividad, de una persona.
  item: {
    fontFamily: NEGRITA,
    fontSize: 19,
    lineHeight: 26,
  },

  // Cuerpo. El tamano por defecto de todo lo que sea una frase.
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

  // Datos secundarios: "3 de 12 sin dispensar", "modulo 2".
  dato: {
    fontFamily: REDONDA,
    fontSize: 15,
    lineHeight: 22,
  },

  // Etiquetas cortas. Nunca frases.
  etiqueta: {
    fontFamily: NEGRITA,
    fontSize: 14,
    lineHeight: 18,
    letterSpacing: 0.4,
  },

  // La hora de una dosis. Es el dato que se busca de un vistazo, asi que va
  // grande y con numeros de ancho fijo para que las horas queden alineadas
  // una debajo de la otra.
  hora: {
    fontFamily: NEGRITA,
    fontSize: 26,
    lineHeight: 32,
    fontVariant: ["tabular-nums"],
  },

  // Texto del boton principal.
  boton: {
    fontFamily: NEGRITA,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 0.3,
  },
} satisfies Record<string, TextStyle>;
