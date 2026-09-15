import React, { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { crearEstilos, espacio, texto } from "../tema";
import { MESES_LARGOS } from "../lib/fechas";
import Selector from "./Selector";

// Cuantos anos para atras se ofrecen. Tiene que coincidir con el maximo que
// acepta el backend (backend/src/schemas/fechaNacimiento.ts): si la lista
// ofreciera un ano que el backend rechaza, la persona podria elegirlo y recien
// enterarse al apretar el boton.
const ANOS_MAXIMOS = 120;

type Props = {
  // "YYYY-MM-DD", o "" si todavia no se eligio nada.
  valor: string;
  alCambiar: (iso: string) => void;
  error?: string;
};

const vacio = { dia: "", mes: "", anio: "" };

const partir = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return vacio;
  const [anio, mes, dia] = iso.split("-");
  return { dia, mes, anio };
};

// Cuantos dias tiene ese mes de ese ano.
//
// El dia 0 del mes siguiente es el ultimo del mes pedido, asi que esto resuelve
// febrero y los bisiestos sin tabla ni casos especiales. Sin ano todavia
// elegido se asume 31: es mejor ofrecer de mas y corregir cuando se sepa, que
// esconder el 31 de enero porque falta un dato que no tiene nada que ver.
const diasDelMes = (mes: number, anio: number): number =>
  mes ? new Date(anio || 2000, mes, 0).getDate() : 31;

// La fecha de nacimiento, en tres desplegables.
//
// Se eligio esto y no un campo de texto con barras por dos motivos. El primero
// es que 03/04/1950 es ambiguo: la mitad del mundo lee 3 de abril y la otra
// mitad 4 de marzo, y no hay forma de saber cual quiso poner quien escribio. El
// segundo es que un campo de texto hay que validarlo despues de escribirlo,
// mientras que de una lista no se puede elegir algo que no existe.
//
// El mes va con el nombre escrito y no con el numero, que es lo que saca la
// ambiguedad de raiz.
export default function CampoFechaNacimiento({ valor, alCambiar, error }: Props) {
  const styles = useEstilos();

  // LAS TRES PARTES VIVEN ACA, NO SE DEDUCEN DE valor.
  //
  // Parece mas prolijo derivarlas del ISO que recibe el componente, y esta mal:
  // mientras falta una, el ISO es "" —no existe "el 30 de un mes sin elegir"—
  // asi que las otras dos se perderian. En pantalla se veia como que elegir el
  // mes no hacia nada: el desplegable volvia solo a "Mes".
  //
  // valor solo siembra el estado inicial, para cuando la pantalla llega con una
  // fecha ya cargada.
  const [partes, setPartes] = useState(() => partir(valor));
  const { dia, mes, anio } = partes;

  const anios = useMemo(() => {
    const actual = new Date().getFullYear();
    // Del mas reciente al mas viejo: quien nacio hace treinta anos no tiene que
    // recorrer un siglo para encontrarse.
    return Array.from({ length: ANOS_MAXIMOS + 1 }, (_, i) => String(actual - i));
  }, []);

  const dias = useMemo(() => {
    const cuantos = diasDelMes(Number(mes), Number(anio));
    return Array.from({ length: cuantos }, (_, i) => String(i + 1).padStart(2, "0"));
  }, [mes, anio]);

  // Guarda la parte que se toco y, si ya estan las tres, avisa la fecha armada.
  // Mientras falte alguna, el padre recibe "": todavia no hay fecha.
  const cambiar = (parte: "dia" | "mes" | "anio", nuevo: string) => {
    const siguiente = { ...partes, [parte]: nuevo };

    // Si alguien elige 31 y despues cambia a febrero, ese dia deja de existir.
    // Se recorta al ultimo del mes en vez de dejar una fecha imposible.
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
      ) : (
        <Text style={styles.ayuda}>Podés dejarlo vacío y completarlo después.</Text>
      )}
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

  // El mes se lleva mas ancho porque lleva el nombre escrito ("septiembre"),
  // no un numero.
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
