import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { getWeekMonday } from "@/lib/newsletter-weeks";
import {
  isProductSourceType,
  isProductStatus,
  ProductSourceType,
  ProductStatus,
  toProductSlug,
} from "@/lib/products";

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
  created_at: string;
  updated_at: string;
}

export async function fetchTasksDb(): Promise<DbTask[]> {
  const rows = await sql()`
    SELECT * FROM tasks
    WHERE status != 'done' OR updated_at > now() - interval '7 days'
    ORDER BY
      CASE status
        WHEN 'in_progress' THEN 0
        WHEN 'done' THEN 2
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
    due_date: r.due_date ? toDateStr(r.due_date) : null,
  })) as unknown as DbTask[];
}

export async function fetchTasksByStatus(status?: string): Promise<DbTask[]> {
  const rows = status
    ? await sql()`SELECT * FROM tasks WHERE status = ${status} ORDER BY created_at DESC`
    : await sql()`SELECT * FROM tasks ORDER BY created_at DESC`;
  return rows.map((r) => ({
    ...r,
    due_date: r.due_date ? toDateStr(r.due_date) : null,
  })) as unknown as DbTask[];
}

export async function insertTask(
  title: string,
  opts?: { detail?: string; priority?: string; effort?: string; due_date?: string; blocked_by?: string; status?: string }
): Promise<string> {
  const rows = await sql()`
    INSERT INTO tasks (title, detail, priority, effort, due_date, blocked_by, status)
    VALUES (${title}, ${opts?.detail || null}, ${opts?.priority || 'normal'}, ${opts?.effort || null}, ${opts?.due_date || null}, ${opts?.blocked_by || null}, ${opts?.status || 'open'})
    RETURNING id
  `;
  return rows[0].id;
}

export async function updateTask(
  id: string,
  fields: Partial<Pick<DbTask, 'title' | 'detail' | 'status' | 'priority' | 'effort' | 'due_date' | 'blocked_by'>>
): Promise<boolean> {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined) {
      sets.push(k);
      vals.push(v);
    }
  }
  if (sets.length === 0) return false;
  // Build dynamic update — since neon() template literal doesn't support dynamic columns easily,
  // we update all fields using coalesce
  const rows = await sql()`
    UPDATE tasks SET
      title = COALESCE(${fields.title ?? null}::text, title),
      detail = COALESCE(${fields.detail ?? null}::text, detail),
      status = COALESCE(${fields.status ?? null}::text, status),
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

// --- Products ---

export interface DbProductIdea {
  id: string;
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
    research_count: research.length,
  };
  return { product, research };
}

export async function insertProductResearchItems(
  productId: string,
  items: ProductResearchInput[]
): Promise<string[]> {
  const ids: string[] = [];
  for (const item of items) {
    const sourceType = item.source_type && isProductSourceType(item.source_type)
      ? item.source_type
      : "note";
    const rows = await sql()`
      INSERT INTO product_research_items (product_id, title, source_url, source_type, notes)
      VALUES (${productId}, ${item.title}, ${item.source_url || null}, ${sourceType}, ${item.notes || null})
      RETURNING id
    `;
    ids.push(rows[0].id);
  }
  return ids;
}

export async function insertProductIdeas(products: ProductIdeaInput[]): Promise<string[]> {
  const ids: string[] = [];

  for (const item of products) {
    const baseSlug = toProductSlug(item.slug || item.title) || "product";
    const slug = await ensureUniqueProductSlug(baseSlug);
    const status = item.status && isProductStatus(item.status) ? item.status : "idea";

    const rows = await sql()`
      INSERT INTO product_ideas (slug, title, summary, status, problem, audience, created_by)
      VALUES (
        ${slug},
        ${item.title},
        ${item.summary || null},
        ${status},
        ${item.problem || null},
        ${item.audience || null},
        ${item.created_by || "moltzart"}
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
    WHERE id = ${id}
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
