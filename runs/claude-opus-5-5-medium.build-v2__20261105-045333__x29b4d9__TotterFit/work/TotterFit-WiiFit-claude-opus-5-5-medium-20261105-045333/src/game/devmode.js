// Dev Mode: pages of big controls, reachable from Pause, off in a session.
import * as THREE from 'three/webgpu';
import { el, txt } from '../ui/ui.js';
import { T, resetTuning, tuningGroups, tuningJSON } from '../core/tuning.js';
import { TUNING } from '../data/tuning.js';
import { EVENTS, FREE_ORDER } from '../data/events.js';
import { TRACKS, STINGS } from '../audio/tracks.js';
import { D } from '../data/dialogue.js';
import { PALETTE_ORDER } from '../data/palettes.js';
import { setPalette } from '../render/palette.js';
import { R } from '../render/renderer.js';
import { UNLOCKS, START_PAINTS } from '../data/unlocks.js';
import { DAYS } from '../data/programme.js';
import { wipeSave } from '../core/save.js';
const SCALES = [.1, .25, .5, 1, 2, 4];
export function openDev(g) {
  const ui = g.ui; if (g.session) return;
  const groups = tuningGroups(); const pagesDef = [];
  pagesDef.push({ t: 'Jump', build: (c) => { c.append(ui.btn('Jump to a class', () => openList(g, 'Class', FREE_ORDER.filter(i => EVENTS[i]).map(id => [EVENTS[id].title, () => openTierJump(g, id)]))), ui.btn('Jump to a day', () => openList(g, 'Day', DAYS.map(d => [`Day ${d.day}: ${d.name}`, () => jumpDay(g, d.day)]).concat([['Day 6: Maintenance', () => jumpDay(g, 6)]]))), ui.btn('Skip to Results', () => { closeDev(g); g.mode?.event?.forceFinish(); }), ui.btn('Skip to the Ending', () => { closeDev(g); jumpEnding(g); }), ui.toggle('God mode (no falls)', () => g.god, (v) => { g.god = v; const ev = g.mode?.event; if (ev) { ev.god = v; for (const l of ev.lanes) if (l.bal) l.bal.mods.ankle = ev.diff.ankle * (v ? 3 : 1); } }), ui.toggle('Let the bot play', () => !!g.devBot, (v) => setBot(g, v))); } });
  pagesDef.push({ t: 'Time and view', build: (c) => { c.append(ui.choice('Time scale', SCALES.map(s => [s, `${s}x`]), () => g.loop.timeScale, (v) => { g.loop.timeScale = v; }), ui.btn('Single step', () => { g.simPaused = false; g.fixed(1 / 120); g.frame(1 / 120); g.simPaused = true; }), ui.toggle('Free camera', () => g.rig.free, (v) => { g.rig.free = v; g.freeCam = v; g.rig.freeYaw = 0; g.rig.freePitch = -.3; }), ui.toggle('Physics lines', () => !!g.debugLines, (v) => setDebug(g, v)), ui.toggle('Stats', () => !!g.statsEl, (v) => setStats(g, v)), ui.toggle('Input monitor', () => !!g.inputEl, (v) => setInput(g, v))); } });
  pagesDef.push({ t: 'Force', build: (c) => { const ev = () => g.mode?.event; c.append(ui.btn('Force a gust', () => { ev()?.forceGust(3); }), ui.btn('Force a fall', () => { ev()?.forceFall(); }), ui.btn('Force a fruit or stone', () => { ev()?.forceThing(); }), ui.choice('Play a line', ['trudy', 'stillwater', 'bolster'].flatMap(w => Object.keys(D[w]).map(k => [`${w}.${k}`, `${w}: ${k}`])), () => g.devLine || 'trudy.arrival', (v) => { g.devLine = v; const [w, k] = v.split('.'); g.speech.clear(); g.barkNow(w, k, { age: 50, prev: 60, diff: 10, pose: 'The Apologetic Pine' }); }), ui.choice('Play music', Object.keys(TRACKS).map(k => [k, k]), () => g.audio.seq.name, (v) => g.audio.playTrack(v)), ui.choice('Play a sting', Object.keys(STINGS).map(k => [k, k]), () => g.devSting || 'fanfare', (v) => { g.devSting = v; g.audio.sting(v); })); } });
  pagesDef.push({ t: 'Save', build: (c) => { const P = () => g.profile; c.append(ui.slider('Set Wobble Age', () => P()?.ages.at(-1) ?? 50, (v) => { if (P()) { P().ages.push(v); P().ages = P().ages.slice(-30); } }, 18, 99, 1), ui.btn('Add 10 marbles', () => { if (P()) { for (let i = 0; i < 10; i++) P().marbleList.push('#F5B700'); P().marbles += 10; g.island.setMarbles(P().marbleList); g.persist(); } }), ui.btn('Unlock all', () => { if (P()) { P().marbles = Math.max(P().marbles, 60); P().allOpen = true; P().levelled = true; P().met = Object.keys(EVENTS); g.persist(); ui.toast('Everything is open.'); } }), ui.toggle('Ink', () => R.inkOn, (v) => { R.inkOn = v; if (R.ink) R.ink.u.on.value = v ? 1 : 0; }), ui.choice('Palette', PALETTE_ORDER.map(k => [k, k]), () => g.devPal || 'noon', (v) => { g.devPal = v; setPalette(v, true); }), ui.btn('Reset save', () => { const s = wipeSave(); g.save = s; s.settings = g.settings; ui.toast('Save erased.'); })); } });
  for (const name in groups) { const keys = groups[name]; for (let i = 0; i < keys.length; i += 5) { const chunk = keys.slice(i, i + 5); pagesDef.push({ t: `${name} sliders`, build: (c) => { for (const k of chunk) { const d = TUNING[k]; c.appendChild(ui.slider(d.label, () => T[k], (v) => { T[k] = v; }, d.min, d.max, d.step, (v) => (+v.toFixed(4)).toString())); } c.appendChild(ui.btn('Reset to Defaults', () => { resetTuning(); ui.top().rebuild(); })); } }); } }
  pagesDef.push({ t: 'Copy tuning', build: (c) => { c.append(ui.btn('Copy tuning as JSON', () => { const j = tuningJSON(); const show = () => { g.ui.open('devtext', (e) => { e.classList.add('dim'); const d = txt('div', 'devtext', j.replace(/\n/g, ' ')); e.appendChild(d); e.appendChild(el('div', 'grow')); e.appendChild(g.ui.bottom([['back', 'Back']])); }, { onBack: () => g.ui.close() }); }; const cb = navigator.clipboard; if (cb && cb.writeText) cb.writeText(j).then(() => g.ui.toast('Copied.'), show); else show(); })); } });
  let page = 0;
  ui.open('dev', (e, layer) => {
    e.classList.add('dim'); const P = pagesDef[page]; e.appendChild(txt('div', 'title-h', `Dev: ${P.t}`)); const c = el('div', 'col'); P.build(c); e.appendChild(c); e.appendChild(el('div', 'grow'));
    const row = el('div', 'row'); row.append(ui.btn('‹', () => { page = (page - 1 + pagesDef.length) % pagesDef.length; layer.rebuild(false); }, { cls: 'small' }), txt('div', 'gaugeTag', `Page ${page + 1} of ${pagesDef.length}`), ui.btn('›', () => { page = (page + 1) % pagesDef.length; layer.rebuild(false); }, { cls: 'small' })); e.appendChild(row); e.appendChild(ui.bottom([['move', 'Move and adjust'], ['back', 'Back']]));
  }, { onBack: () => ui.close() });
}
function closeDev(g) { g.ui.closeAll(); g.simPaused = false; }
function openList(g, title, items) {
  const ui = g.ui; let page = 0, per = 6; const pages = Math.ceil(items.length / per);
  ui.open('devlist', (e, layer) => { e.classList.add('dim'); e.appendChild(txt('div', 'title-h', title)); const c = el('div', 'col'); for (const [label, act] of items.slice(page * per, page * per + per)) c.appendChild(ui.btn(label, act)); e.appendChild(c); e.appendChild(el('div', 'grow')); if (pages > 1) { const r = el('div', 'row'); r.append(ui.btn('‹', () => { page = (page - 1 + pages) % pages; layer.rebuild(false); }, { cls: 'small' }), txt('div', 'gaugeTag', `Page ${page + 1} of ${pages}`), ui.btn('›', () => { page = (page + 1) % pages; layer.rebuild(false); }, { cls: 'small' })); e.appendChild(r); } e.appendChild(ui.bottom([['use', 'Choose'], ['back', 'Back']])); }, { onBack: () => ui.close() });
}
function openTierJump(g, id) { const tiers = EVENTS[id].tiers.length; openList(g, EVENTS[id].title, Array.from({ length: tiers }, (_, t) => [['Gentle', 'Honest', 'Unreasonable'][t], () => { closeDev(g); g.scripts.killTag('flow'); ensureProfile(g); g.clearMode(); g.playClass(id, { kind: 'free', tier: t }); }])); }
function ensureProfile(g) { if (!g.profile) { const i = g.save.profiles.findIndex(p => p); if (i >= 0) g.save.current = i; else { g.save.profiles[0] = g.freshProfile('Dev Guest', START_PAINTS[0]); g.save.current = 0; } } }
function jumpDay(g, d) { closeDev(g); ensureProfile(g); const p = g.profile; p.day = d; p.doneToday = []; p.checkinDone = false; p.planShown = false; p.tutorial = true; let s = 0; for (let i = 1; i < d && i <= DAYS.length; i++) s += 1 + DAYS[i - 1].classes.length; p.steps = s; g.scripts.killTag('flow'); g.enterProgramme(); }
function jumpEnding(g) { ensureProfile(g); const p = g.profile; p.day = 5; g.scripts.killTag('flow'); g.clearMode(); g.startHub(); g.scripts.run(g.ending(), 'flow'); void p; }
function setBot(g, v) { g.devBot = v; g.testBotSkill = v ? 'sharp' : null; if (v) { // A pad the bot can press, through the real input path.
    if (!window.__pads) { window.__pads = [{ connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), vibrationActuator: { playEffect() {} } }]; if (!g.realPads) { g.realPads = navigator.getGamepads?.bind(navigator); try { navigator.getGamepads = () => window.__pads; } catch { g.errors.push('no pad override'); } } } }
  g.input.setDevice(v ? 'pad' : 'kbm'); g.input.lastPad = 0; }
function setDebug(g, v) { if (!v) { g.debugLines?.removeFromParent(); g.debugLines = null; g.devFrame = devTick(g); return; } const geo = new THREE.BufferGeometry(); const m = new THREE.LineBasicNodeMaterial({ color: 0xff2288 }); g.debugLines = new THREE.LineSegments(geo, m); g.debugLines.frustumCulled = false; g.scene.add(g.debugLines); g.devFrame = devTick(g); }
function setStats(g, v) { if (!v) { g.statsEl?.remove(); g.statsEl = null; } else { g.statsEl = txt('div', 'gaugeTag', ''); g.statsEl.style.cssText = 'position:fixed;left:2vw;top:2vh;z-index:9'; document.body.appendChild(g.statsEl); } g.devFrame = devTick(g); }
function setInput(g, v) { if (!v) { g.inputEl?.remove(); g.inputEl = null; } else { g.inputEl = txt('div', 'gaugeTag', ''); g.inputEl.style.cssText = 'position:fixed;left:2vw;top:9vh;z-index:9'; document.body.appendChild(g.inputEl); } g.devFrame = devTick(g); }
function devTick(g) {
  return (dt) => {
    const w = g.mode?.event?.world || g.mode?.world;
    if (g.debugLines && w) { const b = w.debugRender(); g.debugLines.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(b.vertices), 3)); const par = g.mode?.event?.group?.parent; g.debugLines.position.copy(par && par !== g.scene ? par.position : new THREE.Vector3()); }
    if (g.statsEl) { const inf = R.renderer?.info?.render; let bodies = w ? w.bodies.len() : 0; g.statsEl.textContent = `fps ${g.fps.toFixed(0)} · step ${g.stepMs.toFixed(2)} ms · bodies ${bodies} · draws ${inf?.drawCalls ?? 0}`; }
    if (g.inputEl) { const m = g.input.merged; g.inputEl.textContent = `L ${m.x.toFixed(2)} ${m.z.toFixed(2)}  R ${m.lookX.toFixed(2)} ${m.lookY.toFixed(2)}  T ${m.lf.toFixed(2)} ${m.rf.toFixed(2)}  ${g.input.lastDevice}`; }
    if (g.rig.free) { const m = g.input.merged, c = g.input.kbm; g.rig.freeYaw -= m.lookX; g.rig.freePitch = Math.max(-1.4, Math.min(1.4, g.rig.freePitch - m.lookY)); const f = new THREE.Vector3(-Math.sin(g.rig.freeYaw) * -m.z * -1, 0, 0); void c; f.set(m.moveX, 0, m.moveZ).applyAxisAngle(new THREE.Vector3(0, 1, 0), g.rig.freeYaw).multiplyScalar(dt * 12); g.rig.pos.add(f); g.rig.wantPos.copy(g.rig.pos); }
  };
}
