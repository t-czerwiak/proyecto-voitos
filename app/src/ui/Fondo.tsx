import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { crearEstilos, useColores, useMovimientoReducido } from "../tema";

export default function Fondo() {
  const styles = useEstilos();
  const colores = useColores();

  const { width, height } = useWindowDimensions();
  const quieto = useMovimientoReducido();

  return (
    <LinearGradient
      colors={colores.degradado}
      style={styles.fondo}

      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {BURBUJAS.map((b, i) => (
        <Burbuja
          key={i}
          {...b}
          color={colores.burbujas[i % colores.burbujas.length]}
          opacidad={colores.opacidadBurbuja}
          ancho={width}
          alto={height}
          quieta={quieto}
        />
      ))}
    </LinearGradient>
  );
}

type Receta = {
  tam: number;

  carril: number;

  vaiven: number;

  subida: number;
  hamaca: number;
  giro: number;
  latido: number;

  demora: number;
};

const BURBUJAS: Receta[] = [
  {
    tam: 320,
    carril: 0.18,
    vaiven: 46,
    subida: 17000,
    hamaca: 11000,
    giro: 41000,
    latido: 13000,
    demora: 0,
  },
  {
    tam: 240,
    carril: 0.76,
    vaiven: 62,
    subida: 23000,
    hamaca: 8000,
    giro: 53000,
    latido: 19000,
    demora: 2600,
  },
  {
    tam: 360,
    carril: 0.44,
    vaiven: 38,
    subida: 29000,
    hamaca: 14000,
    giro: 67000,
    latido: 23000,
    demora: 5200,
  },
  {
    tam: 180,
    carril: 0.9,
    vaiven: 30,
    subida: 13000,
    hamaca: 6000,
    giro: 31000,
    latido: 9000,
    demora: 7800,
  },
];

function Burbuja({
  tam,
  color,
  opacidad,
  carril,
  vaiven,
  subida,
  hamaca,
  giro,
  latido,
  demora,
  ancho,
  alto,
  quieta,
}: Receta & {
  color: string;
  opacidad: number;
  ancho: number;
  alto: number;
  quieta: boolean;
}) {
  const styles = useEstilos();

  const arriba = useSharedValue(0);
  const costado = useSharedValue(0);
  const vuelta = useSharedValue(0);
  const tamano = useSharedValue(0);

  React.useEffect(() => {
    if (quieta) return;

    const ciclo = (duracion: number) =>
      withDelay(
        demora,
        withRepeat(
          withTiming(1, { duration: duracion, easing: Easing.inOut(Easing.sin) }),
          -1,

          true
        )
      );

    arriba.value = ciclo(subida);
    costado.value = ciclo(hamaca);
    tamano.value = ciclo(latido);

    vuelta.value = withDelay(
      demora,
      withRepeat(withTiming(1, { duration: giro, easing: Easing.linear }), -1, false)
    );

    return () => {
      cancelAnimation(arriba);
      cancelAnimation(costado);
      cancelAnimation(vuelta);
      cancelAnimation(tamano);
    };
  }, [quieta, subida, hamaca, latido, giro, demora, arriba, costado, vuelta, tamano]);

  const estilo = useAnimatedStyle(() => {
    if (quieta) {
      return {
        transform: [
          { translateX: 0 },
          { translateY: alto * 0.28 },
          { rotate: "18deg" },
          { scale: 1 },
        ],
      };
    }

    const y = interpolate(arriba.value, [0, 1], [alto * 0.92, -tam * 0.35]);
    const x = interpolate(costado.value, [0, 1], [-vaiven, vaiven]);
    const escala = interpolate(tamano.value, [0, 1], [0.88, 1.12]);
    const grados = interpolate(vuelta.value, [0, 1], [0, 360]);

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${grados}deg` },
        { scale: escala },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.burbuja,
        {
          opacity: opacidad,
          width: tam,

          height: tam * 0.9,
          left: ancho * carril - tam / 2,
          backgroundColor: color,

          borderTopLeftRadius: tam * 0.45,
          borderTopRightRadius: tam * 0.55,
          borderBottomLeftRadius: tam * 0.5,
          borderBottomRightRadius: tam * 0.4,

          boxShadow: `0 0 ${Math.round(tam * 0.22)}px ${Math.round(tam * 0.08)}px ${color}`,
        },
        estilo,
      ]}
    />
  );
}

const useEstilos = crearEstilos((colores) => ({
  fondo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,

    pointerEvents: "none",

    overflow: "hidden",
  },

  burbuja: {
    position: "absolute",
    top: 0,
  },
}));
