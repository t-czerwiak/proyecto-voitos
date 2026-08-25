import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Href, router } from "expo-router";
import { crearEstilos, useColores, espacio, radio, texto, toque } from "../tema";

type Props = {
  titulo: string;
  // Una linea que explica para que sirve la pantalla. En una aplicacion que
  // se usa de apuro, decir "Elegí qué pastilla y a qué hora" arriba de todo
  // ahorra mas tiempo que cualquier icono.
  bajada?: string;
  // A donde vuelve la flecha. Por defecto, a la pantalla anterior.
  volverA?: Href;
  // La portada y el inicio de sesion no tienen a donde volver.
  sinVolver?: boolean;
};

// El encabezado de cada pantalla: flecha para volver y titulo.
//
// Antes se volvia tocando el logo, o el titulo, sin ninguna senal de que eso
// se pudiera tocar. Quien no lo sabia de memoria quedaba encerrado en la
// pantalla —en el navegador no hay boton de atras a mano en un celular—.
// Ahora hay una flecha con la palabra "Volver" al lado, de 48px.
export default function Encabezado({ titulo, bajada, volverA, sinVolver }: Props) {
  const styles = useEstilos();
  const colores = useColores();

  const volver = () => {
    if (volverA) {
      router.push(volverA);
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.push("/home");
  };

  return (
    <View style={styles.caja}>
      {!sinVolver && (
        <Pressable
          onPress={volver}
          style={({ pressed }) => [styles.volver, pressed && styles.volverActivo]}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={colores.acento} />
          <Text style={styles.volverTexto}>Volver</Text>
        </Pressable>
      )}

      {/* role de encabezado: en el navegador sale como <h1> y un lector de
          pantalla puede saltar de titulo en titulo. */}
      <Text style={styles.titulo} accessibilityRole="header">
        {titulo}
      </Text>

      {bajada && <Text style={styles.bajada}>{bajada}</Text>}
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  caja: {
    width: "100%",
    marginBottom: espacio.xl,
  },

  volver: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: espacio.sm,
    minHeight: toque.minimo,
    paddingRight: espacio.md,
    paddingVertical: espacio.sm,
    borderRadius: radio.sm,
    marginBottom: espacio.sm,
  },

  volverActivo: {
    backgroundColor: colores.superficie,
  },

  volverTexto: {
    ...texto.cuerpoFuerte,
    color: colores.acento,
  },

  titulo: {
    ...texto.titulo,
    color: colores.texto,
  },

  bajada: {
    ...texto.cuerpo,
    color: colores.textoSuave,
    marginTop: espacio.sm,
  },
}));
