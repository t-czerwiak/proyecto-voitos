import { StyleSheet } from "react-native";
import { Paleta, paletaOscura } from "./paletas";

export function useColores(): Paleta {
  return paletaOscura;
}

export function crearEstilos<T extends StyleSheet.NamedStyles<T>>(
  fabrica: (colores: Paleta) => T
) {
  let hoja: T | null = null;

  return function useEstilos(): T {
    if (hoja === null) hoja = StyleSheet.create(fabrica(paletaOscura));
    return hoja;
  };
}
