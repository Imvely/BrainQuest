-- 사용자 보유 아이템 테이블
CREATE TABLE user_items (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_id         BIGINT          NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    acquired_at     TIMESTAMP       NOT NULL DEFAULT now(),
    source          VARCHAR(20)     NOT NULL
);

-- 사용자별 아이템 조회용 인덱스
CREATE INDEX idx_user_items_user_id ON user_items (user_id);
