import type { Href } from "expo-router";
import { api, sesion, Usuario } from "./api";

interface Sesion {
  token: string;
  expira_en: number;
  usuario: Usuario | null;
}

export const registrarse = async (datos: {
  nombre: string;
  apellido: string;
  mail: string;
  password: string;

  fecha_nacimiento?: string;
}): Promise<Usuario | null> => {
  const r = await api.postPublico<Sesion>("/api/auth/registro", datos);
  sesion.guardar(r.token, r.usuario);
  return r.usuario;
};

export const iniciarSesion = async (mail: string, password: string): Promise<Usuario | null> => {
  const r = await api.postPublico<Sesion>("/api/auth/login", { mail, password });
  sesion.guardar(r.token, r.usuario);
  return r.usuario;
};

export const iniciarSesionConGoogle = async (idToken: string): Promise<Usuario | null> => {
  const r = await api.postPublico<Sesion>("/api/auth/google", { id_token: idToken });
  sesion.guardar(r.token, r.usuario);
  return r.usuario;
};

export const pedirRecuperacion = (mail: string) =>
  api.postPublico<{ mensaje: string }>("/api/auth/recuperar", { mail });

export const confirmarRecuperacion = async (
  token: string,
  password: string
): Promise<Usuario | null> => {
  const r = await api.postPublico<Sesion>("/api/auth/recuperar/confirmar", { token, password });
  sesion.guardar(r.token, r.usuario);
  return r.usuario;
};

export const cerrarSesion = () => sesion.cerrar();

export const cambiarFechaNacimiento = async (iso: string): Promise<Usuario> => {
  const actual = sesion.getUsuario();
  if (!actual) throw new Error("No hay sesion iniciada");

  const usuario = await api.put<Usuario>(`/api/usuarios/${actual.id}`, {
    fecha_nacimiento: iso,
  });

  sesion.guardarUsuario(usuario);
  return usuario;
};

export const cambiarNombre = async (nombre: string, apellido: string): Promise<Usuario> => {
  const actual = sesion.getUsuario();
  if (!actual) throw new Error("No hay sesion iniciada");

  const usuario = await api.put<Usuario>(`/api/usuarios/${actual.id}`, { nombre, apellido });
  sesion.guardarUsuario(usuario);
  return usuario;
};

export const subirFoto = async (imagen: string): Promise<Usuario> => {
  const usuario = await api.post<Usuario>("/api/usuarios/yo/foto", { imagen });
  sesion.guardarUsuario(usuario);
  return usuario;
};

export const quitarFoto = async (): Promise<Usuario> => {
  const usuario = await api.delete<Usuario>("/api/usuarios/yo/foto");
  sesion.guardarUsuario(usuario);
  return usuario;
};

export const cambiarPassword = async (actual: string, nueva: string) => {
  const usuario = sesion.getUsuario();
  if (!usuario) throw new Error("No hay sesion iniciada");

  await api.post("/api/auth/cambiar-password", { actual, nueva });
  await iniciarSesion(usuario.mail, nueva);
};

export const borrarMiCuenta = () => {
  const usuario = sesion.getUsuario();
  if (!usuario) throw new Error("No hay sesion iniciada");
  return api.delete<{ message: string }>(`/api/usuarios/${usuario.id}`);
};

export const refrescarUsuario = async (): Promise<Usuario | null> => {
  const usuario = await api.get<Usuario>("/api/auth/yo");
  const token = sesion.getToken();
  if (token) sesion.guardar(token, usuario);
  return usuario;
};

export const getUsuarioActual = (): Usuario | null => sesion.getUsuario();

export const reenviarVerificacion = () =>
  api.post<{ mail: string }>("/api/auth/reenviar-verificacion");

export interface UsuarioAdmin extends Usuario {
  rol: "cuidador" | "admin";
  verificado: boolean;
  pastillas: number;

  listaPastillas?: { id: string; nombre: string }[];
  horarios: number;
  created_at: string;
}

export const soyAdmin = () =>
  api.get<{ admin: boolean; id: string }>("/api/admin/soy-admin");

export const getUsuariosAdmin = () => api.get<UsuarioAdmin[]>("/api/admin/usuarios");

export const verificarUsuario = (id: string) =>
  api.post<Usuario>(`/api/admin/usuarios/${id}/verificar`);

export const desverificarUsuario = (id: string) =>
  api.post<Usuario>(`/api/admin/usuarios/${id}/desverificar`);

export const getPastillasDe = (id: string) =>
  api.get<Pastilla[]>(`/api/admin/usuarios/${id}/pastillas`);

export interface DosisDeTodos {
  id: string;
  dia: string;
  hora: number;
  minuto: number;
  cantidad: number;
  dispensado: boolean;
  pastilla: { id: string; nombre: string; tipo?: string } | null;
  usuario: { id: string; nombre: string; apellido: string; mail: string } | null;
}

export const getCalendarioCompleto = (desde: string, hasta: string) =>
  api.get<DosisDeTodos[]>(`/api/admin/calendario?desde=${desde}&hasta=${hasta}`);

export const vaciarCalendarioDe = (id: string) =>
  api.delete<{ borradas: number }>(`/api/admin/usuarios/${id}/calendario`);

export interface CuentaBorrada {
  nombre: string;
  apellido: string;
  mail: string;
  pastillas: number;
  dispensaciones: number;
}

export const borrarUsuario = (id: string) =>
  api.delete<CuentaBorrada>(`/api/admin/usuarios/${id}`);

export interface Modulo {
  id: string;
  numero: number;
  nombre: string;
  cantidad_actual: number;
}

export interface Pastilla {
  id: string;
  usuario_id: string;
  nombre: string;
  tipo?: string;
  modulo?: Modulo | null;
}

export const getPastillas = () => {
  const usuario = sesion.getUsuario();
  const filtro = usuario ? `?usuario_id=${usuario.id}` : "";
  return api.get<Pastilla[]>(`/api/pastillas${filtro}`);
};

export const crearPastilla = (datos: {
  nombre: string;
  tipo?: string;
  cantidad_inicial?: number;
  modulo_numero?: number;
}) => {
  const usuario = sesion.getUsuario();
  if (!usuario) throw new Error("No hay sesion iniciada");
  return api.post<Pastilla>("/api/pastillas", { ...datos, usuario_id: usuario.id });
};

export const ajustarStock = (pastillaId: string, delta: number) =>
  api.patch<Modulo>(`/api/pastillas/${pastillaId}/stock`, { delta });

export const borrarPastilla = (id: string) => api.delete(`/api/pastillas/${id}`);

export const cancelarRutina = (
  pastillaId: string,
  filtros: { hora?: number; minuto?: number; desde?: string; hasta?: string } = {}
) => {
  const params = new URLSearchParams();
  if (filtros.hora !== undefined) params.set("hora", String(filtros.hora));
  if (filtros.minuto !== undefined) params.set("minuto", String(filtros.minuto));
  if (filtros.desde) params.set("desde", filtros.desde);
  if (filtros.hasta) params.set("hasta", filtros.hasta);

  const query = params.toString();
  return api.delete<{ canceladas: number }>(
    `/api/pastillas/${pastillaId}/horarios${query ? `?${query}` : ""}`
  );
};

export interface Horario {
  id: string;
  pastilla_id: string;
  dia: string;
  hora: number;
  minuto: number;
  cantidad: number;
  dispensado: boolean;
  pastillas?: { id: string; nombre: string; tipo?: string };
}

export const getHorariosDelDia = (fecha: string) =>
  api.get<Horario[]>(`/api/horarios/dia/${fecha}`);

export const crearHorario = (datos: {
  pastilla_id: string;
  dia: string;
  hora: number;
  minuto: number;
  cantidad?: number;
  recordatorio_min?: number | null;
}) => api.post<Horario>("/api/horarios", datos);

export const borrarHorario = (id: string) => api.delete(`/api/horarios/${id}`);

const DIAS: Record<string, number> = { D: 0, L: 1, M: 2, X: 3, J: 4, V: 5, S: 6 };

const aFechaISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

export const fechasDeLaRutina = (
  letrasDeDias: string[],
  semanas: number,
  hora?: number,
  minuto?: number
): string[] => {
  const buscados = letrasDeDias.map((l) => DIAS[l]).filter((n) => n !== undefined);
  if (!buscados.length) return [];

  const ahora = new Date();

  const yaPasoLaHora =
    hora !== undefined &&
    (ahora.getHours() > hora ||
      (ahora.getHours() === hora && ahora.getMinutes() >= (minuto ?? 0)));

  let inicio = 0;
  while (inicio < 14) {
    const d = new Date(ahora);
    d.setDate(ahora.getDate() + inicio);
    const sirve = buscados.includes(d.getDay()) && !(inicio === 0 && yaPasoLaHora);
    if (sirve) break;
    inicio++;
  }

  const fechas: string[] = [];

  for (let i = inicio; i < inicio + semanas * 7; i++) {
    const d = new Date(ahora);
    d.setDate(ahora.getDate() + i);
    if (buscados.includes(d.getDay())) fechas.push(aFechaISO(d));
  }

  return fechas;
};

export interface AnalisisDeStock {
  alcanza: boolean;
  totalDosis: number;
  totalPastillas: number;
  stock: number;

  dosisCubiertas: number;

  semanasCubiertas: number;

  faltan: number;
}

export const analizarStock = (datos: {
  fechas: string[];
  cantidadPorDosis: number;
  stock: number;
}): AnalisisDeStock => {
  const { fechas, cantidadPorDosis, stock } = datos;

  const totalDosis = fechas.length;
  const totalPastillas = totalDosis * cantidadPorDosis;
  const dosisCubiertas = Math.min(totalDosis, Math.floor(stock / cantidadPorDosis));

  let semanasCubiertas = 0;
  if (dosisCubiertas > 0) {
    const inicio = new Date(fechas[0]);
    const ultima = new Date(fechas[dosisCubiertas - 1]);
    const dias = Math.round((ultima.getTime() - inicio.getTime()) / 86_400_000);
    semanasCubiertas = Math.floor(dias / 7) + 1;
  }

  return {
    alcanza: stock >= totalPastillas,
    totalDosis,
    totalPastillas,
    stock,
    dosisCubiertas,
    semanasCubiertas,
    faltan: Math.max(0, totalPastillas - stock),
  };
};

export const agendarPastilla = async (datos: {
  pastilla_id: string;
  hora: string;
  cantidad: number;
  dias: string[];
  semanas: number;
  recordatorio_min: number | null;
}) => {
  const [horaTexto, minutoTexto] = datos.hora.split(":");
  const hora = Number(horaTexto);
  const minuto = Number(minutoTexto);

  if (Number.isNaN(hora) || Number.isNaN(minuto)) {
    throw new Error("La hora tiene que tener formato HH:MM");
  }

  const fechas = fechasDeLaRutina(datos.dias, datos.semanas, hora, minuto);

  if (!fechas.length) {
    throw new Error(
      "No quedo ninguna fecha para agendar. Elegi al menos un dia de la semana."
    );
  }

  for (const dia of fechas) {
    await crearHorario({
      pastilla_id: datos.pastilla_id,
      dia,
      hora,
      minuto,
      cantidad: datos.cantidad,
      recordatorio_min: datos.recordatorio_min,
    });
  }

  return fechas.length;
};

export const getHorariosDelUsuario = () => {
  const usuario = sesion.getUsuario();
  const filtro = usuario ? `?usuario_id=${usuario.id}` : "";
  return api.get<Horario[]>(`/api/horarios${filtro}`);
};

export interface ResultadoDispensar {
  enviado: boolean;
  destino: string;
  respuesta_dispositivo: string;
  horario_id: string | null;
  cantidad: number;
}

export const dispensarAhora = (datos: {
  cantidad?: number;
  destino?: string;
  horario_id?: string;
}) => api.post<ResultadoDispensar>("/api/sensor/dispensar", datos);

export interface Actividad {
  id: string;
  usuario_id: string;
  nombre: string;
  fecha: string;
  hora: string;
  tipo: "rutina" | "una-vez";
  dias?: string[];
}

export const getActividades = () => {
  const usuario = sesion.getUsuario();
  const filtro = usuario ? `?usuario_id=${usuario.id}` : "";
  return api.get<Actividad[]>(`/api/actividades${filtro}`);
};

export const crearActividad = (datos: {
  nombre: string;
  fecha: string;
  hora: string;
  tipo: "rutina" | "una-vez";
  dias?: string[];
  recordatorio_min?: number | null;
}) => {
  const usuario = sesion.getUsuario();
  if (!usuario) throw new Error("No hay sesion iniciada");
  return api.post<Actividad>("/api/actividades", { ...datos, usuario_id: usuario.id });
};

export const borrarActividad = (id: string) => api.delete(`/api/actividades/${id}`);

export interface PastilleroVinculado {
  dispositivo_id: string;
  vinculado_at: string;
}

export const getMisPastilleros = () => api.get<PastilleroVinculado[]>("/api/pastilleros");

export const vincularPastillero = (codigo: string) =>
  api.post<PastilleroVinculado>("/api/pastilleros/vincular", { codigo });

export const desvincularPastillero = (dispositivoId: string) =>
  api.delete(`/api/pastilleros/${encodeURIComponent(dispositivoId)}`);

export const destinoAlEntrar = async (): Promise<Href> => {
  const mios = await getMisPastilleros().catch(() => null);
  return mios && mios.length === 0
    ? { pathname: "/mi-pastillero", params: { primera: "1" } }
    : "/home";
};
