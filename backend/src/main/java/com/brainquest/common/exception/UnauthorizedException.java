package com.brainquest.common.exception;

/**
 * 인증 실패 또는 권한 부족 시 발생하는 예외.
 */
public class UnauthorizedException extends RuntimeException {

    private final String code;

    public UnauthorizedException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
