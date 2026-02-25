CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS product_ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text,
  status text NOT NULL DEFAULT 'idea',
  problem text,
  audience text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_ideas_status_check
    CHECK (status IN ('idea', 'researching', 'building', 'launched', 'archived'))
);

CREATE TABLE IF NOT EXISTS product_research_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES product_ideas(id) ON DELETE CASCADE,
  title text NOT NULL,
  source_url text,
  source_type text NOT NULL DEFAULT 'note',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_research_items_source_type_check
    CHECK (source_type IN ('note', 'article', 'competitor', 'user_feedback', 'market_data'))
);

CREATE INDEX IF NOT EXISTS product_ideas_status_created_idx
  ON product_ideas (status, created_at DESC);

CREATE INDEX IF NOT EXISTS product_ideas_created_idx
  ON product_ideas (created_at DESC);

CREATE INDEX IF NOT EXISTS product_research_product_created_idx
  ON product_research_items (product_id, created_at DESC);
