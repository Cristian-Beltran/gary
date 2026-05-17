import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingController } from './api/training.controller';
import { TrainingLog } from './entities/training-log.entity';
import { TrainingService } from './services/training.service';

@Module({
  imports: [TypeOrmModule.forFeature([TrainingLog])],
  controllers: [TrainingController],
  providers: [TrainingService],
  exports: [TrainingService],
})
export class TrainingModule {}
