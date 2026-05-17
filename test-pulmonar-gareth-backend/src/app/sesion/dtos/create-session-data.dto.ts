// src/app/session/dto/create-session-data.dto.ts
import { IsInt, IsNumber } from 'class-validator';

export class CreateSessionDataDto {
  @IsNumber()
  lungCapacity: number; // valor clínico ya transformado

  @IsInt()
  pulse: number;

  @IsInt()
  oxygenSaturation: number;
}
