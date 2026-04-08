package com.brainquest.common.exception;

/**
 * API 호출 횟수 제한 초과 시 발생하는 예외.
 */
public class RateLimitExceededException extends RuntimeException {

    private final String code;

    public RateLimitExceededException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
