const TIMEZONE_OFFSET_HS = -3;

export interface AhoraArgentina {
  hoy: string;
  hora: number;
  minuto: number;
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

export const aMinutosDelDia = (hora: number, minuto: number): number =>
  hora * 60 + minuto;

export const restarUnDia = (fecha: string): string => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split("T")[0];
};

export const sumarUnDia = (fecha: string): string => {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().split("T")[0];
};

export interface TramoVentana {
  dia: string;
  hora: number;
  desde: number;
  hasta: number;
}

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
