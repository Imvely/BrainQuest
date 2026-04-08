-- 캐릭터 테이블
CREATE TABLE characters (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    name            VARCHAR(30)     NOT NULL,
    class_type      VARCHAR(20)     NOT NULL,
    level           INT             NOT NULL DEFAULT 1,
    exp             INT             NOT NULL DEFAULT 0,
    exp_to_next     INT             NOT NULL DEFAULT 100,
    stat_atk        INT             NOT NULL DEFAULT 10,
    stat_wis        INT             NOT NULL DEFAULT 10,
    stat_def        INT             NOT NULL DEFAULT 10,
    stat_agi        INT             NOT NULL DEFAULT 10,
    stat_hp         INT             NOT NULL DEFAULT 100,
    gold            INT             NOT NULL DEFAULT 0,
    appearance      JSONB           NOT NULL DEFAULT '{}',
    equipped_items  JSONB           NOT NULL DEFAULT '{}',
    created_at      TIMESTAMP       NOT NULL DEFAULT now(),
    updated_at      TIMESTAMP       NOT NULL DEFAULT now()
);

-- 사용자별 캐릭터 조회용 인덱스
CREATE INDEX idx_characters_user_id ON characters (user_id);
