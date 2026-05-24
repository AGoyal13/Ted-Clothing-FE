export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
