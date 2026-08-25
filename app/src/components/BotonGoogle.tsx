import React, { useEffect, useRef, useState } from "react";
import { View, Text } from "react-native";
import { router } from "expo-router";
import { dibujarBotonGoogle, googleDisponible } from "../lib/google";
import { iniciarSesionConGoogle } from "../lib/voitos";
import { Aviso } from "../ui";
import { crearEstilos, espacio, texto } from "../tema";

// Boton de "Continuar con Google".
//
// El boton lo dibuja Google adentro de este contenedor: no es un boton nuestro
// con su logo. GIS solo entrega el ID token a traves de su propio boton, y
// ademas es lo que piden sus condiciones de uso.
//
// Si Google no esta configurado (falta EXPO_PUBLIC_GOOGLE_CLIENT_ID) el
// componente no dibuja nada. La pantalla queda igual que antes, sin un boton
// roto que promete algo que no funciona.
//
// EL ANCHO
//
// Este es el unico boton de la aplicacion que no dibujamos nosotros, asi que
// era el unico que no seguia el ancho de los demas: quedaba de 280px en una
// columna donde el resto ocupaba todo, y la fila se veia desprolija.
//
// Ahora se mide el hueco donde va a entrar y se le pasa esa medida a Google.
// GIS solo acepta entre 200 y 400, asi que se recorta a ese rango; por eso las
// pantallas de entrada usan una columna de 400 (ANCHO_FORMULARIO), que es
// justo lo mas ancho que Google sabe dibujar.
export default function BotonGoogle({
  // Donde va la linea del "o". Con Google arriba del formulario, la linea
  // tiene que ir debajo suyo.
  separador = "arriba",
  leyenda = "o",
}: {
  separador?: "arriba" | "abajo" | "ninguno";
  leyenda?: string;
} = {}) {
  const styles = useEstilos();

  const contenedor = useRef<View | null>(null);
  const [error, setError] = useState("");
  const [ancho, setAncho] = useState(0);

  useEffect(() => {
    if (!googleDisponible()) return;
    // Hasta no saber el ancho no se dibuja: si se dibujara antes, Google
    // pintaria el boton con el valor por defecto y despues habria que
    // borrarlo y rehacerlo, que se ve como un parpadeo.
    if (!ancho) return;

    // En web, View termina siendo un div: el ref ES el nodo del DOM.
    const nodo = contenedor.current as unknown as HTMLElement | null;
    if (!nodo) return;

    let vivo = true;

    dibujarBotonGoogle(
      nodo,
      async (idToken) => {
        setError("");
        try {
          await iniciarSesionConGoogle(idToken);
          router.replace("/home");
        } catch (e: any) {
          // El backend puede rechazar a proposito, por ejemplo cuando ese mail
          // ya tiene una cuenta con contrasena sin confirmar. El mensaje que
          // manda explica que hacer, asi que se muestra tal cual.
          if (vivo) setError(e.message);
        }
      },
      ancho
    ).catch((e: any) => {
      if (vivo) setError(e.message);
    });

    return () => {
      vivo = false;
    };
  }, [ancho]);

  if (!googleDisponible()) return null;

  return (
    <View
      style={styles.caja}
      // De aca sale el ancho que se le pasa a Google.
      onLayout={(e) => {
        const medido = Math.round(e.nativeEvent.layout.width);
        // El rango que acepta GIS. Fuera de el, tira error y no dibuja nada.
        const valido = Math.max(200, Math.min(400, medido));
        setAncho((actual) => (actual === valido ? actual : valido));
      }}
    >
      {separador === "arriba" && <Raya leyenda={leyenda} styles={styles} />}

      {/* El boton lo dibuja Google adentro de este hueco. La altura minima
          es la del boton de Google, para que la pantalla no pegue un salto
          cuando termina de cargar. */}
      <View ref={contenedor} style={styles.hueco} />

      <Aviso texto={error} />

      {separador === "abajo" && <Raya leyenda={leyenda} styles={styles} />}
    </View>
  );
}

// La linea con una palabra en el medio. Es decoracion que separa dos caminos,
// asi que se esconde del lector de pantalla: la separacion ya la dan los
// encabezados y las etiquetas de cada campo.
function Raya({ leyenda, styles }: { leyenda: string; styles: any }) {
  return (
    <View style={styles.separador} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.linea} />
      <Text style={styles.oTexto}>{leyenda}</Text>
      <View style={styles.linea} />
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  caja: {
    alignItems: "center",
    width: "100%",
    gap: espacio.lg,
    marginTop: espacio.lg,
  },

  separador: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: espacio.md,
  },

  linea: {
    flex: 1,
    height: 1,
    backgroundColor: colores.borde,
  },

  oTexto: {
    ...texto.dato,
    color: colores.textoSuave,
  },

  hueco: {
    minHeight: 44,
  },
}));
