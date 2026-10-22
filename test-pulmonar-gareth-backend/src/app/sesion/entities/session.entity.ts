// src/app/session/entities/session.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { Patient } from '../../users/entities/patient.entity';
import { Exercise } from '../../training/entities/exercise.entity';
import { SessionData } from './session-data.entity';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Patient, { eager: true })
  patient: Patient;

  @ManyToOne(() => Exercise, { nullable: true, eager: true })
  exercise?: Exercise;

  @CreateDateColumn()
  startedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  endedAt?: Date;

  @Column({ default: 'active' })
  status: 'active' | 'completed' | 'error';

  @Column('integer', { nullable: true })
  durationSeconds?: number;

  @OneToMany(() => SessionData, (data) => data.session, { cascade: true })
  records: SessionData[];
}
