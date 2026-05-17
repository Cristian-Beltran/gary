import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from 'src/context/database/database.module';
import config from 'src/context/shared/config';
import { LoggerModule } from 'src/context/shared/logger';
// entry point
import { AuthModule } from 'src/context/auth/auth.module';
import { PdfModule } from 'src/context/pdf/pdf.module';
import { UsersModule } from './users/user.module';
import { SessionModule } from './sesion/sesion.module';
import { TrainingModule } from './training/training.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [config],
      isGlobal: true,
    }),
    DatabaseModule,
    UsersModule,
    PdfModule,
    LoggerModule,
    AuthModule,
    SessionModule,
    TrainingModule,
  ],
})
export class AppModule {}
