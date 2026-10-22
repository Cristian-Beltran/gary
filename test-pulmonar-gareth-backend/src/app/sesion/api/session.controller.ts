// src/app/session/session.controller.ts
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UsePipes,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { SessionService } from '../services/session.service';
import { MqttTelemetryService } from '../services/mqtt-telemetry.service';
import { SessionReportService } from '../services/session-report.service';
import { CreateSessionDto } from '../dtos/create-session.dto';
import { CreateSessionDataDto } from '../dtos/create-session-data.dto';
import { JwtAuthGuard } from 'src/context/shared/guards/jwt-auth.guard';
import { UserPayload } from 'src/context/shared/decorators/user.decorator';
import { PayloadToken } from 'src/context/shared/models/token.model';
import { UserType } from 'src/app/users/enums/user-type';
import { AssignmentService } from 'src/app/users/services/assignment.service';

@Controller('sessions')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class SessionController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly mqttTelemetryService: MqttTelemetryService,
    private readonly sessionReportService: SessionReportService,
    private readonly assignments: AssignmentService,
  ) {}

  // POST /sessions  -> crea una sesión
  @Post()
  async createSession(@Body() dto: CreateSessionDto, @UserPayload() user: PayloadToken) {
    if (user.type !== UserType.PATIENT)
      throw new ForbiddenException('Solo los pacientes pueden iniciar mediciones');
    const session = await this.sessionService.createSession(dto, user.sub);
    await this.mqttTelemetryService.publishMonitoringControl(true);
    return session;
  }

  // POST /sessions/:id/data -> agrega una fila de datos a la sesión
  @Post(':id/data')
  async addData(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: CreateSessionDataDto,
    @UserPayload() user: PayloadToken,
  ) {
    const session = await this.sessionService.findOneDetailed(id);
    await this.assignments.assertCanAccessPatient(user.sub, user.type, session.patient.id, session.startedAt);
    return this.sessionService.addSessionData(id, dto);
  }

  @Patch(':id/close')
  async closeSession(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string, @UserPayload() user: PayloadToken) {
    const current = await this.sessionService.findOneDetailed(id);
    await this.assignments.assertCanAccessPatient(user.sub, user.type, current.patient.id, current.startedAt);
    const session = await this.sessionService.closeSession(id);
    await this.mqttTelemetryService.publishMonitoringControl(false);
    return session;
  }

  @Get()
  async getAll(@UserPayload() user: PayloadToken) {
    const sessions = await this.sessionService.getAll();
    const allowed = await Promise.all(
      sessions.map(async (session) => {
        try {
          await this.assignments.assertCanAccessPatient(
            user.sub,
            user.type,
            session.patient.id,
            session.startedAt,
          );
          return session;
        } catch {
          return null;
        }
      }),
    );
    return allowed.filter((session): session is NonNullable<typeof session> => session !== null);
  }

  @Get('by-patient/:patientId')
  async findByPatient(
    @Param('patientId', new ParseUUIDPipe({ version: '4' })) patientId: string,
    @UserPayload() user: PayloadToken,
  ) {
    await this.assignments.assertCanAccessPatient(user.sub, user.type, patientId);
    return this.sessionService.findByPatient(patientId);
  }

  @Get(':id/report')
  async downloadSessionReport(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Res() response: Response,
    @UserPayload() user: PayloadToken,
  ) {
    const session = await this.sessionService.findOneDetailed(id);
    await this.assignments.assertCanAccessPatient(user.sub, user.type, session.patient.id, session.startedAt);
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
  async getActiveSession(@UserPayload() user: PayloadToken) {
    const active = await this.sessionService.getActiveSession();
    if (!active) return null;
    await this.assignments.assertCanAccessPatient(user.sub, user.type, active.patient.id, active.startedAt);
    return active;
  }

  @Get('monitoring/latest')
  async getLatestMonitoringTelemetry(@UserPayload() user: PayloadToken) {
    await this.assertCanReadActiveMonitoring(user);
    return this.mqttTelemetryService.getLatestTelemetry();
  }

  @Get('monitoring/device-status')
  async getMonitoringDeviceStatus(@UserPayload() user: PayloadToken) {
    await this.assertCanReadActiveMonitoring(user);
    return this.mqttTelemetryService.getDeviceStatus();
  }

  @Get('monitoring/analysis')
  async getLatestMonitoringAnalysis(@UserPayload() user: PayloadToken) {
    await this.assertCanReadActiveMonitoring(user);
    return this.mqttTelemetryService.getLatestAnalysis();
  }

  private async assertCanReadActiveMonitoring(user: PayloadToken) {
    const active = await this.sessionService.getActiveSession();
    if (!active) throw new ForbiddenException('No hay una sesión activa autorizada');
    await this.assignments.assertCanAccessPatient(user.sub, user.type, active.patient.id, active.startedAt);
  }
}
