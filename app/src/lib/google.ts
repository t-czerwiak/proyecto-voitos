// Puente con Google Identity Services (GIS).
//
// Lo unico que sale de aca es el ID token que firma Google. La app no valida
// nada: se lo manda al backend, que se lo pasa a Supabase, y recien ahi se
// verifica la firma. Por eso el client_id puede estar en el bundle sin ningun
// problema: no es una clave secreta, es el nombre publico de la aplicacion.
//
// Es solo para web. La app hoy se usa desde el navegador del celular; en nativo
// haria falta expo-auth-session y otro flujo entero, asi que se avisa claro en
// vez de fallar de una forma rara.

const SCRIPT = "https://accounts.google.com/gsi/client";

export const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

// Sin client_id no se muestra el boton. Es lo que permite que la app siga
// funcionando igual antes de configurar Google: no aparece la opcion y listo,
// en vez de aparecer un boton que revienta al tocarlo.
export const googleDisponible = (): boolean =>
  Boolean(CLIENT_ID) && typeof window !== "undefined" && typeof document !== "undefined";

let cargando: Promise<void> | null = null;

// Carga el script de Google una sola vez, aunque lo pidan dos pantallas.
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

// Dibuja el boton oficial de Google adentro del elemento que se le pase.
//
// Tiene que ser el boton de ellos y no uno nuestro: GIS solo entrega el ID
// token a traves de su propio boton o del One Tap, y ademas las condiciones de
// uso de Google piden que se vea como el de ellos.
//
// onToken recibe el ID token cuando la persona termina de elegir la cuenta.
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
    // Blanco y no "filled_black". Sobre el fondo verde muy oscuro de la
    // aplicacion, el boton negro de Google se confundia con el fondo: parecia
    // apagado, y no se leia como algo que se puede tocar.
    theme: "outline",
    size: "large",
    shape: "pill",
    text: "continue_with",
    logo_alignment: "left",
    locale: "es-419",
    width: ancho,
  });
};
