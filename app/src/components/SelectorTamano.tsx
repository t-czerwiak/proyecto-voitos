import React from "react";
import { Pressable, Text, View } from "react-native";
import IconoPastilla, { TAMANOS } from "./IconoPastilla";
import { crearEstilos, espacio, radio, texto } from "../tema";

type EstadoPress = { pressed: boolean; hovered?: boolean; focused?: boolean };

export default function SelectorTamano({ valor, alCambiar }: { valor: string; alCambiar: (v: string) => void }) {
  const styles = useEstilos();

  return (
    <View style={styles.caja}>
      <Text style={styles.etiqueta}>Tamaño de la pastilla</Text>

      <View style={styles.grilla} accessibilityRole="radiogroup">
        {TAMANOS.map((t) => {
          const elegida = t.valor === valor;
          return (
            <Pressable
              key={t.valor}
              onPress={() => alCambiar(t.valor)}
              accessibilityRole="radio"
              accessibilityState={{ checked: elegida }}
              accessibilityLabel={t.etiqueta}
              style={(e) => {
                const estado = e as EstadoPress;
                return [
                  styles.opcion,
                  (estado.hovered || estado.focused) && styles.opcionEncima,
                  elegida && styles.opcionElegida,
                ];
              }}
            >
              <IconoPastilla tipo={t.valor} tam={52} />
              <Text style={[styles.nombre, elegida && styles.nombreElegido]}>{t.etiqueta}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  caja: {
    marginBottom: espacio.lg,
  },

  etiqueta: {
    ...texto.cuerpoFuerte,
    color: colores.texto,
    marginBottom: espacio.sm,
  },

  grilla: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacio.sm,
  },

  opcion: {
    flexGrow: 1,
    flexBasis: 130,
    alignItems: "center",
    gap: espacio.xs,
    paddingVertical: espacio.md,
    borderRadius: radio.md,
    borderWidth: 2,
    borderColor: colores.borde,
    backgroundColor: colores.superficie,
  },

  opcionEncima: {
    borderColor: colores.bordeFuerte,
  },

  opcionElegida: {
    borderColor: colores.acento,
    backgroundColor: colores.superficieAlta,
  },

  nombre: {
    ...texto.cuerpo,
    color: colores.textoSuave,
  },

  nombreElegido: {
    ...texto.cuerpoFuerte,
    color: colores.acento,
  },
}));
