package com.brainquest.common.exception;

/**
 * 조회 대상 엔티티가 존재하지 않을 때 발생하는 예외.
 */
public class EntityNotFoundException extends RuntimeException {

    private final String code;

    public EntityNotFoundException(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}
