// Pantalla de diagnostico del pastillero. No forma parte del flujo de la app:
// no hay ningun link que lleve aca, se entra escribiendo /prueba-hardware en
// el navegador. Sirve para verificar que el backend alcanza a la ESP32 por la
// red local sin depender de que haya una dosis agendada.
//
// Muestra la respuesta cruda del backend a proposito: cuando algo falla, lo
// util es ver la URL exacta a la que se le pego y que contesto el dispositivo.

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";

import { API_URL } from "../lib/api";
import { dispensarAhora } from "../lib/voitos";

export default function PruebaHardware() {
  const [cantidad, setCantidad] = useState("1");
  const [destino, setDestino] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState("");
  const [fallo, setFallo] = useState(false);

  const dispensar = async () => {
    setResultado("");
    setFallo(false);

    const cuantas = Number(cantidad);
    if (!Number.isInteger(cuantas) || cuantas < 1 || cuantas > 20) {
      setFallo(true);
      setResultado("La cantidad tiene que ser un entero entre 1 y 20.");
      return;
    }

    setEnviando(true);
    try {
      const r = await dispensarAhora({
        cantidad: cuantas,
        // Vacio = el backend usa ESP32_URL del .env. Poder pisarlo desde aca
        // evita reiniciar el backend cuando cambia la IP del pastillero.
        destino: destino.trim() || undefined,
      });

      setResultado(
        [
          "SEÑAL ENVIADA",
          "",
          `URL:        ${r.destino}`,
          `Cantidad:   ${r.cantidad}`,
          `Horario:    ${r.horario_id ?? "ninguno (no se va a registrar)"}`,
          `Dispositivo dice: ${r.respuesta_dispositivo}`,
          "",
          r.horario_id
            ? "Apretá el botón del pastillero para confirmar la dosis."
            : "No había dosis pendiente: sirvió para probar el hardware, pero no queda registrada.",
        ].join("\n")
      );
    } catch (e: any) {
      setFallo(true);
      setResultado(`FALLÓ (${e.status ?? "?"})\n\n${e.message}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contenido}>
      <Text style={styles.titulo}>PRUEBA DE HARDWARE</Text>

      <Text style={styles.ayuda}>Backend: {API_URL}</Text>

      <Text style={styles.label}>Cantidad de pastillas</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={cantidad}
        onChangeText={setCantidad}
      />

      <Text style={styles.label}>IP del pastillero (opcional)</Text>
      <TextInput
        style={styles.input}
        placeholder="vacío = el del .env"
        placeholderTextColor="#777"
        autoCapitalize="none"
        value={destino}
        onChangeText={setDestino}
      />

      <TouchableOpacity
        style={styles.boton}
        onPress={dispensar}
        disabled={enviando}
      >
        <Text style={styles.botonTexto}>
          {enviando ? "ENVIANDO..." : "DISPENSAR AHORA"}
        </Text>
      </TouchableOpacity>

      {resultado !== "" && (
        <Text style={[styles.salida, fallo && styles.salidaFallo]}>
          {resultado}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },

  contenido: {
    padding: 24,
    gap: 10,
  },

  titulo: {
    color: "#FFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 4,
  },

  ayuda: {
    color: "#777",
    fontSize: 12,
    marginBottom: 12,
  },

  label: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 8,
  },

  input: {
    backgroundColor: "#FFF",
    height: 46,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
  },

  boton: {
    marginTop: 20,
    height: 60,
    borderRadius: 14,
    backgroundColor: "#01250e",
    borderWidth: 2,
    borderColor: "#105a2c",
    alignItems: "center",
    justifyContent: "center",
  },

  botonTexto: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },

  // Monoespaciada: es salida tecnica, y alineada se lee mucho mejor.
  salida: {
    marginTop: 20,
    color: "#00FF7F",
    fontFamily: "monospace",
    fontSize: 13,
    lineHeight: 20,
  },

  salidaFallo: {
    color: "#FF6B6B",
  },
});
