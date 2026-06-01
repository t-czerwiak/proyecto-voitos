import { z } from "zod";

export const LecturaCreateSchema = z.object({
  dispositivo_id: z.string().min(1, "dispositivo_id requerido"),
  pastilla_id: z.string().uuid("pastilla_id debe ser UUID").optional(),
  pastilla_dispensada: z.boolean(),
  bateria: z.number().int().min(0).max(100, "bateria debe estar entre 0 y 100"),
  timestamp: z.string().datetime().optional(),
});

export type LecturaCreate = z.infer<typeof LecturaCreateSchema>;
