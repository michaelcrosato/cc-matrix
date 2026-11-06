// Dev mode: live sliders with reset and export, plus the Tools tab. 10-foot, fully pad-driven.
import { App, ATTRACT_PLAYLIST } from '../../app.js';
import { CLIP_NAMES } from '../../art/clips.js';
import { SFX_DEFS } from '../../audio/sfx.js';
import { SONGS } from '../../audio/songs.js';
import { SPEAKERS } from '../../audio/voice.js';
import { ACTIONS } from '../../core/actions.js';
import { checkMilestones, totalStars } from '../../core/progress.js';
import { changedTunables, resetTunables, setTunable, T, TUNABLE_TABS, TUNABLES } from '../../core/tunables.js';
import { ACTIVITIES } from '../../data/activities.js';
import { ACTIVITY_LINES, BARKS, QUESTIONS, STORY } from '../../data/lines.js';
import { talk } from '../dialogue.js';
import { center, say } from '../font.js';
import { Menu } from '../menu.js';
import { promptBar } from '../prompts.js';
import { WEEK } from '../../data/week.js';

export function allLines() {
  const out = [];
  for (const v of Object.values(ACTIVITY_LINES)) out.push(...Object.values(v));
  const walk = (o) => { if (typeof o === 'string') out.push(o); else if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.text) out.push(o.text); else Object.values(o).forEach(walk); } };
  walk(BARKS); walk(STORY); for (const q of QUESTIONS) out.push(q.q, ...q.a, ...q.r);
  return out;
}
const TABS = [...TUNABLE_TABS, 'Tools'];
const SKILLS = ['off', 'idle', 'sloppy', 'average', 'good', 'expert'];
const JUMPS = [...ACTIVITIES.map((a) => ['activity', { id: a.id, mode: 'dropin' }, a.name]), ['hub', {}, 'Island'], ['weighin', {}, 'Weigh-In'], ['report', {}, 'Evening Report'], ['ferry', {}, 'Ferry'], ['ending', {}, 'Ending'], ['jar', {}, 'Sweat Jar'], ['records', {}, 'Hall of Numbers'], ['locker', {}, 'Locker Room'], ['join', {}, 'Family Hour'], ['title', {}, 'Title']];
void ATTRACT_PLAYLIST;
export class DevScreen {
  id = 'dev'; tab = 0; attractable = false; day = 1; jump = 0; speed = 1; skill = 0; lineI = 0; soundKind = 0; soundI = 0; clip = 0; msg = '';
  constructor() { this.day = App.slot?.day ?? 1; this.speed = App.devTimeScale; this.skill = Math.max(0, SKILLS.indexOf(App.devDriver ?? 'off')); this.rebuild(); }
  rebuild() {
    const name = TABS[this.tab];
    let items;
    if (name === 'Tools') items = this.toolItems();
    else {
      items = TUNABLES.filter((r) => r.tab === name).map((r) => ({ label: r.label, tun: r, value: () => `${+T[r.key].toFixed(3)} (${r.def})`, slider: { get: () => T[r.key], min: r.min, max: r.max, set: (v) => { setTunable(r, v); this.apply(r); } }, adjust: (d) => { setTunable(r, T[r.key] + d * r.step); this.apply(r); } }));
      items.push({ label: 'Reset this tab', on: () => { resetTunables(name); App.persistTunables(); this.msg = 'Tab reset.'; } });
      items.push({ label: 'Reset everything', on: () => { App.resetAllTunables(); this.msg = 'Everything reset.'; } });
      items.push({ label: 'Export changed values', on: () => this.exportValues() });
    }
    items.push({ label: 'Close', on: () => App.close(this) });
    const keepTop = this.menu?.top;
    this.menu = new Menu({ title: `Dev: ${name}`, items, onBack: () => App.close(this), scale: 1, rowH: 14, maxRows: 8, w: 400 });
    void keepTop;
  }
  apply(r) { if (r.key === 'mouseLeanRadius') App.settings.mouseRadius = T.mouseLeanRadius; if (r.key === 'stepOffsetMs') App.settings.stepOffset = T.stepOffsetMs; App.persistTunables(); }
  exportValues() {
    const json = JSON.stringify(changedTunables(), null, 2);
    console.log(json); this.lastExport = json;
    try { navigator.clipboard?.writeText(json).catch(() => {}); } catch { /* not allowed */ }
    this.msg = 'Printed to the console. Copied if allowed.';
  }
  soundList() { return [Object.keys(SONGS), Object.keys(SFX_DEFS), Object.keys(SPEAKERS)][this.soundKind]; }
  toolItems() {
    const scene = () => App.scene;
    const cycle = (k, len, d) => { this[k] = (this[k] + d + len) % len; };
    return [
      { label: 'Go to day', value: () => this.day, adjust: (d) => { this.day = Math.max(1, Math.min(WEEK.length, this.day + d)); }, on: () => { const s = App.slot; if (s) { s.day = this.day; s.phase = 'free'; s.dayIntroDone = 0; App.writeSave(); App.go('hub'); } else this.msg = 'No guest loaded. Start a week first.'; } },
      { label: 'Jump to', value: () => JUMPS[this.jump][2], adjust: (d) => cycle('jump', JUMPS.length, d), on: () => App.go(JUMPS[this.jump][0], JUMPS[this.jump][1]) },
      ...[0, 1, 2, 3].map((n) => ({ label: `Finish activity: ${n} stars`, on: () => { if (scene()?.forceFinish && !scene().finished) { App.close(this); App.close(App.top()); App.resume(); scene().forceFinish(n); } else this.msg = 'Not in an activity.'; } })),
      { label: 'Give 50 Drips', on: () => { const s = App.slot; if (s) { s.drips += 50; checkMilestones(s); App.writeSave(); this.msg = `Drips ${s.drips}.`; } else this.msg = 'No guest loaded.'; } },
      { label: 'Unlock all', on: () => { const s = App.slot; if (s) { s.week = Math.max(2, s.week); App.writeSave(); this.msg = 'Everything is open.'; } else this.msg = 'No guest loaded. Drop-In is all open.'; } },
      { label: 'Autopilot', value: () => SKILLS[this.skill], adjust: (d) => { cycle('skill', SKILLS.length, d); App.setDriver(this.skill ? SKILLS[this.skill] : null); } },
      { label: 'God mode', value: () => (App.god ? 'On' : 'Off'), adjust: () => { App.god = !App.god; }, on: () => { App.god = !App.god; } },
      { label: 'Time scale', value: () => this.speed, adjust: (d) => { const l = [0.25, 0.5, 1, 1.5, 2, 3]; let i = l.indexOf(this.speed); i = Math.max(0, Math.min(l.length - 1, i + d)); this.speed = l[i]; App.devTimeScale = this.speed; } },
      { label: 'Overlay', value: () => (App.overlayDebug ? 'On' : 'Off'), adjust: () => { App.overlayDebug = !App.overlayDebug; }, on: () => { App.overlayDebug = !App.overlayDebug; } },
      { label: 'Hide HUD (pause restores it)', value: () => (App.hudHidden ? 'On' : 'Off'), on: () => { App.hudHidden = !App.hudHidden; } },
      { label: 'Free camera', value: () => (App.freeCam ? 'On' : 'Off'), on: () => { App.freeCam = !App.freeCam; App.engine.setCamera(App.freeCam ? { preset: 'free' } : (scene()?.camera?.() ?? { preset: 'iso' }), { syncUrl: false }); } },
      { label: 'Dialogue tester', value: () => `${this.lineI + 1}`, adjust: (d) => cycle('lineI', allLines().length, d), on: () => { talk([{ who: ['ounce', 'coach', 'marguerite', 'dennis', 'june'][this.lineI % 5], text: allLines()[this.lineI] }]); } },
      { label: 'Sound kind', value: () => ['Song', 'SFX', 'Speaker'][this.soundKind], adjust: (d) => { cycle('soundKind', 3, d); this.soundI = 0; } },
      { label: 'Sound test', value: () => this.soundList()[this.soundI], adjust: (d) => cycle('soundI', this.soundList().length, d), on: () => { const n = this.soundList()[this.soundI]; if (this.soundKind === 0) App.music(n); else if (this.soundKind === 1) App.sfx(n); else App.say('Thank you. I have written that down.', n); App.lastSound = n; } },
      { label: 'Animation viewer', value: () => CLIP_NAMES[this.clip], adjust: (d) => cycle('clip', CLIP_NAMES.length, d), on: () => { App.go('viewer', { clip: this.clip }); } },
      { label: 'Reset save', on: () => { App.save.wipe(); App.slotIndex = null; App.go('title'); } },
    ];
  }
  update(ctx, dt) {
    const i = ctx.input;
    let d = 0;
    if (i.wasPressed('PadL1', 'KeyQ')) d = -1;
    if (i.wasPressed('PadR1', 'KeyE')) d = 1;
    if (d) { this.tab = (this.tab + d + TABS.length) % TABS.length; this.rebuild(); App.sfx('menuMove'); return; }
    this.menu.update(ctx, dt);
    void ACTIONS; void totalStars;
  }
  draw(hud) {
    const w = this.menu.draw(hud);
    hud.rect(0, 0, hud.width, 12, 'ink');
    TABS.forEach((t, k) => { const x = 12 + k * Math.floor((hud.width - 24) / TABS.length); say(hud, x, 3, t.slice(0, Math.floor((hud.width - 24) / TABS.length / 6) - 1), { color: k === this.tab ? 'sand' : 'white' }); });
    if (this.msg) center(hud, w.y + w.h + 3, this.msg, { color: 'sand' });
    promptBar(hud, [['tabs', 'Tab'], ['adjust', 'Change'], ['back', 'Back']]);
  }
}
