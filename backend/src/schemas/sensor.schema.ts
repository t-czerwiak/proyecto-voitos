import { z } from "zod";

export const ConfirmacionSchema = z.object({
  dispositivo_id: z.string().min(1, "dispositivo_id requerido"),
  horario_id: z.string().uuid("horario_id debe ser UUID"),
  bateria: z.number().int().min(0).max(100, "bateria debe estar entre 0 y 100"),
  // Cuantas pastillas libero realmente el dispositivo. Es opcional para no
  // romper firmwares viejos que no lo mandan: en ese caso se usa la cantidad
  // que pedia el horario.
  cantidad: z
    .number()
    .int()
    .min(1, "cantidad debe ser al menos 1")
    .max(20, "cantidad no puede ser mayor a 20")
    .optional(),
});

export type Confirmacion = z.infer<typeof ConfirmacionSchema>;

// Body de POST /api/sensor/dispensar. Los dos campos son opcionales:
// - destino: ip o host:puerto del dispositivo. Si no viene se usa ESP32_URL
//   del .env, asi no hace falta mandarlo en cada request.
// - horario_id: solo informativo, para saber a que dosis correspondia la
//   senal. No marca nada como dispensado.
export const DispensarSchema = z.object({
  destino: z.string().min(1, "destino no puede estar vacio").optional(),
  horario_id: z.string().uuid("horario_id debe ser UUID").optional(),
  // Pisa la cantidad del horario. Sirve para probar el hardware sin depender
  // de que haya una dosis cargada en la base.
  cantidad: z
    .number()
    .int()
    .min(1, "cantidad debe ser al menos 1")
    .max(20, "cantidad no puede ser mayor a 20")
    .optional(),
});

export type Dispensar = z.infer<typeof DispensarSchema>;
