import { z } from "zod";
import { uuid } from "./uuid";

export const ConfirmacionSchema = z.object({
  dispositivo_id: z.string().min(1, "dispositivo_id requerido"),
  horario_id: uuid("horario_id debe ser UUID"),
  bateria: z.number().int().min(0).max(100, "bateria debe estar entre 0 y 100"),

  cantidad: z
    .number()
    .int()
    .min(1, "cantidad debe ser al menos 1")
    .max(20, "cantidad no puede ser mayor a 20")
    .optional(),

  detectadas: z.number().int().min(0).max(20, "detectadas no puede ser mayor a 20").optional(),
});

export type Confirmacion = z.infer<typeof ConfirmacionSchema>;

export const DispensarSchema = z.object({
  destino: z.string().min(1, "destino no puede estar vacio").optional(),
  horario_id: uuid("horario_id debe ser UUID").optional(),

  cantidad: z
    .number()
    .int()
    .min(1, "cantidad debe ser al menos 1")
    .max(20, "cantidad no puede ser mayor a 20")
    .optional(),
});

export type Dispensar = z.infer<typeof DispensarSchema>;
