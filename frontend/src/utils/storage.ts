import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({ id: 'brainquest-storage' });

const KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  HAS_CHARACTER: 'hasCharacter',
  IS_NEW_USER: 'isNewUser',
} as const;

export function getAccessToken(): string | undefined {
  return storage.getString(KEYS.ACCESS_TOKEN);
}

export function setAccessToken(token: string): void {
  storage.set(KEYS.ACCESS_TOKEN, token);
}

export function getRefreshToken(): string | undefined {
  return storage.getString(KEYS.REFRESH_TOKEN);
}

export function setRefreshToken(token: string): void {
  storage.set(KEYS.REFRESH_TOKEN, token);
}

export function setTokens(access: string, refresh: string): void {
  storage.set(KEYS.ACCESS_TOKEN, access);
  storage.set(KEYS.REFRESH_TOKEN, refresh);
}

export function clearTokens(): void {
  storage.remove(KEYS.ACCESS_TOKEN);
  storage.remove(KEYS.REFRESH_TOKEN);
  storage.remove(KEYS.IS_NEW_USER);
}

export function getHasCharacter(): boolean {
  return storage.getBoolean(KEYS.HAS_CHARACTER) ?? false;
}

export function setHasCharacter(value: boolean): void {
  storage.set(KEYS.HAS_CHARACTER, value);
}

export function getIsNewUser(): boolean {
  return storage.getBoolean(KEYS.IS_NEW_USER) ?? true;
}

export function setIsNewUser(value: boolean): void {
  storage.set(KEYS.IS_NEW_USER, value);
}
