const CLAVE_API = "voitos_api_url";

const resolverUrl = (): string => {
  const delBuild =
    process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  if (typeof window === "undefined") return delBuild;

  let deLaUrl: string | null = null;
  try {
    deLaUrl = new URLSearchParams(window.location.search).get("api");
  } catch {
  }

  if (deLaUrl !== null) {
    const limpia = deLaUrl.trim().replace(/\/$/, "");

    try {
      if (limpia) localStorage.setItem(CLAVE_API, limpia);
      else localStorage.removeItem(CLAVE_API);
    } catch {
    }

    if (limpia) return limpia;
    return delBuild;
  }

  try {
    const guardada = localStorage.getItem(CLAVE_API);
    if (guardada) return guardada;
  } catch {
  }

  return delBuild;
};

export const API_URL = resolverUrl();

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

  fecha_nacimiento?: string | null;

  verificado?: boolean;

  foto_url?: string | null;
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

  guardarUsuario(usuario: Usuario) {
    almacenamiento.set(CLAVE_USUARIO, JSON.stringify(usuario));
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

interface RespuestaApi<T> {
  success: boolean;
  data?: T;
  error?: unknown;
}

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

const TIMEOUT_MS = 10_000;

const TIMEOUT_DESPERTAR_MS = 45_000;

const esBackendRemoto = (url: string): boolean => {
  if (!/^https?:\/\//i.test(url)) return false;

  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return false;
  }

  const esLocal =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||

    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);

  return !esLocal;
};

let esperandoDespertar = 0;
const oyentesDespertar = new Set<() => void>();

const marcarDespertando = (activo: boolean) => {
  const antes = esperandoDespertar > 0;
  esperandoDespertar = Math.max(0, esperandoDespertar + (activo ? 1 : -1));

  if (antes !== esperandoDespertar > 0) {
    oyentesDespertar.forEach((oyente) => oyente());
  }
};

export const suscribirDespertar = (oyente: () => void): (() => void) => {
  oyentesDespertar.add(oyente);
  return () => {
    oyentesDespertar.delete(oyente);
  };
};

export const leerDespertar = (): boolean => esperandoDespertar > 0;
export const leerDespertarEnServidor = (): boolean => false;

const mensajeDeCaida = (
  porTimeout: boolean,
  remoto: boolean,
  yaReintento: boolean
): string => {
  if (!porTimeout) {
    return remoto
      ? `No se pudo conectar con el servidor. Fijate si tenes internet y proba de nuevo.`
      : `No se pudo conectar con el servidor (${API_URL}). Verifica que este levantado.`;
  }

  if (!remoto) {
    return (
      `El servidor (${API_URL}) no respondio en ${TIMEOUT_MS / 1000} segundos. ` +
      `Suele pasar cuando cambiaste de red y la IP quedo vieja: revisa EXPO_PUBLIC_API_URL.`
    );
  }

  const segundos = (TIMEOUT_MS + (yaReintento ? TIMEOUT_DESPERTAR_MS : 0)) / 1000;
  return (
    `El servidor no contesto en ${segundos} segundos. Suele estar dormido y tardar ` +
    `un rato en arrancar; esperá un minuto y proba de nuevo.`
  );
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

  if (API_URL.includes(".loca.lt")) {
    headers["bypass-tunnel-reminder"] = "1";
  }

  if (conToken) {
    const token = sesion.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const intentar = (espera: number): Promise<Response> => {
    const control = new AbortController();
    const corte = setTimeout(() => control.abort(), espera);

    return fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers,
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      signal: control.signal,
    }).finally(() => clearTimeout(corte));
  };

  const pedirConReintento = async (): Promise<Response> => {
    const remoto = esBackendRemoto(API_URL);

    try {
      return await intentar(TIMEOUT_MS);
    } catch (e: any) {
      const porTimeout = e?.name === "AbortError";

      if (!porTimeout || !remoto) {
        throw new ErrorApi(0, mensajeDeCaida(porTimeout, remoto, false));
      }

      marcarDespertando(true);
      try {
        return await intentar(TIMEOUT_DESPERTAR_MS);
      } catch (e2: any) {
        throw new ErrorApi(
          0,
          mensajeDeCaida(e2?.name === "AbortError", remoto, true)
        );
      } finally {
        marcarDespertando(false);
      }
    }
  };

  const respuesta = await pedirConReintento();

  let json: RespuestaApi<T>;
  try {
    json = await respuesta.json();
  } catch {
    throw new ErrorApi(respuesta.status, "El servidor respondio algo que no es JSON");
  }

  if (!respuesta.ok || !json.success) {
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

  postPublico: <T>(ruta: string, cuerpo?: unknown) =>
    pedir<T>(ruta, { metodo: "POST", cuerpo, conToken: false }),
};
