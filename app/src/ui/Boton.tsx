import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colores, espacio, radio, texto, toque } from "../tema";

type Variante = "principal" | "secundario" | "peligro" | "enlace";

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: Variante;
  icono?: keyof typeof Ionicons.glyphMap;
  cargando?: boolean;
  deshabilitado?: boolean;
  // Por defecto ocupa el ancho disponible. En una fila de dos, "auto".
  ancho?: "completo" | "auto";
  // Se lee despues del titulo, para explicar que va a pasar. Sirve sobre todo
  // en las acciones que borran algo.
  ayuda?: string;
  estilo?: ViewStyle;
};

// Pressable expone hovered y focused en web, pero los tipos de React Native
// solo declaran pressed. Se ensancha aca en vez de ignorar el tipo.
type EstadoPress = {
  pressed: boolean;
  hovered?: boolean;
  focused?: boolean;
};

// El boton de la aplicacion.
//
// Antes cada pantalla dibujaba el suyo: alturas de 66, 72 y 56, textos de 14,
// 20 y 26, y tres tonos de verde distintos para la misma accion. Ahora hay
// cuatro variantes y una sola definicion de cada una.
//
// Lo que cambio para que se pueda usar de verdad:
//
//   - 56px de alto minimo (WCAG 2.2 pide 44). El dedo que aprieta puede ser
//     el de alguien con artrosis o el de un enfermero con guantes.
//   - minHeight y no height: si la persona agranda la letra del sistema, el
//     boton crece en vez de recortar el texto.
//   - El principal es verde lleno con letra oscura. Se distingue del
//     secundario por relleno, no solo por color, asi que tambien se ve en
//     escala de grises.
//   - Anillo de foco visible: en el navegador se puede recorrer la aplicacion
//     con el tabulador y siempre se ve donde esta parado.
//   - Deshabilitado y cargando viajan en accessibilityState, asi que un lector
//     de pantalla dice "atenuado" o "ocupado" en vez de leer un boton que no
//     responde.
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
  const inactivo = deshabilitado || cargando;
  const v = VARIANTES[variante];

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

const styles = StyleSheet.create({
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

  // El anillo de foco del teclado. Va por fuera del borde para que se vea
  // tambien cuando el boton ya tiene borde propio.
  foco: {
    borderColor: colores.texto,
    shadowColor: colores.acento,
    shadowOpacity: 1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },

  // Atenuado pero todavia legible: un boton apagado que no se lee no explica
  // por que no se puede apretar.
  inactivo: {
    opacity: 0.55,
  },

  enlaceCaja: {
    minHeight: toque.minimo,
    borderWidth: 0,
    paddingHorizontal: espacio.sm,
  },
});

const VARIANTES: Record<
  Variante,
  { caja: ViewStyle; activo: ViewStyle; texto: { color: string } }
> = {
  // La accion principal de la pantalla. Una sola por pantalla.
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

  // Todo lo demas.
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

  // Borra cosas. Nunca es la accion principal de una pantalla.
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

  // Para "volver", "ahora no": acciones de salida que no compiten con nada.
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
};
