/* ==========================================================================
   BLACK IRON WHITEBOARD: clock sounds.
   Five sets, all made in the browser (no audio files to load), modeled on gym
   clocks and game-day sounds. Each set has:
     count   the 3, 2, 1 before a clock starts or ends (called with 3, 2 or 1)
     start   the clock starts (and each new EMOM round)
     end     the clock is done
   Preview them at /whiteboard/sounds.html.
   Plain ES5 so it runs on older TV browsers.
   ========================================================================== */
(function () {
  'use strict';

  var master = null, noiseBuf = null;
  function out(ac) {
    if (master && master.context === ac) return master;
    var comp = ac.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 6;
    master = ac.createGain(); master.gain.value = 0.9;
    master.connect(comp); comp.connect(ac.destination);
    return master;
  }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function tone(ac, dest, type, f, t, a, peak, d) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    env(g, t, a, peak, d); o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + a + d + 0.05);
    return o;
  }
  function noise(ac, dest, t, d, peak, hp) {
    if (!noiseBuf) {
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
      var ch = noiseBuf.getChannelData(0);
      for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    }
    var s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp || 2000;
    env(g, t, 0.001, peak, d); s.connect(f); f.connect(g); g.connect(dest);
    s.start(t); s.stop(t + d + 0.05);
  }

  // flat envelope: quick attack, hold, quick cut (piezo beeps, horns, whistles)
  function sus(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, t + d);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.04);
  }
  function flat(ac, dest, type, f, t, peak, d) {
    var o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    sus(g, t, 0.004, peak, d); o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + d + 0.1);
    return o;
  }
  // a gym-clock piezo beep: hard-edged square, a touch of lowpass so it isn't shrill
  function piezo(ac, dest, t, f, d, peak) {
    var lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000; lp.connect(dest);
    flat(ac, lp, 'square', f, t, peak || 0.2, d);
  }
  // the basketball horn: a nasal, slightly dissonant buzz
  function shotHorn(ac, dest, t, d) {
    var bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1100; bp.Q.value = 0.6; bp.connect(dest);
    flat(ac, bp, 'sawtooth', 311, t, 0.3, d);
    flat(ac, bp, 'sawtooth', 370, t, 0.26, d);
    flat(ac, bp, 'square', 155.5, t, 0.16, d);
  }
  // a pea whistle: a high tone with a fast trill, plus a little breath
  function whistle(ac, dest, t, d) {
    var o = ac.createOscillator(), g = ac.createGain(), lfo = ac.createOscillator(), depth = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(2850, t);
    lfo.frequency.value = 30; depth.gain.value = 140; lfo.connect(depth); depth.connect(o.frequency);
    sus(g, t, 0.012, 0.32, d); o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + d + 0.1); lfo.start(t); lfo.stop(t + d + 0.1);
    noise(ac, dest, t, d, 0.03, 2400);
  }
  // a starting pistol: a crack, a thump, and a short tail
  function gun(ac, dest, t) {
    noise(ac, dest, t, 0.25, 1.0, 300);
    noise(ac, dest, t + 0.02, 0.8, 0.2, 150);
    var o = tone(ac, dest, 'sine', 90, t, 0.002, 0.9, 0.35);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.3);
  }
  // one strike on a small hand bell
  function ding(ac, dest, t, f, len) {
    tone(ac, dest, 'sine', f, t, 0.002, 0.3, len);
    tone(ac, dest, 'sine', f * 2.76, t, 0.002, 0.12, len * 0.5);
    tone(ac, dest, 'sine', f * 5.4, t, 0.002, 0.06, len * 0.3);
    noise(ac, dest, t, 0.015, 0.1, 5000);
  }

  var SETS = [
    { id: 'rogue', name: 'Rogue clock', desc: 'Sharp, high piezo beeps in one tone, like a Rogue Echo timer. Three short, then a long beep on go and a longer one at time.',
      count: function (ac, o, t) { piezo(ac, o, t, 2600, 0.14); },
      start: function (ac, o, t) { piezo(ac, o, t, 2600, 0.95); },
      end:   function (ac, o, t) { piezo(ac, o, t, 2600, 1.6); } },

    { id: 'comp', name: 'Comp timer', desc: 'Two-tone competition clock. A lower count, a higher long beep on go, and pulse, pulse, pulse, long at time.',
      count: function (ac, o, t) { piezo(ac, o, t, 1800, 0.13, 0.21); },
      start: function (ac, o, t) { piezo(ac, o, t, 2750, 0.9); },
      end:   function (ac, o, t) { [0, 0.25, 0.5].forEach(function (d) { piezo(ac, o, t + d, 2750, 0.13); }); piezo(ac, o, t + 0.75, 2750, 1.2); } },

    { id: 'shot', name: 'Shot clock', desc: 'Scoreboard tones for the count and the basketball horn to start and end.',
      count: function (ac, o, t) { flat(ac, o, 'triangle', 1050, t, 0.34, 0.13); },
      start: function (ac, o, t) { shotHorn(ac, o, t, 0.6); },
      end:   function (ac, o, t) { shotHorn(ac, o, t, 1.9); } },

    { id: 'whistle', name: 'Ref whistle', desc: 'Quick tweets for the count, one long whistle to start, and the end-of-game whistles to finish.',
      count: function (ac, o, t) { whistle(ac, o, t, 0.12); },
      start: function (ac, o, t) { whistle(ac, o, t, 0.75); },
      end:   function (ac, o, t) { whistle(ac, o, t, 0.28); whistle(ac, o, t + 0.42, 0.28); whistle(ac, o, t + 0.84, 1.3); } },

    { id: 'track', name: 'Track start', desc: 'Starter beeps for the count, a starting gun to go, and the last-lap bell to finish.',
      count: function (ac, o, t) { flat(ac, o, 'sine', 1000, t, 0.4, 0.16); },
      start: function (ac, o, t) { gun(ac, o, t); },
      end:   function (ac, o, t) { for (var i = 0; i < 9; i++) ding(ac, o, t + i * 0.13, 1250, i === 8 ? 1.8 : 0.35); } }
  ];
  var BY_ID = {};
  SETS.forEach(function (s) { BY_ID[s.id] = s; });

  window.BIA_SOUNDS = {
    sets: SETS,
    has: function (id) { return !!BY_ID[id]; },
    // kind: 'count' | 'start' | 'end'; n: 3, 2 or 1 for the count; at: seconds from now
    play: function (ac, id, kind, n, at) {
      var set = BY_ID[id] || SETS[0];
      if (!ac || !set[kind]) return;
      set[kind](ac, out(ac), ac.currentTime + 0.01 + (at || 0), n);
    }
  };
})();
