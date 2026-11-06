// Dev Tools: reached from pause. 10-foot legible, fully controller-driven, tabs with L1/R1.
import { App } from '../../app.js';
import { changedTunables, nudgeTunable, resetTunables, T, TUNABLE_DEFS, TUNABLE_TABS } from '../../core/tunables.js';
import { SKILL_NAMES } from '../../core/drivers.js';
import { ACTIVITIES, ACTIVITY_IDS } from '../../data/activities.js';
import { Menu } from '../menu.js';
import { heading } from '../widgets.js';
import { promptBar } from '../prompts.js';
import { dim, TabBar } from './common.js';
import { DialogueScreen } from '../dialogue.js';
import { SoundTestScreen } from './soundtest.js';
import { allLines } from '../../data/alllines.js';
import { SONGS } from '../../audio/songs.js';

const fmt = (v) => (Math.abs(v) >= 10 ? String(Math.round(v * 10) / 10) : String(Math.round(v * 1000) / 1000));
const TOOL_SCENES = ['title', 'hub', 'weighin', 'report', 'locker', 'records', 'jar', 'ferry', 'ending', 'join', 'viewer'];
const AUTOPILOT = ['off', ...SKILL_NAMES];

export class DevScreen {
  name = 'dev';
  freezes = false;
  starPick = 3;
  sceneI = 1;
  activityI = 0;
  dayPick = 1;
  lineI = 0;

  constructor() {
    this.tabs = new TabBar([...TUNABLE_TABS, 'Tools'], { onChange: () => this.refresh() });
    this.menu = new Menu([], { y: 54, width: 456, maxRows: 8, tabbed: true, onBack: () => App.stack.pop(this) });
    this.refresh();
    this.lines = allLines();
    this.dayPick = App.slot?.day ?? 1;
  }

  refresh() {
    this.menu.focus = 0; this.menu.top = 0;
    const tab = this.tabs.current;
    this.menu.setItems(tab === 'Tools' ? this.toolItems() : this.sliderItems(tab));
  }

  sliderItems(tab) {
    const items = TUNABLE_DEFS.filter((d) => d.tab === tab).map((d) => ({
      label: d.label, id: d.id,
      value: () => `${fmt(T[d.id])} (${fmt(d.def)})`,
      adjust: (dir) => nudgeTunable(d, dir),
      slider: { get: () => T[d.id], set: (v) => { T[d.id] = Math.round(Math.min(d.max, Math.max(d.min, Math.round(v / d.step) * d.step)) * 1000) / 1000; }, min: d.min, max: d.max },
      action: () => nudgeTunable(d, 1),
      sound: 'menuMove',
    }));
    items.push(
      { label: 'Reset this tab', id: 'resetTab', action: () => resetTunables(tab) },
      { label: 'Reset everything', id: 'resetAll', action: () => resetTunables() },
      { label: 'Export changes', id: 'export', action: () => this.exportValues() },
    );
    return items;
  }

  exportValues() {
    const json = JSON.stringify(changedTunables(), null, 2);
    this.exported = json;
    console.log(`[We Fit In tunables] ${json}`);
    try { globalThis.navigator?.clipboard?.writeText?.(json)?.catch?.(() => {}); } catch { /* not allowed */ }
    App.say('ounce', 'Exported. Paste it into the data. I have kept a copy, for my records.');
  }

  toolItems() {
    const onOff = (v) => (v ? 'On' : 'Off');
    const toggle = (label, id, get, set) => ({ label, id, value: () => onOff(get()), action: () => set(!get()), adjust: () => set(!get()) });
    return [
      { label: 'Go to day', id: 'day', value: () => `${this.dayPick}`, adjust: (d) => { this.dayPick = ((this.dayPick - 1 + d + 7) % 7) + 1; }, action: () => this.goDay() },
      { label: 'Go to scene', id: 'scene', value: () => TOOL_SCENES[this.sceneI], adjust: (d) => { this.sceneI = (this.sceneI + d + TOOL_SCENES.length) % TOOL_SCENES.length; }, action: () => this.goScene() },
      { label: 'Go to activity', id: 'activity', value: () => ACTIVITIES[ACTIVITY_IDS[this.activityI]].name, adjust: (d) => { this.activityI = (this.activityI + d + ACTIVITY_IDS.length) % ACTIVITY_IDS.length; }, action: () => this.goActivity() },
      { label: 'Finish with stars', id: 'finish', value: () => `${this.starPick}`, adjust: (d) => { this.starPick = (this.starPick + d + 4) % 4; }, action: () => this.finishNow() },
      { label: 'Give 50 Drips', id: 'drips', action: () => this.giveDrips() },
      toggle('Unlock all', 'unlock', () => App.dev.allUnlocked, (v) => { App.dev.allUnlocked = v; }),
      { label: 'Autopilot', id: 'autopilot', value: () => App.dev.autopilot ?? 'off', adjust: (d) => this.cycleAuto(d), action: () => this.cycleAuto(1) },
      toggle('God mode', 'god', () => App.dev.god, (v) => { App.dev.god = v; }),
      { label: 'Time scale', id: 'timescale', value: () => `${App.dev.timeScale}`, adjust: (d) => { App.dev.timeScale = Math.max(0.25, Math.min(3, App.dev.timeScale + d * 0.25)); }, action: () => { App.dev.timeScale = App.dev.timeScale >= 3 ? 0.25 : App.dev.timeScale + 0.25; } },
      toggle('Overlay', 'overlay', () => App.dev.overlay, (v) => { App.dev.overlay = v; }),
      toggle('Hide HUD', 'hideHud', () => App.dev.hideHud, (v) => { App.dev.hideHud = v; }),
      toggle('Free camera', 'freeCam', () => App.dev.freeCam, (v) => this.setFreeCam(v)),
      { label: 'Dialogue tester', id: 'dialogue', value: () => `${this.lineI + 1}/${this.lines?.length ?? 0}`, adjust: (d) => { this.lineI = (this.lineI + d + this.lines.length) % this.lines.length; }, action: () => App.stack.push(new DialogueScreen([this.lines[this.lineI]])) },
      { label: 'Sound test', id: 'sound', right: () => `${Object.keys(SONGS).length} songs`, action: () => App.stack.push(new SoundTestScreen()) },
      { label: 'Animation viewer', id: 'anim', action: () => App.go('viewer') },
      { label: 'Reset save', id: 'resetSave', action: () => { App.store.resetAll(); App.go('title'); } },
    ];
  }

  cycleAuto(d) {
    const i = AUTOPILOT.indexOf(App.dev.autopilot ?? 'off');
    const next = AUTOPILOT[(i + d + AUTOPILOT.length) % AUTOPILOT.length];
    App.dev.autopilot = next === 'off' ? null : next;
  }

  ensureSlot() {
    if (App.slot) return App.slot;
    App.store.create(0, 'Guest', undefined);
    return App.slot;
  }

  goDay() {
    const slot = this.ensureSlot();
    slot.day = this.dayPick;
    slot.phase = 'morning';
    App.store.write();
    this.closeAll();
    App.go('weighin');
  }

  goScene() { const id = TOOL_SCENES[this.sceneI]; if (['hub', 'weighin', 'report', 'locker', 'records', 'jar', 'ferry', 'ending'].includes(id)) this.ensureSlot(); this.closeAll(); App.go(id); }
  goActivity() { this.closeAll(); App.go('activity', { id: ACTIVITY_IDS[this.activityI], mode: App.slot ? 'week' : 'dropin', noPractice: true }); }

  finishNow() {
    const s = App.scene;
    if (s?.devFinish) { this.closeAll(); s.devFinish(this.starPick); } else App.say('ounce', 'There is nothing to finish here. I checked.');
  }

  giveDrips() {
    const slot = this.ensureSlot();
    slot.drips += 50;
    import('../../core/week.js').then(({ awardMilestones }) => { awardMilestones(slot); App.store.write(); });
  }

  setFreeCam(on) {
    App.dev.freeCam = on;
    const engine = App.engine;
    if (on) engine.setCamera({ preset: 'free' }, { syncUrl: false });
    else engine.setCamera(App.scene?.cameraConfig?.() ?? { preset: 'iso' }, { syncUrl: false });
  }

  closeAll() {
    App.stack.clear();
    App.engine.timeScale = App.dev.timeScale;
  }

  update(ctx, dt) { this.tabs.update(ctx, { wheel: this.menu.items.length <= this.menu.visibleRows() }); this.menu.update(ctx, dt); }

  draw(ctx) {
    const { hud } = ctx;
    dim(hud);
    heading(hud, 'Dev Tools');
    this.tabs.draw(ctx, 35);
    this.menu.draw(ctx);
    promptBar(hud, App.device, [['adjust', 'Change'], ['confirm', 'Use'], ['tabs', 'Tab'], ['back', 'Back']]);
  }
}
