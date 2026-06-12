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

if (!PIXEL_ID) {
  console.log('inject-pixel.js: META_PIXEL_ID not set — skipping pixel injection.');
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
    '    <!-- Meta Pixel Funnel Events + UTM Relay -->',
    '    <script>',
    '    // InitiateCheckout: fires when the lead-capture form opens',
    '    // UTM Relay: sends UTMs directly to GHL iframe via postMessage',
    '    document.addEventListener(\'DOMContentLoaded\', function() {',
    '      if (typeof window.openLeadModal === \'function\') {',
    '        var _openLeadModal = window.openLeadModal;',
    '        window.openLeadModal = function() {',
    '          fbq(\'track\', \'InitiateCheckout\');',
    '          var result = _openLeadModal.apply(this, arguments);',
    '          // Send UTMs directly to GHL form iframe via postMessage',
    '          var iframe = document.querySelector(\'#leadModal iframe\');',
    '          if (iframe) {',
    '            var _utmObj = {};',
    '            [\'utm_source\',\'utm_medium\',\'utm_campaign\',\'utm_content\'].forEach(function(k) {',
    '              var v = sessionStorage.getItem(k);',
    '              if (v) _utmObj[k] = v;',
    '            });',
    '            if (Object.keys(_utmObj).length > 0) {',
    '              var _sendUtms = function() {',
    '                try { iframe.contentWindow.postMessage(',
    '                  [\'query-params\', _utmObj, window.location.search, document.referrer], \'*\'',
    '                ); } catch(e) {}',
    '              };',
    '              iframe.addEventListener(\'load\', _sendUtms, { once: true });',
    '              setTimeout(_sendUtms, 1500);',
    '            }',
    '          }',
    '          return result;',
    '        };',
    '      }',
    '    });',
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
    '      // Write to GHL form_embed.js internal sessionStorage key ("UPS")',
    '      // so it finds UTMs when sending postMessage to the form iframe',
    '      sessionStorage.setItem(\'UPS\', \'?\' + utmString);',
    '      // Ensure UTMs are in the parent page URL so GHL form_embed.js picks them up.',
    '      // Uses replaceState to silently add them back if the user navigated away',
    '      // from the landing page. No visible change to the user.',
    '      var currentParams = new URLSearchParams(window.location.search);',
    '      var needsUpdate = false;',
    '      utmKeys.forEach(function(key) {',
    '        if (!currentParams.has(key) && sessionStorage.getItem(key)) {',
    '          currentParams.set(key, sessionStorage.getItem(key));',
    '          needsUpdate = true;',
    '        }',
    '      });',
    '      if (needsUpdate) {',
    '        history.replaceState(null, \'\', window.location.pathname + \'?\' + currentParams.toString() + window.location.hash);',
    '      }',
    '      // Also append UTMs to GHL form iframe URLs as a fallback',
    '      document.addEventListener(\'DOMContentLoaded\', function() {',
    '        var iframes = document.querySelectorAll(\'iframe[data-src*="leadconnectorhq.com"]\');',
    '        for (var i = 0; i < iframes.length; i++) {',
    '          var src = iframes[i].dataset.src;',
    '          if (src && src.indexOf(\'utm_\') === -1) {',
    '            iframes[i].dataset.src = src + (src.indexOf(\'?\') > -1 ? \'&\' : \'?\') + utmString;',
    '          }',
    '        }',
    '      });',
    '    })();',
    '    </script>',
    '    <!-- End UTM Pass-Through -->',
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
  const snippet = buildPixelSnippet(PIXEL_ID, VIEWCONTENT_PATHS);

  let injected = 0;
  let skipped = 0;

  console.log(`inject-pixel.js: Injecting Meta Pixel ${PIXEL_ID} into HTML files...\n`);

  for (const filePath of htmlFiles) {
    const basename = path.basename(filePath);
    const relPath = path.relative(rootDir, filePath).replace(/\\/g, '/');

    if (EXCLUDED_FILES.has(basename)) {
      console.log(`  skip (excluded): ${relPath}`);
      skipped++;
      continue;
    }

    let content = fs.readFileSync(filePath, 'utf8');

    // Idempotent: skip if pixel is already present
    if (content.includes('Meta Pixel Code')) {
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

    content = content.replace(viewportPattern, `$1\n${snippet}`);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  injected: ${relPath}`);
    injected++;
  }

  console.log(`\ninject-pixel.js: Done. ${injected} injected, ${skipped} skipped.`);
}

main();
