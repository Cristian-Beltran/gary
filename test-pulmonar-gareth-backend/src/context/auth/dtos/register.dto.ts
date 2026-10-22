import { IsEmail, IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { UserType } from 'src/app/users/enums/user-type';

export class RegisterDto {
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsString() @IsNotEmpty() ci: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsEnum([UserType.PATIENT, UserType.DOCTOR]) role: UserType.PATIENT | UserType.DOCTOR;
}
