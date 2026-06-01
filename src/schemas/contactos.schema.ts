import { z } from "zod";

export const ContactoCreateSchema = z.object({
  usuario_id: z.string().uuid("usuario_id debe ser UUID"),
  nombre: z.string().min(1, "nombre requerido"),
  apellido: z.string().min(1, "apellido requerido"),
  numero: z.string().min(1, "numero requerido"),
  dni: z.string().min(1, "dni requerido"),
});

export const ContactoUpdateSchema = ContactoCreateSchema.partial();

export type ContactoCreate = z.infer<typeof ContactoCreateSchema>;
export type ContactoUpdate = z.infer<typeof ContactoUpdateSchema>;
