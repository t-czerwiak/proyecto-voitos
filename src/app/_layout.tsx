import { Stack } from "expo-router";

export default function RootLayout() {
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
