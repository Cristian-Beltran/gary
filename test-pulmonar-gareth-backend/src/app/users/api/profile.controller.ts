import { Body, ConflictException, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from 'src/context/shared/guards/jwt-auth.guard';
import { UserPayload } from 'src/context/shared/decorators/user.decorator';
import { PayloadToken } from 'src/context/shared/models/token.model';
import { User } from '../entities/user.entity';
import { ChangePasswordDto, UpdateProfileDto } from '../dtos/update-profile.dto';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}
  @Get() get(@UserPayload() token: PayloadToken) { return this.users.findOneByOrFail({ id: token.sub }); }
  @Patch() async update(@UserPayload() token: PayloadToken, @Body() dto: UpdateProfileDto) {
    const user = await this.users.findOneByOrFail({ id: token.sub });
    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const duplicate = await this.users.findOne({ where: { email: dto.email.toLowerCase() } });
      if (duplicate) throw new ConflictException('El correo ya está registrado');
      user.email = dto.email.toLowerCase();
    }
    if (dto.firstName !== undefined) user.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) user.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) user.phone = dto.phone.trim();
    user.fullname = [user.firstName, user.lastName].filter(Boolean).join(' ') || user.fullname;
    return this.users.save(user);
  }
  @Patch('password') async password(@UserPayload() token: PayloadToken, @Body() dto: ChangePasswordDto) {
    const user = await this.users.findOneByOrFail({ id: token.sub });
    if (!(await bcrypt.compare(dto.currentPassword, user.password))) throw new ConflictException('La contraseña actual es incorrecta');
    user.password = await bcrypt.hash(dto.newPassword, 12);
    await this.users.save(user);
    return { changed: true };
  }
}
