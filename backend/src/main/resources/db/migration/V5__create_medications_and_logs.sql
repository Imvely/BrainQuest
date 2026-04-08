CREATE TABLE medications (
    id             BIGSERIAL     PRIMARY KEY,
    user_id        BIGINT        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    med_name       VARCHAR(100)  NOT NULL,
    dosage         VARCHAR(50)   NOT NULL,
    schedule_time  TIME          NOT NULL,
    is_active      BOOLEAN       NOT NULL DEFAULT true,
    created_at     TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_medications_user ON medications(user_id);

CREATE TABLE med_logs (
    id              BIGSERIAL   PRIMARY KEY,
    medication_id   BIGINT      NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    log_date        DATE        NOT NULL,
    taken_at        TIMESTAMP   NOT NULL,
    effectiveness   INT,
    side_effects    JSONB,
    created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_med_logs_user_date ON med_logs(user_id, log_date);
