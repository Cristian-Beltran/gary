import { Injectable, Logger } from '@nestjs/common';
import { Inject, Optional } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import config from 'src/context/shared/config';
import { GaryTelemetry, GaryTelemetryAnalysis } from '../models/telemetry.model';

type AnalysisCategory = GaryTelemetryAnalysis['category'];

type TelemetryWindowMetrics = GaryTelemetryAnalysis['metrics'];

@Injectable()
export class TelemetryAnalysisService {
  private readonly logger = new Logger(TelemetryAnalysisService.name);
  private latestAnalysis: GaryTelemetryAnalysis = {
    category: 'sin-datos',
    source: 'reglas',
    generatedAt: new Date().toISOString(),
    summary: 'Aun no hay una ventana de respiracion valida para analizar.',
    metrics: {
      averageAirFlow: 0,
      peakExpiratoryFlow: 0,
      respiratoryRate: 0,
      expiratoryVolume: 0,
      activeSamples: 0,
    },
  };

  constructor(
    @Optional()
    @Inject(config.KEY)
    private readonly appConfig?: ConfigType<typeof config>,
  ) {}

  getLatestAnalysis() {
    return this.latestAnalysis;
  }

  async analyzeWindow(window: GaryTelemetry[]) {
    const activeWindow = window.filter(
      (item) =>
        item.airFlow >= 0.25 ||
        item.peakExpiratoryFlow > 0 ||
        item.respiratoryRate > 0 ||
        item.expiratoryVolume >= 0.01,
    );

    const metrics = this.computeMetrics(window, activeWindow);
    if (!metrics.activeSamples) {
      this.latestAnalysis = {
        category: 'sin-datos',
        source: 'reglas',
        generatedAt: new Date().toISOString(),
        summary: 'No se detecto respiracion activa en la ventana analizada.',
        metrics,
      };
      return this.latestAnalysis;
    }

    const category = this.classify(metrics);
    const fallbackSummary = this.buildFallbackSummary(category, metrics);
    const gptSummary = await this.generateWithOpenAi(category, metrics, fallbackSummary);

    this.latestAnalysis = {
      category,
      source: gptSummary === fallbackSummary ? 'reglas' : 'gpt',
      generatedAt: new Date().toISOString(),
      summary: gptSummary,
      metrics,
    };

    return this.latestAnalysis;
  }

  private computeMetrics(
    window: GaryTelemetry[],
    activeWindow: GaryTelemetry[],
  ): TelemetryWindowMetrics {
    if (!window.length) {
      return {
        averageAirFlow: 0,
        peakExpiratoryFlow: 0,
        respiratoryRate: 0,
        expiratoryVolume: 0,
        activeSamples: 0,
      };
    }

    const sourceWindow = activeWindow.length ? activeWindow : window;
    const averageAirFlow =
      sourceWindow.reduce((acc, item) => acc + item.airFlow, 0) / sourceWindow.length;
    const peakExpiratoryFlow = Math.max(
      ...sourceWindow.map((item) => item.peakExpiratoryFlow),
      0,
    );
    const respiratoryRate = Math.max(
      ...sourceWindow.map((item) => item.respiratoryRate),
      0,
    );
    const expiratoryVolume = Math.max(
      ...sourceWindow.map((item) => item.expiratoryVolume),
      0,
    );

    return {
      averageAirFlow: Number(averageAirFlow.toFixed(2)),
      peakExpiratoryFlow: Number(peakExpiratoryFlow.toFixed(2)),
      respiratoryRate: Number(respiratoryRate.toFixed(2)),
      expiratoryVolume: Number(expiratoryVolume.toFixed(2)),
      activeSamples: activeWindow.length,
    };
  }

  private classify(metrics: TelemetryWindowMetrics): AnalysisCategory {
    if (metrics.activeSamples === 0) {
      return 'sin-datos';
    }

    if (
      metrics.activeSamples <= 2 &&
      metrics.averageAirFlow < 0.25 &&
      metrics.peakExpiratoryFlow < 1.0
    ) {
      return 'apnea';
    }

    if (metrics.respiratoryRate >= 24) {
      return 'respiracion-rapida';
    }

    if (metrics.peakExpiratoryFlow < 8 || metrics.averageAirFlow < 2.5) {
      return 'flujo-respiratorio-debil';
    }

    if (metrics.peakExpiratoryFlow < 15 && metrics.expiratoryVolume < 0.2) {
      return 'posible-obstruccion';
    }

    if (metrics.respiratoryRate >= 20 && metrics.expiratoryVolume < 0.2) {
      return 'fatiga-respiratoria';
    }

    return 'patron-estable';
  }

  private buildFallbackSummary(
    category: AnalysisCategory,
    metrics: TelemetryWindowMetrics,
  ) {
    const metricsText = `Flujo medio ${metrics.averageAirFlow} SLM, pico ${metrics.peakExpiratoryFlow} SLM, frecuencia ${metrics.respiratoryRate} rpm y volumen espiratorio ${metrics.expiratoryVolume} L.`;

    switch (category) {
      case 'apnea':
        return `Posible apnea o pausa respiratoria prolongada detectada. ${metricsText}`;
      case 'respiracion-rapida':
        return `Respiracion rapida detectada, conviene vigilar esfuerzo y tolerancia. ${metricsText}`;
      case 'flujo-respiratorio-debil':
        return `Flujo respiratorio debil en la exhalacion. ${metricsText}`;
      case 'posible-obstruccion':
        return `El patron sugiere posible obstruccion por bajo pico y bajo volumen espiratorio. ${metricsText}`;
      case 'fatiga-respiratoria':
        return `Hay signos compatibles con fatiga respiratoria por respiracion acelerada y poco volumen. ${metricsText}`;
      case 'patron-estable':
        return `El patron respiratorio luce estable en esta ventana de medicion. ${metricsText}`;
      default:
        return `No hay datos respiratorios suficientes para analisis. ${metricsText}`;
    }
  }

  private async generateWithOpenAi(
    category: AnalysisCategory,
    metrics: TelemetryWindowMetrics,
    fallbackSummary: string,
  ) {
    const apiKey = this.appConfig?.openAi.apiKey;
    const model = this.appConfig?.openAi.model ?? 'gpt-5-mini';

    if (!apiKey) {
      return fallbackSummary;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: [
            {
              role: 'system',
              content: [
                {
                  type: 'input_text',
                  text: 'Eres un asistente clinico de terapia respiratoria. Responde en espanol con un mensaje breve, claro y prudente. No diagnostiques, describe el patron observado y una recomendacion simple de vigilancia.',
                },
              ],
            },
            {
              role: 'user',
              content: [
                {
                  type: 'input_text',
                  text: `Categoria estimada: ${category}. Flujo medio: ${metrics.averageAirFlow} SLM. Flujo pico espiratorio: ${metrics.peakExpiratoryFlow} SLM. Frecuencia respiratoria: ${metrics.respiratoryRate} rpm. Volumen espiratorio: ${metrics.expiratoryVolume} L. Redacta un mensaje de 1 o 2 oraciones.`,
                },
              ],
            },
          ],
          text: {
            format: {
              type: 'text',
            },
          },
        }),
      });

      if (!response.ok) {
        this.logger.warn(`OpenAI respondio ${response.status}`);
        return fallbackSummary;
      }

      const data = (await response.json()) as {
        output_text?: string;
      };

      const summary = data.output_text?.trim();
      return summary || fallbackSummary;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`No se pudo generar analisis GPT: ${message}`);
      return fallbackSummary;
    }
  }
}
