-- 아이템 마스터 데이터 테이블
CREATE TABLE items (
    id              BIGSERIAL       PRIMARY KEY,
    name            VARCHAR(100)    NOT NULL,
    description     TEXT,
    slot            VARCHAR(15)     NOT NULL,
    rarity          VARCHAR(10)     NOT NULL,
    stat_bonus      JSONB           NOT NULL DEFAULT '{}',
    image_url       VARCHAR(500)
);

-- 시드 데이터: COMMON 8개 (각 슬롯 2개씩)
INSERT INTO items (name, description, slot, rarity, stat_bonus) VALUES
('집중의 머리띠', '집중력을 약간 높여주는 기본 머리띠', 'HELMET', 'COMMON', '{"atk": 0, "def": 2, "wis": 1, "agi": 0, "hp": 0}'),
('초심자의 모자', '모험을 시작하는 자에게 주어지는 모자', 'HELMET', 'COMMON', '{"atk": 0, "def": 1, "wis": 2, "agi": 0, "hp": 0}'),
('면 갑옷', '부드럽고 가벼운 기본 갑옷', 'ARMOR', 'COMMON', '{"atk": 0, "def": 3, "wis": 0, "agi": 0, "hp": 5}'),
('가죽 조끼', '가죽으로 만든 튼튼한 조끼', 'ARMOR', 'COMMON', '{"atk": 1, "def": 2, "wis": 0, "agi": 0, "hp": 3}'),
('나무 검', '기본적인 나무 검', 'WEAPON', 'COMMON', '{"atk": 3, "def": 0, "wis": 0, "agi": 0, "hp": 0}'),
('연습용 지팡이', '마법 연습에 사용하는 지팡이', 'WEAPON', 'COMMON', '{"atk": 1, "def": 0, "wis": 2, "agi": 0, "hp": 0}'),
('행운의 팔찌', '행운을 가져다주는 팔찌', 'ACCESSORY', 'COMMON', '{"atk": 0, "def": 0, "wis": 0, "agi": 2, "hp": 3}'),
('집중 반지', '집중력을 높여주는 반지', 'ACCESSORY', 'COMMON', '{"atk": 0, "def": 0, "wis": 2, "agi": 1, "hp": 0}');

-- 시드 데이터: UNCOMMON 6개
INSERT INTO items (name, description, slot, rarity, stat_bonus) VALUES
('철 투구', '단단한 철로 만든 투구', 'HELMET', 'UNCOMMON', '{"atk": 0, "def": 4, "wis": 2, "agi": 0, "hp": 5}'),
('강철 갑옷', '강철로 제작된 견고한 갑옷', 'ARMOR', 'UNCOMMON', '{"atk": 0, "def": 5, "wis": 0, "agi": 0, "hp": 10}'),
('강철 검', '날카로운 강철 검', 'WEAPON', 'UNCOMMON', '{"atk": 5, "def": 1, "wis": 0, "agi": 1, "hp": 0}'),
('마법 서적', '고대의 지혜가 담긴 서적', 'WEAPON', 'UNCOMMON', '{"atk": 2, "def": 0, "wis": 5, "agi": 0, "hp": 0}'),
('민첩의 부적', '빠른 움직임을 부여하는 부적', 'ACCESSORY', 'UNCOMMON', '{"atk": 0, "def": 0, "wis": 1, "agi": 5, "hp": 3}'),
('활력의 목걸이', '생명력을 높여주는 목걸이', 'ACCESSORY', 'UNCOMMON', '{"atk": 0, "def": 2, "wis": 0, "agi": 0, "hp": 15}');

-- 시드 데이터: RARE 4개
INSERT INTO items (name, description, slot, rarity, stat_bonus) VALUES
('현자의 왕관', '위대한 현자가 남긴 왕관', 'HELMET', 'RARE', '{"atk": 0, "def": 5, "wis": 8, "agi": 2, "hp": 10}'),
('미스릴 갑옷', '가볍고 단단한 미스릴 갑옷', 'ARMOR', 'RARE', '{"atk": 2, "def": 10, "wis": 0, "agi": 3, "hp": 15}'),
('룬 소드', '룬 문자가 새겨진 마법 검', 'WEAPON', 'RARE', '{"atk": 10, "def": 2, "wis": 3, "agi": 2, "hp": 0}'),
('시간의 반지', '시간 감각을 극대화하는 반지', 'ACCESSORY', 'RARE', '{"atk": 0, "def": 3, "wis": 5, "agi": 10, "hp": 5}');

-- 시드 데이터: EPIC 2개
INSERT INTO items (name, description, slot, rarity, stat_bonus) VALUES
('용사의 검', '전설의 용사가 사용했던 검', 'WEAPON', 'EPIC', '{"atk": 15, "def": 5, "wis": 5, "agi": 5, "hp": 10}'),
('드래곤 아머', '드래곤의 비늘로 제작된 갑옷', 'ARMOR', 'EPIC', '{"atk": 5, "def": 15, "wis": 5, "agi": 3, "hp": 25}');
