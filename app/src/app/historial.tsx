import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { getHistorial, type Dispensacion } from "../lib/voitos";
import IconoPastilla, { etiquetaTamano } from "../components/IconoPastilla";
import { Pantalla, Encabezado, Tarjeta, Aviso, Vacio, Cargando, Columnas, useEscritorio } from "../ui";
import { crearEstilos, espacio, texto } from "../tema";

const fecha = (ts: string) => {
  const f = new Date(ts).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return f[0].toUpperCase() + f.slice(1);
};
const hora = (ts: string) =>
  new Date(ts).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
const pastillasEn = (n: number) => (n === 1 ? "1 pastilla" : `${n} pastillas`);

export default function Historial() {
  const styles = useEstilos();
  const escritorio = useEscritorio();
  const [lista, setLista] = useState<Dispensacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let vigente = true;
      getHistorial()
        .then((d) => {
          if (!vigente) return;
          setLista(d);
          setError("");
        })
        .catch((e: any) => vigente && setError(e?.message ?? "No se pudo cargar el historial"))
        .finally(() => vigente && setCargando(false));
      return () => {
        vigente = false;
      };
    }, [])
  );

  // Total por pastilla: suma de "cantidad" de cada toma.
  const totales = Object.values(
    lista.reduce<Record<string, { nombre: string; tipo?: string; total: number }>>((acc, d) => {
      const p = d.horarios.pastillas;
      acc[p.id] ??= { nombre: p.nombre, tipo: p.tipo, total: 0 };
      acc[p.id].total += d.cantidad;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  const resumen = (
    <>
      <Text style={styles.tituloSeccion} accessibilityRole="header">
        Cuántas se tomaron
      </Text>
      {totales.map((t) => (
        <Tarjeta key={t.nombre}>
          <View style={styles.fila} accessible accessibilityLabel={`${t.nombre}: ${pastillasEn(t.total)}`}>
            <View style={styles.icono}>
              <IconoPastilla tipo={t.tipo} tam={32} />
            </View>
            <View style={styles.textos}>
              <Text style={styles.nombre}>{t.nombre}</Text>
              {etiquetaTamano(t.tipo) && <Text style={styles.tenue}>{etiquetaTamano(t.tipo)}</Text>}
            </View>
            <Text style={styles.total}>{t.total}</Text>
          </View>
        </Tarjeta>
      ))}
    </>
  );

  const tomas = (
    <>
      <Text style={styles.tituloSeccion} accessibilityRole="header">
        Cada toma
      </Text>
      {lista.map((d) => {
        const p = d.horarios.pastillas;
        const tam = etiquetaTamano(p.tipo);
        return (
          <Tarjeta key={d.id}>
            <View
              style={styles.fila}
              accessible
              accessibilityLabel={`${fecha(d.timestamp)}, ${hora(d.timestamp)}: ${pastillasEn(d.cantidad)} de ${p.nombre}`}
            >
              <View style={styles.icono}>
                <IconoPastilla tipo={p.tipo} tam={32} />
              </View>
              <View style={styles.textos}>
                <Text style={styles.nombre}>{p.nombre}</Text>
                <Text style={styles.detalle}>
                  {fecha(d.timestamp)}, {hora(d.timestamp)} h
                </Text>
                <Text style={styles.tenue}>
                  {pastillasEn(d.cantidad)}
                  {tam ? `, ${tam.toLowerCase()}` : ""}
                </Text>
              </View>
            </View>
          </Tarjeta>
        );
      })}
    </>
  );

  return (
    <Pantalla>
      <Encabezado titulo="Historial" volverA="/medicacion" />
      <Aviso texto={error} />

      {cargando ? (
        <Cargando texto="Buscando las tomas..." />
      ) : lista.length === 0 ? (
        !error && (
          <Vacio
            icono="time-outline"
            titulo="Todavía no salió ninguna pastilla del pastillero"
            accion={{ titulo: "Agendar una dosis", onPress: () => router.push("/agendar-medicacion") }}
          />
        )
      ) : escritorio ? (
        <Columnas principal={tomas} lateral={resumen} />
      ) : (
        <>
          {resumen}
          <View style={styles.separador} />
          {tomas}
        </>
      )}
    </Pantalla>
  );
}

const useEstilos = crearEstilos((colores) => ({
  tituloSeccion: { ...texto.seccion, color: colores.texto, marginBottom: espacio.md },
  fila: { flexDirection: "row", alignItems: "center", gap: espacio.md },
  icono: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colores.superficieAlta,
  },
  textos: { flex: 1 },
  nombre: { ...texto.item, color: colores.texto },
  detalle: { ...texto.cuerpo, color: colores.textoSuave },
  tenue: { ...texto.dato, color: colores.textoTenue },
  total: { ...texto.item, fontSize: 28, color: colores.acento },
  separador: { height: espacio.xl },
}));
