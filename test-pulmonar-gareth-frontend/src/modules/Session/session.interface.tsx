export interface CreateSessionDto {
  patientId: string;
}

export interface CreateSessionDataDto {
  lungCapacity: number;
  pulse: number;
  oxygenSaturation: number;
}

export interface SessionData {
  id: string;
  lungCapacity: number;
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
  state?: string;
  timestamp: string;
}

export interface DeviceStatus {
  online: boolean;
  mqttConnected: boolean;
  wifiConnected: boolean;
  ip?: string;
  rssi?: number;
  timestamp: string;
}
