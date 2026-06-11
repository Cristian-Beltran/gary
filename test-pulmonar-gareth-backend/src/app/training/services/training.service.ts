import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTrainingLogDto } from '../dtos/create-training-log.dto';
import { TrainingLog } from '../entities/training-log.entity';

const patientExercises = [
  {
    id: 'video-1',
    title: 'Respiracion abdomino-diafragmatica',
    goal: 'Favorecer expansion abdominal y control de la exhalacion',
    durationSec: 30,
    rounds: 4,
    restSec: 20,
    level: 'Basico',
    videoUrl: '/videos/1.mp4',
    videoTitle: 'Respiracion abdomino-diafragmatica',
    videoDescription: 'Inhala llevando el aire al abdomen y exhala de forma lenta y controlada.',
  },
  {
    id: 'video-2',
    title: 'Respiracion costal inferior',
    goal: 'Expandir la zona costal inferior durante la inspiracion',
    durationSec: 30,
    rounds: 4,
    restSec: 20,
    level: 'Basico',
    videoUrl: '/videos/2.mp4',
    videoTitle: 'Respiracion costal inferior',
    videoDescription: 'Dirige el aire hacia la parte baja de las costillas y exhala sin forzar.',
  },
  {
    id: 'video-3',
    title: 'Respiracion con elevacion de brazos',
    goal: 'Coordinar inspiracion con elevacion de brazos y exhalacion al descender',
    durationSec: 30,
    rounds: 4,
    restSec: 25,
    level: 'Medio',
    videoUrl: '/videos/3.mp4',
    videoTitle: 'Respiracion con elevacion de brazos',
    videoDescription: 'Eleva los brazos al inspirar y bajalos lentamente mientras exhalas.',
  },
];

const doctorExercises = [
  {
    id: 'video-1',
    title: 'Respiracion abdomino-diafragmatica',
    cue: 'Util para mejorar el control abdominal cuando el flujo es debil',
    durationSec: 30,
    rounds: 4,
    restSec: 20,
    level: 'Basico',
    videoUrl: '/videos/1.mp4',
    videoTitle: 'Respiracion abdomino-diafragmatica',
    videoDescription: 'Inhala llevando el aire al abdomen y exhala de forma lenta y controlada.',
  },
  {
    id: 'video-2',
    title: 'Respiracion costal inferior',
    cue: 'Ayuda a ampliar la movilidad costal cuando el patron es superficial',
    durationSec: 30,
    rounds: 4,
    restSec: 20,
    level: 'Basico',
    videoUrl: '/videos/2.mp4',
    videoTitle: 'Respiracion costal inferior',
    videoDescription: 'Dirige el aire hacia la parte baja de las costillas y exhala sin forzar.',
  },
  {
    id: 'video-3',
    title: 'Respiracion con elevacion de brazos',
    cue: 'Favorece coordinacion toracica y amplitud respiratoria',
    durationSec: 30,
    rounds: 4,
    restSec: 25,
    level: 'Medio',
    videoUrl: '/videos/3.mp4',
    videoTitle: 'Respiracion con elevacion de brazos',
    videoDescription: 'Eleva los brazos al inspirar y bajalos lentamente mientras exhalas.',
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
