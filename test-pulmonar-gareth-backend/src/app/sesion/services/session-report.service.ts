import { Injectable } from '@nestjs/common';
import type { TableCell, TDocumentDefinitions } from 'pdfmake/interfaces';
import { PdfService } from 'src/context/pdf/pdf.service';
import { Session } from '../entities/session.entity';
import { SessionData } from '../entities/session-data.entity';
import { SessionService } from './session.service';

@Injectable()
export class SessionReportService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly pdfService: PdfService,
  ) {}

  async generateSessionReport(sessionId: string) {
    const session = await this.sessionService.findOneDetailed(sessionId);
    const title = `Reporte de sesion ${session.id.slice(0, 8)}`;

    return this.pdfService.generatePdf(
      () => this.buildDocumentDefinition(session),
      {
        title,
        author: 'Sistema Gary',
        subject: 'Reporte de sesion respiratoria',
        creator: 'Sistema Gary',
        producer: 'Sistema Gary',
        creationDate: new Date(),
      },
    );
  }

  private buildDocumentDefinition(session: Session): TDocumentDefinitions {
    const records = session.records ?? [];
    const patientName = session.patient?.user?.fullname ?? 'Paciente';
    const startedAt = new Date(session.startedAt);
    const endedAt = session.endedAt ? new Date(session.endedAt) : null;
    const durationMin = endedAt
      ? Math.max(0, (endedAt.getTime() - startedAt.getTime()) / 60000)
      : null;

    const summary = this.buildSummary(records);

    return {
      pageSize: 'A4',
      pageMargins: [28, 28, 28, 36],
      footer: (currentPage, pageCount) => ({
        margin: [28, 0, 28, 12],
        columns: [
          {
            text: `Generado ${this.formatDateTime(new Date())}`,
            fontSize: 8,
            color: '#64748b',
          },
          {
            text: `Pagina ${currentPage} de ${pageCount}`,
            alignment: 'right',
            fontSize: 8,
            color: '#64748b',
          },
        ],
      }),
      content: [
        {
          columns: [
            {
              width: '*',
              stack: [
                { text: 'Gary', style: 'eyebrow' },
                { text: 'Reporte de sesion respiratoria', style: 'title' },
                {
                  text: 'Resumen clinico, graficas y detalle de lecturas de la sesion.',
                  style: 'subtitle',
                },
              ],
            },
            {
              width: 170,
              table: {
                widths: ['*'],
                body: [[{ text: session.id, style: 'sessionIdCard' }]],
              },
              layout: {
                hLineWidth: () => 0,
                vLineWidth: () => 0,
                paddingTop: () => 10,
                paddingBottom: () => 10,
                paddingLeft: () => 12,
                paddingRight: () => 12,
                fillColor: () => '#0f172a',
              },
            },
          ],
        },
        { text: ' ' },
        {
          columns: [
            this.buildInfoCard('Paciente', patientName, '#eff6ff'),
            this.buildInfoCard('Inicio', this.formatDateTime(startedAt), '#f0fdf4'),
            this.buildInfoCard('Fin', endedAt ? this.formatDateTime(endedAt) : 'Sesion activa', '#fff7ed'),
            this.buildInfoCard(
              'Duracion',
              durationMin == null ? 'En curso' : `${durationMin.toFixed(1)} min`,
              '#faf5ff',
            ),
          ],
          columnGap: 10,
        },
        { text: ' ' },
        {
          text: 'Resumen de metricas',
          style: 'sectionTitle',
        },
        {
          columns: [
            this.buildMetricCard('Pulso prom.', `${summary.avgPulse.toFixed(1)} bpm`, '#fee2e2'),
            this.buildMetricCard('SpO2 prom.', `${summary.avgSpo2.toFixed(1)} %`, '#dbeafe'),
            this.buildMetricCard('Presion prom.', `${summary.avgPressure.toFixed(2)} kPa`, '#dcfce7'),
            this.buildMetricCard('Flujo prom.', `${summary.avgFlow.toFixed(1)} SLM`, '#ede9fe'),
          ],
          columnGap: 10,
        },
        { text: ' ' },
        {
          columns: [
            this.buildMetricCard('Flujo pico max.', `${summary.maxPeakFlow.toFixed(1)} SLM`, '#ffedd5'),
            this.buildMetricCard('Freq. resp. prom.', `${summary.avgRespiratoryRate.toFixed(1)} rpm`, '#ccfbf1'),
            this.buildMetricCard('Vol. esp. max.', `${summary.maxExpiratoryVolume.toFixed(2)} L`, '#f3e8ff'),
            this.buildMetricCard('Lecturas', `${records.length}`, '#f8fafc'),
          ],
          columnGap: 10,
        },
        { text: ' ' },
        {
          text: 'Graficas de la sesion',
          style: 'sectionTitle',
        },
        this.buildChartSection(
          'Pulso y SpO2',
          records,
          [
            { key: 'pulse', color: '#ef4444' },
            { key: 'oxygenSaturation', color: '#2563eb' },
          ],
        ),
        this.buildChartSection(
          'Presion y flujo de aire',
          records,
          [
            { key: 'lungCapacity', color: '#059669' },
            { key: 'airFlow', color: '#7c3aed' },
          ],
        ),
        this.buildChartSection(
          'Metricas respiratorias derivadas',
          records,
          [
            { key: 'peakExpiratoryFlow', color: '#ea580c' },
            { key: 'respiratoryRate', color: '#0f766e' },
            { key: 'expiratoryVolume', color: '#9333ea' },
          ],
        ),
        {
          text: 'Detalle de lecturas',
          style: 'sectionTitle',
          pageBreak: 'before',
        },
        this.buildRecordsTable(records),
      ] as any[],
      styles: {
        eyebrow: { fontSize: 10, bold: true, color: '#0f766e' },
        title: { fontSize: 22, bold: true, color: '#0f172a' },
        subtitle: { fontSize: 10, color: '#475569' },
        sectionTitle: { fontSize: 14, bold: true, color: '#0f172a', margin: [0, 6, 0, 8] },
        cardLabel: { fontSize: 9, bold: true, color: '#475569' },
        cardValue: { fontSize: 12, bold: true, color: '#0f172a' },
        metricValue: { fontSize: 16, bold: true, color: '#020617' },
        chartTitle: { fontSize: 11, bold: true, color: '#0f172a', margin: [0, 0, 0, 6] },
        chartLegend: { fontSize: 8, color: '#475569' },
        sessionIdCard: { fontSize: 10, color: '#ffffff', alignment: 'center', bold: true },
        tableHeader: { fontSize: 9, bold: true, color: '#0f172a' },
        tableCell: { fontSize: 8, color: '#0f172a' },
      },
      defaultStyle: {
        fontSize: 10,
        color: '#0f172a',
      },
    };
  }

  private buildSummary(records: SessionData[]) {
    const avg = (values: number[]) =>
      values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const max = (values: number[]) => (values.length ? Math.max(...values) : 0);

    return {
      avgPulse: avg(records.map((record) => record.pulse)),
      avgSpo2: avg(records.map((record) => record.oxygenSaturation)),
      avgPressure: avg(records.map((record) => record.lungCapacity)),
      avgFlow: avg(records.map((record) => record.airFlow)),
      avgRespiratoryRate: avg(records.map((record) => record.respiratoryRate)),
      maxPeakFlow: max(records.map((record) => record.peakExpiratoryFlow)),
      maxExpiratoryVolume: max(records.map((record) => record.expiratoryVolume)),
    };
  }

  private buildInfoCard(label: string, value: string, fillColor: string): any {
    return {
      width: '*',
      table: {
        widths: ['*'],
        body: [[{ stack: [{ text: label, style: 'cardLabel' }, { text: value, style: 'cardValue' }] }]],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingTop: () => 10,
        paddingBottom: () => 10,
        paddingLeft: () => 12,
        paddingRight: () => 12,
        fillColor: () => fillColor,
      },
    };
  }

  private buildMetricCard(label: string, value: string, fillColor: string): any {
    return {
      width: '*',
      table: {
        widths: ['*'],
        body: [[{ stack: [{ text: label, style: 'cardLabel' }, { text: value, style: 'metricValue' }] }]],
      },
      layout: {
        hLineWidth: () => 0,
        vLineWidth: () => 0,
        paddingTop: () => 10,
        paddingBottom: () => 12,
        paddingLeft: () => 12,
        paddingRight: () => 12,
        fillColor: () => fillColor,
      },
    };
  }

  private buildChartSection(
    title: string,
    records: SessionData[],
    series: Array<{ key: keyof SessionData; color: string }>,
  ): any {
    const chartWidth = 740;
    const chartHeight = 150;
    const left = 24;
    const top = 12;
    const usableWidth = chartWidth - left - 16;
    const usableHeight = chartHeight - top - 26;
    const values = records.flatMap((record) =>
      series.map((item) => Number(record[item.key] ?? 0)),
    );
    const maxValue = Math.max(...values, 1);
    const count = Math.max(records.length - 1, 1);

    const canvas = [
      { type: 'rect', x: 0, y: 0, w: chartWidth, h: chartHeight, r: 8, lineColor: '#e2e8f0', color: '#ffffff' },
      { type: 'line', x1: left, y1: top, x2: left, y2: top + usableHeight, lineColor: '#cbd5e1', lineWidth: 1 },
      { type: 'line', x1: left, y1: top + usableHeight, x2: left + usableWidth, y2: top + usableHeight, lineColor: '#cbd5e1', lineWidth: 1 },
    ];

    for (let index = 1; index <= 3; index++) {
      const y = top + (usableHeight / 4) * index;
      canvas.push({
        type: 'line',
        x1: left,
        y1: y,
        x2: left + usableWidth,
        y2: y,
        lineColor: '#f1f5f9',
        lineWidth: 1,
      });
    }

    series.forEach((item) => {
      if (records.length < 2) {
        return;
      }

      for (let index = 0; index < records.length - 1; index++) {
        const current = Number(records[index][item.key] ?? 0);
        const next = Number(records[index + 1][item.key] ?? 0);
        const x1 = left + (usableWidth * index) / count;
        const x2 = left + (usableWidth * (index + 1)) / count;
        const y1 = top + usableHeight - (current / maxValue) * usableHeight;
        const y2 = top + usableHeight - (next / maxValue) * usableHeight;
        canvas.push({
          type: 'line',
          x1,
          y1,
          x2,
          y2,
          lineColor: item.color,
          lineWidth: 2,
        });
      }
    });

    const legendColumns = series.flatMap((item) => [
      {
        width: 'auto',
        canvas: [
          { type: 'line', x1: 0, y1: 3, x2: 16, y2: 3, lineColor: item.color, lineWidth: 2 },
        ],
        margin: [0, 4, 6, 0],
      },
      { width: '*', text: this.seriesLabel(String(item.key)), style: 'chartLegend' },
    ]);

    return {
      margin: [0, 0, 0, 12],
      stack: [
        { text: title, style: 'chartTitle' },
        {
          columns: legendColumns,
          columnGap: 2,
          margin: [0, 0, 0, 6],
        },
        { canvas },
      ],
    };
  }

  private buildRecordsTable(records: SessionData[]): any {
    const body: TableCell[][] = [
      [
        'Hora',
        'Pulso',
        'SpO2',
        'Presion',
        'Flujo',
        'Pico esp.',
        'Freq. resp.',
        'Vol. esp.',
      ].map((label) => ({ text: label, style: 'tableHeader', fillColor: '#e2e8f0' })),
    ];

    records.forEach((record, index) => {
      body.push([
        this.formatTime(record.recordedAt),
        `${record.pulse}`,
        `${record.oxygenSaturation}`,
        `${record.lungCapacity.toFixed(2)} kPa`,
        `${record.airFlow.toFixed(1)} SLM`,
        `${record.peakExpiratoryFlow.toFixed(1)} SLM`,
        `${record.respiratoryRate.toFixed(1)} rpm`,
        `${record.expiratoryVolume.toFixed(2)} L`,
      ].map((value) => ({ text: value, style: 'tableCell', fillColor: index % 2 === 0 ? '#ffffff' : '#f8fafc' })));
    });

    return {
      table: {
        headerRows: 1,
        widths: [56, 42, 42, 60, 58, 66, 62, 58],
        body,
      },
      layout: {
        hLineColor: () => '#cbd5e1',
        vLineColor: () => '#cbd5e1',
        hLineWidth: () => 0.7,
        vLineWidth: () => 0.7,
        paddingTop: () => 5,
        paddingBottom: () => 5,
        paddingLeft: () => 6,
        paddingRight: () => 6,
      },
    };
  }

  private seriesLabel(key: string) {
    switch (key) {
      case 'pulse':
        return 'Pulso';
      case 'oxygenSaturation':
        return 'SpO2';
      case 'lungCapacity':
        return 'Presion respiratoria';
      case 'airFlow':
        return 'Flujo de aire';
      case 'peakExpiratoryFlow':
        return 'Flujo pico espiratorio';
      case 'respiratoryRate':
        return 'Frecuencia respiratoria';
      case 'expiratoryVolume':
        return 'Volumen espiratorio';
      default:
        return key;
    }
  }

  private formatDateTime(date: Date) {
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private formatTime(date: Date) {
    return new Date(date).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
}
