import { Stack, type ErrorBoundaryProps } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from "react-native-safe-area-context";
import {
  View,
  ActivityIndicator,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";
import { crearEstilos, TemaProvider, useColores, useTema } from "../tema";
import CazaErrores from "../ui/CazaErrores";

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

      {/* Encima de cualquier pantalla: si algo se rompe, esto tiene que quedar
          visible aunque el resto no se dibuje. */}
      <CazaErrores />

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

// Lo que se dibuja cuando una pantalla se rompe AL RENDERIZAR.
//
// Sin esto, expo-router deja el arbol vacio y queda el fondo de la aplicacion
// solo: una pantalla negra que no dice nada, igual para cualquier error. Es
// literalmente el "pantallazo negro" que reporta la gente.
//
// Ojo con el alcance: un ErrorBoundary de React atrapa errores durante el
// renderizado y NADA MAS. Lo que pasa al tocar un boton, o una promesa que se
// rompe sin catch, nunca llega hasta aca. De eso se ocupa CazaErrores, que
// escucha los eventos del navegador.
//
// Los colores van escritos a mano y no salen del tema a proposito. Este
// componente reemplaza al layout entero, asi que corre POR FUERA del
// TemaProvider y useColores explotaria. Y aunque se pudiera: una pantalla de
// error no deberia depender del sistema que quizas sea el que fallo.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={estilosError.caja}>
      <Text style={estilosError.titulo}>Se rompió esta pantalla</Text>

      <ScrollView style={estilosError.scroll}>
        <Text style={estilosError.mensaje} selectable>
          {error?.message ?? "Error sin mensaje"}
        </Text>
        {error?.stack ? (
          <Text style={estilosError.stack} selectable>
            {error.stack.split("\n").slice(0, 6).join("\n")}
          </Text>
        ) : null}
      </ScrollView>

      <Pressable style={estilosError.boton} onPress={retry}>
        <Text style={estilosError.botonTexto}>Reintentar</Text>
      </Pressable>

      <Text style={estilosError.ayuda}>
        Si vuelve a pasar, sacale una foto a este texto: dice exactamente qué
        falló.
      </Text>
    </View>
  );
}

const estilosError = StyleSheet.create({
  caja: {
    flex: 1,
    backgroundColor: "#010D07",
    padding: 24,
    paddingTop: 60,
    justifyContent: "center",
  },
  titulo: {
    color: "#FF9E9E",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
  },
  scroll: { maxHeight: 260, marginBottom: 20 },
  mensaje: { color: "#FFD9D9", fontSize: 15, lineHeight: 22 },
  stack: { color: "#B98A8A", fontSize: 11, lineHeight: 16, marginTop: 12 },
  boton: {
    alignSelf: "flex-start",
    backgroundColor: "#00FF7F",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  botonTexto: { color: "#02200F", fontSize: 16, fontWeight: "800" },
  ayuda: { color: "#7B8B81", fontSize: 13, lineHeight: 19, marginTop: 20 },
});
