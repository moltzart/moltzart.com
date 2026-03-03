export const RESEARCH_ARTIFACT_DOMAINS = [
  "product",
  "marketing",
  "ops",
  "content",
  "strategy",
] as const;

export type ResearchArtifactDomain = (typeof RESEARCH_ARTIFACT_DOMAINS)[number];

export const RESEARCH_ARTIFACT_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;

export type ResearchArtifactStatus = (typeof RESEARCH_ARTIFACT_STATUSES)[number];

export function isResearchArtifactDomain(value: string): value is ResearchArtifactDomain {
  return (RESEARCH_ARTIFACT_DOMAINS as readonly string[]).includes(value);
}

export function isResearchArtifactStatus(value: string): value is ResearchArtifactStatus {
  return (RESEARCH_ARTIFACT_STATUSES as readonly string[]).includes(value);
}
