import type { AuthResponse, Profile, LoginDto, RegisterDto } from "./auth.interface";
import axios from "@/lib/axios";

export const authService = {
  login: async (data: LoginDto): Promise<AuthResponse> => {
    const res = await axios.post<AuthResponse>("/auth/login", data);
    return res.data;
  },
  register: async (data: RegisterDto): Promise<AuthResponse> => {
    const res = await axios.post<AuthResponse>("/auth/register", data);
    return res.data;
  },
  verifyToken: async (): Promise<{
    valid: boolean;
    user: Profile;
  }> => {
    const res = await axios.get("/auth/verify-token");
    return res.data;
  },
};
