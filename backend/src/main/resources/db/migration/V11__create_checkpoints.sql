CREATE TABLE checkpoints (
    id BIGSERIAL PRIMARY KEY,
    quest_id BIGINT NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
    order_num INT NOT NULL,
    title VARCHAR(300) NOT NULL,
    estimated_min INT NOT NULL,
    exp_reward INT NOT NULL,
    gold_reward INT NOT NULL,
    status VARCHAR(15) NOT NULL DEFAULT 'PENDING',
    completed_at TIMESTAMP
);
CREATE INDEX idx_checkpoint_quest ON checkpoints(quest_id);
