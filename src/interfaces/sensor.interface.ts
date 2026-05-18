// Payload que envía la ESP32 al servidor
export interface SensorPayload {
  device_id: string;        // ID único de la ESP32
  paciente_id: string;      // UUID del paciente en Supabase
  timestamp: string;        // ISO 8601
  evento: SensorEvento;
}

// Tipos de eventos que puede mandar el hardware
export type SensorEvento =
  | EventoPastillaDispensada
  | EventoBotonEmergencia
  | EventoConexion;

export interface EventoPastillaDispensada {
  tipo: "pastilla_dispensada";
  medicamento_id: string;   // UUID del medicamento
  compartimento: number;    // Número de compartimento del pastillero (1-7)
  cantidad: number;         // Cuántas pastillas se dispensaron
}

export interface EventoBotonEmergencia {
  tipo: "boton_emergencia";
  presionado: boolean;
}

export interface EventoConexion {
  tipo: "conexion";
  estado: "online" | "offline";
  ip?: string;
  firmware_version?: string;
}

// Estado del dispositivo (para consultas de estado)
export interface EstadoDispositivo {
  device_id: string;
  paciente_id: string;
  online: boolean;
  ultima_conexion: string;
  ip?: string;
  firmware_version?: string;
}
