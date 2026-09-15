import { StyleSheet } from "react-native";
import { Paleta, paletaOscura } from "./paletas";

// El acceso a los colores desde las pantallas.
//
// Antes esto era un contexto de React con un tema que podía cambiar en
// caliente, porque había modo claro y modo oscuro. Ya no: la paleta es una
// sola y es constante, así que no hace falta ni proveedor, ni contexto, ni
// estado. Lo que sigue en pie es la FORMA de pedir los colores —useColores()
// y crearEstilos()— porque la usan treinta y pico de archivos y porque sigue
// siendo la que corresponde: ninguna pantalla escribe un color a mano.

export function useColores(): Paleta {
  return paletaOscura;
}

// Hojas de estilo que leen la paleta.
//
//   const useEstilos = crearEstilos((colores) => ({ caja: { ... } }));
//   ...
//   const styles = useEstilos();
//
// La hoja se arma la primera vez que se pide y queda guardada. Se hace en ese
// momento y no al cargar el módulo porque StyleSheet.create necesita que
// react-native ya esté inicializado, y los módulos del tema se importan muy
// temprano.
export function crearEstilos<T extends StyleSheet.NamedStyles<T>>(
  fabrica: (colores: Paleta) => T
) {
  let hoja: T | null = null;

  return function useEstilos(): T {
    if (hoja === null) hoja = StyleSheet.create(fabrica(paletaOscura));
    return hoja;
  };
}
