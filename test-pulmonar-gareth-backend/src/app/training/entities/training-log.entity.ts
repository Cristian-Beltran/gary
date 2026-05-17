import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('training_logs')
export class TrainingLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  patientUserId: string;

  @Column({ nullable: true })
  doctorUserId?: string;

  @Column({ nullable: true })
  sessionId?: string;

  @Column()
  exerciseId: string;

  @Column('int')
  durationSec: number;

  @Column('int')
  rounds: number;

  @Column({ default: 'patient' })
  source: 'patient' | 'doctor';

  @CreateDateColumn()
  completedAt: Date;
}
