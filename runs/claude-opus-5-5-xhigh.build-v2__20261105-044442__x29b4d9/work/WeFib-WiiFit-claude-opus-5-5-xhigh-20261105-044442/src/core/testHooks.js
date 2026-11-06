import { DEAD } from '../input/input.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { FIXED_DT } from '../data/config.js';
import { tun, resetTuning } from './tuning.js';
import { EVENTS } from '../data/events.js';
import { EVENT_CLASSES } from '../events/index.js';
import { blankInput } from '../input/input.js';
import { flowGoto } from '../game/flow.js';
import { renderProbe } from '../audio/probe.js';
import { setSeed } from './rng.js';

/** window.__TEST__: state, advance, bots through the stubbed pad, goto. Only with ?test=1. */
const pastDeadZone = (x, z) => { const m = Math.hypot(x, z); if (m < 1e-4) return [0, 0]; const a = Math.min(1, DEAD + m * (1 - DEAD)) / m; return [x * a, z * a]; };
export function installTestHooks(game, THREE) {
  const pad = () => {
    window.__pads = window.__pads || [];
    if (!window.__pads[0]) window.__pads[0] = makePad();
    return window.__pads[0];
  };
  function makePad() {
    return { connected: true, mapping: 'standard', index: 0, id: 'test pad', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })), vibrationActuator: { playEffect() { window.__rumbles = (window.__rumbles || 0) + 1; return Promise.resolve(); } } };
  }
  let botSkill = null, driving = false, botSeed = 0;
  const out = blankInput();
  game.beforePoll = (dt) => {
    if (!botSkill) return;
    const run = game.mode && game.mode.botDrive ? game.mode : null;
    const ev = game.currentEvent;
    const p = pad();
    const setB = (i, on, val) => { p.buttons[i].pressed = !!on; p.buttons[i].value = val !== undefined ? val : (on ? 1 : 0); };
    let result = null;
    if (ev && ev.phase === 'play' && !game.paused) {
      const lane = ev.lanes.find((l) => l.kind === 'local');
      if (lane) {
        if (!lane.testBot) { lane.testBot = ev.makeTestBot ? ev.makeTestBot(botSkill, lane) : ev.constructor.makeBot ? null : null; }
        const bot = lane.testBot || (lane.testBot = makeTestBot(botSkill, lane.id + botSeed * 17));
        bot.observe(lane, dt);
        const saved = lane.input;
        Object.assign(out, blankInput());
        lane.input = out;
        const res = ev.botInput(lane, ev.t, bot, dt);
        lane.input = saved;
        result = res ? Object.assign(out, res) : out;
      }
    } else if (run) {
      result = game.mode.botDrive(botSkill, dt, out);
    }
    if (result) {
      [p.axes[0], p.axes[1]] = pastDeadZone(result.wishX || 0, result.wishZ || 0);
      if (result.moveX !== undefined && result.useMove) [p.axes[0], p.axes[1]] = pastDeadZone(result.moveX, result.moveZ);
      setB(6, (result.footL || 0) > 0.5 || result.footLPressed, Math.max(result.footL || 0, result.footLPressed ? 1 : 0));
      setB(7, (result.footR || 0) > 0.5 || result.footRPressed, Math.max(result.footR || 0, result.footRPressed ? 1 : 0));
      setB(0, result.hop || result.hopPressed);
      setB(2, result.flail);
      setB(5, result.breathe);
      driving = true;
    } else if (driving) {
      // When a bot stops, zero the pad: a stick left pushed scrolls every menu.
      driving = false;
      p.axes[0] = 0; p.axes[1] = 0;
      for (const i of [0, 2, 5, 6, 7]) setB(i, false);
    }
  };
  let makeTestBot = null;
  import('../input/bot.js').then((m) => { makeTestBot = m.makeBot; });

  const api = {
    game, THREE, tun, resetTuning, RAPIER,
    get settings() { return game.save.settings; },
    get tuning() { return tun; },
    REVISION: THREE.REVISION,
    rapierVersion: () => RAPIER.version(),
    advance(seconds) { game.loop.advance(seconds); return api.state(); },
    bot(skill) {
      botSkill = skill;
      if (!skill) {
        const p = pad();
        p.axes.fill(0);
        for (const b of p.buttons) { b.pressed = false; b.value = 0; }
      }
      return skill;
    },
    goto(screen, args) { flowGoto(game, screen, args); return api.state(); },
    press(i, on = true) { const p = pad(); p.buttons[i].pressed = on; p.buttons[i].value = on ? 1 : 0; },
    /** Tap a pad button through the real input path: down for two ticks, up for two. */
    tap(i) { const p = pad(); p.buttons[i].pressed = true; p.buttons[i].value = 1; game.loop.advance(FIXED_DT * 3); p.buttons[i].pressed = false; p.buttons[i].value = 0; game.loop.advance(FIXED_DT * 3); return api.state(); },
    stick(x, z) { const p = pad(); p.axes[0] = x; p.axes[1] = z; },
    renderProbe,
    setSeed(n) { botSeed = n; setSeed(n); },
    state() {
      const ev = game.currentEvent;
      const pr = game.save.profile;
      const top = game.ui && game.ui.top;
      const a = game.audio;
      return {
        screen: top ? top.name : game.modeName,
        mode: game.modeName,
        stack: game.ui ? game.ui.stack.map((s) => s.name) : [],
        focus: top ? top.focus : -1, items: top ? top.items.length : 0,
        attract: game.attract,
        paused: game.paused,
        day: pr ? pr.today.day : 0,
        step: pr ? pr.stepsDone : 0,
        totalSteps: game.programme.totalSteps,
        profile: pr ? pr.name : null,
        marbles: pr ? pr.marbles : 0,
        stamps: pr ? pr.stamps.length : 0,
        levelled: pr ? pr.levelled : false,
        checkin: pr ? pr.today.checkin : false,
        done: pr ? pr.today.done.slice() : [],
        tilt: game.phys ? game.phys.tiltDeg : 0,
        rest: game.phys ? game.phys.restNow : 0,
        wobbleAge: pr ? pr.today.age : null,
        ages: pr ? pr.ages.map((x) => x.age) : [],
        speech: game.speech && game.speech.line ? game.speech.line.text : null,
        stage: game.mode && game.mode.stage,
        event: ev ? {
          id: ev.constructor.id, tier: ev.tier, phase: ev.phase, t: ev.t, bodies: ev.bodies(),
          lanes: ev.lanes.map((l) => ({
            kind: l.kind, name: l.name, leanX: l.bal ? l.bal.leanX : 0, leanZ: l.bal ? l.bal.leanZ : 0, cob: [l.cobX, l.cobZ], fallen: l.fallen, falls: l.falls,
            form: ev.laneResult(l).form, raw: ev.laneResult(l).raw, props: l.props.length, device: l.input.device, wish: [l.input.wishX, l.input.wishZ], footL: l.input.footL, footR: l.input.footR,
          })),
        } : null,
        results: game.mode && game.mode.results ? game.mode.results.map((r) => ({ name: r.lane.name, form: r.form, raw: r.raw, big: r.big })) : null,
        input: { lastDevice: game.input.lastDevice, glyphSet: game.save.settings.glyphs, idle: game.input.idle, lastRumble: game.input.lastRumble },
        audio: { state: a.state, music: a.mix ? a.mix.levels.music : 0, sfx: a.mix ? a.mix.levels.sfx : 0, voice: a.mix ? a.mix.levels.voice : 0, musicSetting: game.save.settings.music, track: a.musicId, detune: a.detuneNow(), tiltDeg: a.tiltDeg },
        render: { backend: game.backend, frames: game.frames, lost: game.renderLost, mixer: game.currentEvent && game.currentEvent.lanes[0] && game.currentEvent.lanes[0].doll ? game.currentEvent.lanes[0].doll.rig.time : 0, clip: game.currentEvent && game.currentEvent.lanes[0] && game.currentEvent.lanes[0].doll ? game.currentEvent.lanes[0].doll.rig.currentName : null },
        errors: game.errors.slice(),
      };
    },
    startEvent(id, tier = 0, opts = {}) { flowGoto(game, 'event', { id, tier, ...opts }); return api.state(); },
    EVENTS, EVENT_CLASSES,
  };
  window.__TEST__ = api;
}
