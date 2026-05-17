// src/services/session/session.service.ts
import axios from "@/lib/axios";
import type {
  Session,
  CreateSessionDto,
  CreateSessionDataDto,
  SessionData,
  DeviceStatus,
  RealtimeTelemetry,
} from "../session.interface";

const BASE_URL = "/sessions";

export const sessionService = {
  create: async (data: CreateSessionDto): Promise<Session> => {
    const res = await axios.post(BASE_URL, data);
    return res.data;
  },
  addData: async (
    sessionId: string,
    data: CreateSessionDataDto,
  ): Promise<SessionData> => {
    const res = await axios.post(`${BASE_URL}/${sessionId}/data`, data);
    return res.data;
  },
  close: async (sessionId: string): Promise<Session> => {
    const res = await axios.patch(`${BASE_URL}/${sessionId}/close`);
    return res.data;
  },
  findAll: async (): Promise<Session[]> => {
    const res = await axios.get(BASE_URL);
    return res.data;
  },

  /** 🔎 Todas las sesiones de un paciente con sus registros */
  findByPatient: async (patientId: string): Promise<Session[]> => {
    const res = await axios.get(`${BASE_URL}/by-patient/${patientId}`);
    return res.data;
  },

  getActive: async (): Promise<Session | null> => {
    const res = await axios.get(`${BASE_URL}/active`);
    return res.data;
  },

  getLatestTelemetry: async (): Promise<RealtimeTelemetry | null> => {
    const res = await axios.get(`${BASE_URL}/monitoring/latest`);
    return res.data;
  },

  getDeviceStatus: async (): Promise<DeviceStatus> => {
    const res = await axios.get(`${BASE_URL}/monitoring/device-status`);
    return res.data;
  },
};
