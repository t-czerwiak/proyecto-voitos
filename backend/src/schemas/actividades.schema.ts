import { z } from "zod";

// Los campos sueltos, sin las reglas cruzadas. De aca sale el schema de update,
// porque .partial() no se puede usar sobre un schema que ya tiene .refine().
const camposActividad = z.object({
  usuario_id: z.string().uuid("usuario_id debe ser UUID"),
  nombre: z.string().min(1, "nombre requerido"),
  // "YYYY-MM-DD" para las de una vez. Las de rutina se repiten por dia de
  // semana, asi que no tienen fecha puntual y mandan "".
  fecha: z.string(),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "hora debe tener formato HH:MM"),
  tipo: z.enum(["rutina", "una-vez"]).default("una-vez"),
  // Solo tiene sentido cuando tipo es "rutina": ["L","M","X","J","V","S","D"]
  dias: z.array(z.string()).optional(),
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
