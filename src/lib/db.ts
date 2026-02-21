import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { getWeekMonday } from "@/lib/newsletter-weeks";

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
      ON CONFLICT (digest_date, title) DO UPDATE SET
        link = COALESCE(EXCLUDED.link, newsletter_articles.link),
        source = COALESCE(EXCLUDED.source, newsletter_articles.source),
        category = COALESCE(EXCLUDED.category, newsletter_articles.category),
        description = COALESCE(EXCLUDED.description, newsletter_articles.description)
      RETURNING id
    `;
    ids.push(rows[0].id);
  }
  return ids;
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

// --- Engage Items ---

export interface DbEngageItem {
  id: string;
  date: string;
  type: string;
  author: string | null;
  tweet_url: string | null;
  title: string;
  context: string | null;
  suggested_angles: string[];
  points: number | null;
  priority: number;
  created_at: string;
}

export async function fetchEngageDates(): Promise<string[]> {
  const rows = await sql()`SELECT DISTINCT date FROM engage_items ORDER BY date DESC`;
  return rows.map((r) => toDateStr(r.date));
}

export async function fetchEngageItemsByDate(date: string): Promise<DbEngageItem[]> {
  const rows = await sql()`SELECT * FROM engage_items WHERE date = ${date} ORDER BY priority`;
  return rows.map((r) => ({ ...r, date: toDateStr(r.date) })) as unknown as DbEngageItem[];
}

export async function insertEngageItems(
  date: string,
  items: { type: string; author?: string; tweet_url?: string; title: string; context?: string; suggested_angles?: string[]; priority?: number }[]
): Promise<string[]> {
  const ids: string[] = [];
  for (const item of items) {
    // Dedup: skip if same tweet_url already exists for this date, or same author+date if no URL
    if (item.tweet_url) {
      const existing = await sql()`SELECT id FROM engage_items WHERE date = ${date} AND tweet_url = ${item.tweet_url} LIMIT 1`;
      if (existing.length > 0) continue;
    } else if (item.author) {
      const existing = await sql()`SELECT id FROM engage_items WHERE date = ${date} AND author = ${item.author} LIMIT 1`;
      if (existing.length > 0) continue;
    }
    const rows = await sql()`
      INSERT INTO engage_items (date, type, author, tweet_url, title, context, suggested_angles, priority)
      VALUES (${date}, ${item.type}, ${item.author || null}, ${item.tweet_url || null}, ${item.title}, ${item.context || null}, ${item.suggested_angles || []}, ${item.priority || 0})
      RETURNING id
    `;
    ids.push(rows[0].id);
  }
  return ids;
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

// --- Engage (week view) ---

export interface EngageDay {
  date: string;
  label: string;
  items: DbEngageItem[];
}

export async function fetchEngageWeek(start: string, end: string): Promise<EngageDay[]> {
  const rows = await sql()`
    SELECT * FROM engage_items
    WHERE date BETWEEN ${start} AND ${end}
    ORDER BY date DESC, priority ASC
  `;
  if (rows.length === 0) return [];

  const byDate = new Map<string, DbEngageItem[]>();
  for (const r of rows) {
    const date = toDateStr(r.date);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push({ ...r, date } as unknown as DbEngageItem);
  }

  const days: EngageDay[] = [];
  for (const [date, items] of byDate) {
    days.push({ date, label: formatDayLabel(date), items });
  }
  return days;
}

export async function fetchEngageWeekStarts(): Promise<string[]> {
  const rows = await sql()`SELECT DISTINCT date FROM engage_items ORDER BY date DESC`;
  const seen = new Set<string>();
  for (const r of rows) {
    seen.add(getWeekMonday(toDateStr(r.date)));
  }
  return [...seen].sort().reverse();
}

export async function deleteEngageItem(id: string): Promise<void> {
  await sql()`DELETE FROM engage_items WHERE id = ${id}`;
}

// --- Radar (grouped view) ---

export interface RadarItem {
  id: string;
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
      id: item.id,
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

export interface RadarWeekDay {
  date: string;
  label: string;
  sections: { heading: string; items: RadarItem[] }[];
}

export async function fetchRadarWeek(start: string, end: string): Promise<RadarWeekDay[]> {
  const rows = await sql()`
    SELECT * FROM radar_items
    WHERE date BETWEEN ${start} AND ${end}
    ORDER BY date DESC, section, created_at
  `;
  if (rows.length === 0) return [];

  const byDate = new Map<string, Map<string, RadarItem[]>>();
  for (const r of rows) {
    const date = toDateStr(r.date);
    if (!byDate.has(date)) byDate.set(date, new Map());
    const sectionMap = byDate.get(date)!;
    if (!sectionMap.has(r.section)) sectionMap.set(r.section, []);
    sectionMap.get(r.section)!.push({
      id: r.id as string,
      title: r.title as string,
      source: (r.source_name as string) || (r.section as string),
      link: (r.source_url as string) || "",
      lane: r.lane as string,
      note: ((r.why_bullets as string[]) || []).join("\n"),
    });
  }

  const days: RadarWeekDay[] = [];
  for (const [date, sectionMap] of byDate) {
    const sections = Array.from(sectionMap.entries()).map(([heading, items]) => ({ heading, items }));
    days.push({ date, label: formatDayLabel(date), sections });
  }
  return days;
}

export async function fetchRadarWeekStarts(): Promise<string[]> {
  const rows = await sql()`SELECT DISTINCT date FROM radar_items ORDER BY date DESC`;
  const seen = new Set<string>();
  for (const r of rows) {
    seen.add(getWeekMonday(toDateStr(r.date)));
  }
  return [...seen].sort().reverse();
}

export async function deleteRadarItem(id: string): Promise<void> {
  await sql()`DELETE FROM radar_items WHERE id = ${id}`;
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
