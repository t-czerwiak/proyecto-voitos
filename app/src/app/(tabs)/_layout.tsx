import { Stack } from "expo-router";
import { useColores } from "../../tema";

export default function GrupoPrincipal() {
  const colores = useColores();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colores.fondo },
      }}
    />
  );
}
