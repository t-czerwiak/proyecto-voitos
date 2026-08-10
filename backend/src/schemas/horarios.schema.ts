import { z } from "zod";

export const HorarioCreateSchema = z.object({
  pastilla_id: z.string().uuid("pastilla_id debe ser UUID"),
  dia: z.string().min(1, "dia requerido"),
  hora: z.number().int().min(0).max(23, "hora debe estar entre 0 y 23"),
  minuto: z.number().int().min(0).max(59, "minuto debe estar entre 0 y 59"),
  // Cuantas pastillas dispensar en esta dosis. Si no viene, la base pone 1.
  cantidad: z
    .number()
    .int()
    .min(1, "cantidad debe ser al menos 1")
    .max(20, "cantidad no puede ser mayor a 20")
    .optional(),
});

export const HorarioUpdateSchema = HorarioCreateSchema.partial();

export type HorarioCreate = z.infer<typeof HorarioCreateSchema>;
export type HorarioUpdate = z.infer<typeof HorarioUpdateSchema>;
