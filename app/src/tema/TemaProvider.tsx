import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Appearance, StyleSheet } from "react-native";
import { Paleta, paletaClara, paletaOscura } from "./paletas";

// Quién decide el tema.
//
//   "auto"    lo que diga el sistema. Es el valor de fábrica: si alguien ya
//             puso su teléfono en modo oscuro, no hace falta que lo repita acá.
//   "claro"   lo eligió la persona.
//   "oscuro"  lo eligió la persona.
//
// La elección manual gana siempre sobre el sistema. Quien la hizo tuvo un
// motivo —la pantalla del pasillo, la luz de la ventana— y ese motivo no lo
// sabe el sistema operativo.
export type ModoTema = "auto" | "claro" | "oscuro";

const CLAVE = "voitos_tema";

// Mismo criterio que el almacenamiento de la sesión en lib/api.ts: en el
// navegador se guarda, y en nativo —donde no hay localStorage y el proyecto no
// tiene AsyncStorage— simplemente no persiste. Vale para esa sesión y se
// vuelve a "auto" al reabrir, que es un valor razonable, no un error.
const guardado = {
  leer(): ModoTema | null {
    try {
      if (typeof localStorage === "undefined") return null;
      const v = localStorage.getItem(CLAVE);
      return v === "claro" || v === "oscuro" || v === "auto" ? v : null;
    } catch {
      return null;
    }
  },
  escribir(modo: ModoTema) {
    try {
      if (typeof localStorage === "undefined") return;
      localStorage.setItem(CLAVE, modo);
    } catch {
      // Modo incógnito o almacenamiento bloqueado: vale para esta sesión.
    }
  },
};

type Contexto = {
  colores: Paleta;
  modo: ModoTema;
  // El tema que efectivamente se está viendo, ya resuelto el "auto".
  esOscuro: boolean;
  setModo: (m: ModoTema) => void;
  // Pasa al otro tema. Si estaba en "auto", pasa al opuesto de lo que se ve.
  alternar: () => void;
};

const TemaContexto = createContext<Contexto>({
  colores: paletaOscura,
  modo: "auto",
  esOscuro: true,
  setModo: () => {},
  alternar: () => {},
});

export function TemaProvider({ children }: { children: React.ReactNode }) {
  // EL ESTADO ARRANCA EN EL VALOR DEL SERVIDOR, NO EN EL DE LA PERSONA.
  //
  // La web de esta aplicación se prerenderiza (app.json, web.output "static"):
  // el HTML se arma en un servidor y el navegador después lo hidrata. En ese
  // servidor no existe localStorage ni hay un sistema con preferencia de tema,
  // así que leerlos en el inicializador de useState no devuelve nada útil —y
  // peor: React se queda con lo que calculó el servidor y nunca lo revisa—.
  //
  // Ese fue exactamente el sintoma: la preferencia quedaba guardada, pero al
  // recargar la aplicación seguía apareciendo con el tema que había elegido el
  // servidor, que no eligió nadie.
  //
  // Por eso el estado arranca en el valor de la marca (oscuro) —que es lo que
  // se dibuja en el HTML prerenderizado— y se corrige apenas monta en el
  // navegador, que es el primer momento en que se puede saber la verdad.
  const [modo, setModoEstado] = useState<ModoTema>("auto");
  const [sistemaOscuro, setSistemaOscuro] = useState(true);

  useEffect(() => {
    const elegido = guardado.leer();
    if (elegido) setModoEstado(elegido);

    setSistemaOscuro(Appearance.getColorScheme() !== "light");

    // Se escucha en vivo porque alguien puede cambiarlo con la aplicación
    // abierta —varios teléfonos lo hacen solos al atardecer— y en ese caso el
    // modo "auto" tiene que acompañar.
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSistemaOscuro(colorScheme !== "light");
    });
    return () => sub.remove();
  }, []);

  const esOscuro = modo === "auto" ? sistemaOscuro : modo === "oscuro";

  const setModo = useCallback((m: ModoTema) => {
    setModoEstado(m);
    guardado.escribir(m);
  }, []);

  const alternar = useCallback(() => {
    setModo(esOscuro ? "claro" : "oscuro");
  }, [esOscuro, setModo]);

  const valor = useMemo<Contexto>(
    () => ({
      colores: esOscuro ? paletaOscura : paletaClara,
      modo,
      esOscuro,
      setModo,
      alternar,
    }),
    [esOscuro, modo, setModo, alternar]
  );

  return <TemaContexto.Provider value={valor}>{children}</TemaContexto.Provider>;
}

// LOS HOOKS SE LLAMAN useAlgo Y NO usarAlgo, A PROPOSITO.
//
// El resto del codigo esta en castellano, pero el prefijo "use" no es una
// preferencia de estilo: es como React reconoce un hook. El React Compiler
// —que este proyecto tiene prendido (app.json, experiments.reactCompiler)—
// identifica los hooks por ese prefijo, y a lo que no lo lleva lo trata como
// una funcion comun y memoriza su resultado.
//
// Con estos hooks llamados "usarColores" y "usarEstilos", el compilador
// cacheaba la hoja de estilos como si fuera una constante: el boton de tema
// cambiaba de texto pero los colores de la pantalla se quedaban en el tema
// anterior. Se veia como un tema a medio aplicar, sin ningun error en consola.
export const useTema = () => useContext(TemaContexto);

// Atajo para lo más frecuente, que es querer solo los colores.
export const useColores = () => useContext(TemaContexto).colores;

// Hojas de estilo que dependen del tema.
//
// StyleSheet.create se evalúa una sola vez, al cargar el módulo, así que un
// estilo que lea la paleta ahí queda clavado en el tema con el que arrancó la
// aplicación. Esto devuelve un hook que rehace la hoja cuando cambia el tema y
// la memoriza mientras no cambie: cambiar de tema no re-crea estilos en cada
// render, solo en el momento del cambio.
//
//   const useEstilos = crearEstilos((colores) => ({ caja: { ... } }));
//   ...
//   const styles = useEstilos();
export function crearEstilos<T extends StyleSheet.NamedStyles<T>>(
  fabrica: (colores: Paleta) => T
) {
  // Una hoja por paleta, calculadas la primera vez que se piden.
  const cache = new Map<Paleta, T>();

  return function useEstilos(): T {
    const colores = useColores();

    return useMemo(() => {
      const guardada = cache.get(colores);
      if (guardada) return guardada;

      const hoja = StyleSheet.create(fabrica(colores));
      cache.set(colores, hoja);
      return hoja;
    }, [colores]);
  };
}
