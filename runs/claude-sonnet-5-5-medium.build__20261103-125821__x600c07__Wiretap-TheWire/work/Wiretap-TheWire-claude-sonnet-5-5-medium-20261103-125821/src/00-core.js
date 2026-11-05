// 00-core: alias, rng streams, event bus, registries, save state, small helpers
const E = My3D2dge;
const { px, clamp, lerp, TAU } = E;
const STEM = 'Wiretap-TheWire-claude-sonnet-5-5-medium-20261103-125821';
const rng = { world: E.rng(7001), sim: E.rng(7002), cosmetic: E.rng(7003) };
const rnd = (stream = rng.sim) => stream();
const rpick = (list, stream = rng.sim) => list[Math.floor(stream() * list.length) % list.length];
const bus = (() => { const h = {}; return { on(k, f) { (h[k] = h[k] || []).push(f); }, off(k, f) { h[k] = (h[k] || []).filter(x => x !== f); }, emit(k, d) { (h[k] || []).slice().forEach(f => { try { f(d); } catch (e) { console.error(k, e); } }); } }; })();
const REG = {};
const def = (kind, id, spec) => ((REG[kind] = REG[kind] || {})[id] = spec);
const get = (kind, id) => (REG[kind] || {})[id];
const dist2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => '$' + Math.round(n).toLocaleString('en-US');

// the one save state (App. J, shortened): everything systems need to rebuild themselves
const freshState = () => ({
  ep: 1, beat: 0, film: 36, photos: [], board: {}, cipher: {}, wire: { logged: [], ids: {}, minimized: 0, bad: 0 },
  paper: { evidence: [], granted: false }, box: { done: false, name: null }, tips: {}, brass: 70, heat: 0, legal: 100, caseScore: 0,
  corner: { cash: 0, tees: 0 }, done: [], ending: null, stats: { photos: 0, madeCount: 0, arrests: 0, sales: 0, calls: 0 }
});
let STATE = freshState();
const resetState = () => { STATE = freshState(); return STATE; };
const SAVE_KEY = 'wiretap:state';
const saveState = () => { try { E.store.set(SAVE_KEY, JSON.stringify(STATE)); } catch (e) { /* storage blocked: kept for the visit */ } };
const loadState = () => { try { const s = E.store.get(SAVE_KEY, null); if (s) { STATE = Object.assign(freshState(), JSON.parse(s)); return true; } } catch (e) { /* ignore */ } return false; };
const tipOnce = (ui, id, title, text) => { if (STATE.tips[id]) return; STATE.tips[id] = 1; ui && ui.tutorial && ui.tutorial(title, text); };
// "Bleeped" language setting: a small word list becomes a dash
const BLEEP = /\b(fuck\w*|shit\w*|motherfuck\w*|bitch\w*)\b/gi;
const say = s => (game.settings && game.settings.language === 'bleeped') ? String(s).replace(BLEEP, '—') : String(s);
let ui = null;
