CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  status text NOT NULL DEFAULT 'idea',
  kind text NOT NULL DEFAULT 'general',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_status_check
    CHECK (status IN ('idea', 'researching', 'building', 'launched', 'archived')),
  CONSTRAINT projects_kind_check
    CHECK (kind IN ('general', 'product'))
);

ALTER TABLE product_ideas
  ADD COLUMN IF NOT EXISTS project_id uuid;

ALTER TABLE research_artifacts
  ADD COLUMN IF NOT EXISTS project_id uuid;

INSERT INTO projects (slug, title, summary, status, kind, created_by, created_at, updated_at)
SELECT
  p.slug,
  p.title,
  p.summary,
  p.status,
  'product',
  COALESCE(p.created_by, 'moltzart'),
  p.created_at,
  p.updated_at
FROM product_ideas p
LEFT JOIN projects pr
  ON pr.slug = p.slug
  AND pr.kind = 'product'
WHERE p.project_id IS NULL
  AND pr.id IS NULL;

UPDATE product_ideas p
SET project_id = pr.id
FROM projects pr
WHERE p.project_id IS NULL
  AND pr.slug = p.slug
  AND pr.kind = 'product';

UPDATE research_artifacts ra
SET project_id = p.project_id
FROM product_ideas p
WHERE ra.project_id IS NULL
  AND ra.product_id = p.id
  AND p.project_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'product_ideas_project_id_fkey'
      AND conrelid = 'product_ideas'::regclass
  ) THEN
    ALTER TABLE product_ideas
      ADD CONSTRAINT product_ideas_project_id_fkey
      FOREIGN KEY (project_id)
      REFERENCES projects(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'research_artifacts_project_id_fkey'
      AND conrelid = 'research_artifacts'::regclass
  ) THEN
    ALTER TABLE research_artifacts
      ADD CONSTRAINT research_artifacts_project_id_fkey
      FOREIGN KEY (project_id)
      REFERENCES projects(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS product_ideas_project_id_uniq
  ON product_ideas (project_id)
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS projects_status_updated_idx
  ON projects (status, updated_at DESC);

CREATE INDEX IF NOT EXISTS projects_kind_updated_idx
  ON projects (kind, updated_at DESC);

CREATE INDEX IF NOT EXISTS research_artifacts_project_idx
  ON research_artifacts (project_id)
  WHERE project_id IS NOT NULL;
