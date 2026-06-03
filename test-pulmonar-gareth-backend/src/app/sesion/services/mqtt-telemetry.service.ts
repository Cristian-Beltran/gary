import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { connect, MqttClient } from 'mqtt';
import { SessionService } from './session.service';
import { GaryDeviceStatus, GaryTelemetry } from '../models/telemetry.model';

const MQTT_URL = 'mqtt://broker.hivemq.com:1883';
const MQTT_TOPIC = 'gary/device/telemetry';
const MQTT_STATUS_TOPIC = 'gary/device/status';
const MQTT_CONTROL_TOPIC = 'gary/device/control';
const SAVE_INTERVAL_MS = 60_000;

@Injectable()
export class MqttTelemetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttTelemetryService.name);
  private client: MqttClient | null = null;
  private latestTelemetry: GaryTelemetry | null = null;
  private latestDeviceStatus: GaryDeviceStatus = {
    online: false,
    mqttConnected: false,
    wifiConnected: false,
    monitoringEnabled: false,
    emergencyActive: false,
    timestamp: new Date().toISOString(),
  };
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(private readonly sessionService: SessionService) {}

  onModuleInit() {
    this.client = connect(MQTT_URL, {
      reconnectPeriod: 3000,
      clean: true,
      clientId: `gary-backend-${Math.random().toString(16).slice(2, 10)}`,
    });

    this.client.on('connect', () => {
      this.logger.log(`MQTT conectado: ${MQTT_URL}`);
      this.client?.subscribe(MQTT_TOPIC, (err) => {
        if (err) {
          this.logger.error(`Error suscribiendo ${MQTT_TOPIC}: ${err.message}`);
          return;
        }
        this.logger.log(`Suscrito a ${MQTT_TOPIC}`);
      });
      this.client?.subscribe(MQTT_STATUS_TOPIC, (err) => {
        if (err) {
          this.logger.error(`Error suscribiendo ${MQTT_STATUS_TOPIC}: ${err.message}`);
          return;
        }
        this.logger.log(`Suscrito a ${MQTT_STATUS_TOPIC}`);
      });
      void this.syncMonitoringControl();
    });

    this.client.on('message', (topic, payload) => {
      if (topic === MQTT_TOPIC) {
        const parsed = this.parseTelemetry(payload.toString('utf8'));
        if (parsed) {
          this.latestTelemetry = parsed;
        }
        return;
      }

      if (topic === MQTT_STATUS_TOPIC) {
        const parsed = this.parseDeviceStatus(payload.toString('utf8'));
        if (parsed) {
          this.latestDeviceStatus = parsed;
        }
      }
    });

    this.client.on('error', (err) => {
      this.logger.error(`MQTT error: ${err.message}`);
    });

    this.saveTimer = setInterval(() => {
      void this.persistSnapshot();
    }, SAVE_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = null;
    }
    this.client?.end(true);
  }

  getLatestTelemetry() {
    return this.latestTelemetry;
  }

  getDeviceStatus() {
    return this.latestDeviceStatus;
  }

  async publishMonitoringControl(monitoringEnabled: boolean) {
    if (!this.client?.connected) {
      this.logger.warn('No se pudo publicar control MQTT: broker desconectado');
      return false;
    }

    const payload = JSON.stringify({ monitoringEnabled });
    return await new Promise<boolean>((resolve) => {
      this.client?.publish(MQTT_CONTROL_TOPIC, payload, { qos: 1, retain: true }, (err) => {
        if (err) {
          this.logger.error(`Error publicando ${MQTT_CONTROL_TOPIC}: ${err.message}`);
          resolve(false);
          return;
        }

        this.latestDeviceStatus = {
          ...this.latestDeviceStatus,
          monitoringEnabled,
          timestamp: new Date().toISOString(),
        };
        resolve(true);
      });
    });
  }

  private parseTelemetry(raw: string): GaryTelemetry | null {
    const message = raw.trim();
    if (!message) {
      return null;
    }

    if (message.startsWith('{') && message.endsWith('}')) {
      try {
        const obj = JSON.parse(message) as Record<string, unknown>;
        const pulse = Number(obj.pulse ?? obj.heartRateBpm ?? obj.bpm);
        const oxygenSaturation = Number(
          obj.oxygenSaturation ?? obj.spo2 ?? obj.spo2Filtered,
        );
        const lungCapacity = Number(
          obj.lungCapacity ?? obj.lungPressureKpa ?? obj.pressure,
        );
        const airFlow = Number(obj.airFlow ?? obj.flowRate ?? obj.flow ?? obj.airflow);

        if (
          Number.isFinite(pulse) &&
          Number.isFinite(oxygenSaturation) &&
          Number.isFinite(lungCapacity) &&
          Number.isFinite(airFlow)
        ) {
          return {
            pulse,
            oxygenSaturation,
            lungCapacity,
            airFlow,
            state: typeof obj.state === 'string' ? obj.state : undefined,
            timestamp:
              typeof obj.timestamp === 'string'
                ? obj.timestamp
                : new Date().toISOString(),
          };
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  private async persistSnapshot() {
    if (!this.latestTelemetry) {
      return;
    }

    const activeSession = await this.sessionService.getActiveSession();
    if (!activeSession) {
      return;
    }

    try {
      await this.sessionService.addSessionData(activeSession.id, {
        pulse: Math.round(this.latestTelemetry.pulse),
        oxygenSaturation: Math.round(this.latestTelemetry.oxygenSaturation),
        lungCapacity: this.latestTelemetry.lungCapacity,
        airFlow: this.latestTelemetry.airFlow,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`Error guardando snapshot MQTT: ${message}`);
    }
  }

  private parseDeviceStatus(raw: string): GaryDeviceStatus | null {
    const message = raw.trim();
    if (!message || !message.startsWith('{') || !message.endsWith('}')) {
      return null;
    }

    try {
      const obj = JSON.parse(message) as Record<string, unknown>;
      const online = Boolean(obj.online ?? obj.mqttConnected);
      const mqttConnected = Boolean(obj.mqttConnected ?? obj.online);
      const wifiConnected = Boolean(obj.wifiConnected ?? true);
      const monitoringEnabled = Boolean(obj.monitoringEnabled ?? false);
      const emergencyActive = Boolean(obj.emergencyActive ?? false);
      const rssi = Number(obj.rssi);

      return {
        online,
        mqttConnected,
        wifiConnected,
        monitoringEnabled,
        emergencyActive,
        ip: typeof obj.ip === 'string' ? obj.ip : undefined,
        rssi: Number.isFinite(rssi) ? rssi : undefined,
        timestamp:
          typeof obj.timestamp === 'string'
            ? obj.timestamp
            : new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  private async syncMonitoringControl() {
    const activeSession = await this.sessionService.getActiveSession();
    await this.publishMonitoringControl(Boolean(activeSession));
  }
}
