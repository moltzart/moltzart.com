import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let _sql: NeonQueryFunction<false, false> | null = null;
function sql() {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return _sql;
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

export interface DbRadarCluster {
  id: string;
  date: string;
  title: string;
  source_count: number | null;
  signal: string | null;
  pattern: string | null;
  matt_angle: string | null;
  confidence: string | null;
  created_at: string;
}

export async function fetchRadarDatesDb(): Promise<string[]> {
  const rows = await sql()`SELECT DISTINCT date FROM radar_items ORDER BY date DESC`;
  return rows.map((r) => r.date.slice(0, 10));
}

export async function fetchRadarItemsByDate(date: string): Promise<DbRadarItem[]> {
  const rows = await sql()`SELECT * FROM radar_items WHERE date = ${date} ORDER BY section, created_at`;
  return rows as unknown as DbRadarItem[];
}

export async function fetchRadarClustersByDate(date: string): Promise<DbRadarCluster[]> {
  const rows = await sql()`SELECT * FROM radar_clusters WHERE date = ${date} ORDER BY created_at`;
  return rows as unknown as DbRadarCluster[];
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
  return rows as unknown as DbNewsletterArticle[];
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

// --- Newsletter Angles ---

export async function insertNewsletterAngles(
  date: string,
  angles: { angle: string; supporting_items?: string[] }[]
): Promise<string[]> {
  const ids: string[] = [];
  for (const a of angles) {
    const rows = await sql()`
      INSERT INTO newsletter_angles (date, angle, supporting_items)
      VALUES (${date}, ${a.angle}, ${a.supporting_items || []})
      RETURNING id
    `;
    ids.push(rows[0].id);
  }
  return ids;
}

// --- Content Feedback ---

export async function insertContentFeedback(
  date: string,
  signal: string,
  topic: string,
  source?: string,
  reason?: string
): Promise<string> {
  const rows = await sql()`
    INSERT INTO content_feedback (date, signal, topic, source, reason)
    VALUES (${date}, ${signal}, ${topic}, ${source || null}, ${reason || null})
    RETURNING id
  `;
  return rows[0].id;
}

// --- Research Requests ---

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
  return rows as unknown as DbDraft[];
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
  return rows[0] as unknown as DbDraft;
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
