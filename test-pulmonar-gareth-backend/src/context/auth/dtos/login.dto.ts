import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { UserType } from 'src/app/users/enums/user-type';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  ci: string;
  @IsString()
  password: string;

  @IsEnum([UserType.PATIENT, UserType.DOCTOR])
  role: UserType.PATIENT | UserType.DOCTOR;
}
