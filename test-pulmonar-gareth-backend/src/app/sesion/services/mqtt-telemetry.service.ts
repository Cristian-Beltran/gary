import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Inject } from '@nestjs/common';
import { connect, MqttClient } from 'mqtt';
import { ConfigType } from '@nestjs/config';
import config from 'src/context/shared/config';
import { SessionService } from './session.service';
import { GaryDeviceStatus, GaryTelemetry } from '../models/telemetry.model';
import { TelemetryAnalysisService } from './telemetry-analysis.service';

const SAVE_INTERVAL_MS = 60_000;
const TELEMETRY_STALE_MS = 10_000;
const ANALYSIS_WINDOW_MS = 10_000;

type AnalysisWindowEntry = {
  receivedAt: number;
  telemetry: GaryTelemetry;
};

@Injectable()
export class MqttTelemetryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttTelemetryService.name);
  private client: MqttClient | null = null;
  private latestTelemetry: GaryTelemetry | null = null;
  private lastTelemetryReceivedAt = 0;
  private latestDeviceStatus: GaryDeviceStatus = {
    online: false,
    mqttConnected: false,
    wifiConnected: false,
    monitoringEnabled: false,
    emergencyActive: false,
    timestamp: new Date().toISOString(),
  };
  private saveTimer: NodeJS.Timeout | null = null;
  private analysisWindow: AnalysisWindowEntry[] = [];
  private lastAnalysisAt = 0;
  private readonly telemetryTopic: string;
  private readonly statusTopic: string;
  private readonly commandTopic: string;
  private readonly ackTopic: string;

  constructor(
    private readonly sessionService: SessionService,
    private readonly telemetryAnalysisService: TelemetryAnalysisService,
    @Inject(config.KEY) private readonly appConfig: ConfigType<typeof config>,
  ) {
    const root = appConfig.mqtt.topicRoot;
    const id = appConfig.mqtt.deviceId;
    this.telemetryTopic = `${root}/device/${id}/telemetry`;
    this.statusTopic = `${root}/device/${id}/status`;
    this.commandTopic = `${root}/device/${id}/cmd`;
    this.ackTopic = `${root}/device/${id}/cmd/ack`;
  }

  onModuleInit() {
    const { url, user, password } = this.appConfig.mqtt;
    this.client = connect(url, {
      reconnectPeriod: 3000,
      clean: true,
      clientId: `gary-backend-${Math.random().toString(16).slice(2, 10)}`,
      ...(user ? { username: user, password } : {}),
    });

    this.client.on('connect', () => {
      this.logger.log(`MQTT conectado: ${url}`);
      this.client?.subscribe(this.telemetryTopic, (err) => {
        if (err) {
          this.logger.error(`Error suscribiendo ${this.telemetryTopic}: ${err.message}`);
          return;
        }
        this.logger.log(`Suscrito a ${this.telemetryTopic}`);
      });
      this.client?.subscribe(this.statusTopic, (err) => {
        if (err) {
          this.logger.error(`Error suscribiendo ${this.statusTopic}: ${err.message}`);
          return;
        }
        this.logger.log(`Suscrito a ${this.statusTopic}`);
      });
      this.client?.subscribe(this.ackTopic, (err) => {
        if (err) this.logger.error(`Error suscribiendo ${this.ackTopic}: ${err.message}`);
      });
      void this.syncMonitoringControl();
    });

    this.client.on('message', (topic, payload) => {
      if (topic === this.telemetryTopic) {
        const parsed = this.parseTelemetry(payload.toString('utf8'));
        if (parsed) {
          this.lastTelemetryReceivedAt = Date.now();
          this.latestTelemetry = { ...parsed, receivedAt: new Date(this.lastTelemetryReceivedAt).toISOString(), stale: false };
          void this.pushTelemetryForAnalysis(parsed);
        }
        return;
      }

      if (topic === this.statusTopic) {
        const parsed = this.parseDeviceStatus(payload.toString('utf8'));
        if (parsed) {
          this.latestDeviceStatus = parsed;
        }
      }
      if (topic === this.ackTopic) this.parseCommandAck(payload.toString('utf8'));
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
    if (!this.latestTelemetry) return null;
    return { ...this.latestTelemetry, stale: Date.now() - this.lastTelemetryReceivedAt > TELEMETRY_STALE_MS };
  }

  getDeviceStatus() {
    return this.latestDeviceStatus;
  }

  getLatestAnalysis() {
    return this.telemetryAnalysisService.getLatestAnalysis();
  }

  async publishMonitoringControl(monitoringEnabled: boolean) {
    if (!this.client?.connected) {
      this.logger.warn('No se pudo publicar control MQTT: broker desconectado');
      return false;
    }

    const payload = JSON.stringify({ command: monitoringEnabled ? 'START_MEASUREMENT' : 'STOP_MEASUREMENT', commandId: crypto.randomUUID(), monitoringEnabled });
    return await new Promise<boolean>((resolve) => {
      this.client?.publish(this.commandTopic, payload, { qos: 1, retain: false }, (err) => {
        if (err) {
          this.logger.error(`Error publicando ${this.commandTopic}: ${err.message}`);
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
        const peakExpiratoryFlow = Number(
          obj.peakExpiratoryFlow ?? obj.peakFlow ?? obj.peakExpFlow,
        );
        const respiratoryRate = Number(
          obj.respiratoryRate ?? obj.breathRate ?? obj.respRate,
        );
        const expiratoryVolume = Number(
          obj.expiratoryVolume ?? obj.exhaledVolume ?? obj.expVolume,
        );

        if (
          Number.isFinite(pulse) &&
          Number.isFinite(oxygenSaturation) &&
          Number.isFinite(lungCapacity) &&
          Number.isFinite(airFlow) &&
          Number.isFinite(peakExpiratoryFlow) &&
          Number.isFinite(respiratoryRate) &&
          Number.isFinite(expiratoryVolume)
        ) {
          const timestamp =
            typeof obj.timestamp === 'number'
              ? String(obj.timestamp)
              : typeof obj.timestamp === 'string'
                ? obj.timestamp
                : String(Date.now());

          return {
            pulse,
            oxygenSaturation,
            lungCapacity,
            airFlow,
            peakExpiratoryFlow,
            respiratoryRate,
            expiratoryVolume,
            state: typeof obj.state === 'string' ? obj.state : undefined,
            timestamp,
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
        peakExpiratoryFlow: this.latestTelemetry.peakExpiratoryFlow,
        respiratoryRate: this.latestTelemetry.respiratoryRate,
        expiratoryVolume: this.latestTelemetry.expiratoryVolume,
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

  private parseCommandAck(raw: string) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const accepted = Boolean(parsed.accepted);
      this.latestDeviceStatus = {
        ...this.latestDeviceStatus,
        lastCommandAck: {
          commandId: typeof parsed.commandId === 'string' ? parsed.commandId : undefined,
          accepted,
          receivedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      };
    } catch {
      this.logger.warn(`ACK MQTT inválido: ${raw}`);
    }
  }

  private async syncMonitoringControl() {
    const activeSession = await this.sessionService.getActiveSession();
    await this.publishMonitoringControl(Boolean(activeSession));
  }

  private async pushTelemetryForAnalysis(reading: GaryTelemetry) {
    const now = Date.now();
    this.analysisWindow.push({ receivedAt: now, telemetry: reading });
    this.analysisWindow = this.analysisWindow.filter(
      (item) => now - item.receivedAt <= ANALYSIS_WINDOW_MS,
    );

    if (now - this.lastAnalysisAt < ANALYSIS_WINDOW_MS) {
      return;
    }

    this.lastAnalysisAt = now;
    await this.telemetryAnalysisService.analyzeWindow(
      this.analysisWindow.map((item) => item.telemetry),
    );
  }
}
