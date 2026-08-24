import React, { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { getCalendarioCompleto, DosisDeTodos } from "../lib/voitos";
import { COLORES_RUTINA } from "../lib/rutinas";

// El calendario de todos, en una sola grilla.
//
// Es una pantalla aparte de (tabs)/calendario.tsx a proposito. Aquella maneja
// la agenda PROPIA: agrupa en rutinas, deja borrar, muestra actividades. Esta
// es de solo lectura y responde otra pregunta: quien tiene que tomar que, y
// cuando, mirando a todo el mundo junto. Meter las dos en un archivo hubiera
// significado un monton de condicionales sobre casi mil lineas.
//
// El color identifica a la PERSONA, no al medicamento, porque el sentido de
// esta pantalla es distinguir de quien es cada dosis de un vistazo.

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIAS_SEMANA = ["L", "M", "M", "J", "V", "S", "D"];

const dosDigitos = (n: number) => String(n).padStart(2, "0");

const aFecha = (anio: number, mes: number, dia: number) =>
  `${anio}-${dosDigitos(mes + 1)}-${dosDigitos(dia)}`;

const hoyEnArgentina = () => {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.toISOString().split("T")[0];
};

export default function AdminCalendario() {
  const ahora = new Date();
  const [mes, setMes] = useState(ahora.getMonth());
  const [anio, setAnio] = useState(ahora.getFullYear());

  const [dosis, setDosis] = useState<DosisDeTodos[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);

  const cantidadDias = new Date(anio, mes + 1, 0).getDate();

  // Se pide solo el mes que se esta mirando. Sin rango, esto crece para siempre
  // a medida que se agendan dosis.
  const cargar = useCallback(() => {
    setCargando(true);
    setError("");

    getCalendarioCompleto(
      aFecha(anio, mes, 1),
      aFecha(anio, mes, cantidadDias)
    )
      .then((d) => setDosis(d ?? []))
      .catch((e: any) => setError(e?.message ?? "No se pudo cargar el calendario"))
      .finally(() => setCargando(false));
  }, [anio, mes, cantidadDias]);

  useFocusEffect(cargar);

  // Un color fijo por persona, estable dentro del mes. Se ordena por id para
  // que no cambie entre recargas segun el orden en que vengan las dosis.
  const personas = useMemo(() => {
    const vistos = new Map<string, { id: string; nombre: string; mail: string }>();

    for (const d of dosis) {
      if (d.usuario && !vistos.has(d.usuario.id)) {
        vistos.set(d.usuario.id, {
          id: d.usuario.id,
          nombre: `${d.usuario.nombre} ${d.usuario.apellido}`.trim(),
          mail: d.usuario.mail,
        });
      }
    }

    return [...vistos.values()]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((p, i) => ({ ...p, color: COLORES_RUTINA[i % COLORES_RUTINA.length] }));
  }, [dosis]);

  const colorDe = useCallback(
    (usuarioId?: string) => personas.find((p) => p.id === usuarioId)?.color ?? "#78877E",
    [personas]
  );

  // Las dosis agrupadas por dia, para no recorrer la lista entera por casillero.
  const porDia = useMemo(() => {
    const mapa = new Map<string, DosisDeTodos[]>();
    for (const d of dosis) {
      const lista = mapa.get(d.dia) ?? [];
      lista.push(d);
      mapa.set(d.dia, lista);
    }
    return mapa;
  }, [dosis]);

  const celdas = useMemo(() => {
    // getDay() devuelve 0 para domingo, y la semana arranca en lunes.
    const primer = new Date(anio, mes, 1).getDay();
    const vacias = primer === 0 ? 6 : primer - 1;

    return [
      ...Array.from({ length: vacias }, () => null),
      ...Array.from({ length: cantidadDias }, (_, i) => i + 1),
    ];
  }, [anio, mes, cantidadDias]);

  const mover = (paso: number) => {
    setDiaAbierto(null);
    const nuevo = mes + paso;
    if (nuevo < 0) {
      setMes(11);
      setAnio(anio - 1);
    } else if (nuevo > 11) {
      setMes(0);
      setAnio(anio + 1);
    } else {
      setMes(nuevo);
    }
  };

  const hoy = hoyEnArgentina();
  const delDiaAbierto = diaAbierto ? porDia.get(diaAbierto) ?? [] : [];

  return (
    <ScrollView style={styles.fondo} contentContainerStyle={styles.contenido}>
      <Pressable onPress={() => router.push("/admin")}>
        <Text style={styles.volver}>← Volver al panel</Text>
      </Pressable>

      <Text style={styles.titulo}>CALENDARIO GENERAL</Text>
      <Text style={styles.bajada}>
        Todas las dosis agendadas, de todas las cuentas. Solo lectura.
      </Text>

      <View style={styles.barraMes}>
        <Pressable onPress={() => mover(-1)} style={styles.flecha}>
          <Text style={styles.flechaTexto}>‹</Text>
        </Pressable>
        <Text style={styles.mes}>
          {MESES[mes]} {anio}
        </Text>
        <Pressable onPress={() => mover(1)} style={styles.flecha}>
          <Text style={styles.flechaTexto}>›</Text>
        </Pressable>
      </View>

      {cargando ? (
        <ActivityIndicator color="#0B7A38" style={{ marginVertical: 40 }} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <>
          <View style={styles.semana}>
            {DIAS_SEMANA.map((d, i) => (
              <Text key={i} style={styles.diaSemana}>
                {d}
              </Text>
            ))}
          </View>

          <View style={styles.grilla}>
            {celdas.map((dia, i) => {
              if (dia === null) return <View key={`v-${i}`} style={styles.celda} />;

              const fecha = aFecha(anio, mes, dia);
              const delDia = porDia.get(fecha) ?? [];
              const esHoy = fecha === hoy;
              const abierto = fecha === diaAbierto;

              // Un punto por persona, no por dosis: si alguien tiene cuatro
              // tomas en el dia, cuatro puntos del mismo color no dicen nada.
              const colores = [...new Set(delDia.map((d) => colorDe(d.usuario?.id)))];

              return (
                <Pressable
                  key={dia}
                  style={[styles.celda, esHoy && styles.celdaHoy, abierto && styles.celdaAbierta]}
                  onPress={() => setDiaAbierto(abierto ? null : fecha)}
                >
                  <Text style={[styles.numero, esHoy && styles.numeroHoy]}>{dia}</Text>

                  <View style={styles.puntos}>
                    {colores.slice(0, 4).map((c, j) => (
                      <View key={j} style={[styles.punto, { backgroundColor: c }]} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>

          {personas.length > 0 && (
            <View style={styles.referencias}>
              {personas.map((p) => (
                <View key={p.id} style={styles.referencia}>
                  <View style={[styles.punto, { backgroundColor: p.color }]} />
                  <Text style={styles.referenciaTexto}>{p.nombre}</Text>
                </View>
              ))}
            </View>
          )}

          {diaAbierto && (
            <View style={styles.detalle}>
              <Text style={styles.detalleTitulo}>{diaAbierto}</Text>

              {delDiaAbierto.length === 0 ? (
                <Text style={styles.vacio}>Sin dosis agendadas este día.</Text>
              ) : (
                delDiaAbierto.map((d) => (
                  <View key={d.id} style={styles.fila}>
                    <View style={[styles.barra, { backgroundColor: colorDe(d.usuario?.id) }]} />

                    <View style={{ flex: 1 }}>
                      <Text style={styles.hora}>
                        {dosDigitos(d.hora)}:{dosDigitos(d.minuto)} · {d.pastilla?.nombre ?? "sin pastilla"}
                        {d.cantidad > 1 ? ` (${d.cantidad})` : ""}
                      </Text>
                      <Text style={styles.duenio}>
                        {d.usuario ? `${d.usuario.nombre} ${d.usuario.apellido}` : "sin dueño"}
                      </Text>
                    </View>

                    <Text style={[styles.estado, d.dispensado && styles.estadoOk]}>
                      {d.dispensado ? "retirada" : "pendiente"}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          <Text style={styles.total}>
            {dosis.length === 0
              ? "No hay dosis agendadas este mes."
              : `${dosis.length} ${dosis.length === 1 ? "dosis" : "dosis"} en el mes, de ${personas.length} ${personas.length === 1 ? "cuenta" : "cuentas"}.`}
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: "#02200F" },
  contenido: { padding: 20, paddingBottom: 60 },

  volver: { color: "#78877E", fontSize: 14, marginBottom: 18 },

  titulo: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
  },
  bajada: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 22,
  },

  barraMes: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  flecha: { paddingHorizontal: 18, paddingVertical: 6 },
  flechaTexto: { color: "#FFFFFF", fontSize: 26, lineHeight: 28 },
  mes: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },

  semana: { flexDirection: "row" },
  diaSemana: {
    flex: 1,
    textAlign: "center",
    color: "#78877E",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },

  grilla: { flexDirection: "row", flexWrap: "wrap" },
  celda: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  celdaHoy: { borderWidth: 1, borderColor: "#0B7A38" },
  celdaAbierta: { backgroundColor: "rgba(11,122,56,0.25)" },

  numero: { color: "#FFFFFF", fontSize: 15 },
  numeroHoy: { fontWeight: "900", color: "#7BE8A4" },

  puntos: { flexDirection: "row", gap: 3, marginTop: 4, minHeight: 6 },
  punto: { width: 6, height: 6, borderRadius: 3 },

  referencias: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.12)",
  },
  referencia: { flexDirection: "row", alignItems: "center", gap: 7 },
  referenciaTexto: { color: "rgba(255,255,255,0.75)", fontSize: 13 },

  detalle: {
    marginTop: 22,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 16,
  },
  detalleTitulo: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  vacio: { color: "rgba(255,255,255,0.55)", fontSize: 14 },

  fila: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
  barra: { width: 3, height: 34, borderRadius: 2 },
  hora: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  duenio: { color: "rgba(255,255,255,0.6)", fontSize: 13, marginTop: 2 },

  estado: { color: "#B98A3A", fontSize: 12, fontWeight: "700" },
  estadoOk: { color: "#7BE8A4" },

  total: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 24,
  },

  error: { color: "#FFB4A2", fontSize: 15, lineHeight: 22, marginVertical: 30 },
});
