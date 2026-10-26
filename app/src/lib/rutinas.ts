import { Horario } from "./voitos";

export const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

export const letraDelDia = (fecha: string) => {
  const d = new Date(`${fecha}T12:00:00`).getDay();
  return DIAS_SEMANA[d === 0 ? 6 : d - 1];
};

const aDias = (fecha: string) => new Date(`${fecha}T12:00:00`).getTime() / 86_400_000;

const HUECO_MAXIMO = 14;

export type Rutina = {
  id: string;

  fechas: string[];

  proxima: string | null;
  pastillaId: string;
  nombre: string;
  color: string;
  dias: string[];
  desde: string;
  hasta: string;
  semanas: number;
  dosis: number;
  pendientes: number;
  hora: number;
  minuto: number;
  horaTexto: string;
  cantidad: number;
};

export const armarRutinas = (
  horarios: Horario[],
  coloresRutina: readonly string[]
): Rutina[] => {
  const grupos = new Map<string, Horario[]>();

  for (const h of horarios) {
    const clave = `${h.pastilla_id}|${h.hora}|${h.minuto}`;
    const lista = grupos.get(clave) ?? [];
    lista.push(h);
    grupos.set(clave, lista);
  }

  const bloques: Horario[][] = [];

  for (const dosis of grupos.values()) {
    const ordenadas = [...dosis].sort((a, b) => a.dia.localeCompare(b.dia));
    let actual: Horario[] = [];

    for (const d of ordenadas) {
      const anterior = actual[actual.length - 1];
      if (anterior && aDias(d.dia) - aDias(anterior.dia) > HUECO_MAXIMO) {
        bloques.push(actual);
        actual = [];
      }
      actual.push(d);
    }

    if (actual.length) bloques.push(actual);
  }

  return bloques
    .sort((a, b) => a[0].dia.localeCompare(b[0].dia))
    .map((dosis, i) => {
      const desde = dosis[0].dia;
      const hasta = dosis[dosis.length - 1].dia;
      const primera = dosis[0];

      const dias = [...new Set(dosis.map((d) => letraDelDia(d.dia)))].sort(
        (a, b) => DIAS_SEMANA.indexOf(a) - DIAS_SEMANA.indexOf(b)
      );

      const pendientes = dosis.filter((d) => !d.dispensado);

      return {
        id: `${primera.pastilla_id}|${primera.hora}|${primera.minuto}|${desde}`,
        fechas: dosis.map((d) => d.dia),
        proxima: pendientes[0]?.dia ?? null,
        pastillaId: primera.pastilla_id,
        nombre: primera.pastillas?.nombre ?? "Pastilla",
        color: coloresRutina[i % coloresRutina.length],
        dias,
        desde,
        hasta,

        semanas: Math.floor((aDias(hasta) - aDias(desde)) / 7) + 1,
        dosis: dosis.length,
        pendientes: pendientes.length,
        hora: primera.hora,
        minuto: primera.minuto,
        horaTexto: `${String(primera.hora).padStart(2, "0")}:${String(primera.minuto).padStart(2, "0")}`,
        cantidad: primera.cantidad,
      };
    });
};

export const rutinasActivas = (rutinas: Rutina[]) =>
  rutinas.filter((r) => r.pendientes > 0);

export const rutinasEnFecha = (rutinas: Rutina[], fecha: string) =>
  rutinas.filter((r) => r.fechas.includes(fecha));

const NOMBRE_DIA = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

export const comoDiaYFecha = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${NOMBRE_DIA[d.getDay()]} ${dd}/${mm}`;
};

export const rutinaDeHorario = (rutinas: Rutina[], horario: Horario) =>
  rutinas.find(
    (r) =>
      r.pastillaId === horario.pastilla_id &&
      r.hora === horario.hora &&
      r.minuto === horario.minuto &&
      r.fechas.includes(horario.dia)
  ) ?? null;

export const comoFecha = (iso: string) => iso.split("-").reverse().join("/");
