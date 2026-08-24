import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";
import { colores } from "../tema";

export default function RootLayout() {
  const [fuentesListas] = useFonts({
    Nunito_400Regular,
    Nunito_700Bold,
  });

  // Mientras carga la fuente se muestra el fondo de la aplicacion con un
  // indicador. Antes devolvia null: la pantalla quedaba en blanco puro,
  // que en un telefono lento se ve como si la aplicacion no hubiera abierto.
  if (!fuentesListas) {
    return (
      <View style={styles.espera}>
        <ActivityIndicator color={colores.acento} size="large" />
      </View>
    );
  }

  return (
    // SafeAreaProvider tiene que envolver todo: es de donde salen los margenes
    // que evitan que el contenido quede abajo del notch o de la barra de
    // gestos.
    //
    // initialMetrics no es opcional aca. La web de esta aplicacion se
    // prerenderiza (app.json, web.output "static"): el HTML se arma en el
    // servidor y despues el navegador lo hidrata. Sin metricas iniciales el
    // SafeAreaProvider no dibuja a sus hijos hasta medir, asi que el servidor
    // producia un arbol y el navegador otro. React lo detectaba en plena
    // hidratacion —"Rendered fewer hooks than expected"—, tiraba el HTML
    // prerenderizado y volvia a dibujar todo del lado del cliente.
    //
    // La pagina igual se veia bien, que es lo que hace dificil de encontrar el
    // problema: lo unico que se perdia era el prerender, o sea la primera
    // pintada rapida.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      {/* Barra de estado clara: el fondo de la aplicacion es oscuro y con la
          barra en negro los iconos del sistema desaparecian. */}
      <StatusBar style="light" />

      {/* Sin <Stack.Screen> a mano: expo-router arma las rutas leyendo los
          archivos de src/app. La lista que habia aca nombraba "crear-cuenta",
          que en realidad vive adentro del grupo (tabs), y el router avisaba
          por consola que esa ruta no existia a este nivel. */}
      <Stack
        screenOptions={{
          headerShown: false,
          // El fondo de la transicion entre pantallas. Sin esto se ve un
          // destello blanco al navegar, que sobre un diseno oscuro molesta.
          contentStyle: { backgroundColor: colores.fondo },
        }}
      />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  espera: {
    flex: 1,
    backgroundColor: colores.fondo,
    alignItems: "center",
    justifyContent: "center",
  },
});
