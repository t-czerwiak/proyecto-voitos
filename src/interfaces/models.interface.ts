export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  mail: string;
  edad?: number;
  created_at: string;
}

export interface Pastilla {
  id: string;
  usuario_id: string;
  nombre: string;
  tipo?: string;
  caracteristicas?: string;
  created_at: string;
}

export interface Horario {
  id: string;
  pastilla_id: string;
  dia: string; // fecha especifica "YYYY-MM-DD"
  hora: number;
  minuto: number;
  dispensado: boolean;
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
  timestamp: string;
}

export interface Modulo {
  id: string;
  servo: number; // numero de servo que el Arduino identifica por pin
  pastilla_id: string | null; // que pastilla tiene cargada (null si vacio)
  dispositivo_id: string;
  created_at: string;
}