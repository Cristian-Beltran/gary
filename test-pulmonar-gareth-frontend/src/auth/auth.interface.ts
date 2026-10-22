export type UserType = "patient" | "doctor";

export interface Profile {
  id: string;
  fullname: string;
  firstName?: string;
  lastName?: string;
  ci?: string;
  phone?: string;
  email: string;
  type: UserType;
}

export interface LoginDto {
  ci: string;
  password: string;
  role: UserType;
}

export interface RegisterDto {
  firstName: string; lastName: string; ci: string; phone: string;
  email: string; password: string; role: UserType;
}

export interface AuthResponse {
  access_token: string;
  user: Profile;
}
