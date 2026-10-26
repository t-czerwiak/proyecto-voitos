const SCRIPT = "https://accounts.google.com/gsi/client";

export const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export const googleDisponible = (): boolean =>
  Boolean(CLIENT_ID) && typeof window !== "undefined" && typeof document !== "undefined";

let cargando: Promise<void> | null = null;

const cargarScript = (): Promise<void> => {
  if (cargando) return cargando;

  cargando = new Promise((resolver, rechazar) => {
    if ((window as any).google?.accounts?.id) {
      resolver();
      return;
    }

    const existente = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    if (existente) {
      existente.addEventListener("load", () => resolver());
      existente.addEventListener("error", () => rechazar(new Error("No se pudo cargar Google")));
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolver();
    script.onerror = () => rechazar(new Error("No se pudo cargar el inicio de sesión de Google"));
    document.head.appendChild(script);
  });

  return cargando;
};

export const dibujarBotonGoogle = async (
  contenedor: HTMLElement,
  onToken: (idToken: string) => void,
  ancho = 360
): Promise<void> => {
  if (!googleDisponible()) {
    throw new Error("El inicio de sesión con Google no está configurado");
  }

  await cargarScript();

  const gis = (window as any).google?.accounts?.id;
  if (!gis) throw new Error("No se pudo cargar el inicio de sesión de Google");

  gis.initialize({
    client_id: CLIENT_ID,
    callback: (respuesta: { credential?: string }) => {
      if (respuesta?.credential) onToken(respuesta.credential);
    },
  });

  contenedor.innerHTML = "";

  gis.renderButton(contenedor, {
    type: "standard",

    theme: "outline",
    size: "large",

    shape: "rectangular",
    text: "continue_with",
    logo_alignment: "left",
    locale: "es-419",
    width: ancho,
  });
};
