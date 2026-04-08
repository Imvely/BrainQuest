CREATE TABLE daily_checkins (
    id                BIGSERIAL     PRIMARY KEY,
    user_id           BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    checkin_type      VARCHAR(10)   NOT NULL,
    checkin_date      DATE          NOT NULL,
    sleep_hours       DECIMAL(3,1),
    sleep_quality     INT,
    condition         INT,
    focus_score       INT,
    impulsivity_score INT,
    emotion_score     INT,
    memo              TEXT,
    created_at        TIMESTAMP     NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, checkin_date, checkin_type)
);

CREATE INDEX idx_checkin_user_date ON daily_checkins(user_id, checkin_date);
