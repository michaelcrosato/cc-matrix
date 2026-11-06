// ?test=1 exposes window.__TEST__. Everything a test needs, through the real game.
import { renderOffline } from '../audio/engine.js';
import { TRACKS, STINGS } from '../audio/tracks.js';
import { SFX } from '../audio/sfx.js';
import { INST } from '../audio/instruments.js';
import { VOICES } from '../audio/voice.js';
import { T, resetTuning } from './tuning.js';
import { R } from '../render/renderer.js';
import { liveWorlds } from '../physics/world.js';
import { EVENTS } from '../data/events.js';
import { DAYS } from '../data/programme.js';
import { D, linesCount } from '../data/dialogue.js';
import { aboutPages } from '../game/ending.js';
import { setSeed } from './rng.js';
import * as Menus from '../ui/screens/menus.js';
import { Session } from '../game/session.js';
import { Brain, SKILLS } from '../input/bot.js';
export function installTestHooks(g, RAPIER, THREE) {
  window.__TEST__ = {
    g, T, EVENTS, DAYS, Menus, Session, Brain, SKILLS,
    state() {
      const ev = g.mode?.event, p = g.profile;
      return { screen: g.ui.topId() || g.mode?.screen || null, attract: g.attractOn, day: p?.day ?? null, step: p?.steps ?? null, profile: p ? p.name : null, marbles: p?.marbles ?? 0, tilt: g.island.restDeg, liveTilt: Math.hypot(g.island.tx, g.island.tz) * 57.3, wobbleAge: p?.ages?.at(-1) ?? null, ages: p?.ages ?? [], done: p?.doneToday ?? [], levelled: p?.levelled ?? false, stamps: p?.stamps?.length ?? 0, speech: g.speech.cur ? g.speech.cur.text : null, speechBusy: g.speech.busy, remaining: p ? g.remaining() : [], locked: g.hub ? g.hub.locked : null,
        event: ev ? { id: ev.cls.id, tier: ev.tierIndex, phase: ev.phase, t: ev.playT, score: ev.lanes[0]?.score ?? 0, bodies: ev.bodyCount(), lanes: ev.lanes.map(l => ({ kind: l.kind, leanX: l.bal?.leanX ?? 0, leanZ: l.bal?.leanZ ?? 0, cob: l.bal ? [l.bal.cobX, l.bal.cobZ] : null, fallen: l.fallen, form: l.form, falls: l.falls, props: l.props?.length ?? 0, wishX: l.wishX, wishZ: l.wishZ })) } : null,
        input: { lastDevice: g.input.lastDevice, glyphSet: g.settings.glyph }, audio: { state: g.audio.ctx?.state ?? 'none', music: g.audio.settings.music, sfx: g.audio.settings.sfx, voice: g.audio.settings.voice, musicGain: g.audio.music?.gain.value, track: g.audio.seq.name, detune: g.audio.detuneAt(1.5707 / .7), tiltDeg: g.audio.tiltDeg }, render: { backend: R.backend, frames: R.frames, lost: R.lost }, errors: g.errors.slice(), rapier: RAPIER.version?.(), three: THREE.REVISION, worlds: liveWorlds(), focus: g.ui.focus.cur ? g.ui.focus.cur.textContent.slice(0, 40) : null, items: g.ui.top() ? g.ui.focus.items().map(i => i.textContent.slice(0, 40)) : [] };
    },
    advance(sec) { g.loop.advance(sec); return true; },
    bot(skill) { g.testBotSkill = skill; if (!skill && window.__pads) for (const p of window.__pads) { if (!p) continue; p.axes.fill(0); p.buttons.forEach((b, i) => { p.buttons[i] = { pressed: false, value: 0 }; }); } },
    settings: g.settings, tuning: T, resetTuning, seed: setSeed,
    /** Runs one event to the end headless with bots on chosen lanes. Returns the result. */
    runEvent(id, { tier = 0, skills = ['sharp'], opts = {}, maxSec = 400, keepBot = false } = {}) {
      g.ui.closeAll(); g.clearMode(); g.scripts.clear(); g.speech.clear();
      const specs = skills.map((s, i) => ({ kind: 'bot', skill: s, name: s, colour: '#E8443A' }));
      const ev = g.startEventMode(EVENTS[id], { tier, ...opts }, specs); ev.count = .01; let t = 0, nan = false, peak = 0;
      const base = ev.bodyCount();
      while (ev.phase !== 'done' && t < maxSec) { g.fixed(1 / 120); t += 1 / 120; if (Math.round(t * 120) % 2 === 0) g.frame(1 / 60); if (Math.round(t * 120) % 120 === 0 && ev.hasNaN()) nan = true; }
      const res = skills.map((_, i) => ({ ...ev.laneResult(i), falls: ev.lanes[i].falls, raw: ev.lanes[i].score, extra: ev.lanes[i].inT })); const out = { res, t, done: ev.phase === 'done', nan, playT: ev.playT, base, bodiesEnd: ev.bodyCount(), restarts: ev.restarts, maxRound: ev.maxRound };
      if (!keepBot) { g.clearMode(); }
      return out;
    },
    audioRender: renderOffline, audioLists: () => ({ tracks: Object.keys(TRACKS), stings: Object.keys(STINGS), sfx: Object.keys(SFX), inst: Object.keys(INST), voices: Object.keys(VOICES) }), lines: linesCount, about: aboutPages,
    clearSave() { g.save.profiles = [null, null, null, null]; g.save.current = -1; g.persist(); },
  };
}
