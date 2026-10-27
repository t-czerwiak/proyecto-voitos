import { z } from "zod";

const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

const ANOS_MAXIMOS = 120;

const esFechaReal = (valor: string): boolean => {
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
};

const hoyUTC = (): Date => {
  const ahora = new Date();
  return new Date(
    Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate())
  );
};

export const FechaNacimientoSchema = z
  .string()
  .regex(FORMATO, "fecha_nacimiento debe tener el formato YYYY-MM-DD")
  .refine(esFechaReal, "fecha_nacimiento no es una fecha que exista")
  .refine((valor) => {
    const fecha = new Date(`${valor}T00:00:00Z`);
    return fecha <= hoyUTC();
  }, "fecha_nacimiento no puede ser futura")
  .refine((valor) => {
    const fecha = new Date(`${valor}T00:00:00Z`);
    const limite = hoyUTC();
    limite.setUTCFullYear(limite.getUTCFullYear() - ANOS_MAXIMOS);
    return fecha >= limite;
  }, `fecha_nacimiento no puede ser de hace mas de ${ANOS_MAXIMOS} anos`);
