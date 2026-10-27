export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  mail: string;

  fecha_nacimiento?: string | null;
  created_at: string;
}

export interface Pastilla {
  id: string;
  usuario_id: string;
  nombre: string;
  tipo?: string;
  created_at: string;
}

export interface Horario {
  id: string;
  pastilla_id: string;
  dia: string;
  hora: number;
  minuto: number;
  cantidad: number;
  dispensado: boolean;
  notificado: boolean;
  recordatorio_min: number | null;
  created_at: string;
}

export interface ContactoEmergencia {
  id: string;
  usuario_id: string;
  nombre: string;
  apellido: string;
  numero: string;
  dni?: string;
  created_at: string;
}

export interface Dispensacion {
  id: string;
  horario_id: string;
  dispositivo_id: string;
  bateria: number;
  cantidad: number;
  detectadas: number | null;
  timestamp: string;
}

export interface Modulo {
  id: string;
  numero: number;
  nombre: string;
  pastilla_id: string | null;
  cantidad_actual: number;
  dispositivo_id: string;
  created_at: string;
}

export interface Actividad {
  id: string;
  usuario_id: string;
  nombre: string;
  fecha: string;
  hora: string;
  tipo: "rutina" | "una-vez";
  dias?: string[];
  recordatorio_min: number | null;
  created_at: string;
}