// Cliente HTTP contra el backend de Voitos.
//
// La URL sale de EXPO_PUBLIC_API_URL para que la misma app sirva en desarrollo
// (localhost) y en produccion (el backend desplegado). Las variables con el
// prefijo EXPO_PUBLIC_ son las unicas que Expo mete en el bundle del cliente.

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

// El token del usuario logueado. Se guarda en memoria y, en web, tambien en
// localStorage para que sobreviva a un refresh de la pagina.
let tokenEnMemoria: string | null = null;

const CLAVE_TOKEN = "voitos_token";
const CLAVE_USUARIO = "voitos_usuario";

const almacenamiento = {
  get(clave: string): string | null {
    if (typeof localStorage === "undefined") return null;
    return localStorage.getItem(clave);
  },
  set(clave: string, valor: string) {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(clave, valor);
  },
  borrar(clave: string) {
    if (typeof localStorage === "undefined") return;
    localStorage.removeItem(clave);
  },
};

export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  mail: string;
  edad?: number;
}

export const sesion = {
  getToken(): string | null {
    return tokenEnMemoria ?? almacenamiento.get(CLAVE_TOKEN);
  },

  getUsuario(): Usuario | null {
    const crudo = almacenamiento.get(CLAVE_USUARIO);
    if (!crudo) return null;
    try {
      return JSON.parse(crudo) as Usuario;
    } catch {
      return null;
    }
  },

  guardar(token: string, usuario: Usuario | null) {
    tokenEnMemoria = token;
    almacenamiento.set(CLAVE_TOKEN, token);
    if (usuario) almacenamiento.set(CLAVE_USUARIO, JSON.stringify(usuario));
  },

  cerrar() {
    tokenEnMemoria = null;
    almacenamiento.borrar(CLAVE_TOKEN);
    almacenamiento.borrar(CLAVE_USUARIO);
  },

  hayUsuario(): boolean {
    return Boolean(this.getToken());
  },
};

// El backend siempre responde { success, data } o { success, error }.
interface RespuestaApi<T> {
  success: boolean;
  data?: T;
  error?: unknown;
}

// Los errores de validacion de Zod vienen como objeto por campo, no como
// string. Esto los aplana a un mensaje que se pueda mostrar en pantalla.
const mensajeDeError = (error: unknown): string => {
  if (typeof error === "string") return error;

  if (error && typeof error === "object") {
    const porCampo = (error as any).fieldErrors;
    if (porCampo) {
      const primeros = Object.values(porCampo).flat().filter(Boolean);
      if (primeros.length) return String(primeros[0]);
    }
  }

  return "No se pudo completar la operacion";
};

export class ErrorApi extends Error {
  constructor(public readonly status: number, mensaje: string) {
    super(mensaje);
    this.name = "ErrorApi";
  }
}

const pedir = async <T>(
  ruta: string,
  opciones: { metodo?: string; cuerpo?: unknown; conToken?: boolean } = {}
): Promise<T> => {
  const { metodo = "GET", cuerpo, conToken = true } = opciones;

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (conToken) {
    const token = sesion.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    // fetch solo tira excepcion si no llego a conectar
    throw new ErrorApi(
      0,
      `No se pudo conectar con el servidor (${API_URL}). Verifica que este levantado.`
    );
  }

  let json: RespuestaApi<T>;
  try {
    json = await respuesta.json();
  } catch {
    throw new ErrorApi(respuesta.status, "El servidor respondio algo que no es JSON");
  }

  if (!respuesta.ok || !json.success) {
    // 401 = el token vencio o no sirve: se limpia la sesion
    if (respuesta.status === 401) sesion.cerrar();
    throw new ErrorApi(respuesta.status, mensajeDeError(json.error));
  }

  return json.data as T;
};

export const api = {
  get: <T>(ruta: string) => pedir<T>(ruta),
  post: <T>(ruta: string, cuerpo?: unknown) => pedir<T>(ruta, { metodo: "POST", cuerpo }),
  put: <T>(ruta: string, cuerpo?: unknown) => pedir<T>(ruta, { metodo: "PUT", cuerpo }),
  patch: <T>(ruta: string, cuerpo?: unknown) => pedir<T>(ruta, { metodo: "PATCH", cuerpo }),
  delete: <T>(ruta: string) => pedir<T>(ruta, { metodo: "DELETE" }),

  // Login y registro son los unicos que no mandan token: son los que lo emiten
  postPublico: <T>(ruta: string, cuerpo?: unknown) =>
    pedir<T>(ruta, { metodo: "POST", cuerpo, conToken: false }),
};
