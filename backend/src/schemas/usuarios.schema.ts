import { z } from "zod";
import { FechaNacimientoSchema } from "./fechaNacimiento";

export const UsuarioCreateSchema = z.object({
  nombre: z.string().min(1, "nombre requerido"),
  apellido: z.string().min(1, "apellido requerido"),
  mail: z.string().email("mail invalido"),
  fecha_nacimiento: FechaNacimientoSchema.optional(),
});

export const UsuarioUpdateSchema = UsuarioCreateSchema.omit({ mail: true }).partial();

export const FotoSchema = z.object({
  imagen: z
    .string()
    .regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/, "La foto tiene que ser un JPEG en base64")
    .max(400_000, "La foto es demasiado grande"),
});

export type UsuarioCreate = z.infer<typeof UsuarioCreateSchema>;
export type UsuarioUpdate = z.infer<typeof UsuarioUpdateSchema>;
