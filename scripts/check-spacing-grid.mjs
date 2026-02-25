#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");
const ALLOWED = new Set(["0", "1", "2", "3", "4", "5", "6", "8", "12", "16"]);
const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".mdx"]);

const spacingPrefix =
  "(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml|gap|gap-x|gap-y|space-x|space-y)";
const numericSpacingRe = new RegExp(`\\b(${spacingPrefix})-(-?\\d+(?:\\.\\d+)?)\\b`, "g");
const arbitrarySpacingRe = new RegExp(`\\b(${spacingPrefix})-\\[([^\\]]+)\\]`, "g");
const controlHeightRe = /\b(?:h|min-h|max-h|size|min-w|max-w)-9\b/g;

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
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    for (const m of line.matchAll(numericSpacingRe)) {
      const value = m[2];
      if (value.includes(".")) {
        violations.push({
          file: rel,
          line: i + 1,
          message: `Fractional spacing step '${m[0]}' is not allowed`,
          snippet: line.trim(),
        });
        continue;
      }
      const normalized = value.startsWith("-") ? value.slice(1) : value;
      if (!ALLOWED.has(normalized)) {
        violations.push({
          file: rel,
          line: i + 1,
          message: `Off-scale spacing step '${m[0]}' is not allowed`,
          snippet: line.trim(),
        });
      }
    }

    for (const m of line.matchAll(arbitrarySpacingRe)) {
      violations.push({
        file: rel,
        line: i + 1,
        message: `Arbitrary spacing value '${m[0]}' is not allowed`,
        snippet: line.trim(),
      });
    }

    for (const m of line.matchAll(controlHeightRe)) {
      violations.push({
        file: rel,
        line: i + 1,
        message: `Control size '${m[0]}' is disallowed; use '-12' for this system`,
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
  console.error("Spacing grid violations found:");
  for (const v of violations) {
    console.error(`- ${v.file}:${v.line} ${v.message}`);
    console.error(`  ${v.snippet}`);
  }
  process.exit(1);
}

console.log("Spacing grid check passed.");
