const E = My3D2dge, { px, clamp, lerp } = E;
const ROOT = typeof window === 'undefined' ? globalThis : window;
const HAS_DOM = typeof document !== 'undefined';
const TITLE = 'Diabellum', VERSION = '1.0.0';
const SESSION = !!(ROOT.AIHub && ROOT.AIHub.active);
const DB = Object.create(null);
function def(kind, id, spec) { (DB[kind] ||= {})[id] = { id, ...spec }; }
const BUS = { listeners: {}, on(k, f) { (this.listeners[k] ||= []).push(f); }, emit(k, v) { for (const f of this.listeners[k] || []) f(v); } };
const hash = s => { let n = 2166136261; for (const c of String(s)) n = Math.imul(n ^ c.charCodeAt(0), 16777619); return n >>> 0; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angle = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const adiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const norm = (x, y) => { const m = Math.hypot(x, y); return m > .001 ? [x / m, y / m] : [0, 0]; };
const choose = (r, a) => a[Math.floor(r() * a.length)];
const clone = x => JSON.parse(JSON.stringify(x));
const COLORS = ['#e8a96d', '#79b6df', '#87c9a1', '#d8b0db'];
const INK = '#090e16', PANEL = '#111c25', GOLD = '#d9b77c', IVORY = '#f0e4cb', MUTED = '#8fa3a4', TEAL = '#77c9bd';
const PLAY = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  start: ['Enter', 'Pad9'], pause: ['Escape', 'Pad9'], confirm: ['Enter', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1'],
  s0: ['Mouse0', 'KeyF', 'Pad0'], s1: ['Mouse2', 'KeyG', 'Pad2'], s2: ['Digit1', 'Pad3'], s3: ['Digit2', 'Pad1'], s4: ['Digit3', 'Pad5'], s5: ['Digit4', 'Pad7'],
  evade: ['Space', 'Pad11'], potion: ['KeyQ', 'Pad4'], interact: ['KeyE', 'Pad6'], portal: ['KeyT', 'Pad12'],
  map: ['KeyM', 'Tab', 'Pad13'], inventory: ['KeyI', 'KeyC', 'Pad14'], skills: ['KeyK', 'Pad15'], journal: ['KeyJ', ...(SESSION ? [] : ['Pad8'])],
  pagePrev:['PageUp','WheelUp'],pageNext:['PageDown','WheelDown'],stand: ['ShiftLeft', 'ShiftRight'], labels: ['AltLeft'], prev: ['BracketLeft', 'Pad4'], next: ['BracketRight', 'Pad5'],
  aimU: ['PadRAxisUp'], aimD: ['PadRAxisDown'], aimL: ['PadRAxisLeft'], aimR: ['PadRAxisRight']
};
const MENU = { ...PLAY, up: [...PLAY.up, 'Pad12'], down: [...PLAY.down, 'Pad13'], left: [...PLAY.left, 'Pad14'], right: [...PLAY.right, 'Pad15'] };
const TUNING = [
 ['Hero', 'damage', 'Damage', 1, .25, 4, .05], ['Hero', 'life', 'Life', 1, .25, 4, .05], ['Hero', 'speed', 'Move speed', 1, .5, 2, .05],
 ['Hero', 'attackSpeed', 'Attack speed', 1, .5, 2, .05], ['Hero', 'cooldowns', 'Cooldowns', 1, 0, 2, .05], ['Hero', 'resource', 'Resource gain', 1, .25, 4, .05],
 ['Hero', 'evadeRecharge', 'Evade recharge', 5, 1, 12, .5], ['Hero', 'potionCD', 'Potion cooldown', 20, 2, 60, 1], ['Hero', 'votiveChance', 'Votive chance', .14, 0, 1, .02],
 ['Monsters', 'foeLife', 'Monster life', 1, .25, 6, .05], ['Monsters', 'foeDamage', 'Monster damage', 1, .25, 6, .05], ['Monsters', 'foeSpeed', 'Monster speed', 1, .5, 2, .05],
 ['Monsters', 'density', 'Crowd density', 1, .25, 4, .25], ['Monsters', 'elites', 'Elite frequency', 1, 0, 4, .25], ['Monsters', 'telegraph', 'Telegraph time', 1, .5, 2, .05], ['Monsters', 'coopLife', 'Co-op life per hero', .75, 0, 2, .05],
 ['Rewards', 'xp', 'Experience', 1, 0, 10, .25], ['Rewards', 'pennies', 'Pennies', 1, 0, 10, .25], ['Rewards', 'drops', 'Item drops', 1, 0, 10, .25],
 ['Rewards', 'relicChance', 'Relic chance', 1, 0, 50, 1], ['Rewards', 'vigilFill', 'Reckoning fill', 1, .25, 4, .25],
 ['Feel', 'hitstop', 'Hit-stop', 1, 0, 3, .1], ['Feel', 'launch', 'Knockback and launch', 1, 0, 3, .1], ['Feel', 'shake', 'Screen shake', 1, 0, 3, .1],
 ['Feel', 'assist', 'Aim assist', 1, 0, 2, .1], ['Feel', 'requiem', 'Requiem window', 1.6, .5, 4, .1]
];
const DEFAULTS = Object.fromEntries(TUNING.map(s => [s[1], s[3]]));
const TUNE = { ...DEFAULTS, ...(!SESSION ? E.store.get('diabellum-tuning', {}) : {}) };
const CHEATS = { god: false, oneHit: false, infinite: false, noCD: false, noClip: false, freezeAI: false, reveal: false, bot: false, overlays: false, step: false, stop: false };
let W = null, PANEL_STATE = null, net = null, titleIdle = 0, lastActivity = 0, attract = false, attractClock = 0, attractIndex = 0;
let game, shell, talk, viewRigs = new Map(), currentHover = null, lastHitStop = -1, frontFocus = 0, selectedHero = 0, prologuePage = 0;
let externalInput = false;
const RESUME_GUARDS=new Map();
function saveTune() { if (!SESSION) E.store.set('diabellum-tuning', TUNE); }
function isTuned() { return Object.keys(DEFAULTS).some(k => Math.abs(TUNE[k] - DEFAULTS[k]) > .0001); }
function resetTune(group) { for (const s of TUNING) if (!group || s[0] === group) TUNE[s[1]] = s[3]; saveTune(); }
function event(w, kind, data = {}) { const e = { ...data, ...(data.kind ? {kindName:data.kind} : {}), kind, t: w.time }; w.events.push(e); if (w === W) onWorldEvent(e); BUS.emit(kind, { w, ...data }); return e; }
function toast(text, color = GOLD) { if (W) { W.toasts.push({ text, color, t: 3.6 }); if (W.toasts.length > 4) W.toasts.shift(); } }
function say(text, speaker = 'Mother Quillon', duration = 5) {
  if (!W) return; W.dialogue = { text, speaker, t: duration }; if (audio) audio.speak(speaker, text);
  if(talk&&game&&game.sceneName==='play'&&!attract&&!PANEL_STATE)talk.say(text,{name:speaker,portrait:speaker==='Mother Quillon'?(g,x,y,size)=>lanternArt(g,x+size/2,y+size*.73,size/25,Math.sin(game.real*17)*.5+.5):null,auto:duration,modal:false,y:Math.max(57,game.H-156),voice:false});
}
function prompt(action, input = game.input) { return input.label(action); }
function getMain(w = W) { return w && (w.heroes.find(h => h.id === w.me) || w.heroes[0]); }
