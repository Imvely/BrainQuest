CREATE TABLE streaks (
    id            BIGSERIAL    PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    streak_type   VARCHAR(20)  NOT NULL,
    current_count INT          NOT NULL DEFAULT 0,
    max_count     INT          NOT NULL DEFAULT 0,
    last_date     DATE,
    UNIQUE(user_id, streak_type)
);
