import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateTrainingLogDto } from '../dtos/create-training-log.dto';
import { TrainingService } from '../services/training.service';

@Controller('training')
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('patient-exercises')
  getPatientExercises() {
    return this.trainingService.getPatientExercises();
  }

  @Get('doctor-exercises')
  getDoctorExercises() {
    return this.trainingService.getDoctorExercises();
  }

  @Post('logs')
  createLog(@Body() dto: CreateTrainingLogDto) {
    return this.trainingService.createLog(dto);
  }

  @Get('logs/:patientUserId')
  getLogs(@Param('patientUserId') patientUserId: string) {
    return this.trainingService.findLogsByPatientUser(patientUserId);
  }

  @Get('session-logs/:sessionId')
  getSessionLogs(@Param('sessionId') sessionId: string) {
    return this.trainingService.findLogsBySession(sessionId);
  }
}
