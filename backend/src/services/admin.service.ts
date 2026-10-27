import { supabase } from "../config/supabase";

export const getUsuarios = async () => {
  const { data, error } = await supabase
    .from("usuarios")
    .select(
      "id, nombre, apellido, mail, fecha_nacimiento, verificado, rol, foto_url, created_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const { data: todasLasPastillas, error: errorPastillas } = await supabase
    .from("pastillas")
    .select("id, nombre, usuario_id")
    .order("nombre", { ascending: true });

  if (errorPastillas) throw new Error(errorPastillas.message);

  const pastillasPorUsuario = new Map<string, { id: string; nombre: string }[]>();
  for (const p of todasLasPastillas ?? []) {
    const suyas = pastillasPorUsuario.get(p.usuario_id) ?? [];
    suyas.push({ id: p.id, nombre: p.nombre });
    pastillasPorUsuario.set(p.usuario_id, suyas);
  }

  const conResumen = await Promise.all(
    (data ?? []).map(async (u) => {
      const { count } = await supabase
        .from("horarios")
        .select("id, pastillas!inner(usuario_id)", { count: "exact", head: true })
        .eq("pastillas.usuario_id", u.id);

      const susPastillas = pastillasPorUsuario.get(u.id) ?? [];

      return {
        ...u,
        pastillas: susPastillas.length,
        listaPastillas: susPastillas,
        horarios: count ?? 0,
      };
    })
  );

  return conResumen;
};

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

export const mailDe = async (id: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from("usuarios")
    .select("mail")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.mail ?? null;
};

export const borrarUsuario = async (id: string) => {
  const { data: usuario, error: errorLectura } = await supabase
    .from("usuarios")
    .select("id, nombre, apellido, mail")
    .eq("id", id)
    .maybeSingle();

  if (errorLectura) throw new Error(errorLectura.message);
  if (!usuario) return null;

  const [pastillas, dispensaciones] = await Promise.all([
    supabase.from("pastillas").select("id", { count: "exact", head: true }).eq("usuario_id", id),
    supabase.from("dispensaciones").select("id", { count: "exact", head: true }).eq("usuario_id", id),
  ]);

  const { error } = await supabase.from("usuarios").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await supabase.storage.from("avatares").remove([`${id}.jpg`]);

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
