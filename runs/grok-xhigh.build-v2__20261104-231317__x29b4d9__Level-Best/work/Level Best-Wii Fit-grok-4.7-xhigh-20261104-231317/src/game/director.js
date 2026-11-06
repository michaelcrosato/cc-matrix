import { TITLE, TAGLINE, SAVE_KEY, FIXED_DT, SEAT_COLOURS } from '../data/config.js';
import { eventById, eventIds } from '../events/index.js';
import { CheckIn } from './checkin.js';
import { medalOf, medalLabel, wobbleAge, marblePayout, tiersOpen } from './score.js';
import { dayPlan, programmeSteps } from '../data/programme.js';
import { restTiltRad, detuneCents } from '../physics/island.js';
import { initRapier } from '../physics/world.js';
import { createInput } from '../input/input.js';
import { makePad, clearPad, writeWish, writeButton, skillOf } from '../input/bot.js';
import { promptFor } from '../input/glyphs.js';
import { getTune, setTune, resetTuning, tuningSnapshot } from '../core/tuning.js';
import { TUNING_DEFS } from '../data/tuning.js';
import { rng, resetRng, setSessionMode } from '../core/rng.js';
import { readSave, writeSave, memoryStorage } from '../core/save.js';
import { createAudio } from '../audio/engine.js';
import { EVENT_TRACK } from '../audio/tracks.js';
import { lineById, takeLine } from '../data/dialogue.js';
import { ABOUT } from '../data/about.js';
import { NAMES, PAINTS, HATS } from '../data/names.js';
import { PALETTE_ORDER } from '../data/palettes.js';
import { createLoop } from '../core/loop.js';
import { mountUi } from '../ui/ui.js';

const SESSION_SET = ['poses', 'cairn', 'logReps', 'stepClass', 'plates', 'fruitHat', 'springboard'];
const ATTRACT = ['fruitHat', 'cairn', 'stepClass', 'plates', 'springboard', 'raft', 'roomService', 'poses'];
const QUESTIONS = [
  { ask: 'trudy.question.0', yes: 'trudy.yes.0', no: 'trudy.no.0', kind: 'yes' },
  { ask: 'trudy.question.1', yes: 'trudy.yes.1', no: 'trudy.no.1', kind: 'yes' },
  { ask: 'trudy.question.2', yes: 'trudy.yes.2', no: 'trudy.no.2', kind: 'yes' },
  { ask: 'trudy.question.3', left: 'trudy.left.0', right: 'trudy.right.0', kind: 'side' },
];

function freshProfile() {
  return {
    name: NAMES[0], paint: 'coral', hat: 'none', nameIndex: 0, paintIndex: 0, hatIndex: 0,
    dayIndex: 0, doneSteps: [], met: [], cleared: {}, best: {},
    marbles: 0, ages: [], stamps: [], medals: [], minutes: 0, floor: 0,
    levelled: false, classDone: [],
  };
}

function defaultSettings() {
  return {
    music: 10, sfx: 80, voice: 80, glyphs: 'playstation', rumble: true,
    autoBreathe: false, rhythmOffset: 0, uiScale: 1, ink: 1, reduceShake: false,
    difficulty: 'standard',
  };
}

export async function createGame(opts = {}) {
  await initRapier();
  const storage = opts.storage || (opts.window && opts.window.localStorage) || memoryStorage();
  const doc = opts.document || null;
  const audio = createAudio();
  const pads = [0, 1, 2, 3].map(() => makePad());
  let padSource = () => pads;
  const inputs = [0, 1, 2, 3].map((i) => {
    const input = createInput();
    input.setPadSource(() => padSource());
    input.setPadIndex(i);
    input.setDevice('pad');
    return input;
  });
  const profile = freshProfile();
  const settings = defaultSettings();
  const saved = readSave(storage, SAVE_KEY);
  if (saved) {
    Object.assign(profile, saved.profile);
    Object.assign(settings, saved.settings);
  }
  let screen = 'title';
  let focus = 0;
  let page = 0;
  let idle = 0;
  let attract = null;
  let event = null;
  let eventId = null;
  let tier = 1;
  let paused = false;
  let countLeft = 0;
  let speech = null;
  let speechLeft = 0;
  let pending = null;
  let jarLeft = 0;
  let jarPay = 0;
  let botSkill = null;
  let botOpt = {};
  let god = false;
  let timeScale = 1;
  let coarse = !!opts.coarse;
  let session = null;
  let locked = false;
  let errors = [];
  let volumeOpen = false;
  let devFromPause = false;
  let group = null;
  let freePick = false;
  let lastResult = null;
  let copyText = '';
  let palette = 'dawn';
  let paletteHold = null;
  let frames = 0;
  let backend = 'none';
  let lost = null;
  let rendererAttached = false;
  let holdAttract = !!doc;
  let freeCam = false;
  let inkOn = true;
  let debugPhysics = false;
  let pendingStart = null;
  const listeners = new Set();
  const programme = programmeSteps(eventIds());
  let ui = null;
  if (doc) {
    ui = mountUi(doc, {
      activate: (index) => activate(index),
      hover: (index) => { if (focus === index) return; focus = index; paint(); },
      slide: (id, value) => { setTune(id, value); applySettings(); paint(); },
    });
  }

  function applySettings() {
    audio.setGains(settings.music / 100, settings.sfx / 100, settings.voice / 100);
    inputs.forEach((input) => input.setRumble(settings.rumble));
  }
  applySettings();

  function persist() {
    writeSave(storage, SAVE_KEY, { profile, settings });
  }

  function tiltRad() {
    const rest = getTune('islandRest');
    return restTiltRad(profile.doneSteps.length, Math.max(1, programme.length), rest);
  }

  function talk(speaker, bucket) {
    const line = takeLine(speaker, bucket, rng('talk'));
    if (!line) return;
    speech = { who: speaker === 'stillwater' ? 'Ms. Stillwater' : speaker === 'bolster' ? 'Coach Bolster' : 'Trudy', text: line.text, id: line.id };
    const rate = speaker === 'stillwater' ? 7 : speaker === 'bolster' ? 11 : 16;
    speechLeft = Math.max(0.8, line.text.length / rate);
    audio.say(line.text, speaker === 'guest' ? 'guest' : speaker);
  }

  function choicesOf() {
    return model().choices;
  }

  function setScreen(next, keepFocus = false) {
    screen = next;
    if (!keepFocus) focus = 0;
    page = 0;
    if (next === 'plan') {
      const classes = today().classes;
      const nextClass = classes.findIndex((id) => !profile.classDone.includes(id));
      if (nextClass > 0) focus = nextClass;
    }
    volumeOpen = false;
    if (next !== 'play') paused = false;
    for (const pad of pads) clearPad(pad);
    paint();
    persist();
  }

  function today() {
    const plan = dayPlan(profile.dayIndex, eventIds());
    if (plan.maintenance) {
      const pool = eventIds().slice();
      const picked = [];
      while (picked.length < 3 && pool.length) {
        const i = Math.floor(rng('maintenance') * pool.length);
        picked.push(pool.splice(i, 1)[0]);
      }
      plan.classes = picked;
    }
    return plan;
  }

  function tierFor(id) {
    if (!freePick && profile.dayIndex < 5) return 1;
    const best = profile.best[id] || {};
    return tiersOpen(best);
  }

  function startEvent(id, extra = {}) {
    if (event) event.dispose();
    const Ctor = id === 'checkin' ? CheckIn : eventById(id);
    eventId = id;
    tier = extra.tier || (id === 'checkin' ? 1 : tierFor(id));
    const lanes = extra.lanes || (group && group.lanes && group.lanes.length ? group.lanes : [{ id: 0, kind: 'local', name: profile.name, colour: SEAT_COLOURS[0] }]);
    event = new Ctor({
      tier, lanes, seed: extra.seed || 1, session: !!extra.session, god: extra.god || god,
      difficulty: settings.difficulty, tests: extra.tests, skill: extra.skill || 'sharp',
      label: `${id}-${profile.dayIndex}`,
    });
    if (event.build) event.build();
    audio.play(EVENT_TRACK[id] || 'island');
  }

  function finishEvent() {
    if (!event) return;
    const result = event.result(0);
    const forms = event.lanes.map((_, i) => {
      const row = event.result(i);
      return row && Number.isFinite(row.form) ? row.form : 0;
    });
    lastResult = { ...result, forms, winner: result && Number.isFinite(result.winner) ? result.winner : null };
    profile.minutes += (event.t || 0) / 60;
    profile.floor += result.falls || 0;
    if (eventId !== 'checkin') {
      const form = result.form || 0;
      const best = profile.best[eventId] || {};
      best[tier] = Math.max(best[tier] || 0, form);
      profile.best[eventId] = best;
      if (!profile.met.includes(eventId)) profile.met.push(eventId);
      if (programme.includes(eventId) && !profile.doneSteps.includes(eventId)) profile.doneSteps.push(eventId);
      if (profile.doneSteps.length >= programme.length) profile.levelled = true;
      const first = !profile.cleared[eventId];
      jarPay = marblePayout({
        seconds: event.t || 0, form, firstClear: first,
        perMin: getTune('marblesPerMin'), medalScale: getTune('medalScale'),
      });
      profile.cleared[eventId] = true;
      profile.medals.push({ id: eventId, tier, form, medal: result.medal });
      if (!profile.classDone.includes(eventId)) profile.classDone.push(eventId);
    }
    event.dispose();
    event = null;
    audio.setTilt(tiltRad());
  }

  function woke(sample, travel) {
    const e = sample.edges;
    if (e.confirm || e.back || e.pause || e.hop || e.flail || e.ask || e.up || e.down || e.left || e.right || e.recenter) return true;
    if (sample.padConnected && Math.hypot(sample.wish.x, sample.wish.y) > 0.3) return true;
    if (travel > 8) return true;
    return false;
  }

  function menuMove(sample) {
    const list = choicesOf();
    const n = list.length || 1;
    if (sample.edges.up) focus = (focus - 1 + n) % n;
    if (sample.edges.down) focus = (focus + 1) % n;
    if (sample.edges.left || sample.edges.right) nudge(list[focus], sample.edges.right ? 1 : -1);
    if (sample.edges.confirm) activate(focus);
    if (sample.edges.back) back();
  }

  function nudge(choice, dir) {
    if (screen === 'about' || screen === 'journal') {
      const count = screen === 'about' ? aboutPages().length : 3;
      page = (page + (dir > 0 ? 1 : count - 1)) % count;
      return;
    }
    if (!choice) return;
    if (choice.kind === 'slider') {
      const def = TUNING_DEFS.find((d) => d.id === choice.id);
      if (def) setTune(choice.id, getTune(choice.id) + dir * def.step);
      return;
    }
    if (choice.id === 'music') settings.music = clampNum(settings.music + dir * 5, 0, 100);
    if (choice.id === 'sfx') settings.sfx = clampNum(settings.sfx + dir * 5, 0, 100);
    if (choice.id === 'voice') settings.voice = clampNum(settings.voice + dir * 5, 0, 100);
    if (choice.id === 'glyphs') settings.glyphs = settings.glyphs === 'playstation' ? 'xbox' : 'playstation';
    if (choice.id === 'difficulty') {
      const order = ['gentle', 'standard', 'honest'];
      const i = order.indexOf(settings.difficulty);
      settings.difficulty = order[(i + (dir > 0 ? 1 : 2)) % 3];
    }
    if (choice.id === 'name') profile.nameIndex = (profile.nameIndex + (dir > 0 ? 1 : NAMES.length - 1)) % NAMES.length;
    if (choice.id === 'paint') profile.paintIndex = (profile.paintIndex + (dir > 0 ? 1 : PAINTS.length - 1)) % PAINTS.length;
    if (choice.id === 'hat') profile.hatIndex = (profile.hatIndex + (dir > 0 ? 1 : HATS.length - 1)) % HATS.length;
    if (choice.id === 'page') page = Math.max(0, page + dir);
    applySettings();
  }

  function activate(index) {
    const list = choicesOf();
    const choice = list[index];
    if (!choice || choice.kind === 'slider') return;
    focus = index;
    audio.unlock();
    audio.sfx('uiConfirm');
    const id = choice.id;
    if (screen === 'title') return setScreen(profile.stamps.length || profile.dayIndex > 0 ? 'menu' : 'who');
    if (screen === 'touch') return setScreen('settings');
    if (screen === 'who' && id === 'begin') {
      profile.name = NAMES[profile.nameIndex];
      profile.paint = PAINTS[profile.paintIndex].id;
      profile.hat = HATS[profile.hatIndex].id;
      return setScreen('tutorial');
    }
    if (screen === 'tutorial' && id === 'on') return beginDay();
    if (screen === 'menu') {
      if (id === 'programme') return profile.classDone.length ? setScreen('plan') : beginDay();
      if (id === 'group') { group = { seats: [null, null, null, null], points: [0, 0, 0, 0], playlist: [], cursor: 0 }; return setScreen('group'); }
      if (id === 'free') { freePick = true; return setScreen('free'); }
      if (id === 'journal') return setScreen('journal');
      if (id === 'settings') return setScreen('settings');
      if (id === 'about') return setScreen('about');
    }
    if (screen === 'question') return answerQuestion(id);
    if (screen === 'reply') { eventId = 'checkin'; beginCountdown(); return; }
    if (screen === 'age') return setScreen('plan');
    if (screen === 'plan' && eventById(id)) return openIntro(id);
    if (screen === 'intro') return beginCountdown();
    if (screen === 'results') {
      if (id === 'retry') return openIntro(eventId);
      return afterResult();
    }
    if (screen === 'jar') return afterJar();
    if (screen === 'bed') {
      if (id === 'free') { freePick = true; return setScreen('free'); }
      return sleepDay();
    }
    if (screen === 'ending') return setScreen(pageOfEnding());
    if (screen === 'credits') { sleepDay(); return setScreen('menu'); }
    if (screen === 'pause') return pauseAction(id);
    if (screen === 'settings') return settingsAction(id);
    if (screen === 'dev') return devAction(id);
    if (screen === 'free' && eventById(id)) return openIntro(id);
    if (screen === 'group') {
      if (group && !group.seats.some(Boolean)) group.seats[0] = { name: profile.name, device: 'key' };
      return groupAction(id);
    }
    if (screen === 'confirm-reset' && id === 'yes') { resetAll(); return setScreen('title'); }
    if (screen === 'confirm-reset') return setScreen('settings');
    if (screen === 'island') {
      if (id === 'plan') return setScreen('plan');
      if (id === 'bed') return setScreen('bed');
      if (id === 'menu') return setScreen('menu');
    }
    if ((screen === 'about' || screen === 'journal') && (id === 'next' || id === 'prev')) {
      const count = screen === 'about' ? aboutPages().length : 3;
      page = (page + (id === 'next' ? 1 : count - 1)) % count;
    }
    paint();
  }

  function pageOfEnding() {
    if (screen === 'ending') return 'credits';
    return 'credits';
  }

  function beginDay() {
    freePick = false;
    profile.classDone = [];
    talk('trudy', 'morning');
    setScreen('morning');
  }

  function answerQuestion(id) {
    const q = QUESTIONS[profile.dayIndex % QUESTIONS.length];
    const key = id === 'yes' ? q.yes : id === 'no' ? q.no : id === 'left' ? q.left : q.right;
    const line = lookup(key);
    speech = { who: 'Trudy', text: line ? line.text : 'Noted.', id: key };
    speechLeft = 1.2;
    if (line) audio.say(line.text, 'trudy');
    setScreen('reply');
  }

  function openIntro(id) {
    eventId = id;
    tier = (pendingStart && pendingStart.tier) || tierFor(id);
    setScreen('intro');
  }

  function beginCountdown() {
    const plan = today();
    const extra = pendingStart || {};
    pendingStart = null;
    startEvent(eventId, {
      seed: extra.seed,
      tier: extra.tier,
      lanes: extra.lanes,
      skill: extra.skill,
      tests: eventId === 'checkin' ? plan.tests : extra.tests,
      god: extra.god || screen === 'attract',
    });
    if (eventId === 'checkin') {
      screen = 'checkinPlay';
      return;
    }
    countLeft = 3;
    setScreen('countdown');
  }

  function afterResult() {
    if (eventId === 'checkin') return;
    profile.marbles += jarPay;
    jarLeft = 2;
    audio.sfx('marble');
    setScreen('jar');
  }

  function afterJar() {
    if (profile.levelled && eventId === 'grandHold') {
      sayExact("Oh. So that's what the middle looks like.");
      return setScreen('ending');
    }
    const plan = today();
    const pendingClass = plan.classes.filter((id) => !profile.classDone.includes(id));
    if (group && group.playlist) return scoreGroup();
    if (pendingClass.length && !freePick) return setScreen('plan');
    if (freePick) return setScreen('free');
    return setScreen('bed');
  }

  function sleepDay() {
    const plan = today();
    profile.stamps.push({ day: profile.dayIndex + 1, name: plan.name });
    profile.dayIndex += 1;
    profile.classDone = [];
    paletteHold = null;
    persist();
    beginDay();
  }

  function scoreGroup() {
    if (!group) return setScreen('menu');
    const forms = lastResult && lastResult.forms ? lastResult.forms : group.seats.map((s, i) => (s ? (i === 0 ? lastResult.form : 0) : -1));
    const ranked = forms.map((form, i) => ({ i, form })).filter((row) => row.form >= 0).sort((a, b) => b.form - a.form);
    const points = [4, 3, 2, 1];
    ranked.forEach((row, place) => { group.points[row.i] += points[place] || 1; });
    group.cursor += 1;
    if (group.cursor >= group.playlist.length) return setScreen('podium');
    openIntro(group.playlist[group.cursor]);
  }

  function back() {
    if (screen === 'settings' || screen === 'about' || screen === 'journal' || screen === 'free' || screen === 'group' || screen === 'mirror') return setScreen('menu');
    if (screen === 'dev') return setScreen('pause');
    if (screen === 'pause') { paused = false; return setScreen('play'); }
    if (screen === 'plan' || screen === 'island') return setScreen('menu');
    if (screen === 'who') return setScreen('title');
  }

  function pauseAction(id) {
    if (id === 'resume') { paused = false; return setScreen('play'); }
    if (id === 'restart') { openIntro(eventId); return; }
    if (id === 'howto') return setScreen('howto');
    if (id === 'settings') return setScreen('settings');
    if (id === 'dev') { devFromPause = true; return setScreen('dev'); }
    if (id === 'leave') {
      if (event) event.dispose();
      event = null;
      return setScreen('island');
    }
  }

  function settingsAction(id) {
    if (id === 'glyphs') settings.glyphs = settings.glyphs === 'playstation' ? 'xbox' : 'playstation';
    if (id === 'rumble') settings.rumble = !settings.rumble;
    if (id === 'breathe') settings.autoBreathe = !settings.autoBreathe;
    if (id === 'shake') settings.reduceShake = !settings.reduceShake;
    if (id === 'full') {
      const el = doc && doc.documentElement;
      if (el && el.requestFullscreen) el.requestFullscreen().catch(() => {});
    }
    if (id === 'reset') return setScreen('confirm-reset');
    if (id === 'next') page = (page + 1) % 4;
    if (id === 'prev') page = (page + 3) % 4;
    applySettings();
    paint();
  }

  function devAction(id) {
    if (!devFromPause && screen !== 'dev') return;
    if (id === 'reset-tune') resetTuning();
    if (id === 'god') god = !god;
    if (id === 'faster') timeScale = Math.min(4, timeScale * 2);
    if (id === 'slower') timeScale = Math.max(0.1, timeScale / 2);
    if (id === 'step' && event) event.fixed(FIXED_DT, [inputs[0].snapshot(0)]);
    if (id === 'fall' && event && event.beginFall) event.beginFall(0);
    if (id === 'results') { finishEvent(); return setScreen('results'); }
    if (id === 'ending') {
      profile.doneSteps = programme.slice();
      profile.levelled = true;
      profile.met = eventIds();
      sayExact("Oh. So that's what the middle looks like.");
      return setScreen('ending');
    }
    if (id === 'marbles') profile.marbles += 10;
    if (id === 'unlock') profile.met = eventIds();
    if (id === 'age') profile.ages.push(41);
    if (id === 'bot') botSkill = botSkill ? null : 'sharp';
    if (id === 'copy') copyText = JSON.stringify(tuningSnapshot());
    if (id === 'wipe') return setScreen('confirm-reset');
    if (id === 'palette') {
      const i = PALETTE_ORDER.indexOf(paletteNow());
      paletteHold = PALETTE_ORDER[(i + 1) % PALETTE_ORDER.length];
    }
    if (id === 'ink') inkOn = !inkOn;
    if (id === 'camera') freeCam = !freeCam;
    if (id === 'debug') debugPhysics = !debugPhysics;
    if (id === 'gust' && event && event.states) {
      event.states[0].gustLeft = 0.5;
      event.states[0].gustN = 3.5;
    }
    if (id === 'next') page = (page + 1) % devPageCount();
    if (id === 'prev') page = (page + devPageCount() - 1) % devPageCount();
    if (id.startsWith('jump-')) {
      devFromPause = true;
      return openIntro(id.slice(5));
    }
    paint();
  }

  function groupAction(id) {
    if (id === 'quick' || id === 'raft' || eventById(id)) {
      const couch = eventIds().filter((eid) => eventById(eid).couch);
      const playlist = id === 'quick' ? pickSome(couch, 3) : [id === 'raft' ? 'raft' : id];
      group.playlist = playlist;
      group.cursor = 0;
      const lanes = group.seats.map((seat, i) => seat ? ({
        id: i, kind: 'local', name: seat.name, colour: SEAT_COLOURS[i],
      }) : null).filter(Boolean);
      if (!lanes.length) lanes.push({ id: 0, kind: 'local', name: profile.name, colour: SEAT_COLOURS[0] });
      group.lanes = lanes;
      return openIntro(playlist[0]);
    }
    if (id === 'back') return setScreen('menu');
  }

  function pickSome(list, n) {
    const pool = list.slice();
    const out = [];
    while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rng('group') * pool.length), 1)[0]);
    return out;
  }

  function resetAll() {
    const next = freshProfile();
    Object.keys(profile).forEach((k) => delete profile[k]);
    Object.assign(profile, next);
    Object.assign(settings, defaultSettings());
    resetTuning();
    try { storage.removeItem(SAVE_KEY); } catch { /* memory store */ }
  }

  function sayExact(text) {
    speech = { who: 'Trudy', text, id: 'exact' };
    speechLeft = Math.max(1, text.length / 16);
    audio.say(text, 'trudy');
  }

  function lookup(id) {
    return lineById(id);
  }

  function driveBots(dt) {
    if (!event || !botSkill) return null;
    const skill = skillOf(botSkill);
    const snaps = [];
    const count = event.lanes.length;
    for (let i = 0; i < count; i++) {
      const cmd = event.botInput(i, skill, botOpt) || {};
      const pad = padAt(i);
      clearPad(pad);
      writeWish(pad, cmd.x || 0, cmd.y || 0);
      writeButton(pad, 0, !!cmd.hop);
      writeButton(pad, 2, !!cmd.flail);
      writeButton(pad, 5, !!(cmd.breathe || (settings.autoBreathe && screen === 'play')));
      writeButton(pad, 6, (cmd.feetL || 0) > 0, cmd.feetL || 0);
      writeButton(pad, 7, (cmd.feetR || 0) > 0, cmd.feetR || 0);
      const input = inputs[i];
      if (cmd.plateA) input.keyDown('KeyA');
      if (cmd.plateD) input.keyDown('KeyD');
      input.poll(dt, 'balance');
      if (cmd.plateA) input.keyUp('KeyA');
      if (cmd.plateD) input.keyUp('KeyD');
      snaps.push(input.snapshot(0));
    }
    return snaps;
  }

  function padAt(i) {
    const list = padSource() || pads;
    return list[i] || pads[i];
  }

  function fixed(dt) {
    if (locked) return;
    audio.setTilt(tiltRad());
    if (session) return sessionFixed(dt);
    const input = inputs[0];
    const playing = screen === 'play' || screen === 'checkinPlay';
    if (attract) {
      const sample = input.poll(dt, 'menu');
      const travel = input.takeTravel();
      if (woke(sample, travel)) { stopAttract(true); return; }
      stepAttract(dt);
      // The demo writes the same pads a person would. Clear them after the
      // snapshot so the next wake poll does not treat the bot stick as a person.
      for (const pad of pads) clearPad(pad);
      return;
    }
    if (playing && botSkill) {
      const snaps = driveBots(dt);
      if (!paused && event) stepEvent(dt, snaps);
      noteNotch();
      if (event && event.done) {
        finishEvent();
        if (eventId === 'checkin') revealAge();
        else setScreen('results');
      }
      return;
    }
    const sample = input.poll(dt, playing ? 'balance' : 'menu');
    const travel = input.takeTravel();
    if (screen === 'title' || screen === 'menu' || screen === 'touch') {
      if (woke(sample, travel)) idle = 0;
      else if (!holdAttract) idle += dt;
      if (idle >= 10 && !session) { startAttract(); return; }
    } else idle = 0;
    if (sample.edges.pause && (screen === 'play' || screen === 'checkinPlay') && !sample.createHeld) {
      paused = true;
      return setScreen('pause');
    }
    if (screen === 'group' && joinPads(sample)) return;
    if ((screen === 'play' || screen === 'checkinPlay') && !paused) {
      const snaps = snapsFor(dt, sample);
      stepEvent(dt, snaps);
      noteNotch();
      if (event && event.done) {
        finishEvent();
        if (eventId === 'checkin') revealAge();
        else setScreen('results');
      }
      return;
    }
    if (screen === 'countdown') {
      countLeft -= dt;
      if (countLeft <= 0) setScreen('play');
      return;
    }
    if (screen === 'morning') {
      speechLeft -= dt;
      if (sample.edges.confirm || speechLeft <= 0) openQuestion();
      return;
    }
    if (screen === 'jar') {
      jarLeft -= dt;
      if (sample.edges.confirm || jarLeft <= 0) afterJar();
      return;
    }
    if (speechLeft > 0) speechLeft -= dt;
    if (!playing) menuMove(sample);
  }

  function snapsFor(dt, sample) {
    const n = event ? event.lanes.length : 1;
    const snaps = [sampleToSnap(sample, inputs[0])];
    for (let i = 1; i < n; i++) {
      const lane = event.lanes[i];
      if (lane && lane.kind === 'bot') {
        const cmd = event.botInput(i, skillOf(lane.skill || 'average'), botOpt) || {};
        const pad = padAt(i);
        clearPad(pad);
        writeWish(pad, cmd.x || 0, cmd.y || 0);
        writeButton(pad, 0, !!cmd.hop);
        writeButton(pad, 2, !!cmd.flail);
        writeButton(pad, 5, !!cmd.breathe);
        writeButton(pad, 6, (cmd.feetL || 0) > 0, cmd.feetL || 0);
        writeButton(pad, 7, (cmd.feetR || 0) > 0, cmd.feetR || 0);
        inputs[i].poll(dt, 'balance');
        snaps.push(inputs[i].snapshot(0));
      } else {
        inputs[i].poll(dt, 'balance');
        snaps.push(inputs[i].snapshot(0));
      }
    }
    return snaps;
  }

  function sampleToSnap(sample, input) {
    return input.snapshot(0);
  }

  function stepEvent(dt, snaps) {
    if (!event || paused) return;
    event.fixed(dt, snaps || []);
    if (event.frame) event.frame(dt);
  }

  function noteNotch() {
    if (event && event.notch && !profile.doneSteps.includes('grandHold')) {
      profile.doneSteps.push('grandHold');
      profile.levelled = profile.doneSteps.length >= programme.length;
      if (!profile.met.includes('grandHold')) profile.met.push('grandHold');
      audio.sfx('creak');
    }
    if (profile.doneSteps.length >= programme.length) profile.levelled = true;
  }

  function revealAge() {
    const mean = lastResult.mean || 0;
    const age = wobbleAge(mean, Math.min(4, profile.dayIndex));
    profile.ages.push(age);
    profile.marbles += 1;
    sayExact(`Your Wobble Age is ${age}.`);
    setScreen('age');
  }

  function openQuestion() {
    setScreen('question');
  }

  function startAttract() {
    attract = { index: 0, left: 18, between: 0, seen: [] };
    idle = 0;
    botSkill = 'sharp';
    launchAttract();
  }

  function launchAttract() {
    const id = ATTRACT[attract.index % ATTRACT.length];
    if (!attract.seen.includes(id)) attract.seen.push(id);
    startEvent(id, { god: id !== 'fruitHat', lanes: [{ id: 0, kind: 'bot', name: 'Demo', colour: SEAT_COLOURS[1] }] });
    botOpt = id === 'fruitHat' ? { bankAt: 99 } : {};
    screen = 'play';
  }

  function stepAttract(dt) {
    if (!attract) return;
    if (attract.between > 0) {
      attract.between -= dt;
      screen = 'title';
      if (attract.between <= 0) launchAttract();
      return;
    }
    const snaps = driveBots(dt);
    if (event) stepEvent(dt, snaps);
    attract.left -= dt;
    if (!event || event.done || attract.left <= 0) {
      if (event) { event.dispose(); event = null; }
      attract.index += 1;
      attract.left = 18;
      if (attract.index % ATTRACT.length === 0) {
        attract.between = 5;
        screen = 'title';
        botSkill = null;
      } else launchAttract();
    }
  }

  function stopAttract(swallow) {
    if (event) { event.dispose(); event = null; }
    attract = null;
    botSkill = null;
    botOpt = {};
    idle = 0;
    for (const pad of pads) clearPad(pad);
    screen = coarse ? 'touch' : 'title';
    if (swallow) paint();
  }

  function joinPads(sample) {
    if (screen !== 'group' || !group) return false;
    let used = false;
    for (let i = 0; i < 4; i++) {
      const pad = padAt(i);
      if (pad && pad.buttons[0] && pad.buttons[0].pressed && !group.seats[i]) {
        group.seats[i] = { name: `Player ${i + 1}`, device: 'pad' };
        used = true;
      }
      if (pad && pad.buttons[1] && pad.buttons[1].pressed) group.seats[i] = null;
    }
    if (sample.edges.confirm && !group.seats.some((s) => s && s.device === 'key')) {
      const slot = group.seats.findIndex((s) => !s);
      if (slot >= 0) {
        group.seats[slot] = { name: profile.name, device: 'key' };
        used = true;
      }
    }
    return used;
  }

  function latchSlot() {
    if (!session || session.latched || !event) return;
    const result = event.result(0);
    session.parts.push(Math.round((result.form || 0) * 10));
    session.total = session.parts.reduce((a, b) => a + b, 0);
    session.best = medalLabel(result.medal || 'attended');
    session.latched = true;
    event.dispose();
    event = null;
    screen = 'results';
  }

  function sessionFixed(dt) {
    const hub = globalThis.AIHub;
    if (!hub) return;
    const ms = hub.time();
    if (!Number.isFinite(ms)) {
      screen = 'card';
      const sample = inputs[0].poll(dt, 'menu');
      if (sample.edges.confirm) hub.answer('ready');
      if (sample.edges.ask) hub.answer('more');
      return;
    }
    const t = ms / 1000;
    if (t < 0) {
      screen = 'countdown';
      countLeft = Math.max(0, -t);
      return;
    }
    const slot = Math.min(session.slots.length, Math.floor(t / 62));
    const local = t - slot * 62;
    if (slot >= session.slots.length) {
      latchSlot();
      screen = 'waiting';
      sendResult();
      return;
    }
    if (session.slot !== slot) {
      latchSlot();
      session.slot = slot;
      session.playT = 0;
      session.latched = false;
      if (event) event.dispose();
      event = null;
      eventId = session.slots[slot];
    }
    if (local < 6) {
      screen = 'intro';
      session.scoreShown = session.total;
    } else if (local < 56) {
      if (!event && !session.latched) {
        startEvent(eventId, { session: true, lanes: [{ id: 0, kind: 'local', name: profile.name, colour: SEAT_COLOURS[hub.me || 0] }] });
      }
      if (event && !session.latched) {
        const input = inputs[0];
        let snaps;
        if (botSkill) snaps = driveBots(dt);
        else {
          input.poll(dt, 'balance');
          snaps = [input.snapshot(0)];
        }
        stepEvent(dt, snaps);
        session.playT += dt;
        if (event.done || local >= 55.9) latchSlot();
        else screen = 'play';
      } else screen = 'results';
    } else if (!session.latched) latchSlot();
    else screen = 'results';
    if (t - session.lastProgress >= 1 || session.lastProgress < 0) {
      const label = `${eventTitle(session.slots[slot])} ${session.slot === 0 && local < 6 ? 0 : session.total}`.slice(0, 24);
      const score = session.slot === 0 && local < 6 ? 0 : session.total;
      hub.progress({ score, label });
      session.lastProgress = t;
    }
    if (t - session.lastGhost >= 0.1) {
      const lean = event && event.states ? event.states[0] : { leanX: 0, leanZ: 0, fallen: false };
      hub.send({
        t: 'g', a: slot, x: 0, z: 0,
        lx: Number((lean.leanX || 0).toFixed(3)),
        lz: Number((lean.leanZ || 0).toFixed(3)),
        c: 0, f: lean.fallen ? 1 : 0, s: session.total,
      }, { reliable: false });
      session.lastGhost = t;
    }
    void dt;
  }

  function sendResult() {
    const hub = globalThis.AIHub;
    if (!session || session.sent || !hub) return;
    session.sent = true;
    const score = session.total || 0;
    hub.result({
      score,
      stats: { 'Floor Exercises': profile.floor, 'Best medal': session.best || 'Attended', 'Wobble Age': profile.ages[0] || 41 },
      awards: score >= 2500 ? ['Suspiciously Still'] : ['Showed Up'],
    });
  }

  function eventTitle(id) {
    const Ctor = eventById(id);
    return Ctor ? Ctor.title : 'Class';
  }

  function frame() {
    frames += 1;
    if (!locked) audio.tick();
    for (const fn of listeners) fn();
    paint();
  }

  function model() {
    const device = inputs[0].lastDevice;
    const prompts = promptFor(currentVerbs(), device, settings.glyphs);
    const lines = [];
    const choices = [];
    let heading = '';
    const add = (id, label, extra = {}) => choices.push({ id, label, index: choices.length, focus: choices.length === focus, ...extra });
    if (coarse && screen === 'title') screen = 'touch';
    if (screen === 'touch') {
      lines.push('Controller or keyboard required');
      lines.push(TAGLINE);
      add('settings', 'Settings');
    } else if (screen === 'title' || (attract && attract.between > 0)) {
      lines.push(TAGLINE);
      lines.push('Press to begin');
      add('begin', 'Begin');
    } else if (screen === 'who') {
      heading = "Who's here?";
      add('begin', 'Begin');
      add('name', `Name: ${NAMES[profile.nameIndex]}`);
      add('paint', `Paint: ${PAINTS[profile.paintIndex].id}`);
      add('hat', `Hat: ${HATS[profile.hatIndex].label}`);
    } else if (screen === 'tutorial') {
      heading = 'How a day works';
      lines.push('You can lean, step, hop, and flail. You cannot type a name.');
      lines.push('Flail is a short save with a cooldown. It is not a free win.');
      add('on', 'Step on');
    } else if (screen === 'menu') {
      heading = 'Level Best Retreat';
      const cont = profile.dayIndex > 0 || profile.classDone.length ? 'Continue' : 'Programme';
      add('programme', cont);
      add('group', 'Group Class');
      add('free', 'Free Play');
      add('journal', 'Journal');
      add('settings', 'Settings');
      add('about', 'About / Credits');
    } else if (screen === 'morning') {
      heading = today().name;
      lines.push(speech ? speech.text : 'Good morning.');
      add('on', 'Continue');
    } else if (screen === 'question') {
      const q = QUESTIONS[profile.dayIndex % QUESTIONS.length];
      const line = lookup(q.ask);
      heading = 'A small question';
      lines.push(line ? line.text : 'Do you trust your knees?');
      if (q.kind === 'side') { add('left', 'Left'); add('right', 'Right'); }
      else { add('yes', 'Yes'); add('no', 'No'); }
    } else if (screen === 'reply') {
      heading = 'Trudy';
      lines.push(speech ? speech.text : 'Noted.');
      add('on', 'To the mat');
    } else if (screen === 'age') {
      heading = 'Wobble Age';
      lines.push(String(profile.ages[profile.ages.length - 1] || ''));
      lines.push('I did not ask how old you are. I asked your knees.');
      add('on', 'See the plan');
    } else if (screen === 'plan') {
      heading = today().name;
      const classes = today().classes;
      for (const id of classes) add(id, `${eventTitle(id)}${profile.classDone.includes(id) ? ' — stamped' : ''}`);
      if (!classes.length) lines.push('The day is open.');
    } else if (screen === 'intro') {
      const Ctor = eventById(eventId);
      heading = Ctor ? Ctor.title : 'Class';
      lines.push(Ctor ? Ctor.can : '');
      lines.push(Ctor ? Ctor.cant : '');
      add('go', 'Begin');
    } else if (screen === 'countdown') {
      heading = String(Math.max(1, Math.ceil(countLeft)));
      lines.push('Hold still.');
    } else if (screen === 'play' || screen === 'checkinPlay') {
      heading = eventTitle(eventId);
    } else if (screen === 'results') {
      heading = lastResult ? medalLabel(lastResult.medal) : 'Attended';
      lines.push(lastResult ? lastResult.stats : '');
      lines.push(lastResult ? `Form ${Math.round(lastResult.form)}` : '');
      add('continue', 'Continue');
      add('retry', 'Retry');
    } else if (screen === 'jar') {
      heading = 'The jar';
      lines.push(`+${jarPay} marbles. The jar has ${profile.marbles}.`);
      add('on', 'Continue');
    } else if (screen === 'bed') {
      heading = 'Bed hut';
      lines.push('The stamp is ready.');
      add('bed', 'Sleep');
      add('free', 'Free Play');
    } else if (screen === 'ending') {
      heading = 'Level';
      lines.push("Oh. So that's what the middle looks like.");
      add('on', 'Listen');
    } else if (screen === 'credits') {
      heading = 'Credits';
      lines.push("It's quite flat, isn't it? ...Same time tomorrow?");
      add('on', 'Same time tomorrow');
    } else if (screen === 'pause') {
      heading = 'Paused';
      ['resume', 'restart', 'howto', 'settings', 'dev', 'leave'].forEach((id) => add(id, {
        resume: 'Resume', restart: 'Restart', howto: 'How to Play', settings: 'Settings', dev: 'Dev Mode', leave: 'Leave Class',
      }[id]));
    } else if (screen === 'howto') {
      heading = 'How to Play';
      lines.push('Lean with the stick, the keys, or the mouse. Feet are the triggers.');
      lines.push('You cannot win by flailing on cooldown.');
      add('back', 'Back');
    } else if (screen === 'settings') settingsModel(add, lines);
    else if (screen === 'dev') devModel(add, lines);
    else if (screen === 'about') aboutModel(add, lines);
    else if (screen === 'journal') journalModel(add, lines);
    else if (screen === 'free') {
      heading = 'Free Play';
      const ids = (profile.levelled ? eventIds() : profile.met);
      const slice = ids.slice(page * 4, page * 4 + 4);
      slice.forEach((id) => add(id, eventTitle(id)));
      if (ids.length > 4) add('page', 'More');
      if (!slice.length) lines.push('Meet a class first. The pavilions keep.');
    } else if (screen === 'group') {
      heading = 'Group Class';
      lines.push(group.seats.map((s, i) => s ? `${i + 1} ${s.name}` : `${i + 1} empty`).join('  '));
      add('quick', 'Quick Class');
      add('raft', 'Tippy Raft');
      add('back', 'Back');
    } else if (screen === 'podium') {
      heading = 'Podium';
      lines.push(group.points.map((p, i) => `Seat ${i + 1}: ${p}`).join('  '));
      add('back', 'Back to the island');
    } else if (screen === 'island') {
      heading = 'The island';
      lines.push(speech ? speech.text : 'Trudy is here.');
      add('plan', "Today's Plan");
      add('bed', 'Bed hut');
      add('menu', 'Menu');
    } else if (screen === 'card') cardModel(lines);
    else if (screen === 'waiting') {
      heading = 'Waiting for the others';
      lines.push('Trudy is keeping the clipboard shut.');
    } else if (screen === 'confirm-reset') {
      heading = 'Reset the save?';
      lines.push('The jar will be empty again.');
      add('yes', 'Yes, reset');
      add('no', 'No');
    } else if (screen === 'boot') {
      lines.push('Stretching...');
    }
    if (audio.snapshot().state === 'suspended') lines.push('Press a key or click for sound');
    if (attract && screen === 'play') lines.push('DEMO · Press any button');
    if (copyText && screen === 'dev') lines.push(copyText);
    const cob = event && event.cob ? event.cob(0) : { x: 0, y: 0 };
    return {
      screen: attract ? 'attract' : screen,
      gameTitle: TITLE,
      heading,
      lines,
      choices: choices.slice(0, 6),
      page: pageLabel(),
      prompts,
      speech: speech && (screen === 'play' || screen === 'morning') ? speech : null,
      hud: (screen === 'play' || screen === 'checkinPlay') && event ? {
        time: formatTime(event.t || 0),
        score: String(Math.round((event.result ? event.result(0).form : 0) || 0)),
      } : null,
      disc: (screen === 'play' || screen === 'checkinPlay') ? { x: cob.x || 0, y: cob.y || 0 } : null,
      attract: !!attract,
    };
  }

  function devPageCount() {
    return 6 + Math.ceil(TUNING_DEFS.length / 3) + Math.ceil(eventIds().length / 3);
  }

  function pageLabel() {
    if (screen === 'settings') return `Page ${page + 1} of 4`;
    if (screen === 'about') return `Page ${(page % aboutPages().length) + 1} of ${aboutPages().length}`;
    if (screen === 'journal') return `Page ${page + 1}`;
    if (screen === 'dev') return `Page ${(page % devPageCount()) + 1} of ${devPageCount()}`;
    return '';
  }

  function settingsModel(add, lines) {
    const pages = [
      () => { add('music', `Music: ${settings.music}`); add('sfx', `Sound: ${settings.sfx}`); add('voice', `Voice: ${settings.voice}`); },
      () => { add('glyphs', `Glyphs: ${settings.glyphs}`); add('rumble', `Rumble: ${settings.rumble ? 'on' : 'off'}`); add('breathe', `Auto-breathe: ${settings.autoBreathe ? 'on' : 'off'}`); },
      () => { add('shake', `Reduce shake: ${settings.reduceShake ? 'on' : 'off'}`); add('full', 'Fullscreen'); lines.push(`Ink ${settings.ink}`); },
      () => { add('difficulty', `Difficulty: ${settings.difficulty}`); add('reset', 'Reset save'); },
    ];
    pages[page % 4]();
    add('prev', 'Previous page');
    add('next', 'Next page');
  }

  function devModel(add, lines) {
    const wish = inputs[0].snapshot(0);
    lines.push(`Scale ${timeScale.toFixed(2)} · God ${god ? 'on' : 'off'} · Ink ${inkOn ? 'on' : 'off'} · Camera ${freeCam ? 'free' : 'follow'} · Lines ${debugPhysics ? 'on' : 'off'}`);
    lines.push(`${inputs[0].lastDevice} ${wish.wishX.toFixed(2)}, ${wish.wishZ.toFixed(2)} · feet ${wish.feetL.toFixed(2)} ${wish.feetR.toFixed(2)} · ${frames} frames · ${backend}`);
    const at = page % devPageCount();
    const tools = [
      [['god', god ? 'God mode on' : 'God mode off'], ['faster', 'Faster'], ['slower', 'Slower']],
      [['fall', 'Force a fall'], ['results', 'Skip to Results'], ['ending', 'Skip to Ending']],
      [['bot', botSkill ? 'Bot playing' : 'Let the bot play'], ['copy', 'Copy tuning'], ['step', 'Single step']],
      [['marbles', 'Add marbles'], ['unlock', 'Unlock all'], ['age', 'Set a Wobble Age']],
      [['wipe', 'Reset save'], ['palette', `Palette: ${paletteNow()}`], ['ink', inkOn ? 'Ink on' : 'Ink off']],
      [['camera', freeCam ? 'Free camera on' : 'Free camera off'], ['debug', debugPhysics ? 'Physics lines on' : 'Physics lines off'], ['gust', 'Force a gust']],
    ];
    if (at < tools.length) {
      for (const [id, label] of tools[at]) add(id, label);
    } else {
      const sliderPages = Math.ceil(TUNING_DEFS.length / 3);
      const slideAt = at - tools.length;
      if (slideAt < sliderPages) {
        const defs = TUNING_DEFS.slice(slideAt * 3, slideAt * 3 + 3);
        for (const def of defs) add(def.id, `${def.label}: ${getTune(def.id)}`, { kind: 'slider', min: def.min, max: def.max, step: def.step, value: getTune(def.id) });
      } else {
        const ids = eventIds().slice((slideAt - sliderPages) * 3, (slideAt - sliderPages) * 3 + 3);
        for (const id of ids) add(`jump-${id}`, eventTitle(id));
      }
    }
    add('prev', 'Previous page');
    add('next', 'Next page');
    add('reset-tune', 'Reset to defaults');
  }

  function aboutModel(add, lines) {
    const pages = aboutPages();
    headingSafe(lines, pages[page % pages.length]);
    add('prev', 'Previous page');
    add('next', 'Next page');
  }

  function headingSafe(lines, block) {
    for (const line of block) lines.push(line);
  }

  function journalModel(add, lines) {
    if (page === 0) lines.push(profile.stamps.map((s) => `Day ${s.day} ${s.name}`).join(' · ') || 'No stamps yet.');
    else if (page === 1) lines.push(profile.ages.join(' → ') || 'No ages yet.');
    else lines.push(`Minutes ${profile.minutes.toFixed(1)}. Marbles ${profile.marbles}. Floor exercises ${profile.floor}.`);
    add('prev', 'Previous page');
    add('next', 'Next page');
  }

  function cardModel(lines) {
    lines.push(TITLE);
    lines.push('Stay balanced through the class: highest score wins');
    lines.push('Enter is Ready. M is More time.');
    const hub = globalThis.AIHub;
    const players = (hub && hub.players) || [];
    for (const player of players) lines.push(`${player.name || 'Player'}`);
  }

  function currentVerbs() {
    if (screen === 'play' || screen === 'intro') {
      const Ctor = eventById(eventId);
      return Ctor && Ctor.verbs ? Ctor.verbs : ['use'];
    }
    return ['confirm', 'back'];
  }

  function formatTime(t) {
    const s = Math.max(0, Math.floor(t));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  }

  function paint() {
    if (!ui) return;
    const view = model();
    ui.paint(view);
  }

  function addPaged(pages, lines) {
    const list = lines.length ? lines : [''];
    for (let i = 0; i < list.length; i += 7) pages.push(list.slice(i, i + 7));
  }

  function chunkText(text, width = 64) {
    const words = String(text).split(' ');
    const lines = [];
    let cur = '';
    for (const word of words) {
      const next = cur ? `${cur} ${word}` : word;
      if (next.length > width && cur) {
        lines.push(cur);
        cur = word;
      } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }

  function aboutPages() {
    const info = ABOUT.sourceInformation;
    const labels = {
      date: 'Date', source: 'Source', plan: 'Plan', genre: 'Genre', perspective: 'Perspective',
      tech: 'Tech', artDirection: 'Art Direction', animation: 'Animation', audio: 'Audio',
      online: 'Online', testing: 'Testing', research: 'Research', environment: 'Environment',
      model: 'Model', usage: 'Usage',
    };
    const pages = [[TITLE, TAGLINE], ['About', 'Level Best Retreat']];
    for (const key of Object.keys(info)) addPaged(pages, [labels[key] || key, ...chunkText(info[key])]);
    pages.push(['Testing']);
    for (const line of ABOUT.testingFeedback) addPaged(pages, chunkText(line));
    pages.push(['Engine']);
    for (const line of ABOUT.engineFeedback) addPaged(pages, chunkText(line));
    pages.push(['Prompt']);
    for (const line of ABOUT.promptFeedback) addPaged(pages, chunkText(line));
    const hub = ABOUT.aiHub;
    pages.push(['Catalogue', hub.name, hub.tagline]);
    addPaged(pages, chunkText(hub.description));
    pages.push([`${hub.type} · ${hub.genre}`, `Source: ${hub.source}`, `Players: ${hub.players}`]);
    pages.push([hub.controls, (hub.tags || []).join(', ')]);
    pages.push(['Credits', 'Fredoka', 'Three.js R180', 'Rapier 0.19.3']);
    return pages;
  }

  function paletteNow() {
    if (paletteHold) return paletteHold;
    if (eventId === 'stepClass' || eventId === 'grandHold') return 'dusk';
    return PALETTE_ORDER[Math.min(PALETTE_ORDER.length - 1, Math.floor(profile.doneSteps.length / 4))] || 'dawn';
  }

  const loop = createLoop(fixed, frame, { scale: () => timeScale });
  if (!opts.manual) loop.start();
  if (coarse) screen = 'touch';
  paint();

  function state() {
    const result = event && event.result ? event.result(0) : null;
    const view = model();
    return {
      screen: attract ? 'attract' : screen,
      attract: !!attract,
      attractSeen: attract ? attract.seen.slice() : [],
      day: profile.dayIndex + 1,
      step: profile.doneSteps.length,
      profile: { ...profile, doneSteps: profile.doneSteps.slice(), met: profile.met.slice(), ages: profile.ages.slice(), stamps: profile.stamps.slice() },
      marbles: profile.marbles,
      tilt: tiltRad(),
      detune: detuneCents(tiltRad(), 0),
      wobbleAge: profile.ages[profile.ages.length - 1] || null,
      event: event ? {
        id: eventId, tier, phase: event.phase ? (typeof event.phase === 'function' ? event.phase()?.id : event.phase) : screen,
        t: event.t || 0, score: result ? result.form : 0,
        lanes: (event.states || []).map((st, i) => ({
          kind: event.lanes[i]?.kind || 'local', leanX: st.leanX, leanZ: st.leanZ,
          cob: event.cob ? event.cob(i) : { x: 0, y: 0 }, fallen: !!st.fallen,
          form: result && i === 0 ? result.form : 0, props: 0,
        })),
      } : null,
      input: { lastDevice: inputs[0].lastDevice, glyphSet: settings.glyphs },
      audio: audio.snapshot(),
      render: { backend, frames, lost },
      errors: errors.slice(),
      settings: { ...settings },
      focus,
      god, timeScale, levelled: profile.levelled,
      dev: screen === 'dev',
      group: group ? { seats: group.seats.map((s) => s && s.name), points: group.points.slice() } : null,
      winner: lastResult && Number.isFinite(lastResult.winner) ? lastResult.winner : null,
      last: lastResult ? { ...lastResult } : null,
      ghosts: session ? session.ghosts.map((g) => ({ id: g.id, lx: g.lx, lz: g.lz, f: g.f })) : [],
      sessionRound: session ? {
        slot: session.slot,
        id: session.slots[session.slot] || '',
        parts: session.parts.slice(),
        total: session.total,
      } : null,
      palette: paletteNow(),
      freeCam, inkOn, debugPhysics,
      heading: view.heading,
      lines: view.lines.slice(),
      choices: view.choices.map((c) => c.id),
      prompts: (view.prompts || []).map((p) => ({ verb: p.verb, glyph: p.glyph })),
    };
  }

  return {
    state,
    advance(seconds) {
      const steps = Math.max(0, Math.round(seconds / FIXED_DT));
      for (let i = 0; i < steps; i++) fixed(FIXED_DT);
      frame();
    },
    bot(skill, opt) { botSkill = skill; botOpt = opt || {}; },
    goto(next, args = {}) {
      if (next === 'dev' && screen !== 'pause' && screen !== 'dev') return false;
      if (next === 'play' && args.id) {
        pendingStart = args;
        openIntro(args.id);
        beginCountdown();
        setScreen('play');
        return true;
      }
      if (next === 'pause') { devFromPause = false; paused = true; }
      setScreen(next);
      return true;
    },
    tuning: { get: getTune, set: setTune, reset: resetTuning, snapshot: tuningSnapshot },
    settings: {
      get: () => ({ ...settings }),
      set(partial) { Object.assign(settings, partial); applySettings(); paint(); },
    },
    pads,
    pad: padAt,
    key(code, down = true) { if (down) inputs[0].keyDown(code); else inputs[0].keyUp(code); },
    pointer(x, y, buttons = 0) { inputs[0].pointerButtons(buttons, x, y); },
    setPadSource(fn) { padSource = fn; },
    setCoarse(on) { coarse = !!on; if (coarse && screen === 'title') setScreen('touch'); if (!coarse && screen === 'touch') setScreen('title'); },
    setRender(info) {
      rendererAttached = true;
      holdAttract = false;
      backend = info.backend;
      lost = info.lost;
      frames = info.frames;
    },
    onFrame(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    audio,
    profile,
    tilt: tiltRad,
    persist,
    loop,
    input: inputs[0],
    inputs,
    runStandalone() { audio.play('title'); paint(); },
    runSession(info) {
      session = { info, slots: [], slot: -1, parts: [], total: 0, best: 'Attended', lastProgress: -1, lastGhost: -1, sent: false, playT: 0, ghosts: [] };
      setSessionMode(true);
      const hub = globalThis.AIHub;
      const deal = hub.rng('deal');
      const pool = SESSION_SET.slice();
      while (session.slots.length < 3 && pool.length) {
        session.slots.push(pool.splice(Math.floor(deal() * pool.length), 1)[0]);
      }
      hub.on('card', () => { screen = 'card'; paint(); });
      hub.on('start', () => { session.started = true; });
      hub.on('time-up', () => sendResult());
      hub.on('end', () => { locked = true; audio.stop(); });
      hub.on('leave', (msg) => { session.ghosts = session.ghosts.filter((g) => g.id !== msg.id); });
      hub.on('message', (data, from) => {
        if (!data || data.t !== 'g') return;
        const id = from == null ? 0 : from;
        session.ghosts = session.ghosts.filter((g) => g.id !== id);
        session.ghosts.push({ ...data, id });
      });
      const onKey = (e) => {
        if (locked || session.started) return;
        if (e.key === 'Enter') hub.answer('ready');
        if (e.key === 'm' || e.key === 'M') hub.answer('more');
      };
      if (opts.window) opts.window.addEventListener('keydown', onKey);
      screen = 'card';
      hub.ready();
      paint();
    },
    activate,
    errors,
    TITLE,
  };
}

function clampNum(n, a, b) { return Math.max(a, Math.min(b, n)); }
