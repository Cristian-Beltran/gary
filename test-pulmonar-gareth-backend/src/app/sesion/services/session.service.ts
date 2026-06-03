// src/app/session/session.service.ts
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Session } from '../entities/session.entity';
import { SessionData } from '../entities/session-data.entity';
import { Patient } from '../../users/entities/patient.entity';
import { CreateSessionDto } from '../dtos/create-session.dto';
import { CreateSessionDataDto } from '../dtos/create-session-data.dto';

@Injectable()
export class SessionService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionRepo: Repository<Session>,
    @InjectRepository(SessionData)
    private readonly dataRepo: Repository<SessionData>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) {}

  /**
   * Crea una sesión para un paciente.
   * startedAt se setea por @CreateDateColumn en la entidad.
   */
  async createSession(dto: CreateSessionDto): Promise<Session> {
    const activeSession = await this.getActiveSession();
    if (activeSession) {
      throw new ConflictException('Ya existe una sesion activa global');
    }

    const patient = await this.patientRepo.findOne({
      where: { id: dto.patientId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const session = this.sessionRepo.create({ patient });
    return this.sessionRepo.save(session);
  }

  /**
   * Inserta un registro (fila) de datos en una sesión existente.
   * recordedAt se setea por @CreateDateColumn en la entidad.
   */
  async addSessionData(
    sessionId: string,
    dto: CreateSessionDataDto,
  ): Promise<SessionData> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const record = this.dataRepo.create({
      session,
      lungCapacity: dto.lungCapacity,
      airFlow: dto.airFlow,
      pulse: dto.pulse,
      oxygenSaturation: dto.oxygenSaturation,
    });

    return this.dataRepo.save(record);
  }

  async closeSession(sessionId: string): Promise<Session> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.endedAt) {
      return session; // ya estaba cerrada; comportamiento idempotente
    }
    session.endedAt = new Date();
    return this.sessionRepo.save(session);
  }

  async getActiveSession(): Promise<Session | null> {
    return this.sessionRepo.findOne({
      where: { endedAt: IsNull() },
      relations: ['patient'],
      order: { startedAt: 'DESC' },
    });
  }

  async findByPatient(patientId: string): Promise<Session[]> {
    const patientExists = await this.patientRepo.exist({
      where: { id: patientId },
    });
    if (!patientExists) throw new NotFoundException('Patient not found');

    const sessions = await this.sessionRepo.find({
      where: { patient: { id: patientId } },
      relations: ['records', 'patient'],
      order: {
        startedAt: 'DESC',
        records: { recordedAt: 'ASC' },
      },
    });

    return sessions;
  }

  async getAll(): Promise<Session[]> {
    const sessions = await this.sessionRepo.find({
      relations: ['records', 'patient'],
      order: {
        startedAt: 'DESC',
        records: { recordedAt: 'ASC' },
      },
    });
    return sessions;
  }
}
