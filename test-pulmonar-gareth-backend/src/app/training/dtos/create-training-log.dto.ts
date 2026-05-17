import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTrainingLogDto {
  @IsString()
  patientUserId: string;

  @IsString()
  source: 'patient' | 'doctor';

  @IsOptional()
  @IsString()
  doctorUserId?: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsString()
  exerciseId: string;

  @IsInt()
  @Min(1)
  durationSec: number;

  @IsInt()
  @Min(1)
  rounds: number;
}
