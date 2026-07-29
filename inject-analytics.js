#!/usr/bin/env node
/**
 * inject-analytics.js
 * Build-time script that injects Vercel Web Analytics into every HTML file.
 * Runs as part of the Vercel build process.
 *
 * - Idempotent: skips files that already contain the analytics snippet.
 * - Follows the same pattern as inject-pixel.js for consistency.
 */

const fs = require('fs');
const path = require('path');

// Files that should NOT get analytics
const EXCLUDED_FILES = new Set([
  'email-template.html',
]);

// Directories to skip entirely
const EXCLUDED_DIRS = new Set([
  '.', 'node_modules', 'api', '.git', '.vercel', '.claude',
]);

function buildAnalyticsSnippet() {
  return [
    '    <!-- Vercel Web Analytics -->',
    '    <script>',
    '      window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };',
    '    </script>',
    '    <script defer src="/_vercel/insights/script.js"></script>',
    '    <!-- End Vercel Web Analytics -->',
  ].join('\n');
}

/**
 * Recursively find all .html files under a directory.
 */
function findHtmlFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name.startsWith('.') || EXCLUDED_DIRS.has(entry.name)) continue;
      results = results.concat(findHtmlFiles(path.join(dir, entry.name)));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(path.join(dir, entry.name));
    }
  }
  return results;
}

function main() {
  const rootDir = __dirname;
  const htmlFiles = findHtmlFiles(rootDir);
  const snippet = buildAnalyticsSnippet();

  let injected = 0;
  let skipped = 0;

  console.log('inject-analytics.js: Injecting Vercel Web Analytics into HTML files...\n');

  for (const filePath of htmlFiles) {
    const basename = path.basename(filePath);
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    if (EXCLUDED_FILES.has(basename)) {
      console.log(`  skip (excluded): ${relPath}`);
      skipped++;
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Idempotent: skip if analytics is already present
    if (content.includes('Vercel Web Analytics') || content.includes('/_vercel/insights/script.js')) {
      console.log(`  skip (already present): ${relPath}`);
      skipped++;
      continue;
    }

    // Inject before closing </head> tag for optimal loading
    const headPattern = /(<\/head>)/i;

    if (!headPattern.test(content)) {
      console.log(`  skip (no </head> tag): ${relPath}`);
      skipped++;
      continue;
    }

    content = content.replace(headPattern, `${snippet}\n$1`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  injected: ${relPath}`);
    injected++;
  }

  console.log(`\ninject-analytics.js: Done. ${injected} injected, ${skipped} skipped.`);
}

main();
