import React from "react";
import Opciones from "./Opciones";
import Selector from "./Selector";

const ANTICIPACION = [
  { valor: "5", etiqueta: "5 minutos antes" },
  { valor: "10", etiqueta: "10 minutos antes" },
  { valor: "15", etiqueta: "15 minutos antes" },
  { valor: "30", etiqueta: "30 minutos antes" },
  { valor: "60", etiqueta: "1 hora antes" },
];

const POR_DEFECTO = 15;

type Props = {
  valor: number | null;
  alCambiar: (v: number | null) => void;
};

export default function CampoRecordatorio({ valor, alCambiar }: Props) {
  return (
    <>
      <Opciones
        etiqueta="Recordatorio en la pantalla del pastillero"
        valor={valor === null ? "no" : "si"}
        alCambiar={(v) => alCambiar(v === "si" ? valor ?? POR_DEFECTO : null)}
        opciones={[
          { valor: "no", etiqueta: "No" },
          {
            valor: "si",
            etiqueta: "Sí, mostrarlo antes",
            detalle: "Aparece escrito en el pastillero un rato antes de la hora.",
          },
        ]}
      />

      {valor !== null && (
        <Selector
          etiqueta="Cuánto antes"
          valor={String(valor)}
          alCambiar={(v) => alCambiar(Number(v))}
          opciones={ANTICIPACION}
        />
      )}
    </>
  );
}

export const anticipacionEnPalabras = (min: number) =>
  ANTICIPACION.find((a) => a.valor === String(min))?.etiqueta ?? `${min} minutos antes`;
