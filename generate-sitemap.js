#!/usr/bin/env node
/**
 * generate-sitemap.js
 * Zero-dependency Node.js script that scans .html files and generates sitemap.xml.
 * Runs automatically on Vercel deploy via buildCommand in vercel.json.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SITE_URL = 'https://www.blackironathletics.com';

// Pages that should NOT appear in the sitemap
const EXCLUDED_FILES = new Set([
  '404.html',
  'email-template.html',
  'thank-you.html',
  'landing.html',
  'fuelpath-admin.html',
  'fuelpath-dashboard.html',
  'group-training.html',
  'nutrition-coaching.html',
  'open-gym.html',
  'personal-training.html',
]);

// Hand-tuned priority & changefreq for specific URL paths
// Any page not listed here gets the default (0.6 / monthly)
const URL_CONFIG = {
  '/':                                          { priority: '1.0', changefreq: 'weekly' },
  '/getting-started':                           { priority: '0.9', changefreq: 'monthly' },
  '/book':                                      { priority: '0.9', changefreq: 'monthly' },
  '/fuelpath':                                  { priority: '0.9', changefreq: 'monthly' },
  '/about':                                     { priority: '0.8', changefreq: 'monthly' },
  '/programs':                                  { priority: '0.8', changefreq: 'monthly' },
  '/schedule':                                  { priority: '0.8', changefreq: 'weekly' },
  '/contact':                                   { priority: '0.8', changefreq: 'monthly' },
  '/macro-calculator':                          { priority: '0.8', changefreq: 'monthly' },
  '/blog/crossfit-alternative-frisco-tx':       { priority: '0.8', changefreq: 'monthly' },
  '/blog/what-is-xenom-decathlon-of-fitness':   { priority: '0.8', changefreq: 'monthly' },
  '/blog/':                                     { priority: '0.7', changefreq: 'weekly' },
  '/mike-manning':                              { priority: '0.7', changefreq: 'monthly' },
  '/fuelpath-philosophy':                       { priority: '0.7', changefreq: 'monthly' },
  '/fuelpath-calendar':                         { priority: '0.7', changefreq: 'monthly' },
  '/blog/calisthenics-training-frisco-tx':      { priority: '0.7', changefreq: 'monthly' },
  '/privacy-policy':                            { priority: '0.3', changefreq: 'yearly' },
};

const DEFAULT_CONFIG = { priority: '0.6', changefreq: 'monthly' };

/**
 * Recursively find all .html files under a directory.
 */
function findHtmlFiles(dir, rootDir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip hidden dirs, node_modules, learn, etc.
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'learn') continue;
      results = results.concat(findHtmlFiles(fullPath, rootDir));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      results.push(path.relative(rootDir, fullPath).replace(/\\/g, '/'));
    }
  }
  return results;
}

/**
 * Convert a file path like "blog/hyrox-training-frisco-tx.html" to a URL path.
 * - index.html → /
 * - blog/index.html → /blog/
 * - about.html → /about
 */
function fileToUrlPath(filePath) {
  if (filePath === 'index.html') return '/';
  if (filePath.endsWith('/index.html')) {
    return '/' + filePath.replace('/index.html', '/');
  }
  return '/' + filePath.replace(/\.html$/, '');
}

/**
 * Get the last git commit date for a file (YYYY-MM-DD).
 * Falls back to today's date if git is unavailable or file is untracked.
 */
function getLastModDate(filePath) {
  try {
    const date = execSync(`git log -1 --format=%aI -- "${filePath}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (date) return date.slice(0, 10);
  } catch (_) {
    // git not available or file untracked
  }
  return new Date().toISOString().slice(0, 10);
}

function main() {
  const rootDir = __dirname;
  process.chdir(rootDir);

  // Discover all HTML files
  const htmlFiles = findHtmlFiles(rootDir, rootDir);

  // Filter out excluded pages
  const publicFiles = htmlFiles.filter(f => {
    const basename = path.basename(f);
    return !EXCLUDED_FILES.has(basename);
  });

  // Build URL entries
  const entries = publicFiles.map(filePath => {
    const urlPath = fileToUrlPath(filePath);
    const config = URL_CONFIG[urlPath] || DEFAULT_CONFIG;
    const lastmod = getLastModDate(filePath);
    return { urlPath, lastmod, ...config };
  });

  // Sort: homepage first, then by URL path alphabetically
  entries.sort((a, b) => {
    if (a.urlPath === '/') return -1;
    if (b.urlPath === '/') return 1;
    return a.urlPath.localeCompare(b.urlPath);
  });

  // Build XML
  const urls = entries.map(e =>
    `    <url>\n` +
    `        <loc>${SITE_URL}${e.urlPath}</loc>\n` +
    `        <lastmod>${e.lastmod}</lastmod>\n` +
    `        <changefreq>${e.changefreq}</changefreq>\n` +
    `        <priority>${e.priority}</priority>\n` +
    `    </url>`
  ).join('\n');

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `${urls}\n` +
    `</urlset>\n`;

  const outPath = path.join(rootDir, 'sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');

  console.log(`sitemap.xml generated with ${entries.length} URLs:`);
  entries.forEach(e => console.log(`  ${e.urlPath} → priority ${e.priority}, ${e.changefreq}, lastmod ${e.lastmod}`));
}

main();
