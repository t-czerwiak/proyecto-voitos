export type TonoDialogo = "normal" | "peligro";

export type PedidoDialogo = {
  id: number;
  titulo: string;

  parrafos: string[];
  textoOk: string;

  tono: TonoDialogo;
  responder: (acepto: boolean) => void;
};

let pendiente: PedidoDialogo | null = null;
let proximoId = 1;

const oyentes = new Set<() => void>();

const avisarCambio = () => {
  oyentes.forEach((oyente) => oyente());
};

export const suscribirDialogo = (oyente: () => void): (() => void) => {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
};

export const leerDialogo = (): PedidoDialogo | null => pendiente;

export const leerDialogoEnServidor = (): PedidoDialogo | null => null;

export const confirmar = (
  titulo: string,
  mensaje: string,
  textoOk = "Continuar",
  tono: TonoDialogo = "normal"
): Promise<boolean> =>
  new Promise<boolean>((resolver) => {
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

export const responderDialogo = (acepto: boolean): void => {
  pendiente?.responder(acepto);
};
