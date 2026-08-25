import React from "react";
import { Pressable, Text, View } from "react-native";
import { crearEstilos, espacio, radio, texto, toque } from "../tema";

export const DIAS = ["L", "M", "X", "J", "V", "S", "D"];

// El nombre entero de cada dia, para el lector de pantalla.
//
// "L" leido en voz alta es "ele", que no es un dia de la semana. La letra
// sirve para el ojo; el oido necesita la palabra.
const NOMBRE: Record<string, string> = {
  L: "lunes",
  M: "martes",
  X: "miércoles",
  J: "jueves",
  V: "viernes",
  S: "sábado",
  D: "domingo",
};

type Props = {
  etiqueta: string;
  seleccionados: string[];
  alCambiar: (dias: string[]) => void;
  ayuda?: string;
};

// Los siete dias de la semana como casillas.
//
// Antes eran circulos de 40px que se prendian en verde. Dos problemas: 40px
// es chico para el dedo, y el unico indicio de que un dia estaba elegido era
// el color. Ahora el elegido ademas cambia de forma (relleno lleno y borde
// grueso), lleva el estado en accessibilityState y abajo se lee escrito
// cuales quedaron elegidos.
export default function SelectorDias({
  etiqueta,
  seleccionados,
  alCambiar,
  ayuda,
}: Props) {
  const styles = useEstilos();

  const alternar = (dia: string) => {
    alCambiar(
      seleccionados.includes(dia)
        ? seleccionados.filter((d) => d !== dia)
        : [...seleccionados, dia]
    );
  };

  const enPalabras =
    seleccionados.length === 0
      ? "Ningún día elegido todavía"
      : seleccionados.length === 7
        ? "Todos los días"
        : DIAS.filter((d) => seleccionados.includes(d))
            .map((d) => NOMBRE[d])
            .join(", ");

  return (
    <View style={styles.caja}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>

      <View style={styles.fila}>
        {DIAS.map((dia) => {
          const elegido = seleccionados.includes(dia);

          return (
            <Pressable
              key={dia}
              onPress={() => alternar(dia)}
              style={({ pressed }) => [
                styles.dia,
                elegido && styles.diaElegido,
                pressed && styles.diaActivo,
              ]}
              accessibilityRole="checkbox"
              accessibilityLabel={NOMBRE[dia]}
              accessibilityState={{ checked: elegido }}
              // Ver el comentario de Opciones: hace falta el aria a mano.
              aria-checked={elegido}
            >
              <Text style={[styles.diaTexto, elegido && styles.diaTextoElegido]}>
                {dia}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* La lista escrita. Sirve para confirmar de un vistazo que se marco lo
          que se queria, sin tener que releer siete circulos. */}
      <Text style={styles.resumen}>{enPalabras}</Text>

      {ayuda && <Text style={styles.ayuda}>{ayuda}</Text>}
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  caja: {
    width: "100%",
    marginBottom: espacio.lg,
  },

  etiqueta: {
    ...texto.cuerpoFuerte,
    color: colores.texto,
    marginBottom: espacio.sm,
  },

  fila: {
    flexDirection: "row",
    gap: espacio.sm,
  },

  dia: {
    flex: 1,
    minWidth: 40,
    minHeight: toque.comodo,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: radio.md,
  },

  diaElegido: {
    backgroundColor: colores.acento,
    borderColor: colores.acento,
  },

  diaActivo: {
    borderColor: colores.texto,
  },

  diaTexto: {
    ...texto.cuerpoFuerte,
    color: colores.textoSuave,
  },

  diaTextoElegido: {
    color: colores.sobreAcento,
  },

  resumen: {
    ...texto.dato,
    color: colores.textoSuave,
    marginTop: espacio.sm,
  },

  ayuda: {
    ...texto.dato,
    color: colores.textoTenue,
    marginTop: espacio.xs,
  },
}));
