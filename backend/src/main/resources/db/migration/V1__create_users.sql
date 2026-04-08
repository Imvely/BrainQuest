-- 사용자 테이블
CREATE TABLE users (
    id              BIGSERIAL       PRIMARY KEY,
    email           VARCHAR(255)    UNIQUE,
    nickname        VARCHAR(50)     NOT NULL,
    provider        VARCHAR(20)     NOT NULL,
    provider_id     VARCHAR(255)    NOT NULL,
    adhd_status     VARCHAR(20)     NOT NULL DEFAULT 'UNKNOWN',
    diagnosis_date  DATE,
    timezone        VARCHAR(50)     NOT NULL DEFAULT 'Asia/Seoul',
    wake_time       TIME            NOT NULL DEFAULT '07:00',
    sleep_time      TIME            NOT NULL DEFAULT '23:00',
    created_at      TIMESTAMP       NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT now()
);

-- 소셜 로그인 조회용 인덱스
CREATE UNIQUE INDEX idx_users_provider_provider_id ON users (provider, provider_id);
