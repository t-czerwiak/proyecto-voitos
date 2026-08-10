import { Stack } from "expo-router";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="crear-cuenta" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="agregar-medicacion" />
      <Stack.Screen name="agregar-actividad" />
      <Stack.Screen name="detalle-dia" />
    </Stack>
  );
}
