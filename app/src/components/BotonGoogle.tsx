import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import { dibujarBotonGoogle, googleDisponible } from "../lib/google";
import { iniciarSesionConGoogle } from "../lib/voitos";

// Boton de "Continuar con Google".
//
// El boton lo dibuja Google adentro de este contenedor: no es un boton nuestro
// con su logo. GIS solo entrega el ID token a traves de su propio boton, y
// ademas es lo que piden sus condiciones de uso.
//
// Si Google no esta configurado (falta EXPO_PUBLIC_GOOGLE_CLIENT_ID) el
// componente no dibuja nada. La pantalla queda igual que antes, sin un boton
// roto que promete algo que no funciona.
export default function BotonGoogle({ ancho = 280 }: { ancho?: number }) {
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

      <View ref={contenedor} style={{ minHeight: 44 }} />

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    alignItems: "center",
    width: "100%",
    gap: 14,
  },
  separador: {
    flexDirection: "row",
    alignItems: "center",
    width: 280,
    gap: 12,
  },
  linea: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  oTexto: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 13,
    letterSpacing: 1,
  },
  error: {
    color: "#FFB4A2",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 320,
  },
});
