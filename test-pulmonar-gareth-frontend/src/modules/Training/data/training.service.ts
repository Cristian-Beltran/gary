import axios from "@/lib/axios";
import type {
  CreateTrainingLogDto,
  ExerciseInput,
  TrainingExercise,
  TrainingLog,
} from "../training.interface";

const BASE_URL = "/training";

export const trainingService = {
  getPatientExercises: async (): Promise<TrainingExercise[]> => {
    const res = await axios.get(`${BASE_URL}/patient-exercises`);
    return res.data;
  },

  getDoctorExercises: async (): Promise<TrainingExercise[]> => {
    const res = await axios.get(`${BASE_URL}/doctor-exercises`);
    return res.data;
  },
  createExercise: async (payload: ExerciseInput): Promise<TrainingExercise> => (await axios.post(`${BASE_URL}/exercises`, payload)).data,
  updateExercise: async (id: string, payload: Partial<ExerciseInput>): Promise<TrainingExercise> => (await axios.patch(`${BASE_URL}/exercises/${id}`, payload)).data,

  createLog: async (payload: CreateTrainingLogDto): Promise<TrainingLog> => {
    const res = await axios.post(`${BASE_URL}/logs`, payload);
    return res.data;
  },

  getLogsByPatientUser: async (patientUserId: string): Promise<TrainingLog[]> => {
    const res = await axios.get(`${BASE_URL}/logs/${patientUserId}`);
    return res.data;
  },

  getLogsBySession: async (sessionId: string): Promise<TrainingLog[]> => {
    const res = await axios.get(`${BASE_URL}/session-logs/${sessionId}`);
    return res.data;
  },
};
