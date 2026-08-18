// Rutinas de medicacion.
//
// La base no guarda "rutinas": agendar materializa una fila de horarios por
// cada dia que toca. Para mostrarlas hay que volver a agruparlas por pastilla
// y deducir los dias, el rango y la duracion de las fechas que quedaron.
//
// Vive aca y no en la pantalla porque es logica de dominio: se puede probar
// sola, sin renderizar nada.

import { Horario } from "./voitos";

export const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

// Un color por rutina. Tienen que destacar sobre el verde oscuro del fondo y
// distinguirse entre si de un vistazo, por eso son tonos saturados y de
// familias distintas. El verde queda reservado para las actividades.
export const COLORES_RUTINA = [
  "#FF4D6D",
  "#4DA3FF",
  "#FFD166",
  "#B388FF",
  "#00E5FF",
  "#FF9F1C",
];

// Letra del dia de la semana de una fecha "YYYY-MM-DD".
// El T12:00:00 evita que la zona horaria corra la fecha un dia para atras.
export const letraDelDia = (fecha: string) => {
  const d = new Date(`${fecha}T12:00:00`).getDay();
  return DIAS_SEMANA[d === 0 ? 6 : d - 1];
};

export type Rutina = {
  pastillaId: string;
  nombre: string;
  color: string;
  dias: string[];
  desde: string;
  hasta: string;
  semanas: number;
  dosis: number;
  pendientes: number;
  hora: string;
  cantidad: number;
};

// Reconstruye las rutinas a partir de los horarios.
//
// La base no guarda "rutinas": agendar materializa una fila por cada dia que
// toca. Asi que para mostrarlas hay que volver a agruparlas por pastilla y
// deducir los dias, el rango y la duracion de las fechas que quedaron.
export const armarRutinas = (horarios: Horario[]): Rutina[] => {
  const porPastilla = new Map<string, Horario[]>();

  for (const h of horarios) {
    const lista = porPastilla.get(h.pastilla_id) ?? [];
    lista.push(h);
    porPastilla.set(h.pastilla_id, lista);
  }

  return [...porPastilla.entries()]
    .map(([pastillaId, dosis], i) => {
      const fechas = dosis.map((d) => d.dia).sort();
      const desde = fechas[0];
      const hasta = fechas[fechas.length - 1];

      const dias = [...new Set(fechas.map(letraDelDia))].sort(
        (a, b) => DIAS_SEMANA.indexOf(a) - DIAS_SEMANA.indexOf(b)
      );

      // Semanas que abarca de punta a punta, contando la primera como 1.
      const dias_totales =
        (new Date(`${hasta}T12:00:00`).getTime() -
          new Date(`${desde}T12:00:00`).getTime()) /
        86_400_000;

      const primera = dosis[0];

      return {
        pastillaId,
        nombre: primera.pastillas?.nombre ?? "Pastilla",
        color: COLORES_RUTINA[i % COLORES_RUTINA.length],
        dias,
        desde,
        hasta,
        semanas: Math.floor(dias_totales / 7) + 1,
        dosis: dosis.length,
        pendientes: dosis.filter((d) => !d.dispensado).length,
        hora: `${String(primera.hora).padStart(2, "0")}:${String(primera.minuto).padStart(2, "0")}`,
        cantidad: primera.cantidad,
      };
    })
    .sort((a, b) => a.desde.localeCompare(b.desde));
};

export const comoFecha = (iso: string) => iso.split("-").reverse().join("/");
