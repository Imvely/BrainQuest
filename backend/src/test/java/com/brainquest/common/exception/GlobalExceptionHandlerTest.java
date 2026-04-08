package com.brainquest.common.exception;

import com.brainquest.common.dto.ErrorResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;

@ExtendWith(MockitoExtension.class)
@DisplayName("GlobalExceptionHandler 단위 테스트")
class GlobalExceptionHandlerTest {

    @InjectMocks
    private GlobalExceptionHandler handler;

    @Test
    @DisplayName("MethodArgumentNotValidException → 400 + 필드별 에러 메시지")
    void handleMethodArgumentNotValid_returns400() {
        // given
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError fieldError1 = new FieldError("loginRequest", "provider", "provider는 필수입니다.");
        FieldError fieldError2 = new FieldError("loginRequest", "accessToken", "accessToken은 필수입니다.");
        given(bindingResult.getFieldErrors()).willReturn(List.of(fieldError1, fieldError2));

        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(null, bindingResult);

        // when
        ResponseEntity<ErrorResponse> response = handler.handleMethodArgumentNotValid(ex);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError().getCode()).isEqualTo("COMMON_400");
        assertThat(response.getBody().getError().getMessage()).contains("provider", "accessToken");
    }

    @Test
    @DisplayName("EntityNotFoundException → 404")
    void handleEntityNotFound_returns404() {
        // given
        EntityNotFoundException ex = new EntityNotFoundException("AUTH_001", "사용자를 찾을 수 없습니다.");

        // when
        ResponseEntity<ErrorResponse> response = handler.handleEntityNotFound(ex);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError().getCode()).isEqualTo("AUTH_001");
        assertThat(response.getBody().getError().getMessage()).isEqualTo("사용자를 찾을 수 없습니다.");
    }

    @Test
    @DisplayName("DuplicateResourceException → 409")
    void handleDuplicateResource_returns409() {
        // given
        DuplicateResourceException ex = new DuplicateResourceException("GATE_001", "이미 오늘 체크인 기록이 있습니다.");

        // when
        ResponseEntity<ErrorResponse> response = handler.handleDuplicateResource(ex);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError().getCode()).isEqualTo("GATE_001");
        assertThat(response.getBody().getError().getMessage()).isEqualTo("이미 오늘 체크인 기록이 있습니다.");
    }

    @Test
    @DisplayName("UnauthorizedException → 401")
    void handleUnauthorized_returns401() {
        // given
        UnauthorizedException ex = new UnauthorizedException("AUTH_002", "인증이 필요합니다.");

        // when
        ResponseEntity<ErrorResponse> response = handler.handleUnauthorized(ex);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError().getCode()).isEqualTo("AUTH_002");
        assertThat(response.getBody().getError().getMessage()).isEqualTo("인증이 필요합니다.");
    }

    @Test
    @DisplayName("AccessDeniedException → 403")
    void handleAccessDenied_returns403() {
        // given
        AccessDeniedException ex = new AccessDeniedException("접근 거부");

        // when
        ResponseEntity<ErrorResponse> response = handler.handleAccessDenied(ex);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError().getCode()).isEqualTo("AUTH_003");
        assertThat(response.getBody().getError().getMessage()).isEqualTo("접근 권한이 없습니다.");
    }

    @Test
    @DisplayName("IllegalArgumentException → 400")
    void handleIllegalArgument_returns400() {
        // given
        IllegalArgumentException ex = new IllegalArgumentException("유효하지 않은 Refresh Token입니다.");

        // when
        ResponseEntity<ErrorResponse> response = handler.handleIllegalArgument(ex);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError().getCode()).isEqualTo("COMMON_400");
        assertThat(response.getBody().getError().getMessage()).isEqualTo("유효하지 않은 Refresh Token입니다.");
    }

    @Test
    @DisplayName("기타 Exception → 500")
    void handleGeneral_returns500() {
        // given
        Exception ex = new RuntimeException("알 수 없는 오류");

        // when
        ResponseEntity<ErrorResponse> response = handler.handleGeneral(ex);

        // then
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getError().getCode()).isEqualTo("COMMON_500");
        assertThat(response.getBody().getError().getMessage()).isEqualTo("서버 내부 오류가 발생했습니다.");
    }
}
