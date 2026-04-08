package com.brainquest.auth.service;

import com.brainquest.auth.entity.User;
import com.brainquest.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 사용자 생성/수정을 담당하는 트랜잭션 단위 컴포넌트.
 * <p>AuthService에서 외부 API 호출과 DB 쓰기의 트랜잭션 경계를 분리하기 위해 사용한다.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserWriter {

    private final UserRepository userRepository;

    /**
     * 사용자를 조회하고 없으면 신규 생성, 있으면 프로필을 업데이트한다.
     *
     * @return upsert 결과 (User 엔티티 + 신규 여부)
     */
    @Transactional
    public UpsertResult upsert(String provider, String providerId, String email, String nickname) {
        User user = userRepository.findByProviderAndProviderId(provider, providerId)
                .orElse(null);

        if (user == null) {
            user = User.builder()
                    .email(email)
                    .nickname(nickname != null ? nickname : "모험가")
                    .provider(provider)
                    .providerId(providerId)
                    .build();
            user = userRepository.save(user);
            log.info("New user registered: userId={}, provider={}", user.getId(), provider);
            return new UpsertResult(user, true);
        }

        user.updateProfile(email, nickname);
        return new UpsertResult(user, false);
    }

    public record UpsertResult(User user, boolean isNew) {
    }
}
