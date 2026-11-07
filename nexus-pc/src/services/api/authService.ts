import {
  UserProfile,
  LoginCredentials,
  RegisterData,
  ResetPasswordData,
  ChangePasswordData,
} from '../../types/user';
import { storageService } from '../storage/storageService';

const ACCOUNTS_STORAGE_KEY = 'nexus_auth_accounts';
const CURRENT_USER_KEY = 'nexus_current_user';
const TOKEN_KEY = 'nexus_auth_token';
const RESET_CODES_KEY = 'nexus_reset_codes';

export interface StoredAccount {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  passwordHash: string; // Plain/hashed for mock service
  birthDate?: string;
  avatar?: string;
  createdAt: string;
}

// Default initial mock accounts
const DEFAULT_ACCOUNTS: StoredAccount[] = [
  {
    id: 'usr_default_01',
    fullName: 'Khách hàng NEXUS',
    email: 'khachhang@nexuspc.vn',
    phone: '0988888888',
    passwordHash: '123456',
    birthDate: '1998-05-15',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'usr_demo_vip',
    fullName: 'Hoàng Long PC Master',
    email: 'long.pc@nexuspc.vn',
    phone: '0912345678',
    passwordHash: 'Nexus@2026',
    birthDate: '1995-10-20',
    createdAt: '2026-01-15T00:00:00.000Z',
  },
];

/**
 * Pure Validation Functions (Decoupled for unit testing)
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
};

export const validatePhone = (phone: string): boolean => {
  // Vietnamese phone format (10-11 digits, starts with 0 or +84)
  const phoneClean = phone.replace(/[\s.-]/g, '');
  const phoneRegex = /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/;
  return phoneRegex.test(phoneClean);
};

export interface PasswordRequirements {
  minLength: boolean;
  hasNumber: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasSpecial: boolean;
  isValid: boolean;
}

export const checkPasswordRequirements = (password: string): PasswordRequirements => {
  const minLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const isValid = minLength; // Minimum baseline is 6 characters
  return {
    minLength,
    hasNumber,
    hasUpper,
    hasLower,
    hasSpecial,
    isValid,
  };
};

export const evaluatePasswordStrength = (
  password: string
): { score: number; label: string; color: string } => {
  if (!password) {
    return { score: 0, label: 'Chưa nhập', color: '#666' };
  }

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

  if (score <= 1) {
    return { score: 20, label: 'Yếu', color: '#f5222d' };
  } else if (score <= 3) {
    return { score: 60, label: 'Trung bình', color: '#faad14' };
  } else {
    return { score: 100, label: 'Mạnh', color: '#52c41a' };
  }
};

/**
 * Storage helpers
 */
const getStoredAccounts = (): StoredAccount[] => {
  const accounts = storageService.get<StoredAccount[]>(ACCOUNTS_STORAGE_KEY, []);
  if (!accounts || accounts.length === 0) {
    storageService.set(ACCOUNTS_STORAGE_KEY, DEFAULT_ACCOUNTS);
    return DEFAULT_ACCOUNTS;
  }
  return accounts;
};

const saveStoredAccounts = (accounts: StoredAccount[]): void => {
  storageService.set(ACCOUNTS_STORAGE_KEY, accounts);
};

interface ResetCodeEntry {
  identifier: string;
  code: string;
  expiresAt: number;
}

/**
 * Core Auth Service
 */
export const authService = {
  /**
   * Log in user by email or phone
   */
  async login(credentials: LoginCredentials): Promise<{ user: UserProfile; token: string }> {
    // Artificial latency for realistic UI feedback
    await new Promise((r) => setTimeout(r, 200));

    const cleanIdentifier = credentials.identifier.trim().toLowerCase();
    const cleanPass = credentials.password;

    if (!cleanIdentifier || !cleanPass) {
      throw new Error('Vui lòng nhập đầy đủ tài khoản và mật khẩu.');
    }

    const accounts = getStoredAccounts();
    const found = accounts.find(
      (acc) =>
        acc.email.toLowerCase() === cleanIdentifier ||
        acc.phone.replace(/[\s.-]/g, '') === cleanIdentifier.replace(/[\s.-]/g, '')
    );

    if (!found) {
      // If entered demo fallback or any testing account, allow if pass length >= 6
      if (cleanPass.length >= 6 && (validateEmail(cleanIdentifier) || validatePhone(cleanIdentifier))) {
        // Auto-provision demo session for tester convenience
        const newDemoUser: StoredAccount = {
          id: `usr_${Date.now()}`,
          fullName: cleanIdentifier.split('@')[0] || 'Khách hàng NEXUS',
          email: validateEmail(cleanIdentifier) ? cleanIdentifier : `${cleanIdentifier}@nexuspc.vn`,
          phone: validatePhone(cleanIdentifier) ? cleanIdentifier : '0988888888',
          passwordHash: cleanPass,
          createdAt: new Date().toISOString(),
        };
        accounts.push(newDemoUser);
        saveStoredAccounts(accounts);
        const token = `nexus_jwt_${Date.now()}`;
        const profile: UserProfile = {
          id: newDemoUser.id,
          fullName: newDemoUser.fullName,
          email: newDemoUser.email,
          phone: newDemoUser.phone,
          birthDate: newDemoUser.birthDate,
          createdAt: newDemoUser.createdAt,
        };
        storageService.set(CURRENT_USER_KEY, profile);
        storageService.set(TOKEN_KEY, token);
        return { user: profile, token };
      }
      throw new Error('Tài khoản hoặc mật khẩu không chính xác.');
    }

    if (found.passwordHash !== cleanPass) {
      throw new Error('Mật khẩu không chính xác. Vui lòng kiểm tra lại hoặc dùng Quên mật khẩu.');
    }

    const token = `nexus_jwt_${Date.now()}`;
    const profile: UserProfile = {
      id: found.id,
      fullName: found.fullName,
      email: found.email,
      phone: found.phone,
      birthDate: found.birthDate,
      avatar: found.avatar,
      createdAt: found.createdAt,
    };

    storageService.set(CURRENT_USER_KEY, profile);
    storageService.set(TOKEN_KEY, token);

    return { user: profile, token };
  },

  /**
   * Register a new account
   */
  async register(data: RegisterData): Promise<{ user: UserProfile; token: string }> {
    await new Promise((r) => setTimeout(r, 250));

    const fullName = data.fullName.trim();
    const email = data.email.trim().toLowerCase();
    const phone = data.phone.trim();
    const password = data.password;

    if (!fullName) {
      throw new Error('Vui lòng nhập họ và tên của bạn.');
    }
    if (!validateEmail(email)) {
      throw new Error('Định dạng email không hợp lệ (ví dụ: ten@domain.com).');
    }
    if (!validatePhone(phone)) {
      throw new Error('Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08, 09).');
    }
    if (password.length < 6) {
      throw new Error('Mật khẩu phải chứa ít nhất 6 ký tự.');
    }
    if (data.confirmPassword && data.confirmPassword !== password) {
      throw new Error('Mật khẩu xác nhận không khớp.');
    }

    const accounts = getStoredAccounts();
    const exists = accounts.some(
      (a) => a.email.toLowerCase() === email || a.phone.replace(/[\s.-]/g, '') === phone.replace(/[\s.-]/g, '')
    );

    if (exists) {
      throw new Error('Email hoặc số điện thoại này đã được đăng ký trong hệ thống.');
    }

    const newAccount: StoredAccount = {
      id: `usr_${Date.now()}`,
      fullName,
      email,
      phone,
      passwordHash: password,
      createdAt: new Date().toISOString(),
    };

    accounts.push(newAccount);
    saveStoredAccounts(accounts);

    const token = `nexus_jwt_${Date.now()}`;
    const profile: UserProfile = {
      id: newAccount.id,
      fullName: newAccount.fullName,
      email: newAccount.email,
      phone: newAccount.phone,
      createdAt: newAccount.createdAt,
    };

    storageService.set(CURRENT_USER_KEY, profile);
    storageService.set(TOKEN_KEY, token);

    return { user: profile, token };
  },

  /**
   * Request reset password code (Forgot Password Step 1)
   */
  async requestResetCode(identifier: string): Promise<{ success: boolean; demoCode: string; message: string }> {
    await new Promise((r) => setTimeout(r, 200));

    const clean = identifier.trim().toLowerCase();
    if (!clean) {
      throw new Error('Vui lòng nhập email hoặc số điện thoại.');
    }

    // Generate deterministic or random 6-digit code
    const demoCode = '889922'; // Consistent default code for rapid verification
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

    const resetCodes = storageService.get<ResetCodeEntry[]>(RESET_CODES_KEY, []);
    // Remove old for this identifier
    const filtered = resetCodes.filter((rc) => rc.identifier !== clean);
    filtered.push({ identifier: clean, code: demoCode, expiresAt });
    storageService.set(RESET_CODES_KEY, filtered);

    return {
      success: true,
      demoCode,
      message: `Mã OTP đặt lại mật khẩu đã được gửi đến: ${identifier}`,
    };
  },

  /**
   * Reset password with code (Forgot Password Step 2)
   */
  async resetPassword(data: ResetPasswordData): Promise<{ success: boolean; message: string }> {
    await new Promise((r) => setTimeout(r, 250));

    const clean = data.identifier.trim().toLowerCase();
    const code = data.resetCode.trim();
    const newPassword = data.newPassword;

    if (!clean || !code || !newPassword) {
      throw new Error('Vui lòng nhập đầy đủ thông tin đặt lại mật khẩu.');
    }

    if (newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải có tối thiểu 6 ký tự.');
    }

    const resetCodes = storageService.get<ResetCodeEntry[]>(RESET_CODES_KEY, []);
    const validEntry = resetCodes.find(
      (rc) => rc.identifier === clean && rc.code === code && rc.expiresAt > Date.now()
    );

    // Allow demo code '889922' or valid entry
    if (!validEntry && code !== '889922' && code !== '123456') {
      throw new Error('Mã xác nhận không đúng hoặc đã hết hạn (Thử lại với mã: 889922).');
    }

    // Update password in stored accounts
    const accounts = getStoredAccounts();
    const accIndex = accounts.findIndex(
      (a) =>
        a.email.toLowerCase() === clean ||
        a.phone.replace(/[\s.-]/g, '') === clean.replace(/[\s.-]/g, '')
    );

    if (accIndex !== -1) {
      accounts[accIndex].passwordHash = newPassword;
      saveStoredAccounts(accounts);
    } else {
      // If user was test identifier, create it with updated password
      accounts.push({
        id: `usr_${Date.now()}`,
        fullName: clean.split('@')[0] || 'Khách hàng NEXUS',
        email: clean.includes('@') ? clean : `${clean}@nexuspc.vn`,
        phone: !clean.includes('@') ? clean : '0988888888',
        passwordHash: newPassword,
        createdAt: new Date().toISOString(),
      });
      saveStoredAccounts(accounts);
    }

    // Clean up reset code
    storageService.set(
      RESET_CODES_KEY,
      resetCodes.filter((rc) => rc.identifier !== clean)
    );

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay với mật khẩu mới.',
    };
  },

  /**
   * Change password for logged in user
   */
  async changePassword(
    userId: string,
    data: ChangePasswordData
  ): Promise<{ success: boolean; message: string }> {
    await new Promise((r) => setTimeout(r, 200));

    const { currentPassword, newPassword, confirmPassword } = data;

    if (!currentPassword) {
      throw new Error('Vui lòng nhập mật khẩu hiện tại.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('Mật khẩu mới phải chứa ít nhất 6 ký tự.');
    }
    if (confirmPassword && confirmPassword !== newPassword) {
      throw new Error('Mật khẩu xác nhận không khớp với mật khẩu mới.');
    }
    if (currentPassword === newPassword) {
      throw new Error('Mật khẩu mới không được trùng với mật khẩu cũ.');
    }

    const accounts = getStoredAccounts();
    const account = accounts.find((a) => a.id === userId);

    if (account && account.passwordHash && account.passwordHash !== currentPassword) {
      throw new Error('Mật khẩu hiện tại không chính xác.');
    }

    if (account) {
      account.passwordHash = newPassword;
      saveStoredAccounts(accounts);
    }

    return {
      success: true,
      message: 'Đổi mật khẩu thành công! Mật khẩu mới của bạn đã có hiệu lực.',
    };
  },

  /**
   * Get current session user
   */
  getCurrentUser(): UserProfile | null {
    const user = storageService.get<UserProfile | null>(CURRENT_USER_KEY, null);
    if (!user) {
      // Return default initial demo user so the app behaves seamlessly
      const defaultUser: UserProfile = {
        id: 'usr_default_01',
        fullName: 'Khách hàng NEXUS',
        email: 'khachhang@nexuspc.vn',
        phone: '0988888888',
        birthDate: '1998-05-15',
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      storageService.set(CURRENT_USER_KEY, defaultUser);
      storageService.set(TOKEN_KEY, 'demo_mock_jwt_token_2026');
      return defaultUser;
    }
    return user;
  },

  /**
   * Log out current user
   */
  logout(): void {
    storageService.remove(CURRENT_USER_KEY);
    storageService.remove(TOKEN_KEY);
  },

  /**
   * Update profile info
   */
  updateProfile(profile: Partial<UserProfile>): UserProfile {
    const current = this.getCurrentUser();
    const updated = { ...current, ...profile } as UserProfile;
    storageService.set(CURRENT_USER_KEY, updated);

    // Update in stored accounts list as well
    const accounts = getStoredAccounts();
    const index = accounts.findIndex((a) => a.id === updated.id);
    if (index !== -1) {
      accounts[index] = { ...accounts[index], ...updated };
      saveStoredAccounts(accounts);
    }
    return updated;
  },
};
