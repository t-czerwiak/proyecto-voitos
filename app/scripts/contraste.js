// Verificación de contraste de las dos paletas.
//
// No es un adorno: es la única forma de saber si un color "se ve bien" o si
// sólo se ve bien en el monitor de quien lo eligió. Calcula el contraste de
// cada par texto/fondo que usa la aplicación según WCAG 2.1 y falla si alguno
// no llega al mínimo.
//
//   node scripts/contraste.js      (o npm run contraste)
//
// Corre sobre LAS DOS paletas con la misma lista de pares. El modo claro es el
// que más fácil se rompe —gris claro sobre blanco es el error clásico— así que
// no alcanza con mirarlo: hay que medirlo igual que el oscuro.
//
// Mínimos de WCAG AA:
//   4.5:1  texto normal
//   3.0:1  texto grande (>=24px, o >=19px en negrita) y bordes de controles

const canal = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const partes = (hex) => {
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
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const luminancia = (hex) => {
  const [r, g, b] = partes(hex);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
};

const contraste = (a, b) => {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

// Compone un color translúcido sobre otro. Hace falta para el fondo animado:
// las burbujas pasan por detrás del texto y ahí es donde el contraste se puede
// caer sin que nadie lo note mirando una captura quieta.
const componer = (encima, debajo, alfa) => {
  const a = partes(encima);
  const b = partes(debajo);
  const mezcla = a.map((v, i) => Math.round(v * alfa + b[i] * (1 - alfa)));
  return "#" + mezcla.map((v) => v.toString(16).padStart(2, "0")).join("");
};

// Las paletas, repetidas acá a propósito: este script corre con node pelado,
// sin TypeScript ni bundler. Si cambia src/tema/paletas.ts hay que cambiarlas
// acá, y esa fricción es sana, porque obliga a volver a correr la verificación.
const OSCURA = {
  nombre: "oscura",
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
  ok: { fondo: "#04240F", texto: "#7CFFB0" },
  atencion: { fondo: "#2A2005", texto: "#F2D08A" },
  peligro: { fondo: "#2A0D0D", texto: "#FF9B9B" },
  neutro: { fondo: "#0C2415", texto: "#CFE8DA" },
  burbujas: ["#00FF7F", "#90EE90", "#32CD32"],
  opacidadBurbuja: 0.13,
  rutinas: ["#FF6B8B", "#66B8FF", "#FFD166", "#C2A3FF", "#5CE1FF", "#FFA94D"],
  sobreRutina: "#0A0A0A",
};

const CLARA = {
  nombre: "clara",
  fondo: "#F1F5F1",
  superficie: "#FFFFFF",
  superficieAlta: "#EAF2EC",
  borde: "#6E8F7B",
  bordeFuerte: "#5F8670",
  acento: "#0A6631",
  acentoSuave: "#0C7E3B",
  sobreAcento: "#FFFFFF",
  texto: "#0A1912",
  textoSuave: "#33463C",
  textoTenue: "#4E6157",
  ok: { fondo: "#E3F2E8", texto: "#0A5729" },
  atencion: { fondo: "#FDF2DC", texto: "#6B4404" },
  peligro: { fondo: "#FCEBEB", texto: "#8C1D1D" },
  neutro: { fondo: "#EAF0EC", texto: "#33463C" },
  burbujas: ["#0A6631", "#2E8B57", "#1E7A42"],
  opacidadBurbuja: 0.1,
  rutinas: ["#B01F42", "#12579E", "#8A5B00", "#5B36A8", "#0B6A80", "#9A4A00"],
  sobreRutina: "#FFFFFF",
};

// [descripcion, texto, fondo, minimo]
const paresDe = (C) => {
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
    ["texto de exito", C.ok.texto, C.ok.fondo, 4.5],
    ["texto de atencion", C.atencion.texto, C.atencion.fondo, 4.5],
    ["texto de peligro", C.peligro.texto, C.peligro.fondo, 4.5],
    ["dia apagado sobre su fondo", C.textoTenue, C.neutro.fondo, 4.5],
    ["borde de control sobre el fondo", C.bordeFuerte, C.fondo, 3],
    ["borde de tarjeta sobre el fondo", C.borde, C.fondo, 3],
  ];

  // Cada rutina pinta la letra del día encima de su color.
  C.rutinas.forEach((color, i) => {
    pares.push([`rutina ${i + 1}: letra sobre ${color}`, C.sobreRutina, color, 4.5]);
    // Y el mismo color tiene que distinguirse del fondo de la tarjeta donde se
    // dibuja el marcador. Es una marca gráfica, no texto: alcanza con 3:1.
    pares.push([`rutina ${i + 1}: ${color} contra la tarjeta`, color, C.superficie, 3]);
  });

  // EL FONDO SE MUEVE, ASI QUE EL FONDO NO ES UN SOLO COLOR.
  //
  // Las burbujas aclaran (u oscurecen) el fondo al pasar por detrás del texto.
  // Hay que mirar el peor momento, que es cuando la burbuja más contrastante
  // está justo atrás.
  C.burbujas.forEach((color, i) => {
    const conBurbuja = componer(color, C.fondo, C.opacidadBurbuja);
    pares.push([`texto sobre el fondo con burbuja ${i + 1}`, C.texto, conBurbuja, 4.5]);
    pares.push([`texto suave sobre el fondo con burbuja ${i + 1}`, C.textoSuave, conBurbuja, 4.5]);
    pares.push([`texto tenue sobre el fondo con burbuja ${i + 1}`, C.textoTenue, conBurbuja, 4.5]);
    // El "Volver" del encabezado es del color del acento y va sobre el fondo
    // pelado, así que es el que más puede sufrir.
    pares.push([`acento sobre el fondo con burbuja ${i + 1}`, C.acento, conBurbuja, 4.5]);
  });

  return pares;
};

let fallos = 0;
let total = 0;

for (const C of [OSCURA, CLARA]) {
  console.log(`\n=== PALETA ${C.nombre.toUpperCase()} ===\n`);

  for (const [nombre, frente, fondo, minimo] of paresDe(C)) {
    const valor = contraste(frente, fondo);
    const pasa = valor >= minimo;
    total++;
    if (!pasa) fallos++;
    console.log(
      `${pasa ? "OK  " : "MAL "} ${valor.toFixed(2).padStart(6)}:1  (min ${minimo})  ${nombre}`
    );
  }
}

console.log("");
if (fallos) {
  console.log(`${fallos} de ${total} ${fallos === 1 ? "par no llega" : "pares no llegan"} al minimo.`);
  process.exit(1);
}
console.log(`Los ${total} pares de las dos paletas cumplen WCAG AA.`);
