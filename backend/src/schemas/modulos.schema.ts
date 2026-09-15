import { z } from "zod";

// Lo unico que se edita de un modulo es cuantas pastillas tiene adentro.
//
// pastilla_id se fue: el pastillero tiene UN modulo y es compartido, asi que
// "que pastilla tiene cargada" dejo de ser un dato del modulo. El motivo largo
// esta en services/modulos.service.ts.
export const ModuloUpdateSchema = z.object({
  // Cuantas pastillas hay ahora en el modulo. Lo registra el cuidador al
  // recargarlo, y el backend lo va descontando en cada dispensacion.
  cantidad_actual: z
    .number()
    .int()
    .min(0, "cantidad_actual no puede ser negativa"),
});

export type ModuloUpdate = z.infer<typeof ModuloUpdateSchema>;
