import { h } from '../ui/dom.js';
import { promptHTML } from '../input/glyphs.js';
import { TITLE, TAGLINE, RESORT, SEAT_COLOURS } from '../data/config.js';
import { FIRST, LAST } from '../data/names.js';
import { PAINTS, paintColour, Doll } from '../art/doll.js';
import { EVENTS, TIER_NAMES, DISCIPLINE_ORDER } from '../data/events.js';
import { hasEvent } from '../events/index.js';
import { EventRun } from './eventRun.js';
import { Hub } from './hub.js';
import { Attract } from './attract.js';
import { openSettings } from '../ui/screens/settings.js';
import { openAbout } from '../ui/screens/about.js';
import { openJournal } from '../ui/screens/journal.js';
import { openPause, installPause } from '../ui/screens/pause.js';
import { openDev } from './devmode.js';
import { GroupClass } from './groupclass.js';
import { CheckInMode } from './checkin.js';
import { JarMode } from './jar.js';
import { EndingMode } from './ending.js';
import { showResults } from './results.js';
import { cos, cosPick } from '../core/rng.js';
import { STARTER_PAINTS } from '../data/unlocks.js';

/** The island sits in the frame, doing nothing in particular. */
class IslandBackdrop {
  constructor(game, name) { this.game = game; this.name = name; this.t = 0; }
  enter() {
    const g = this.game;
    g.setIsland('home');
    g.palette.set('dawn', 0.5);
    g.programme.syncIsland();
    this.shot(true);
    g.audio.music('levelBest');
  }
  shot(snap) { this.game.rig.shot(9, 9, 52, 0, 0.5, -2, { fov: 38, snap, rate: 1 }); }
  fixed(dt) {
    const g = this.game;
    this.t += dt;
    g.stepIsland(dt, 0);
    const topName = g.ui.top ? g.ui.top.name : '';
    if (g.input.idle >= 10 && !g.wiping && (topName === 'title' || topName === 'menu')) g.attractStart();
    this.checkTouchState();
  }
  checkTouchState() {
    const g = this.game;
    if (g.touchOnly && (g.input.anyPadSeen || g.input.pressed.size > 0)) {
      g.touchOnly = false;
      if (this.onTouchCleared) this.onTouchCleared();
    }
  }
  frame(dt) {
    const g = this.game;
    g.syncIsland(dt);
    const a = this.t * 0.03;
    g.rig.shot(9 + Math.sin(a) * 6, 9 + Math.sin(a * 0.7) * 1.2, 52, 0, 0.5, -2, { fov: 38, rate: 1 });
    if (this.update) this.update(dt);
  }
}

export function isTouchOnly() {
  try { return matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches; } catch (e) { return false; }
}

export function runStandalone(game) {
  installFlow(game);
  game.touchOnly = isTouchOnly();
  toTitle(game);
}

function installFlow(game) {
  installPause(game);
  game.flow = {
    toTitle: () => toTitle(game), toMenu: () => toMenu(game), startProgramme: () => startProgramme(game), toFreePlay: () => toFreePlay(game),
    toIsland: (o) => toIsland(game, o), runClass: (id, tier, o) => runClass(game, id, tier, o), toJar: (o) => toJar(game, o), toCheckIn: () => toCheckIn(game), toEnding: () => toEnding(game), toGroup: () => toGroup(game),
    leaveClass: () => leaveClass(game),
  };
  game.attractStart = () => {
    if (game.attract || game.inSession) return;
    game.ui.clear();
    game.setMode(new Attract(game), 'attract');
  };
}

function toTitle(game) {
  game.attract = false;
  game.input.idle = 0;
  game.paused = false;
  const b = new IslandBackdrop(game, 'title');
  game.setMode(b, 'title');
  game.ui.only({
    name: 'title',
    build(s) {
      const beam = h('div.title-beam');
      TITLE.split('').forEach((c) => { const sp = h('span', c === ' ' ? ' ' : c); beam.append(sp); });
      s.el.append(beam);
      s.el.append(h('div.title-sub', `${RESORT} · ${TAGLINE}`));
      const press = h('div.press.tag');
      const note = h('div.touch-note.tag', 'Controller or keyboard required');
      let settingsBtn = null;
      const renderPress = () => {
        const g = promptHTML('use', '', game.input.lastDevice, game.save.settings.glyphs);
        press.innerHTML = `Press ${g}`;
      };
      const build = () => {
        press.remove(); note.remove();
        s.clearItems();
        if (settingsBtn) { settingsBtn.remove(); settingsBtn = null; }
        if (game.touchOnly) {
          s.el.append(note);
          settingsBtn = s.item(h('div', { style: 'position:absolute;bottom:10rem;left:50%;margin-left:-15rem;width:30rem' }, 'Settings'), { use: () => openSettings(game) });
          s.el.append(settingsBtn);
          s.setFocus(0, true);
        } else {
          s.el.append(press);
          renderPress();
        }
      };
      build();
      b.onTouchCleared = build;
      s.onDevice = () => { if (!game.touchOnly) renderPress(); };
      game.ui.deviceListeners.add(s.onDevice);
      s.def.onClose = () => game.ui.deviceListeners.delete(s.onDevice);
      const letters = [...beam.children];
      let last = 0;
      b.update = () => {
        last += 1 / 60;
        const tilt = game.phys.tx * 57.3;
        beam.style.transform = `translateX(-50%) rotate(${tilt.toFixed(2)}deg)`;
        letters.forEach((l, i) => { const off = (tilt * 0.8 + Math.sin(last * 0.7 + i * 0.5)) * 0.4; l.style.transform = `translateX(${off.toFixed(2)}rem) rotate(${(tilt * 0.3 + Math.sin(last + i)).toFixed(2)}deg)`; });
      };
      press.addEventListener('click', () => { if (!game.touchOnly) game.input.clickQueue.push(() => { game.audio.sfx('uiConfirm'); game.go(() => toMenu(game)); }); });
      press.style.pointerEvents = 'auto';
      s.def.onConfirmAny = true;
    },
  });
  game.titleWait = game.scripts.run((function* wait() {
    yield () => game.modeName !== 'title' || (!game.touchOnly && game.input.verb('confirm') && game.ui.top && game.ui.top.name === 'title');
    if (game.modeName === 'title') { game.audio.sfx('uiConfirm'); game.go(() => toMenu(game)); }
  })());
}

function toMenu(game) {
  game.attract = false;
  game.input.idle = 0;
  if (game.modeName !== 'menu') {
    const b = new IslandBackdrop(game, 'menu');
    game.setMode(b, 'menu');
  }
  const p = game.save.profile;
  const label = p && (p.tutorialDone || p.stepsDone) ? 'Continue' : 'Programme';
  game.ui.only({
    name: 'menu',
    prompts: [['use', 'Choose'], ['back', 'Title']],
    back: () => game.go(() => toTitle(game)),
    build(s) {
      s.el.append(h('div.h2', { style: 'margin-top:5rem' }, TITLE));
      const col = h('div.col', { style: 'margin-top:2rem' });
      s.el.append(col);
      const add = (text, use) => col.append(s.item(h('div', text), { use }));
      add(label, () => openWho(game));
      add('Group Class', () => game.go(() => toGroup(game)));
      add('Free Play', () => openFreePlay(game));
      add('Journal', () => openJournal(game));
      add('Settings', () => openSettings(game));
      add('About / Credits', () => openAbout(game));
    },
  });
}

// ---- Who's here? ----
function openWho(game) {
  const d = game.save.data;
  game.ui.only({
    name: 'who',
    prompts: [['use', 'Choose'], ['back', 'Back']],
    back: () => toMenu(game),
    build(s) {
      s.el.append(h('div.h1', { style: 'margin-top:4rem' }, "Who's here today?"));
      const row = h('div.mats', { style: 'margin-top:6rem' });
      s.el.append(row);
      d.profiles.forEach((p, i) => {
        const el = h('div.mat', { style: p ? `border-top:2.2rem solid ${paintColour(p.paint)}` : '' });
        el.append(h('div', { style: 'font-size:4rem;font-weight:600' }, p ? p.name : 'Empty mat'));
        if (p) el.append(h('div', p.levelled ? 'Level' : `Day ${p.today.day}`));
        else el.append(h('div', 'A new guest'));
        row.append(s.item(el, { use: () => (p ? pickProfile(game, i) : openNewProfile(game, i)) }));
      });
    },
  });
}
function pickProfile(game, i) {
  game.programme.selectProfile(i);
  game.go(() => startProgramme(game));
}
function genName(r = cos) {
  const a = FIRST[Math.floor(r(0, FIRST.length)) % FIRST.length], b = LAST[Math.floor(r(0, LAST.length)) % LAST.length];
  return `${a} ${b}`;
}
function openNewProfile(game, slot) {
  let name = genName(), paintI = Math.floor(cos(0, 4));
  const paints = PAINTS.filter((x) => STARTER_PAINTS.includes(x.id));
  game.ui.only({
    name: 'newProfile',
    prompts: [['use', 'Choose'], ['back', 'Back']],
    back: () => openWho(game),
    build(s) {
      s.el.append(h('div.h2', { style: 'margin-top:4rem' }, 'A new guest'));
      const nameEl = h('div', { style: 'font-size:6rem;font-weight:700' }, name);
      const col = h('div.col', { style: 'margin-top:3rem' });
      s.el.append(col);
      col.append(h('div.tag', { style: 'transform:rotate(-1deg)' }, nameEl));
      col.append(s.item(h('div', 'Spin the name'), { use: () => { name = genName(); nameEl.textContent = name; }, silent: true }));
      const swatch = h('span', { style: 'display:inline-block;width:6rem;height:4rem;border:.4rem solid #1A1420;border-radius:1rem;vertical-align:middle;margin-left:1.2rem' });
      const paintLabel = h('span');
      const set = () => { paintLabel.textContent = paints[paintI].name; swatch.style.background = paints[paintI].shirt; };
      const shift = (d) => { paintI = (paintI + d + paints.length) % paints.length; set(); game.audio.sfx('uiMove'); };
      col.append(s.item(h('div', 'Paint: ', paintLabel, swatch), { left: () => shift(-1), right: () => shift(1), use: () => shift(1), silent: true }));
      set();
      col.append(s.item(h('div', { style: 'margin-top:1.5rem' }, 'That is me'), { use: () => {
        game.programme.createProfile(slot, name, paints[paintI].id);
        game.go(() => startProgramme(game));
      } }));
    },
  });
}

// ---- Programme ----
function startProgramme(game) {
  const p = game.save.profile;
  if (!p) { openWho(game); return; }
  game.ui.clear();
  game.programme.syncIsland();
  if (!p.tutorialDone) { toIsland(game, { arrival: true }); return; }
  if (!p.today.checkin) { toIsland(game, { morning: true }); return; }
  toIsland(game, {});
}
function toIsland(game, opts = {}) {
  game.setMode(new Hub(game, opts), 'island');
}
function toCheckIn(game, after) {
  game.setMode(new CheckInMode(game, after), 'checkin');
}
function toJar(game, opts) {
  game.setMode(new JarMode(game, opts), 'jar');
}
function toEnding(game) {
  game.setMode(new EndingMode(game), 'ending');
}
function toGroup(game) {
  game.setMode(new GroupClass(game), 'group');
}
function leaveClass(game) {
  const p = game.save.profile;
  game.paused = false;
  game.ui.clear();
  if (game.mode && game.mode.opts && game.mode.opts.onLeave) { game.mode.opts.onLeave(); return; }
  game.go(() => (p ? toMenu(game) : toTitle(game)));
}
/** Lanes for one local player. */
export function soloLanes(game, extra = {}) {
  const p = game.save.profile;
  return [{ kind: 'local', name: p ? p.name : 'You', colour: p ? paintColour(p.paint) : '#2CB5A0', hat: p ? p.hat : 'none', source: 'any', ...extra }];
}
/** A class in the programme or Free Play: results, then marbles, then back to the island. */
function runClass(game, id, tier = 0, { programme = true, back = null } = {}) {
  const run = () => {
    game.setMode(new EventRun(game, {
      id, tier, lanes: soloLanes(game), mode: 'solo',
      onLeave: () => game.go(() => (back ? back() : toIsland(game, {}))),
      onResult: function* onResult(ev, results, er) {
        const r = results[0];
        // The Grand Hold gives its medal anyway.
        const rec = game.save.profile ? game.programme.record(id, tier, id === 'grandHold' ? Math.max(r.form, 85) : r.form, Math.max(30, ev.t), programme) : null;
        if (id === 'grandHold' && programme) {
          yield* game.sayText('trudy', 'Exemplary, I suppose.');
          game.go(() => toEnding(game));
          return;
        }
        let done = false;
        const cont = () => { done = true; };
        showResults(game, {
          ev, result: r, title: ev.data.title, tierName: TIER_NAMES[tier],
          onContinue: cont, onRetry: () => { done = 'retry'; },
          extra: rec ? h('div.tag', { style: 'font-size:3.4rem' }, `+${rec.marbles} marbles${rec.tierOpened ? ` · ${TIER_NAMES[rec.tierOpened]} is open` : ''}`) : null,
        });
        yield () => done;
        game.ui.clear();
        if (done === 'retry') { game.go(run); return; }
        game.go(() => {
          if (!game.save.profile) { (back || (() => toMenu(game)))(); return; }
          toJar(game, { marbles: rec.marbles, medal: rec.medal.id, notch: rec.notch, unlocks: rec.unlocks, then: back });
        });
      },
    }), 'event');
  };
  run();
}

// ---- Free Play ----
function openFreePlay(game) {
  if (!game.save.profile) {
    const list = game.save.data.profiles.findIndex((x) => x);
    if (list >= 0) game.programme.selectProfile(list);
  }
  const ids = game.save.profile ? game.programme.freePlayList() : [];
  const pages = [];
  for (let i = 0; i < ids.length; i += 6) pages.push(ids.slice(i, i + 6));
  if (!pages.length) pages.push([]);
  game.ui.only({
    name: 'freeplay', prompts: [['use', 'Choose'], ['page', 'Pages'], ['back', 'Back']], back: () => toMenu(game),
    build(s) {
      s.el.append(h('div.h2', { style: 'margin-top:4rem' }, 'Free Play'));
      const box = h('div.dev-grid', { style: 'margin-top:3rem' });
      s.el.append(box);
      const render = (pg) => {
        box.innerHTML = '';
        s.clearItems();
        for (const id of pages[pg]) {
          box.append(s.item(h('div', EVENTS[id].title), { use: () => openTierPick(game, id) }));
        }
        if (!pages[pg].length) box.append(h('div.tag', { style: 'grid-column: span 2' }, 'Meet a class in the Programme first. Trudy insists.'));
        if (s.items.length) s.setFocus(0, true);
      };
      if (pages.length > 1) s.pager(pages.length, render);
      render(0);
    },
  });
}
function openTierPick(game, id, back = () => openFreePlay(game)) {
  const d = EVENTS[id];
  game.ui.only({
    name: 'tier', prompts: [['use', 'Begin'], ['back', 'Back']], back,
    build(s) {
      s.el.append(h('div.h2', { style: 'margin-top:4rem' }, d.title));
      const col = h('div.col', { style: 'margin-top:3rem' });
      s.el.append(col);
      d.tiers.forEach((_, t) => {
        const open = game.programme.tierOpen(id, t);
        const m = game.programme.medalOf(id, t);
        const el = h(`div${open ? '' : '.locked'}`, `${TIER_NAMES[t]}${m ? ` · ${m.medal}` : ''}${open ? '' : t === 1 ? ' · needs Pleasant' : ' · needs Exemplary'}`);
        col.append(s.item(el, { use: () => { if (open) game.go(() => runClass(game, id, t, { programme: false, back: () => { toMenuAfterFree(game); } })); else game.ui.toast('Not yet. Trudy has it written down.'); } }));
      });
    },
  });
}
function toMenuAfterFree(game) { toMenu(game); openFreePlay(game); }

/** Jump anywhere: Dev Mode and tests. */
export function flowGoto(game, screen, args = {}) {
  if (!game.flow) installFlow(game);
  game.paused = false;
  game.ui.clear();
  switch (screen) {
    case 'title': toTitle(game); break;
    case 'menu': toMenu(game); break;
    case 'who': openWho(game); break;
    case 'island': toIsland(game, args); break;
    case 'jar': toJar(game, { marbles: args.marbles ?? 10, medal: args.medal || 'pleasant', notch: !!args.notch, unlocks: [] }); break;
    case 'checkin': toCheckIn(game); break;
    case 'ending': toEnding(game); break;
    case 'group': toGroup(game); break;
    case 'freeplay': openFreePlay(game); break;
    case 'journal': toMenu(game); openJournal(game); break;
    case 'about': toMenu(game); openAbout(game); break;
    case 'settings': toMenu(game); openSettings(game); break;
    case 'pause': openPause(game); break;
    case 'dev': openDev(game); break;
    case 'attract': game.attractStart(); break;
    case 'event': {
      const lanes = args.lanes || soloLanes(game);
      game.setMode(new EventRun(game, { id: args.id, tier: args.tier || 0, lanes, mode: args.mode || 'solo', skipIntro: args.skipIntro !== false, skipCountdown: args.skipCountdown !== false, config: args.config, god: args.god, onResult: args.onResult || null, onLeave: args.onLeave }), 'event');
      break;
    }
    default: break;
  }
}
export { toMenu, toIsland, toTitle, openFreePlay, openTierPick, DISCIPLINE_ORDER, hasEvent, SEAT_COLOURS, Doll, cosPick };
