import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { dibujarBotonGoogle, googleDisponible } from "../lib/google";
import { iniciarSesionConGoogle } from "../lib/voitos";
import { Aviso } from "../ui";
import { colores, espacio, texto } from "../tema";

// Boton de "Continuar con Google".
//
// El boton lo dibuja Google adentro de este contenedor: no es un boton nuestro
// con su logo. GIS solo entrega el ID token a traves de su propio boton, y
// ademas es lo que piden sus condiciones de uso.
//
// Si Google no esta configurado (falta EXPO_PUBLIC_GOOGLE_CLIENT_ID) el
// componente no dibuja nada. La pantalla queda igual que antes, sin un boton
// roto que promete algo que no funciona.
export default function BotonGoogle({ ancho = 360 }: { ancho?: number }) {
  const contenedor = useRef<View | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!googleDisponible()) return;

    // En web, View termina siendo un div: el ref ES el nodo del DOM.
    const nodo = contenedor.current as unknown as HTMLElement | null;
    if (!nodo) return;

    let vivo = true;

    dibujarBotonGoogle(
      nodo,
      async (idToken) => {
        setError("");
        try {
          await iniciarSesionConGoogle(idToken);
          router.replace("/home");
        } catch (e: any) {
          // El backend puede rechazar a proposito, por ejemplo cuando ese mail
          // ya tiene una cuenta con contrasena sin confirmar. El mensaje que
          // manda explica que hacer, asi que se muestra tal cual.
          if (vivo) setError(e.message);
        }
      },
      ancho
    ).catch((e: any) => {
      if (vivo) setError(e.message);
    });

    return () => {
      vivo = false;
    };
  }, [ancho]);

  if (!googleDisponible()) return null;

  return (
    <View style={styles.caja}>
      <View style={styles.separador}>
        <View style={styles.linea} />
        <Text style={styles.oTexto}>o</Text>
        <View style={styles.linea} />
      </View>

      {/* El boton lo dibuja Google adentro de este hueco. La altura minima
          es la del boton de Google, para que la pantalla no pegue un salto
          cuando termina de cargar. */}
      <View ref={contenedor} style={styles.hueco} />

      <Aviso texto={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    alignItems: "center",
    width: "100%",
    gap: espacio.lg,
    marginTop: espacio.lg,
  },

  separador: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: espacio.md,
  },

  linea: {
    flex: 1,
    height: 1,
    backgroundColor: colores.borde,
  },

  oTexto: {
    ...texto.dato,
    color: colores.textoSuave,
  },

  hueco: {
    minHeight: 44,
  },
});
