import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { User } from 'src/app/users/entities/user.entity';
import { UserType } from 'src/app/users/enums/user-type';
import { Repository } from 'typeorm';
import { PayloadToken } from '../shared/models/token.model';
import { LoginDto } from './dtos/login.dto';
import { Status } from '../shared/models/active.model';
import { Patient } from 'src/app/users/entities/patient.entity';
import { Doctor } from 'src/app/users/entities/doctor.entity';
import { RegisterDto } from './dtos/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(Patient) private patientRepository: Repository<Patient>,
    @InjectRepository(Doctor) private doctorRepository: Repository<Doctor>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { ci: loginDto.ci, status: Status.ACTIVE },
    });
    if (!user) throw new UnauthorizedException('Invalid access');
    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch || user.type !== loginDto.role)
      throw new UnauthorizedException('CI, contraseña o rol inválido');
    return {
      user,
    };
  }

  async register(dto: RegisterDto) {
    const [byCi, byEmail] = await Promise.all([
      this.userRepository.findOne({ where: { ci: dto.ci.trim() } }),
      this.userRepository.findOne({ where: { email: dto.email.trim().toLowerCase() } }),
    ]);
    if (byCi) throw new BadRequestException('El CI ya está registrado');
    if (byEmail) throw new BadRequestException('El correo ya está registrado');
    const user = await this.userRepository.save(this.userRepository.create({
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      fullname: `${dto.firstName.trim()} ${dto.lastName.trim()}`,
      ci: dto.ci.trim(), phone: dto.phone.trim(),
      email: dto.email.trim().toLowerCase(), password: await bcrypt.hash(dto.password, 12),
      type: dto.role, status: Status.ACTIVE,
    }));
    if (dto.role === UserType.PATIENT)
      await this.patientRepository.save(this.patientRepository.create({ user }));
    else await this.doctorRepository.save(this.doctorRepository.create({ user }));
    return this.generateJWT(user);
  }

  async generateJWT(user: User) {
    const payload = this.buildPayload(user);
    return {
      user,
      access_token: this.jwtService.sign(payload, {
        expiresIn: '3d', // ajusta si es necesario
      }),
    };
  }

  async validateUserJwt(id: string) {
    const user = await this.userRepository.findOne({
      where: { id, status: Status.ACTIVE },
    });
    if (!user) throw new UnauthorizedException('Invalid access');
    return {
      ...user,
    };
  }

  verifyMagicLinkToken(token: string): PayloadToken {
    return this.jwtService.verify(token);
  }

  private buildPayload(user: User): PayloadToken {
    return {
      sub: user.id,
      email: user.email,
      type: user.type,
    };
  }
}
