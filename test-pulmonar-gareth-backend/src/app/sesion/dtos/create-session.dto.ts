import { IsOptional, IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsUUID('4')
  patientId: string;

  @IsOptional()
  @IsUUID('4')
  exerciseId?: string;
}
