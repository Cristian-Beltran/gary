import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingController } from './api/training.controller';
import { TrainingLog } from './entities/training-log.entity';
import { TrainingService } from './services/training.service';
import { Exercise } from './entities/exercise.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TrainingLog, Exercise])],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
