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
