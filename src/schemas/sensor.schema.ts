import { z } from "zod";

export const ConfirmacionSchema = z.object({
  dispositivo_id: z.string().min(1, "dispositivo_id requerido"),
  horario_id: z.string().uuid("horario_id debe ser UUID"),
  bateria: z.number().int().min(0).max(100, "bateria debe estar entre 0 y 100"),
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
});

export type Dispensar = z.infer<typeof DispensarSchema>;
