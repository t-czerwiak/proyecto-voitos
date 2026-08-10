import { z } from "zod";

export const PastillaCreateSchema = z.object({
  usuario_id: z.string().uuid("usuario_id debe ser UUID"),
  nombre: z.string().min(1, "nombre requerido"),
  tipo: z.string().min(1, "tipo requerido"),
  caracteristicas: z.string().optional(),
});

export const PastillaUpdateSchema = PastillaCreateSchema.partial();

export type PastillaCreate = z.infer<typeof PastillaCreateSchema>;
export type PastillaUpdate = z.infer<typeof PastillaUpdateSchema>;
