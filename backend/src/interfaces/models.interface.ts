export interface Usuario {
  id: string;
  nombre: string;
  apellido: string;
  mail: string;
  // Date pelado de Postgres: "YYYY-MM-DD", sin hora ni zona. La edad no se
  // guarda, se calcula a partir de esto.
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

// Un modulo del pastillero: un servo con su tolva y su filtro.
//
// Una ESP32 puede manejar VARIOS. Hoy hay uno solo armado. Los modulos se dan
// de alta a mano cuando se arma el hardware; el backend no los crea nunca.
export interface Modulo {
  id: string;
  numero: number; // identificador del modulo. El Arduino lo mapea a su pin.
  nombre: string; // como se lo llama en la app: "voitos_1"
  pastilla_id: string | null; // que pastilla tiene cargada (null si vacio)
  cantidad_actual: number; // cuantas pastillas quedan cargadas
  dispositivo_id: string; // la placa que lo tiene. Coincide con el firmware.
  created_at: string;
}

// Recordatorios del calendario del cuidador (gimnasia, turnos medicos).
// No tienen relacion con el pastillero ni con la ESP32.
export interface Actividad {
  id: string;
  usuario_id: string;
  nombre: string;
  fecha: string; // "YYYY-MM-DD"
  hora: string; // "HH:MM"
  tipo: "rutina" | "una-vez";
  dias?: string[]; // ["L","X","V"] cuando tipo es "rutina"
  created_at: string;
}