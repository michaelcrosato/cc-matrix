/* 00-core: the G namespace, constants, seeded random streams, the event bus, money and text helpers.
 * Every src file adds to G (the build wraps them all in one IIFE with const E = My3D2dge). */
G.VERSION = 'v1.0';
G.TITLE = 'Ahead or Alive';
G.STRAP = 'Xtreme Beach Volleyball';
G.TAGLINE = 'Stay ahead. Stay alive. Stay tanned.';
G.DAYS = 5;
G.SLOTS = ['Morning', 'Afternoon', 'Night'];
G.SLOT_HOURS = [[6, 12], [12, 18], [18, 24]];
/* the pixel font draws ASCII, hearts, arrows and bullets: other symbols are mapped to close ones before they are drawn */
G.FONT_SAFE = { '·': '-', '✕': 'X', '○': 'O', '□': '[]', '△': '^', '◂': '<', '…': '...', '—': '-', '–': '-', '’': "'", '‘': "'", '“': '"', '”': '"', 'é': 'e', 'è': 'e', 'ê': 'e', 'á': 'a', 'à': 'a', 'â': 'a', 'í': 'i', 'ó': 'o', 'ô': 'o', 'ñ': 'n', 'ú': 'u', 'ü': 'u', 'ç': 'c', '♠': 'S', '♣': 'C', '♦': 'D', '✓': 'v', 'ã': 'a', 'ō': 'o' };
G.fontSafe = function (s) { if (typeof s !== 'string') return s; let out = ''; for (const ch of s) out += G.FONT_SAFE[ch] || ch; return out; };
(function () {
  const f = E.font, wrap = (fn) => function (g, s, ...rest) { return fn.call(this, g, G.fontSafe(s), ...rest); };
  if (f.text && !f._aoa) { f.text = wrap(f.text); f._aoa = true; }
  if (f.title && !f._aoaT) { f.title = wrap(f.title); f._aoaT = true; }
  if (f.width && !f._aoaW) { const w0 = f.width; f.width = function (s, o) { return w0.call(this, G.fontSafe(s), o); }; f._aoaW = true; }
})();

/* A seeded stream per purpose: world (schedules, moods, weather, stock), match (AI rolls, cords), casino, cosmetic
 * (crowd, particles, voices: never changes state). Gameplay never calls Math.random. */
G._streams = {};
G.rng = function (stream) {
  if (!G._streams[stream]) {
    const base = (G.state && G.state.seed) || G.seedBase || 1;
    G._streams[stream] = E.rng(G.hash(stream + ':' + base));
  }
  return G._streams[stream]();
};
G.rngFn = function (stream) { return () => G.rng(stream); };
G.resetStreams = function (seed) {
  G.seedBase = seed >>> 0 || 1; G._streams = {};
};
G.hash = function (str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h >>> 0;
};
G.pickRng = function (stream, list) { return list[Math.floor(G.rng(stream) * list.length) % list.length]; };
G.rand = function (stream, a, b) { return a + (b - a) * G.rng(stream); };
G.chance = function (stream, p) { return G.rng(stream) < p; };

/* Event bus: point, touch, fault, matchEnd, gift, affinity, purchase, slotEnd, dayEnd, photo, story */
G.Bus = class {
  constructor() { this.h = {}; }
  on(name, fn) { (this.h[name] = this.h[name] || []).push(fn); return () => this.off(name, fn); }
  off(name, fn) { const a = this.h[name]; if (a) this.h[name] = a.filter(f => f !== fn); }
  emit(name, data) { const a = this.h[name]; if (a) for (const f of a.slice()) { try { f(data); } catch (e) { if (G.game) G.game.fail('bus ' + name, e); } } }
};
G.bus = new G.Bus();

G.fmtMoney = function (n) { n = Math.round(n || 0); const neg = n < 0; n = Math.abs(n); return (neg ? '-' : '') + 'S$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
G.fmtNum = function (n) { return String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); };
G.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
G.lerp = (a, b, t) => a + (b - a) * t;
G.wrapText = function (text, maxW, scale) {
  const s = scale || 1, out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const w of para.split(' ')) {
      const t = line ? line + ' ' + w : w;
      if (E.font.width(t, { scale: s }) > maxW && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
};
G.hitRect = (x, y, r) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;
G.sameItems = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
