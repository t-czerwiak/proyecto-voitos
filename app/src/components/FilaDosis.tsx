import React from "react";
import { Text, View } from "react-native";
import { Horario } from "../lib/voitos";
import { comoHora, horaHablada } from "../lib/fechas";
import { estadoDeDosis, presentarEstado } from "../lib/dosis";
import { Tarjeta, Estado } from "../ui";
import { crearEstilos, espacio, texto } from "../tema";

type Props = {
  dosis: Horario;

  color?: string;

  detalle?: string;
  destacada?: boolean;
};

export default function FilaDosis({ dosis, color, detalle, destacada }: Props) {
  const styles = useEstilos();

  const estado = presentarEstado(estadoDeDosis(dosis));
  const nombre = dosis.pastillas?.nombre ?? "Pastilla";
  const cantidad =
    dosis.cantidad === 1 ? "1 pastilla" : `${dosis.cantidad} pastillas`;

  return (
    <Tarjeta franja={color} destacada={destacada}>
      <View
        style={styles.fila}
        accessible
        accessibilityLabel={`A ${horaHablada(dosis.hora, dosis.minuto)}, ${nombre}, ${cantidad}. ${estado.texto}.`}
      >
        <Text style={styles.hora} accessibilityElementsHidden>
          {comoHora(dosis.hora, dosis.minuto)}
        </Text>

        <View style={styles.datos}>
          <Text style={styles.nombre}>{nombre}</Text>
          <Text style={styles.cantidad}>{cantidad}</Text>

          {detalle && <Text style={styles.detalle}>{detalle}</Text>}

          <View style={styles.estado}>
            <Estado texto={estado.texto} tono={estado.tono} icono={estado.icono} />
          </View>
        </View>
      </View>
    </Tarjeta>
  );
}

const useEstilos = crearEstilos((colores) => ({
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

  detalle: {
    ...texto.dato,
    color: colores.textoTenue,
  },

  estado: {
    marginTop: espacio.xs,
  },
}));
