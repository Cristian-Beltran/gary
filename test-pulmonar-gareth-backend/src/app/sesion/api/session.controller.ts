// src/app/session/session.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { SessionService } from '../services/session.service';
import { MqttTelemetryService } from '../services/mqtt-telemetry.service';
import { SessionReportService } from '../services/session-report.service';
import { CreateSessionDto } from '../dtos/create-session.dto';
import { CreateSessionDataDto } from '../dtos/create-session-data.dto';

@Controller('sessions')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly mqttTelemetryService: MqttTelemetryService,
    private readonly sessionReportService: SessionReportService,
  ) {}

  // POST /sessions  -> crea una sesión
  @Post()
  async createSession(@Body() dto: CreateSessionDto) {
    const session = await this.sessionService.createSession(dto);
    await this.mqttTelemetryService.publishMonitoringControl(true);
    return session;
  }

  // POST /sessions/:id/data -> agrega una fila de datos a la sesión
  @Post(':id/data')
  addData(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateSessionDataDto,
  ) {
    return this.sessionService.addSessionData(id, dto);
  }

  @Patch(':id/close')
  async closeSession(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const session = await this.sessionService.closeSession(id);
    await this.mqttTelemetryService.publishMonitoringControl(false);
    return session;
  }

  @Get()
  getAll() {
    return this.sessionService.getAll();
  }

  @Get('by-patient/:patientId')
  findByPatient(
    @Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string,
  ) {
    return this.sessionService.findByPatient(patientId);
  }

  @Get(':id/report')
  async downloadSessionReport(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Res() response: Response,
  ) {
    const pdf = await this.sessionReportService.generateSessionReport(id);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="reporte-sesion-${id.slice(0, 8)}.pdf"`,
    );
    response.setHeader('Content-Length', String(pdf.length));
    response.end(pdf);
  }

  @Get('active')
  getActiveSession() {
    return this.sessionService.getActiveSession();
  }

  @Get('monitoring/latest')
  getLatestMonitoringTelemetry() {
    return this.mqttTelemetryService.getLatestTelemetry();
  }

  @Get('monitoring/device-status')
  getMonitoringDeviceStatus() {
    return this.mqttTelemetryService.getDeviceStatus();
  }

  @Get('monitoring/analysis')
  getLatestMonitoringAnalysis() {
    return this.mqttTelemetryService.getLatestAnalysis();
  }
}
