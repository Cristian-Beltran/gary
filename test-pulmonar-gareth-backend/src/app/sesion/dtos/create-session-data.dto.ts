// src/app/session/dto/create-session-data.dto.ts
import { IsInt, IsNumber } from 'class-validator';

export class CreateSessionDataDto {
  @IsNumber()
  lungCapacity: number; // valor clínico ya transformado

  @IsNumber()
  airFlow: number;

  @IsNumber()
  peakExpiratoryFlow: number;

  @IsNumber()
  respiratoryRate: number;

  @IsNumber()
  expiratoryVolume: number;

  @IsInt()
  pulse: number;

  @IsInt()
  oxygenSaturation: number;
}
