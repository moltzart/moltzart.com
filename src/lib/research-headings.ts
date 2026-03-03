/**
 * Slugify a string for use as an HTML id attribute.
 * Lowercase, replace spaces/special chars with hyphens,
 * collapse multiple hyphens, strip leading/trailing hyphens.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Strip inline markdown syntax (bold, italic, code, links) to get plain text. */
function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [label](url) → label
    .replace(/[*_`]+/g, "")                   // bold, italic, code markers
    .trim();
}

/**
 * Extract H2 headings from a markdown string.
 * Returns array of { id, text } where id is the slugified heading text.
 */
export function extractHeadings(
  bodyMd: string
): Array<{ id: string; text: string }> {
  const lines = bodyMd.split("\n");
  const headings: Array<{ id: string; text: string }> = [];

  for (const line of lines) {
    const match = line.match(/^## (.+)$/);
    if (match) {
      const raw = match[1].trim();
      const text = stripInlineMarkdown(raw);
      headings.push({ id: slugify(text), text });
    }
  }

  return headings;
}
