// Pantalla de diagnostico del pastillero. No forma parte del flujo de la app:
// no hay ningun link que lleve aca, se entra escribiendo /prueba-hardware en
// el navegador. Sirve para verificar que el backend alcanza a la ESP32 por la
// red local sin depender de que haya una dosis agendada.
//
// Muestra la respuesta cruda del backend a proposito: cuando algo falla, lo
// util es ver la URL exacta a la que se le pego y que contesto el dispositivo.
// Es la unica pantalla donde el texto va en monoespaciado, porque lo que se
// lee son URLs y respuestas de un aparato, no prosa.

import React, { useState } from "react";
import { Platform, Text, View } from "react-native";
import { API_URL } from "../lib/api";
import { dispensarAhora } from "../lib/voitos";
import { Pantalla, Encabezado, Campo, Boton, Aviso } from "../ui";
import { crearEstilos, espacio, radio, texto } from "../tema";

export default function PruebaHardware() {
  const styles = useEstilos();

  const [cantidad, setCantidad] = useState("1");
  const [destino, setDestino] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState("");
  const [fallo, setFallo] = useState(false);
  const [errorCantidad, setErrorCantidad] = useState("");

  const dispensar = async () => {
    setResultado("");
    setErrorCantidad("");
    setFallo(false);

    const cuantas = Number(cantidad);
    if (!Number.isInteger(cuantas) || cuantas < 1 || cuantas > 20) {
      setErrorCantidad("Tiene que ser un número entero entre 1 y 20");
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
      setResultado(`Falló (${e.status ?? "?"})\n\n${e.message}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla>
      <Encabezado
        titulo="Prueba de hardware"
        bajada="Le pide al backend que le mande la orden de dispensar al pastillero, ahora mismo."
        volverA="/home"
      />

      <View style={styles.backend}>
        <Text style={styles.backendEtiqueta}>Backend</Text>
        <Text style={styles.backendUrl}>{API_URL}</Text>
      </View>

      <Campo
        etiqueta="Cuántas pastillas"
        valor={cantidad}
        alCambiar={setCantidad}
        teclado="numeric"
        ayuda="Entre 1 y 20."
        error={errorCantidad}
      />

      <Campo
        etiqueta="IP del pastillero"
        valor={destino}
        alCambiar={setDestino}
        ayuda="Si lo dejás vacío se usa la del .env del backend."
        placeholder="192.168.1.50"
      />

      <Boton
        titulo={enviando ? "Enviando..." : "Dispensar ahora"}
        onPress={dispensar}
        cargando={enviando}
        ayuda="El pastillero va a sonar y liberar las pastillas"
      />

      {resultado !== "" && (
        <View
          style={[styles.salida, fallo && styles.salidaFallo]}
          accessibilityLiveRegion="polite"
        >
          <Aviso
            texto={fallo ? "La orden no llegó al pastillero" : "Señal enviada"}
            tipo={fallo ? "error" : "ok"}
          />

          <Text style={styles.salidaTexto} selectable>
            {resultado}
          </Text>
        </View>
      )}
    </Pantalla>
  );
}

const MONO = Platform.select({
  web: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  ios: "Menlo",
  default: "monospace",
});

const useEstilos = crearEstilos((colores) => ({
  backend: {
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: radio.md,
    padding: espacio.lg,
    marginBottom: espacio.xl,
  },

  backendEtiqueta: {
    ...texto.etiqueta,
    color: colores.acentoSuave,
    marginBottom: espacio.xs,
  },

  backendUrl: {
    fontFamily: MONO,
    fontSize: 15,
    lineHeight: 22,
    color: colores.texto,
  },

  salida: {
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    padding: espacio.lg,
    marginTop: espacio.xl,
  },

  salidaFallo: {
    borderColor: colores.peligro.borde,
  },

  salidaTexto: {
    fontFamily: MONO,
    fontSize: 14,
    lineHeight: 22,
    color: colores.textoSuave,
  },
}));
