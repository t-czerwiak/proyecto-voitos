import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Horario } from "../lib/voitos";
import { comoHora, horaHablada } from "../lib/fechas";
import { estadoDeDosis, presentarEstado } from "../lib/dosis";
import { Tarjeta, Estado } from "../ui";
import { colores, espacio, texto } from "../tema";

type Props = {
  dosis: Horario;
  // El color de la rutina a la que pertenece, si se conoce. Es una ayuda
  // visual, nunca la unica informacion: el nombre de la pastilla siempre
  // esta escrito al lado.
  color?: string;
  // Texto extra abajo: "Rutina: L M V a las 08:00".
  detalle?: string;
  destacada?: boolean;
};

// Una dosis, como fila.
//
// La hora va grande y primero porque es lo que se busca de un vistazo, con
// numeros de ancho fijo para que las horas de la lista queden alineadas. El
// estado va con icono, palabra y color juntos, nunca color solo.
export default function FilaDosis({ dosis, color, detalle, destacada }: Props) {
  const estado = presentarEstado(estadoDeDosis(dosis));
  const nombre = dosis.pastillas?.nombre ?? "Pastilla";
  const cantidad =
    dosis.cantidad === 1 ? "1 pastilla" : `${dosis.cantidad} pastillas`;

  return (
    <Tarjeta franja={color} destacada={destacada}>
      {/* El bloque entero se lee de un tiron: "las 8, Aspirina, 2 pastillas,
          salió del pastillero". Leido campo por campo se pierde el sentido. */}
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

const styles = StyleSheet.create({
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
});
