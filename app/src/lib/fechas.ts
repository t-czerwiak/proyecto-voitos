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

export const fechaLarga = (iso: string) => {
  const d = comoDate(iso);
  return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
};

export const fechaConAnio = (iso: string) => {
  const d = comoDate(iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};

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

export const horaHablada = (hora: number, minuto: number) =>
  minuto === 0 ? `las ${hora}` : `las ${hora} y ${minuto}`;

export const enMinutos = (hora: number, minuto: number) => hora * 60 + minuto;

export const minutosDeAhora = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

export const edadDesde = (iso: string | null | undefined): number | null => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;

  const [anio, mes, dia] = iso.split("-").map(Number);
  const hoy = new Date();

  let edad = hoy.getFullYear() - anio;

  const mesActual = hoy.getMonth() + 1;
  const cumpleFuePaso = mesActual > mes || (mesActual === mes && hoy.getDate() >= dia);
  if (!cumpleFuePaso) edad -= 1;

  return edad >= 0 ? edad : null;
};
