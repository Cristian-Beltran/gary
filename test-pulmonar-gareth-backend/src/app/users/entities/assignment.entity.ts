import { CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Column } from 'typeorm';
import { Patient } from './patient.entity';
import { Doctor } from './doctor.entity';

@Entity('assignments')
@Index(['patient', 'doctor'], { unique: true })
export class Assignment {
  @PrimaryGeneratedColumn('uuid') id: string;
  @ManyToOne(() => Patient, { eager: true }) patient: Patient;
  @ManyToOne(() => Doctor, { eager: true }) doctor: Doctor;
  @CreateDateColumn() assignedAt: Date;
  @Column({ default: true }) active: boolean;
  @Column({ type: 'datetime', nullable: true }) endedAt?: Date;
}
