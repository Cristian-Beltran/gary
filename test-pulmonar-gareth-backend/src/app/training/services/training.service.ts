import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTrainingLogDto } from '../dtos/create-training-log.dto';
import { TrainingLog } from '../entities/training-log.entity';

const patientExercises = [
  {
    id: 'force-1',
    title: 'Soplido sostenido',
    goal: 'Mejorar fuerza espiratoria',
    durationSec: 20,
    rounds: 5,
    restSec: 20,
    level: 'Basico',
  },
  {
    id: 'flow-1',
    title: 'Ritmo 4-4',
    goal: 'Mejorar flujo de aire',
    durationSec: 16,
    rounds: 6,
    restSec: 15,
    level: 'Basico',
  },
  {
    id: 'flow-2',
    title: 'Diafragmatica guiada',
    goal: 'Controlar respiracion',
    durationSec: 30,
    rounds: 4,
    restSec: 25,
    level: 'Medio',
  },
];

const doctorExercises = [
  {
    id: 'mid-1',
    title: 'Soplido corto x3',
    cue: 'Aplicar cuando la presion sea baja y variable',
    durationSec: 40,
  },
  {
    id: 'mid-2',
    title: 'Inspiracion nasal 4s + espiracion 4s',
    cue: 'Aplicar para estabilizar ritmo respiratorio',
    durationSec: 60,
  },
  {
    id: 'mid-3',
    title: 'Pausa y reinicio suave',
    cue: 'Aplicar si hay fatiga o mareo leve',
    durationSec: 45,
  },
];

@Injectable()
export class TrainingService {
  constructor(
    @InjectRepository(TrainingLog)
    private readonly trainingLogRepo: Repository<TrainingLog>,
  ) {}

  getPatientExercises() {
    return patientExercises;
  }

  getDoctorExercises() {
    return doctorExercises;
  }

  createLog(dto: CreateTrainingLogDto) {
    const log = this.trainingLogRepo.create(dto);
    return this.trainingLogRepo.save(log);
  }

  findLogsByPatientUser(patientUserId: string) {
    return this.trainingLogRepo.find({
      where: { patientUserId },
      order: { completedAt: 'DESC' },
      take: 50,
    });
  }

  findLogsBySession(sessionId: string) {
    return this.trainingLogRepo.find({
      where: { sessionId },
      order: { completedAt: 'DESC' },
      take: 100,
    });
  }
}
