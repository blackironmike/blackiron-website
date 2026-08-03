#!/usr/bin/env node
/**
 * inject-pixel.js
 * Build-time script that injects the Meta Pixel into every HTML file.
 * Pixel ID is read from the META_PIXEL_ID environment variable.
 * Runs before generate-sitemap.js during Vercel build.
 *
 * - Idempotent: skips files that already contain the pixel snippet.
 * - Graceful: exits cleanly when META_PIXEL_ID is not set (local dev).
 */

const fs = require('fs');
const path = require('path');

const PIXEL_ID = process.env.META_PIXEL_ID;

// GA4 measurement ID (e.g. G-XXXXXXXXXX). Optional — when set, the
// Google tag is injected alongside the Meta Pixel. See docs/ga4-setup-guide.md.
const GA4_ID = process.env.GA4_MEASUREMENT_ID;

// Comma-separated list of paths that fire ViewContent (mid-funnel event).
// Example: "/getting-started,/programs,/landing"
// Add new ad landing pages here without a code change.
const VIEWCONTENT_PATHS = (process.env.META_VIEWCONTENT_PATHS || '')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean);

// Files that should NOT get the pixel
const EXCLUDED_FILES = new Set([
  'book.html',
  'email-template.html',
  'landing.html',
  'step1.html',
]);

// Directories to skip entirely
const EXCLUDED_DIRS = new Set([
  '.', 'node_modules', 'api', '.git', '.vercel', '.claude',
]);

if (!PIXEL_ID && !GA4_ID) {
  console.log('inject-pixel.js: META_PIXEL_ID and GA4_MEASUREMENT_ID not set — skipping analytics injection.');
  process.exit(0);
}

function buildPixelSnippet(pixelId, vcPaths) {
  const pathsJson = JSON.stringify(vcPaths);
  return [
    '    <!-- Meta Pixel Code -->',
    '    <script>',
    '    !function(f,b,e,v,n,t,s)',
    '    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?',
    '    n.callMethod.apply(n,arguments):n.queue.push(arguments)};',
    '    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version=\'2.0\';',
    '    n.queue=[];t=b.createElement(e);t.async=!0;',
    '    t.src=v;s=b.getElementsByTagName(e)[0];',
    '    s.parentNode.insertBefore(t,s)}(window, document,\'script\',',
    '    \'https://connect.facebook.net/en_US/fbevents.js\');',
    `    fbq('init', '${pixelId}');`,
    '    fbq(\'track\', \'PageView\');',
    `    // ViewContent: mid-funnel event for retargeting audiences`,
    `    var _vcPaths = ${pathsJson};`,
    '    if (_vcPaths.indexOf(window.location.pathname) > -1) {',
    '      fbq(\'track\', \'ViewContent\');',
    '    }',
    '    </script>',
    '    <noscript><img height="1" width="1" style="display:none"',
    `    src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"`,
    '    /></noscript>',
    '    <!-- End Meta Pixel Code -->',
    '    <!-- Meta Pixel Funnel Events -->',
    '    <script>',
    '    // InitiateCheckout + UTM pass-through on the booking links.',
    '    // The consult CTAs are plain links to the booking subdomain now, so',
    '    // the event and the attribution ride a delegated click handler',
    '    // instead of the old modal wrapper. Capture phase, so it still runs',
    '    // if something else stops propagation.',
    '    document.addEventListener(\'click\', function(e) {',
    '      var a = e.target.closest && e.target.closest(\'a[href*="book.blackironathletics.com"]\');',
    '      if (!a) return;',
    '      if (typeof fbq === \'function\') fbq(\'track\', \'InitiateCheckout\');',
    '      // Carry the stored UTMs onto the booking URL so the source of the',
    '      // lead survives the hop to the booking subdomain.',
    '      try {',
    '        var u = new URL(a.href);',
    '        [\'utm_source\',\'utm_medium\',\'utm_campaign\',\'utm_content\'].forEach(function(k) {',
    '          var v = sessionStorage.getItem(k);',
    '          if (v && !u.searchParams.has(k)) u.searchParams.set(k, v);',
    '        });',
    '        a.href = u.toString();',
    '      } catch (err) {}',
    '    }, true);',
    '    </script>',
    '    <!-- End Meta Pixel Funnel Events -->',
    '    <!-- UTM Pass-Through -->',
    '    <script>',
    '    (function() {',
    '      var utmKeys = [\'utm_source\', \'utm_medium\', \'utm_campaign\', \'utm_content\'];',
    '      var params = new URLSearchParams(window.location.search);',
    '      // Capture UTMs from the landing URL into sessionStorage',
    '      utmKeys.forEach(function(key) {',
    '        var val = params.get(key);',
    '        if (val) sessionStorage.setItem(key, val);',
    '      });',
    '      // Build UTM query string from stored values',
    '      var utmParts = [];',
    '      utmKeys.forEach(function(key) {',
    '        var val = sessionStorage.getItem(key);',
    '        if (val) utmParts.push(key + \'=\' + encodeURIComponent(val));',
    '      });',
    '      if (utmParts.length === 0) return;',
    '      var utmString = utmParts.join(\'&\');',
    '      // Tag GHL iframes with UTMs the instant they appear in the DOM.',
    '      // MutationObserver fires synchronously during HTML parsing, so this',
    '      // runs BEFORE deferred scripts (form_embed.js) can copy data-src to src.',
    '      function _tagIframe(el) {',
    '        var ds = el.dataset && el.dataset.src;',
    '        if (ds && ds.indexOf(\'leadconnectorhq.com\') > -1 && ds.indexOf(\'utm_\') === -1) {',
    '          el.dataset.src = ds + (ds.indexOf(\'?\') > -1 ? \'&\' : \'?\') + utmString;',
    '        }',
    '      }',
    '      var _obs = new MutationObserver(function(muts) {',
    '        for (var m = 0; m < muts.length; m++) {',
    '          for (var n = 0; n < muts[m].addedNodes.length; n++) {',
    '            var node = muts[m].addedNodes[n];',
    '            if (node.nodeType !== 1) continue;',
    '            if (node.tagName === \'IFRAME\') _tagIframe(node);',
    '            var fr = node.querySelectorAll ? node.querySelectorAll(\'iframe\') : [];',
    '            for (var i = 0; i < fr.length; i++) _tagIframe(fr[i]);',
    '          }',
    '        }',
    '      });',
    '      _obs.observe(document.documentElement, { childList: true, subtree: true });',
    '      document.addEventListener(\'DOMContentLoaded\', function() { _obs.disconnect(); });',
    '    })();',
    '    </script>',
    '    <!-- End UTM Pass-Through -->',
  ].join('\n');
}

/**
 * Build the GA4 Google tag snippet.
 */
function buildGa4Snippet(ga4Id) {
  return [
    '    <!-- Google tag (gtag.js) -->',
    `    <script async src="https://www.googletagmanager.com/gtag/js?id=${ga4Id}"></script>`,
    '    <script>',
    '    window.dataLayer = window.dataLayer || [];',
    '    function gtag(){dataLayer.push(arguments);}',
    "    gtag('js', new Date());",
    `    gtag('config', '${ga4Id}');`,
    '    </script>',
    '    <!-- End Google tag -->',
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
  const pixelSnippet = PIXEL_ID ? buildPixelSnippet(PIXEL_ID, VIEWCONTENT_PATHS) : null;
  const ga4Snippet = GA4_ID ? buildGa4Snippet(GA4_ID) : null;

  let injected = 0;
  let skipped = 0;

  const active = [PIXEL_ID && `Meta Pixel ${PIXEL_ID}`, GA4_ID && `GA4 ${GA4_ID}`].filter(Boolean).join(' + ');
  console.log(`inject-pixel.js: Injecting ${active} into HTML files...\n`);

  for (const filePath of htmlFiles) {
    const basename = path.basename(filePath);
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    if (EXCLUDED_FILES.has(basename)) {
      console.log(`  skip (excluded): ${relPath}`);
      skipped++;
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Idempotent per snippet: only inject what's missing
    const parts = [];
    if (pixelSnippet && !content.includes('Meta Pixel Code')) parts.push(pixelSnippet);
    if (ga4Snippet && !content.includes('googletagmanager.com/gtag/js')) parts.push(ga4Snippet);
    if (parts.length === 0) {
      console.log(`  skip (already present): ${relPath}`);
      skipped++;
      continue;
    }

    // Inject after the viewport meta tag
    const viewportPattern = /(<meta name="viewport"[^>]*>)/i;

    if (!viewportPattern.test(content)) {
      console.log(`  skip (no viewport meta): ${relPath}`);
      skipped++;
      continue;
    }

    content = content.replace(viewportPattern, `$1\n${parts.join('\n')}`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  injected: ${relPath}`);
    injected++;
  }

  console.log(`\ninject-pixel.js: Done. ${injected} injected, ${skipped} skipped.`);
}

main();
