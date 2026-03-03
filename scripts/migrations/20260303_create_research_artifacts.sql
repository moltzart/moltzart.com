CREATE TABLE IF NOT EXISTS research_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  domain text NOT NULL,
  body_md text NOT NULL,
  summary text,
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  product_id uuid REFERENCES product_ideas(id) ON DELETE SET NULL,
  created_by text NOT NULL DEFAULT 'moltzart',
  source_links jsonb,
  status text NOT NULL DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT research_artifacts_domain_check
    CHECK (domain IN ('product', 'marketing', 'ops', 'content', 'strategy')),
  CONSTRAINT research_artifacts_status_check
    CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE INDEX IF NOT EXISTS research_artifacts_created_idx
  ON research_artifacts (created_at DESC);

CREATE INDEX IF NOT EXISTS research_artifacts_domain_created_idx
  ON research_artifacts (domain, created_at DESC);

CREATE INDEX IF NOT EXISTS research_artifacts_status_created_idx
  ON research_artifacts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS research_artifacts_task_idx
  ON research_artifacts (task_id)
  WHERE task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS research_artifacts_product_idx
  ON research_artifacts (product_id)
  WHERE product_id IS NOT NULL;
