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

// El ID token que devuelve el boton de Google en el navegador. El backend no
// confia en el: se lo pasa a Supabase, que valida la firma contra Google.
export const LoginGoogleSchema = z.object({
  id_token: z.string().min(1, "id_token requerido"),
});

export const RecuperarSchema = z.object({
  mail: z.string().email("mail invalido"),
});

export const ConfirmarResetSchema = z.object({
  token: z.string().min(1, "token requerido"),
  password: z.string().min(6, "la password debe tener al menos 6 caracteres"),
});

export type Registro = z.infer<typeof RegistroSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type LoginGoogle = z.infer<typeof LoginGoogleSchema>;
export type Recuperar = z.infer<typeof RecuperarSchema>;
export type ConfirmarReset = z.infer<typeof ConfirmarResetSchema>;
