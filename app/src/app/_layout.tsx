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
import { crearEstilos, useColores } from "../tema";
import CazaErrores from "../ui/CazaErrores";
import Dialogo from "../ui/Dialogo";
import AvisoDespertando from "../ui/AvisoDespertando";

export default function RootLayout() {
  const [fuentesListas] = useFonts({
    Nunito_400Regular,
    Nunito_700Bold,
  });

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <Navegacion fuentesListas={fuentesListas} />
    </SafeAreaProvider>
  );
}

function Navegacion({ fuentesListas }: { fuentesListas: boolean }) {
  const colores = useColores();
  const styles = useEstilos();

  if (!fuentesListas) {
    return (
      <View style={styles.espera}>
        <StatusBar style="light" />
        <ActivityIndicator color={colores.acento} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.raiz}>
      <StatusBar style="light" />

      <CazaErrores />

      <Dialogo />
      <AvisoDespertando />

      <View style={styles.pantallas}>
        <Stack
          screenOptions={{
            headerShown: false,

            contentStyle: { backgroundColor: colores.fondo },
          }}
        />
      </View>
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  raiz: {
    flex: 1,
    backgroundColor: colores.fondo,
  },

  pantallas: {
    flex: 1,
  },

  espera: {
    flex: 1,
    backgroundColor: colores.fondo,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
}));

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
