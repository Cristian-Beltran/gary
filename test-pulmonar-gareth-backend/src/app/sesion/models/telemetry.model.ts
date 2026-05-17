export interface GaryTelemetry {
  pulse: number;
  oxygenSaturation: number;
  lungCapacity: number;
  state?: string;
  timestamp: string;
}

export interface GaryDeviceStatus {
  online: boolean;
  mqttConnected: boolean;
  wifiConnected: boolean;
  ip?: string;
  rssi?: number;
  timestamp: string;
}
