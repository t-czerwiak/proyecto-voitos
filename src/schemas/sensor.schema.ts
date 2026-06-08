import { z } from "zod";

export const ConfirmacionSchema = z.object({
  dispositivo_id: z.string().min(1, "dispositivo_id requerido"),
  horario_id: z.string().uuid("horario_id debe ser UUID"),
  bateria: z.number().int().min(0).max(100, "bateria debe estar entre 0 y 100"),
});

export type Confirmacion = z.infer<typeof ConfirmacionSchema>;
