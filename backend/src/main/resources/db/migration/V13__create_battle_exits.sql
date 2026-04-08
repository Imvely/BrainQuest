CREATE TABLE battle_exits (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES battle_sessions(id) ON DELETE CASCADE,
    exit_at TIMESTAMP NOT NULL,
    return_at TIMESTAMP,
    duration_sec INT,
    penalty_type VARCHAR(20) NOT NULL
);
