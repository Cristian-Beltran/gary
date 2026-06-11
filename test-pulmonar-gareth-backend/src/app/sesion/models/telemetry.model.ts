export interface GaryTelemetry {
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

export interface GaryTelemetryAnalysis {
  summary: string;
  category:
    | 'sin-datos'
    | 'flujo-respiratorio-debil'
    | 'respiracion-rapida'
    | 'posible-obstruccion'
    | 'apnea'
    | 'fatiga-respiratoria'
    | 'patron-estable';
  source: 'gpt' | 'reglas';
  generatedAt: string;
  metrics: {
    averageAirFlow: number;
    peakExpiratoryFlow: number;
    respiratoryRate: number;
    expiratoryVolume: number;
    activeSamples: number;
  };
}

export interface GaryDeviceStatus {
  online: boolean;
  mqttConnected: boolean;
  wifiConnected: boolean;
  monitoringEnabled?: boolean;
  emergencyActive?: boolean;
  ip?: string;
  rssi?: number;
  timestamp: string;
}
