import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

// Muestra en pantalla los errores que de otro modo no se ven.
//
// Existe por el mismo motivo que POST /api/admin/probar-mail en el backend: un
// error que nadie puede ver es un error que no se arregla. Cuando la aplicacion
// se rompe en el navegador de un telefono ajeno, lo unico que llega es "se puso
// todo negro", y con eso no se diagnostica nada.
//
// Atrapa lo que un ErrorBoundary de React NO atrapa, que es casi todo lo que
// pasa despues de dibujar: errores dentro de un manejador de evento (tocar un
// boton), promesas rechazadas sin catch, y fallas de carga de recursos. El
// ErrorBoundary cubre el otro caso, los errores durante el renderizado.
//
// No reemplaza a la consola: la suma. Quien pueda abrir las herramientas de
// desarrollo va a ver lo mismo y con mas detalle.

type Registro = { mensaje: string; donde: string };

export default function CazaErrores() {
  const [errores, setErrores] = useState<Registro[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const anotar = (mensaje: string, donde: string) => {
      // Se acumulan pero se muestran pocos: si algo falla en un bucle de
      // render, mil mensajes iguales tapan la pantalla y no agregan nada.
      setErrores((previos) =>
        previos.length >= 3 || previos.some((p) => p.mensaje === mensaje)
          ? previos
          : [...previos, { mensaje, donde }]
      );
    };

    const alFallar = (evento: ErrorEvent) => {
      const donde = evento.filename
        ? `${evento.filename.split("/").pop()}:${evento.lineno}`
        : "sin ubicacion";
      anotar(evento.message || String(evento.error ?? "error sin mensaje"), donde);
    };

    const alRechazar = (evento: PromiseRejectionEvent) => {
      const motivo: any = evento.reason;
      anotar(
        motivo?.message ?? String(motivo ?? "promesa rechazada sin motivo"),
        "promesa sin catch"
      );
    };

    window.addEventListener("error", alFallar);
    window.addEventListener("unhandledrejection", alRechazar);

    return () => {
      window.removeEventListener("error", alFallar);
      window.removeEventListener("unhandledrejection", alRechazar);
    };
  }, []);

  if (errores.length === 0) return null;

  return (
    <View style={styles.barra} pointerEvents="box-none">
      <ScrollView style={styles.scroll}>
        {errores.map((e, i) => (
          <View key={i} style={styles.item}>
            <Text style={styles.mensaje} selectable>
              {e.mensaje}
            </Text>
            <Text style={styles.donde} selectable>
              {e.donde}
            </Text>
          </View>
        ))}
      </ScrollView>

      <Pressable onPress={() => setErrores([])} style={styles.cerrar}>
        <Text style={styles.cerrarTexto}>Ocultar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Arriba de todo y por encima de cualquier cosa: si la aplicacion quedo en
  // negro, esto tiene que ser lo unico que se lea.
  barra: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    maxHeight: 220,
    backgroundColor: "#3B0B0B",
    borderBottomWidth: 2,
    borderBottomColor: "#FF6B6B",
    paddingHorizontal: 14,
    paddingTop: 40,
    paddingBottom: 10,
  },

  scroll: { maxHeight: 140 },

  item: { marginBottom: 8 },

  mensaje: {
    color: "#FFD9D9",
    fontSize: 13,
    lineHeight: 18,
  },

  donde: {
    color: "#FF9E9E",
    fontSize: 11,
    marginTop: 2,
  },

  cerrar: { alignSelf: "flex-end", paddingVertical: 6, paddingHorizontal: 10 },

  cerrarTexto: { color: "#FF9E9E", fontSize: 13, fontWeight: "700" },
});
