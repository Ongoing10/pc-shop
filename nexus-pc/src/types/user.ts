export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  birthDate?: string;
  avatar?: string;
  createdAt?: string;
}

/** Sổ địa chỉ, cùng tên trường với GET /addresses (đơn vị hành chính 2 cấp tỉnh → phường/xã) */
export interface UserAddress {
  id: string;
  isDefault: boolean;
  receiverName: string;
  receiverPhone: string;
  provinceCode: string;
  provinceName: string;
  wardCode: string;
  wardName: string;
  addressDetail: string;
}

export type UserAddressInput = Omit<UserAddress, 'id'>;

export interface Province {
  code: string;
  name: string;
}

export interface Ward {
  code: string;
  name: string;
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
