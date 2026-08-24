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
