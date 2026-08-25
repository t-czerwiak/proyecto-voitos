import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { View, ActivityIndicator } from "react-native";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";
import { crearEstilos, TemaProvider, useColores, useTema } from "../tema";

export default function RootLayout() {
  const [fuentesListas] = useFonts({
    Nunito_400Regular,
    Nunito_700Bold,
  });

  // El proveedor del tema envuelve TODO, incluso la pantalla de espera: si no,
  // el primer cuadro de la aplicacion se dibujaria con colores que no son los
  // que la persona eligio y se veria un parpadeo al entrar.
  return (
    <TemaProvider>
      {/* SafeAreaProvider tiene que envolver todo: es de donde salen los
          margenes que evitan que el contenido quede abajo del notch o de la
          barra de gestos.

          initialMetrics no es opcional aca. La web de esta aplicacion se
          prerenderiza (app.json, web.output "static"): el HTML se arma en el
          servidor y despues el navegador lo hidrata. Sin metricas iniciales el
          SafeAreaProvider no dibuja a sus hijos hasta medir, asi que el
          servidor producia un arbol y el navegador otro. React lo detectaba en
          plena hidratacion —"Rendered fewer hooks than expected"—, tiraba el
          HTML prerenderizado y volvia a dibujar todo del lado del cliente.

          La pagina igual se veia bien, que es lo que hace dificil de encontrar
          el problema: lo unico que se perdia era la primera pintada rapida. */}
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Navegacion fuentesListas={fuentesListas} />
      </SafeAreaProvider>
    </TemaProvider>
  );
}

// Va aparte del componente de arriba porque un hook no puede leer un contexto
// que se crea en el mismo componente: useColores tiene que correr POR DEBAJO
// del TemaProvider.
function Navegacion({ fuentesListas }: { fuentesListas: boolean }) {
  const colores = useColores();
  const { esOscuro } = useTema();
  const styles = useEstilos();

  // Mientras carga la fuente se muestra el fondo de la aplicacion con un
  // indicador. Antes devolvia null: la pantalla quedaba en blanco puro, que en
  // un telefono lento se ve como si la aplicacion no hubiera abierto.
  if (!fuentesListas) {
    return (
      <View style={styles.espera}>
        <StatusBar style={esOscuro ? "light" : "dark"} />
        <ActivityIndicator color={colores.acento} size="large" />
      </View>
    );
  }

  return (
    <>
      {/* La barra de estado sigue al tema: con la barra clara sobre un fondo
          claro, los iconos del sistema desaparecen. */}
      <StatusBar style={esOscuro ? "light" : "dark"} />

      {/* Sin <Stack.Screen> a mano: expo-router arma las rutas leyendo los
          archivos de src/app. */}
      <Stack
        screenOptions={{
          headerShown: false,
          // El fondo de la transicion entre pantallas. Sin esto se ve un
          // destello del color contrario al navegar.
          contentStyle: { backgroundColor: colores.fondo },
        }}
      />
    </>
  );
}

const useEstilos = crearEstilos((colores) => ({
  espera: {
    flex: 1,
    backgroundColor: colores.fondo,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
}));
