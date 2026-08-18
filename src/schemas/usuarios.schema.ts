import { z } from "zod";

export const UsuarioCreateSchema = z.object({
  nombre: z.string().min(1, "nombre requerido"),
  apellido: z.string().min(1, "apellido requerido"),
  mail: z.string().email("mail invalido"),
  edad: z.number().int().positive("edad debe ser positiva"),
});

export const UsuarioUpdateSchema = UsuarioCreateSchema.partial();

export type UsuarioCreate = z.infer<typeof UsuarioCreateSchema>;
export type UsuarioUpdate = z.infer<typeof UsuarioUpdateSchema>;
