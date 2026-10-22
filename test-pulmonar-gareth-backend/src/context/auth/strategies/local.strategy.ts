import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStragegy extends PassportStrategy(Strategy, 'local') {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'ci',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }
  async validate(request: { body: { role?: string } }, ci: string, password: string) {
    const user = await this.authService.login({ ci, password, role: request.body.role as never });
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
