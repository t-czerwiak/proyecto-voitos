import { Request } from "express";
import { ErrorHttp } from "./errores";
import { supabase } from "../config/supabase";

// De donde sale la identidad del que hace el pedido.
//
// SIEMPRE del token, nunca de la query ni del body. Eso parece obvio pero era
// justamente el agujero que tenia el proyecto: los controladores leian
//
//     const usuario_id = req.query.usuario_id
//
// y ese valor lo elige el cliente. El token se validaba, pero despues no se
// usaba para decidir a que datos se accedia, asi que cualquier usuario con
// sesion podia pedir ?usuario_id=<id-ajeno> y leer las pastillas, horarios,
// contactos y dispensaciones de otra persona.
//
// El id que devuelve Supabase Auth es el mismo que la columna usuarios.id: el
// registro inserta el perfil con `id: cuenta.user.id`, asi que no hay que
// traducir nada.
export const idDelUsuario = (req: Request): string => {
  const id = (req as any).user?.id;

  // No deberia pasar: authMiddleware corre antes y corta si no hay token.
  // Se chequea igual porque si alguien monta una ruta sin el middleware, es
  // mejor un 401 que una consulta sin filtro que devuelva todo.
  if (!id) {
    throw new ErrorHttp(401, "No hay sesion");
  }

  return id;
};

// Si el que pide es administrador.
//
// El rol se lee de la base y NO del token. El token lo emite Supabase Auth y no
// sabe nada de los roles de la aplicacion; ademas, un dato de permisos que
// viaja en algo que el cliente guarda es un dato que el cliente puede intentar
// manipular. La base es la unica fuente.
//
// Cuesta una consulta por llamada. Es aceptable: solo se usa cuando la
// verificacion de propiedad ya fallo, o sea en el camino excepcional.
export const esAdmin = async (req: Request): Promise<boolean> => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", idDelUsuario(req))
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.rol === "admin";
};

// Deja pasar si el registro es suyo, o si es administrador.
//
// El orden importa: primero la propiedad, que es el caso normal y no cuesta
// nada extra. La consulta del rol solo se hace si el primero fallo.
export const puedeOperar = async (req: Request, esDueno: boolean): Promise<boolean> => {
  if (esDueno) return true;
  return await esAdmin(req);
};

// Corta el pedido si el que llama no es administrador.
//
// Se usa en las rutas exclusivas de admin. Responde 404 y no 403 para no
// revelarle a un usuario normal que esa ruta existe.
export const exigirAdmin = async (req: Request): Promise<void> => {
  if (!(await esAdmin(req))) {
    throw new ErrorHttp(404, "Ruta no encontrada");
  }
};
