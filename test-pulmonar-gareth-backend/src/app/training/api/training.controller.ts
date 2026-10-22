import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CreateTrainingLogDto } from '../dtos/create-training-log.dto';
import { TrainingService } from '../services/training.service';
import { ExerciseDto } from '../dtos/exercise.dto';
import { JwtAuthGuard } from 'src/context/shared/guards/jwt-auth.guard';
import { UserTypeGuard } from 'src/context/shared/guards/type-user.guard';
import { UserTypes } from 'src/context/shared/decorators/type-user.decorator';
import { UserType } from 'src/app/users/enums/user-type';

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

  @Post('exercises') @UseGuards(JwtAuthGuard, UserTypeGuard) @UserTypes(UserType.DOCTOR)
  createExercise(@Body() dto: ExerciseDto) { return this.trainingService.createExercise(dto); }

  @Patch('exercises/:id') @UseGuards(JwtAuthGuard, UserTypeGuard) @UserTypes(UserType.DOCTOR)
  updateExercise(@Param('id') id: string, @Body() dto: Partial<ExerciseDto>) { return this.trainingService.updateExercise(id, dto); }

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
