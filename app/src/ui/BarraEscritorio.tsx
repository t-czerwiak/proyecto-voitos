import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Href, router, usePathname } from "expo-router";
import { crearEstilos, espacio, radio, texto, ANCHO_ESCRITORIO_MAXIMO } from "../tema";

const DESTINOS: { titulo: string; ruta: Href; prefijos: string[] }[] = [
  { titulo: "Inicio", ruta: "/home", prefijos: ["/home"] },
  { titulo: "Calendario", ruta: "/calendario", prefijos: ["/calendario", "/detalle-dia", "/agregar-actividad"] },
  {
    titulo: "Pastillas",
    ruta: "/medicacion",
    prefijos: ["/medicacion", "/agregar-medicacion", "/agendar-medicacion", "/recargar-medicacion"],
  },
  { titulo: "Mi pastillero", ruta: "/mi-pastillero", prefijos: ["/mi-pastillero"] },
  { titulo: "Perfil", ruta: "/perfil", prefijos: ["/perfil"] },
];

type EstadoPress = { pressed: boolean; hovered?: boolean; focused?: boolean };

export default function BarraEscritorio() {
  const styles = useEstilos();
  const ruta = usePathname();

  return (
    <View style={styles.barra}>
      <View style={styles.interior}>
        <Pressable
          onPress={() => router.push("/home")}
          accessibilityRole="link"
          accessibilityLabel="Voitos, ir al inicio"
        >
          <Image
            source={require("../../assets/images/logoClaro.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Pressable>

        <View style={styles.enlaces} accessibilityRole="menubar">
          {DESTINOS.map((d) => {
            const activo = d.prefijos.some((p) => ruta.startsWith(p));
            return (
              <Pressable
                key={d.titulo}
                onPress={() => router.push(d.ruta)}
                accessibilityRole="link"
                accessibilityState={{ selected: activo }}
                style={(e) => {
                  const estado = e as EstadoPress;
                  return [
                    styles.enlace,
                    (estado.hovered || estado.focused) && styles.enlaceEncima,
                    activo && styles.enlaceActivo,
                  ];
                }}
              >
                <Text style={[styles.enlaceTexto, activo && styles.enlaceTextoActivo]}>{d.titulo}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  barra: {
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: colores.borde,
    backgroundColor: colores.fondo,
    paddingHorizontal: espacio.xl,
  },

  interior: {
    width: "100%",
    maxWidth: ANCHO_ESCRITORIO_MAXIMO,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 68,
  },

  logo: {
    width: 120,
    height: 40,
  },

  enlaces: {
    flexDirection: "row",
    gap: espacio.xs,
  },

  enlace: {
    paddingHorizontal: espacio.lg,
    paddingVertical: espacio.sm,
    borderRadius: radio.sm,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },

  enlaceEncima: {
    backgroundColor: colores.superficie,
  },

  enlaceActivo: {
    borderBottomColor: colores.acento,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  enlaceTexto: {
    ...texto.cuerpoFuerte,
    fontSize: 16,
    color: colores.textoSuave,
  },

  enlaceTextoActivo: {
    color: colores.acento,
  },
}));
