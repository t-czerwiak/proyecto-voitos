import { z } from "zod";
import { uuid } from "./uuid";

export const ModuloUpdateSchema = z
  .object({
    pastilla_id: uuid("pastilla_id debe ser UUID").nullable().optional(),

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
