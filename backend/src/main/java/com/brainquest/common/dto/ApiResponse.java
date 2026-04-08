package com.brainquest.common.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

/**
 * API 공통 성공 응답 래퍼.
 *
 * @param <T> 응답 데이터 타입
 */
@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final T data;
    private final String message;

    /**
     * 데이터와 메시지를 포함하는 성공 응답을 생성한다.
     */
    public static <T> ApiResponse<T> of(T data, String message) {
        return new ApiResponse<>(true, data, message);
    }

    /**
     * 데이터만 포함하는 성공 응답을 생성한다.
     */
    public static <T> ApiResponse<T> of(T data) {
        return new ApiResponse<>(true, data, null);
    }

    /**
     * 메시지만 포함하는 성공 응답을 생성한다.
     */
    public static ApiResponse<Void> ok(String message) {
        return new ApiResponse<>(true, null, message);
    }
}
