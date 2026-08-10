import { z } from "zod";

// Supabase Auth exige un minimo de 6 caracteres para la password.
export const RegistroSchema = z.object({
  nombre: z.string().min(1, "nombre requerido"),
  apellido: z.string().min(1, "apellido requerido"),
  mail: z.string().email("mail invalido"),
  // Opcional: el formulario de la app no pide la edad del cuidador. Queda
  // para completar despues desde el perfil.
  edad: z.number().int().positive("edad debe ser positiva").optional(),
  password: z.string().min(6, "la password debe tener al menos 6 caracteres"),
});

export const LoginSchema = z.object({
  mail: z.string().email("mail invalido"),
  password: z.string().min(1, "password requerida"),
});

export type Registro = z.infer<typeof RegistroSchema>;
export type Login = z.infer<typeof LoginSchema>;
