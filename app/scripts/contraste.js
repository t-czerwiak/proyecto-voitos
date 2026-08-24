// Verificacion de contraste de la paleta.
//
// No es un adorno: es la unica forma de saber si un color "se ve bien" o si
// solo se ve bien en el monitor de quien lo eligio. Calcula el contraste de
// cada par texto/fondo que usa la aplicacion segun WCAG 2.1 y falla si alguno
// no llega al minimo.
//
//   node scripts/contraste.js      (o npm run contraste)
//
// Minimos de WCAG AA:
//   4.5:1  texto normal
//   3.0:1  texto grande (>=24px, o >=19px en negrita) y bordes de controles

const canal = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const luminancia = (hex) => {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h,
    16
  );
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
};

const contraste = (a, b) => {
  const la = luminancia(a);
  const lb = luminancia(b);
  const claro = Math.max(la, lb);
  const oscuro = Math.min(la, lb);
  return (claro + 0.05) / (oscuro + 0.05);
};

// La paleta, repetida aca a proposito: este script corre con node pelado, sin
// TypeScript ni bundler. Si cambia src/tema/colores.ts hay que cambiarla aca,
// y esa friccion es sana, porque obliga a volver a correr la verificacion.
const C = {
  fondo: "#010D07",
  superficie: "#04200F",
  superficieAlta: "#073019",
  borde: "#1A6B38",
  bordeFuerte: "#1E7A42",
  acento: "#00FF7F",
  acentoSuave: "#90EE90",
  sobreAcento: "#00190C",
  texto: "#FFFFFF",
  textoSuave: "#CFE8DA",
  textoTenue: "#9FC4AF",
  okFondo: "#04240F",
  okTexto: "#7CFFB0",
  atencionFondo: "#2A2005",
  atencionTexto: "#F2D08A",
  atencionSolido: "#E0A82E",
  peligroFondo: "#2A0D0D",
  peligroTexto: "#FF9B9B",
  peligroSolido: "#FF6B6B",
  neutroFondo: "#0C2415",
  negro: "#0A0A0A",
};

const RUTINA = ["#FF6B8B", "#66B8FF", "#FFD166", "#C2A3FF", "#5CE1FF", "#FFA94D"];

// [descripcion, texto, fondo, minimo]
const pares = [
  ["texto sobre el fondo", C.texto, C.fondo, 4.5],
  ["texto sobre tarjeta", C.texto, C.superficie, 4.5],
  ["texto sobre tarjeta alta", C.texto, C.superficieAlta, 4.5],
  ["texto suave sobre tarjeta", C.textoSuave, C.superficie, 4.5],
  ["texto tenue sobre tarjeta", C.textoTenue, C.superficie, 4.5],
  ["texto tenue sobre el fondo", C.textoTenue, C.fondo, 4.5],
  ["acento como texto sobre tarjeta", C.acento, C.superficie, 4.5],
  ["acento como texto sobre el fondo", C.acento, C.fondo, 4.5],
  ["acento suave sobre tarjeta", C.acentoSuave, C.superficie, 4.5],
  ["letra del boton principal", C.sobreAcento, C.acento, 4.5],
  ["texto de exito", C.okTexto, C.okFondo, 4.5],
  ["texto de atencion", C.atencionTexto, C.atencionFondo, 4.5],
  ["texto de peligro", C.peligroTexto, C.peligroFondo, 4.5],
  ["borde de control sobre el fondo", C.bordeFuerte, C.fondo, 3],
  ["borde de tarjeta sobre el fondo", C.borde, C.fondo, 3],
  ["dia apagado sobre su fondo", C.textoTenue, C.neutroFondo, 4.5],
];

// Cada rutina pinta su letra del dia en negro sobre su color.
RUTINA.forEach((color, i) => {
  pares.push([`rutina ${i + 1}: letra sobre ${color}`, C.negro, color, 4.5]);
  pares.push([`rutina ${i + 1}: ${color} como texto en tarjeta`, color, C.superficie, 4.5]);
});

// EL FONDO SE MUEVE, ASI QUE EL FONDO NO ES UN SOLO COLOR.
//
// Las burbujas de la lampara de lava pasan por detras del texto. Con opacidad
// 0.13 aclaran el fondo, y ahi es donde el contraste puede caerse sin que
// nadie lo note mirando una captura quieta: hay que mirar el peor momento,
// que es cuando la burbuja mas clara esta justo atras.
//
// Esto compone cada burbuja sobre el fondo y verifica el texto contra el
// resultado. Si alguna vez sube la opacidad de las burbujas, esto avisa.
const OPACIDAD_BURBUJA = 0.13;

const componer = (encima, debajo, alfa) => {
  const partes = (hex) => {
    const n = parseInt(hex.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const a = partes(encima);
  const b = partes(debajo);
  const mezcla = a.map((v, i) => Math.round(v * alfa + b[i] * (1 - alfa)));
  return "#" + mezcla.map((v) => v.toString(16).padStart(2, "0")).join("");
};

const BURBUJAS = { verde: C.acento, claro: C.acentoSuave, medio: "#32CD32" };

for (const [nombre, color] of Object.entries(BURBUJAS)) {
  const fondoConBurbuja = componer(color, C.fondo, OPACIDAD_BURBUJA);
  pares.push([`texto sobre el fondo con burbuja ${nombre}`, C.texto, fondoConBurbuja, 4.5]);
  pares.push([`texto suave sobre el fondo con burbuja ${nombre}`, C.textoSuave, fondoConBurbuja, 4.5]);
  pares.push([`texto tenue sobre el fondo con burbuja ${nombre}`, C.textoTenue, fondoConBurbuja, 4.5]);
  // El "Volver" del encabezado es verde y va sobre el fondo pelado, asi que
  // es el que mas puede sufrir cuando pasa una burbuja verde por atras.
  pares.push([`acento sobre el fondo con burbuja ${nombre}`, C.acento, fondoConBurbuja, 4.5]);
}

let fallos = 0;

for (const [nombre, frente, fondo, minimo] of pares) {
  const valor = contraste(frente, fondo);
  const pasa = valor >= minimo;
  if (!pasa) fallos++;
  const marca = pasa ? "OK  " : "MAL ";
  console.log(
    `${marca} ${valor.toFixed(2).padStart(6)}:1  (min ${minimo})  ${nombre}`
  );
}

console.log("");
if (fallos) {
  console.log(`${fallos} ${fallos === 1 ? "par no llega" : "pares no llegan"} al minimo.`);
  process.exit(1);
}
console.log(`Los ${pares.length} pares de la paleta cumplen WCAG AA.`);
