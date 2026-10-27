import React, { useMemo, useRef, useState } from "react";
import { Image, Modal, PanResponder, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ArchivoFoto, recortarFoto } from "../lib/foto";
import { Boton } from "../ui";
import { crearEstilos, useColores, espacio, radio, texto } from "../tema";

const VISOR = 260;

type Props = {
  foto: ArchivoFoto;
  guardando: boolean;
  alGuardar: (imagen: string) => void;
  alCancelar: () => void;
};

export default function EditorFoto({ foto, guardando, alGuardar, alCancelar }: Props) {
  const styles = useEstilos();
  const colores = useColores();

  const entera = Math.min(VISOR / foto.ancho, VISOR / foto.alto);
  const llena = Math.max(VISOR / foto.ancho, VISOR / foto.alto);
  const maxima = llena * 3;

  const [escala, setEscala] = useState(entera);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const inicio = useRef({ x: 0, y: 0 });
  const actual = useRef(pos);
  actual.current = pos;

  const arrastre = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          inicio.current = actual.current;
        },
        onPanResponderMove: (_, g) => setPos({ x: inicio.current.x + g.dx, y: inicio.current.y + g.dy }),
      }),
    []
  );

  const zoom = (factor: number) => setEscala((e) => Math.min(maxima, Math.max(entera * 0.6, e * factor)));

  const ancho = foto.ancho * escala;
  const alto = foto.alto * escala;

  return (
    <Modal transparent animationType="fade" onRequestClose={alCancelar}>
      <View style={styles.fondo}>
        <View style={styles.caja} accessibilityViewIsModal>
          <Text style={styles.titulo}>Acomodá tu foto</Text>
          <Text style={styles.bajada}>Arrastrala para acomodarla.</Text>

          <View style={styles.visor} {...arrastre.panHandlers}>
            <View pointerEvents="none" style={{ position: "absolute", width: VISOR, height: VISOR }}>
              <Image
                source={{ uri: foto.url }}
                style={{
                  position: "absolute",
                  width: ancho,
                  height: alto,
                  left: VISOR / 2 - ancho / 2 + pos.x,
                  top: VISOR / 2 - alto / 2 + pos.y,
                }}
              />
            </View>
          </View>

          <View style={styles.controles}>
            <Pressable onPress={() => zoom(1 / 1.15)} style={styles.control} accessibilityRole="button" accessibilityLabel="Alejar">
              <Ionicons name="remove" size={22} color={colores.acento} />
            </Pressable>
            <Pressable onPress={() => zoom(1.15)} style={styles.control} accessibilityRole="button" accessibilityLabel="Acercar">
              <Ionicons name="add" size={22} color={colores.acento} />
            </Pressable>
            <Boton
              titulo="Entera"
              variante="enlace"
              ancho="auto"
              onPress={() => {
                setEscala(entera);
                setPos({ x: 0, y: 0 });
              }}
              ayuda="Que se vea la foto completa"
            />
            <Boton
              titulo="Llenar"
              variante="enlace"
              ancho="auto"
              onPress={() => {
                setEscala(llena);
                setPos({ x: 0, y: 0 });
              }}
              ayuda="Que la foto ocupe todo el círculo"
            />
          </View>

          <View style={styles.acciones}>
            <Boton titulo="Cancelar" variante="secundario" ancho="auto" onPress={alCancelar} />
            <Boton
              titulo="Guardar la foto"
              ancho="auto"
              cargando={guardando}
              onPress={() => alGuardar(recortarFoto(foto, VISOR, escala, pos.x, pos.y, colores.superficieAlta))}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useEstilos = crearEstilos((colores) => ({
  fondo: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: espacio.lg,
  },

  caja: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: colores.fondo,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.xl,
    padding: espacio.xl,
    alignItems: "center",
  },

  titulo: {
    ...texto.seccion,
    color: colores.texto,
  },

  bajada: {
    ...texto.dato,
    color: colores.textoSuave,
    textAlign: "center",
    marginTop: espacio.xs,
    marginBottom: espacio.lg,
  },

  visor: {
    width: VISOR,
    height: VISOR,
    borderRadius: VISOR / 2,
    overflow: "hidden",
    backgroundColor: colores.superficieAlta,
    borderWidth: 2,
    borderColor: colores.acento,
    cursor: "grab",
  } as any,

  controles: {
    flexDirection: "row",
    alignItems: "center",
    gap: espacio.sm,
    marginTop: espacio.lg,
  },

  control: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colores.borde,
    alignItems: "center",
    justifyContent: "center",
  },

  acciones: {
    flexDirection: "row",
    gap: espacio.md,
    marginTop: espacio.lg,
  },
}));
