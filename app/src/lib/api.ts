// Cliente HTTP contra el backend de Voitos.
//
// La URL sale de EXPO_PUBLIC_API_URL para que la misma app sirva en desarrollo
// (localhost) y en produccion (el backend desplegado). Las variables con el
// prefijo EXPO_PUBLIC_ son las unicas que Expo mete en el bundle del cliente.

const CLAVE_API = "voitos_api_url";

// De donde sale la URL del backend.
//
// EXPO_PUBLIC_API_URL se hornea en el bundle en tiempo de build, asi que la
// version desplegada quedaria clavada para siempre a lo que hubiera cuando se
// compilo. Eso hace imposible usar el sitio publicado contra un backend local,
// que es justo lo que hace falta para probar el pastillero: el backend tiene
// que estar en la misma red que la ESP32, pero la pagina se sirve por HTTPS.
//
// Por eso se puede pisar en caliente con ?api=... una sola vez; queda guardada
// y sobrevive a los refrescos. Con ?api= vacio se borra y vuelve a la del build.
const resolverUrl = (): string => {
  const delBuild =
    process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

  if (typeof window === "undefined") return delBuild;

  // Lo que venga en la URL manda, aunque no se pueda guardar.
  //
  // Antes el valor del parametro solo surtia efecto DESPUES de pasar por
  // localStorage, asi que si setItem tiraba (modo incognito, almacenamiento
  // bloqueado, algunos navegadores de celular) el catch se tragaba todo y
  // caia al valor del build. El parametro quedaba ignorado sin decir nada.
  let deLaUrl: string | null = null;
  try {
    deLaUrl = new URLSearchParams(window.location.search).get("api");
  } catch {
    // sin location utilizable
  }

  if (deLaUrl !== null) {
    const limpia = deLaUrl.trim().replace(/\/$/, "");

    // Persistir es lo que puede fallar, y es lo unico opcional: si no se
    // puede, la URL sigue valiendo para esta carga.
    try {
      if (limpia) localStorage.setItem(CLAVE_API, limpia);
      else localStorage.removeItem(CLAVE_API);
    } catch {
      // se pierde al recargar, pero ahora anda
    }

    if (limpia) return limpia;
    return delBuild;
  }

  try {
    const guardada = localStorage.getItem(CLAVE_API);
    if (guardada) return guardada;
  } catch {
    // sin localStorage, vale la del build
  }

  return delBuild;
};

export const API_URL = resolverUrl();

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
  // "YYYY-MM-DD" o null. La edad no viene del backend: se calcula con
  // edadDesde() de lib/fechas.ts.
  fecha_nacimiento?: string | null;
  // Si confirmo su casilla de correo. La cuenta funciona igual sin verificar:
  // solo se muestra un aviso, no se bloquea nada.
  verificado?: boolean;
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

// Cuanto se espera al backend antes de darlo por inalcanzable.
//
// fetch no tiene timeout propio: si la IP configurada no existe en la red
// actual, el pedido queda colgado hasta que lo corta el sistema operativo, que
// puede tardar minutos o no cortar nunca. En pantalla eso se ve como un boton
// que dice "INGRESANDO..." para siempre, sin error y sin poder reintentar.
const TIMEOUT_MS = 10_000;

// EL SEGUNDO INTENTO, PARA CUANDO EL BACKEND ESTABA DORMIDO.
//
// El backend vive en Render con el plan free, y ese plan apaga el servicio a
// los 15 minutos sin trafico. Despertarlo tarda entre 30 y 60 segundos.
//
// Lo que mantiene el servicio despierto es la ESP32, que consulta cada 30
// segundos; cuando el pastillero esta apagado o sin WiFi, nadie lo toca y se
// duerme. Entonces la primera persona que abre la app despues de un rato paga
// el arranque: mandaba el pedido, la app cortaba a los 10 segundos y mostraba
// un error, cuando en realidad el servidor estaba arrancando y en medio minuto
// iba a contestar bien.
//
// Por eso hay dos intentos. El primero corto, porque cuando el servidor esta
// despierto contesta en menos de un segundo y no tiene sentido hacer esperar a
// nadie. Si ese corta por tiempo, se reintenta una sola vez con una espera
// larga, avisando en pantalla que el servidor esta arrancando.
const TIMEOUT_DESPERTAR_MS = 45_000;

// Si el backend es remoto. Solo entonces tiene sentido reintentar.
//
// Contra un backend local el timeout significa otra cosa —la IP de la red vieja
// que ya no existe— y ahi esperar 45 segundos mas no arregla nada, solo hace
// mas lento el aviso de que hay que revisar EXPO_PUBLIC_API_URL.
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
    // Los tres rangos privados de IPv4: la red de casa o la del colegio.
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);

  return !esLocal;
};

// EL AVISO DE "ESTOY DESPERTANDO AL SERVIDOR".
//
// Mismo mecanismo que el dialogo de lib/avisos.ts: aca solo vive el estado y
// quien quiera dibujarlo se suscribe. Sin esto, el segundo intento son 45
// segundos de pantalla quieta, que se ven igual que una aplicacion colgada.
// Es un contador y no un booleano porque puede haber mas de un pedido en vuelo
// —la pantalla de inicio carga dosis y pastillas a la vez— y si cada uno
// apagara el aviso al terminar, el primero en volver lo apagaria mientras el
// otro sigue esperando.
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

// El texto que se muestra cuando no se pudo hablar con el backend.
//
// El mensaje viejo era uno solo y decia siempre lo mismo: "suele pasar cuando
// cambiaste de red y la IP quedo vieja, revisa EXPO_PUBLIC_API_URL". Eso estaba
// escrito para desarrollo, cuando el backend era una IP de la red de casa.
// Contra el backend desplegado manda a revisar justo lo unico que esta bien.
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

  // localtunnel intercepta a los navegadores con una pagina de advertencia
  // ("Tunnel website ahead!") y devuelve HTML en vez de la respuesta real, lo
  // que rompe cualquier llamada a la API. Esta cabecera la saltea.
  //
  // Va solo cuando el backend es un tunel: una cabecera propia obliga al
  // navegador a hacer un preflight OPTIONS antes de cada pedido, y no tiene
  // sentido pagar ese viaje de ida y vuelta en el uso normal.
  if (API_URL.includes(".loca.lt")) {
    headers["bypass-tunnel-reminder"] = "1";
  }

  if (conToken) {
    const token = sesion.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  // Un intento, con su propio corte por tiempo.
  //
  // AbortController a mano y no AbortSignal.timeout, que no existe en todas
  // las versiones de react-native-web.
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

  // Primer intento corto; si corta por tiempo y el backend es remoto, uno solo
  // mas con la espera larga. El primero ya desperto al servicio, asi que el
  // segundo es el que llega cuando termino de arrancar.
  const pedirConReintento = async (): Promise<Response> => {
    const remoto = esBackendRemoto(API_URL);

    try {
      return await intentar(TIMEOUT_MS);
    } catch (e: any) {
      // fetch solo tira excepcion si no llego a conectar, o si lo abortamos.
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
