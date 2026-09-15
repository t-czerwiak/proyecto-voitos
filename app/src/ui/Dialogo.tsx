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

// El dialogo de confirmacion de la aplicacion.
//
// Reemplaza a window.confirm. El porque esta escrito en lib/avisos.ts; el
// resumen es que el dialogo del navegador dice "voitos.vercel.app dice" arriba
// de un texto sobre medicacion, que es exactamente la forma de los avisos
// falsos, y que no respeta ni un color ni un tamano de los nuestros.
//
// Va montado UNA vez, en el layout raiz, y escucha si hay una pregunta
// pendiente. Las pantallas no lo dibujan ni lo conocen: llaman a confirmar() y
// esperan la respuesta.
//
// Que tiene que el del navegador no tenia:
//
//   - Los dos botones dicen que hacen ("Eliminar cuenta", no "Aceptar"), y el
//     que borra va en rojo.
//   - Se sale con Escape, tocando afuera o con "Cancelar", y las tres cosas
//     responden que NO. Solo el boton de confirmar dice que si.
//   - El texto largo scrollea adentro de la tarjeta en vez de empujar los
//     botones fuera de la pantalla, que es lo que pasaba en un celular chico.
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

  // Escape cierra, respondiendo que no.
  //
  // El Modal de react-native-web ya llama a onRequestClose en Escape, pero solo
  // si el foco quedo adentro del dialogo. Si la persona venia navegando con el
  // mouse el foco puede estar en el body y entonces no llega. Escuchar en el
  // documento cubre los dos casos.
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
      {/* El fondo oscurecido. Tocarlo cancela, que es lo que espera cualquiera
          que haya usado un dialogo antes. */}
      <Pressable
        style={styles.fondo}
        onPress={() => responderDialogo(false)}
        accessibilityLabel="Cerrar sin hacer nada"
      >
        {/* Este Pressable no hace nada a proposito: para el toque, asi que
            tocar la tarjeta no cuenta como tocar el fondo y no la cierra. */}
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

              {/* El texto scrollea adentro. Sin esto, una rutina larga empujaba
                  los botones abajo del borde de la pantalla y no habia forma de
                  confirmar ni de cancelar. */}
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

              {/* Cancelar va primero en el orden de lectura y del tabulador: si
                  alguien llego hasta aca sin querer, lo primero que encuentra
                  es la salida. */}
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
    // Negro translucido y no un color de la paleta: lo que tiene que quedar
    // claro es que lo de atras esta apagado.
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: espacio.lg,
  },

  tarjeta: {
    width: "100%",
    maxWidth: ANCHO_FORMULARIO,
    // Nunca mas alto que la pantalla: de eso se encarga el scroll del cuerpo.
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
