import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from '../entities/assignment.entity';
import { Patient } from '../entities/patient.entity';
import { Doctor } from '../entities/doctor.entity';
import { UserType } from '../enums/user-type';

@Injectable()
export class AssignmentService {
  constructor(
    @InjectRepository(Assignment) private readonly assignments: Repository<Assignment>,
    @InjectRepository(Patient) private readonly patients: Repository<Patient>,
    @InjectRepository(Doctor) private readonly doctors: Repository<Doctor>,
  ) {}

  private async patientForUser(userId: string) {
    const patient = await this.patients.findOne({ where: { user: { id: userId } }, relations: ['user'] });
    if (!patient) throw new ForbiddenException('La cuenta no tiene perfil de paciente');
    return patient;
  }

  async availableDoctors(query = '') {
    return this.doctors.createQueryBuilder('doctor').leftJoinAndSelect('doctor.user', 'user')
      .where('user.status = :status', { status: 'active' })
      .andWhere('(LOWER(user.firstName) LIKE :q OR LOWER(user.lastName) LIKE :q OR LOWER(user.fullname) LIKE :q)', { q: `%${query.toLowerCase()}%` })
      .orderBy('user.lastName', 'ASC').getMany();
  }

  async mine(userId: string) {
    const patient = await this.patientForUser(userId);
    return this.assignments.find({ where: { patient: { id: patient.id }, active: true }, relations: ['doctor', 'doctor.user'], order: { assignedAt: 'DESC' } });
  }

  async assign(userId: string, doctorId: string) {
    const patient = await this.patientForUser(userId);
    const doctor = await this.doctors.findOne({ where: { id: doctorId }, relations: ['user'] });
    if (!doctor) throw new NotFoundException('Doctor no encontrado');
    const existing = await this.assignments.findOne({ where: { patient: { id: patient.id }, doctor: { id: doctor.id } } });
    if (existing?.active) throw new ConflictException('El doctor ya está asignado');
    if (existing) { existing.active = true; existing.endedAt = undefined; return this.assignments.save(existing); }
    return this.assignments.save(this.assignments.create({ patient, doctor }));
  }

  async end(userId: string, doctorId: string) {
    const patient = await this.patientForUser(userId);
    const assignment = await this.assignments.findOne({ where: { patient: { id: patient.id }, doctor: { id: doctorId }, active: true } });
    if (!assignment) throw new NotFoundException('Asignación activa no encontrada');
    assignment.active = false; assignment.endedAt = new Date();
    return this.assignments.save(assignment);
  }

  async patientsForDoctor(userId: string) {
    const doctor = await this.doctors.findOne({ where: { user: { id: userId } }, relations: ['user'] });
    if (!doctor) throw new ForbiddenException('La cuenta no tiene perfil de doctor');
    return this.assignments.find({ where: { doctor: { id: doctor.id }, active: true }, relations: ['patient', 'patient.user'], order: { assignedAt: 'DESC' } });
  }

  async assertCanAccessPatient(userId: string, type: UserType, patientId: string, sessionDate = new Date()) {
    if (type === UserType.PATIENT) {
      const patient = await this.patientForUser(userId);
      if (patient.id !== patientId) throw new ForbiddenException('No puede acceder a otro paciente');
      return;
    }
    if (type !== UserType.DOCTOR) throw new ForbiddenException('Rol no autorizado');
    const doctor = await this.doctors.findOne({ where: { user: { id: userId } } });
    const assignment = doctor && await this.assignments.createQueryBuilder('assignment')
      .where('assignment.patientId = :patientId AND assignment.doctorId = :doctorId', { patientId, doctorId: doctor.id })
      .andWhere('(assignment.active = :active OR assignment.endedAt >= :sessionDate)', { active: true, sessionDate })
      .getOne();
    if (!assignment) throw new ForbiddenException('No tiene autorización para este paciente');
  }
}
