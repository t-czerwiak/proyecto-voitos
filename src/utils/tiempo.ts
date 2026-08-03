// Utilidades de fecha/hora en zona horaria de Argentina (UTC-3).
// Los horarios se guardan con la hora local del usuario, no en UTC,
// asi que todas las comparaciones de "ahora" tienen que hacerse en esta zona.

const TIMEZONE_OFFSET_HS = -3; // Argentina UTC-3

export interface AhoraArgentina {
  hoy: string; // "2026-07-13"
  hora: number; // 0-23
  minuto: number; // 0-59
}

export const getHoraArgentina = (): AhoraArgentina => {
  const ahora = new Date();
  ahora.setUTCHours(ahora.getUTCHours() + TIMEZONE_OFFSET_HS);
  return {
    hoy: ahora.toISOString().split("T")[0],
    hora: ahora.getUTCHours(),
    minuto: ahora.getUTCMinutes(),
  };
};

// Convierte hora + minuto a minutos totales del dia, util para comparar
// dos momentos del mismo dia (ej: saber si un horario ya paso).
export const aMinutosDelDia = (hora: number, minuto: number): number =>
  hora * 60 + minuto;

export const restarUnDia = (fecha: string): string => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
};

export interface TramoVentana {
  dia: string;
  hora: number;
  desde: number; // minuto inicial, inclusive
  hasta: number; // minuto final, inclusive
}

// Parte una ventana de "los ultimos N minutos" en tramos de (dia, hora), que es
// como hay que consultarla porque dia, hora y minuto son tres columnas
// separadas en la tabla horarios.
//
// La mayoria de las veces da un solo tramo. Da dos cuando la ventana cruza el
// cambio de hora, y en ese caso el segundo tramo puede caer en el dia anterior
// si son las 00:0X.
export const getTramosVentana = (
  dia: string,
  hora: number,
  minuto: number,
  minutosAtras: number
): TramoVentana[] => {
  const inicio = minuto - minutosAtras;

  if (inicio >= 0) {
    return [{ dia, hora, desde: inicio, hasta: minuto }];
  }

  const tramoActual: TramoVentana = { dia, hora, desde: 0, hasta: minuto };
  const tramoAnterior: TramoVentana =
    hora > 0
      ? { dia, hora: hora - 1, desde: 60 + inicio, hasta: 59 }
      : { dia: restarUnDia(dia), hora: 23, desde: 60 + inicio, hasta: 59 };

  return [tramoActual, tramoAnterior];
};
