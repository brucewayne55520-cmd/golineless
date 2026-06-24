import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

function walk(dir, files = []) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && entry.name !== "node_modules") {
        walk(fullPath, files);
      }
    } else if (entry.name.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

const qbuddyDir = "artifacts/qbuddy/src";
const files = walk(qbuddyDir);
let totalUnused = 0;
let filesWithIssues = 0;

for (const file of files) {
  const content = readFileSync(file, "utf-8");
  
  const importMatch = content.match(/import\s*\{([^}]+)\}\s*from\s*["']lucide-react["']/);
  if (!importMatch) continue;
  
  const icons = importMatch[1].split(",").map(i => i.trim().replace(/\s+as\s+\w+/, "").trim()).filter(Boolean);
  const body = content.replace(importMatch[0], "");
  
  const unused = icons.filter(icon => {
    if (icon.startsWith("type ")) return false;
    const escaped = icon.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?:<${escaped}\\b|\\b${escaped}\\b(?!\\s*=\\s*["']))`);
    return !regex.test(body);
  });
  
  if (unused.length > 0) {
    const relPath = relative("artifacts", file);
    console.log(`\n${relPath}`);
    console.log(`  UNUSED: [${unused.join(", ")}]`);
    totalUnused += unused.length;
    filesWithIssues++;
  }
}

console.log(`\n\nSummary: ${filesWithIssues} files with ${totalUnused} unused lucide-react icons.`);
