/* THE SOPRANO DIET - core: engine handles, settings shims, state, helpers */
(() => {
const E = My3D2dge, { px, clamp, lerp } = E;
const G = window.SD = {};              // shared namespace between modules
G.E = E;
G.TITLE = 'The Soprano Diet';
G.HUB = !!(window.AIHub && window.AIHub.active);
G.touchOnly = (() => {
  try {
    const coarse = matchMedia('(pointer:coarse)').matches, fine = matchMedia('(any-pointer:fine)').matches;
    return coarse && !fine;
  } catch (e) { return false; }
})();

/* a small seeded generator for layouts (keeps maps identical every run) */
G.rng = seed => { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
G.hash = (x, y) => { let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; };

/* ---- gamepad axis inversion (the "intermittently inverted stick" quick fix) -------------------------------------- */
G.INV = { x: false, y: false };
if (navigator.getGamepads) {
  const orig = navigator.getGamepads.bind(navigator);
  navigator.getGamepads = function () {
    const pads = orig();
    if (!G.INV.x && !G.INV.y) return pads;
    return Array.from(pads, p => {
      if (!p) return p;
      return new Proxy(p, { get(t, k) {
        if (k === 'axes') { const a = Array.from(t.axes); if (G.INV.x) { a[0] = -a[0]; a[2] = -a[2]; } if (G.INV.y) { a[1] = -a[1]; a[3] = -a[3]; } return a; }
        const v = t[k]; return typeof v === 'function' ? v.bind(t) : v;
      } });
    });
  };
}

/* ---- input layout: PlayStation first, keyboard and mouse as native as the genre allows ------------------------- */
const PRESET = Object.assign({}, E.Input.DEFAULT, {
  attack: ['KeyJ', 'Mouse0', 'Pad2'],
  dash: ['Space', 'ShiftLeft', 'Pad1'],
  skill: ['KeyQ', 'Mouse2', 'Pad3'],
  interact: ['KeyE', 'KeyF', 'Pad0'],
  eat: ['KeyR', 'Pad4'],
  next: ['KeyT', 'Pad5'],
  view: ['KeyV', 'Pad11']
});
delete PRESET.jump;

const game = new E.Game({
  canvas: 'screen', res: 'wide', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'], input: PRESET,
  menu: {
    settings: [
      { key: 'xbox', label: 'Xbox button symbols (A B X Y)', value: false },
      { key: 'invX', label: 'Invert stick horizontal', value: false },
      { key: 'invY', label: 'Invert stick vertical', value: false }
    ],
    controls: { next: 'Next food', attack: 'Punch', dash: 'Dodge', skill: 'The Look', interact: 'Interact', eat: 'Eat', view: 'Camera', confirm: false, cancel: false },
    quit: G.HUB ? false : 'title',
    saves: !G.HUB
  }
});
G.game = game;

/* ---- player state ----------------------------------------------------------------------------------------------- */
G.RANKS = ['Nobody', 'Associate', 'Soldier', 'Capo', 'Underboss', 'Boss'];
G.RANK_AT = [0, 25, 70, 140, 240, 380];
G.fresh = () => ({
  chap: 0, area: 'yard', cash: 0, respect: 0, hp: 100, stress: 18, gut: 38, bag: { capicola: 1, salad: 0, cannoli: 0 },
  flags: {}, done: {}, kills: 0, ducks: 0, insight: 0, perks: [], panics: 0, eaten: 0, refused: 0, time: 0, menace: 0, score: 0
});
G.S = G.fresh();
G.rank = () => { let r = 0; for (let i = 0; i < G.RANK_AT.length; i++) if (G.S.respect >= G.RANK_AT[i]) r = i; return r; };
G.maxHp = () => 100 + G.rank() * 14 + (G.S.perks.includes('thick') ? 20 : 0);
G.panicAt = () => 100 + (G.S.perks.includes('breath') ? 0 : 0);

/* ---- settings -> engine ----------------------------------------------------------------------------------------- */
G.applySettings = () => {
  const st = game.settings || {};
  G.INV.x = !!st.invX; G.INV.y = !!st.invY;
  game.input.glyphs = st.xbox ? 'xbox' : 'playstation';
  if (G.touchOnly) game.input.touchEnabled = false;
};

/* ---- little utilities ------------------------------------------------------------------------------------------- */
G.T = 16;
G.P = (tx, ty) => [tx * 16 + 8, ty * 16 + 8];
G.say = (...a) => a;
G.fmt = n => '$' + Math.round(n).toLocaleString('en-US');
G.fx = { shake: 0 };
})();
