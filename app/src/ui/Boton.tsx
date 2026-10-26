import React from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { crearEstilos, useColores, espacio, radio, texto, toque, Paleta } from "../tema";

type Variante = "principal" | "secundario" | "peligro" | "enlace";

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  icono?: keyof typeof Ionicons.glyphMap;
  cargando?: boolean;
  deshabilitado?: boolean;

  ancho?: "completo" | "auto";

  ayuda?: string;
  estilo?: ViewStyle;
};

type EstadoPress = {
  pressed: boolean;
  hovered?: boolean;
  focused?: boolean;
};

export default function Boton({
  titulo,
  onPress,
  variante = "principal",
  icono,
  cargando = false,
  deshabilitado = false,
  ancho = "completo",
  ayuda,
  estilo,
}: Props) {
  const styles = useEstilos();

  const inactivo = deshabilitado || cargando;
  const colores = useColores();
  const v = variantesDe(colores)[variante];

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      accessibilityRole="button"
      accessibilityLabel={titulo}
      accessibilityHint={ayuda}
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      style={(estadoBase) => {
        const estado = estadoBase as EstadoPress;
        return [
          styles.base,
          v.caja,
          ancho === "auto" && styles.autoAncho,
          variante === "enlace" && styles.enlaceCaja,
          (estado.pressed || estado.hovered) && v.activo,
          estado.focused && styles.foco,
          inactivo && styles.inactivo,
          estilo,
        ];
      }}
    >
      <View style={styles.fila}>
        {cargando ? (
          <ActivityIndicator color={v.texto.color} />
        ) : (
          icono && <Ionicons name={icono} size={22} color={v.texto.color} />
        )}

        <Text style={[texto.boton, v.texto]} numberOfLines={2}>
          {titulo}
        </Text>
      </View>
    </Pressable>
  );
}

const useEstilos = crearEstilos((colores) => ({
  base: {
    minHeight: toque.comodo,
    borderRadius: radio.lg,
    borderWidth: 2,
    paddingHorizontal: espacio.xl,
    paddingVertical: espacio.md,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },

  autoAncho: {
    width: "auto",
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    paddingHorizontal: espacio.md,
  },

  fila: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: espacio.sm,
  },

  foco: {
    borderColor: colores.texto,
    boxShadow: `0 0 0 3px ${colores.acento}`,
  },

  inactivo: {
    opacity: 0.55,
  },

  enlaceCaja: {
    minHeight: toque.minimo,
    borderWidth: 0,
    paddingHorizontal: espacio.sm,
  },
}));

const variantesDe = (
  colores: Paleta
): Record<Variante, { caja: ViewStyle; activo: ViewStyle; texto: { color: string } }> => ({
  principal: {
    caja: {
      backgroundColor: colores.acento,
      borderColor: colores.acento,
    },
    activo: {
      backgroundColor: colores.acentoSuave,
      borderColor: colores.acentoSuave,
    },
    texto: { color: colores.sobreAcento },
  },

  secundario: {
    caja: {
      backgroundColor: colores.superficie,
      borderColor: colores.bordeFuerte,
    },
    activo: {
      backgroundColor: colores.superficieAlta,
      borderColor: colores.acento,
    },
    texto: { color: colores.texto },
  },

  peligro: {
    caja: {
      backgroundColor: colores.peligro.fondo,
      borderColor: colores.peligro.borde,
    },
    activo: {
      backgroundColor: "#3A1212",
      borderColor: colores.peligro.solido,
    },
    texto: { color: colores.peligro.texto },
  },

  enlace: {
    caja: {
      backgroundColor: "transparent",
      borderColor: "transparent",
    },
    activo: {
      backgroundColor: colores.superficie,
    },
    texto: { color: colores.textoSuave },
  },
});
