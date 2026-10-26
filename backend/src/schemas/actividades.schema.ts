import { z } from "zod";
import { uuid } from "./uuid";
import { RecordatorioSchema } from "./recordatorio";

const camposActividad = z.object({
  usuario_id: uuid("usuario_id debe ser UUID"),
  nombre: z.string().min(1, "nombre requerido"),

  fecha: z.string(),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "hora debe tener formato HH:MM"),
  tipo: z.enum(["rutina", "una-vez"]).default("una-vez"),

  dias: z.array(z.string()).optional(),
  recordatorio_min: RecordatorioSchema,
});

export const ActividadCreateSchema = camposActividad
  .refine((a) => a.tipo !== "una-vez" || a.fecha.length > 0, {
    message: "una actividad de una vez necesita fecha",
    path: ["fecha"],
  })
  .refine((a) => a.tipo !== "rutina" || (a.dias?.length ?? 0) > 0, {
    message: "una rutina necesita al menos un dia",
    path: ["dias"],
  });

export const ActividadUpdateSchema = camposActividad.partial();

export type ActividadCreate = z.infer<typeof ActividadCreateSchema>;
export type ActividadUpdate = z.infer<typeof ActividadUpdateSchema>;
