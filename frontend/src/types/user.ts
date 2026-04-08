export type AdhdStatus = 'UNKNOWN' | 'UNDIAGNOSED' | 'SUSPECTED' | 'DIAGNOSED';
export type AuthProvider = 'KAKAO' | 'APPLE' | 'GOOGLE';

export interface User {
  id: number;
  email: string;
  nickname: string;
  provider: AuthProvider;
  adhdStatus: AdhdStatus;
  diagnosisDate?: string;
  timezone: string;
  wakeTime: string;
  sleepTime: string;
  createdAt: string;
  updatedAt: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface LoginRequest {
  provider: AuthProvider;
  providerId: string;
  email: string;
  nickname: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  isNewUser: boolean;
  hasCharacter: boolean;
}
