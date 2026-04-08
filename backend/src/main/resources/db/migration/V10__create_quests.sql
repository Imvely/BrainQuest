CREATE TABLE quests (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_title VARCHAR(300) NOT NULL,
    quest_title VARCHAR(300) NOT NULL,
    quest_story TEXT NOT NULL,
    category VARCHAR(20) NOT NULL,
    grade VARCHAR(5) NOT NULL,
    estimated_min INT NOT NULL,
    exp_reward INT NOT NULL,
    gold_reward INT NOT NULL,
    status VARCHAR(15) NOT NULL DEFAULT 'ACTIVE',
    due_date DATE,
    completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_quest_user_status ON quests(user_id, status);
