// Rutinas de medicacion.
//
// La base no guarda "rutinas": agendar materializa una fila de horarios por
// cada dia que toca. Para mostrarlas hay que volver a agruparlas y deducir los
// dias, el rango y la duracion a partir de las fechas que quedaron.
//
// Vive aca y no en la pantalla porque es logica de dominio: se puede probar
// sola, sin renderizar nada.

import { Horario } from "./voitos";

export const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

// Un color por rutina. Tienen que destacar sobre el verde oscuro del fondo y
// distinguirse entre si de un vistazo, por eso son tonos saturados de familias
// distintas. El verde queda reservado para las actividades.
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

const aDias = (fecha: string) => new Date(`${fecha}T12:00:00`).getTime() / 86_400_000;

// Cuantos dias de hueco entre dos dosis alcanzan para considerarlas de rutinas
// distintas. Una rutina real tiene como maximo 7 dias entre dosis (un solo dia
// de la semana elegido), asi que 14 deja margen sin llegar a fusionar dos
// periodos separados.
const HUECO_MAXIMO = 14;

export type Rutina = {
  id: string;
  // Las fechas concretas de esta rutina. Sin esto el calendario no puede saber
  // que rutina toca cada dia: filtrando por pastilla, dos rutinas de la misma
  // pastilla pintaban las dos en cualquier dia que tuviera una sola dosis.
  fechas: string[];
  // Primera dosis que todavia no salio, para mostrar "proxima" sin recalcular.
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

// Agrupa horarios en rutinas.
//
// La clave es pastilla + hora + minuto, no solo la pastilla: la misma aspirina
// a las 8 y a las 20 son dos rutinas distintas, y agruparlas juntas mostraba
// una sola con una hora elegida al azar entre las dos.
//
// Despues, dentro de cada grupo, se corta donde hay un hueco grande de fechas.
// Sin eso, una dosis suelta de hace dos meses se pegaba a la rutina de esta
// semana y el rango salia disparatado.
export const armarRutinas = (horarios: Horario[]): Rutina[] => {
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
        color: COLORES_RUTINA[i % COLORES_RUTINA.length],
        dias,
        desde,
        hasta,
        // Semanas que abarca de punta a punta, contando la primera como 1.
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

// Una rutina esta activa mientras le queden dosis por salir. Las que ya
// terminaron no se listan: no hay nada que hacer con ellas y solo ensucian.
export const rutinasActivas = (rutinas: Rutina[]) =>
  rutinas.filter((r) => r.pendientes > 0);

// Que rutinas tienen una dosis en esta fecha. Se compara contra las fechas de
// la rutina y no contra la pastilla: dos rutinas de la misma pastilla a
// distinta hora caen en dias distintos y tienen que marcarse por separado.
export const rutinasEnFecha = (rutinas: Rutina[], fecha: string) =>
  rutinas.filter((r) => r.fechas.includes(fecha));

// "mar 25/08" — dia de la semana abreviado y fecha corta, que es como uno
// dice cuando toca la proxima.
const NOMBRE_DIA = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];

export const comoDiaYFecha = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${NOMBRE_DIA[d.getDay()]} ${dd}/${mm}`;
};

// A que rutina pertenece una dosis. Hace falta para pintar cada dosis del dia
// con el color de su rutina: dos rutinas pueden coincidir en hora y solo se
// distinguen por la pastilla, o al reves.
export const rutinaDeHorario = (rutinas: Rutina[], horario: Horario) =>
  rutinas.find(
    (r) =>
      r.pastillaId === horario.pastilla_id &&
      r.hora === horario.hora &&
      r.minuto === horario.minuto &&
      r.fechas.includes(horario.dia)
  ) ?? null;

export const comoFecha = (iso: string) => iso.split("-").reverse().join("/");
