import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Faltan las variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el .env");
}

// Cliente unico para todas las consultas a la base. Usa la service_role key,
// que saltea RLS por diseno (el backend es el componente de confianza).
//
// persistSession y autoRefreshToken van en false a proposito: este cliente es
// compartido por todos los requests del servidor, asi que NO tiene que guardar
// la sesion de nadie. Si guardara una, las consultas siguientes dejarian de
// usar la service_role key y pasarian a usar el token de ese usuario.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Cliente descartable para operaciones de login. Se crea uno nuevo por request
// para que la sesion que devuelve Supabase quede aislada en ese cliente y muera
// con el, sin contaminar al cliente compartido de arriba.
export const crearClienteAuth = () =>
  createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
