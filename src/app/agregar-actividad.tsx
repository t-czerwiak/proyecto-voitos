import React, { createContext, useContext, useState } from "react";

export type Actividad = {
  id: string;
  nombre: string;
  fecha: string;
  hora: string;
  tipo: "rutina" | "una-vez";
  dias?: string[];
};

type ActividadesContextType = {
  actividades: Actividad[];
  agregarActividad: (actividad: Actividad) => void;
  eliminarActividad: (id: string) => void;
};

const ActividadesContext = createContext<ActividadesContextType | undefined>(undefined);

export function ActividadesProvider({ children }: { children: React.ReactNode }) {
  const [actividades, setActividades] = useState<Actividad[]>([
    {
      id: "1",
      nombre: "Gimnasia",
      fecha: "2026-08-10",
      hora: "08:00",
      tipo: "rutina",
      dias: ["L", "X", "V"],
    },
    {
      id: "2",
      nombre: "Turno médico",
      fecha: "2026-08-15",
      hora: "14:30",
      tipo: "una-vez",
    },
  ]);

  function agregarActividad(nueva: Actividad) {
    setActividades((prev) => [...prev, nueva]);
  }

  function eliminarActividad(id: string) {
    setActividades((prev) => prev.filter((actividad) => actividad.id !== id));
  }

  return (
    <ActividadesContext.Provider
      value={{ actividades, agregarActividad, eliminarActividad }}
    >
      {children}
    </ActividadesContext.Provider>
  );
}

export function useActividades() {
  const context = useContext(ActividadesContext);
  if (!context) {
    throw new Error("useActividades debe usarse dentro de un ActividadesProvider");
  }
  return context;
}