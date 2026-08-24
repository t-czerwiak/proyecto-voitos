// Fechas escritas como las diria una persona.
//
// La aplicacion mostraba "2026-08-25" y "25/08/2026" segun la pantalla. Ni
// una ni otra es como uno lee una fecha en voz alta, y el cuidador que abre
// la aplicacion a la manana quiere saber si eso es hoy, no hacer la cuenta.

const DIAS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export const MESES_LARGOS = MESES;

// El mediodia evita el clasico corrimiento de un dia: "2026-08-25" parseado
// como UTC en un huso negativo cae el 24 a la noche.
const comoDate = (iso: string) => new Date(`${iso}T12:00:00`);

export const hoyISO = (): string => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};

export const esHoy = (iso: string) => iso === hoyISO();

// "martes 25 de agosto"
export const fechaLarga = (iso: string) => {
  const d = comoDate(iso);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
};

// Lo mismo, pero diciendo "hoy" y "mañana" cuando corresponde, que es como se
// habla. "La próxima es mañana a las 8" se entiende sin pensar.
export const fechaRelativa = (iso: string) => {
  const hoy = comoDate(hoyISO()).getTime();
  const dia = comoDate(iso).getTime();
  const diferencia = Math.round((dia - hoy) / 86_400_000);

  if (diferencia === 0) return "hoy";
  if (diferencia === 1) return "mañana";
  if (diferencia === -1) return "ayer";
  return fechaLarga(iso);
};

export const dosDigitos = (n: number) => String(n).padStart(2, "0");

export const comoHora = (hora: number, minuto: number) =>
  `${dosDigitos(hora)}:${dosDigitos(minuto)}`;

// "las 8 y 30" — para el lector de pantalla, que leyendo "08:30" dice
// "cero ocho dos puntos treinta".
export const horaHablada = (hora: number, minuto: number) =>
  minuto === 0 ? `las ${hora}` : `las ${hora} y ${minuto}`;

// Minutos desde la medianoche, para saber si una hora ya paso.
export const enMinutos = (hora: number, minuto: number) => hora * 60 + minuto;

export const minutosDeAhora = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};
