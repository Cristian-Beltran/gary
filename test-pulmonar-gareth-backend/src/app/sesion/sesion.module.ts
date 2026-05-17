// src/app/session/session.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
import { SessionData } from './entities/session-data.entity';
import { Patient } from '../users/entities/patient.entity';
import { SessionService } from './services/session.service';
import { MqttTelemetryService } from './services/mqtt-telemetry.service';
import { SessionController } from './api/session.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Session, SessionData, Patient])],
  providers: [SessionService, MqttTelemetryService],
  controllers: [SessionController],
  exports: [SessionService],
})
export class SessionModule {}
