// Funciones de dominio de Voitos. Cada pantalla llama a estas y no arma URLs
// a mano, asi los endpoints quedan en un solo lugar.

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

export const cerrarSesion = () => sesion.cerrar();

export interface Pastilla {
  id: string;
  usuario_id: string;
  nombre: string;
  tipo?: string;
  caracteristicas?: string;
}

export const getPastillas = () => {
  const usuario = sesion.getUsuario();
  const filtro = usuario ? `?usuario_id=${usuario.id}` : "";
  return api.get<Pastilla[]>(`/api/pastillas${filtro}`);
};

export const crearPastilla = (datos: { nombre: string; tipo?: string; caracteristicas?: string }) => {
  const usuario = sesion.getUsuario();
  if (!usuario) throw new Error("No hay sesion iniciada");
  return api.post<Pastilla>("/api/pastillas", { ...datos, usuario_id: usuario.id });
};

export const borrarPastilla = (id: string) => api.delete(`/api/pastillas/${id}`);

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
}) => api.post<Horario>("/api/horarios", datos);

export const borrarHorario = (id: string) => api.delete(`/api/horarios/${id}`);

// Letra de dia de la semana -> numero que devuelve Date.getDay()
const DIAS: Record<string, number> = { D: 0, L: 1, M: 2, X: 3, J: 4, V: 5, S: 6 };

// Cuantas semanas hacia adelante se agenda una rutina. La tabla horarios
// guarda fechas concretas, no reglas de repeticion, asi que hay que generar
// una fila por cada dia que corresponda.
const SEMANAS_A_AGENDAR = 4;

const aFechaISO = (d: Date) => d.toISOString().split("T")[0];

export const fechasDeLosProximos = (letrasDeDias: string[]): string[] => {
  const buscados = letrasDeDias.map((l) => DIAS[l]).filter((n) => n !== undefined);
  if (!buscados.length) return [];

  const fechas: string[] = [];
  const hoy = new Date();

  for (let i = 0; i < SEMANAS_A_AGENDAR * 7; i++) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    if (buscados.includes(d.getDay())) fechas.push(aFechaISO(d));
  }

  return fechas;
};

// Agenda una pastilla por nombre. El formulario pide el nombre escrito a mano,
// asi que hay que resolverlo contra las pastillas que ya tiene el usuario.
export const agendarPastilla = async (datos: {
  nombrePastilla: string;
  hora: string; // "HH:MM"
  cantidad: number;
  dias: string[]; // ["L","X","V"], vacio = solo hoy
}) => {
  const pastillas = await getPastillas();
  const buscada = datos.nombrePastilla.trim().toLowerCase();
  const pastilla = pastillas.find((p) => p.nombre.trim().toLowerCase() === buscada);

  if (!pastilla) {
    throw new Error(
      `No tenes ninguna pastilla que se llame "${datos.nombrePastilla}". Agregala primero desde AGREGAR.`
    );
  }

  const [horaTexto, minutoTexto] = datos.hora.split(":");
  const hora = Number(horaTexto);
  const minuto = Number(minutoTexto);

  if (Number.isNaN(hora) || Number.isNaN(minuto)) {
    throw new Error("La hora tiene que tener formato HH:MM");
  }

  const fechas = datos.dias.length ? fechasDeLosProximos(datos.dias) : [aFechaISO(new Date())];

  for (const dia of fechas) {
    await crearHorario({
      pastilla_id: pastilla.id,
      dia,
      hora,
      minuto,
      cantidad: datos.cantidad,
    });
  }

  return fechas.length;
};

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
}) => {
  const usuario = sesion.getUsuario();
  if (!usuario) throw new Error("No hay sesion iniciada");
  return api.post<Actividad>("/api/actividades", { ...datos, usuario_id: usuario.id });
};

export const borrarActividad = (id: string) => api.delete(`/api/actividades/${id}`);
