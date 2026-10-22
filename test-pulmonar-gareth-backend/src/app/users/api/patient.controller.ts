// src/app/user/controllers/patient.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { PatientService } from '../services/patient.service';
import { CreatePatientDto } from '../dtos/patient.dto';
import { JwtAuthGuard } from 'src/context/shared/guards/jwt-auth.guard';
import { Status } from 'src/context/shared/models/active.model';
import { UserPayload } from 'src/context/shared/decorators/user.decorator';
import { PayloadToken } from 'src/context/shared/models/token.model';
import { UserType } from '../enums/user-type';
import { ForbiddenException } from '@nestjs/common';

@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Post()
  create(@Body() dto: CreatePatientDto) {
    return this.patientService.create(dto);
  }

  @Get()
  findAll(@UserPayload() user: PayloadToken) {
    if (user.type !== UserType.DOCTOR) {
      throw new ForbiddenException('Solo los doctores pueden consultar el listado de pacientes');
    }
    return this.patientService.findAll();
  }

  @Get('me')
  getMyPatientProfile(@UserPayload() user: PayloadToken) {
    if (user.type !== UserType.PATIENT) {
      throw new ForbiddenException('Esta cuenta no corresponde a un paciente');
    }
    return this.patientService.findOne(user.sub);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.patientService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: Partial<CreatePatientDto>,
  ) {
    return this.patientService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.patientService.remove(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: { status: Status },
  ) {
    return this.patientService.updateStatus(id, dto.status);
  }
}
