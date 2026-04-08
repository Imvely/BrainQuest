package com.brainquest.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/**
 * JPA Auditing 활성화 설정.
 * <p>{@link org.springframework.data.annotation.CreatedDate},
 * {@link org.springframework.data.annotation.LastModifiedDate} 자동 주입을 위해 필요하다.</p>
 */
@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}
