import React, { useState } from "react";
import { router } from "expo-router";
import { crearPastilla } from "../lib/voitos";
import { Pantalla, Encabezado, Campo, Selector, Boton, Aviso } from "../ui";
import { espacio } from "../tema";

const TAMANOS = [
  { valor: "chico", etiqueta: "Chica" },
  { valor: "mediano", etiqueta: "Mediana" },
  { valor: "grande", etiqueta: "Grande" },
  { valor: "pildora", etiqueta: "Píldora" },
];

export default function AgregarMedicacion() {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("chico");
  const [cantidad, setCantidad] = useState("");

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
      });

      setExito(
        creada.modulo
          ? `${nombre} quedó en el módulo ${creada.modulo.numero}, con ${creada.modulo.cantidad_actual} pastillas. Ya la podés agendar.`
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
    <Pantalla>
      <Encabezado
        titulo="Cargar una pastilla"
        bajada="Esto se hace una sola vez por medicamento. Después se agenda y se recarga."
        volverA="/medicacion"
      />

      <Aviso texto={error} />
      <Aviso texto={exito} tipo="ok" titulo="Listo" />

      <Campo
        etiqueta="Nombre del medicamento"
        valor={nombre}
        alCambiar={setNombre}
        ayuda="Como figura en la caja. Por ejemplo: Aspirina 100."
        error={errorNombre}
      />

      <Selector
        etiqueta="Tamaño de la pastilla"
        valor={tipo}
        alCambiar={setTipo}
        opciones={TAMANOS}
        ayuda="Sirve para saber qué módulo del pastillero le corresponde."
      />

      <Campo
        etiqueta="Cuántas pusiste en el módulo"
        valor={cantidad}
        alCambiar={setCantidad}
        teclado="numeric"
        ayuda="Las que cargaste físicamente en el pastillero. De acá sale el aviso de cuándo se están por acabar."
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
