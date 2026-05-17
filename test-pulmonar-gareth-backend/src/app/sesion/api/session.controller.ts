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
  createSession(@Body() dto: CreateSessionDto) {
    return this.sessionService.createSession(dto);
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
  closeSession(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.sessionService.closeSession(id);
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
