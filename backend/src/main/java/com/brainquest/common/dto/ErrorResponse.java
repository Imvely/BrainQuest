package com.brainquest.common.dto;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * API 공통 에러 응답 래퍼.
 */
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ErrorResponse {

    private final boolean success;
    private final ErrorDetail error;

    /**
     * 에러 응답을 생성한다.
     *
     * @param code    에러 코드 (예: AUTH_001)
     * @param message 에러 메시지
     */
    public static ErrorResponse of(String code, String message) {
        return new ErrorResponse(false, new ErrorDetail(code, message));
    }

    /**
     * 에러 상세 정보.
     */
    @Getter
    @AllArgsConstructor
    public static class ErrorDetail {
        private final String code;
        private final String message;
    }
}
