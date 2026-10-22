import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('exercises')
export class Exercise {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() title: string;
  @Column('text') description: string;
  @Column('text') instructions: string;
  @Column({ default: 'Básico' }) level: string;
  @Column({ nullable: true }) animation?: string;
  @Column({ default: 30 }) durationSec: number;
  @Column({ default: 4 }) rounds: number;
  @Column({ default: 20 }) restSec: number;
  @Column({ nullable: true }) videoUrl?: string;
  @Column({ default: true }) active: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}
