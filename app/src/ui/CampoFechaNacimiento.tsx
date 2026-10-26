import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { crearEstilos, espacio, texto } from "../tema";
import { MESES_LARGOS } from "../lib/fechas";
import Selector from "./Selector";

const ANOS_MAXIMOS = 120;

type Props = {
  valor: string;
  alCambiar: (iso: string) => void;
  error?: string;

  ayuda?: string;
};

const vacio = { dia: "", mes: "", anio: "" };

const partir = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return vacio;
  const [anio, mes, dia] = iso.split("-");
  return { dia, mes, anio };
};

const diasDelMes = (mes: number, anio: number): number =>
  mes ? new Date(anio || 2000, mes, 0).getDate() : 31;

export default function CampoFechaNacimiento({
  valor,
  alCambiar,
  error,
  ayuda = "Pod\u00e9s dejarlo vac\u00edo y completarlo despu\u00e9s.",
}: Props) {
  const styles = useEstilos();

  const [partes, setPartes] = useState(() => partir(valor));
  const { dia, mes, anio } = partes;

  const anios = useMemo(() => {
    const actual = new Date().getFullYear();

    return Array.from({ length: ANOS_MAXIMOS + 1 }, (_, i) => String(actual - i));
  }, []);

  const dias = useMemo(() => {
    const cuantos = diasDelMes(Number(mes), Number(anio));
    return Array.from({ length: cuantos }, (_, i) => String(i + 1).padStart(2, "0"));
  }, [mes, anio]);

  const cambiar = (parte: "dia" | "mes" | "anio", nuevo: string) => {
    const siguiente = { ...partes, [parte]: nuevo };

    if (siguiente.dia && siguiente.mes) {
      const tope = diasDelMes(Number(siguiente.mes), Number(siguiente.anio));
      siguiente.dia = String(Math.min(Number(siguiente.dia), tope)).padStart(2, "0");
    }

    setPartes(siguiente);

    alCambiar(
      siguiente.dia && siguiente.mes && siguiente.anio
        ? `${siguiente.anio}-${siguiente.mes}-${siguiente.dia}`
        : ""
    );
  };

  return (
    <View style={styles.caja}>
      <Text style={styles.etiqueta}>Fecha de nacimiento</Text>

      <View style={styles.fila}>
        <View style={styles.dia}>
          <Selector
            etiqueta="Día"
            valor={dia}
            alCambiar={(v) => cambiar("dia", v)}
            opciones={[
              { valor: "", etiqueta: "Día" },
              ...dias.map((d) => ({ valor: d, etiqueta: String(Number(d)) })),
            ]}
          />
        </View>

        <View style={styles.mes}>
          <Selector
            etiqueta="Mes"
            valor={mes}
            alCambiar={(v) => cambiar("mes", v)}
            opciones={[
              { valor: "", etiqueta: "Mes" },
              ...MESES_LARGOS.map((nombre, i) => ({
                valor: String(i + 1).padStart(2, "0"),
                etiqueta: nombre,
              })),
            ]}
          />
        </View>

        <View style={styles.anio}>
          <Selector
            etiqueta="Año"
            valor={anio}
            alCambiar={(v) => cambiar("anio", v)}
            opciones={[
              { valor: "", etiqueta: "Año" },
              ...anios.map((a) => ({ valor: a, etiqueta: a })),
            ]}
          />
        </View>
      </View>

      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : ayuda ? (
        <Text style={styles.ayuda}>{ayuda}</Text>
      ) : null}
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  caja: {
    gap: espacio.xs,
  },

  etiqueta: {
    ...texto.etiqueta,
    color: colores.texto,
  },

  fila: {
    flexDirection: "row",
    gap: espacio.sm,
  },

  dia: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
  mes: { flexGrow: 2, flexShrink: 1, flexBasis: 0 },
  anio: { flexGrow: 1.3, flexShrink: 1, flexBasis: 0 },

  ayuda: {
    ...texto.dato,
    color: colores.textoTenue,
  },

  error: {
    ...texto.dato,
    color: colores.peligro.texto,
  },
}));
