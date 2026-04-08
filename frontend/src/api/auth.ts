import apiClient from './client';
import { ApiResponse } from '../types/api';
import { User, TokenPair, LoginRequest, LoginResponse } from '../types/user';

export async function login(request: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  const { data } = await apiClient.post('/auth/login', request);
  return data;
}

export async function refreshToken(token: string): Promise<ApiResponse<TokenPair>> {
  const { data } = await apiClient.post('/auth/refresh', { refreshToken: token });
  return data;
}

export async function getMe(): Promise<ApiResponse<User>> {
  const { data } = await apiClient.get('/auth/me');
  return data;
}
