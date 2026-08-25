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

// El fondo de lámpara de lava.
//
// Las burbujas suben y bajan, se hamacan de costado, giran despacio y cambian
// un poco de tamaño mientras lo hacen. Los cuatro movimientos duran distinto y
// ninguna duración es múltiplo de otra, así que el conjunto tarda muchísimo en
// repetir la misma combinación: se ve orgánico y no como un loop.
//
// Diferencias con el fondo anterior, que hacía lo mismo pero peor:
//
//   - Antes cada burbuja elegía un destino al AZAR en toda la pantalla y se
//     tiraba para allá. Eso no es una lámpara de lava, es una mancha cruzando
//     la pantalla en diagonal. Acá cada una tiene su carril vertical y se
//     hamaca poco de costado, que es como se mueve la cera de verdad.
//   - Antes el tamaño de la ventana se leía una sola vez al cargar el módulo,
//     así que al rotar el teléfono o achicar el navegador las burbujas
//     quedaban fuera de lugar. Ahora sigue a la ventana.
//   - Antes estaba copiado y pegado en cinco pantallas. Ahora está una vez.
//
// Si el sistema pide menos movimiento, las burbujas se quedan quietas en una
// posición linda y el resto se ve exactamente igual. Es la misma imagen sin la
// parte que marea: alguien con vértigo o migraña vestibular no puede usar una
// pantalla donde algo se mueve todo el tiempo, y esa preferencia ya la dejó
// dicha en su teléfono.
export default function Fondo() {
  const styles = useEstilos();
  const colores = useColores();

  const { width, height } = useWindowDimensions();
  const quieto = useMovimientoReducido();

  return (
    <LinearGradient
      colors={colores.degradado}
      style={styles.fondo}
      // Es decoración: un lector de pantalla no tiene nada que anunciar acá.
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
  // Dónde está su carril, en proporción del ancho de la pantalla.
  carril: number;
  // Cuánto se hamaca de costado, en píxeles.
  vaiven: number;
  // Duración de la subida, en milisegundos. Cuanto más grande la burbuja, más
  // lenta: es lo que hace que se lean como pesadas y no como globos.
  subida: number;
  hamaca: number;
  giro: number;
  latido: number;
  // Para que no arranquen todas juntas.
  demora: number;
};

// Las duraciones no son múltiplos entre sí a propósito. El color no está acá:
// lo pone la paleta activa, porque el verde neón sobre un fondo claro no se ve
// y el modo claro necesita verdes profundos.
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

  // Cuatro relojes independientes. Cada uno va de 0 a 1 y vuelve.
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
          // true = va y vuelve. Sin esto la burbuja llega arriba y reaparece
          // abajo de un salto.
          true
        )
      );

    arriba.value = ciclo(subida);
    costado.value = ciclo(hamaca);
    tamano.value = ciclo(latido);

    // El giro es el único que no rebota: da la vuelta entera y sigue.
    vuelta.value = withDelay(
      demora,
      withRepeat(withTiming(1, { duration: giro, easing: Easing.linear }), -1, false)
    );

    // Si alguien activa "reducir movimiento" con la aplicación abierta, el
    // estilo pasa al quieto pero las animaciones seguirían corriendo por
    // detrás, gastando frames para nada. Se cortan.
    return () => {
      cancelAnimation(arriba);
      cancelAnimation(costado);
      cancelAnimation(vuelta);
      cancelAnimation(tamano);
    };
  }, [quieta, subida, hamaca, latido, giro, demora, arriba, costado, vuelta, tamano]);

  const estilo = useAnimatedStyle(() => {
    // El caso quieto se resuelve acá adentro y no con un estilo aparte, para
    // que la cantidad de hooks del componente no dependa de nada.
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

    // Recorre desde un poco abajo del borde inferior hasta un poco arriba del
    // superior, así nunca se ve entrar ni salir del todo.
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
          // Un poco más ancha que alta, como una gota aplastada.
          height: tam * 0.9,
          left: ancho * carril - tam / 2,
          backgroundColor: color,
          // Las cuatro esquinas con radios distintos: es lo que hace que se lea
          // como una gota y no como un óvalo perfecto. Girando despacio, la
          // silueta parece deformarse.
          borderTopLeftRadius: tam * 0.45,
          borderTopRightRadius: tam * 0.55,
          borderBottomLeftRadius: tam * 0.5,
          borderBottomRightRadius: tam * 0.4,
          // El halo alrededor. Con boxShadow y no con las shadow* sueltas, que
          // están deprecadas y tiraban warning en cada render.
          boxShadow: `0 0 ${Math.round(tam * 0.22)}px ${Math.round(tam * 0.08)}px ${color}`,
        },
        estilo,
      ]}
    />
  );
}

const useEstilos = crearEstilos((colores) => ({
  // Equivalente a StyleSheet.absoluteFill, escrito a mano porque
  // absoluteFillObject no existe en los tipos de esta versión de React Native.
  fondo: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // En el style y no como prop: props.pointerEvents está deprecado.
    pointerEvents: "none",
    // Sin esto las burbujas se dibujan por fuera de la pantalla en web y
    // aparece una barra de scroll horizontal fantasma.
    overflow: "hidden",
  },

  // La opacidad la pone la paleta (colores.opacidadBurbuja), porque el valor
  // que funciona sobre negro no es el que funciona sobre papel. Es baja a
  // propósito en las dos: tiene que dar profundidad, no competir con lo que se
  // lee encima.
  burbuja: {
    position: "absolute",
    top: 0,
  },
}));
