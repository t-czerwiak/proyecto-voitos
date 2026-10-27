import { z } from "zod";
import { uuid } from "./uuid";
import { RecordatorioSchema } from "./recordatorio";
import { getHoraArgentina } from "../utils/tiempo";

const camposActividad = z.object({
  usuario_id: uuid("usuario_id debe ser UUID"),
  nombre: z.string().min(1, "nombre requerido"),

  fecha: z.string(),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "hora debe tener formato HH:MM"),
  tipo: z.enum(["rutina", "una-vez"]).default("una-vez"),

  dias: z.array(z.string()).optional(),
  recordatorio_min: RecordatorioSchema,
});

const yaPaso = (fecha?: string, hora?: string) => {
  if (!fecha) return false;
  const ahora = getHoraArgentina();
  const actual = `${ahora.hoy} ${String(ahora.hora).padStart(2, "0")}:${String(ahora.minuto).padStart(2, "0")}`;
  return hora ? `${fecha} ${hora}` <= actual : fecha < ahora.hoy;
};

const noPasada = {
  message: "la fecha y hora ya pasaron",
  path: ["fecha"],
};

export const ActividadCreateSchema = camposActividad
  .refine((a) => a.tipo !== "una-vez" || a.fecha.length > 0, {
    message: "una actividad de una vez necesita fecha",
    path: ["fecha"],
  })
  .refine((a) => a.tipo !== "rutina" || (a.dias?.length ?? 0) > 0, {
    message: "una rutina necesita al menos un dia",
    path: ["dias"],
  })
  .refine((a) => a.tipo !== "una-vez" || !yaPaso(a.fecha, a.hora), noPasada);

export const ActividadUpdateSchema = camposActividad
  .partial()
  .refine((a) => a.tipo === "rutina" || !yaPaso(a.fecha, a.hora), noPasada);

export type ActividadCreate = z.infer<typeof ActividadCreateSchema>;
export type ActividadUpdate = z.infer<typeof ActividadUpdateSchema>;
