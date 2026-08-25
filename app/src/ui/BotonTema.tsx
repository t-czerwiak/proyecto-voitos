import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { crearEstilos, espacio, radio, texto, toque, useColores, useTema } from "../tema";

type Props = {
  // "suelto" lo alinea a la derecha, para la esquina de una pantalla de
  // entrada. "enFila" lo deja donde caiga, para meterlo en una barra.
  posicion?: "suelto" | "enFila";
};

// El interruptor de claro / oscuro.
//
// Va en la portada, en el inicio de sesión y en el registro porque son las
// tres pantallas por las que se pasa antes de entrar: quien necesita el otro
// modo lo necesita YA, no después de encontrar una pantalla de ajustes. Es
// también el único lugar donde alguien que todavía no tiene cuenta puede
// cambiarlo.
//
// Dice a qué modo va a pasar, no en cuál está. "Modo claro" con un sol es una
// promesa de lo que va a ocurrir al tocarlo; poner el estado actual obliga a
// deducir el resto.
export default function BotonTema({ posicion = "suelto" }: Props) {
  const { esOscuro, alternar, modo } = useTema();
  const colores = useColores();
  const styles = useEstilos();

  const vaAClaro = esOscuro;

  return (
    <View style={posicion === "suelto" ? styles.suelto : undefined}>
      <Pressable
        onPress={alternar}
        style={({ pressed }) => [styles.boton, pressed && styles.activo]}
        accessibilityRole="button"
        accessibilityLabel={vaAClaro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
        accessibilityHint={
          modo === "auto"
            ? "Ahora sigue lo que diga el sistema. Al tocarlo, queda fijo."
            : undefined
        }
      >
        <Ionicons
          name={vaAClaro ? "sunny" : "moon"}
          size={20}
          color={colores.acento}
        />

        {/* El texto va al lado del icono a propósito. Un sol solo es una
            adivinanza: puede leerse como "estás en claro" o como "pasá a
            claro", que son cosas opuestas. */}
        <Text style={styles.texto}>{vaAClaro ? "Modo claro" : "Modo oscuro"}</Text>
      </Pressable>
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  suelto: {
    alignSelf: "flex-end" as const,
    marginBottom: espacio.md,
  },

  boton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: espacio.sm,
    minHeight: toque.minimo,
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.sm,
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: radio.redondo,
  },

  activo: {
    borderColor: colores.acento,
    backgroundColor: colores.superficieAlta,
  },

  texto: {
    ...texto.etiqueta,
    color: colores.texto,
  },
}));
