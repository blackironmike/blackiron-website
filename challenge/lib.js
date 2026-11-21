/* Shared helpers for the challenge app pages. Exposes window.BIA. */
(function () {
  'use strict';
  var CFG = window.BIA_CHALLENGE;
  var sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function avatarUrl(path) {
    return path ? CFG.supabaseUrl + '/storage/v1/object/public/avatars/' + path : null;
  }
  function initials(name) {
    var p = String(name || '?').trim().split(/\s+/);
    return ((p[0] || '?')[0] + (p[1] ? p[1][0] : '')).toUpperCase();
  }
  // Coach headshots are site paths (/images/...); member photos are storage paths.
  function avatar(name, path, cls) {
    cls = cls || '';
    var src = path ? (path.charAt(0) === '/' ? path : avatarUrl(path)) : null;
    return src
      ? '<img class="av ' + cls + '" src="' + esc(src) + '" alt="" loading="lazy">'
      : '<span class="av av-i ' + cls + '" aria-hidden="true">' + esc(initials(name)) + '</span>';
  }

  // 'YYYY-MM-DD' -> local Date at noon (avoids timezone drift)
  function parseDay(s) { var p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
  function fmtDay(s, opts) { return parseDay(s).toLocaleDateString('en-US', opts || { month: 'long', day: 'numeric' }); }
  function daysBetween(a, b) { return Math.round((parseDay(b) - parseDay(a)) / 86400000); }
  function addDays(s, n) {
    var d = parseDay(s); d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function loadBitmap(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return loadImg(file); });
    }
    return loadImg(file);
  }
  function loadImg(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); res(img); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('That file isn’t a photo we can read. Try a JPG or PNG.')); };
      img.src = url;
    });
  }
  // Shrinks a photo in the browser before upload. square:true center-crops.
  function resizeImage(file, o) {
    o = o || {};
    var max = o.max || 1600;
    return loadBitmap(file).then(function (img) {
      var w = img.width, h = img.height, sx = 0, sy = 0, sw = w, sh = h;
      if (o.square) { var m = Math.min(w, h); sx = (w - m) / 2; sy = (h - m) / 2; sw = sh = m; }
      var scale = Math.min(1, max / Math.max(sw, sh));
      var c = document.createElement('canvas');
      c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
      c.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
      return new Promise(function (res, rej) {
        c.toBlob(function (b) { b ? res(b) : rej(new Error('Couldn’t process that photo.')); }, 'image/jpeg', o.quality || 0.85);
      });
    });
  }
  function upload(bucket, uid, blob) {
    var path = uid + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
    return sb.storage.from(bucket).upload(path, blob, { contentType: 'image/jpeg', cacheControl: '31536000' })
      .then(function (r) { if (r.error) throw r.error; return path; });
  }
  function signedUrl(path) {
    return sb.storage.from('proof').createSignedUrl(path, 3600)
      .then(function (r) { return r.data ? r.data.signedUrl : null; });
  }
  function rpc(name, args) {
    return sb.rpc(name, args || {}).then(function (r) { if (r.error) throw r.error; return r.data; });
  }

  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg; el.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('on'); }, 3200);
  }
  function errMsg(e) { return (e && (e.message || e.error_description)) || 'Something went wrong. Try again.'; }

  function rankFor(ranks, pts) {
    var cur = ranks[0] || { name: '', min: 0 }, next = null;
    for (var i = 0; i < ranks.length; i++) {
      if (pts >= ranks[i].min) cur = ranks[i]; else { next = ranks[i]; break; }
    }
    return { cur: cur, next: next };
  }
  function placed(teams) { return teams.slice().sort(function (a, b) { return b.points - a.points || a.id - b.id; }); }
  function ordinal(n) { return n + (['th', 'st', 'nd', 'rd'][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || 'th'); }

  // Instagram, Facebook and similar in-app browsers block Google sign-in.
  function inAppBrowser() { return /Instagram|FBAN|FBAV|FB_IAB|Line\/|TikTok|Snapchat/i.test(navigator.userAgent); }

  window.BIA = {
    CFG: CFG, sb: sb, esc: esc, avatar: avatar, avatarUrl: avatarUrl, initials: initials,
    parseDay: parseDay, fmtDay: fmtDay, daysBetween: daysBetween, addDays: addDays,
    resizeImage: resizeImage, loadBitmap: loadBitmap, upload: upload, signedUrl: signedUrl, rpc: rpc,
    toast: toast, errMsg: errMsg, rankFor: rankFor, placed: placed, ordinal: ordinal, inAppBrowser: inAppBrowser
  };
})();
