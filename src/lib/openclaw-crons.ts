import { fetchCronJobs, fetchJobRunsForRange, replaceCronJobsSnapshot, upsertCronJobs, upsertJobRuns, type DbCronJob, type DbJobRun } from "@/lib/db";

export interface OpenClawCronMeta {
  telemetryState: "live" | "snapshot" | "none";
}

type IngestCronJob = {
  id: string;
  name: string;
  description?: string | null;
  agent_id?: string;
  enabled?: boolean;
  schedule_expr: string;
  schedule_tz?: string;
  last_run_at?: string | null;
  last_status?: string | null;
  last_duration_ms?: number | null;
  next_run_at?: string | null;
  consecutive_errors?: number;
};

type IngestJobRun = {
  job_id: string;
  agent_id?: string;
  started_at: string;
  completed_at?: string | null;
  status: string;
  summary?: string | null;
};


function cronIdentityKey(name: string, scheduleExpr: string): string {
  return `${name.trim().toLowerCase()}::${scheduleExpr.trim()}`;
}

function looksLikeUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseTimestamp(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function reconcileTelemetryJobs(
  jobs: IngestCronJob[]
): Promise<{
  canonicalJobs: IngestCronJob[];
  idMap: Map<string, string>;
}> {
  const existingJobs = await fetchCronJobs();
  const jobsById = new Map(existingJobs.map((job) => [job.id, job]));
  const jobsByIdentity = new Map<string, DbCronJob[]>();
  const jobsBySchedule = new Map<string, DbCronJob[]>();

  for (const job of existingJobs) {
    const key = cronIdentityKey(job.name, job.schedule_expr);
    const bucket = jobsByIdentity.get(key) ?? [];
    bucket.push(job);
    jobsByIdentity.set(key, bucket);

    const scheduleBucket = jobsBySchedule.get(job.schedule_expr) ?? [];
    scheduleBucket.push(job);
    jobsBySchedule.set(job.schedule_expr, scheduleBucket);
  }

  const canonicalJobs = jobs.map((job) => {
    const identityMatches = jobsByIdentity.get(cronIdentityKey(job.name, job.schedule_expr)) ?? [];
    const preferredIdentityMatch = identityMatches.find((existing) => !looksLikeUuid(existing.id)) ?? identityMatches[0];
    const directMatch = jobsById.get(job.id);
    const scheduleMatches = (jobsBySchedule.get(job.schedule_expr) ?? [])
      .filter((existing) => !looksLikeUuid(existing.id))
      .sort((a, b) => parseTimestamp(b.synced_at) - parseTimestamp(a.synced_at));
    const scheduleFallback = scheduleMatches[0];
    const stableDirectMatch = directMatch && !looksLikeUuid(directMatch.id) ? directMatch : undefined;
    const canonicalId = preferredIdentityMatch?.id ?? scheduleFallback?.id ?? stableDirectMatch?.id ?? job.id;
    return { ...job, id: canonicalId };
  });

  const idMap = new Map<string, string>();
  for (const job of jobs) {
    const canonical = canonicalJobs.find((candidate) => candidate.name === job.name && candidate.schedule_expr === job.schedule_expr);
    if (canonical) idMap.set(job.id, canonical.id);
  }

  return { canonicalJobs, idMap };
}

function deriveTelemetryState(crons: DbCronJob[], jobRuns: DbJobRun[]): OpenClawCronMeta["telemetryState"] {
  if (jobRuns.length > 0) return "live";
  if (crons.some((job) => job.last_run_at || job.last_status)) return "snapshot";
  return "none";
}

export async function getCronCalendarData(start: string, end: string): Promise<{
  crons: DbCronJob[];
  jobRuns: DbJobRun[];
  meta: OpenClawCronMeta;
}> {
  const [crons, jobRuns] = await Promise.all([
    fetchCronJobs(),
    fetchJobRunsForRange(start, end),
  ]);

  return {
    crons,
    jobRuns,
    meta: {
      telemetryState: deriveTelemetryState(crons, jobRuns),
    },
  };
}

export async function ingestCronSnapshot(payload: {
  jobs?: IngestCronJob[];
  runs?: IngestJobRun[];
  sync?: boolean;
}) {
  const jobCount = payload.jobs?.length ?? 0;
  const runCount = payload.runs?.length ?? 0;
  let idMap = new Map<string, string>();

  if (jobCount > 0) {
    const reconciled = await reconcileTelemetryJobs(payload.jobs!);
    idMap = reconciled.idMap;
    if (payload.sync) {
      await replaceCronJobsSnapshot(reconciled.canonicalJobs);
    } else {
      await upsertCronJobs(reconciled.canonicalJobs);
    }
  }

  if (runCount > 0) {
    await upsertJobRuns(
      payload.runs!.map((run) => ({
        ...run,
        job_id: idMap.get(run.job_id) ?? run.job_id,
      }))
    );
  }

  return { upsertedJobs: jobCount, upsertedRuns: runCount };
}
