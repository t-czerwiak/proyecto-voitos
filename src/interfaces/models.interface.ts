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
  cantidad: number; // cuantas pastillas dispensar en esta dosis (1 a 20)
  dispensado: boolean;
  notificado: boolean; // si ya se le aviso al cuidador que no se tomo
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
  cantidad: number; // cuantas pastillas se dispensaron realmente (1 a 20)
  timestamp: string;
}

export interface Modulo {
  id: string;
  numero: number; // identificador del modulo (uno por servo, el Arduino lo mapea a su pin)
  pastilla_id: string | null; // que pastilla tiene cargada (null si vacio)
  cantidad_actual: number; // cuantas pastillas quedan cargadas
  dispositivo_id: string;
  created_at: string;
}