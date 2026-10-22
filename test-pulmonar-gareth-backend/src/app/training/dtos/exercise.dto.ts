import { IsBoolean, IsOptional, IsString } from 'class-validator';
export class ExerciseDto {
  @IsString() title: string;
  @IsString() description: string;
  @IsString() instructions: string;
  @IsString() level: string;
  @IsOptional() @IsString() animation?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
