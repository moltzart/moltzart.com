ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS board_order double precision;

UPDATE tasks
SET status = 'backlog'
WHERE status = 'open';

DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'tasks'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE tasks DROP CONSTRAINT IF EXISTS %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('backlog', 'todo', 'in_progress', 'done'));

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY status
      ORDER BY created_at ASC
    )::double precision AS next_order
  FROM tasks
)
UPDATE tasks t
SET board_order = ranked.next_order
FROM ranked
WHERE t.id = ranked.id
  AND (t.board_order IS NULL OR t.board_order = 0);

UPDATE tasks
SET board_order = 1
WHERE board_order IS NULL;

ALTER TABLE tasks
  ALTER COLUMN board_order SET NOT NULL,
  ALTER COLUMN board_order SET DEFAULT 1;

CREATE INDEX IF NOT EXISTS tasks_status_board_order_idx
  ON tasks (status, board_order, created_at);
