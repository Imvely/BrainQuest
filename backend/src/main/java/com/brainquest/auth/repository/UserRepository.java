package com.brainquest.auth.repository;

import com.brainquest.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * 사용자 JPA Repository.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * 소셜 로그인 제공자와 제공자 ID로 사용자를 조회한다.
     */
    Optional<User> findByProviderAndProviderId(String provider, String providerId);

    /**
     * 이메일로 사용자를 조회한다.
     */
    Optional<User> findByEmail(String email);
}
