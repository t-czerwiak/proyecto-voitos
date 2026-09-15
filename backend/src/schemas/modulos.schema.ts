import { z } from "zod";
import { uuid } from "./uuid";

// Lo que se edita de un modulo: que pastilla tiene puesta y cuantas hay.
//
// Lo que NO se edita es el numero ni el dispositivo_id: los dos describen
// hardware. El numero es el servo que la ESP32 va a mover, y el dispositivo_id
// tiene que coincidir con lo que la placa tiene escrito adentro.
export const ModuloUpdateSchema = z
  .object({
    // Que pastilla tiene cargada. null = modulo vacio. Cambiarla es el
    // equivalente a cambiar la tolva y el filtro.
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
