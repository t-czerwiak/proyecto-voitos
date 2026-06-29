import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="medicacion" />
      <Tabs.Screen name="calendario" />
      <Tabs.Screen name="emergencia" />
      <Tabs.Screen name="configuracion" />
    </Tabs>
  );
}