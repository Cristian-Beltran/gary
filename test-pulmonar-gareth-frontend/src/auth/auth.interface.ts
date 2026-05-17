export type UserType = "patient" | "doctor";

export interface Profile {
  id: string;
  fullname: string;
  email: string;
  type: UserType;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  user: Profile;
}
