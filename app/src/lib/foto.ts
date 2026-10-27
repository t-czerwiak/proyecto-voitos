import { Platform } from "react-native";

const LADO = 256;

export const sePuedeElegirFoto = Platform.OS === "web";

export const elegirFoto = (): Promise<string | null> =>
  new Promise((resolver, rechazar) => {
    const entrada = document.createElement("input");
    entrada.type = "file";
    entrada.accept = "image/*";

    entrada.onchange = () => {
      const archivo = entrada.files?.[0];
      if (!archivo) return resolver(null);

      const imagen = new Image();
      const url = URL.createObjectURL(archivo);

      imagen.onload = () => {
        const lado = Math.min(imagen.width, imagen.height);
        const lienzo = document.createElement("canvas");
        lienzo.width = LADO;
        lienzo.height = LADO;
        lienzo
          .getContext("2d")!
          .drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, LADO, LADO);
        URL.revokeObjectURL(url);
        resolver(lienzo.toDataURL("image/jpeg", 0.85));
      };

      imagen.onerror = () => {
        URL.revokeObjectURL(url);
        rechazar(new Error("No se pudo abrir esa imagen. Probá con una foto JPG o PNG."));
      };

      imagen.src = url;
    };

    entrada.click();
  });
