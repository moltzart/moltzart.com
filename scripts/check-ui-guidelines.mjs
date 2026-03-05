#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".mdx"]);
const FILE_EXCLUDES = [/^src\/app\/admin\/styleguide\//];

const checks = [
  {
    re: /\btext-white\b/g,
    message: "Avoid 'text-white'; use zinc scale (usually 'text-zinc-100').",
  },
  {
    re: /\bfont-bold\b/g,
    message: "Avoid 'font-bold'; use 'font-medium' or 'font-semibold'.",
  },
  {
    re: /\btracking-wider\b/g,
    message: "Avoid 'tracking-wider'; use '.type-label' or 'tracking-[0.08em]'.",
  },
  {
    re: /\btext-\[\d+px\]\b/g,
    message: "Avoid arbitrary pixel text size; use system type scale or '.type-*' classes.",
  },
  {
    re: /\btext-teal-500\b/g,
    message: "Avoid 'text-teal-500'; use the standard accent token 'text-teal-400'.",
  },
  {
    re: /\btransition-all\b/g,
    message: "Avoid 'transition-all'; use property-specific transitions.",
  },
];

/** @type {{file:string,line:number,message:string,snippet:string}[]} */
const violations = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!EXTS.has(path.extname(entry.name))) continue;
    checkFile(fullPath);
  }
}

function checkFile(filePath) {
  const rel = path.relative(ROOT, filePath);
  if (FILE_EXCLUDES.some((pattern) => pattern.test(rel))) return;
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    for (const check of checks) {
      if (check.exclude?.some((pattern) => pattern.test(rel))) continue;
      check.re.lastIndex = 0;
      if (!check.re.test(line)) continue;
      violations.push({
        file: rel,
        line: i + 1,
        message: check.message,
        snippet: line.trim(),
      });
    }
  }
}

if (!fs.existsSync(SRC_DIR)) {
  console.error("src/ directory not found");
  process.exit(1);
}

walk(SRC_DIR);

if (violations.length > 0) {
  console.error("UI guideline violations found:");
  for (const v of violations) {
    console.error(`- ${v.file}:${v.line} ${v.message}`);
    console.error(`  ${v.snippet}`);
  }
  process.exit(1);
}

console.log("UI guideline check passed.");
