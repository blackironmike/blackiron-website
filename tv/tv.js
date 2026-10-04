/* ==========================================================================
   BLACK IRON TV engine
   Reads window.TV_CONFIG (tv/config.js), works out today's date in Frisco,
   and loops the deck forever. You should not need to edit this file to run a
   new cycle; see tv/README.md.

   URL options (all optional):
     ?date=2026-11-16   pretend it is this day (preview a future week)
     ?time=07:30        pretend it is this time (with or without ?date)
     ?week=6            pretend it is this week of the cycle
     ?panel=reaper      show only this panel, on a loop
     ?speed=0.25        play the deck faster (QA)
     ?lite=1            drop the heavier ambient effects (older TVs)
     ?still=1           no animation at all
   ========================================================================== */
(function () {
  'use strict';

  var C = window.TV_CONFIG || {};
  var Q = new URLSearchParams(location.search);
  var IS_PREVIEW = !!window.TV_PREVIEW;
  var TZ = C.timezone || 'America/Chicago';
  var DAY = 86400000;
  var MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var MONTH = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  var WEEKDAY = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  var PHASE_VAR = { intro: 'var(--ph-intro)', test: 'var(--ph-test)', build: 'var(--ph-build)', deload: 'var(--ph-deload)' };

  /* ----------------------------------------------------------------------
     text helpers
     ---------------------------------------------------------------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  // *forge*, ~outline~, and the bullet "•" becomes a drawn dot
  function md(s) {
    return esc(s)
      .replace(/\*([^*]+)\*/g, '<span class="f">$1</span>')
      .replace(/~([^~]+)~/g, '<span class="outline">$1</span>')
      .replace(/\s*•\s*/g, '<span class="dot"></span>');
  }
  function plain(s) { return String(s || '').replace(/[*~]/g, ''); }
  // data-a / delay attribute pair; `style` adds more inline CSS to the same attribute
  function attr(kind, d, style) { return ' data-a="' + kind + '" style="--d:' + Math.round(d) + (style ? ';' + style : '') + '"'; }
  // a headline line that slides up from behind a mask
  function L(html, d) { return '<span class="ln"><span' + attr('up', d) + '>' + html + '</span></span>'; }
  // split "Stronger. Faster. ~Harder to Kill.~" into sentence words
  function sentences(s) { return String(s).replace(/\.\s+/g, '.\u0000').split('\u0000'); }
  function words(s, d, step) {
    return sentences(s).map(function (w, i) {
      return '<span class="word"' + attr('rise', d + i * (step || 140)) + '>' + md(w) + '</span>';
    }).join('');
  }
  // wrap a leading number so it counts up: "60 PWR Snatch" -> 0..60
  function countLead(s, d) {
    var m = /^(\d+)(\s.*)$/.exec(s);
    if (!m) return md(s);
    return '<span data-count="' + m[1] + '" data-delay="' + d + '">' + m[1] + '</span>' + md(m[2]);
  }
  function chipsLine(list) { return list.map(esc).join('<span class="sdot"></span>'); }

  /* ----------------------------------------------------------------------
     time, always in Frisco
     ---------------------------------------------------------------------- */
  var fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  function zoned(ms) {
    var o = {};
    fmt.formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; });
    var h = +o.hour; if (h === 24) h = 0;
    return { y: +o.year, m: +o.month, d: +o.day, h: h, mi: +o.minute, s: +o.second };
  }
  function dayNum(y, m, d) { return Math.floor(Date.UTC(y, m - 1, d) / DAY); }
  function parseDate(s) { var a = String(s).split('-'); return dayNum(+a[0], +a[1], +a[2]); }
  function fromDayNum(n) { var t = new Date(n * DAY); return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() }; }
  // wall-clock time in Frisco -> epoch ms (handles daylight saving)
  function zonedToEpoch(y, m, d, h, mi) {
    var want = Date.UTC(y, m - 1, d, h || 0, mi || 0);
    var guess = want;
    for (var i = 0; i < 3; i++) {
      var z = zoned(guess);
      guess += want - Date.UTC(z.y, z.m - 1, z.d, z.h, z.mi, z.s);
    }
    return guess;
  }
  function weekdayIdx(n) { return ((n + 3) % 7 + 7) % 7; } // Monday = 0
  function fmtShort(n) { var t = fromDayNum(n); return MON[t.m - 1] + ' ' + t.d; }
  function fmtDayName(n) { return WEEKDAY[weekdayIdx(n)]; }

  // The clock can be shifted for previews; it keeps ticking either way.
  var clockOffset = 0;
  (function setupClock() {
    var real = Date.now(), z = zoned(real), y = z.y, m = z.m, d = z.d, h = z.h, mi = z.mi;
    var changed = false;
    if (Q.get('week') && C.cycle) {
      var w = parseInt(Q.get('week'), 10), start = parseDate(C.cycle.start);
      var n = start + (w - 1) * 7 + weekdayIdx(dayNum(y, m, d));
      if (w <= 0) n = start - 1;
      if (w > C.cycle.weeks.length) n = parseDate(C.cycle.end) + 1;
      var t = fromDayNum(n); y = t.y; m = t.m; d = t.d; changed = true;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(Q.get('date') || '')) {
      var a = Q.get('date').split('-'); y = +a[0]; m = +a[1]; d = +a[2]; changed = true;
    }
    if (/^\d{1,2}:\d{2}$/.test(Q.get('time') || '')) {
      var b = Q.get('time').split(':'); h = +b[0]; mi = +b[1]; changed = true;
    }
    if (changed) clockOffset = zonedToEpoch(y, m, d, h, mi) + z.s * 1000 - real;
  })();
  function now() { return Date.now() + clockOffset; }
  function today() { var z = zoned(now()); return dayNum(z.y, z.m, z.d); }
  function timeOfDayFrac() { var z = zoned(now()); return (z.h * 3600 + z.mi * 60 + z.s) / 86400; }

  /* ----------------------------------------------------------------------
     the cycle
     ---------------------------------------------------------------------- */
  function cycleState() {
    var c = C.cycle;
    if (!c || !c.start || !c.weeks || !c.weeks.length) return { phase: 'none', week: 0 };
    var t = today(), s = parseDate(c.start), e = parseDate(c.end || '');
    var n = c.weeks.length;
    if (isNaN(e)) e = s + n * 7 - 1;
    if (t < s) return { phase: 'before', week: 0, start: s, end: e, n: n };
    if (t > e) return { phase: 'after', week: n + 1, start: s, end: e, n: n };
    var idx = t - s, w = Math.min(n, Math.floor(idx / 7) + 1);
    return {
      phase: 'during', week: w, dayIdx: idx, start: s, end: e, n: n,
      totalDays: e - s + 1, info: c.weeks[w - 1]
    };
  }
  function weekStart(k) { return parseDate(C.cycle.start) + (k - 1) * 7; }
  function rangeLabel() {
    var s = fromDayNum(parseDate(C.cycle.start)), e = fromDayNum(parseDate(C.cycle.end));
    return MON[s.m - 1] + ' ' + s.d + ' to ' + MON[e.m - 1] + ' ' + e.d + ', ' + e.y;
  }
  function phaseColor(ph) { return PHASE_VAR[ph] || 'var(--forge)'; }

  /* ----------------------------------------------------------------------
     which panels are on air today
     ---------------------------------------------------------------------- */
  function availability(p) {
    var t = today();
    if (p.status === 'draft') return { on: false, why: 'Draft' };
    if (p.from && t < parseDate(p.from)) return { on: false, why: 'Starts ' + fmtShort(parseDate(p.from)) };
    if (p.until && t > parseDate(p.until)) return { on: false, why: 'Ended ' + fmtShort(parseDate(p.until)) };
    if (p.cycle && cycleState().phase !== 'during') return { on: false, why: 'Cycle not running' };
    if (!RENDER[p.type]) return { on: false, why: 'Unknown type "' + p.type + '"' };
    return { on: true, why: p.until ? 'On air until ' + fmtShort(parseDate(p.until)) : 'On air' };
  }

  var REQUIRED = {
    title: [], timeline: [], columns: ['title', 'columns'], benchmark: ['name', 'movements', 'day'],
    explainer: ['title', 'points'], event: ['title', 'starts'], spotlight: ['title'],
    statement: ['lines'], fuelpath: ['title', 'points'], programs: ['title', 'cards'], qr: ['title', 'qr']
  };
  function validate() {
    var errs = [], ids = {};
    if (!C.deck || !C.deck.length) errs.push('The deck is empty.');
    (C.deck || []).forEach(function (p, i) {
      var name = p.id || ('panel #' + (i + 1));
      if (!p.id) errs.push(name + ': needs an id.');
      else if (ids[p.id]) errs.push(name + ': the id is used twice.');
      ids[p.id] = 1;
      if (!REQUIRED[p.type]) { errs.push(name + ': unknown type "' + p.type + '".'); return; }
      REQUIRED[p.type].forEach(function (k) { if (p[k] == null) errs.push(name + ': missing "' + k + '".'); });
      ['from', 'until'].forEach(function (k) {
        if (p[k] && !/^\d{4}-\d{2}-\d{2}$/.test(p[k])) errs.push(name + ': "' + k + '" must look like 2026-10-24.');
      });
      if (p.type === 'benchmark' && WEEKDAY.indexOf(p.day) < 0) errs.push(name + ': "day" must be a weekday like "Monday".');
    });
    return errs;
  }

  /* ----------------------------------------------------------------------
     shared pieces
     ---------------------------------------------------------------------- */
  function footer(kind, d) {
    if (!kind || kind === 'none') return '';
    var F = C.footers || {};
    var chips = '<div class="chips"' + attr('fade', d) + '>' + chipsLine(F.chips || []) + '</div>';
    if (kind === 'chips') return '<div class="foot chipsOnly">' + chips + '</div>';
    var line = kind === 'brand' ? F.brand : F.cycle;
    return '<div class="foot">' + chips + '<div class="big">' + words(line, d + 120, 150) + '</div></div>';
  }
  function anvil(d) { return '<img class="anvil" src="/images/logos/Anvil-WHITE.png" alt=""' + attr('fade', d) + '>'; }
  function photo(ph, cls, seconds) {
    if (!ph) return '';
    return '<div class="photo ' + (cls || '') + '"' + attr('fade', 0) + '><img class="kb" style="--dur:' +
      (seconds + 4) + 's;object-position:' + esc(ph.position || '50% 50%') + '" src="' + esc(ph.src) + '" alt=""></div>';
  }
  function cycleTopRight(d) {
    var st = cycleState();
    if (st.phase !== 'during') return '';
    return '<div class="topRight"' + attr('fade', d) + '><span class="lbl">' + esc(C.cycle.name) + '</span>' +
      '<span class="wkchip">Week ' + st.week + '<span class="dot"></span>' + esc(st.info.label) + '</span></div>';
  }
  function qrBlock(q, d, box) {
    var size = box.size || 372;
    var top = q.above ? '<div class="above"' + attr('fade', d - 100) + '>' + esc(q.label) + '</div>' : '';
    var lbl = q.above ? '' : '<div class="lbl"' + attr('fade', d + 900) + '>' + esc(q.label).replace(' to ', ' to<br>') + '</div>';
    var cap = q.caption ? '<div class="cap"' + attr('fade', d + 1000) + '>' + esc(q.caption) + '</div>' : '';
    return '<div class="qr" style="left:' + box.left + 'px;top:' + box.top + 'px;width:' + size + 'px">' + top +
      '<div class="card"' + attr('pop', d, '--qh:' + (size - 60) + 'px') + '>' +
      '<div' + attr('scan', d + 250) + '><img src="' + esc(q.src) + '" alt="QR code"></div>' +
      '<div class="beam"></div><div class="ring"></div></div>' + lbl + cap + '</div>';
  }
  // live countdown block; the 1-second tick keeps it current
  function countdown(target, style, d) {
    return '<div class="count" data-cd="' + target + '"' + attr('rise', d || 0, style || '') + '>' +
      '<div class="big" data-cdbig></div><div class="hms" data-cdhms></div></div>';
  }
  function heading(lines, d0, step) {
    return lines.map(function (l, i) { return L(md(l), d0 + i * (step || 170)); }).join('');
  }

  /* ----------------------------------------------------------------------
     panel renderers: each returns the panel's inner HTML
     ---------------------------------------------------------------------- */
  var RENDER = {};

  RENDER.title = function (p, secs) {
    var c = C.cycle, st = cycleState(), h = '';
    h += photo(p.photo, '', secs);
    h += '<img class="mini" src="/images/tv/skull.png" alt=""' + attr('stamp', 150) + '>';
    h += '<div class="h"><h1 class="disp">' + heading(c.titleLines, 300) + '</h1></div>';
    h += '<div class="rule"' + attr('rule', 780) + '></div>';
    h += '<div class="tag">' + words(plain(c.tagline), 900, 150) + '</div>';
    h += '<div class="meta"' + attr('fade', 1350) + '>' + c.weeks.length + '-Week Cycle<span class="dot"></span>' + esc(rangeLabel()) + '</div>';
    h += '<div class="lifts"' + attr('fade', 1500) + '>' + c.lifts.map(esc).join('<span class="dot"></span>') + '</div>';
    if (st.phase === 'during') {
      var segs = c.weeks.map(function (w, i) {
        var k = i + 1, cls = k < st.week ? 'done' : (k === st.week ? 'now' : '');
        return '<i class="' + cls + '" style="--c:' + phaseColor(w.phase) + '"></i>';
      }).join('');
      h += '<div class="live"' + attr('rise', 1650) + '><div class="wkl">Week ' + st.week + ' of ' + st.n +
        '<span class="dot"></span><b>' + esc(st.info.label) + '</b></div><div class="segs">' + segs + '</div></div>';
    }
    h += anvil(1700);
    return h;
  };

  RENDER.timeline = function (p) {
    var c = C.cycle, st = cycleState(), n = c.weeks.length, h = '';
    var W = 184, GAP = n > 1 ? (1760 - n * W) / (n - 1) : 0;
    h += '<div class="eb"><span class="chip"' + attr('wipe', 100) + '>' + esc(p.eyebrow || 'The timeline') + '</span></div>';
    h += '<div class="range"' + attr('fade', 200) + '>' + esc(rangeLabel()) + '</div>';
    var hl = esc(p.headline || (n + ' Weeks')).replace(/^(\d+)/, '<span data-count="$1" data-delay="350">$1</span>');
    h += '<div class="h"><h1 class="disp">' + L(hl, 250) + '</h1></div>';
    h += '<div class="ph"' + attr('fade', 450) + '>' + md(p.phases || '') + '</div>';
    var slots = '';
    c.weeks.forEach(function (w, i) {
      var k = i + 1, isNow = st.phase === 'during' && k === st.week;
      var past = st.phase === 'after' || (st.phase === 'during' && k < st.week);
      slots += '<div class="slot' + (isNow ? ' now' : '') + '"' +
        attr('rise', 520 + i * 75, 'left:' + Math.round(i * (W + GAP)) + 'px;--c:' + phaseColor(w.phase)) + '>' +
        (isNow ? '<div class="glow"></div>' : '') +
        '<div class="card' + (past ? ' past' : '') + '"><div class="top"></div>' + (past ? '<div class="chk"></div>' : '') +
        '<div class="wn">W' + k + '</div><div class="lb">' + esc(w.label) + '</div><div class="dt">' + fmtShort(weekStart(k)) + '</div>' +
        (w.note ? '<div class="nt">' + esc(w.note) + '</div>' : '') + '</div>' +
        (isNow ? '<div class="here"' + attr('drop', 2150) + '><span>You are here</span><i></i></div>' : '') +
        '</div>';
    });
    var fillPx = 0;
    if (st.phase === 'during') fillPx = (st.week - 1) * (W + GAP) + Math.min(1, ((st.dayIdx % 7) + timeOfDayFrac()) / 7) * W;
    if (st.phase === 'after') fillPx = 1760;
    var f = Math.max(0, Math.min(1, fillPx / 1760));
    slots += '<div class="track"' + attr('fade', 900, '--fill:' + f.toFixed(4)) + '><div class="tl-fill"></div>' +
      (st.phase === 'during' ? '<div class="head" style="left:' + Math.round(fillPx) + 'px"></div>' : '') + '</div>';
    h += '<div class="tl">' + slots + '</div>';
    h += '<div class="note">' + (p.note || []).map(function (s, i) { return '<div' + attr('rise', 1500 + i * 140) + '>' + md(s) + '</div>'; }).join('') + '</div>';
    if (st.phase === 'during') {
      var left = st.end - today();
      h += '<div class="stat"' + attr('rise', 1700) + '><div class="n">Day <span data-count="' + (st.dayIdx + 1) + '" data-delay="1800">' + (st.dayIdx + 1) + '</span><small>of ' + st.totalDays + '</small></div>' +
        '<div class="l">' + (left === 0 ? 'Last day of the cycle' : left + (left === 1 ? ' day' : ' days') + ' to go') + '</div></div>';
    }
    h += footer('cycle', 1900);
    return h;
  };

  function benchmarksFoot() {
    var st = cycleState(), n = C.cycle.weeks.length;
    if (st.week <= 2) return 'Tested W2<span class="dot"></span>Retested W' + n;
    if (st.week < n) { var k = n - st.week; return 'Tested W2<span class="dot"></span><b>Retest W' + n + ', ' + k + (k === 1 ? ' week' : ' weeks') + ' out</b>'; }
    return '<b>Retest this week</b>';
  }

  RENDER.columns = function (p) {
    var h = '';
    h += '<div class="h"><h1 class="disp">' + L(md(p.title), 150) + '</h1></div>';
    h += '<div class="sub"' + attr('fade', 350) + '>' + esc(C.cycle.name) + '<span class="dot"></span>' + esc(rangeLabel()) + '</div>';
    h += '<div class="rule"' + attr('rule', 450) + '></div>';
    var cols = '', cw = 562, gap = (1760 - cw * 3) / 2;
    p.columns.forEach(function (col, i) {
      var d = 600 + i * 160;
      cols += '<div class="col"' + attr('rise', d, 'left:' + Math.round(i * (cw + gap)) + 'px') + '><div class="top"></div>' +
        '<h3>' + md(col.heading) + '</h3><ul>' + col.items.map(function (it, j) {
          return '<li' + attr('left', d + 300 + j * 110) + '>' + md(it) + '</li>';
        }).join('') + '</ul>' +
        (col.foot ? '<div class="ft"' + attr('fade', d + 700) + '>' + (col.foot === '@benchmarks' ? benchmarksFoot() : md(col.foot)) + '</div>' : '') + '</div>';
    });
    h += '<div class="cols">' + cols + '</div>';
    if (p.note) h += '<div class="note"' + attr('rise', 1500) + '>' + md(p.note) + '</div>';
    h += footer(p.footer || 'cycle', 1700);
    return h;
  };

  // Where this benchmark sits relative to today: before its test, test day,
  // building toward the retest, retest day, or done.
  function benchState(p) {
    var t = today(), n = C.cycle.weeks.length;
    var tw = (p.weeks && p.weeks[0]) || 2, rw = (p.weeks && p.weeks[1]) || n;
    var day = WEEKDAY.indexOf(p.day);
    var testD = weekStart(tw) + day, reD = weekStart(rw) + day, dn = p.day.toUpperCase();
    if (t < testD) return { chip: 'Benchmark • Tested W' + tw + ' & W' + rw, hot: t >= weekStart(tw), meta: 'Tested ' + dn, n: testD - t, cap: 'Until test day', when: testD };
    if (t === testD) return { chip: 'Benchmark • Test day', hot: true, meta: 'Testing today', word: 'Today', cap: 'Set the number', when: testD };
    if (t < reD) return { chip: 'Benchmark • Retest W' + rw, hot: t >= weekStart(rw), meta: 'Retest ' + dn + ', week ' + rw, n: reD - t, cap: 'Until the retest', when: reD };
    if (t === reD) return { chip: 'Benchmark • Retest day', hot: true, meta: 'Retest today', word: 'Today', cap: 'Beat your Week ' + tw + ' number', when: reD };
    return { chip: 'Benchmark • Tested W' + tw + ' & W' + rw, hot: false, meta: 'Retested ' + dn, word: 'Done', cap: 'Did you beat Week ' + tw + '?', when: reD };
  }

  RENDER.benchmark = function (p) {
    var s = benchState(p), h = '';
    h += cycleTopRight(150);
    var meta = (p.format || []).map(esc).concat([esc(s.meta)]).join('<span class="dot"></span>');
    var size = plain(p.name).length > 14 ? 118 : 128;
    h += '<div class="bm">';
    h += '<div><span class="chip ' + (s.hot ? 'hot' : 'test') + '"' + attr('wipe', 100) + '>' + md(s.chip) + '</span></div>';
    h += '<h1 class="disp nm" style="font-size:' + size + 'px">' + L(md(p.name), 260) + '</h1>';
    h += '<div class="meta"' + attr('fade', 520) + '>' + meta + '</div>';
    h += '<div class="wod"' + attr('fade', 600) + '>' +
      p.movements.map(function (m, i) { return '<div class="mv"' + attr('left', 800 + i * 160) + '>' + countLead(m, 900 + i * 160) + '</div>'; }).join('') + '</div>';
    if (p.note) h += '<div class="note"' + attr('fade', 1200) + '>' + md(p.note) + '</div>';
    h += '</div>';
    // the countdown to the next time this benchmark is on the board
    var big;
    if (s.word) big = '<div class="word">' + esc(s.word) + '</div>';
    else if (s.n === 1) big = '<div class="word">Tomorrow</div>';
    else big = '<div class="n"><span data-count="' + s.n + '" data-delay="1300">' + s.n + '</span></div><div class="u">Days</div>';
    h += '<div class="bm-count"' + attr('rise', 1150) + '>' + big + '<div class="d">' + esc(s.cap) + '</div>' +
      '<div class="d dim">' + esc(fmtDayName(s.when) + ', ' + fmtShort(s.when)) + '</div></div>';
    h += footer(p.footer || 'cycle', 1500);
    return h;
  };

  RENDER.explainer = function (p, secs) {
    var h = '', t = today();
    h += photo(p.photo, 'right', secs);
    var chip = '<span class="chip"' + attr('wipe', 100) + '>' + md(p.eyebrow || '') + '</span>';
    if (p.eyebrowDay && WEEKDAY[weekdayIdx(t)] === p.eyebrowDay) chip = '<span class="chip fill"' + attr('wipe', 100) + '>Today<span class="dot"></span>' + esc(p.eyebrowDay) + '</span>';
    var longest = Math.max.apply(null, p.title.map(function (l) { return plain(l).length; }));
    var size = longest > 12 ? 100 : 118;
    h += '<div class="ex">';
    h += '<div>' + chip + '</div>';
    h += '<h1 class="disp" style="font-size:' + size + 'px">' + heading(p.title, 260, 160) + '</h1>';
    h += '<div class="rule"' + attr('rule', 620) + '></div>';
    h += '<div class="lead"' + attr('fade', 760) + '>' + md(p.lead || '') + '</div>';
    h += '<div class="pts">' + p.points.map(function (pt, i) {
      return '<div class="tick pt"' + attr('left', 950 + i * 170) + '><h4>' + md(pt.title) + '</h4><p>' + md(pt.text) + '</p></div>';
    }).join('') + '</div>';
    if (p.close) h += '<div class="close"' + attr('rise', 1700) + '>' + md(p.close) + '</div>';
    h += '</div>';
    if (p.tempo) {
      h += '<div class="tempo"' + attr('pop', 1900) + '><div class="ring"><svg viewBox="0 0 200 200"><circle class="trk" cx="100" cy="100" r="90"/>' +
        '<circle class="arc" cx="100" cy="100" r="90" data-tempo="' + p.tempo + '"/></svg><div class="num" data-tempo-num>' + p.tempo + '</div></div>' +
        '<div class="cap"><b>' + p.tempo + ' second</b><br>negative</div></div>';
    }
    if (p.footer) h += footer(p.footer, 1800); else h += anvil(1800);
    return h;
  };

  function eventTarget(st) {
    var a = st.date.split('-'), b = (st.time || '00:00').split(':');
    return zonedToEpoch(+a[0], +a[1], +a[2], +b[0], +b[1]);
  }

  RENDER.event = function (p) {
    var h = '';
    h += '<div class="eb"' + attr('wipe', 100) + '>' + md(p.eyebrow || '') + '</div>';
    h += '<div class="h"><h1 class="disp">' + L(md(p.title).replace(/^(\d+)/, '<span data-count="$1" data-delay="300">$1</span>'), 200) + '</h1></div>';
    h += '<div class="when"' + attr('fade', 480) + '>' + md(p.when || '') + '</div>';
    h += '<div class="where"' + attr('fade', 580) + '>' + md(p.where || '') + '</div>';
    h += '<div class="rule"' + attr('rule', 640) + '></div>';
    h += '<div class="items">' + (p.items || []).map(function (it, i) {
      return '<div class="it"' + attr('left', 780 + i * 150) + '><div class="k">' + md(it.label) + '</div><div class="v">' + md(it.text) + '</div></div>';
    }).join('') + '</div>';
    h += '<div class="body">' + (p.body || []).map(function (s, i) { return '<div' + attr('rise', 1250 + i * 120) + '>' + md(s) + '</div>'; }).join('') + '</div>';
    if (p.cta) h += '<div class="cta"' + attr('wipe', 1500) + '>' + md(p.cta) + '</div>';
    if (p.qr) h += qrBlock(p.qr, 700, { left: 1468, top: 150, size: 372 });
    if (p.starts) h += countdown(eventTarget(p.starts), 'left:1420px;top:700px;width:468px', 1300);
    h += footer(p.footer || 'chips', 1700);
    h += anvil(1800);
    return h;
  };

  RENDER.spotlight = function (p) {
    var h = '', F = C.footers || {};
    if (p.skull === 'pattern') h += '<div class="pattern kb2"></div><div class="shade"></div>';
    h += '<div class="lock"' + attr('fade', 100) + '>Black Iron<div class="a">Athletics</div>' +
      (p.cycleLabel !== false && cycleState().phase === 'during' ? '<div class="c">' + esc(C.cycle.name) + '</div>' : '') + '</div>';
    h += '<div class="eb"><span class="chip fill big"' + attr('wipe', 250) + '>' + md(p.chip || '') + '</span></div>';
    if (p.starts) h += countdown(eventTarget(p.starts), 'right:80px;top:62px;text-align:right', 600);
    h += '<div class="h"><h1 class="disp">' + heading(p.title, 350, 180) + '</h1></div>';
    h += '<div class="rule"' + attr('rule', 800) + '></div>';
    h += '<div class="dl"' + attr('rise', 900) + '>' + md(p.dateLine || '') + '</div>';
    h += '<div class="sb"' + attr('rise', 1020) + '>' + md(p.sub || '') + '</div>';
    if (p.cards) {
      var cw = 561, gap = (1760 - 3 * cw) / 2;
      h += '<div class="scards">' + p.cards.map(function (c, i) {
        return '<div class="sc"' + attr('rise', 1150 + i * 150, 'left:' + Math.round(i * (cw + gap)) + 'px') + '><div class="top"></div><h4>' + md(c.title) + '</h4><p>' + md(c.text) + '</p></div>';
      }).join('') + '</div>';
    }
    if (p.images) {
      h += '<div class="renders">' + p.images.map(function (src, i) { return '<img src="' + esc(src) + '" alt=""' + attr('rise', 1150 + i * 150) + '>'; }).join('') + '</div>';
    }
    h += '<div class="foot"><div class="chips"' + attr('fade', 1600) + '>' + chipsLine(F.chips || []) + '</div></div>';
    if (p.footer !== 'chips') h += '<div class="footR"' + attr('fade', 1700) + '>' + md(plain(p.footer === 'brand' ? F.brand : F.cycle)) + '</div>';
    return h;
  };

  RENDER.statement = function (p, secs) {
    var h = '';
    h += photo(p.photo, 'full', secs);
    h += '<img class="anv" src="/images/logos/Anvil-WHITE.png" alt=""' + attr('stamp', 100) + '>';
    var d = 320, lines = p.lines.map(function (line) {
      // split into words, keeping *highlighted* runs highlighted
      var toks = line.match(/\*[^*]+\*|\S+/g) || [], out = [];
      toks.forEach(function (tk) {
        var hi = /^\*.*\*$/.test(tk);
        (hi ? tk.slice(1, -1).split(' ') : [tk]).forEach(function (wd) {
          out.push('<span class="wm"><span' + attr('up', d) + (hi ? ' class="f"' : '') + '>' + esc(wd) + '</span></span>');
          d += 95;
        });
      });
      return '<div>' + out.join(' ') + '</div>';
    });
    h += '<div class="h"><h1 class="disp">' + lines.join('') + '</h1></div>';
    h += '<div class="rule"' + attr('rule', d + 100) + '></div>';
    h += '<div class="sub">' + words(p.sub || '', d + 250, 160) + '</div>';
    h += '<div class="chips"' + attr('fade', d + 600) + '>' + chipsLine((C.footers || {}).chips || []) + '</div>';
    return h;
  };

  // an animated ring: track + arc that sweeps to `pct` once the panel is in
  function ring(size, r, pct, color, width) {
    var c = 2 * Math.PI * r, off = c * (1 - pct), cx = size / 2;
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="#262626" stroke-width="' + width + '"/>' +
      '<circle class="arc" cx="' + cx + '" cy="' + cx + '" r="' + r + '" stroke="' + color + '" stroke-width="' + width +
      '" style="stroke-dasharray:' + c.toFixed(1) + ';stroke-dashoffset:' + c.toFixed(1) + ';--off:' + off.toFixed(1) + '"/></svg>';
  }

  RENDER.fuelpath = function (p) {
    var h = '';
    h += '<div class="fp-lock"' + attr('rise', 100) + '><img class="mk" src="/images/tv/fuelpath-mark.svg" alt="">' +
      '<div class="wm"><div class="t">Fuel<span>Path</span></div><img src="/images/tv/fuelpath-arrow.svg" alt=""></div></div>';
    h += '<div class="h"><h1 class="disp">' + heading(p.title, 300) + '</h1></div>';
    h += '<div class="rule"' + attr('rule', 700) + '></div>';
    h += '<div class="fp-pts">' + p.points.map(function (s, i) { return '<div class="tick"' + attr('left', 850 + i * 150) + '>' + md(s) + '</div>'; }).join('') + '</div>';
    if (p.ask) h += '<div class="fp-ask"' + attr('rise', 1350) + '>' + md(p.ask) + '</div>';
    h += footer(p.footer || 'brand', 1500);
    // the phone: a live recreation of the app's Today screen, dated today.
    // Numbers are an example day, not a member's results.
    var z = zoned(now()), dn = dayNum(z.y, z.m, z.d);
    var dateLabel = (fmtDayName(dn) + ', ' + MON[z.m - 1] + ' ' + z.d).toUpperCase();
    var hh = z.h % 12 || 12, mm = (z.mi < 10 ? '0' : '') + z.mi;
    h += '<div class="phoneWrap"' + attr('phone', 350) + '><div class="float"><div class="phone"><div class="notch"></div><div class="glare"></div><div class="ps">' +
      '<div class="sb">' + hh + ':' + mm + '<span class="r"><i></i><i></i><i></i><i></i><em></em></span></div>' +
      '<div class="hdr"><img class="fpm" src="/images/tv/fuelpath-mark.svg" alt=""><img class="an" src="/images/logos/Anvil-WHITE.png" alt=""><span class="bn">BLACK IRON</span><span class="ask">Ask</span></div>' +
      '<div class="dte">' + dateLabel + '</div><div class="ttl">Today</div>' +
      '<div class="ci"><div class="rg">' + ring(58, 24, .72, '#FFD202', 5) + '<b>3d</b></div><div class="t1">Next check-in Thursday</div><div class="t2">Your coach reads every one.</div></div>' +
      '<div class="chips"><span><b data-count="18" data-delay="1600">18</b> day streak</span><span>Protein on track</span></div>' +
      '<div class="rings">' +
      '<div class="side" style="left:14px"><b data-count="491" data-delay="1500" data-fmt="comma">491</b><span>Remaining</span></div>' +
      '<div class="big">' + ring(200, 86, .704, '#A855F7', 14) + '<div class="c"><b data-count="1170" data-delay="1400" data-fmt="comma">1,170</b><span>consumed</span></div></div>' +
      '<div class="side" style="right:14px"><b data-count="1661" data-delay="1500" data-fmt="comma">1,661</b><span>Target</span></div>' +
      '<div class="sm" style="left:28px">' + ring(100, 40, .62, '#3B82F6', 9) + '<div class="c"><span data-count="61" data-delay="1700">61</span>g<small>left</small></div><div class="lb">Protein</div></div>' +
      '<div class="sm" style="left:143px">' + ring(100, 40, .55, '#22C55E', 9) + '<div class="c"><span data-count="84" data-delay="1750">84</span>g<small>left</small></div><div class="lb">Carbs</div></div>' +
      '<div class="sm" style="right:28px">' + ring(100, 40, .68, '#EF4444', 9) + '<div class="c"><span data-count="19" data-delay="1800">19</span>g<small>left</small></div><div class="lb">Fat</div></div>' +
      '</div>' +
      '<div class="tabs"><span style="left:6px;color:var(--forge)">Today</span><span style="left:84px">Progress</span><div class="plus">+</div><span style="right:84px">Habits</span><span style="right:6px">More</span></div>' +
      '</div></div></div></div>';
    return h;
  };

  RENDER.programs = function (p, secs) {
    var h = '';
    var chips = p.chips.map(function (c) {
      if (c && typeof c === 'object') return '<span data-count="' + c.count + '" data-delay="300" data-fmt="comma">' + fmtNum(c.count, 'comma') + '</span>' + esc(c.suffix || '') + ' ' + esc(c.text || '');
      return esc(c);
    }).join('<span class="dot"></span>');
    h += '<div class="chipsTop"' + attr('fade', 100) + '>' + chips + '</div>';
    h += '<div class="h"><h1 class="disp">' + heading(p.title, 250) + '</h1></div>';
    h += '<div class="ms"' + attr('fade', 700) + '>' + md(p.mission || '') + '</div>';
    var cw = 418, gap = (1760 - 4 * cw) / 3;
    h += '<div class="pcards">' + p.cards.map(function (c, i) {
      var txt = (Array.isArray(c.text) ? c.text : [c.text]).map(md).join('<br>');
      return '<div class="pc"' + attr('rise', 850 + i * 140, 'left:' + Math.round(i * (cw + gap)) + 'px') + '><div class="top"></div>' +
        (c.photo ? '<div class="ph"><img class="kb" style="--dur:' + (secs + 6) + 's;object-position:' + esc(c.photo.position || '50% 50%') + '" src="' + esc(c.photo.src) + '" alt=""></div>' : '') +
        '<h4>' + md(c.title) + '</h4><p>' + txt + '</p></div>';
    }).join('') + '</div>';
    h += footer(p.footer || 'chips', 1500);
    h += anvil(1600);
    return h;
  };

  RENDER.qr = function (p, secs) {
    var h = '', lines = p.title.length;
    if (p.photo) h += photo(p.photo, 'right', secs);
    h += '<div class="qx ' + (lines >= 3 ? 'tall' : 'short') + '">';
    h += '<h1 class="disp">' + heading(p.title, 200, 160) + '</h1>';
    h += '<div class="rule"' + attr('rule', 600) + '></div>';
    if (p.body) h += '<div class="body"' + attr('fade', 760) + '>' + md(p.body) + '</div>';
    if (p.stars) {
      var star = '<svg viewBox="0 0 24 24"><path d="M12 1.8l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.9l-6.4 3.5 1.4-7.1-5.3-5 7.2-.9z"/></svg>';
      var s = '';
      for (var i = 0; i < p.stars; i++) s += '<span' + attr('pop', 1000 + i * 120) + '>' + star + '</span>';
      h += '<div class="stars">' + s + '</div>';
    }
    if (p.steps) h += '<div class="steps"' + attr('fade', 1700) + '>' + p.steps.map(esc).join('<span class="dot"></span>') + '</div>';
    if (p.list) h += '<div class="list">' + p.list.map(function (s, i) {
      return '<div class="tick"' + attr('left', 800 + i * 130) + '>' + md(s) + '</div>';
    }).join('') + '</div>';
    h += '</div>';
    h += qrBlock(p.qr, 600, p.qr.above ? { left: 1440, top: 210, size: 400 } : { left: 1440, top: 260, size: 400 });
    h += footer(p.footer || 'brand', 1800);
    return h;
  };

  /* ----------------------------------------------------------------------
     render a panel to HTML (shared by the TV loop and the preview grid)
     ---------------------------------------------------------------------- */
  function seconds(p) {
    var s = +p.seconds || +C.defaultSeconds || 12;
    var sp = parseFloat(Q.get('speed'));
    return sp > 0 ? s * sp : s;
  }
  function skullFor(p) { return p.skull || 'right'; }
  function renderPanel(p) {
    return '<section class="panel p-' + p.type + '" data-id="' + esc(p.id) + '">' + RENDER[p.type](p, seconds(p)) + '</section>';
  }

  /* ----------------------------------------------------------------------
     live bits: count-ups, countdowns, tempo ring
     ---------------------------------------------------------------------- */
  function fmtNum(n, f) { return f === 'comma' ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : String(n); }
  function runCounts(root, still) {
    var els = root.querySelectorAll('[data-count]');
    Array.prototype.forEach.call(els, function (el) {
      var to = +el.getAttribute('data-count'), f = el.getAttribute('data-fmt');
      if (still || isStill) { el.textContent = fmtNum(to, f); return; }
      var delay = +(el.getAttribute('data-delay') || 0), dur = 1200, t0 = null;
      el.textContent = fmtNum(0, f);
      setTimeout(function () {
        function step(ts) {
          if (!el.isConnected) return;
          if (t0 === null) t0 = ts;
          var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
          el.textContent = fmtNum(Math.round(to * e), f);
          if (k < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }, delay);
    });
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tickCountdowns(root) {
    var els = root.querySelectorAll('[data-cd]');
    Array.prototype.forEach.call(els, function (el) {
      var diff = +el.getAttribute('data-cd') - now();
      var bigEl = el.querySelector('[data-cdbig]'), hmsEl = el.querySelector('[data-cdhms]');
      var big, hms = '';
      if (diff <= 0) {
        // the day of, until midnight
        big = 'Today';
        hms = '';
      } else {
        var d = Math.floor(diff / DAY), r = diff - d * DAY;
        var hh = Math.floor(r / 3600000), mm = Math.floor((r % 3600000) / 60000), ss = Math.floor((r % 60000) / 1000);
        if (d >= 1) big = d + '<small>' + (d === 1 ? 'Day' : 'Days') + '</small>';
        else big = hh + '<small>' + (hh === 1 ? 'Hour' : 'Hours') + '</small>';
        hms = '<span>' + pad(hh) + '</span><em>HRS</em><span>' + pad(mm) + '</span><em>MIN</em><span>' + pad(ss) + '</span><em>SEC</em>';
      }
      if (bigEl && bigEl.getAttribute('data-v') !== big) { bigEl.innerHTML = big; bigEl.setAttribute('data-v', big); }
      if (hmsEl) hmsEl.innerHTML = hms;
    });
  }
  function startTempo(root) {
    var arc = root.querySelector('[data-tempo]');
    if (!arc || isStill) return;
    var secs = +arc.getAttribute('data-tempo'), num = root.querySelector('[data-tempo-num]'), C2 = 565.5;
    var t0 = performance.now() + 2200;
    function step(ts) {
      if (!arc.isConnected) return;
      var t = (ts - t0) / 1000;
      if (t < 0) { requestAnimationFrame(step); return; }
      var cyc = secs + 1.2, k = t % cyc;
      if (k < secs) {
        arc.style.strokeDashoffset = (C2 * (k / secs)).toFixed(1);
        num.textContent = String(Math.max(1, Math.ceil(secs - k)));
      } else {
        arc.style.strokeDashoffset = (C2 * (1 - (k - secs) / 1.2)).toFixed(1);
        num.textContent = 'UP';
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ----------------------------------------------------------------------
     the TV loop
     ---------------------------------------------------------------------- */
  var isStill = Q.get('still') === '1' || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var stage, viewport, layers = [], cur = 0, pointer = -1, timer = null, segAnim = null;
  var shiftIdx = 0, SHIFTS = [[0, 0], [2, 0], [2, 2], [0, 2], [-2, 2], [-2, 0], [-2, -2], [0, -2], [2, -2]];
  var bootAt = Date.now(), pendingReload = false, errorCount = 0, baseHash = null;

  function fit() {
    if (!stage) return;
    var W = viewport.clientWidth || innerWidth, H = viewport.clientHeight || innerHeight;
    var s = Math.min(W / 1920, H / 1080), sh = SHIFTS[shiftIdx % SHIFTS.length];
    var x = (W - 1920 * s) / 2 + sh[0] * s, y = (H - 1080 * s) / 2 + sh[1] * s;
    stage.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px) scale(' + s.toFixed(5) + ')';
  }

  function setWeekColor() {
    var st = cycleState();
    stage.style.setProperty('--wk', st.phase === 'during' ? phaseColor(st.info.phase) : 'var(--forge)');
  }

  function onAir() {
    var pin = Q.get('panel');
    return (C.deck || []).filter(function (p) {
      if (pin) return p.id === pin && !!RENDER[p.type];
      return availability(p).on;
    });
  }

  function drawDots(list, curId) {
    var el = document.getElementById('dots');
    if (!el) return null;
    var i = -1, html = '';
    list.forEach(function (p, k) { if (p.id === curId) i = k; });
    list.forEach(function (p, k) { html += '<i class="' + (k < i ? 'done' : '') + '">' + (k === i ? '<b></b>' : '') + '</i>'; });
    el.innerHTML = html;
    return el.querySelector('b');
  }

  function spark() {
    Array.prototype.forEach.call(document.querySelectorAll('.spark'), function (s) {
      s.classList.remove('go'); void s.offsetWidth; s.classList.add('go');
    });
  }

  function next() {
    clearTimeout(timer);
    if (pendingReload) { safeReload(); return; }
    var deck = C.deck || [], list = onAir();
    if (!list.length) { timer = setTimeout(next, 30000); return; }
    // move to the next on-air panel after the current one, in config order
    var start = pointer, j = -1;
    for (var k = 1; k <= deck.length; k++) {
      var c = (start + k + deck.length) % deck.length;
      if (list.indexOf(deck[c]) >= 0) { j = c; break; }
    }
    if (j < 0) j = deck.indexOf(list[0]);
    show(j, list);
  }

  function show(j, list) {
    var p = C.deck[j], html;
    try { html = renderPanel(p); }
    catch (e) {
      console.error('[tv] panel "' + p.id + '" failed to draw, skipping it', e);
      pointer = j; timer = setTimeout(next, 100); return;
    }
    var first = pointer < 0;
    var inc = layers[cur ^ 1], out = layers[cur];
    inc.className = 'layer'; inc.innerHTML = html;
    shiftIdx++; fit(); setWeekColor();
    stage.classList.remove('sk-right', 'sk-off', 'sk-pattern', 'sk-low');
    stage.classList.add('sk-' + skullFor(p));
    if (!first) { out.classList.remove('in'); out.classList.add('out'); spark(); }
    setTimeout(function () {
      inc.classList.add('in');
      runCounts(inc);
      tickCountdowns(inc);
      startTempo(inc);
    }, first ? 60 : 340);
    setTimeout(function () { if (out !== layers[cur]) { out.className = 'layer'; out.innerHTML = ''; } }, 900);
    cur ^= 1; pointer = j;

    var dur = seconds(p) * 1000;
    var bar = drawDots(list, p.id);
    if (segAnim) { try { segAnim.cancel(); } catch (e) {} segAnim = null; }
    if (bar && bar.animate) segAnim = bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: dur, fill: 'forwards' });
    timer = setTimeout(next, dur);
  }

  /* --- staying alive for weeks --- */
  function hashText(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return h; }
  function fetchText(u) {
    return Promise.race([
      fetch(u + (u.indexOf('?') < 0 ? '?' : '&') + '_=' + Date.now(), { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status); return r.text();
      }),
      new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, 8000); })
    ]);
  }
  function currentHash() {
    return Promise.all(['/tv/config.js', '/tv/tv.js', '/tv/tv.css'].map(fetchText)).then(function (t) { return hashText(t.join('|')); });
  }
  function setOffline(on) { var el = document.getElementById('offline'); if (el) el.className = on ? 'on' : ''; }
  function checkForUpdate() {
    currentHash().then(function (h) {
      setOffline(false);
      if (baseHash === null) baseHash = h;
      else if (h !== baseHash) pendingReload = true; // picked up at the next panel change
      if (Date.now() - bootAt > 6 * 3600000) pendingReload = true; // safety valve every 6 hours
    }).catch(function () { setOffline(true); });
  }
  // only reload when the server answers, so a TV never reloads into an outage
  function safeReload() {
    fetchText('/tv/config.js').then(function () { location.reload(); })
      .catch(function () { pendingReload = false; setOffline(true); timer = setTimeout(next, 1000); });
  }

  function keepAwake() {
    if (!('wakeLock' in navigator)) return;
    var req = function () { navigator.wakeLock.request('screen').catch(function () {}); };
    req();
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') req(); });
  }

  function preload(srcs, ms) {
    return Promise.race([
      Promise.all(srcs.map(function (src) {
        return new Promise(function (res) { var im = new Image(); im.onload = im.onerror = function () { res(); }; im.src = src; });
      })),
      new Promise(function (res) { setTimeout(res, ms); })
    ]);
  }
  function allImages() {
    var out = ['/images/tv/skull.png', '/images/logos/Anvil-WHITE.png'];
    JSON.stringify(C.deck || []).replace(/"(\/images\/[^"]+)"/g, function (_, s) { out.push(s); });
    return out;
  }
  function fontsReady(ms) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.race([
      Promise.all(['900 100px Montserrat', '800 40px Montserrat', '700 30px Montserrat', '600 30px Montserrat', '500 30px Montserrat', '400 30px Montserrat', '800 60px Archivo']
        .map(function (f) { return document.fonts.load(f); })),
      new Promise(function (res) { setTimeout(res, ms); })
    ]);
  }

  function bootTV() {
    viewport = document.getElementById('viewport');
    stage = document.getElementById('stage');
    layers = [document.getElementById('L0'), document.getElementById('L1')];
    if (isStill) stage.classList.add('still');
    if (Q.get('lite') === '1') stage.classList.add('lite');
    var stamp = document.getElementById('stamp');
    if (stamp) {
      if (Q.get('stamp') === '0') stamp.className = 'off';
      stamp.textContent = 'Black Iron TV  v' + (C.version || '?') + (clockOffset ? '  preview ' + new Date(now()).toISOString().slice(0, 10) : '');
    }
    fit();
    if (window.ResizeObserver) new ResizeObserver(fit).observe(viewport); else addEventListener('resize', fit);
    var errs = validate();
    if (errs.length) console.warn('[tv] config problems:\n' + errs.join('\n'));
    addEventListener('error', function () { if (++errorCount > 25) pendingReload = true; });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    keepAwake();
    Promise.all([fontsReady(5000), preload(allImages(), 7000)]).then(function () {
      var boot = document.getElementById('boot');
      next();
      if (boot) { boot.className = 'gone'; setTimeout(function () { boot.parentNode && boot.parentNode.removeChild(boot); }, 1200); }
    });
    setInterval(function () { tickCountdowns(layers[cur]); }, 1000);
    checkForUpdate();
    setInterval(checkForUpdate, 10 * 60000);
    if ('serviceWorker' in navigator && C.offline !== false && location.protocol === 'https:') {
      navigator.serviceWorker.register('/tv-sw.js', { scope: '/tv' }).catch(function () {});
    }
  }

  /* ----------------------------------------------------------------------
     /tv/preview: every panel in one grid, frozen at its finished state
     ---------------------------------------------------------------------- */
  function bootPreview() {
    isStill = true;
    var root = document.getElementById('pv');
    var errs = validate();
    var t = today();
    var dateVal = fromDayNum(t);
    var iso = dateVal.y + '-' + pad(dateVal.m) + '-' + pad(dateVal.d);
    var st = cycleState();
    var head = '<div class="pv-head"><h1>Black Iron TV, every panel</h1>' +
      '<p>Showing the deck as it looks on <b style="color:#fff">' + fmtDayName(t) + ', ' + MONTH[dateVal.m - 1] + ' ' + dateVal.d + ', ' + dateVal.y + '</b>' +
      (st.phase === 'during' ? ', week ' + st.week + ' of ' + st.n + ' (' + esc(st.info.label) + ')' : st.phase === 'before' ? ', before the cycle starts' : st.phase === 'after' ? ', after the cycle ends' : '') +
      '. Config v' + esc(C.version || '?') + '. <a href="/tv' + location.search + '">Play the loop</a></p></div>';
    var weeks = '';
    if (C.cycle) for (var w = 1; w <= C.cycle.weeks.length; w++) weeks += '<button data-week="' + w + '"' + (st.week === w ? ' class="on"' : '') + '>W' + w + '</button>';
    var ctl = '<div class="pv-ctl">Pretend it is <input type="date" id="pvDate" value="' + iso + '"> <button id="pvToday">Today</button> ' + weeks + '</div>';
    var err = errs.length ? '<div class="pv-err"><b>Config problems</b><br>' + errs.map(esc).join('<br>') + '</div>' : '';
    var items = (C.deck || []).map(function (p) {
      var a = availability(p), html = '';
      try { html = RENDER[p.type] ? renderPanel(p) : '<div style="padding:80px;font:700 40px Montserrat;color:#FF4B4B">Unknown type</div>'; }
      catch (e) { html = '<div style="padding:80px;font:700 40px Montserrat;color:#FF4B4B">Failed to draw: ' + esc(e.message) + '</div>'; }
      var tag = p.status === 'draft' ? '<span class="pv-tag draft">Draft</span>' : (a.on ? '<span class="pv-tag live">On air</span>' : '<span class="pv-tag off">Off</span>');
      return '<div class="pv-item"><div class="pv-frame"><div class="stageMini sk-' + skullFor(p) + '">' +
        '<div class="bar" style="top:0"></div><div class="bar" style="bottom:0"></div>' +
        '<div id="skullWrap"><img src="/images/tv/skull.png" alt=""></div>' +
        '<div class="layer in still">' + html + '</div></div></div>' +
        '<div class="pv-meta">' + tag + '<b>' + esc(p.id) + '</b> · ' + esc(p.type) + ' · ' + seconds(p) + 's · ' + esc(a.why) +
        ' <a href="/tv?panel=' + encodeURIComponent(p.id) + (Q.get('date') ? '&date=' + Q.get('date') : '') + '">Play</a></div></div>';
    }).join('');
    root.innerHTML = head + ctl + err + '<div class="pv-grid">' + items + '</div>';
    var st2 = cycleState();
    Array.prototype.forEach.call(root.querySelectorAll('.stageMini'), function (m) {
      m.style.setProperty('--wk', st2.phase === 'during' ? phaseColor(st2.info.phase) : 'var(--forge)');
      runCounts(m, true); tickCountdowns(m);
    });
    function scale() {
      Array.prototype.forEach.call(root.querySelectorAll('.pv-frame'), function (f) {
        var w = f.clientWidth; f.style.height = Math.round(w * 9 / 16) + 'px';
        f.firstChild.style.transform = 'scale(' + (w / 1920) + ')';
      });
    }
    scale(); addEventListener('resize', scale);
    function go(params) { location.search = params; }
    document.getElementById('pvDate').addEventListener('change', function (e) { go('?date=' + e.target.value); });
    document.getElementById('pvToday').addEventListener('click', function () { go(''); });
    Array.prototype.forEach.call(root.querySelectorAll('[data-week]'), function (b) {
      b.addEventListener('click', function () { go('?week=' + b.getAttribute('data-week')); });
    });
    setInterval(function () { Array.prototype.forEach.call(root.querySelectorAll('.stageMini'), tickCountdowns); }, 1000);
  }

  // exposed for tests and the preview page
  window.BlackIronTV = { cycleState: cycleState, availability: availability, validate: validate, today: today, now: now, render: renderPanel };

  function start() { if (IS_PREVIEW) bootPreview(); else bootTV(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
