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

// Known side-effect imports that shouldn't be flagged (imported for their side effects)
const SIDE_EFFECT_MODULES = new Set([
  "leaflet/dist/leaflet.css",
  "leaflet",
]);

// Imports that are commonly used as types/interfaces only
const TYPE_LIKE_IMPORTS = new Set([
  "LucideIcon",
  "LucideProps",
  "Icon",
  "IconNode",
]);

// Known aliases / patterns
function isLikelyUsedElsewhere(name, content, importsBlock, filePath) {
  // Check if it's a type import used as a type annotation
  const body = content;
  
  // Common patterns for type usage
  const typePatterns = [
    new RegExp(`:\\s*${name}\\b`),
    new RegExp(`:\\s*\\w+<${name}\\b`),
    new RegExp(`\\b${name}\\[\\)`),
  ];
  
  for (const pattern of typePatterns) {
    if (pattern.test(body)) return true;
  }
  
  return false;
}

let totalUnused = 0;
let filesWithIssues = 0;

for (const file of files) {
  const content = readFileSync(file, "utf-8");
  
  // Match all import statements
  const importRegex = /^import\s+(?:\{[^}]+\}|[^;]+?)\s+from\s+['"]([^'"]+)['"]\s*;?$/gm;
  const importBlocks = content.match(importRegex);
  if (!importBlocks) continue;
  
  // Join all imports to remove from body check
  const importsBlock = importBlocks.join("\n");
  const body = content;
  const bodyWithoutImports = content.replace(importRegex, "");
  
  const fileUnused = [];
  
  for (const importBlock of importBlocks) {
    // Skip side-effect imports
    const moduleMatch = importBlock.match(/from\s+['"]([^'"]+)['"]/);
    if (!moduleMatch) continue;
    const moduleName = moduleMatch[1];
    if (SIDE_EFFECT_MODULES.has(moduleName)) continue;
    
    // Skip default imports (import X from "Y") — too many false positives
    if (/^import\s+\w+\s+from/.test(importBlock) && !importBlock.includes("{")) {
      // Still check for named imports within type imports
      if (importBlock.startsWith("import type")) {
        // type imports are fine
      }
      continue;
    }
    
    // Skip star imports (import * as X from "Y")
    if (importBlock.includes(" * as ")) continue;
    
    // Skip type-only imports (import type { ... })
    if (importBlock.trimStart().startsWith("import type")) continue;
    
    // Extract named imports
    const namedMatch = importBlock.match(/\{\s*([^}]+)\s*\}/);
    if (!namedMatch) continue;
    
    const namedImports = namedMatch[1].split(",").map(i => {
      // Handle "X as Y" aliases
      let name = i.trim();
      const aliasMatch = name.match(/(\w+)\s+as\s+(\w+)/);
      if (aliasMatch) return { original: aliasMatch[1], alias: aliasMatch[2] };
      return { original: name, alias: name };
    }).filter(x => x.alias && !TYPE_LIKE_IMPORTS.has(x.alias));
    
    for (const { original, alias } of namedImports) {
      // Skip empty names
      if (!alias || alias.length === 0) continue;
      
      // Build a regex to find usage of this symbol in the file body (outside imports)
      const escapedAlias = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      
      // Check in the body (but not in import statements)
      // Patterns for usage:
      // - <ComponentName ... /> or <ComponentName> JSX usage
      // - ComponentName.xxx chained access
      // - (ComponentName) in expressions
      // - : ComponentName in type annotations
      // - ComponentName({ inline object
      
      const patterns = [
        // JSX component: <Icon or <Icon>
        new RegExp(`<${escapedAlias}[\\s>/]`),
        // JSX closing: </Icon>
        new RegExp(`</${escapedAlias}\\s*>`),
        // Chained access: Icon.size or Icon.xxx
        new RegExp(`\\b${escapedAlias}\\.`),
        // As a variable/function: (Icon) or ,Icon or = Icon or : Icon
        new RegExp(`[=,(]\\s*${escapedAlias}\\b`),
        // In type annotation: : Icon< or : Icon
        new RegExp(`:\\s*${escapedAlias}\\b`),
        // Used in array: [Icon, or "Icon"]
        new RegExp(`\\[\\s*${escapedAlias}\\s*[,\\]]`),
        // In ternary/expression: ? Icon : 
        new RegExp(`\\?\\s*${escapedAlias}\\s*:`),
        // Used as object value: key: Icon
        new RegExp(`:\\s*${escapedAlias}\\b`),
        // destructured: { Icon } or { ...Icon 
        new RegExp(`\\{\\s*${escapedAlias}\\b`),
        // In template: ${Icon} 
        new RegExp(`\\$\\{${escapedAlias}\\b`),
        // As spread: ...Icon
        new RegExp(`\\.\\.\\.${escapedAlias}\\b`),
      ];
      
      let used = false;
      for (const pattern of patterns) {
        if (pattern.test(bodyWithoutImports)) {
          used = true;
          break;
        }
      }
      
      if (!used) {
        fileUnused.push(alias);
      }
    }
  }
  
  if (fileUnused.length > 0) {
    const relPath = relative("artifacts", file);
    console.log(`\n${relPath}`);
    console.log(`  UNUSED: [${fileUnused.join(", ")}]`);
    totalUnused += fileUnused.length;
    filesWithIssues++;
  }
}

console.log(`\n\nSummary: ${filesWithIssues} files with ${totalUnused} potentially unused imports.`);
console.log("\nNote: This is a heuristic scan. Some may be false positives (types, re-exports, or dynamic usage).");
console.log("Manual review recommended before removing.");
