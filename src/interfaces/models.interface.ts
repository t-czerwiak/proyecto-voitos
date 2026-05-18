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
  dia: string;
  hora: number;
  minuto: number;
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