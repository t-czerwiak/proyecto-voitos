// Refleja las tablas de Supabase

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  tipo: "cuidador" | "adulto_mayor";
  telefono?: string;
  created_at: string;
}

export interface Medicamento {
  id: string;
  paciente_id: string;
  nombre: string;
  descripcion?: string;
  created_at: string;
}

export interface HorarioMedicamento {
  id: string;
  medicamento_id: string;
  hora: string;           // HH:MM
  dias: string[];         // ['lunes', 'miercoles']
  cantidad: number;
  created_at: string;
}

export interface Actividad {
  id: string;
  paciente_id: string;
  titulo: string;
  descripcion?: string;
  fecha_hora: string;
  created_at: string;
}

export interface Alerta {
  id: string;
  paciente_id: string;
  tipo: "medicamento" | "actividad" | "emergencia";
  mensaje: string;
  leida: boolean;
  created_at: string;
}

export interface ContactoEmergencia {
  id: string;
  paciente_id: string;
  nombre: string;
  telefono: string;
  relacion?: string;
  created_at: string;
}

export interface CuidadorPaciente {
  id: string;
  cuidador_id: string;
  paciente_id: string;
  created_at: string;
}
