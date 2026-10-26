import React, { useEffect, useSyncExternalStore } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  crearEstilos,
  useColores,
  espacio,
  radio,
  texto,
  ANCHO_FORMULARIO,
} from "../tema";
import {
  leerDialogo,
  leerDialogoEnServidor,
  responderDialogo,
  suscribirDialogo,
} from "../lib/avisos";
import Boton from "./Boton";

export default function Dialogo() {
  const pedido = useSyncExternalStore(
    suscribirDialogo,
    leerDialogo,
    leerDialogoEnServidor
  );

  const colores = useColores();
  const styles = useEstilos();

  const abierto = pedido !== null;
  const peligro = pedido?.tono === "peligro";

  useEffect(() => {
    if (!abierto || typeof document === "undefined") return;

    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") responderDialogo(false);
    };

    document.addEventListener("keydown", alTeclear);
    return () => document.removeEventListener("keydown", alTeclear);
  }, [abierto]);

  return (
    <Modal
      visible={abierto}
      transparent
      animationType="fade"
      onRequestClose={() => responderDialogo(false)}
    >
      <Pressable
        style={styles.fondo}
        onPress={() => responderDialogo(false)}
        accessibilityLabel="Cerrar sin hacer nada"
      >
        <Pressable
          style={styles.tarjeta}
          onPress={() => {}}
          accessibilityViewIsModal
          accessibilityLiveRegion="assertive"
        >
          {pedido && (
            <>
              <View style={styles.encabezado}>
                <Ionicons
                  name={peligro ? "warning" : "help-circle"}
                  size={26}
                  color={peligro ? colores.peligro.texto : colores.acento}
                />
                <Text style={styles.titulo}>{pedido.titulo}</Text>
              </View>

              <ScrollView
                key={pedido.id}
                style={styles.cuerpo}
                contentContainerStyle={styles.cuerpoInterior}
              >
                {pedido.parrafos.map((parrafo, i) => (
                  <Text key={i} style={styles.parrafo}>
                    {parrafo}
                  </Text>
                ))}
              </ScrollView>

              <View style={styles.botones}>
                <Boton
                  titulo="Cancelar"
                  variante="secundario"
                  ancho="auto"
                  onPress={() => responderDialogo(false)}
                />
                <Boton
                  titulo={pedido.textoOk}
                  variante={peligro ? "peligro" : "principal"}
                  ancho="auto"
                  onPress={() => responderDialogo(true)}
                />
              </View>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const useEstilos = crearEstilos((colores) => ({
  fondo: {
    flex: 1,

    backgroundColor: "rgba(0, 0, 0, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: espacio.lg,
  },

  tarjeta: {
    width: "100%",
    maxWidth: ANCHO_FORMULARIO,

    maxHeight: "85%",
    backgroundColor: colores.superficieAlta,
    borderWidth: 2,
    borderColor: colores.bordeFuerte,
    borderRadius: radio.xl,
    padding: espacio.xl,
    gap: espacio.lg,
  },

  encabezado: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: espacio.sm,
  },

  titulo: {
    ...texto.seccion,
    color: colores.texto,
    flexShrink: 1,
  },

  cuerpo: {
    flexGrow: 0,
    flexShrink: 1,
  },

  cuerpoInterior: {
    gap: espacio.md,
  },

  parrafo: {
    ...texto.cuerpo,
    color: colores.textoSuave,
  },

  botones: {
    flexDirection: "row",
    gap: espacio.md,
  },
}));
