export type AdhdStatus = 'UNKNOWN' | 'UNDIAGNOSED' | 'SUSPECTED' | 'DIAGNOSED';
export type AuthProvider = 'KAKAO' | 'APPLE' | 'GOOGLE';

/**
 * 사용자 엔티티.
 * <p>참고: 백엔드는 현재 `GET /auth/me` 엔드포인트를 제공하지 않는다.
 * User 정보는 로그인 응답(`TokenResponse`)에서 userId/nickname만 제공된다.
 * 상세 필드(email/adhdStatus 등)가 필요해지면 백엔드에 `/auth/me` 추가 필요.</p>
 */
export interface User {
  id: number;
  nickname: string;
  email?: string;
  provider?: AuthProvider;
  adhdStatus?: AdhdStatus;
  diagnosisDate?: string;
  timezone?: string;
  wakeTime?: string;
  sleepTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * 소셜 로그인 요청.
 * <p>백엔드 {@code LoginRequest}: 소셜 제공자(KAKAO/APPLE/GOOGLE)의 Access Token 검증.</p>
 */
export interface LoginRequest {
  provider: AuthProvider;
  accessToken: string;
}

/**
 * 로그인 응답 (백엔드 {@code TokenResponse}와 동일).
 * <p>백엔드는 User 엔티티 전체가 아닌 요약(userId/nickname)만 반환한다.
 * `hasCharacter`는 별도 API({@code GET /character})로 확인해야 한다.</p>
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: number;
  nickname: string;
  isNewUser: boolean;
}
