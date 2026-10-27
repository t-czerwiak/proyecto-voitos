import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  getMisPastilleros,
  vincularPastillero,
  desvincularPastillero,
  type PastilleroVinculado,
} from "../lib/voitos";
import { fechaConAnio } from "../lib/fechas";
import { confirmar } from "../lib/avisos";
import { Pantalla, Encabezado, Tarjeta, Boton, Campo, Aviso, Estado, Cargando } from "../ui";
import { crearEstilos, espacio, texto } from "../tema";

export default function MiPastillero() {
  const styles = useEstilos();
  const primeraVez = useLocalSearchParams<{ primera?: string }>().primera === "1";

  const [pastilleros, setPastilleros] = useState<PastilleroVinculado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [listo, setListo] = useState("");

  const [codigo, setCodigo] = useState("");
  const [errorCodigo, setErrorCodigo] = useState("");
  const [vinculando, setVinculando] = useState(false);

  const cargar = useCallback(() => {
    getMisPastilleros()
      .then((p) => {
        setPastilleros(p);
        setError("");
      })
      .catch((e: any) => setError(e?.message ?? "No se pudo ver tu pastillero"))
      .finally(() => setCargando(false));
  }, []);

  useFocusEffect(cargar);

  const vincular = async () => {
    const limpio = codigo.replace(/\D/g, "");
    if (limpio.length !== 8) {
      setErrorCodigo("Son los 8 números que aparecen abajo de la hora en el pastillero.");
      return;
    }

    setVinculando(true);
    setErrorCodigo("");
    setListo("");
    try {
      await vincularPastillero(limpio);
      setCodigo("");
      if (primeraVez) {
        router.replace("/home");
        return;
      }
      setListo("Listo, el pastillero quedó vinculado a tu cuenta.");
      cargar();
    } catch (e: any) {
      setErrorCodigo(e?.message ?? "No se pudo vincular");
    } finally {
      setVinculando(false);
    }
  };

  const desvincular = async (p: PastilleroVinculado) => {
    const seguro = await confirmar(
      "Desvincular el pastillero",
      "Tus dosis dejan de salir por este pastillero y ya no vas a ver sus módulos. " +
        "Para volver a vincularlo, vas a necesitar el código que muestra su pantalla.",
      "Desvincular",
      "peligro"
    );
    if (!seguro) return;

    setError("");
    setListo("");
    try {
      await desvincularPastillero(p.dispositivo_id);
      cargar();
    } catch (e: any) {
      setError(e?.message ?? "No se pudo desvincular");
    }
  };

  return (
    <Pantalla angosta formulario>
      {primeraVez ? (
        <Encabezado
          titulo="Vinculá tu pastillero"
          sinVolver
          bajada="Es lo primero: así tus dosis salen por tu pastillero y lo ves en la app."
        />
      ) : (
        <Encabezado titulo="Mi pastillero" volverA="/perfil" principal />
      )}

      <Aviso texto={error} />
      <Aviso texto={listo} tipo="ok" />

      {cargando ? (
        <Cargando texto="Buscando tu pastillero..." />
      ) : (
        pastilleros.map((p) => (
          <Tarjeta key={p.dispositivo_id}>
            <Text style={styles.nombre}>{p.dispositivo_id}</Text>
            <View style={styles.estados}>
              <Estado texto="Vinculado a tu cuenta" tono="ok" icono="link-outline" />
            </View>
            {p.vinculado_at && (
              <Text style={styles.detalle}>Desde el {fechaConAnio(p.vinculado_at.slice(0, 10))}</Text>
            )}
            <Boton
              titulo="Desvincular"
              variante="secundario"
              icono="unlink-outline"
              onPress={() => desvincular(p)}
              ayuda="Tus dosis dejan de salir por este pastillero"
              estilo={styles.botonDesvincular}
            />
          </Tarjeta>
        ))
      )}

      <Text style={styles.seccion}>
        {pastilleros.length ? "Vincular otro pastillero" : "Vincular tu pastillero"}
      </Text>

      <Tarjeta>
        <Text style={styles.paso}>1. Enchufá el pastillero. Si no tiene WiFi, la pantalla dice SIN WIFI.</Text>
        <Text style={styles.paso}>
          2. Con el celular, conectate a la red VOITOS que aparece, elegí el WiFi de la casa y poné la
          clave. Se hace una sola vez.
        </Text>
        <Text style={styles.paso}>
          3. Cuando se conecta, abajo de la hora aparece un código de 8 números. Escribilo acá, desde
          donde estés.
        </Text>

        <Campo
          etiqueta="Código del pastillero"
          valor={codigo}
          alCambiar={setCodigo}
          error={errorCodigo}
          teclado="number-pad"
          placeholder="1234 5678"
          ayuda="Cambia cada 30 minutos y después de cada vínculo. Usá el que muestra ahora."
        />
        <Boton titulo="Vincular" icono="link-outline" onPress={vincular} cargando={vinculando} />
        {primeraVez && (
          <Boton
            titulo="Hacerlo más tarde"
            variante="enlace"
            onPress={() => router.replace("/home")}
            ayuda="Lo podés vincular después desde tu perfil"
          />
        )}
      </Tarjeta>
    </Pantalla>
  );
}

const useEstilos = crearEstilos((colores) => ({
  nombre: {
    ...texto.item,
    color: colores.texto,
    marginBottom: espacio.sm,
  },

  estados: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: espacio.sm,
  },

  detalle: {
    ...texto.dato,
    color: colores.textoSuave,
    marginTop: espacio.sm,
  },

  botonDesvincular: {
    marginTop: espacio.lg,
  },

  seccion: {
    ...texto.seccion,
    color: colores.texto,
    marginTop: espacio.xl,
    marginBottom: espacio.sm,
  },

  paso: {
    ...texto.cuerpo,
    color: colores.texto,
    marginBottom: espacio.md,
  },
}));
