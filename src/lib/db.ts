import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

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

// --- Radar ---

export interface DbRadarItem {
  id: string;
  date: string;
  section: string;
  title: string;
  source_name: string | null;
  source_url: string | null;
  lane: string;
  why_bullets: string[];
  scan_source: string | null;
  created_at: string;
}

export async function fetchRadarDatesDb(): Promise<string[]> {
  const rows = await sql()`SELECT DISTINCT date FROM radar_items ORDER BY date DESC`;
  return rows.map((r) => toDateStr(r.date));
}

export async function fetchRadarItemsByDate(date: string): Promise<DbRadarItem[]> {
  const rows = await sql()`SELECT * FROM radar_items WHERE date = ${date} ORDER BY section, created_at`;
  return rows.map((r) => ({ ...r, date: toDateStr(r.date) })) as unknown as DbRadarItem[];
}

export async function insertRadarItems(
  date: string,
  section: string,
  items: { title: string; source_name?: string; source_url?: string; lane: string; why_bullets?: string[] }[],
  scanSource?: string
): Promise<string[]> {
  const ids: string[] = [];
  for (const item of items) {
    const rows = await sql()`
      INSERT INTO radar_items (date, section, title, source_name, source_url, lane, why_bullets, scan_source)
      VALUES (${date}, ${section}, ${item.title}, ${item.source_name || null}, ${item.source_url || null}, ${item.lane}, ${item.why_bullets || []}, ${scanSource || null})
      RETURNING id
    `;
    ids.push(rows[0].id);
  }
  return ids;
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
): Promise<string[]> {
  const ids: string[] = [];
  for (const a of articles) {
    const rows = await sql()`
      INSERT INTO newsletter_articles (digest_date, title, source, link, category, description)
      VALUES (${digestDate}, ${a.title}, ${a.source || null}, ${a.link || null}, ${a.category || null}, ${a.description || null})
      RETURNING id
    `;
    ids.push(rows[0].id);
  }
  return ids;
}

// --- Research Requests ---

export interface DbResearchRequest {
  id: string;
  title: string;
  requested_by: string;
  priority: string;
  details: string | null;
  status: string;
  created_at: string;
}

export async function fetchOpenResearchRequests(): Promise<DbResearchRequest[]> {
  return await sql()`
    SELECT * FROM research_requests
    WHERE status IS NULL OR status != 'completed'
    ORDER BY
      CASE WHEN priority = 'high' THEN 0
           WHEN priority = 'normal' THEN 1
           ELSE 2 END,
      created_at DESC
  ` as unknown as DbResearchRequest[];
}

export async function insertResearchRequest(
  title: string,
  requestedBy: string,
  priority?: string,
  details?: string
): Promise<string> {
  const rows = await sql()`
    INSERT INTO research_requests (title, requested_by, priority, details)
    VALUES (${title}, ${requestedBy}, ${priority || 'normal'}, ${details || null})
    RETURNING id
  `;
  return rows[0].id;
}

// --- Drafts ---

export interface DbDraft {
  id: string;
  date: string;
  time: string | null;
  type: string;
  content: string;
  status: string;
  reply_to: string | null;
  reply_context: string | null;
  feedback: string | null;
  tweet_id: string | null;
  priority: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchDraftsDb(): Promise<DbDraft[]> {
  const rows = await sql()`SELECT * FROM drafts ORDER BY date DESC, created_at DESC`;
  return rows.map((r) => ({ ...r, date: toDateStr(r.date) })) as unknown as DbDraft[];
}

export async function insertDraft(
  date: string,
  type: string,
  content: string,
  opts?: { time?: string; reply_to?: string; reply_context?: string; priority?: string }
): Promise<string> {
  const rows = await sql()`
    INSERT INTO drafts (date, time, type, content, reply_to, reply_context, priority)
    VALUES (${date}, ${opts?.time || null}, ${type}, ${content}, ${opts?.reply_to || null}, ${opts?.reply_context || null}, ${opts?.priority || 'normal'})
    RETURNING id
  `;
  return rows[0].id;
}

export async function fetchDraftById(id: string): Promise<DbDraft | null> {
  const rows = await sql()`SELECT * FROM drafts WHERE id = ${id}`;
  if (rows.length === 0) return null;
  const r = rows[0];
  return { ...r, date: toDateStr(r.date) } as unknown as DbDraft;
}

export async function updateDraftStatus(
  id: string,
  status: string,
  feedback?: string
): Promise<boolean> {
  const rows = await sql()`
    UPDATE drafts SET status = ${status}, feedback = ${feedback || null}, updated_at = now()
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
      title = ${fields.title !== undefined ? fields.title : null}::text,
      detail = ${fields.detail !== undefined ? fields.detail : null}::text,
      status = ${fields.status !== undefined ? fields.status : null}::text,
      priority = ${fields.priority !== undefined ? fields.priority : null}::text,
      effort = ${fields.effort !== undefined ? fields.effort : null}::text,
      due_date = ${fields.due_date !== undefined ? fields.due_date : null}::date,
      blocked_by = ${fields.blocked_by !== undefined ? fields.blocked_by : null}::text,
      updated_at = now()
    WHERE id = ${id}
    RETURNING id
  `;
  return rows.length > 0;
}

// --- Research Docs ---

export interface DbResearchDoc {
  id: string;
  slug: string;
  title: string;
  content: string;
  excerpt: string | null;
  word_count: number | null;
  status: string;
  tags: string[];
  research_request_id: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchResearchDocs(): Promise<Omit<DbResearchDoc, 'content'>[]> {
  const rows = await sql()`
    SELECT id, slug, title, excerpt, word_count, status, tags, research_request_id, created_at, updated_at
    FROM research_docs
    ORDER BY created_at DESC
  `;
  return rows as unknown as Omit<DbResearchDoc, 'content'>[];
}

export async function fetchResearchDocBySlug(slug: string): Promise<DbResearchDoc | null> {
  const rows = await sql()`SELECT * FROM research_docs WHERE slug = ${slug}`;
  if (rows.length === 0) return null;
  return rows[0] as unknown as DbResearchDoc;
}

export async function insertResearchDoc(
  slug: string,
  title: string,
  content: string,
  opts?: { status?: string; tags?: string[]; research_request_id?: string }
): Promise<string> {
  const plainText = content
    .split("\n")
    .filter((l) => !l.startsWith("#") && !l.startsWith("---") && l.trim().length > 0)
    .join(" ")
    .replace(/[*_`\[\]]/g, "");
  let excerpt = plainText.slice(0, 150).trim();
  if (plainText.length > 150) excerpt += "...";
  const wordCount = content.split(/\s+/).filter(Boolean).length;

  const rows = await sql()`
    INSERT INTO research_docs (slug, title, content, excerpt, word_count, status, tags, research_request_id)
    VALUES (${slug}, ${title}, ${content}, ${excerpt}, ${wordCount}, ${opts?.status || 'published'}, ${opts?.tags || []}, ${opts?.research_request_id || null})
    RETURNING id
  `;
  return rows[0].id;
}

export async function deleteResearchDocBySlug(slug: string): Promise<boolean> {
  const rows = await sql()`DELETE FROM research_docs WHERE slug = ${slug} RETURNING id`;
  return rows.length > 0;
}

// --- Newsletter Digests (grouped view) ---

export interface NewsletterArticle {
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

// --- Drafts (grouped view) ---

export type DraftStatus = "pending" | "approved" | "posted" | "rejected";

export interface Draft {
  id: string;
  date: string;
  time?: string;
  type: "original" | "reply";
  replyTo?: string;
  replyContext?: string;
  content: string;
  status: DraftStatus;
  feedback?: string;
  tweetId?: string;
  priority?: "high" | "normal" | "low";
}

export interface DraftDay {
  date: string;
  label: string;
  drafts: Draft[];
}

export interface DraftsData {
  days: DraftDay[];
}

export async function fetchDrafts(): Promise<DraftsData> {
  const rows = await fetchDraftsDb();
  const drafts: Draft[] = rows.map((r) => ({
    id: r.id,
    date: r.date.slice(0, 10),
    time: r.time || undefined,
    type: r.type as "original" | "reply",
    replyTo: r.reply_to || undefined,
    replyContext: r.reply_context || undefined,
    content: r.content,
    status: r.status as DraftStatus,
    feedback: r.feedback || undefined,
    tweetId: r.tweet_id || undefined,
    priority: (r.priority as "high" | "normal" | "low") || undefined,
  }));

  const map = new Map<string, Draft[]>();
  for (const d of drafts) {
    if (!map.has(d.date)) map.set(d.date, []);
    map.get(d.date)!.push(d);
  }
  const days = Array.from(map.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, dayDrafts]) => ({
      date,
      label: formatDayLabel(date),
      drafts: dayDrafts,
    }));

  return { days };
}

// --- Radar (grouped view) ---

export interface RadarItem {
  title: string;
  source: string;
  link: string;
  lane: string;
  note: string;
  angle?: string;
}

export interface RadarDay {
  date: string;
  label: string;
  sections: { heading: string; items: RadarItem[] }[];
  rawMarkdown: string;
  scanSources?: string[];
  itemCount?: number;
}

export async function fetchRadarDates(): Promise<string[]> {
  return fetchRadarDatesDb();
}

export async function fetchRadarDay(date: string): Promise<RadarDay | null> {
  const items = await fetchRadarItemsByDate(date);
  if (items.length === 0) return null;

  const sectionMap = new Map<string, RadarItem[]>();
  const scanSources = new Set<string>();
  for (const item of items) {
    if (!sectionMap.has(item.section)) sectionMap.set(item.section, []);
    sectionMap.get(item.section)!.push({
      title: item.title,
      source: item.source_name || item.section,
      link: item.source_url || "",
      lane: item.lane,
      note: (item.why_bullets || []).join("\n"),
    });
    if (item.scan_source) scanSources.add(item.scan_source);
  }

  const sections = Array.from(sectionMap.entries()).map(([heading, sectionItems]) => ({
    heading,
    items: sectionItems,
  }));

  return {
    date,
    label: formatDayLabel(date),
    sections,
    rawMarkdown: "",
    scanSources: scanSources.size > 0 ? Array.from(scanSources) : undefined,
    itemCount: items.length,
  };
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
