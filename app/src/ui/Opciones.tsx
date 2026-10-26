import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { crearEstilos, useColores, espacio, radio, texto, toque } from "../tema";

type Opcion = {
  valor: string;
  etiqueta: string;

  detalle?: string;
};

type Props = {
  etiqueta: string;
  valor: string;
  alCambiar: (v: string) => void;
  opciones: Opcion[];
};

export default function Opciones({ etiqueta, valor, alCambiar, opciones }: Props) {
  const styles = useEstilos();
  const colores = useColores();

  return (
    <View style={styles.caja}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>

      <View style={styles.lista} accessibilityRole="radiogroup">
        {opciones.map((o) => {
          const elegida = o.valor === valor;

          return (
            <Pressable
              key={o.valor}
              onPress={() => alCambiar(o.valor)}
              style={({ pressed }) => [
                styles.opcion,
                elegida && styles.opcionElegida,
                pressed && styles.opcionActiva,
              ]}
              accessibilityRole="radio"
              accessibilityLabel={o.etiqueta}
              accessibilityHint={o.detalle}
              accessibilityState={{ checked: elegida, selected: elegida }}

              aria-checked={elegida}
            >
              <Ionicons
                name={elegida ? "radio-button-on" : "radio-button-off"}
                size={22}
                color={elegida ? colores.acento : colores.textoTenue}
              />

              <View style={styles.textos}>
                <Text style={[styles.titulo, elegida && styles.tituloElegido]}>
                  {o.etiqueta}
                </Text>
                {o.detalle && <Text style={styles.detalle}>{o.detalle}</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>
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

  lista: {
    gap: espacio.sm,
  },

  opcion: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.md,
    minHeight: toque.comodo,
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: radio.md,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.md,
  },

  opcionElegida: {
    borderColor: colores.acento,
    backgroundColor: colores.superficieAlta,
  },

  opcionActiva: {
    borderColor: colores.texto,
  },

  textos: {
    flex: 1,
  },

  titulo: {
    ...texto.cuerpo,
    color: colores.textoSuave,
  },

  tituloElegido: {
    ...texto.cuerpoFuerte,
    color: colores.texto,
  },

  detalle: {
    ...texto.dato,
    color: colores.textoTenue,
    marginTop: 2,
  },
}));
