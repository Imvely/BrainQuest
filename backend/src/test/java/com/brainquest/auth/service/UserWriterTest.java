package com.brainquest.auth.service;

import com.brainquest.auth.entity.User;
import com.brainquest.auth.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserWriter 단위 테스트")
class UserWriterTest {

    @InjectMocks
    private UserWriter userWriter;

    @Mock
    private UserRepository userRepository;

    @Test
    @DisplayName("신규 사용자 — 저장 후 isNew=true")
    void newUser_savesAndReturnsNew() {
        // given
        given(userRepository.findByProviderAndProviderId("KAKAO", "12345"))
                .willReturn(Optional.empty());
        given(userRepository.save(any(User.class))).willAnswer(inv -> inv.getArgument(0));

        // when
        UserWriter.UpsertResult result = userWriter.upsert("KAKAO", "12345", "test@kakao.com", "테스터");

        // then
        assertThat(result.isNew()).isTrue();
        assertThat(result.user().getProvider()).isEqualTo("KAKAO");
        assertThat(result.user().getProviderId()).isEqualTo("12345");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isEqualTo("test@kakao.com");
    }

    @Test
    @DisplayName("기존 사용자 — 프로필 업데이트 후 isNew=false")
    void existingUser_updatesAndReturnsNotNew() {
        // given
        User existing = User.builder()
                .email("old@kakao.com")
                .nickname("옛이름")
                .provider("KAKAO")
                .providerId("12345")
                .build();
        given(userRepository.findByProviderAndProviderId("KAKAO", "12345"))
                .willReturn(Optional.of(existing));

        // when
        UserWriter.UpsertResult result = userWriter.upsert("KAKAO", "12345", "new@kakao.com", "새이름");

        // then
        assertThat(result.isNew()).isFalse();
        assertThat(existing.getEmail()).isEqualTo("new@kakao.com");
        assertThat(existing.getNickname()).isEqualTo("새이름");
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("닉네임 null — 기본 닉네임 '모험가'로 저장")
    void nullNickname_savesDefault() {
        // given
        given(userRepository.findByProviderAndProviderId("KAKAO", "99999"))
                .willReturn(Optional.empty());
        given(userRepository.save(any(User.class))).willAnswer(inv -> inv.getArgument(0));

        // when
        UserWriter.UpsertResult result = userWriter.upsert("KAKAO", "99999", "", null);

        // then
        assertThat(result.user().getNickname()).isEqualTo("모험가");
    }
}
