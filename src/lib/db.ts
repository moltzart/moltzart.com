import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { getWeekMonday } from "@/lib/newsletter-weeks";
import {
  isFullDocumentResearchTitle,
  normalizeResearchTitle,
  isProductSourceType,
  isProductStatus,
  ProductSourceType,
  ProductStatus,
  toProductSlug,
} from "@/lib/products";
import {
  isProjectKind,
  isProjectStatus,
  ProjectKind,
  ProjectStatus,
  toProjectSlug,
} from "@/lib/projects";
import {
  type ResearchArtifactDomain,
  type ResearchArtifactStatus,
} from "@/lib/research-artifacts";
import { normalizeTaskStatusInput } from "@/lib/task-workflow";

let _sql: NeonQueryFunction<false, false> | null = null;
function sql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
}

/** Neon returns DATE/TIMESTAMPTZ as Date objects — coerce to YYYY-MM-DD string */
function toDateStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string") return v.slice(0, 10);
  return String(v);
}

function toDateTimeStr(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  if (v === null || v === undefined) return "";
  return String(v);
}

function toNumberOr(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toJsonArrayOrNull(v: unknown): unknown[] | null {
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

interface TaskSchemaCapabilities {
  hasBoardOrder: boolean;
}

let _taskSchemaCapabilities: TaskSchemaCapabilities | null = null;

async function getTaskSchemaCapabilities(): Promise<TaskSchemaCapabilities> {
  if (_taskSchemaCapabilities) return _taskSchemaCapabilities;

  const rows = await sql()`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tasks'
        AND column_name = 'board_order'
    ) AS has_board_order
  `;

  _taskSchemaCapabilities = {
    hasBoardOrder: Boolean(rows[0]?.has_board_order),
  };
  return _taskSchemaCapabilities;
}

function mapTaskStatusForLegacySchema(status: string): string {
  const normalized = normalizeTaskStatusInput(status);
  if (normalized === "backlog" || normalized === "todo") return "open";
  return normalized;
}

// --- Newsletter ---

export interface DbNewsletterArticle {
  id: string;
  digest_date: string;
  title: string;
  source: string | null;
  link: string | null;
  category: string | null;
  description: string | null;
  created_at: string;
}

export async function fetchNewsletterArticlesDb(): Promise<DbNewsletterArticle[]> {
  const rows = await sql()`SELECT * FROM newsletter_articles ORDER BY digest_date DESC, created_at`;
  return rows.map((r) => ({ ...r, digest_date: toDateStr(r.digest_date) })) as unknown as DbNewsletterArticle[];
}

export async function insertNewsletterArticles(
  digestDate: string,
  articles: { title: string; source?: string; link?: string; category?: string; description?: string }[]
): Promise<{ ids: string[]; skipped: string[] }> {
  const ids: string[] = [];
  const skipped: string[] = [];
  for (const a of articles) {
    // Check for duplicate title across ALL dates (not just this digest)
    const existing = await sql()`
      SELECT id, digest_date FROM newsletter_articles WHERE title = ${a.title} LIMIT 1
    `;
    if (existing.length > 0) {
      skipped.push(`"${a.title}" (already exists from ${toDateStr(existing[0].digest_date)})`);
      continue;
    }
    const rows = await sql()`
      INSERT INTO newsletter_articles (digest_date, title, source, link, category, description)
      VALUES (${digestDate}, ${a.title}, ${a.source || null}, ${a.link || null}, ${a.category || null}, ${a.description || null})
      ON CONFLICT (digest_date, title) DO UPDATE SET
        link = COALESCE(EXCLUDED.link, newsletter_articles.link),
        source = COALESCE(EXCLUDED.source, newsletter_articles.source),
        category = COALESCE(EXCLUDED.category, newsletter_articles.category),
        description = COALESCE(EXCLUDED.description, newsletter_articles.description)
      RETURNING id
    `;
    ids.push(rows[0].id);
  }
  return { ids, skipped };
}

export async function updateNewsletterArticle(
  id: string,
  fields: { title?: string; source?: string; link?: string; category?: string; description?: string }
): Promise<boolean> {
  const rows = await sql()`
    UPDATE newsletter_articles SET
      title = COALESCE(${fields.title ?? null}::text, title),
      source = COALESCE(${fields.source ?? null}::text, source),
      link = COALESCE(${fields.link ?? null}::text, link),
      category = COALESCE(${fields.category ?? null}::text, category),
      description = COALESCE(${fields.description ?? null}::text, description)
    WHERE id = ${id}
    RETURNING id
  `;
  return rows.length > 0;
}

// --- Tasks ---

export interface DbTask {
  id: string;
  title: string;
  detail: string | null;
  status: string;
  priority: string;
  effort: string | null;
  due_date: string | null;
  blocked_by: string | null;
  board_order: number;
  created_at: string;
  updated_at: string;
}

export async function fetchTasksDb(): Promise<DbTask[]> {
  const capabilities = await getTaskSchemaCapabilities();
  const rows = capabilities.hasBoardOrder
    ? await sql()`
        SELECT * FROM tasks
        WHERE status != 'done' OR updated_at > now() - interval '7 days'
        ORDER BY
          CASE status
            WHEN 'backlog' THEN 0
            WHEN 'open' THEN 0
            WHEN 'todo' THEN 1
            WHEN 'in_progress' THEN 2
            WHEN 'done' THEN 3
            ELSE 4
          END,
          board_order ASC NULLS LAST,
          CASE priority
            WHEN 'urgent' THEN 0
            WHEN 'high' THEN 1
            WHEN 'normal' THEN 2
            WHEN 'low' THEN 3
          END,
          due_date NULLS LAST,
          created_at
      `
    : await sql()`
        SELECT * FROM tasks
        WHERE status != 'done' OR updated_at > now() - interval '7 days'
        ORDER BY
          CASE status
            WHEN 'open' THEN 0
            WHEN 'in_progress' THEN 2
            WHEN 'done' THEN 3
            ELSE 1
          END,
          CASE priority
            WHEN 'urgent' THEN 0
            WHEN 'high' THEN 1
            WHEN 'normal' THEN 2
            WHEN 'low' THEN 3
          END,
          due_date NULLS LAST,
          created_at
      `;
  return rows.map((r) => ({
    ...r,
    status: normalizeTaskStatusInput(r.status),
    board_order: toNumberOr(r.board_order, 1),
    due_date: r.due_date ? toDateStr(r.due_date) : null,
    created_at: toDateTimeStr(r.created_at),
    updated_at: toDateTimeStr(r.updated_at),
  })) as unknown as DbTask[];
}

export async function fetchTasksByStatus(status?: string): Promise<DbTask[]> {
  const capabilities = await getTaskSchemaCapabilities();
  const normalizedStatus = status ? normalizeTaskStatusInput(status) : undefined;
  const rows = capabilities.hasBoardOrder
    ? normalizedStatus
      ? normalizedStatus === "backlog"
        ? await sql()`
            SELECT * FROM tasks
            WHERE status IN ('backlog', 'open')
            ORDER BY board_order ASC NULLS LAST, created_at DESC
          `
        : await sql()`
            SELECT * FROM tasks
            WHERE status = ${normalizedStatus}
            ORDER BY board_order ASC NULLS LAST, created_at DESC
          `
      : await sql()`
          SELECT * FROM tasks
          ORDER BY created_at DESC
        `
    : normalizedStatus
      ? await sql()`
          SELECT * FROM tasks
          WHERE status = ${mapTaskStatusForLegacySchema(normalizedStatus)}
          ORDER BY created_at DESC
        `
      : await sql()`
          SELECT * FROM tasks
          ORDER BY created_at DESC
        `;
  return rows.map((r) => ({
    ...r,
    status: normalizeTaskStatusInput(r.status),
    board_order: toNumberOr(r.board_order, 1),
    due_date: r.due_date ? toDateStr(r.due_date) : null,
    created_at: toDateTimeStr(r.created_at),
    updated_at: toDateTimeStr(r.updated_at),
  })) as unknown as DbTask[];
}

export async function insertTask(
  title: string,
  opts?: { detail?: string; priority?: string; effort?: string; due_date?: string; blocked_by?: string; status?: string }
): Promise<string> {
  const capabilities = await getTaskSchemaCapabilities();
  const status = normalizeTaskStatusInput(opts?.status);
  const rows = capabilities.hasBoardOrder
    ? await (async () => {
        const maxOrderRows = status === "backlog"
          ? await sql()`SELECT COALESCE(MAX(board_order), 0) AS max_order FROM tasks WHERE status IN ('backlog', 'open')`
          : await sql()`SELECT COALESCE(MAX(board_order), 0) AS max_order FROM tasks WHERE status = ${status}`;
        const boardOrder = Number(maxOrderRows[0]?.max_order ?? 0) + 1;
        return sql()`
          INSERT INTO tasks (title, detail, priority, effort, due_date, blocked_by, status, board_order)
          VALUES (${title}, ${opts?.detail || null}, ${opts?.priority || 'normal'}, ${opts?.effort || null}, ${opts?.due_date || null}, ${opts?.blocked_by || null}, ${status}, ${boardOrder})
          RETURNING id
        `;
      })()
    : await sql()`
        INSERT INTO tasks (title, detail, priority, effort, due_date, blocked_by, status)
        VALUES (${title}, ${opts?.detail || null}, ${opts?.priority || 'normal'}, ${opts?.effort || null}, ${opts?.due_date || null}, ${opts?.blocked_by || null}, ${mapTaskStatusForLegacySchema(status)})
        RETURNING id
      `;
  return rows[0].id;
}

export async function updateTask(
  id: string,
  fields: Partial<Pick<DbTask, "title" | "detail" | "status" | "priority" | "effort" | "due_date" | "blocked_by" | "board_order">>
): Promise<boolean> {
  const capabilities = await getTaskSchemaCapabilities();
  const normalizedStatus = fields.status === undefined
    ? undefined
    : normalizeTaskStatusInput(fields.status);

  const hasUpdates = capabilities.hasBoardOrder
    ? [
        fields.title,
        fields.detail,
        normalizedStatus,
        fields.priority,
        fields.effort,
        fields.due_date,
        fields.blocked_by,
        fields.board_order,
      ].some((v) => v !== undefined)
    : [
    fields.title,
    fields.detail,
    normalizedStatus,
    fields.priority,
    fields.effort,
    fields.due_date,
    fields.blocked_by,
      ].some((v) => v !== undefined);

  if (!hasUpdates) return false;

  const rows = capabilities.hasBoardOrder
    ? await sql()`
        UPDATE tasks SET
          title = COALESCE(${fields.title ?? null}::text, title),
          detail = COALESCE(${fields.detail ?? null}::text, detail),
          status = COALESCE(${normalizedStatus ?? null}::text, status),
          priority = COALESCE(${fields.priority ?? null}::text, priority),
          effort = COALESCE(${fields.effort ?? null}::text, effort),
          due_date = COALESCE(${fields.due_date ?? null}::date, due_date),
          blocked_by = COALESCE(${fields.blocked_by ?? null}::text, blocked_by),
          board_order = COALESCE(${fields.board_order ?? null}::double precision, board_order),
          updated_at = now()
        WHERE id = ${id}
        RETURNING id
      `
    : await sql()`
        UPDATE tasks SET
          title = COALESCE(${fields.title ?? null}::text, title),
          detail = COALESCE(${fields.detail ?? null}::text, detail),
          status = COALESCE(${normalizedStatus ? mapTaskStatusForLegacySchema(normalizedStatus) : null}::text, status),
          priority = COALESCE(${fields.priority ?? null}::text, priority),
          effort = COALESCE(${fields.effort ?? null}::text, effort),
          due_date = COALESCE(${fields.due_date ?? null}::date, due_date),
          blocked_by = COALESCE(${fields.blocked_by ?? null}::text, blocked_by),
          updated_at = now()
        WHERE id = ${id}
        RETURNING id
      `;
  return rows.length > 0;
}

// --- Newsletter Digests (grouped view) ---

export interface NewsletterArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  link: string;
  category?: string;
}

export interface NewsletterDigest {
  date: string;
  label: string;
  articles: NewsletterArticle[];
  articleCount?: number;
}

export async function fetchNewsletterDigests(): Promise<NewsletterDigest[]> {
  const rows = await fetchNewsletterArticlesDb();
  if (rows.length === 0) return [];

  const byDate = new Map<string, NewsletterArticle[]>();
  for (const r of rows) {
    const date = r.digest_date.slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push({
      id: r.id,
      title: r.title,
      description: r.description || "",
      source: r.source || "",
      link: r.link || "",
      category: r.category || undefined,
    });
  }

  const digests: NewsletterDigest[] = [];
  for (const [date, articles] of byDate) {
    digests.push({ date, label: formatDayLabel(date), articles, articleCount: articles.length });
  }

  return digests;
}

export async function fetchNewsletterWeek(start: string, end: string): Promise<NewsletterDigest[]> {
  const rows = await sql()`
    SELECT * FROM newsletter_articles
    WHERE digest_date BETWEEN ${start} AND ${end}
    ORDER BY digest_date DESC, created_at ASC
  `;
  if (rows.length === 0) return [];

  const byDate = new Map<string, NewsletterArticle[]>();
  for (const r of rows) {
    const date = toDateStr(r.digest_date);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push({
      id: r.id,
      title: r.title,
      description: r.description || "",
      source: r.source || "",
      link: r.link || "",
      category: r.category || undefined,
    });
  }

  const digests: NewsletterDigest[] = [];
  for (const [date, articles] of byDate) {
    digests.push({ date, label: formatDayLabel(date), articles, articleCount: articles.length });
  }
  return digests;
}

/** Returns all distinct week-start Mondays that have newsletter articles, sorted newest first. */
export async function fetchNewsletterWeekStarts(): Promise<string[]> {
  const rows = await sql()`SELECT DISTINCT digest_date FROM newsletter_articles ORDER BY digest_date DESC`;
  const seen = new Set<string>();
  for (const r of rows) {
    seen.add(getWeekMonday(toDateStr(r.digest_date)));
  }
  return [...seen].sort().reverse();
}

export async function deleteNewsletterArticle(id: string): Promise<void> {
  await sql()`DELETE FROM newsletter_articles WHERE id = ${id}`;
}

// --- X Drafts ---

export interface DbXDraft {
  id: string;
  text: string;
  status: string;
  source_batch: string | null;
  tweet_url: string | null;
  created_at: string;
  posted_at: string | null;
}

export async function fetchXDrafts(status?: string): Promise<DbXDraft[]> {
  const rows = status
    ? await sql()`SELECT * FROM x_drafts WHERE status = ${status} ORDER BY created_at ASC`
    : await sql()`SELECT * FROM x_drafts ORDER BY created_at ASC`;
  return rows as unknown as DbXDraft[];
}

export async function insertXDrafts(
  drafts: { text: string; status?: string; source_batch?: string }[]
): Promise<string[]> {
  const ids: string[] = [];
  for (const d of drafts) {
    const rows = await sql()`
      INSERT INTO x_drafts (text, status, source_batch)
      VALUES (${d.text}, ${d.status || "draft"}, ${d.source_batch || null})
      RETURNING id
    `;
    ids.push(rows[0].id);
  }
  return ids;
}

export async function updateXDraft(
  id: string,
  fields: { status?: string; tweet_url?: string | null; posted_at?: string | null }
): Promise<boolean> {
  const rows = await sql()`
    UPDATE x_drafts SET
      status = COALESCE(${fields.status ?? null}::text, status),
      tweet_url = COALESCE(${fields.tweet_url ?? null}::text, tweet_url),
      posted_at = COALESCE(${fields.posted_at ?? null}::timestamptz, posted_at)
    WHERE id = ${id}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function deleteXDraft(id: string): Promise<void> {
  await sql()`DELETE FROM x_drafts WHERE id = ${id}`;
}

export interface DraftDay {
  date: string;
  label: string;
  drafts: DbXDraft[];
}

export async function fetchXDraftsWeek(start: string, end: string): Promise<DraftDay[]> {
  const rows = await sql()`
    SELECT * FROM x_drafts
    WHERE created_at::date BETWEEN ${start}::date AND ${end}::date
    ORDER BY created_at DESC
  `;
  if (rows.length === 0) return [];

  const byDate = new Map<string, DbXDraft[]>();
  for (const r of rows) {
    const date = toDateStr(r.created_at);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(r as unknown as DbXDraft);
  }

  const days: DraftDay[] = [];
  for (const [date, items] of byDate) {
    days.push({ date, label: formatDayLabel(date), drafts: items });
  }
  return days;
}

export async function fetchXDraftWeekStarts(): Promise<string[]> {
  const rows = await sql()`SELECT DISTINCT created_at::date AS date FROM x_drafts ORDER BY date DESC`;
  const seen = new Set<string>();
  for (const r of rows) {
    seen.add(getWeekMonday(toDateStr(r.date)));
  }
  return [...seen].sort().reverse();
}

// --- Projects ---

export interface DbProject {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  status: ProjectStatus;
  kind: ProjectKind;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  product_id: string | null;
  artifact_count: number;
}

export interface ProjectInput {
  title: string;
  slug?: string;
  summary?: string;
  status?: string;
  kind?: string;
  created_by?: string;
}

interface FetchProjectsOptions {
  status?: string;
  kind?: string;
  q?: string;
  includeArchived?: boolean;
}

type ProjectUpdateFields = Partial<
  Pick<DbProject, "title" | "slug" | "summary" | "status" | "kind">
>;

export interface ProjectWithDetails {
  project: DbProject;
  linkedProduct: DbProductIdea | null;
  productResearch: DbProductResearchItem[];
  artifacts: DbResearchArtifact[];
}

let _hasProjectsTable: boolean | null = null;

async function hasProjectsTable(): Promise<boolean> {
  if (_hasProjectsTable !== null) return _hasProjectsTable;
  const rows = await sql()`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'projects'
    ) AS has_table
  `;
  _hasProjectsTable = Boolean(rows[0]?.has_table);
  return _hasProjectsTable;
}

function mapProjectRow(row: Record<string, unknown>): DbProject {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title),
    summary: row.summary === null || row.summary === undefined ? null : String(row.summary),
    status: row.status as ProjectStatus,
    kind: row.kind as ProjectKind,
    created_by: row.created_by === null || row.created_by === undefined ? null : String(row.created_by),
    created_at: toDateTimeStr(row.created_at),
    updated_at: toDateTimeStr(row.updated_at),
    product_id: row.product_id === null || row.product_id === undefined ? null : String(row.product_id),
    artifact_count: toNumberOr(row.artifact_count, 0),
  };
}

export async function fetchProjectsDb(options?: FetchProjectsOptions): Promise<DbProject[]> {
  if (!(await hasProjectsTable())) {
    const products = await fetchProductsDb({ includeArchived: true });
    let fallback = products.map((product) => ({
      id: product.project_id || product.id,
      slug: product.slug,
      title: product.title,
      summary: product.summary,
      status: product.status as ProjectStatus,
      kind: "product" as const,
      created_by: product.created_by,
      created_at: product.created_at,
      updated_at: product.updated_at,
      product_id: product.id,
      artifact_count: 0,
    }));

    if (options?.status) {
      fallback = fallback.filter((p) => p.status === options.status);
    } else if (!options?.includeArchived) {
      fallback = fallback.filter((p) => p.status !== "archived");
    }

    if (options?.kind) {
      fallback = fallback.filter((p) => p.kind === options.kind);
    }

    if (options?.q) {
      const q = options.q.toLowerCase().trim();
      if (q.length > 0) {
        fallback = fallback.filter((p) => {
          const haystack = [p.title, p.summary || ""].join(" ").toLowerCase();
          return haystack.includes(q);
        });
      }
    }

    return fallback;
  }

  const rows = await sql()`
    SELECT
      p.*,
      pi.id AS product_id,
      COALESCE(COUNT(ra.id), 0)::int AS artifact_count
    FROM projects p
    LEFT JOIN product_ideas pi ON pi.project_id = p.id
    LEFT JOIN research_artifacts ra ON ra.project_id = p.id
    GROUP BY p.id, pi.id
    ORDER BY
      CASE p.status
        WHEN 'idea' THEN 0
        WHEN 'researching' THEN 1
        WHEN 'building' THEN 2
        WHEN 'launched' THEN 3
        WHEN 'archived' THEN 4
        ELSE 5
      END,
      p.updated_at DESC,
      p.created_at DESC
  `;

  let projects = rows.map((row) => mapProjectRow(row as Record<string, unknown>));

  if (options?.status) {
    projects = projects.filter((p) => p.status === options.status);
  } else if (!options?.includeArchived) {
    projects = projects.filter((p) => p.status !== "archived");
  }

  if (options?.kind) {
    projects = projects.filter((p) => p.kind === options.kind);
  }

  if (options?.q) {
    const q = options.q.toLowerCase().trim();
    if (q.length > 0) {
      projects = projects.filter((p) => {
        const haystack = [p.title, p.summary || ""].join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }
  }

  return projects;
}

export async function fetchProjectBySlug(slug: string): Promise<ProjectWithDetails | null> {
  if (!(await hasProjectsTable())) {
    const productData = await fetchProductBySlug(slug);
    if (!productData) return null;
    return {
      project: {
        id: productData.product.project_id || productData.product.id,
        slug: productData.product.slug,
        title: productData.product.title,
        summary: productData.product.summary,
        status: productData.product.status as ProjectStatus,
        kind: "product",
        created_by: productData.product.created_by,
        created_at: productData.product.created_at,
        updated_at: productData.product.updated_at,
        product_id: productData.product.id,
        artifact_count: 0,
      },
      linkedProduct: productData.product,
      productResearch: productData.research,
      artifacts: [],
    };
  }

  const rows = await sql()`
    SELECT
      p.*,
      pi.id AS product_id,
      0::int AS artifact_count
    FROM projects p
    LEFT JOIN product_ideas pi ON pi.project_id = p.id
    WHERE p.slug = ${slug}
    LIMIT 1
  `;
  if (rows.length === 0) return null;

  const project = mapProjectRow(rows[0] as Record<string, unknown>);
  const linkedProduct = project.product_id ? await fetchProductById(project.product_id) : null;
  const artifacts = await fetchResearchArtifactsDb({ project_id: project.id, limit: 500 });

  return {
    project: {
      ...project,
      artifact_count: artifacts.length,
    },
    linkedProduct: linkedProduct?.product ?? null,
    productResearch: linkedProduct?.research ?? [],
    artifacts,
  };
}

export async function fetchProjectById(id: string): Promise<ProjectWithDetails | null> {
  if (!(await hasProjectsTable())) {
    const productData = await fetchProductById(id);
    if (!productData) return null;
    return {
      project: {
        id: productData.product.project_id || productData.product.id,
        slug: productData.product.slug,
        title: productData.product.title,
        summary: productData.product.summary,
        status: productData.product.status as ProjectStatus,
        kind: "product",
        created_by: productData.product.created_by,
        created_at: productData.product.created_at,
        updated_at: productData.product.updated_at,
        product_id: productData.product.id,
        artifact_count: 0,
      },
      linkedProduct: productData.product,
      productResearch: productData.research,
      artifacts: [],
    };
  }

  const rows = await sql()`
    SELECT
      p.*,
      pi.id AS product_id,
      0::int AS artifact_count
    FROM projects p
    LEFT JOIN product_ideas pi ON pi.project_id = p.id
    WHERE p.id = ${id}::uuid
    LIMIT 1
  `;
  if (rows.length === 0) return null;

  const project = mapProjectRow(rows[0] as Record<string, unknown>);
  const linkedProduct = project.product_id ? await fetchProductById(project.product_id) : null;
  const artifacts = await fetchResearchArtifactsDb({ project_id: project.id, limit: 500 });

  return {
    project: {
      ...project,
      artifact_count: artifacts.length,
    },
    linkedProduct: linkedProduct?.product ?? null,
    productResearch: linkedProduct?.research ?? [],
    artifacts,
  };
}

export async function insertProjects(projects: ProjectInput[]): Promise<string[]> {
  if (!(await hasProjectsTable())) {
    throw new Error("projects table is not available");
  }

  const ids: string[] = [];
  for (const item of projects) {
    const baseSlug = toProjectSlug(item.slug || item.title) || "project";
    const slug = await ensureUniqueProjectSlug(baseSlug);
    const status = item.status && isProjectStatus(item.status) ? item.status : "idea";
    const kind = item.kind && isProjectKind(item.kind) ? item.kind : "general";

    const rows = await sql()`
      INSERT INTO projects (slug, title, summary, status, kind, created_by)
      VALUES (
        ${slug},
        ${item.title},
        ${item.summary || null},
        ${status},
        ${kind},
        ${item.created_by || "moltzart"}
      )
      RETURNING id
    `;
    ids.push(String(rows[0].id));
  }

  return ids;
}

export async function updateProject(id: string, fields: ProjectUpdateFields): Promise<boolean> {
  if (!(await hasProjectsTable())) return false;

  const hasAnyField =
    fields.title !== undefined ||
    fields.slug !== undefined ||
    fields.summary !== undefined ||
    fields.status !== undefined ||
    fields.kind !== undefined;
  if (!hasAnyField) return false;

  let nextSlug: string | null = null;
  if (fields.slug !== undefined) {
    const baseSlug = toProjectSlug(fields.slug);
    if (!baseSlug) throw new Error("Invalid slug");
    nextSlug = await ensureUniqueProjectSlug(baseSlug, id);
  }

  let nextStatus: string | null = null;
  if (fields.status !== undefined) {
    if (!isProjectStatus(fields.status)) throw new Error("Invalid status");
    nextStatus = fields.status;
  }

  let nextKind: string | null = null;
  if (fields.kind !== undefined) {
    if (!isProjectKind(fields.kind)) throw new Error("Invalid kind");
    nextKind = fields.kind;
  }

  const rows = await sql()`
    UPDATE projects SET
      title = COALESCE(${fields.title ?? null}::text, title),
      slug = COALESCE(${nextSlug}::text, slug),
      summary = COALESCE(${fields.summary ?? null}::text, summary),
      status = COALESCE(${nextStatus}::text, status),
      kind = COALESCE(${nextKind}::text, kind),
      updated_at = now()
    WHERE id = ${id}::uuid
    RETURNING id
  `;
  return rows.length > 0;
}

// --- Products ---

export interface DbProductIdea {
  id: string;
  project_id: string | null;
  slug: string;
  title: string;
  summary: string | null;
  status: ProductStatus;
  problem: string | null;
  audience: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  research_count: number;
}

export interface DbProductResearchItem {
  id: string;
  product_id: string;
  title: string;
  source_url: string | null;
  source_type: ProductSourceType;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductWithResearch {
  product: DbProductIdea;
  research: DbProductResearchItem[];
}

export interface ProductResearchInput {
  title: string;
  source_url?: string;
  source_type?: string;
  notes?: string;
}

export interface ProductIdeaInput {
  title: string;
  slug?: string;
  summary?: string;
  status?: string;
  problem?: string;
  audience?: string;
  created_by?: string;
  research?: ProductResearchInput[];
}

interface FetchProductsOptions {
  status?: string;
  q?: string;
  includeArchived?: boolean;
}

type ProductIdeaUpdateFields = Partial<
  Pick<DbProductIdea, "title" | "slug" | "summary" | "status" | "problem" | "audience">
>;

export async function fetchProductsDb(options?: FetchProductsOptions): Promise<DbProductIdea[]> {
  const rows = await sql()`
    SELECT
      p.*,
      COALESCE(COUNT(r.id), 0)::int AS research_count
    FROM product_ideas p
    LEFT JOIN product_research_items r ON r.product_id = p.id
    GROUP BY p.id
    ORDER BY
      CASE p.status
        WHEN 'idea' THEN 0
        WHEN 'researching' THEN 1
        WHEN 'building' THEN 2
        WHEN 'launched' THEN 3
        WHEN 'archived' THEN 4
        ELSE 5
      END,
      p.updated_at DESC,
      p.created_at DESC
  `;

  let products = rows.map((r) => ({
    ...r,
    project_id: r.project_id ? String(r.project_id) : null,
    research_count: Number(r.research_count ?? 0),
  })) as unknown as DbProductIdea[];

  if (options?.status) {
    products = products.filter((p) => p.status === options.status);
  } else if (!options?.includeArchived) {
    products = products.filter((p) => p.status !== "archived");
  }

  if (options?.q) {
    const q = options.q.toLowerCase().trim();
    if (q.length > 0) {
      products = products.filter((p) => {
        const haystack = [p.title, p.summary || "", p.problem || "", p.audience || ""]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
  }

  return products;
}

export async function fetchProductResearch(productId: string): Promise<DbProductResearchItem[]> {
  const rows = await sql()`
    SELECT * FROM product_research_items
    WHERE product_id = ${productId}
    ORDER BY created_at DESC
  `;
  return rows as unknown as DbProductResearchItem[];
}

export async function fetchProductBySlug(slug: string): Promise<ProductWithResearch | null> {
  const rows = await sql()`
    SELECT * FROM product_ideas
    WHERE slug = ${slug}
    LIMIT 1
  `;
  if (rows.length === 0) return null;

  const research = await fetchProductResearch(rows[0].id);
  const product = {
    ...(rows[0] as DbProductIdea),
    project_id: rows[0].project_id ? String(rows[0].project_id) : null,
    research_count: research.length,
  };
  return { product, research };
}

export async function fetchProductById(id: string): Promise<ProductWithResearch | null> {
  const rows = await sql()`
    SELECT * FROM product_ideas
    WHERE id = ${id}
    LIMIT 1
  `;
  if (rows.length === 0) return null;

  const research = await fetchProductResearch(id);
  const product = {
    ...(rows[0] as DbProductIdea),
    project_id: rows[0].project_id ? String(rows[0].project_id) : null,
    research_count: research.length,
  };
  return { product, research };
}

export async function fetchProjectIdByProductId(productId: string): Promise<string | null> {
  const rows = await sql()`
    SELECT project_id
    FROM product_ideas
    WHERE id = ${productId}::uuid
    LIMIT 1
  `;
  if (rows.length === 0) return null;
  return rows[0].project_id ? String(rows[0].project_id) : null;
}

export async function insertProductResearchItems(
  productId: string,
  items: ProductResearchInput[]
): Promise<string[]> {
  if (items.length === 0) return [];

  const existingRows = await fetchProductResearch(productId);
  const groupedExisting = new Map<
    string,
    { full: DbProductResearchItem[]; short: DbProductResearchItem[] }
  >();

  for (const row of existingRows) {
    const key = normalizeResearchTitle(row.title);
    const bucket = groupedExisting.get(key) ?? { full: [], short: [] };
    if (isFullDocumentResearchTitle(row.title)) bucket.full.push(row);
    else bucket.short.push(row);
    groupedExisting.set(key, bucket);
  }

  const incomingByKey = new Map<
    string,
    { title: string; source_url?: string; source_type: ProductSourceType; notes?: string; isFull: boolean }
  >();

  for (const item of items) {
    const sourceType =
      item.source_type && isProductSourceType(item.source_type) ? item.source_type : "note";
    const key = normalizeResearchTitle(item.title);
    const candidate = {
      title: item.title,
      source_url: item.source_url,
      source_type: sourceType,
      notes: item.notes,
      isFull: isFullDocumentResearchTitle(item.title),
    };
    const prev = incomingByKey.get(key);

    if (!prev || (candidate.isFull && !prev.isFull) || candidate.isFull === prev.isFull) {
      incomingByKey.set(key, candidate);
    }
  }

  const ids: string[] = [];
  for (const [key, candidate] of incomingByKey) {
    const existing = groupedExisting.get(key) ?? { full: [], short: [] };

    if (candidate.isFull) {
      if (existing.full.length > 0) {
        const keep = existing.full[0];
        const updated = await sql()`
          UPDATE product_research_items
          SET
            title = ${candidate.title},
            source_url = ${candidate.source_url || null},
            source_type = ${candidate.source_type},
            notes = ${candidate.notes || null},
            updated_at = now()
          WHERE id = ${keep.id}
          RETURNING id
        `;
        ids.push(updated[0].id as string);

        for (const dup of existing.full.slice(1)) {
          await sql()`DELETE FROM product_research_items WHERE id = ${dup.id}`;
        }
      } else {
        const inserted = await sql()`
          INSERT INTO product_research_items (product_id, title, source_url, source_type, notes)
          VALUES (
            ${productId},
            ${candidate.title},
            ${candidate.source_url || null},
            ${candidate.source_type},
            ${candidate.notes || null}
          )
          RETURNING id
        `;
        ids.push(inserted[0].id as string);
      }

      for (const shortRow of existing.short) {
        await sql()`DELETE FROM product_research_items WHERE id = ${shortRow.id}`;
      }
      continue;
    }

    if (existing.full.length > 0) continue;

    if (existing.short.length > 0) {
      const keep = existing.short[0];
      const updated = await sql()`
        UPDATE product_research_items
        SET
          title = ${candidate.title},
          source_url = ${candidate.source_url || null},
          source_type = ${candidate.source_type},
          notes = ${candidate.notes || null},
          updated_at = now()
        WHERE id = ${keep.id}
        RETURNING id
      `;
      ids.push(updated[0].id as string);

      for (const dup of existing.short.slice(1)) {
        await sql()`DELETE FROM product_research_items WHERE id = ${dup.id}`;
      }
      continue;
    }

    const inserted = await sql()`
      INSERT INTO product_research_items (product_id, title, source_url, source_type, notes)
      VALUES (
        ${productId},
        ${candidate.title},
        ${candidate.source_url || null},
        ${candidate.source_type},
        ${candidate.notes || null}
      )
      RETURNING id
    `;
    ids.push(inserted[0].id as string);
  }

  return ids;
}

export async function insertProductIdeas(products: ProductIdeaInput[]): Promise<string[]> {
  const ids: string[] = [];
  const supportsProjects = await hasProjectsTable();

  for (const item of products) {
    const baseSlug = toProductSlug(item.slug || item.title) || "product";
    const slug = await ensureUniqueProductSlug(baseSlug);
    const status = item.status && isProductStatus(item.status) ? item.status : "idea";
    const createdBy = item.created_by || "moltzart";
    const rows = supportsProjects
      ? await (async () => {
          const projectId = await upsertProjectForProduct({
            slug,
            title: item.title,
            summary: item.summary || null,
            status,
            created_by: createdBy,
          });
          return sql()`
            INSERT INTO product_ideas (project_id, slug, title, summary, status, problem, audience, created_by)
            VALUES (
              ${projectId}::uuid,
              ${slug},
              ${item.title},
              ${item.summary || null},
              ${status},
              ${item.problem || null},
              ${item.audience || null},
              ${createdBy}
            )
            RETURNING id
          `;
        })()
      : await sql()`
          INSERT INTO product_ideas (slug, title, summary, status, problem, audience, created_by)
          VALUES (
            ${slug},
            ${item.title},
            ${item.summary || null},
            ${status},
            ${item.problem || null},
            ${item.audience || null},
            ${createdBy}
          )
          RETURNING id
        `;

    const productId = rows[0].id as string;
    ids.push(productId);

    if (item.research && item.research.length > 0) {
      await insertProductResearchItems(productId, item.research);
    }
  }

  return ids;
}

export async function updateProductIdea(
  id: string,
  fields: ProductIdeaUpdateFields
): Promise<boolean> {
  const hasAnyField =
    fields.title !== undefined ||
    fields.slug !== undefined ||
    fields.summary !== undefined ||
    fields.status !== undefined ||
    fields.problem !== undefined ||
    fields.audience !== undefined;

  if (!hasAnyField) return false;

  const currentRows = await sql()`
    SELECT * FROM product_ideas
    WHERE id = ${id}::uuid
    LIMIT 1
  `;
  if (currentRows.length === 0) return false;

  const current = currentRows[0] as Record<string, unknown>;
  let nextSlug: string | null = null;
  if (fields.slug !== undefined) {
    const baseSlug = toProductSlug(fields.slug);
    if (!baseSlug) throw new Error("Invalid slug");
    nextSlug = await ensureUniqueProductSlug(baseSlug, id);
  }

  let nextStatus: string | null = null;
  if (fields.status !== undefined) {
    if (!isProductStatus(fields.status)) throw new Error("Invalid status");
    nextStatus = fields.status;
  }

  const rows = await sql()`
    UPDATE product_ideas SET
      title = COALESCE(${fields.title ?? null}::text, title),
      slug = COALESCE(${nextSlug}::text, slug),
      summary = COALESCE(${fields.summary ?? null}::text, summary),
      status = COALESCE(${nextStatus}::text, status),
      problem = COALESCE(${fields.problem ?? null}::text, problem),
      audience = COALESCE(${fields.audience ?? null}::text, audience),
      updated_at = now()
    WHERE id = ${id}::uuid
    RETURNING *
  `;
  if (rows.length === 0) return false;

  if (await hasProjectsTable()) {
    const updated = rows[0] as Record<string, unknown>;
    const projectId = await upsertProjectForProduct({
      project_id: (updated.project_id ?? current.project_id) as string | null,
      slug: String(updated.slug),
      title: String(updated.title),
      summary: updated.summary ? String(updated.summary) : null,
      status: String(updated.status),
      created_by: updated.created_by ? String(updated.created_by) : "moltzart",
    });
    if (!updated.project_id) {
      await sql()`
        UPDATE product_ideas
        SET project_id = ${projectId}::uuid
        WHERE id = ${id}::uuid
      `;
    }
  }

  return true;
}

async function upsertProjectForProduct(input: {
  project_id?: string | null;
  slug: string;
  title: string;
  summary: string | null;
  status: string;
  created_by: string;
}): Promise<string> {
  if (!(await hasProjectsTable())) {
    throw new Error("projects table is not available");
  }

  const projectStatus: ProjectStatus = isProjectStatus(input.status) ? input.status : "idea";
  const slugBase = toProjectSlug(input.slug || input.title) || "project";

  if (input.project_id) {
    const slug = await ensureUniqueProjectSlug(slugBase, input.project_id);
    await sql()`
      UPDATE projects
      SET
        slug = ${slug},
        title = ${input.title},
        summary = ${input.summary},
        status = ${projectStatus},
        kind = 'product',
        updated_at = now()
      WHERE id = ${input.project_id}::uuid
    `;
    return input.project_id;
  }

  const existing = await sql()`
    SELECT id
    FROM projects
    WHERE kind = 'product'
      AND slug = ${slugBase}
    LIMIT 1
  `;
  if (existing.length > 0) {
    const existingId = String(existing[0].id);
    await sql()`
      UPDATE projects
      SET
        title = ${input.title},
        summary = ${input.summary},
        status = ${projectStatus},
        updated_at = now()
      WHERE id = ${existingId}::uuid
    `;
    return existingId;
  }

  const slug = await ensureUniqueProjectSlug(slugBase);
  const inserted = await sql()`
    INSERT INTO projects (slug, title, summary, status, kind, created_by)
    VALUES (
      ${slug},
      ${input.title},
      ${input.summary},
      ${projectStatus},
      'product',
      ${input.created_by || "moltzart"}
    )
    RETURNING id
  `;
  return String(inserted[0].id);
}

// --- Research artifacts ---

export interface DbResearchArtifact {
  id: string;
  title: string;
  domain: ResearchArtifactDomain;
  body_md: string;
  summary: string | null;
  task_id: string | null;
  project_id: string | null;
  product_id: string | null;
  created_by: string;
  source_links: unknown[] | null;
  status: ResearchArtifactStatus;
  created_at: string;
  updated_at: string;
}

interface FetchResearchArtifactsOptions {
  domain?: ResearchArtifactDomain;
  task_id?: string;
  project_id?: string;
  status?: ResearchArtifactStatus;
  limit?: number;
}

interface ResearchArtifactInsertInput {
  title: string;
  domain: ResearchArtifactDomain;
  body_md: string;
  summary?: string;
  task_id?: string;
  project_id?: string;
  product_id?: string;
  created_by: string;
  source_links?: unknown[];
  status?: ResearchArtifactStatus;
}

type ResearchArtifactUpdateFields = Partial<
  Pick<
    DbResearchArtifact,
    "title" | "domain" | "body_md" | "summary" | "task_id" | "project_id" | "product_id" | "created_by" | "source_links" | "status"
  >
>;

interface ResearchArtifactsCapabilities {
  hasTable: boolean;
  hasProjectId: boolean;
}

let _researchArtifactsCapabilities: ResearchArtifactsCapabilities | null = null;

async function getResearchArtifactsCapabilities(): Promise<ResearchArtifactsCapabilities> {
  if (_researchArtifactsCapabilities) return _researchArtifactsCapabilities;

  const rows = await sql()`
    SELECT
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'research_artifacts'
      ) AS has_table,
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'research_artifacts'
          AND column_name = 'project_id'
      ) AS has_project_id
  `;

  _researchArtifactsCapabilities = {
    hasTable: Boolean(rows[0]?.has_table),
    hasProjectId: Boolean(rows[0]?.has_project_id),
  };
  return _researchArtifactsCapabilities;
}

function mapResearchArtifactRow(row: Record<string, unknown>): DbResearchArtifact {
  return {
    id: String(row.id),
    title: String(row.title),
    domain: row.domain as ResearchArtifactDomain,
    body_md: String(row.body_md),
    summary: row.summary === null || row.summary === undefined ? null : String(row.summary),
    task_id: row.task_id === null || row.task_id === undefined ? null : String(row.task_id),
    project_id: row.project_id === null || row.project_id === undefined ? null : String(row.project_id),
    product_id: row.product_id === null || row.product_id === undefined ? null : String(row.product_id),
    created_by: String(row.created_by),
    status: row.status as ResearchArtifactStatus,
    source_links: toJsonArrayOrNull(row.source_links),
    created_at: toDateTimeStr(row.created_at),
    updated_at: toDateTimeStr(row.updated_at),
  };
}

export async function fetchResearchArtifactsDb(
  options?: FetchResearchArtifactsOptions
): Promise<DbResearchArtifact[]> {
  const capabilities = await getResearchArtifactsCapabilities();
  if (!capabilities.hasTable) return [];

  const limit = Math.max(1, Math.min(options?.limit ?? 100, 500));
  const rows = capabilities.hasProjectId
    ? await sql()`
        SELECT * FROM research_artifacts
        WHERE (${options?.domain ?? null}::text IS NULL OR domain = ${options?.domain ?? null})
          AND (${options?.status ?? null}::text IS NULL OR status = ${options?.status ?? null})
          AND (${options?.task_id ?? null}::uuid IS NULL OR task_id = ${options?.task_id ?? null}::uuid)
          AND (${options?.project_id ?? null}::uuid IS NULL OR project_id = ${options?.project_id ?? null}::uuid)
        ORDER BY created_at DESC
        LIMIT ${limit}
      `
    : await sql()`
        SELECT * FROM research_artifacts
        WHERE (${options?.domain ?? null}::text IS NULL OR domain = ${options?.domain ?? null})
          AND (${options?.status ?? null}::text IS NULL OR status = ${options?.status ?? null})
          AND (${options?.task_id ?? null}::uuid IS NULL OR task_id = ${options?.task_id ?? null}::uuid)
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

  return rows.map((row) => mapResearchArtifactRow(row as Record<string, unknown>));
}

export async function fetchResearchArtifactById(id: string): Promise<DbResearchArtifact | null> {
  const capabilities = await getResearchArtifactsCapabilities();
  if (!capabilities.hasTable) return null;

  const rows = await sql()`
    SELECT * FROM research_artifacts
    WHERE id = ${id}::uuid
    LIMIT 1
  `;
  if (rows.length === 0) return null;

  return mapResearchArtifactRow(rows[0] as Record<string, unknown>);
}

export async function insertResearchArtifact(input: ResearchArtifactInsertInput): Promise<string> {
  const capabilities = await getResearchArtifactsCapabilities();
  if (!capabilities.hasTable) {
    throw new Error("research_artifacts table is not available");
  }

  const sourceLinksJson = input.source_links ? JSON.stringify(input.source_links) : null;
  const projectId = capabilities.hasProjectId
    ? (input.project_id ?? (input.product_id ? await fetchProjectIdByProductId(input.product_id) : null))
    : null;

  const rows = capabilities.hasProjectId
    ? await sql()`
        INSERT INTO research_artifacts (
          title,
          domain,
          body_md,
          summary,
          task_id,
          project_id,
          product_id,
          created_by,
          source_links,
          status
        )
        VALUES (
          ${input.title},
          ${input.domain},
          ${input.body_md},
          ${input.summary ?? null},
          ${input.task_id ?? null}::uuid,
          ${projectId ?? null}::uuid,
          ${input.product_id ?? null}::uuid,
          ${input.created_by},
          ${sourceLinksJson}::jsonb,
          ${input.status ?? "published"}
        )
        RETURNING id
      `
    : await sql()`
        INSERT INTO research_artifacts (
          title,
          domain,
          body_md,
          summary,
          task_id,
          product_id,
          created_by,
          source_links,
          status
        )
        VALUES (
          ${input.title},
          ${input.domain},
          ${input.body_md},
          ${input.summary ?? null},
          ${input.task_id ?? null}::uuid,
          ${input.product_id ?? null}::uuid,
          ${input.created_by},
          ${sourceLinksJson}::jsonb,
          ${input.status ?? "published"}
        )
        RETURNING id
      `;

  return rows[0].id as string;
}

export async function updateResearchArtifact(
  id: string,
  fields: ResearchArtifactUpdateFields
): Promise<boolean> {
  const capabilities = await getResearchArtifactsCapabilities();
  if (!capabilities.hasTable) return false;

  const hasAnyField =
    fields.title !== undefined ||
    fields.domain !== undefined ||
    fields.body_md !== undefined ||
    fields.summary !== undefined ||
    fields.task_id !== undefined ||
    fields.project_id !== undefined ||
    fields.product_id !== undefined ||
    fields.created_by !== undefined ||
    fields.source_links !== undefined ||
    fields.status !== undefined;

  if (!hasAnyField) return false;

  const hasSourceLinks = fields.source_links !== undefined;
  const sourceLinksJson = hasSourceLinks
    ? (fields.source_links === null ? null : JSON.stringify(fields.source_links))
    : null;
  const nextProjectId = capabilities.hasProjectId
    ? (fields.project_id !== undefined
      ? fields.project_id
      : fields.product_id
        ? await fetchProjectIdByProductId(fields.product_id)
        : undefined)
    : undefined;

  const rows = capabilities.hasProjectId
    ? await sql()`
        UPDATE research_artifacts
        SET
          title = COALESCE(${fields.title ?? null}::text, title),
          domain = COALESCE(${fields.domain ?? null}::text, domain),
          body_md = COALESCE(${fields.body_md ?? null}::text, body_md),
          summary = COALESCE(${fields.summary ?? null}::text, summary),
          task_id = CASE WHEN ${fields.task_id !== undefined} THEN ${fields.task_id ?? null}::uuid ELSE task_id END,
          project_id = CASE WHEN ${nextProjectId !== undefined} THEN ${nextProjectId ?? null}::uuid ELSE project_id END,
          product_id = CASE WHEN ${fields.product_id !== undefined} THEN ${fields.product_id ?? null}::uuid ELSE product_id END,
          created_by = COALESCE(${fields.created_by ?? null}::text, created_by),
          source_links = CASE WHEN ${hasSourceLinks} THEN ${sourceLinksJson}::jsonb ELSE source_links END,
          status = COALESCE(${fields.status ?? null}::text, status),
          updated_at = now()
        WHERE id = ${id}::uuid
        RETURNING id
      `
    : await sql()`
        UPDATE research_artifacts
        SET
          title = COALESCE(${fields.title ?? null}::text, title),
          domain = COALESCE(${fields.domain ?? null}::text, domain),
          body_md = COALESCE(${fields.body_md ?? null}::text, body_md),
          summary = COALESCE(${fields.summary ?? null}::text, summary),
          task_id = CASE WHEN ${fields.task_id !== undefined} THEN ${fields.task_id ?? null}::uuid ELSE task_id END,
          product_id = CASE WHEN ${fields.product_id !== undefined} THEN ${fields.product_id ?? null}::uuid ELSE product_id END,
          created_by = COALESCE(${fields.created_by ?? null}::text, created_by),
          source_links = CASE WHEN ${hasSourceLinks} THEN ${sourceLinksJson}::jsonb ELSE source_links END,
          status = COALESCE(${fields.status ?? null}::text, status),
          updated_at = now()
        WHERE id = ${id}::uuid
        RETURNING id
      `;

  return rows.length > 0;
}

async function ensureUniqueProductSlug(baseSlug: string, excludeId?: string): Promise<string> {
  const root = baseSlug || "product";
  let candidate = root;
  let suffix = 2;

  while (true) {
    const rows = excludeId
      ? await sql()`
          SELECT id FROM product_ideas
          WHERE slug = ${candidate} AND id != ${excludeId}
          LIMIT 1
        `
      : await sql()`
          SELECT id FROM product_ideas
          WHERE slug = ${candidate}
          LIMIT 1
        `;

    if (rows.length === 0) return candidate;
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }
}

async function ensureUniqueProjectSlug(baseSlug: string, excludeId?: string): Promise<string> {
  const root = baseSlug || "project";
  let candidate = root;
  let suffix = 2;

  while (true) {
    const rows = excludeId
      ? await sql()`
          SELECT id FROM projects
          WHERE slug = ${candidate} AND id != ${excludeId}::uuid
          LIMIT 1
        `
      : await sql()`
          SELECT id FROM projects
          WHERE slug = ${candidate}
          LIMIT 1
        `;

    if (rows.length === 0) return candidate;
    candidate = `${root}-${suffix}`;
    suffix += 1;
  }
}

// --- Cron Jobs ---

export interface DbCronJob {
  id: string;
  name: string;
  agent_id: string | null;
  enabled: boolean;
  schedule_expr: string;
  schedule_tz: string;
  last_run_at: string | null;
  last_status: string | null;
  last_duration_ms: number | null;
  next_run_at: string | null;
  consecutive_errors: number;
  synced_at: string;
}

export async function upsertCronJobs(
  jobs: {
    id: string;
    name: string;
    agent_id?: string;
    enabled?: boolean;
    schedule_expr: string;
    schedule_tz?: string;
    last_run_at?: string | null;
    last_status?: string | null;
    last_duration_ms?: number | null;
    next_run_at?: string | null;
    consecutive_errors?: number;
  }[]
): Promise<number> {
  let upserted = 0;
  for (const j of jobs) {
    await sql()`
      INSERT INTO cron_jobs (id, name, agent_id, enabled, schedule_expr, schedule_tz, last_run_at, last_status, last_duration_ms, next_run_at, consecutive_errors, synced_at)
      VALUES (
        ${j.id}, ${j.name}, ${j.agent_id || null}, ${j.enabled !== false},
        ${j.schedule_expr}, ${j.schedule_tz || "America/New_York"},
        ${j.last_run_at || null}::timestamptz, ${j.last_status || null},
        ${j.last_duration_ms ?? null}::int, ${j.next_run_at || null}::timestamptz,
        ${j.consecutive_errors || 0}, now()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        agent_id = EXCLUDED.agent_id,
        enabled = EXCLUDED.enabled,
        schedule_expr = EXCLUDED.schedule_expr,
        schedule_tz = EXCLUDED.schedule_tz,
        last_run_at = EXCLUDED.last_run_at,
        last_status = EXCLUDED.last_status,
        last_duration_ms = EXCLUDED.last_duration_ms,
        next_run_at = EXCLUDED.next_run_at,
        consecutive_errors = EXCLUDED.consecutive_errors,
        synced_at = EXCLUDED.synced_at
    `;
    upserted++;
  }
  return upserted;
}

export async function fetchCronJobs(): Promise<DbCronJob[]> {
  const rows = await sql()`SELECT * FROM cron_jobs ORDER BY name`;
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    agent_id: r.agent_id ? String(r.agent_id) : null,
    enabled: Boolean(r.enabled),
    schedule_expr: String(r.schedule_expr),
    schedule_tz: String(r.schedule_tz),
    last_run_at: r.last_run_at ? toDateTimeStr(r.last_run_at) : null,
    last_status: r.last_status ? String(r.last_status) : null,
    last_duration_ms: r.last_duration_ms != null ? toNumberOr(r.last_duration_ms, 0) : null,
    next_run_at: r.next_run_at ? toDateTimeStr(r.next_run_at) : null,
    consecutive_errors: toNumberOr(r.consecutive_errors, 0),
    synced_at: toDateTimeStr(r.synced_at),
  })) as DbCronJob[];
}

// --- Month-range queries ---

export async function fetchTasksForMonth(start: string, end: string): Promise<DbTask[]> {
  const rows = await sql()`
    SELECT * FROM tasks
    WHERE (due_date BETWEEN ${start}::date AND ${end}::date)
       OR (due_date IS NULL AND created_at::date BETWEEN ${start}::date AND ${end}::date)
    ORDER BY COALESCE(due_date::date, created_at::date), created_at
  `;
  return rows.map((r) => ({
    id: String(r.id),
    title: String(r.title),
    detail: r.detail ? String(r.detail) : null,
    status: String(r.status),
    priority: String(r.priority),
    effort: r.effort ? String(r.effort) : null,
    due_date: r.due_date ? toDateStr(r.due_date) : null,
    blocked_by: r.blocked_by ? String(r.blocked_by) : null,
    board_order: toNumberOr(r.board_order, 0),
    created_at: toDateTimeStr(r.created_at),
    updated_at: toDateTimeStr(r.updated_at),
  })) as DbTask[];
}

export async function fetchXDraftsForMonth(start: string, end: string): Promise<DbXDraft[]> {
  const rows = await sql()`
    SELECT * FROM x_drafts
    WHERE created_at::date BETWEEN ${start}::date AND ${end}::date
       OR (posted_at IS NOT NULL AND posted_at::date BETWEEN ${start}::date AND ${end}::date)
    ORDER BY created_at
  `;
  return rows as unknown as DbXDraft[];
}

export async function fetchNewsletterForMonth(start: string, end: string): Promise<DbNewsletterArticle[]> {
  const rows = await sql()`
    SELECT * FROM newsletter_articles
    WHERE digest_date BETWEEN ${start}::date AND ${end}::date
    ORDER BY digest_date, created_at
  `;
  return rows.map((r) => ({ ...r, digest_date: toDateStr(r.digest_date) })) as unknown as DbNewsletterArticle[];
}

// --- Shared helpers ---

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const now = new Date();
  const today = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const docDate = new Date(d.toLocaleString("en-US", { timeZone: "America/New_York" }));
  today.setHours(0, 0, 0, 0);
  docDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - docDate.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
