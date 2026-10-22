import axios from '@/lib/axios';
import type { Profile } from '@/auth/auth.interface';

export const profileService = {
  get: async () => (await axios.get<Profile>('/profile')).data,
  update: async (data: Pick<Profile, 'firstName' | 'lastName' | 'phone' | 'email'>) => (await axios.patch<Profile>('/profile', data)).data,
  changePassword: async (currentPassword: string, newPassword: string) => axios.patch('/profile/password', { currentPassword, newPassword }),
};
