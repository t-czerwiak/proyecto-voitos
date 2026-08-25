import React, { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { getCalendarioCompleto, DosisDeTodos } from "../lib/voitos";
import { DIAS_SEMANA } from "../lib/rutinas";
import { comoHora, fechaLarga, horaHablada, MESES_LARGOS } from "../lib/fechas";
import {
  Pantalla,
  Encabezado,
  Tarjeta,
  Estado,
  Aviso,
  Cargando,
  Vacio,
} from "../ui";
import { crearEstilos, useColores, espacio, radio, texto, toque } from "../tema";

// El calendario de todos, en una sola grilla.
//
// Es una pantalla aparte de (tabs)/calendario.tsx a proposito. Aquella maneja
// la agenda PROPIA: agrupa en rutinas, deja borrar, muestra actividades. Esta
// es de solo lectura y responde otra pregunta: quien tiene que tomar que, y
// cuando, mirando a todo el mundo junto. Meter las dos en un archivo hubiera
// significado un monton de condicionales sobre casi mil lineas.
//
// El color identifica a la PERSONA, no al medicamento, porque el sentido de
// esta pantalla es distinguir de quien es cada dosis de un vistazo. Y como el
// color solo no alcanza, cada dia dice en su etiqueta de quienes son las dosis
// que tiene, y abajo esta la referencia escrita.

const dosDigitos = (n: number) => String(n).padStart(2, "0");

const aFecha = (anio: number, mes: number, dia: number) =>
  `${anio}-${dosDigitos(mes + 1)}-${dosDigitos(dia)}`;

const hoyEnArgentina = () => {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.toISOString().split("T")[0];
};

export default function AdminCalendario() {
  const styles = useEstilos();
  const colores = useColores();

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

    getCalendarioCompleto(aFecha(anio, mes, 1), aFecha(anio, mes, cantidadDias))
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
      .map((p, i) => ({ ...p, color: colores.rutinas[i % colores.rutinas.length] }));
  }, [dosis, colores.rutinas]);

  const colorDe = useCallback(
    (usuarioId?: string) =>
      personas.find((p) => p.id === usuarioId)?.color ?? colores.textoTenue,
    [personas]
  );

  const nombreDe = useCallback(
    (usuarioId?: string) => personas.find((p) => p.id === usuarioId)?.nombre ?? "sin dueño",
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
  const delDiaAbierto = diaAbierto
    ? [...(porDia.get(diaAbierto) ?? [])].sort(
        (a, b) => a.hora - b.hora || a.minuto - b.minuto
      )
    : [];

  return (
    <Pantalla>
      <Encabezado
        titulo="Calendario general"
        bajada="Todas las dosis agendadas, de todas las cuentas. Solo lectura."
        volverA="/admin"
      />

      <Aviso texto={error} />

      {/* MES */}
      <View style={styles.navegacion}>
        <Pressable
          onPress={() => mover(-1)}
          style={({ pressed }) => [styles.flecha, pressed && styles.flechaActiva]}
          accessibilityRole="button"
          accessibilityLabel="Mes anterior"
        >
          <Ionicons name="chevron-back" size={24} color={colores.acento} />
        </Pressable>

        <Text style={styles.mes} accessibilityRole="header">
          {MESES_LARGOS[mes]} {anio}
        </Text>

        <Pressable
          onPress={() => mover(1)}
          style={({ pressed }) => [styles.flecha, pressed && styles.flechaActiva]}
          accessibilityRole="button"
          accessibilityLabel="Mes siguiente"
        >
          <Ionicons name="chevron-forward" size={24} color={colores.acento} />
        </Pressable>
      </View>

      {cargando ? (
        <Cargando texto="Buscando las dosis del mes..." />
      ) : (
        !error && (
          <>
            {/* GRILLA */}
            <View style={styles.grilla}>
              <View style={styles.semana}>
                {DIAS_SEMANA.map((d) => (
                  <Text key={d} style={styles.diaSemana} accessibilityElementsHidden>
                    {d}
                  </Text>
                ))}
              </View>

              <View style={styles.dias}>
                {celdas.map((dia, i) => {
                  if (dia === null) return <View key={`vacio-${i}`} style={styles.celda} />;

                  const fecha = aFecha(anio, mes, dia);
                  const delDia = porDia.get(fecha) ?? [];
                  const esHoy = fecha === hoy;
                  const abierto = fecha === diaAbierto;

                  // Un punto por persona, no por dosis: si alguien tiene cuatro
                  // tomas en el dia, cuatro puntos del mismo color no dicen nada.
                  const deQuienes = [...new Set(delDia.map((d) => d.usuario?.id))];

                  // Lo que el ojo saca de los colores, dicho en palabras.
                  const partes = [fechaLarga(fecha)];
                  if (esHoy) partes.push("hoy");
                  if (delDia.length === 0) partes.push("sin dosis");
                  else {
                    partes.push(
                      delDia.length === 1 ? "1 dosis" : `${delDia.length} dosis`
                    );
                    partes.push(`de ${deQuienes.map((id) => nombreDe(id)).join(", ")}`);
                  }

                  return (
                    <Pressable
                      key={dia}
                      onPress={() => setDiaAbierto(abierto ? null : fecha)}
                      style={({ pressed }) => [
                        styles.celda,
                        styles.celdaTocable,
                        esHoy && styles.celdaHoy,
                        abierto && styles.celdaAbierta,
                        pressed && styles.celdaActiva,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={partes.join(", ")}
                      accessibilityState={{ selected: abierto }}
                      aria-selected={abierto}
                    >
                      <Text
                        style={[
                          styles.numero,
                          esHoy && styles.numeroHoy,
                          abierto && styles.numeroAbierto,
                        ]}
                      >
                        {dia}
                      </Text>

                      <View style={styles.puntos}>
                        {deQuienes.slice(0, 4).map((id, j) => (
                          <View
                            key={j}
                            style={[styles.punto, { backgroundColor: colorDe(id) }]}
                          />
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* QUIÉN ES CADA COLOR */}
            {personas.length > 0 && (
              <View style={styles.referencia}>
                <Text style={styles.tituloReferencia}>Quién es cada color</Text>

                {personas.map((p) => (
                  <View
                    key={p.id}
                    style={styles.filaReferencia}
                    accessible
                    accessibilityLabel={`${p.nombre}, ${p.mail}`}
                  >
                    <View style={[styles.muestra, { backgroundColor: p.color }]} />

                    <View style={styles.datosPersona}>
                      <Text style={styles.nombrePersona}>{p.nombre}</Text>
                      <Text style={styles.mailPersona}>{p.mail}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* EL DÍA ABIERTO */}
            {diaAbierto && (
              <View style={styles.seccion}>
                <Text style={styles.tituloSeccion} accessibilityRole="header">
                  {fechaLarga(diaAbierto)}
                </Text>

                {delDiaAbierto.length === 0 ? (
                  <Vacio
                    icono="medkit-outline"
                    titulo="Sin dosis agendadas este día"
                    detalle="Ninguna cuenta tiene medicación para esta fecha."
                  />
                ) : (
                  delDiaAbierto.map((d) => {
                    const nombre = d.pastilla?.nombre ?? "Sin pastilla";
                    const cantidad =
                      d.cantidad === 1 ? "1 pastilla" : `${d.cantidad} pastillas`;
                    const duenio = d.usuario
                      ? `${d.usuario.nombre} ${d.usuario.apellido}`
                      : "sin dueño";

                    return (
                      <Tarjeta key={d.id} franja={colorDe(d.usuario?.id)}>
                        <View
                          style={styles.fila}
                          accessible
                          accessibilityLabel={`A ${horaHablada(d.hora, d.minuto)}, ${nombre}, ${cantidad}, de ${duenio}. ${
                            d.dispensado ? "Salió del pastillero" : "Todavía no salió"
                          }.`}
                        >
                          <Text style={styles.hora} accessibilityElementsHidden>
                            {comoHora(d.hora, d.minuto)}
                          </Text>

                          <View style={styles.datos}>
                            <Text style={styles.nombre}>{nombre}</Text>
                            <Text style={styles.cantidad}>{cantidad}</Text>
                            <Text style={styles.duenio}>{duenio}</Text>

                            <View style={styles.estado}>
                              {/* Icono y palabra ademas del color: antes esto
                                  era la palabra "retirada" o "pendiente" en
                                  12px, y la unica diferencia visible entre las
                                  dos era el tono de verde. */}
                              <Estado
                                texto={d.dispensado ? "Salió del pastillero" : "Todavía no"}
                                tono={d.dispensado ? "ok" : "neutro"}
                                icono={d.dispensado ? "checkmark-circle" : "time-outline"}
                              />
                            </View>
                          </View>
                        </View>
                      </Tarjeta>
                    );
                  })
                )}
              </View>
            )}

            <Text style={styles.total}>
              {dosis.length === 0
                ? "No hay dosis agendadas este mes."
                : `${dosis.length} ${dosis.length === 1 ? "dosis" : "dosis"} en el mes, de ${personas.length} ${
                    personas.length === 1 ? "cuenta" : "cuentas"
                  }.`}
            </Text>
          </>
        )
      )}
    </Pantalla>
  );
}

const useEstilos = crearEstilos((colores) => ({
  navegacion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    padding: espacio.xs,
    marginBottom: espacio.lg,
  },

  flecha: {
    width: toque.comodo,
    height: toque.comodo,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radio.md,
    backgroundColor: colores.superficieAlta,
  },

  flechaActiva: {
    backgroundColor: colores.borde,
  },

  mes: {
    ...texto.seccion,
    color: colores.texto,
    flex: 1,
    textAlign: "center",
    textTransform: "capitalize",
  },

  grilla: {
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    padding: espacio.md,
  },

  semana: {
    flexDirection: "row",
    marginBottom: espacio.xs,
  },

  diaSemana: {
    ...texto.cuerpoFuerte,
    color: colores.acentoSuave,
    width: `${100 / 7}%`,
    textAlign: "center",
  },

  dias: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  celda: {
    width: `${100 / 7}%`,
    // Antes era el minimo de 48px y el numero se centraba JUNTO con los
    // marcadores, asi que un dia con dosis empujaba su numero hacia arriba y
    // los numeros de la grilla no quedaban alineados entre filas. Ahora la
    // celda es mas alta, el numero arranca siempre a la misma distancia del
    // borde y los marcadores van anclados abajo, fuera del flujo.
    minHeight: 64,
    alignItems: "center" as const,
    justifyContent: "flex-start" as const,
    paddingTop: 9,
    paddingBottom: 14,
  },

  celdaTocable: {
    borderRadius: radio.md,
    borderWidth: 2,
    borderColor: "transparent",
  },

  celdaHoy: {
    borderColor: colores.bordeFuerte,
  },

  celdaAbierta: {
    backgroundColor: colores.acento,
    borderColor: colores.acento,
  },

  celdaActiva: {
    borderColor: colores.texto,
  },

  numero: {
    ...texto.item,
    // Numeros de ancho fijo: en una grilla, un 11 mas angosto que un 30 se
    // nota y desalinea la columna.
    fontVariant: ["tabular-nums" as const],
    color: colores.texto,
  },

  numeroHoy: {
    color: colores.acento,
  },

  numeroAbierto: {
    color: colores.sobreAcento,
  },

  puntos: {
    position: "absolute" as const,
    bottom: 7,
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 3,
    minHeight: 5,
  },

  punto: {
    width: 8,
    height: 5,
    borderRadius: 3,
  },

  referencia: {
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    padding: espacio.lg,
    marginTop: espacio.lg,
    gap: espacio.md,
  },

  tituloReferencia: {
    ...texto.etiqueta,
    color: colores.textoSuave,
  },

  filaReferencia: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.md,
  },

  muestra: {
    width: 20,
    height: 8,
    borderRadius: 4,
  },

  datosPersona: {
    flex: 1,
  },

  nombrePersona: {
    ...texto.cuerpoFuerte,
    color: colores.texto,
  },

  mailPersona: {
    ...texto.dato,
    color: colores.textoTenue,
  },

  seccion: {
    marginTop: espacio.xxl,
  },

  tituloSeccion: {
    ...texto.seccion,
    color: colores.texto,
    textTransform: "capitalize",
    marginBottom: espacio.lg,
  },

  fila: {
    flexDirection: "row",
    gap: espacio.lg,
  },

  hora: {
    ...texto.hora,
    color: colores.acento,
    minWidth: 78,
  },

  datos: {
    flex: 1,
    gap: espacio.xs,
  },

  nombre: {
    ...texto.item,
    color: colores.texto,
  },

  cantidad: {
    ...texto.cuerpo,
    color: colores.textoSuave,
  },

  duenio: {
    ...texto.dato,
    color: colores.textoTenue,
  },

  estado: {
    marginTop: espacio.xs,
  },

  total: {
    ...texto.cuerpo,
    color: colores.textoSuave,
    marginTop: espacio.xl,
  },
}));
