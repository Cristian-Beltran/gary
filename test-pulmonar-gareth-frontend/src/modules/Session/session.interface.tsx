export interface CreateSessionDto {
  patientId: string;
}

export interface CreateSessionDataDto {
  lungCapacity: number;
  airFlow: number;
  peakExpiratoryFlow: number;
  respiratoryRate: number;
  expiratoryVolume: number;
  pulse: number;
  oxygenSaturation: number;
}

export interface SessionData {
  id: string;
  lungCapacity: number;
  airFlow: number;
  peakExpiratoryFlow: number;
  respiratoryRate: number;
  expiratoryVolume: number;
  pulse: number;
  oxygenSaturation: number;
  recordedAt: string;
}

export interface Session {
  id: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  startedAt: string;
  endedAt?: string | null;
  records?: SessionData[];
}

export interface RealtimeTelemetry {
  pulse: number;
  oxygenSaturation: number;
  lungCapacity: number;
  airFlow: number;
  peakExpiratoryFlow: number;
  respiratoryRate: number;
  expiratoryVolume: number;
  state?: string;
  timestamp: string;
}

export interface TelemetryAnalysis {
  summary: string;
  category:
    | "sin-datos"
    | "flujo-respiratorio-debil"
    | "respiracion-rapida"
    | "posible-obstruccion"
    | "apnea"
    | "fatiga-respiratoria"
    | "patron-estable";
  source: "gpt" | "reglas";
  generatedAt: string;
  metrics: {
    averageAirFlow: number;
    peakExpiratoryFlow: number;
    respiratoryRate: number;
    expiratoryVolume: number;
    activeSamples: number;
  };
}

export interface DeviceStatus {
  online: boolean;
  mqttConnected: boolean;
  wifiConnected: boolean;
  monitoringEnabled?: boolean;
  emergencyActive?: boolean;
  ip?: string;
  rssi?: number;
  timestamp: string;
}
