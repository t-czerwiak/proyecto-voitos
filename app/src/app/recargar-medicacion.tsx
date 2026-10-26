import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { getPastillas, ajustarStock, borrarPastilla, Pastilla } from "../lib/voitos";
import { confirmar } from "../lib/avisos";
import {
  Pantalla,
  Encabezado,
  Selector,
  Campo,
  Boton,
  Aviso,
  Vacio,
  Cargando,
} from "../ui";
import { crearEstilos, espacio, radio, texto } from "../tema";

export default function RecargarMedicacion() {
  const styles = useEstilos();

  const [pastillas, setPastillas] = useState<Pastilla[]>([]);
  const [pastillaSel, setPastillaSel] = useState("");
  const [ajuste, setAjuste] = useState("");
  const [ajustando, setAjustando] = useState(false);

  const [cargando, setCargando] = useState(true);

  const [error, setError] = useState("");
  const [errorAjuste, setErrorAjuste] = useState("");
  const [exito, setExito] = useState("");

  const cargarPastillas = () => {
    getPastillas()
      .then((lista) => {
        setPastillas(lista);
        setPastillaSel((actual) => actual || lista[0]?.id || "");
      })
      .catch(() => setPastillas([]))
      .finally(() => setCargando(false));
  };

  useEffect(cargarPastillas, []);

  const seleccionada = pastillas.find((p) => p.id === pastillaSel);

  const handleBorrarPastilla = async () => {
    setError("");
    setExito("");
    if (!seleccionada) return;

    const seguir = await confirmar(
      `Eliminar ${seleccionada.nombre}`,
      `Se borra la pastilla y todas sus dosis, incluido el historial de las ya dispensadas. El módulo queda libre pero no se borra.\n\nEsto no se puede deshacer. ¿Seguro?`,
      "Eliminar",
      "peligro"
    );
    if (!seguir) return;

    setAjustando(true);
    try {
      await borrarPastilla(seleccionada.id);
      setExito(`Se eliminó ${seleccionada.nombre}`);
      setPastillaSel("");
      cargarPastillas();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAjustando(false);
    }
  };

  const handleAjustar = async (signo: 1 | -1) => {
    setError("");
    setErrorAjuste("");
    setExito("");

    const cuantas = Number(ajuste);

    if (!pastillaSel) {
      setError("Elegí una pastilla");
      return;
    }

    if (!Number.isInteger(cuantas) || cuantas <= 0) {
      setErrorAjuste("Escribí un número entero mayor que cero");
      return;
    }

    setAjustando(true);
    try {
      const modulo = await ajustarStock(pastillaSel, signo * cuantas);
      setExito(
        `Módulo ${modulo.numero}: ahora quedan ${modulo.cantidad_actual} pastillas`
      );
      setAjuste("");
      cargarPastillas();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setAjustando(false);
    }
  };

  if (cargando) {
    return (
      <Pantalla>
        <Encabezado titulo="Recargar o borrar" volverA="/medicacion" />
        <Cargando texto="Buscando las pastillas..." />
      </Pantalla>
    );
  }

  if (pastillas.length === 0) {
    return (
      <Pantalla>
        <Encabezado
          titulo="Recargar o borrar"
          bajada="Acá se suman pastillas a un módulo del pastillero."
          volverA="/medicacion"
        />

        <Vacio
          icono="medkit-outline"
          titulo="Todavía no hay ninguna pastilla cargada"
          detalle="No hay nada que recargar hasta que cargues el primer medicamento."
          accion={{
            titulo: "Cargar una pastilla",
            onPress: () => router.push("/agregar-medicacion"),
          }}
        />
      </Pantalla>
    );
  }

  const quedan = seleccionada?.modulo?.cantidad_actual ?? 0;

  return (
    <Pantalla>
      <Encabezado
        titulo="Recargar o borrar"
        bajada="Cuando volvés a llenar un módulo del pastillero, decilo acá."
        volverA="/medicacion"
      />

      <Aviso texto={error} />
      <Aviso texto={exito} tipo="ok" titulo="Listo" />

      <Selector
        etiqueta="Qué pastilla"
        valor={pastillaSel}
        alCambiar={setPastillaSel}
        opciones={pastillas.map((p) => ({
          valor: p.id,
          etiqueta: p.modulo
            ? `${p.nombre} — módulo ${p.modulo.numero}`
            : `${p.nombre} — sin módulo`,
        }))}
      />

      <View
        style={styles.stock}
        accessible
        accessibilityLabel={
          seleccionada?.modulo
            ? `En el módulo ${seleccionada.modulo.numero} quedan ${quedan} pastillas`
            : "Esta pastilla no está cargada en ningún módulo"
        }
      >
        {seleccionada?.modulo ? (
          <>
            <Text style={styles.stockNumero}>{quedan}</Text>
            <Text style={styles.stockTexto}>
              {quedan === 1 ? "pastilla" : "pastillas"} en el módulo{" "}
              {seleccionada.modulo.numero}
            </Text>
          </>
        ) : (
          <Text style={styles.stockTexto}>
            Esta pastilla no está cargada en ningún módulo, así que el pastillero
            no la puede dispensar.
          </Text>
        )}
      </View>

      <Campo
        etiqueta="Cuántas sumar o restar"
        valor={ajuste}
        alCambiar={setAjuste}
        teclado="numeric"
        ayuda="Un número entero. Después elegí si se suman o se restan."
        error={errorAjuste}
        placeholder="0"
      />

      <View style={styles.fila}>
        <Boton
          titulo="Sumar"
          icono="add"
          onPress={() => handleAjustar(1)}
          deshabilitado={ajustando}
          ancho="auto"
          ayuda="Cargaste pastillas nuevas en el módulo"
        />

        <Boton
          titulo="Restar"
          variante="secundario"
          icono="remove"
          onPress={() => handleAjustar(-1)}
          deshabilitado={ajustando}
          ancho="auto"
          ayuda="Sacaste pastillas del módulo"
        />
      </View>

      <View style={styles.zonaPeligro}>
        <Text style={styles.tituloPeligro}>Eliminar del todo</Text>

        <Text style={styles.textoPeligro}>
          Borra {seleccionada?.nombre ?? "la pastilla"} con todas sus dosis y su
          historial. El módulo queda libre. No se puede deshacer.
        </Text>

        <Boton
          titulo="Eliminar la pastilla"
          variante="peligro"
          icono="trash-outline"
          onPress={handleBorrarPastilla}
          deshabilitado={ajustando}
          ayuda="Te vamos a pedir que lo confirmes"
          estilo={{ marginTop: espacio.lg }}
        />
      </View>

      <Boton
        titulo="Ver el calendario"
        variante="enlace"
        icono="calendar-outline"
        onPress={() => router.push("/calendario")}
        estilo={{ marginTop: espacio.xl }}
      />
    </Pantalla>
  );
}

const useEstilos = crearEstilos((colores) => ({
  stock: {
    alignItems: "center",
    backgroundColor: colores.superficieAlta,
    borderWidth: 2,
    borderColor: colores.bordeFuerte,
    borderRadius: radio.lg,
    padding: espacio.xl,
    marginBottom: espacio.xl,
  },

  stockNumero: {
    fontFamily: texto.titulo.fontFamily,
    fontSize: 54,
    lineHeight: 62,
    color: colores.acento,
  },

  stockTexto: {
    ...texto.cuerpo,
    color: colores.textoSuave,
    textAlign: "center",
  },

  fila: {
    flexDirection: "row",
    gap: espacio.md,
  },

  zonaPeligro: {
    borderTopWidth: 1,
    borderTopColor: colores.borde,
    marginTop: espacio.xxxl,
    paddingTop: espacio.xl,
  },

  tituloPeligro: {
    ...texto.seccion,
    color: colores.peligro.texto,
    marginBottom: espacio.sm,
  },

  textoPeligro: {
    ...texto.cuerpo,
    color: colores.textoSuave,
  },
}));
