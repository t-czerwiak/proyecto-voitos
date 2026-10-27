import React, { useState } from "react";
import { Image, Text, View } from "react-native";
import type { Usuario } from "../lib/api";
import { crearEstilos, radio, texto } from "../tema";

const inicialesDe = (u: Usuario | null): string => {
  if (!u) return "?";
  const a = u.nombre?.trim()?.[0] ?? "";
  const b = u.apellido?.trim()?.[0] ?? "";
  return (a + b).toUpperCase() || "?";
};

export default function Avatar({ usuario, tam = 52 }: { usuario: Usuario | null; tam?: number }) {
  const styles = useEstilos();
  const medidas = { width: tam, height: tam };
  const [fallida, setFallida] = useState<string | null>(null);

  if (usuario?.foto_url && fallida !== usuario.foto_url) {
    return (
      <Image
        source={{ uri: usuario.foto_url }}
        onError={() => setFallida(usuario.foto_url ?? null)}
        style={[styles.circulo, medidas]}
        accessibilityLabel={`Foto de ${usuario.nombre}`}
      />
    );
  }

  return (
    <View style={[styles.circulo, styles.vacio, medidas]}>
      <Text style={[styles.iniciales, { fontSize: tam * 0.36 }]}>{inicialesDe(usuario)}</Text>
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  circulo: {
    borderRadius: radio.redondo,
    borderWidth: 2,
    borderColor: colores.bordeFuerte,
  },

  vacio: {
    backgroundColor: colores.superficieAlta,
    alignItems: "center",
    justifyContent: "center",
  },

  iniciales: {
    ...texto.item,
    color: colores.acento,
  },
}));
