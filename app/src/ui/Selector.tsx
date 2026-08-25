import React from "react";
import { Platform, Text, View } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { crearEstilos, useColores, espacio, radio, texto, toque } from "../tema";

type Opcion = { valor: string; etiqueta: string };

type Props = {
  etiqueta: string;
  valor: string;
  alCambiar: (v: string) => void;
  opciones: Opcion[];
  ayuda?: string;
};

// Un desplegable con su etiqueta escrita arriba.
//
// El Picker pelado no tiene forma de decir que esta eligiendo: en el
// navegador salia un <select> suelto en medio de la pantalla. Con la etiqueta
// arriba y accessibilityLabel, el lector de pantalla anuncia "Pastilla,
// Aspirina, lista desplegable" en vez de solo "Aspirina".
export default function Selector({
  etiqueta,
  valor,
  alCambiar,
  opciones,
  ayuda,
}: Props) {
  const styles = useEstilos();
  const colores = useColores();

  return (
    <View style={styles.caja}>
      <Text style={styles.etiqueta}>{etiqueta}</Text>

      <View style={styles.marco}>
        <Picker
          selectedValue={valor}
          onValueChange={(v) => alCambiar(String(v))}
          dropdownIconColor={colores.acento}
          style={styles.picker}
          // En iOS el Picker es una rueda y los items se dibujan con el color
          // que se les pase; sin esto quedaban negros sobre el fondo oscuro.
          itemStyle={styles.item}
          accessibilityLabel={etiqueta}
        >
          {opciones.map((o) => (
            <Picker.Item
              key={o.valor}
              label={o.etiqueta}
              value={o.valor}
              color={Platform.OS === "ios" ? colores.texto : undefined}
            />
          ))}
        </Picker>
      </View>

      {ayuda && <Text style={styles.ayuda}>{ayuda}</Text>}
    </View>
  );
}

const useEstilos = crearEstilos((colores) => ({
  caja: {
    width: "100%",
    marginBottom: espacio.lg,
  },

  etiqueta: {
    ...texto.cuerpoFuerte,
    color: colores.texto,
    marginBottom: espacio.sm,
  },

  marco: {
    minHeight: toque.comodo,
    justifyContent: "center",
    backgroundColor: colores.superficie,
    borderWidth: 2,
    borderColor: colores.bordeFuerte,
    borderRadius: radio.md,
    overflow: "hidden",
  },

  picker: {
    // El alto va explicito: en el navegador el Picker es un <select>, y sin
    // esto se dibujaba de 25px adentro del marco de 56. El marco se veia
    // grande pero lo que respondia al dedo era la mitad de alto que el
    // minimo de WCAG.
    height: toque.comodo - 4,
    color: colores.texto,
    backgroundColor: "transparent",
    borderWidth: 0,
    paddingHorizontal: espacio.lg,
    ...texto.cuerpo,
  },

  item: {
    ...texto.cuerpo,
    color: colores.texto,
  },

  ayuda: {
    ...texto.dato,
    color: colores.textoTenue,
    marginTop: espacio.xs,
  },
}));
