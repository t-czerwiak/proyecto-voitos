import { z } from "zod";
import { FechaNacimientoSchema } from "./fechaNacimiento";

export const UsuarioCreateSchema = z.object({
  nombre: z.string().min(1, "nombre requerido"),
  apellido: z.string().min(1, "apellido requerido"),
  mail: z.string().email("mail invalido"),
  fecha_nacimiento: FechaNacimientoSchema.optional(),
});

export const UsuarioUpdateSchema = UsuarioCreateSchema.partial();

export type UsuarioCreate = z.infer<typeof UsuarioCreateSchema>;
export type UsuarioUpdate = z.infer<typeof UsuarioUpdateSchema>;
