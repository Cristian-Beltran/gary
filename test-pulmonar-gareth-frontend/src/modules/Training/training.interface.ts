export interface TrainingExercise {
  id: string;
  title: string;
  goal?: string;
  cue?: string;
  videoUrl?: string;
  videoTitle?: string;
  videoDescription?: string;
  durationSec: number;
  rounds?: number;
  restSec?: number;
  level?: string;
  description?: string;
  instructions?: string;
  active?: boolean;
}

export interface ExerciseInput {
  title: string;
  description: string;
  instructions: string;
  level: string;
  active?: boolean;
}

export interface CreateTrainingLogDto {
  patientUserId: string;
  source: "patient" | "doctor";
  doctorUserId?: string;
  sessionId?: string;
  exerciseId: string;
  durationSec: number;
  rounds: number;
}

export interface TrainingLog {
  id: string;
  patientUserId: string;
  source: "patient" | "doctor";
  doctorUserId?: string;
  sessionId?: string;
  exerciseId: string;
  durationSec: number;
  rounds: number;
  completedAt: string;
}
