export const PRODUCT_STATUSES = [
  "idea",
  "researching",
  "building",
  "launched",
  "archived",
] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_SOURCE_TYPES = [
  "note",
  "article",
  "competitor",
  "user_feedback",
  "market_data",
] as const;

export type ProductSourceType = (typeof PRODUCT_SOURCE_TYPES)[number];

export function isProductStatus(value: string): value is ProductStatus {
  return (PRODUCT_STATUSES as readonly string[]).includes(value);
}

export function isProductSourceType(value: string): value is ProductSourceType {
  return (PRODUCT_SOURCE_TYPES as readonly string[]).includes(value);
}

export function toProductSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
