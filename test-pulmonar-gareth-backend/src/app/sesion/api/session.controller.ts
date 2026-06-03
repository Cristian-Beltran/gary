// src/app/session/session.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SessionService } from '../services/session.service';
import { MqttTelemetryService } from '../services/mqtt-telemetry.service';
import { CreateSessionDto } from '../dtos/create-session.dto';
import { CreateSessionDataDto } from '../dtos/create-session-data.dto';

@Controller('sessions')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly mqttTelemetryService: MqttTelemetryService,
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
}
