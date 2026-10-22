import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTrainingLogDto } from '../dtos/create-training-log.dto';
import { TrainingLog } from '../entities/training-log.entity';
import { Exercise } from '../entities/exercise.entity';
import { ExerciseDto } from '../dtos/exercise.dto';

const initialExercises = [
  {
    id: 'video-1',
    title: 'Respiracion abdomino-diafragmatica',
    description: 'Favorece expansión abdominal y control de la exhalación.',
    instructions: 'Inhala llevando el aire al abdomen y exhala de forma lenta y controlada.', level: 'Básico', animation: 'diaphragmatic', durationSec: 30, rounds: 4, restSec: 20, videoUrl: '/videos/1.mp4',
  },
  {
    id: 'video-2',
    title: 'Respiracion costal inferior',
    description: 'Expande la zona costal inferior durante la inspiración.',
    instructions: 'Dirige el aire hacia la parte baja de las costillas y exhala sin forzar.', level: 'Básico', animation: 'pursed-lips', durationSec: 30, rounds: 4, restSec: 20, videoUrl: '/videos/2.mp4',
  },
  {
    id: 'video-3',
    title: 'Respiracion con elevacion de brazos',
    description: 'Coordina inspiración con elevación de brazos y espiración al descender.',
    instructions: 'Eleva los brazos al inspirar y bájalos lentamente mientras exhalas.', level: 'Medio', animation: 'balloon', durationSec: 30, rounds: 4, restSec: 25, videoUrl: '/videos/3.mp4',
  },
];

@Injectable()
export class TrainingService implements OnModuleInit {
  constructor(
    @InjectRepository(TrainingLog)
    private readonly trainingLogRepo: Repository<TrainingLog>,
    @InjectRepository(Exercise) private readonly exercises: Repository<Exercise>,
  ) {}

  async onModuleInit() {
    if (await this.exercises.count()) return;
    await this.exercises.save(initialExercises.map((exercise) => this.exercises.create(exercise)));
  }

  async getPatientExercises() { return (await this.exercises.find({ where: { active: true }, order: { level: 'ASC', title: 'ASC' } })).map((item) => ({ ...item, goal: item.description, videoTitle: item.title, videoDescription: item.instructions })); }

  async getDoctorExercises() { return (await this.exercises.find({ order: { active: 'DESC', title: 'ASC' } })).map((item) => ({ ...item, cue: item.description, videoTitle: item.title, videoDescription: item.instructions })); }
  createExercise(dto: ExerciseDto) { return this.exercises.save(this.exercises.create(dto)); }
  async updateExercise(id: string, dto: Partial<ExerciseDto>) {
    await this.exercises.update(id, dto); return this.exercises.findOneByOrFail({ id });
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
