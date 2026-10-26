import { Horario } from "./voitos";
import { enMinutos, hoyISO, minutosDeAhora } from "./fechas";

export type EstadoDosis = "dispensada" | "sin-dispensar" | "pendiente";

const MARGEN_MINUTOS = 20;

export const estadoDeDosis = (dosis: Horario): EstadoDosis => {
  if (dosis.dispensado) return "dispensada";

  const hoy = hoyISO();

  if (dosis.dia < hoy) return "sin-dispensar";

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
