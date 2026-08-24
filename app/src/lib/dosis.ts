// En que estado esta una dosis.
//
// Cuidado con las palabras: el sistema sabe que la pastilla SALIO del modulo,
// no que la persona se la haya tomado. Por eso en ningun lado dice "tomada"
// ni "no tomada". Dice "salió" y "no salió", que es lo unico que se puede
// afirmar sin mentir.

import { Horario } from "./voitos";
import { enMinutos, hoyISO, minutosDeAhora } from "./fechas";

export type EstadoDosis = "dispensada" | "sin-dispensar" | "pendiente";

// Cuantos minutos se le dan a una dosis antes de considerarla no dispensada.
//
// El pastillero vuelve a sonar a los 5, 10 y 15 minutos de la hora agendada.
// Marcarla en rojo al minuto siguiente seria alarmar por algo que todavia
// esta pasando; a los 20 la insistencia ya termino y el silencio significa
// algo.
const MARGEN_MINUTOS = 20;

export const estadoDeDosis = (dosis: Horario): EstadoDosis => {
  if (dosis.dispensado) return "dispensada";

  const hoy = hoyISO();

  // De un dia anterior y sin dispensar: no salio y ya no va a salir.
  if (dosis.dia < hoy) return "sin-dispensar";

  // De un dia posterior: todavia le falta.
  if (dosis.dia > hoy) return "pendiente";

  return enMinutos(dosis.hora, dosis.minuto) + MARGEN_MINUTOS < minutosDeAhora()
    ? "sin-dispensar"
    : "pendiente";
};

type Presentacion = {
  texto: string;
  tono: "ok" | "atencion" | "neutro";
  icono: "checkmark-circle" | "alert-circle" | "time-outline";
};

export const presentarEstado = (estado: EstadoDosis): Presentacion => {
  switch (estado) {
    case "dispensada":
      return { texto: "Salió del pastillero", tono: "ok", icono: "checkmark-circle" };
    case "sin-dispensar":
      return { texto: "No salió", tono: "atencion", icono: "alert-circle" };
    default:
      return { texto: "Todavía no", tono: "neutro", icono: "time-outline" };
  }
};

// El resumen del dia en numeros, que es lo primero que se mira al abrir la
// aplicacion: cuantas hay, cuantas salieron, cuantas quedaron sin salir.
export type ResumenDelDia = {
  total: number;
  dispensadas: number;
  sinDispensar: number;
  pendientes: number;
};

export const resumirDia = (dosis: Horario[]): ResumenDelDia => {
  const resumen: ResumenDelDia = {
    total: dosis.length,
    dispensadas: 0,
    sinDispensar: 0,
    pendientes: 0,
  };

  for (const d of dosis) {
    const estado = estadoDeDosis(d);
    if (estado === "dispensada") resumen.dispensadas++;
    else if (estado === "sin-dispensar") resumen.sinDispensar++;
    else resumen.pendientes++;
  }

  return resumen;
};

// La proxima dosis que todavia no salio, mirando todo el calendario y no solo
// hoy: si la que sigue es manana a las 8, eso es lo que hay que decir.
export const proximaDosis = (dosis: Horario[]): Horario | null => {
  const hoy = hoyISO();
  const ahora = minutosDeAhora();

  const candidatas = dosis
    .filter((d) => !d.dispensado)
    .filter((d) => d.dia > hoy || (d.dia === hoy && enMinutos(d.hora, d.minuto) >= ahora))
    .sort(
      (a, b) =>
        a.dia.localeCompare(b.dia) ||
        enMinutos(a.hora, a.minuto) - enMinutos(b.hora, b.minuto)
    );

  return candidatas[0] ?? null;
};
