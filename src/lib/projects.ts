export const PROJECT_STATUSES = [
  "idea",
  "researching",
  "building",
  "launched",
  "archived",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_KINDS = [
  "general",
  "product",
] as const;

export type ProjectKind = (typeof PROJECT_KINDS)[number];

export function isProjectStatus(value: string): value is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(value);
}

export function isProjectKind(value: string): value is ProjectKind {
  return (PROJECT_KINDS as readonly string[]).includes(value);
}

export function toProjectSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\'\"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
