CREATE TABLE time_predictions (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    block_id        BIGINT          NOT NULL REFERENCES time_blocks(id) ON DELETE CASCADE,
    predicted_min   INT             NOT NULL,
    actual_min      INT,
    accuracy_pct    DECIMAL(5,2),
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);
