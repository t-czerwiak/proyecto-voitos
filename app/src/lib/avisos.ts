// Las confirmaciones de la aplicacion.
//
// ANTES ESTO ERA window.confirm, Y ESE ERA EL PROBLEMA.
//
// El dialogo del navegador no es parte de la aplicacion: lo dibuja el sistema,
// arriba de todo, con el tipo de letra y los colores del navegador y con un
// titulo que dice "voitos.vercel.app dice". Eso rompe tres cosas a la vez:
//
//   - Se ve como una estafa. "voitos.vercel.app dice" arriba de un texto sobre
//     medicacion es exactamente la forma que tienen los avisos falsos del
//     navegador, y quien cuida a otro no tiene por que saber distinguirlos.
//   - No respeta nada del diseno. Botones de 20px, texto de 13px, sin iconos, y
//     un boton "Aceptar" que no dice que va a hacer.
//   - Bloquea el hilo. Mientras el dialogo esta abierto no corre nada de la
//     aplicacion, asi que no se puede ni mostrar el estado de lo que se estaba
//     haciendo.
//
// Ahora la confirmacion es un componente nuestro (ui/Dialogo.tsx), dibujado
// adentro de la pagina, con la paleta, la tipografia y las areas de toque del
// resto de la aplicacion.
//
// ESTE ARCHIVO NO DIBUJA NADA. Guarda cual es la pregunta pendiente y avisa a
// quien este escuchando. Se separa asi porque lib/ no tiene nada visual: el
// componente vive en ui/ y se suscribe a esto. La funcion confirmar() queda con
// la misma forma de antes —devuelve una promesa de true/false— para que las
// pantallas que la usan no tengan que cambiar como estan escritas.

export type TonoDialogo = "normal" | "peligro";

export type PedidoDialogo = {
  // Cambia con cada pedido. Lo usa el componente para remontar el contenido y
  // no arrastrar el scroll del dialogo anterior.
  id: number;
  titulo: string;
  // Los parrafos ya separados. El llamador escribe "\n\n" como siempre y aca se
  // parte, porque un bloque de texto con saltos adentro no se puede espaciar.
  parrafos: string[];
  textoOk: string;
  // "peligro" pinta el boton de confirmar en rojo. Es para lo que no se puede
  // deshacer: borrar una cuenta, borrar una pastilla con su historial.
  tono: TonoDialogo;
  responder: (acepto: boolean) => void;
};

let pendiente: PedidoDialogo | null = null;
let proximoId = 1;

const oyentes = new Set<() => void>();

const avisarCambio = () => {
  oyentes.forEach((oyente) => oyente());
};

// Las tres funciones que pide useSyncExternalStore.
export const suscribirDialogo = (oyente: () => void): (() => void) => {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
};

export const leerDialogo = (): PedidoDialogo | null => pendiente;

// En el servidor del prerender nunca hay un dialogo abierto. Tiene que ser una
// funcion aparte y estable: si devolviera `pendiente`, React compararia contra
// un valor que el servidor no puede conocer y volveria a dibujar todo.
export const leerDialogoEnServidor = (): PedidoDialogo | null => null;

export const confirmar = (
  titulo: string,
  mensaje: string,
  textoOk = "Continuar",
  tono: TonoDialogo = "normal"
): Promise<boolean> =>
  new Promise<boolean>((resolver) => {
    // Si ya habia una pregunta abierta, se la da por cancelada. No deberia
    // pasar —las pantallas esperan la respuesta antes de seguir— pero si pasa,
    // dejar la promesa anterior colgada para siempre es peor: el boton que la
    // estaba esperando se queda en "Guardando..." y no vuelve nunca.
    pendiente?.responder(false);

    pendiente = {
      id: proximoId++,
      titulo,
      parrafos: mensaje.split("\n\n").map((p) => p.trim()).filter(Boolean),
      textoOk,
      tono,
      responder: (acepto: boolean) => {
        pendiente = null;
        avisarCambio();
        resolver(acepto);
      },
    };

    avisarCambio();
  });

// La usa el componente cuando se toca un boton, el fondo o Escape.
export const responderDialogo = (acepto: boolean): void => {
  pendiente?.responder(acepto);
};
