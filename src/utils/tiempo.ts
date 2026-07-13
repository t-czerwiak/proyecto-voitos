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
