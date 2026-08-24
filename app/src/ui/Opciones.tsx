import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colores, espacio, radio, texto, toque } from "../tema";

type Opcion = {
  valor: string;
  etiqueta: string;
  // Una linea que explica que significa elegir esto.
  detalle?: string;
};

type Props = {
  etiqueta: string;
  valor: string;
  alCambiar: (v: string) => void;
  opciones: Opcion[];
};

// Elegir una entre pocas opciones, con las dos a la vista.
//
// Un desplegable esconde las opciones hasta que se lo abre; cuando son dos o
// tres y la eleccion cambia el resto del formulario, es mejor que se vean
// juntas. La elegida se marca con un tilde ademas del color, asi que tambien
// se distingue en blanco y negro.
export default function Opciones({ etiqueta, valor, alCambiar, opciones }: Props) {
  return (
    <View style={styles.caja}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>

      {/* radiogroup: el lector de pantalla anuncia "1 de 2" al recorrerlas. */}
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
              // react-native-web no traduce accessibilityState.checked a
              // aria-checked en un role="radio", asi que el navegador no
              // sabia cual estaba elegida. Se pone a mano.
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

const styles = StyleSheet.create({
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
});
