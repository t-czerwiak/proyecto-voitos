import { z } from "zod";
import { uuid } from "./uuid";

export const PastillaCreateSchema = z.object({
  usuario_id: uuid("usuario_id debe ser UUID"),
  nombre: z.string().min(1, "nombre requerido"),
  tipo: z.string().min(1, "tipo requerido"),
  // Cuantas pastillas se cargan en la maquina al crearla. No es una columna de
  // pastillas: va a modulos.cantidad_actual, que es de donde sale el stock.
  //
  // Ya no viene modulo_numero: hay un solo modulo, asi que no hay cual elegir.
  cantidad_inicial: z
    .number()
    .int()
    .min(0, "la cantidad no puede ser negativa")
    .max(500, "500 pastillas es mas de lo que entra en un modulo")
    .optional(),
});

export const PastillaUpdateSchema = PastillaCreateSchema.partial();

// Ajuste de stock con signo: +10 recarga, -3 corrige un conteo mal anotado.
export const StockAjusteSchema = z.object({
  delta: z
    .number()
    .int("el ajuste tiene que ser un numero entero")
    .refine((n) => n !== 0, { message: "el ajuste no puede ser 0" }),
});

export type PastillaCreate = z.infer<typeof PastillaCreateSchema>;
export type PastillaUpdate = z.infer<typeof PastillaUpdateSchema>;
export type StockAjuste = z.infer<typeof StockAjusteSchema>;
