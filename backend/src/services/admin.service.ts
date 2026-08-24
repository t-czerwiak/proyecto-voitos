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

// Todas las dosis de TODOS los usuarios, con el dueno pegado.
//
// Es la unica consulta del panel que no se filtra por persona: existe
// justamente para ver el conjunto. Por eso vive aca y no en horarios.service,
// que siempre filtra por el dueno del token.
//
// El rango es opcional pero la app siempre lo manda, con el mes que esta
// mirando. Sin rango esto crece sin techo a medida que se agendan dosis.
export const getCalendarioCompleto = async (desde?: string, hasta?: string) => {
  let consulta = supabase
    .from("horarios")
    .select(
      `id, dia, hora, minuto, cantidad, dispensado, notificado, senal_enviada,
       pastillas!inner (
         id, nombre, tipo,
         usuarios!inner ( id, nombre, apellido, mail )
       )`
    );

  if (desde) consulta = consulta.gte("dia", desde);
  if (hasta) consulta = consulta.lte("dia", hasta);

  const { data, error } = await consulta
    .order("dia", { ascending: true })
    .order("hora", { ascending: true })
    .order("minuto", { ascending: true });

  if (error) throw new Error(error.message);

  // Se aplana aca y no en la pantalla: la forma anidada que devuelve PostgREST
  // es un detalle de como se consulta, no algo que la app tenga que conocer.
  return (data ?? []).map((h: any) => {
    const { pastillas, ...horario } = h;
    const duenio = pastillas?.usuarios;

    return {
      ...horario,
      pastilla: { id: pastillas?.id, nombre: pastillas?.nombre, tipo: pastillas?.tipo },
      usuario: duenio
        ? { id: duenio.id, nombre: duenio.nombre, apellido: duenio.apellido, mail: duenio.mail }
        : null,
    };
  });
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

// Borra una cuenta entera: el perfil y la cuenta de Supabase Auth.
//
// El perfil arrastra por FK en cascada las pastillas, y con ellas los horarios y
// las dispensaciones, mas los contactos de emergencia y las actividades. Los
// modulos NO se borran: la FK hacia pastillas es SET NULL, que es lo correcto
// porque el modulo es una pieza fisica del pastillero y sigue existiendo aunque
// la persona se vaya. Queda vacio y listo para reasignar.
//
// Se borran los dos lados. Si quedara solo la cuenta de Auth, esa persona
// podria seguir logueandose y la app no encontraria su perfil.
export const borrarUsuario = async (id: string) => {
  const { data: usuario, error: errorLectura } = await supabase
    .from("usuarios")
    .select("id, nombre, apellido, mail")
    .eq("id", id)
    .maybeSingle();

  if (errorLectura) throw new Error(errorLectura.message);
  if (!usuario) return null;

  // Cuanto se esta por borrar, para poder informarlo
  const [pastillas, dispensaciones] = await Promise.all([
    supabase.from("pastillas").select("id", { count: "exact", head: true }).eq("usuario_id", id),
    supabase.from("dispensaciones").select("id", { count: "exact", head: true }).eq("usuario_id", id),
  ]);

  const { error } = await supabase.from("usuarios").delete().eq("id", id);
  if (error) throw new Error(error.message);

  // Si esto falla, el perfil ya no existe y la cuenta de Auth queda huerfana:
  // puede loguearse pero no tiene datos. Se loguea para poder limpiarla a mano.
  const { error: errorAuth } = await supabase.auth.admin.deleteUser(id);
  if (errorAuth) {
    console.error(`Se borro el perfil de ${usuario.mail} pero no su cuenta de Auth:`, errorAuth.message);
  }

  return {
    ...usuario,
    pastillas: pastillas.count ?? 0,
    dispensaciones: dispensaciones.count ?? 0,
    authBorrada: !errorAuth,
  };
};
