// Gauntletdown: an original Gauntlet-style co-op dungeon crawler on the my-3D2dge engine.
// This file: the engine handle, the game object, the controls, the seeded random streams and the saved records.
const E = My3D2dge;
const SESSION = !!(typeof AIHub !== 'undefined' && AIHub.active);   // an AI Hub round: no title, the round's own card
const T = 16;                                   // one tile, in world units

// The controls: keyboard and mouse as a PC player expects, pads in the standard mapping. Each action's first code is the
// one a prompt shows for that device (Fire: Pad7 before Pad0, so a pad prompt says R2, not confirm's cross).
const GD_INPUT = Object.assign({}, E.Input.DEFAULT, {
  fire: ['Mouse0', 'Space', 'KeyJ', 'Pad7', 'Pad0'],
  magic: ['Mouse2', 'KeyQ', 'KeyK', 'Pad3', 'Pad5'],
  plant: ['ShiftLeft', 'ShiftRight', 'Pad6', 'Pad4']
});
delete GD_INPUT.attack; delete GD_INPUT.dash; delete GD_INPUT.skill; delete GD_INPUT.jump;

const game = new E.Game({
  canvas: 'screen', res: 'ps1', expand: true, view: 'threequarter', views: ['threequarter', 'topdown', 'iso'],
  input: GD_INPUT, id: 'gauntletdown', bg: '#07060d', menu: false
});

// Seeded streams: gameplay draws from SIM (repeatable runs and tests), cosmetic effects from Math.random.
function stream(seed) {
  let s = seed >>> 0;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// Saved records (E.store): settings the player picked, the high-score table, and the run's own flags.
const STORE = 'gauntletdown.';
const prefs = {
  glyphs: E.store.get(STORE + 'glyphs', 'playstation'),
  difficulty: E.store.get(STORE + 'difficulty', 'normal'),
  aim: E.store.get(STORE + 'aim', 'low'),
  tips: E.store.get(STORE + 'tips', true),
  voices: E.store.get(STORE + 'voices', true),
  cameraView: E.store.get(STORE + 'view', 'threequarter'),
  names: E.store.get(STORE + 'names', true)
};
function savePrefs() { for (const k in prefs) E.store.set(STORE + k, prefs[k]); }
function loadScores() { return E.store.get(STORE + 'scores', []); }
function saveScores(list) { E.store.set(STORE + 'scores', list); }

// Smallest and largest helpers the modules share.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
function angleDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }
