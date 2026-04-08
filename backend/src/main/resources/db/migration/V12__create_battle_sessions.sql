CREATE TABLE battle_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quest_id BIGINT REFERENCES quests(id),
    checkpoint_id BIGINT REFERENCES checkpoints(id),
    planned_min INT NOT NULL,
    actual_min INT,
    monster_type VARCHAR(30) NOT NULL,
    monster_max_hp INT NOT NULL,
    monster_remaining_hp INT NOT NULL,
    max_combo INT NOT NULL DEFAULT 0,
    exit_count INT NOT NULL DEFAULT 0,
    total_exit_sec INT NOT NULL DEFAULT 0,
    result VARCHAR(10),
    exp_earned INT NOT NULL DEFAULT 0,
    gold_earned INT NOT NULL DEFAULT 0,
    item_drops JSONB,
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_battle_user ON battle_sessions(user_id);
CREATE INDEX idx_battle_started ON battle_sessions(started_at);
