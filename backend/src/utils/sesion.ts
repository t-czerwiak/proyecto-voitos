import { Request } from "express";
import { ErrorHttp } from "./errores";

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
