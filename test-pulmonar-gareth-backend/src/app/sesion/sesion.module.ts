// src/app/session/session.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfModule } from 'src/context/pdf/pdf.module';
import { Session } from './entities/session.entity';
import { SessionData } from './entities/session-data.entity';
import { Patient } from '../users/entities/patient.entity';
import { SessionService } from './services/session.service';
import { MqttTelemetryService } from './services/mqtt-telemetry.service';
import { TelemetryAnalysisService } from './services/telemetry-analysis.service';
import { SessionReportService } from './services/session-report.service';
import { SessionController } from './api/session.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Session, SessionData, Patient]), PdfModule],
  providers: [SessionService, MqttTelemetryService, TelemetryAnalysisService, SessionReportService],
  controllers: [SessionController],
  exports: [SessionService],
})
export class SessionModule {}
