CREATE TABLE time_blocks (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    block_date      DATE            NOT NULL,
    start_time      TIME            NOT NULL,
    end_time        TIME            NOT NULL,
    category        VARCHAR(20)     NOT NULL,
    title           VARCHAR(200)    NOT NULL,
    quest_id        BIGINT          REFERENCES quests(id),
    status          VARCHAR(15)     NOT NULL DEFAULT 'PLANNED',
    actual_start    TIMESTAMP,
    actual_end      TIMESTAMP,
    source          VARCHAR(15)     NOT NULL DEFAULT 'MANUAL',
    is_buffer       BOOLEAN         NOT NULL DEFAULT false,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_block_user_date ON time_blocks(user_id, block_date);
