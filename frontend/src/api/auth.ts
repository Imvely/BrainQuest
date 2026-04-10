import apiClient from './client';
import { ApiResponse } from '../types/api';
import { LoginRequest, LoginResponse } from '../types/user';

/**
 * 소셜 로그인 → JWT 발급.
 * 백엔드 {@code POST /api/v1/auth/login}.
 */
export async function login(request: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  const { data } = await apiClient.post('/auth/login', request);
  return data;
}

/**
 * Refresh Token으로 새 Access Token 발급.
 * 백엔드 {@code POST /api/v1/auth/refresh} — 응답은 로그인과 동일한 {@code TokenResponse}.
 */
export async function refreshToken(token: string): Promise<ApiResponse<LoginResponse>> {
  const { data } = await apiClient.post('/auth/refresh', { refreshToken: token });
  return data;
}

// NOTE: 백엔드는 현재 `GET /auth/me` 엔드포인트를 제공하지 않는다.
// 사용자 상세 정보가 필요해지면 백엔드에 해당 엔드포인트를 먼저 추가해야 한다.
