// src/app/user/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserType } from '../enums/user-type';
import { Status } from '../../../context/shared/models/active.model';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  fullname: string;

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Index({ unique: true })
  @Column({ nullable: true })
  ci: string;

  @Column({ nullable: true })
  phone: string;

  @Index({ unique: true })
  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ type: 'simple-enum', enum: UserType })
  type: UserType;

  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'simple-enum', enum: Status })
  status: Status;
}
