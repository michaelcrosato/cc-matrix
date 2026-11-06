import * as THREE from 'three/webgpu';
import { h } from '../ui/dom.js';
import { TUNING } from '../data/tuning.js';
import { tun, resetTuning, tuningJSON } from '../core/tuning.js';
import { EVENTS, TIER_NAMES } from '../data/events.js';
import { hasEvent } from '../events/index.js';
import { LINES, line } from '../data/dialogue.js';
import { TRACKS, STINGS } from '../audio/tracks.js';
import { PALETTE_ORDER } from '../data/palettes.js';
import { SPEAKERS } from '../ui/speech.js';
import { DAYS } from '../data/programme.js';
import { RAPIER } from '../physics/world.js';
import { blankInput } from '../input/input.js';

const ADD = (n) => n;
/** Dev Mode, from Pause. Pages of big controls by group, six to a page, usable by pad, keys and mouse. */
export function openDev(game) {
  const g = game;
  const groups = Object.keys(TUNING).reduce((a, k) => { (a[TUNING[k].group] = a[TUNING[k].group] || []).push(k); return a; }, {});
  const pages = [];
  const page = (title, items) => pages.push({ title, items });
  const ev = () => g.currentEvent;
  page('Run', [
    { label: 'God mode', get: () => (g.god ? 'On' : 'Off'), use: () => { g.god = !g.god; if (ev()) ev().god = g.god; } },
    { label: 'Time scale', slider: { min: 0.1, max: 4, step: 0.1, get: () => g.loop.timeScale, set: (v) => { g.loop.timeScale = v; } } },
    { label: 'Single step', use: () => { g.devStep = 1; g.ui.toast('One step.', 0.8); } },
    { label: 'Let the bot play', get: () => (ev() && ev().autoplay === 0 ? 'On' : 'Off'), use: () => { const e = ev(); if (!e) return; e.autoplay = e.autoplay === 0 ? undefined : 0; } },
    { label: 'Skip to Results', use: () => { if (g.mode && g.mode.skip) { closeAll(); g.mode.skip(); } else g.ui.toast('No class is running.'); } },
    { label: 'Skip to the Ending', use: () => { closeAll(); g.go(() => g.flow.toEnding()); } },
  ]);
  page('Jump', [
    { label: 'Event', choose: Object.keys(EVENTS).filter(hasEvent), state: 'evId', fmt: (id) => EVENTS[id].title },
    { label: 'Tier', choose: [0, 1, 2], state: 'tier', fmt: (t) => TIER_NAMES[t] },
    { label: 'Go to that class', use: () => { const id = g.devJump.evId, t = g.devJump.tier; closeAll(); g.go(() => g.flow.runClass(id, Math.min(t, EVENTS[id].tiers.length - 1), { programme: false })); } },
    { label: 'Day', choose: [1, 2, 3, 4, 5, 6], state: 'day', fmt: (d) => `Day ${d}` },
    { label: 'Jump to that day', use: () => { jumpDay(g, g.devJump.day); closeAll(); g.go(() => g.flow.toIsland({ morning: true })); } },
    { label: 'Next step', use: () => { const p = g.save.profile; if (p) { const n = g.programme.nextClass(); if (n) { p.today.done.push(n); if (p.today.day <= DAYS.length) p.stepsDone++; g.programme.syncIsland(); g.save.write(); g.ui.toast(`${EVENTS[n].title} marked done.`); } } } },
  ]);
  page('Look', [
    { label: 'Free camera', get: () => (g.rig.free ? 'On' : 'Off'), use: () => { g.rig.free = !g.rig.free; g.rig.freeYaw = 0; g.rig.freePitch = -0.2; } },
    { label: 'Physics debug lines', get: () => (g.devDebugLines ? 'On' : 'Off'), use: () => toggleDebugLines(g) },
    { label: 'Stats', get: () => (g.devStats ? 'On' : 'Off'), use: () => toggleStats(g) },
    { label: 'Input monitor', get: () => (g.devInput ? 'On' : 'Off'), use: () => toggleInputMon(g) },
    { label: 'Ink', get: () => (g.inkOff ? 'Off' : 'On'), use: () => { g.inkOff = !g.inkOff; g.applyInk(); } },
    { label: 'Palette', choose: PALETTE_ORDER, state: 'palette', fmt: (p) => p, onChange: (p) => g.palette.set(p, 0.5) },
  ]);
  page('Force', [
    { label: 'Force a gust', use: () => { const e = ev(); if (e && e.lanes[0] && e.lanes[0].bal) { const l = e.lanes[0]; l.devGust = 0.5; forceGust(g, l); g.ui.toast('Whoosh.'); } } },
    { label: 'Force a fall', use: () => { const e = ev(); if (e && e.forceFall) e.forceFall(0); } },
    { label: 'Force a fruit', use: () => { const e = ev(); if (e && e.launch) e.launch(e.lanes[0], 'fruit'); else g.ui.toast('Only in Fruit Hat.'); } },
    { label: 'Force a stone', use: () => { const e = ev(); if (e && e.dropStone) e.dropStone(e.lanes[0]); else g.ui.toast('Only in The Cairn.'); } },
    { label: 'Speaker', choose: Object.keys(LINES), state: 'who', fmt: (w) => (SPEAKERS[w] ? SPEAKERS[w].name : w) },
    { label: 'Play a line', use: () => { const w = g.devJump.who; const sits = Object.keys(LINES[w]); const s = sits[Math.floor(g.simTime * 7) % sits.length]; const t = line(w, s, { age: 40, prev: 50, n: 3, pose: 'The Quiet Regret', next: 'Poses', place: 'The Sun Deck' }); g.ui.toast(`${s}: ${t.slice(0, 54)}`); g.audio.say(SPEAKERS[w]?.voice || 'guest', t); } },
  ]);
  page('Hear and set', [
    { label: 'Track', choose: Object.keys(TRACKS), state: 'track', fmt: (x) => x },
    { label: 'Play that track', use: () => { if (g.audio.seq) { g.audio.seq.resume(); } g.audio.music(g.devJump.track); } },
    { label: 'Sting', choose: Object.keys(STINGS), state: 'sting', fmt: (x) => x },
    { label: 'Play that sting', use: () => g.audio.sting(g.devJump.sting) },
    { label: 'Set Wobble Age', slider: { min: 18, max: 99, step: 1, get: () => (g.save.profile && g.save.profile.today.age) || 60, set: (v) => { const p = g.save.profile; if (p) { p.today.age = v; if (p.ages.length) p.ages[p.ages.length - 1].age = v; else p.ages.push({ day: p.today.day, age: v }); g.save.write(); } } } },
    { label: 'Add 10 marbles', use: () => { const p = g.save.profile; if (p) { g.programme.addMarbles(10, 'pleasant'); g.save.write(); g.ui.toast(`${p.marbles} marbles.`); } } },
  ]);
  page('Save and tuning', [
    { label: 'Unlock all', use: () => { const p = g.save.profile; if (p) { p.allUnlocked = true; p.levelled = p.levelled; for (const id of Object.keys(EVENTS)) { p.seen[id] = true; p.tiers[id] = 2; } g.save.write(); g.ui.toast('Everything is open.'); } } },
    { label: 'Reset save', use: () => { g.save.reset(); g.programme.syncIsland(); closeAll(); g.flow.toTitle(); } },
    { label: 'Copy tuning as JSON', use: () => copyTuning(g) },
    { label: 'Reset tuning to defaults', use: () => { resetTuning(); g.applyInk(); g.programme.syncIsland(); renderPage(); g.ui.toast('Back to defaults.'); } },
  ]);
  for (const grp of Object.keys(groups)) {
    const keys = groups[grp];
    for (let i = 0; i < keys.length; i += 6) {
      const n = Math.floor(i / 6) + 1, many = keys.length > 6;
      page(`${grp} sliders${many ? ` ${n}` : ''}`, keys.slice(i, i + 6).map((k) => {
        const d = TUNING[k];
        return { label: d.label, tune: k, slider: { min: d.min, max: d.max, step: d.step, get: () => tun[k], set: (v) => { tun[k] = v; if (d.group === 'Ink') g.applyInk(); if (k === 'islandRest') g.programme.syncIsland(); } } };
      }));
    }
  }
  g.devJump = g.devJump || { evId: 'fruitHat', tier: 0, day: 1, palette: 'dawn', who: 'trudy', track: 'levelBest', sting: 'pleasant' };
  let scr = null;
  let renderPage = () => {};
  const closeAll = () => {
    while (g.ui.top && (g.ui.top.pauseLayer || g.ui.top.name === 'dev')) g.ui.close(g.ui.top);
    g.paused = false;
    if (g.audio.seq) g.audio.seq.resume();
  };
  scr = g.ui.open({
    name: 'dev', className: 'dim',
    prompts: [['use', 'Choose'], ['page', 'Pages'], ['back', 'Back']],
    back: () => g.ui.close(scr),
    build: (s) => {
      s.pauseLayer = true;
      const title = h('div.h2', { style: 'margin-top:2rem;font-size:4.6rem' }, 'Dev Mode');
      const panel = h('div.dev-panel');
      s.el.append(title, panel);
      const render = (pg) => {
        s.page = pg;
        panel.innerHTML = '';
        s.clearItems();
        const p = pages[pg];
        title.textContent = `Dev Mode: ${p.title}`;
        for (const it of p.items) {
          if (it.slider) {
            const fmt = (v) => (it.slider.step < 0.01 ? v.toFixed(4) : it.slider.step < 1 ? (+v).toFixed(2) : String(Math.round(v)));
            const el = g.ui.slider(s, it.label, it.slider.get, it.slider.set, { min: it.slider.min, max: it.slider.max, step: it.slider.step, format: fmt });
            if (it.tune) el.dataset.tune = it.tune;
            panel.append(el);
          } else if (it.choose) {
            const opts = it.choose.map((o) => [o, it.fmt(o)]);
            panel.append(g.ui.choice(s, it.label, opts, () => g.devJump[it.state], (v) => { g.devJump[it.state] = v; if (it.onChange) it.onChange(v); }));
          } else {
            const val = it.get ? h('span.val', it.get()) : null;
            const el = h('div.toggle', h('span', it.label), val);
            s.item(el, { use: () => { it.use(); if (val) val.textContent = it.get(); } });
            panel.append(el);
          }
        }
        s.setFocus(0, true);
      };
      renderPage = () => render(s.page);
      s.pager(pages.length, render);
      render(0);
    },
  });
  g.line && g.ui.toast(line('trudy', 'dev'), 3);
  return { ADD, THREE, RAPIER, blankInput };
}

function jumpDay(g, day) {
  const p = g.save.profile;
  if (!p) return;
  let steps = 0;
  for (let d = 1; d < Math.min(day, 6); d++) steps += DAYS[d - 1].classes.filter(hasEvent).length;
  p.stepsDone = steps;
  p.levelled = day > 5;
  p.tutorialDone = true;
  p.day = day;
  p.today = { day, checkin: false, age: null, done: [], question: false };
  for (let d = 1; d < Math.min(day, 6); d++) for (const id of DAYS[d - 1].classes) p.seen[id] = true;
  g.programme.syncIsland();
  g.phys.snapTilt();
  g.save.write();
}
function forceGust(g, lane) {
  const a = g.simTime * 3.1;
  const left = { v: 0.5 };
  const prev = g.afterFixed;
  g.afterFixed = (dt) => {
    if (prev) prev(dt);
    if (left.v > 0) { left.v -= dt; if (lane.bal) { lane.bal.extX += Math.cos(a) * 3 * 1; lane.bal.extZ += Math.sin(a) * 3 * 1; } } else g.afterFixed = prev;
  };
  g.audio.sfx('gust');
}
function copyTuning(g) {
  const json = tuningJSON();
  const show = () => {
    let scr = null;
    scr = g.ui.open({ name: 'tuningJSON', className: 'dim', back: () => g.ui.close(scr), prompts: [['back', 'Back']], build: (s) => { s.pauseLayer = true; s.el.append(h('div.bigtext.tag', json)); } });
  };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(json).then(() => g.ui.toast('Tuning copied.'), show);
    else show();
  } catch (e) { show(); }
}
function toggleStats(g) {
  g.devStats = !g.devStats;
  if (g.statsEl) { g.statsEl.remove(); g.statsEl = null; }
  if (g.devStats) { g.statsEl = h('div.stats', ''); document.getElementById('ui').append(g.statsEl); }
  installDevFrame(g);
}
function toggleInputMon(g) {
  g.devInput = !g.devInput;
  if (g.inputEl) { g.inputEl.remove(); g.inputEl = null; }
  if (g.devInput) { g.inputEl = h('div.stats', { style: 'top:auto;bottom:30rem' }, ''); document.getElementById('ui').append(g.inputEl); }
  installDevFrame(g);
}
function toggleDebugLines(g) {
  g.devDebugLines = !g.devDebugLines;
  if (!g.devDebugLines && g.debugMesh) { g.scene.remove(g.debugMesh); g.debugMesh = null; }
  if (g.devDebugLines && !g.debugMesh) {
    const geo = new THREE.BufferGeometry();
    g.debugMesh = new THREE.LineSegments(geo, new THREE.LineBasicNodeMaterial({ vertexColors: true }));
    g.debugMesh.frustumCulled = false;
    g.scene.add(g.debugMesh);
  }
  installDevFrame(g);
}
function installDevFrame(g) {
  g.devFrame = (dt) => {
    if (g.statsEl) {
      const ev = g.currentEvent;
      const t0 = performance.now();
      const bodies = ev && ev.world ? ev.world.bodies.len() : g.phys.world.bodies.len();
      const draws = g.renderer && g.renderer.info ? g.renderer.info.render.drawCalls : 0;
      g.statsEl.textContent = `fps ${g.loop.fps.toFixed(0)}  step ${(performance.now() - t0).toFixed(1)} ms\nbodies ${bodies}  draws ${draws}\nbackend ${g.backend}`;
    }
    if (g.inputEl) {
      const i = g.input, p = i.pads[i.activePad];
      g.inputEl.textContent = `last ${i.lastDevice}\nL ${p.axes[0].toFixed(2)},${p.axes[1].toFixed(2)}  R ${p.axes[2].toFixed(2)},${p.axes[3].toFixed(2)}\nL2 ${p.val[6].toFixed(2)}  R2 ${p.val[7].toFixed(2)}`;
    }
    if (g.debugMesh) {
      const w = (g.currentEvent && g.currentEvent.world) || g.phys.world;
      const b = w.debugRender();
      const geo = g.debugMesh.geometry;
      geo.setAttribute('position', new THREE.BufferAttribute(b.vertices.slice(), 3));
      geo.setAttribute('color', new THREE.BufferAttribute(b.colors.slice(), 4));
      const ev = g.currentEvent;
      if (ev) g.debugMesh.position.copy(ev.group.position); else g.debugMesh.position.set(0, 0, 0);
    }
    if (g.rig.free) {
      const i = g.input, p = i.pads[i.activePad];
      const dev = i.lastDevice === 'pad';
      g.rig.freeMove(dt, dev ? p.axes[0] : (i.keyX || 0), dev ? p.axes[1] : (i.keyZ || 0), dev ? p.axes[2] : i.dragX * 0.3, dev ? p.axes[3] : i.dragY * 0.3);
    }
  };
}
