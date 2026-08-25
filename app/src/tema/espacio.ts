// Espaciado, radios y —sobre todo— tamanos minimos de lo que se toca.

// Multiplos de 4. Tener una escala y no numeros al azar es lo que hace que
// dos pantallas escritas en dias distintos se vean de la misma familia.
export const espacio = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radio = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  redondo: 999,
} as const;

// Alturas minimas de las areas que se tocan.
//
// La recomendacion de WCAG 2.2 es 44x44. Aca el minimo es 48 y el boton
// principal 56, porque el dedo que aprieta no siempre es preciso: puede ser
// el de alguien con artrosis, o el de un enfermero con guantes.
export const toque = {
  minimo: 48,
  comodo: 56,
} as const;

// El ancho maximo de una columna de contenido.
//
// La aplicacion tambien corre en el navegador de una computadora. Sin esto,
// una linea de texto cruzaba 1900px de pantalla y el ojo se perdia al volver
// al principio del renglon.
export const ANCHO_MAXIMO = 620;

// Las pantallas de entrada —portada, iniciar sesion, crear cuenta— van mas
// angostas que el resto.
//
// Un formulario de login de 620px de ancho se ve raro y ademas rompia la fila:
// el boton de Google no lo dibujamos nosotros sino la libreria de Google, que
// acepta como maximo 400px de ancho. Con la columna en 620, ese boton quedaba
// de otro tamano que los demas y la pantalla se veia desprolija. Con 400 entran
// todos iguales.
export const ANCHO_FORMULARIO = 400;
