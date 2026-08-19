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

// El modulo fisico donde esta cargada la pastilla. Es de donde sale el stock:
// pastillas no tiene cantidad, la tiene el modulo.
export interface Modulo {
  id: string;
  numero: number;
  cantidad_actual: number;
}

export interface Pastilla {
  id: string;
  usuario_id: string;
  nombre: string;
  tipo?: string;
  caracteristicas?: string;
  modulo?: Modulo | null;
}

export const getPastillas = () => {
  const usuario = sesion.getUsuario();
  const filtro = usuario ? `?usuario_id=${usuario.id}` : "";
  return api.get<Pastilla[]>(`/api/pastillas${filtro}`);
};

// cantidad_inicial son las pastillas que se cargan fisicamente en el modulo.
// Antes este numero terminaba dentro del texto de "caracteristicas", asi que
// la pastilla quedaba sin modulo y no se podia dispensar ni descontar.
export const crearPastilla = (datos: {
  nombre: string;
  tipo?: string;
  caracteristicas?: string;
  cantidad_inicial?: number;
  modulo_numero?: number;
}) => {
  const usuario = sesion.getUsuario();
  if (!usuario) throw new Error("No hay sesion iniciada");
  return api.post<Pastilla>("/api/pastillas", { ...datos, usuario_id: usuario.id });
};

// Suma o resta pastillas del modulo. El delta va con signo: +10 al recargar,
// -3 para corregir un conteo mal anotado.
export const ajustarStock = (pastillaId: string, delta: number) =>
  api.patch<Modulo>(`/api/pastillas/${pastillaId}/stock`, { delta });

// Borra la pastilla entera. Las FK de la base estan en CASCADE, asi que se
// lleva sus horarios y dispensaciones; el modulo queda libre, no se borra.
export const borrarPastilla = (id: string) => api.delete(`/api/pastillas/${id}`);

// Cancela una rutina sin borrar la pastilla: saca las dosis que todavia no
// salieron y conserva el historial de las ya dispensadas.
//
// Los filtros importan: una pastilla puede tener varias rutinas a la vez (la
// misma a las 8 y a las 20). Sin hora y minuto, cancelar una se llevaria
// puestas las otras.
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
}) => api.post<Horario>("/api/horarios", datos);

export const borrarHorario = (id: string) => api.delete(`/api/horarios/${id}`);

// Letra de dia de la semana -> numero que devuelve Date.getDay()
const DIAS: Record<string, number> = { D: 0, L: 1, M: 2, X: 3, J: 4, V: 5, S: 6 };

// A "YYYY-MM-DD" en hora LOCAL, no UTC.
//
// toISOString() convierte a UTC, asi que en Argentina (UTC-3) desde las 21:00
// devolvia la fecha del dia siguiente. Una dosis agendada de noche se guardaba
// para manana y no aparecia en el calendario del dia correcto.
const aFechaISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

// Fechas concretas de una rutina.
//
// La tabla horarios guarda fechas, no reglas de repeticion, asi que una rutina
// "lunes y viernes por 6 semanas" se materializa como una fila por dia. Por eso
// la duracion hay que pedirla: sin un limite no se sabe cuantas filas crear.
export const fechasDeLaRutina = (
  letrasDeDias: string[],
  semanas: number,
  hora?: number,
  minuto?: number
): string[] => {
  const buscados = letrasDeDias.map((l) => DIAS[l]).filter((n) => n !== undefined);
  if (!buscados.length) return [];

  const ahora = new Date();

  // Si hoy es uno de los dias elegidos pero la hora ya paso, la primera dosis
  // no puede ser hoy: agendarla seria crear una dosis vencida, que el
  // scheduler nunca va a disparar y que el cuidador ve como "no tomada".
  const yaPasoLaHora =
    hora !== undefined &&
    (ahora.getHours() > hora ||
      (ahora.getHours() === hora && ahora.getMinutes() >= (minuto ?? 0)));

  // Se busca el primer dia valido y recien desde ahi se cuentan las semanas.
  // Contarlas desde hoy hacia adelante hacia que, al saltear el dia de hoy,
  // una rutina de una semana quedara sin ninguna dosis.
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
  // Cuantas dosis completas cubre el stock actual
  dosisCubiertas: number;
  // Hasta que semana de la rutina llega sin recargar (1 = la primera)
  semanasCubiertas: number;
  // Cuantas faltan para completar la rutina entera
  faltan: number;
}

// Cuenta si el stock del modulo aguanta toda la rutina, y si no, hasta donde
// llega. Se calcula antes de crear nada: avisar despues de agendar 24 dosis no
// le sirve a nadie.
export const analizarStock = (datos: {
  fechas: string[];
  cantidadPorDosis: number;
  stock: number;
}): AnalisisDeStock => {
  const { fechas, cantidadPorDosis, stock } = datos;

  const totalDosis = fechas.length;
  const totalPastillas = totalDosis * cantidadPorDosis;
  const dosisCubiertas = Math.min(totalDosis, Math.floor(stock / cantidadPorDosis));

  // En que semana cae la ultima dosis que el stock cubre. Se mide contra la
  // primera fecha de la rutina y no contra hoy, porque la rutina puede
  // arrancar en unos dias si hoy no es ninguno de los dias elegidos.
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

// Agenda una rutina completa: una fila de horarios por cada dia que toca.
//
// Recibe el id de la pastilla y no el nombre porque ahora la pantalla usa un
// desplegable con las pastillas que ya existen. Antes se escribia el nombre a
// mano y habia que resolverlo contra la lista, que fallaba con un typo.
export const agendarPastilla = async (datos: {
  pastilla_id: string;
  hora: string; // "HH:MM"
  cantidad: number;
  dias: string[]; // ["L","X","V"], vacio = solo hoy
  semanas: number;
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
    });
  }

  return fechas.length;
};

// Todas las dosis del usuario, para que el calendario pueda marcar los dias.
export const getHorariosDelUsuario = () => {
  const usuario = sesion.getUsuario();
  const filtro = usuario ? `?usuario_id=${usuario.id}` : "";
  return api.get<Horario[]>(`/api/horarios${filtro}`);
};

// Le pide al backend que le mande la senal de dispensar al pastillero ahora
// mismo. Es la ruta publica del sensor: el backend inicia la conexion contra
// la ESP32 por la red local.
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
}) => {
  const usuario = sesion.getUsuario();
  if (!usuario) throw new Error("No hay sesion iniciada");
  return api.post<Actividad>("/api/actividades", { ...datos, usuario_id: usuario.id });
};

export const borrarActividad = (id: string) => api.delete(`/api/actividades/${id}`);
