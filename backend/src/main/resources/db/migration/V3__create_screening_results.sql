CREATE TABLE screening_results (
    id            BIGSERIAL    PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    test_type     VARCHAR(10)  NOT NULL,
    answers       JSONB        NOT NULL,
    total_score   INT          NOT NULL,
    risk_level    VARCHAR(10)  NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_screening_user ON screening_results(user_id);
