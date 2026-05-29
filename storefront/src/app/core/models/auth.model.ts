export interface AuthUser {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}
