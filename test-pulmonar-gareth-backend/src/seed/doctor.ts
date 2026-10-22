import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app/app.module';
import { UserType } from 'src/app/users/enums/user-type';
import { AuthService } from 'src/context/auth/auth.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const auth = app.get(AuthService);
  const logger = new Logger('AdminSeeder');
  try {
    await auth.register({
      firstName: process.env.ADMIN_FIRST_NAME ?? 'Administrador',
      lastName: process.env.ADMIN_LAST_NAME ?? 'Gary',
      ci: process.env.ADMIN_CI ?? 'ADMIN-001',
      phone: process.env.ADMIN_PHONE ?? '70000000',
      email: process.env.ADMIN_EMAIL ?? 'admin@gary.local',
      password: process.env.ADMIN_PASSWORD ?? 'CambiarAdmin123!',
      role: UserType.DOCTOR,
    });
    logger.log('Cuenta administrativa creada. Cambie las credenciales predeterminadas.');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    if (message.includes('ya está registrado')) logger.log('La cuenta administrativa ya existe.');
    else throw error;
  } finally { await app.close(); }
}
void bootstrap();
