import { IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsUUID('4')
  patientId: string;
}
