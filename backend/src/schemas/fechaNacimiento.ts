import { z } from "zod";

// La validacion de la fecha de nacimiento, en un solo lugar.
//
// La usan el registro y la edicion del perfil, y las dos tienen que aceptar
// exactamente lo mismo: si el registro dejara pasar algo que la edicion rechaza,
// habria cuentas que no se pueden volver a guardar sin corregir un campo que
// nadie escribio mal.
//
// Reemplaza a la columna "edad", que era un entero. Una edad guardada como
// numero se escribe una vez y al ano siguiente miente; la fecha no cambia nunca
// y la edad se calcula cuando hace falta.

const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

// Cuantos anos para atras se acepta. No es un limite medico, es un filtro de
// tipeos: quien pone 1325 en vez de 1925 tiene que enterarse ahora y no cuando
// la pantalla diga que tiene 700 anos.
const ANOS_MAXIMOS = 120;

// El 30 de febrero NO es una fecha.
//
// new Date("2026-02-30") no falla: lo corre al 2 de marzo y devuelve algo
// valido. Por eso no alcanza con que parsee; hay que comparar las tres partes
// contra las que se pidieron.
const esFechaReal = (valor: string): boolean => {
  const [anio, mes, dia] = valor.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));

  return (
    fecha.getUTCFullYear() === anio &&
    fecha.getUTCMonth() === mes - 1 &&
    fecha.getUTCDate() === dia
  );
};

// Hoy a medianoche UTC. Las fechas de nacimiento se guardan como date pelado,
// sin hora ni zona, asi que se comparan en el mismo terreno.
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
