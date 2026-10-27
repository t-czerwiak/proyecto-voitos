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
  Columnas,
  Estado,
  Aviso,
  Cargando,
  Vacio,
  useEscritorio,
} from "../ui";
import { crearEstilos, useColores, espacio, radio, texto, toque } from "../tema";

const dosDigitos = (n: number) => String(n).padStart(2, "0");

const aFecha = (anio: number, mes: number, dia: number) =>
  `${anio}-${dosDigitos(mes + 1)}-${dosDigitos(dia)}`;

const hoyEnArgentina = () => {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return d.toISOString().split("T")[0];
};

const conMayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

export default function AdminCalendario() {
  const styles = useEstilos();
  const colores = useColores();
  const escritorio = useEscritorio();

  const hoy = hoyEnArgentina();
  const [mes, setMes] = useState(Number(hoy.slice(5, 7)) - 1);
  const [anio, setAnio] = useState(Number(hoy.slice(0, 4)));
  const [dosis, setDosis] = useState<DosisDeTodos[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [diaElegido, setDiaElegido] = useState<string | null>(hoy);
  const [filtro, setFiltro] = useState<string | null>(null);

  const cantidadDias = new Date(anio, mes + 1, 0).getDate();
  const esteMes = hoy.startsWith(aFecha(anio, mes, 1).slice(0, 7));

  const cargar = useCallback(() => {
    setCargando(true);
    setError("");
    getCalendarioCompleto(aFecha(anio, mes, 1), aFecha(anio, mes, cantidadDias))
      .then((d) => setDosis(d ?? []))
      .catch((e: any) => setError(e?.message ?? "No se pudo cargar el calendario"))
      .finally(() => setCargando(false));
  }, [anio, mes, cantidadDias]);

  useFocusEffect(cargar);

  const personas = useMemo(() => {
    const vistas = new Map<string, { id: string; nombre: string; mail: string; total: number }>();
    for (const d of dosis) {
      if (!d.usuario) continue;
      const p = vistas.get(d.usuario.id);
      if (p) p.total++;
      else
        vistas.set(d.usuario.id, {
          id: d.usuario.id,
          nombre: `${d.usuario.nombre} ${d.usuario.apellido}`.trim(),
          mail: d.usuario.mail,
          total: 1,
        });
    }
    return [...vistas.values()]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((p, i) => ({ ...p, color: colores.rutinas[i % colores.rutinas.length] }));
  }, [dosis, colores.rutinas]);

  const colorDe = (usuarioId?: string) =>
    personas.find((p) => p.id === usuarioId)?.color ?? colores.textoTenue;

  const visibles = filtro ? dosis.filter((d) => d.usuario?.id === filtro) : dosis;

  const porDia = useMemo(() => {
    const mapa = new Map<string, DosisDeTodos[]>();
    for (const d of visibles) {
      const lista = mapa.get(d.dia) ?? [];
      lista.push(d);
      mapa.set(d.dia, lista);
    }
    return mapa;
  }, [visibles]);

  const celdas = useMemo(() => {
    const primer = new Date(anio, mes, 1).getDay();
    const vacias = primer === 0 ? 6 : primer - 1;
    return [
      ...Array.from({ length: vacias }, () => null),
      ...Array.from({ length: cantidadDias }, (_, i) => i + 1),
    ];
  }, [anio, mes, cantidadDias]);

  const irA = (nuevoAnio: number, nuevoMes: number) => {
    setAnio(nuevoAnio);
    setMes(nuevoMes);
    setDiaElegido(hoy.startsWith(aFecha(nuevoAnio, nuevoMes, 1).slice(0, 7)) ? hoy : null);
  };

  const mover = (paso: number) => {
    const nuevo = mes + paso;
    if (nuevo < 0) irA(anio - 1, 11);
    else if (nuevo > 11) irA(anio + 1, 0);
    else irA(anio, nuevo);
  };

  const salieron = visibles.filter((d) => d.dispensado).length;

  const delDia = diaElegido
    ? [...(porDia.get(diaElegido) ?? [])].sort((a, b) => a.hora - b.hora || a.minuto - b.minuto)
    : [];

  const navegacion = (
    <View style={styles.navegacion}>
      <Pressable
        onPress={() => mover(-1)}
        style={({ pressed }) => [styles.flecha, pressed && styles.flechaActiva]}
        accessibilityRole="button"
        accessibilityLabel="Mes anterior"
      >
        <Ionicons name="chevron-back" size={22} color={colores.acento} />
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
        <Ionicons name="chevron-forward" size={22} color={colores.acento} />
      </Pressable>

      {!esteMes && (
        <Pressable
          onPress={() => irA(Number(hoy.slice(0, 4)), Number(hoy.slice(5, 7)) - 1)}
          style={({ pressed }) => [styles.botonHoy, pressed && styles.flechaActiva]}
          accessibilityRole="button"
          accessibilityLabel="Volver al mes actual"
        >
          <Text style={styles.textoHoy}>Hoy</Text>
        </Pressable>
      )}
    </View>
  );

  const cifra = (valor: number | string, etiqueta: string) => (
    <View style={styles.cifra}>
      <Text style={styles.cifraValor}>{valor}</Text>
      <Text style={styles.cifraEtiqueta}>{etiqueta}</Text>
    </View>
  );

  const grilla = (
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
          if (dia === null) return <View key={`vacio-${i}`} style={[styles.celda, escritorio && styles.celdaAlta]} />;

          const fecha = aFecha(anio, mes, dia);
          const lista = porDia.get(fecha) ?? [];
          const esHoy = fecha === hoy;
          const elegido = fecha === diaElegido;
          const deQuienes = [...new Set(lista.map((d) => d.usuario?.id))];

          const partes = [fechaLarga(fecha)];
          if (esHoy) partes.push("hoy");
          partes.push(lista.length === 0 ? "sin dosis" : plural(lista.length, "dosis", "dosis"));

          return (
            <Pressable
              key={dia}
              onPress={() => setDiaElegido(fecha)}
              style={({ pressed }) => [
                styles.celda,
                escritorio && styles.celdaAlta,
                styles.celdaTocable,
                esHoy && styles.celdaHoy,
                elegido && styles.celdaElegida,
                pressed && styles.celdaActiva,
              ]}
              accessibilityRole="button"
              accessibilityLabel={partes.join(", ")}
              accessibilityState={{ selected: elegido }}
              aria-selected={elegido}
            >
              <Text style={[styles.numero, esHoy && styles.numeroHoy, elegido && styles.numeroElegido]}>
                {dia}
              </Text>

              <View style={[styles.puntos, escritorio && styles.puntosAncho]}>
                {deQuienes.slice(0, 4).map((id, j) => (
                  <View key={j} style={[styles.punto, { backgroundColor: colorDe(id) }]} />
                ))}
                {escritorio && lista.length > 0 && (
                  <Text style={[styles.conteo, elegido && styles.numeroElegido]}>{lista.length}</Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const panelDia = (
    <View style={styles.panel}>
      <Text style={styles.tituloPanel} accessibilityRole="header">
        {diaElegido ? conMayuscula(fechaLarga(diaElegido)) : "Elegí un día"}
      </Text>

      {diaElegido &&
        (delDia.length === 0 ? (
          <Vacio icono="medkit-outline" titulo="Sin dosis este día" />
        ) : (
          delDia.map((d, i) => {
            const nombre = d.pastilla?.nombre ?? "Sin pastilla";
            const cantidad = plural(d.cantidad, "pastilla", "pastillas");
            const duenio = d.usuario ? `${d.usuario.nombre} ${d.usuario.apellido}` : "sin dueño";

            return (
              <View
                key={d.id}
                style={[styles.dosis, i > 0 && styles.dosisSeparada]}
                accessible
                accessibilityLabel={`A ${horaHablada(d.hora, d.minuto)}, ${nombre}, ${cantidad}, de ${duenio}. ${
                  d.dispensado ? "Salió" : "Pendiente"
                }.`}
              >
                <View style={[styles.franja, { backgroundColor: colorDe(d.usuario?.id) }]} />
                <Text style={styles.hora}>{comoHora(d.hora, d.minuto)}</Text>

                <View style={styles.datos}>
                  <Text style={styles.nombre}>{nombre}</Text>
                  <Text style={styles.duenio}>
                    {cantidad} · {duenio}
                  </Text>
                </View>

                <Estado
                  texto={d.dispensado ? "Salió" : "Pendiente"}
                  tono={d.dispensado ? "ok" : "neutro"}
                  icono={d.dispensado ? "checkmark-circle" : "time-outline"}
                />
              </View>
            );
          })
        ))}
    </View>
  );

  const cuentas = personas.length > 0 && (
    <View style={styles.panel}>
      <View style={styles.cabeceraCuentas}>
        <Text style={styles.tituloPanel}>Cuentas</Text>
        {filtro && (
          <Pressable onPress={() => setFiltro(null)} accessibilityRole="button" hitSlop={8}>
            <Text style={styles.verTodas}>Ver todas</Text>
          </Pressable>
        )}
      </View>

      {personas.map((p) => {
        const activa = filtro === p.id;
        const apagada = filtro !== null && !activa;
        return (
          <Pressable
            key={p.id}
            onPress={() => setFiltro(activa ? null : p.id)}
            style={({ pressed }) => [styles.cuenta, activa && styles.cuentaActiva, pressed && styles.flechaActiva]}
            accessibilityRole="button"
            accessibilityLabel={`${p.nombre}, ${plural(p.total, "dosis", "dosis")} en el mes`}
            accessibilityState={{ selected: activa }}
          >
            <View style={[styles.muestra, { backgroundColor: p.color }, apagada && styles.apagada]} />
            <View style={[styles.datos, apagada && styles.apagada]}>
              <Text style={styles.nombrePersona} numberOfLines={1}>
                {p.nombre}
              </Text>
              <Text style={styles.mailPersona} numberOfLines={1}>
                {p.mail}
              </Text>
            </View>
            <Text style={[styles.totalPersona, apagada && styles.apagada]}>{p.total}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Pantalla>
      <View style={escritorio ? styles.cabecera : undefined}>
        <View style={styles.flex}>
          <Encabezado titulo="Calendario general" bajada="Todas las cuentas. Solo lectura." volverA="/admin" />
        </View>
        {escritorio && navegacion}
      </View>

      <Aviso texto={error} />

      {!escritorio && navegacion}

      {cargando ? (
        <Cargando texto="Buscando las dosis del mes..." />
      ) : (
        !error && (
          <>
            <View style={styles.cifras}>
              {cifra(visibles.length, "dosis")}
              {cifra(visibles.length ? `${Math.round((salieron / visibles.length) * 100)}%` : "—", "salieron")}
              {cifra(filtro ? 1 : personas.length, personas.length === 1 || filtro ? "cuenta" : "cuentas")}
            </View>

            <Columnas
              principal={grilla}
              lateral={
                <View style={styles.lateral}>
                  {panelDia}
                  {cuentas}
                </View>
              }
            />
          </>
        )
      )}
    </Pantalla>
  );
}

const useEstilos = crearEstilos((colores) => ({
  flex: {
    flex: 1,
  },

  cabecera: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: espacio.lg,
  },

  navegacion: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.xs,
    marginBottom: espacio.lg,
  },

  flecha: {
    width: toque.comodo,
    height: toque.comodo,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
  },

  flechaActiva: {
    backgroundColor: colores.superficieAlta,
  },

  mes: {
    ...texto.seccion,
    color: colores.texto,
    minWidth: 190,
    flexGrow: 1,
    textAlign: "center",
    textTransform: "capitalize",
  },

  botonHoy: {
    height: toque.comodo,
    paddingHorizontal: espacio.lg,
    justifyContent: "center",
    borderRadius: radio.md,
    borderWidth: 1,
    borderColor: colores.borde,
  },

  textoHoy: {
    ...texto.cuerpoFuerte,
    color: colores.acento,
  },

  cifras: {
    flexDirection: "row",
    gap: espacio.md,
    marginBottom: espacio.lg,
  },

  cifra: {
    flex: 1,
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    paddingVertical: espacio.md,
    paddingHorizontal: espacio.lg,
  },

  cifraValor: {
    ...texto.titulo,
    color: colores.acento,
    fontVariant: ["tabular-nums" as const],
  },

  cifraEtiqueta: {
    ...texto.dato,
    color: colores.textoSuave,
  },

  grilla: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    padding: espacio.md,
  },

  semana: {
    flexDirection: "row",
    marginBottom: espacio.xs,
  },

  diaSemana: {
    ...texto.dato,
    color: colores.textoTenue,
    width: `${100 / 7}%`,
    textAlign: "center",
  },

  dias: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  celda: {
    width: `${100 / 7}%`,
    minHeight: 60,
    alignItems: "center" as const,
    paddingTop: 8,
  },

  celdaAlta: {
    minHeight: 84,
    alignItems: "flex-start" as const,
    paddingLeft: espacio.sm,
  },

  celdaTocable: {
    borderRadius: radio.md,
    borderWidth: 2,
    borderColor: "transparent",
  },

  celdaHoy: {
    borderColor: colores.bordeFuerte,
  },

  celdaElegida: {
    backgroundColor: colores.acento,
    borderColor: colores.acento,
  },

  celdaActiva: {
    borderColor: colores.texto,
  },

  numero: {
    ...texto.cuerpoFuerte,
    fontVariant: ["tabular-nums" as const],
    color: colores.texto,
  },

  numeroHoy: {
    color: colores.acento,
  },

  numeroElegido: {
    color: colores.sobreAcento,
  },

  conteo: {
    ...texto.dato,
    color: colores.textoSuave,
    marginLeft: 2,
    lineHeight: 12,
  },

  puntos: {
    position: "absolute" as const,
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: 3,
  },

  puntosAncho: {
    justifyContent: "flex-start" as const,
    left: espacio.sm,
    bottom: 10,
  },

  punto: {
    width: 8,
    height: 5,
    borderRadius: 3,
  },

  lateral: {
    gap: espacio.lg,
    marginTop: espacio.lg,
  },

  panel: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.lg,
    padding: espacio.lg,
  },

  tituloPanel: {
    ...texto.item,
    color: colores.texto,
    marginBottom: espacio.md,
  },

  dosis: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.md,
    paddingVertical: espacio.sm,
  },

  dosisSeparada: {
    borderTopWidth: 1,
    borderTopColor: colores.borde,
  },

  franja: {
    width: 4,
    alignSelf: "stretch",
    borderRadius: 2,
  },

  hora: {
    ...texto.cuerpoFuerte,
    color: colores.acento,
    fontVariant: ["tabular-nums" as const],
    minWidth: 48,
  },

  datos: {
    flex: 1,
    minWidth: 0,
  },

  nombre: {
    ...texto.cuerpoFuerte,
    color: colores.texto,
  },

  duenio: {
    ...texto.dato,
    color: colores.textoTenue,
  },

  cabeceraCuentas: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },

  verTodas: {
    ...texto.dato,
    color: colores.acento,
  },

  cuenta: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.md,
    paddingVertical: espacio.sm,
    paddingHorizontal: espacio.sm,
    marginHorizontal: -espacio.sm,
    borderRadius: radio.md,
  },

  cuentaActiva: {
    backgroundColor: colores.superficieAlta,
  },

  muestra: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  apagada: {
    opacity: 0.4,
  },

  nombrePersona: {
    ...texto.cuerpoFuerte,
    color: colores.texto,
  },

  mailPersona: {
    ...texto.dato,
    color: colores.textoTenue,
  },

  totalPersona: {
    ...texto.cuerpoFuerte,
    color: colores.textoSuave,
    fontVariant: ["tabular-nums" as const],
  },
}));
