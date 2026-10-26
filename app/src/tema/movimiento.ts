import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

export function useMovimientoReducido(): boolean {
  const [reducido, setReducido] = useState(false);

  useEffect(() => {
    let vigente = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((valor) => {
        if (vigente) setReducido(valor);
      })
      .catch(() => {
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
