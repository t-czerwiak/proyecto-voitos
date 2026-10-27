import { Platform } from "react-native";

export const LADO_FOTO = 256;

export const sePuedeElegirFoto = Platform.OS === "web";

export type ArchivoFoto = { url: string; ancho: number; alto: number; imagen: HTMLImageElement };

export const elegirFoto = (): Promise<ArchivoFoto | null> =>
  new Promise((resolver, rechazar) => {
    const entrada = document.createElement("input");
    entrada.type = "file";
    entrada.accept = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp";
    entrada.style.display = "none";
    document.body.appendChild(entrada);

    entrada.onchange = () => {
      const archivo = entrada.files?.[0];
      entrada.remove();
      if (!archivo) return resolver(null);

      const imagen = new Image();
      const url = URL.createObjectURL(archivo);
      imagen.onload = () => resolver({ url, ancho: imagen.width, alto: imagen.height, imagen });
      imagen.onerror = () => {
        URL.revokeObjectURL(url);
        rechazar(new Error("No se pudo abrir esa imagen. Probá con una foto JPG o PNG (las HEIC del iPhone no se pueden)."));
      };
      imagen.src = url;
    };

    entrada.click();
  });

export const recortarFoto = (
  foto: ArchivoFoto,
  visor: number,
  escala: number,
  dx: number,
  dy: number,
  fondo: string
) => {
  const k = LADO_FOTO / visor;
  const lienzo = document.createElement("canvas");
  lienzo.width = LADO_FOTO;
  lienzo.height = LADO_FOTO;
  const g = lienzo.getContext("2d")!;
  g.fillStyle = fondo;
  g.fillRect(0, 0, LADO_FOTO, LADO_FOTO);
  const ancho = foto.ancho * escala;
  const alto = foto.alto * escala;
  g.drawImage(foto.imagen, (visor / 2 - ancho / 2 + dx) * k, (visor / 2 - alto / 2 + dy) * k, ancho * k, alto * k);
  URL.revokeObjectURL(foto.url);
  return lienzo.toDataURL("image/jpeg", 0.88);
};
