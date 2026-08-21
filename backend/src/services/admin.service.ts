import { supabase } from "../config/supabase";

// Operaciones exclusivas del administrador.
//
// Viven aparte de los servicios normales a proposito: los de siempre filtran
// por dueño y no deben tener forma de saltearse ese filtro. Todo lo que ignora
// la propiedad esta aca, en un solo archivo facil de auditar.

// Todos los usuarios con lo que hace falta para administrarlos.
//
// Sin token_verificacion: el admin puede verificar una cuenta con el endpoint
// de abajo, no necesita el token, y filtrarlo permitiria hacerse pasar por el
// dueño de esa casilla.
export const getUsuarios = async () => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, apellido, mail, edad, verificado, rol, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  // Cuantos datos tiene cada uno, para saber a quien se estaria borrando algo
  const conResumen = await Promise.all(
    (data ?? []).map(async (u) => {
      const [pastillas, horarios] = await Promise.all([
        supabase.from("pastillas").select("id", { count: "exact", head: true }).eq("usuario_id", u.id),
        supabase
          .from("horarios")
          .select("id, pastillas!inner(usuario_id)", { count: "exact", head: true })
          .eq("pastillas.usuario_id", u.id),
      ]);

      return {
        ...u,
        pastillas: pastillas.count ?? 0,
        horarios: horarios.count ?? 0,
      };
    })
  );

  return conResumen;
};

// Marca una cuenta como verificada sin pasar por el mail.
//
// Sirve cuando el mail no llego, cayo en spam o el enlace vencio. Se limpia el
// token para que no quede uno viejo dando vueltas que todavia funcione.
export const verificarUsuario = async (id: string) => {
  const { data, error } = await supabase
    .from("usuarios")
    .update({ verificado: true, token_verificacion: null, token_expira: null })
    .eq("id", id)
    .select("id, nombre, mail, verificado")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

// Vuelve a marcar una cuenta como no verificada. Es la contraparte de la
// anterior: sin esto, un error no se puede deshacer.
export const desverificarUsuario = async (id: string) => {
  const { data, error } = await supabase
    .from("usuarios")
    .update({ verificado: false })
    .eq("id", id)
    .select("id, nombre, mail, verificado")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
};

// Las pastillas de cualquier usuario, con su modulo y su stock.
export const getPastillasDe = async (usuario_id: string) => {
  const { data, error } = await supabase
    .from("pastillas")
    .select("*, modulos(id, numero, cantidad_actual)")
    .eq("usuario_id", usuario_id);

  if (error) throw new Error(error.message);

  return (data ?? []).map((fila: any) => {
    const { modulos, ...pastilla } = fila;
    return { ...pastilla, modulo: modulos?.[0] ?? null };
  });
};

// Las dosis de cualquier usuario.
export const getHorariosDe = async (usuario_id: string) => {
  const { data, error } = await supabase
    .from("horarios")
    .select("*, pastillas!inner(id, nombre, tipo, usuario_id)")
    .eq("pastillas.usuario_id", usuario_id)
    .order("dia", { ascending: true })
    .order("hora", { ascending: true })
    .order("minuto", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

// Borra TODAS las dosis pendientes de un usuario, de todas sus pastillas.
//
// Las ya dispensadas no se tocan: son el historial de lo que salio del
// pastillero, y ademas borrarlas se llevaria las filas de dispensaciones.
export const vaciarCalendarioDe = async (usuario_id: string) => {
  const { data: pastillas, error: errorPastillas } = await supabase
    .from("pastillas")
    .select("id")
    .eq("usuario_id", usuario_id);

  if (errorPastillas) throw new Error(errorPastillas.message);

  const ids = (pastillas ?? []).map((p) => p.id);
  if (ids.length === 0) return { borradas: 0 };

  const { data, error } = await supabase
    .from("horarios")
    .delete()
    .in("pastilla_id", ids)
    .eq("dispensado", false)
    .select("id");

  if (error) throw new Error(error.message);
  return { borradas: data?.length ?? 0 };
};

// La casilla de un usuario, para el envio de prueba.
export const mailDe = async (id: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("mail")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.mail ?? null;
};
