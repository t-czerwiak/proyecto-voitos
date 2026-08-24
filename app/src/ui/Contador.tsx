import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colores, espacio, radio, texto, toque } from "../tema";

type Props = {
  etiqueta: string;
  valor: number;
  alCambiar: (v: number) => void;
  minimo?: number;
  maximo?: number;
  // Como se dice el numero en palabras: "3 pastillas", "2 semanas".
  enPalabras: (v: number) => string;
  ayuda?: string;
};

// El − / + de "cantidad por dosis" y "duracion de la rutina".
//
// Los botones pasaron a 56px y el numero a 26px. Ademas el conjunto es un
// control ajustable para el lector de pantalla: se anuncia como "Cantidad por
// dosis, 2 pastillas, ajustable" y se sube o baja con un gesto, sin tener que
// acertarle al signo menos.
export default function Contador({
  etiqueta,
  valor,
  alCambiar,
  minimo = 1,
  maximo = 99,
  enPalabras,
  ayuda,
}: Props) {
  const bajar = () => alCambiar(Math.max(minimo, valor - 1));
  const subir = () => alCambiar(Math.min(maximo, valor + 1));

  return (
    <View style={styles.caja}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>

      <View
        style={styles.control}
        accessibilityRole="adjustable"
        accessibilityLabel={etiqueta}
        accessibilityValue={{ min: minimo, max: maximo, now: valor, text: enPalabras(valor) }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === "increment") subir();
          if (e.nativeEvent.actionName === "decrement") bajar();
        }}
      >
        <Pressable
          onPress={bajar}
          disabled={valor <= minimo}
          style={({ pressed }) => [
            styles.boton,
            pressed && styles.botonActivo,
            valor <= minimo && styles.botonInactivo,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Restar uno a ${etiqueta.toLowerCase()}`}
          accessibilityState={{ disabled: valor <= minimo }}
        >
          <Ionicons name="remove" size={26} color={colores.acento} />
        </Pressable>

        {/* El numero no se anuncia por separado: ya lo dice el control
            ajustable de arriba, y repetirlo lo hace mas dificil de escuchar. */}
        <Text style={styles.valor} accessibilityElementsHidden>
          {enPalabras(valor)}
        </Text>

        <Pressable
          onPress={subir}
          disabled={valor >= maximo}
          style={({ pressed }) => [
            styles.boton,
            pressed && styles.botonActivo,
            valor >= maximo && styles.botonInactivo,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Sumar uno a ${etiqueta.toLowerCase()}`}
          accessibilityState={{ disabled: valor >= maximo }}
        >
          <Ionicons name="add" size={26} color={colores.acento} />
        </Pressable>
      </View>

      {ayuda && <Text style={styles.ayuda}>{ayuda}</Text>}
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

  control: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.bordeFuerte,
    borderRadius: radio.md,
    padding: espacio.xs,
  },

  boton: {
    width: toque.comodo,
    height: toque.comodo,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radio.sm,
    backgroundColor: colores.superficieAlta,
  },

  botonActivo: {
    backgroundColor: colores.borde,
  },

  botonInactivo: {
    opacity: 0.4,
  },

  valor: {
    ...texto.hora,
    color: colores.texto,
    textAlign: "center",
    flex: 1,
  },

  ayuda: {
    ...texto.dato,
    color: colores.textoTenue,
    marginTop: espacio.xs,
  },
});
