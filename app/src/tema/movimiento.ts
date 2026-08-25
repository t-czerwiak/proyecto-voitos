import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// Si el sistema pide menos movimiento, se lo respeta.
//
// El fondo animado anterior tenia tres manchas dando vueltas todo el tiempo,
// en todas las pantallas. Para una persona con vertigo o migrana vestibular
// eso no es decoracion: marea. Y a cualquiera que este leyendo una dosis le
// roba la atencion justo donde no sobra.
//
// En iOS y Android sale de "Reducir movimiento" en accesibilidad; en el
// navegador, de prefers-reduced-motion. Se escucha el cambio en vivo porque
// alguien puede activarlo con la aplicacion abierta.
export function useMovimientoReducido(): boolean {
  const [reducido, setReducido] = useState(false);

  useEffect(() => {
    let vigente = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((valor) => {
        if (vigente) setReducido(valor);
      })
      .catch(() => {
        // Si la plataforma no sabe contestar, se asume que no hace falta
        // reducir nada. Nunca deberia romper por esto.
      });

    const suscripcion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (valor) => setReducido(valor)
    );

    return () => {
      vigente = false;
      suscripcion?.remove?.();
    };
  }, []);

  return reducido;
}
