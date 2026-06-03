export interface GaryTelemetry {
  pulse: number;
  oxygenSaturation: number;
  lungCapacity: number;
  airFlow: number;
  state?: string;
  timestamp: string;
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
