import { z } from "zod";
import { uuid } from "./uuid";

export const ModuloUpdateSchema = z
  .object({
    // Que pastilla tiene cargada. null = modulo vacio.
    pastilla_id: uuid("pastilla_id debe ser UUID").nullable().optional(),
    // Cuantas pastillas hay ahora en el modulo. Lo registra el cuidador al
    // recargarlo, y el backend lo va descontando en cada dispensacion.
    cantidad_actual: z
      .number()
      .int()
      .min(0, "cantidad_actual no puede ser negativa")
      .optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: "Hay que mandar pastilla_id o cantidad_actual",
  });

export type ModuloUpdate = z.infer<typeof ModuloUpdateSchema>;
