export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate?: string;
  avatar?: string;
  createdAt?: string;
}

export interface UserAddress {
  id: string;
  isDefault: boolean;
  receiverName: string;
  phone: string;
  address: string;
  city: string;
}

export interface LoginCredentials {
  identifier: string; // email or phone
  password: string;
  remember?: boolean;
}

export interface RegisterData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword?: string;
}

export interface ForgotPasswordRequest {
  identifier: string;
}

export interface ResetPasswordData {
  identifier: string;
  resetCode: string;
  newPassword: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
