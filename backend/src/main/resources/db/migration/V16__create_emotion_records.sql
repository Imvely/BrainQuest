CREATE TABLE emotion_records (
    id              BIGSERIAL       PRIMARY KEY,
    user_id         BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    weather_type    VARCHAR(15)     NOT NULL,
    intensity       INT             NOT NULL,
    tags            JSONB,
    memo            TEXT,
    voice_url       VARCHAR(500),
    voice_transcript TEXT,
    recorded_at     TIMESTAMP       NOT NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emotion_user_recorded ON emotion_records(user_id, recorded_at);
