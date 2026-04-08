-- 체크포인트 낙관적 잠금용 version 컬럼 추가
ALTER TABLE checkpoints ADD COLUMN version INTEGER NOT NULL DEFAULT 0;
