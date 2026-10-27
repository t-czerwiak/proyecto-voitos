import React, { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  crearPastilla,
  getMisPastilleros,
  nombrePastillero,
  type PastilleroVinculado,
} from "../lib/voitos";
import SelectorTamano from "../components/SelectorTamano";
import { Pantalla, Encabezado, Campo, Opciones, Boton, Aviso } from "../ui";
import { espacio } from "../tema";

export default function AgregarMedicacion() {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("chico");
  const [cantidad, setCantidad] = useState("");
  const [pastilleros, setPastilleros] = useState<PastilleroVinculado[]>([]);
  const [pastillero, setPastillero] = useState("");

  useFocusEffect(
    useCallback(() => {
      getMisPastilleros()
        .then((lista) => {
          setPastilleros(lista);
          setPastillero((actual) => actual || lista[0]?.dispositivo_id || "");
        })
        .catch(() => setPastilleros([]));
    }, [])
  );

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errorNombre, setErrorNombre] = useState("");
  const [exito, setExito] = useState("");

  const handleAgregar = async () => {
    setError("");
    setErrorNombre("");
    setExito("");

    if (!nombre.trim()) {
      setErrorNombre("Escribí el nombre de la pastilla");
      return;
    }

    setGuardando(true);
    try {
      const creada = await crearPastilla({
        nombre,
        tipo,
        cantidad_inicial: cantidad ? Number(cantidad) : 0,
        dispositivo_id: pastillero || null,
      });

      const donde = nombrePastillero(pastilleros, creada.modulo?.dispositivo_id ?? pastillero);
      setExito(
        donde
          ? `${nombre} quedó en ${donde}. Ya la podés agendar.`
          : `${nombre} quedó cargada. Ya la podés agendar.`
      );
      setNombre("");
      setCantidad("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Pantalla formulario>
      <Encabezado
        titulo="Cargar una pastilla"
        volverA="/medicacion"
      />

      <Aviso texto={error} />
      <Aviso texto={exito} tipo="ok" titulo="Listo" />

      <Campo
        etiqueta="Nombre del medicamento"
        valor={nombre}
        alCambiar={setNombre}
        placeholder="Aspirina 100"
        error={errorNombre}
      />

      <SelectorTamano valor={tipo} alCambiar={setTipo} />

      {pastilleros.length > 1 && (
        <Opciones
          etiqueta="En qué pastillero va"
          valor={pastillero}
          alCambiar={setPastillero}
          opciones={pastilleros.map((p) => ({
            valor: p.dispositivo_id,
            etiqueta: nombrePastillero(pastilleros, p.dispositivo_id) ?? p.dispositivo_id,
          }))}
        />
      )}

      <Campo
        etiqueta="Cuántas pusiste en el pastillero"
        valor={cantidad}
        alCambiar={setCantidad}
        teclado="numeric"
        ayuda="Con esto te avisamos cuando se estén por acabar."
        placeholder="0"
      />

      <Boton
        titulo={guardando ? "Guardando..." : "Guardar la pastilla"}
        onPress={handleAgregar}
        cargando={guardando}
      />

      {exito !== "" && (
        <Boton
          titulo="Agendar sus dosis"
          variante="secundario"
          icono="calendar-outline"
          onPress={() => router.push("/agendar-medicacion")}
          estilo={{ marginTop: espacio.md }}
        />
      )}
    </Pantalla>
  );
}
