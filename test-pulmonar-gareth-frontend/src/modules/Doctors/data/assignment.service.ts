import axios from '@/lib/axios';

export type DoctorAssignment = {
  id: string;
  assignedAt: string;
  doctor: { id: string; specialty?: string; licenseNumber?: string; user: { fullname: string; email: string } };
};

export type AvailableDoctor = DoctorAssignment['doctor'];
export type AssignedPatient = { id: string; assignedAt: string; patient: { id: string; user: { fullname: string; ci?: string; email: string } } };

export const assignmentService = {
  available: async (q = '') => (await axios.get<AvailableDoctor[]>('/assignments/doctors', { params: { q } })).data,
  mine: async () => (await axios.get<DoctorAssignment[]>('/assignments/mine')).data,
  assign: async (doctorId: string) => (await axios.post(`/assignments/doctors/${doctorId}`)).data,
  remove: async (doctorId: string) => (await axios.delete(`/assignments/doctors/${doctorId}`)).data,
  patients: async () => (await axios.get<AssignedPatient[]>('/assignments/patients')).data,
};
