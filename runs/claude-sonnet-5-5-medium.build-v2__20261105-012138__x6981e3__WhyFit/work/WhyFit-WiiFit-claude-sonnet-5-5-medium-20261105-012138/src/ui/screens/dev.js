// Dev mode, reached from the pause menu: live balance sliders with reset/export, and a Tools tab. Fully controller-driven.
import { Menu, Tabs, panel } from '../widgets.js';
import { say, sayWrapped } from '../font.js';
import { drawPrompts } from '../prompts.js';
import { TABS, DEFS, defsOf, T, resetTab, resetAll, changed } from '../../core/tunables.js';
import { ACTIVITIES, ACT_ORDER } from '../../data/activities.js';
import { SAMPLES } from '../../data/lines.js';
import { SONGS } from '../../audio/songs.js';
import { SFX_NAMES } from '../../audio/sfx.js';
import { SPEAKERS } from '../../audio/voice.js';
import { newSlot } from '../../core/save.js';
import { clipNames } from '../../art/avatar.js';

const SPEAKER_IDS = Object.keys(SPEAKERS).filter((k) => k !== 'kevin');
const SCENES = ['title', 'hub', 'weighin', 'report', 'jar', 'locker', 'records', 'ferry', 'ending', 'join', 'animviewer'];
export class DevScreen {
  id = 'dev'; blocks = true; pauses = true; cover = true;
  constructor(app, scene) {
    this.app = app; this.scene = scene; this.tabs = new Tabs(['Balance', 'Breath', 'Rhythm', 'Games', 'Economy', 'Tools']); this.st = { day: 0, act: 0, scn: 1, stars: 3, auto: 0, scale: 1, snd: 0, sfx: 0, spk: 0, line: 0, clip: 0, song: 0 };
    this.menus = {};
    for (const tab of TABS) {
      const items = defsOf(tab).map(([, key, label, def, min, max, step]) => ({ label, kind: 'slider', min, max, step, get: () => T[key], set: (v) => { T[key] = v; }, fmt: (v) => `${+v.toFixed(3)} (${def})` }));
      items.push({ label: 'Reset this tab', onSelect: () => { resetTab(tab); app.sfx('back'); } });
      items.push({ label: 'Reset everything', onSelect: () => { resetAll(); app.sfx('back'); } });
      items.push({ label: 'Export changes (JSON)', onSelect: () => this.exportJson() });
      this.menus[tab] = new Menu(items, { w: 330, rowH: 17, maxRows: 8, name: 'dev-' + tab, y: 52, onMove: () => app.sfx('move', { volume: 0.3 }) });
    }
    this.menus.Tools = new Menu(this.toolItems(), { w: 330, rowH: 17, maxRows: 8, name: 'dev-tools', y: 52, onMove: () => app.sfx('move', { volume: 0.3 }) });
  }
  exportJson() {
    const json = JSON.stringify(changed(), null, 2); console.log('[tunables]', json); this.exported = json;
    try { navigator.clipboard?.writeText(json); } catch { /* not allowed */ }
    this.app.sfx('confirm');
  }
  sc() { return this.scene; }
  choice(label, key, options, onSelect) { return { label, kind: 'choice', options, get: () => this.st[key] % options.length, set: (i) => { this.st[key] = i; }, onSelect: onSelect }; }
  btn(label, fn) { return { label, onSelect: () => { fn(); this.app.sfx('confirm'); } }; }
  ensureSlot() { const app = this.app; if (!app.slot) { app.slot = newSlot('Dev', 0); app.slot.intro = true; app.slot.phase = 'free'; } return app.slot; }
  toolItems() {
    const app = this.app, st = this.st, S = () => this.ensureSlot();
    const closeAnd = (fn) => { this.scene.popTo(0); fn(); };
    return [
      { ...this.choice('Day', 'day', [1, 2, 3, 4, 5, 6, 7].map(String)), onSelect: () => { const s = S(); s.day = st.day + 1; s.phase = 'free'; s.doneToday = []; s.goalDone = false; closeAnd(() => app.go('hub')); } },
      { ...this.choice('Jump to activity', 'act', ACT_ORDER.map((id) => ACTIVITIES[id].name)), onSelect: () => closeAnd(() => app.go('activity', { id: ACT_ORDER[st.act % ACT_ORDER.length], dropIn: false, skipIntro: true })) },
      { ...this.choice('Jump to scene', 'scn', SCENES), onSelect: () => { S(); closeAnd(() => app.go(SCENES[st.scn % SCENES.length], {})); } },
      { ...this.choice('Finish activity with stars', 'stars', ['0', '1', '2', '3']), onSelect: () => { const sc = this.scene; if (sc.finishNow) { this.scene.popTo(0); sc.finishNow(st.stars % 4); } else app.sfx('deny'); } },
      this.btn('Give 50 Drips', () => { S().drips += 50; app.commit(); }),
      this.btn('Unlock all', () => { const s = S(); s.drips = Math.max(s.drips, 175); app.devUnlock = true; }),
      { ...this.choice('Autopilot', 'auto', ['off', 'idle', 'sloppy', 'average', 'good', 'expert']), onSelect: () => { const sc = this.scene, sk = ['local', 'idle', 'sloppy', 'average', 'good', 'expert'][st.auto % 6]; if (sc.setDriver) sc.setDriver(sk); else app.sfx('deny'); } },
      { label: 'God mode', kind: 'toggle', get: () => !!this.scene.god, set: (v) => { this.scene.god = v; app.devGod = v; } },
      { label: 'Time scale', kind: 'slider', min: 0.25, max: 3, step: 0.25, get: () => app.devTimeScale ?? 1, set: (v) => { app.devTimeScale = v; this.scene.savedScale = v; }, fmt: (v) => v + 'x' },
      { label: 'Debug overlay', kind: 'toggle', get: () => !!app.devOverlay, set: (v) => { app.devOverlay = v; } },
      { label: 'Hide HUD', kind: 'toggle', get: () => !app.ctx.hud.visible, set: (v) => { app.ctx.hud.visible = !v; app.devHideHud = v; } },
      { label: 'Free camera', kind: 'toggle', get: () => !!app.devFree, set: (v) => { app.devFree = v; try { app.engine.setCamera(v ? { preset: 'free' } : (this.scene.camera ?? this.scene.constructor.camera), { syncUrl: false }); } catch { /* */ } } },
      { ...this.choice('Dialogue tester: who', 'spk', SPEAKER_IDS), onSelect: () => {} },
      { ...this.choice('Dialogue tester: line', 'line', SAMPLES.map((l) => l.slice(0, 40))), onSelect: () => { const who = SPEAKER_IDS[st.spk % SPEAKER_IDS.length], text = SAMPLES[st.line % SAMPLES.length]; this.scene.popTo(0); app.dialogue.play([{ who, text }]); } },
      { ...this.choice('Sound test: song', 'song', Object.keys(SONGS)), onSelect: () => app.music(Object.keys(SONGS)[st.song % Object.keys(SONGS).length]) },
      { ...this.choice('Sound test: effect', 'sfx', SFX_NAMES), onSelect: () => app.sfx(SFX_NAMES[st.sfx % SFX_NAMES.length]) },
      { label: 'Sound test: speaker says hello', onSelect: () => app.speak(SPEAKER_IDS[st.spk % SPEAKER_IDS.length], 'Hello. Please step on me.') },
      { label: 'Animation viewer', onSelect: () => { S(); closeAnd(() => app.go('animviewer', {})); } },
      { label: 'Reset save', onSelect: () => { app.save.clear(); app.slot = null; app.sfx('back'); closeAnd(() => app.go('title', { menu: true })); } },
    ];
  }
  tabName() { return this.tabs.i < TABS.length ? TABS[this.tabs.i] : 'Tools'; }
  update(nav) {
    this.tabs.update(nav); if (nav.tabL || nav.tabR) nav.confirm = false;
    const name = this.tabName();
    this.menus[name].update(nav);
    if (nav.triangle && name !== 'Tools') { resetTab(name); this.app.sfx('back'); }
    if (nav.back || nav.rclick || nav.pause) { this.app.sfx('back'); this.scene.pop(); }
  }
  draw(hud) {
    const name = this.tabName(), w = hud.width;
    say(hud, 12, 10, 'Dev Tools', { scale: 2, color: 'orange', shadow: 'navy' });
    const tw = Math.min(w - 24, 380); this.tabs.draw(hud, Math.floor((w - tw) / 2), 34, tw);
    const m = this.menus[name]; m.o.x = Math.floor((w - 330) / 2); m.draw(hud);
    if (this.exported) say(hud, w / 2, hud.height - 44, 'Changes printed to the console and copied.', { anchor: 'c', color: 'lime' });
    drawPrompts(this.app, hud, name === 'Tools' ? [['tabs', 'Tab'], ['select', 'Change'], ['confirm', 'Run'], ['back', 'Close']] : [['tabs', 'Tab'], ['select', 'Adjust'], ['triangle', 'Reset tab'], ['back', 'Close']]);
  }
}
