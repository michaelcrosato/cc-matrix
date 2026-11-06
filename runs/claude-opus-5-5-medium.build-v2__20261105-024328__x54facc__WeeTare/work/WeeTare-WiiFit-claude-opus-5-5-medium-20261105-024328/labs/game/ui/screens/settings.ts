/**
 * @file Settings, paged at six rows, and Controls: every binding per scheme, keyboard rebinding through the engine's bindings.
 * Music is 10% by default. Erase Save asks in-game, never with `confirm()`.
 */
import { prompt } from '../glyphs';
import { closer, DEFAULT_SETTINGS, panel, type Ctx, type Screen } from '../ctx';
import { createRows, type Row } from '../menu';
import { confirmScreen } from './front';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const step = (v: number, dir: number, by = 0.1) => Math.round(Math.max(0, Math.min(1, v + dir * by)) * 100) / 100;

/** Settings. */
export function settingsScreen(ctx: Ctx): Screen {
  const { layer, box } = panel(ctx, 'Settings');
  layer.dataset.ui = 'settings';
  const s = ctx.settings;
  const save = () => ctx.saveSettings();
  const pebbles = () => Math.max(ctx.flow().pebbles, ctx.store.get<{ pebbles?: number }>('game', {}).pebbles ?? 0);
  const pages: Row[][] = [
    [
      { id: 'music', label: 'Music', value: () => pct(s.music), change: (d) => { s.music = step(s.music, d); ctx.sound.audio.volume('music', s.music); save(); } },
      { id: 'effects', label: 'Effects', value: () => pct(s.effects), change: (d) => { s.effects = step(s.effects, d); ctx.sound.audio.volume('effects', s.effects); save(); } },
      { id: 'voices', label: 'Voices', value: () => pct(s.voices), change: (d) => { s.voices = step(s.voices, d); ctx.sound.voices = s.voices; save(); } },
      { id: 'next1', label: 'More settings' },
      { id: 'back', label: 'Back' },
    ],
    [
      { id: 'icons', label: 'Button icons', value: () => (s.icons === 'ps' ? 'PlayStation' : 'Xbox'), change: () => { s.icons = s.icons === 'ps' ? 'xbox' : 'ps'; ctx.root.dataset.pad = s.icons; save(); } },
      { id: 'mouse', label: 'Mouse sensitivity', value: () => pct(s.mouse), change: (d) => { s.mouse = Math.max(0.2, Math.min(3, Math.round((s.mouse + d * 0.1) * 10) / 10)); save(); } },
      { id: 'invert', label: 'Invert look', value: () => (s.invert ? 'On' : 'Off'), change: () => { s.invert = !s.invert; ctx.inspector.set('input.invert', s.invert); save(); } },
      { id: 'rumble', label: 'Rumble', value: () => (s.rumble ? 'On' : 'Off'), change: () => { s.rumble = !s.rumble; save(); } },
      { id: 'next2', label: 'More settings' },
      { id: 'back', label: 'Back' },
    ],
    [
      { id: 'steadier', label: 'Steadier Hands', value: () => (s.steadier ? 'On' : 'Off'), change: () => { s.steadier = !s.steadier; ctx.run('game.flags', { steadier: s.steadier }); save(); } },
      { id: 'reduced', label: 'Reduced Motion', value: () => (s.reduced ? 'On' : 'Off'), change: () => { s.reduced = !s.reduced; save(); } },
      { id: 'fullscreen', label: 'Fullscreen', value: () => (document.fullscreenElement ? 'On' : 'Off'), change: () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.(); } },
      { id: 'erase', label: 'Erase Save' },
      { id: 'next3', label: 'More settings' },
      { id: 'back', label: 'Back' },
    ],
    [
      { id: 'suit', label: 'Tracksuit', value: () => String(s.colour + 1), change: (d) => { const n = pebbles() >= 20 ? 6 : 2; s.colour = (s.colour + d + n) % n; save(); } },
      { id: 'band', label: 'Headband', off: pebbles() < 30, value: () => (s.headband ? 'On' : 'Off'), change: () => { s.headband = !s.headband; save(); } },
      { id: 'next4', label: 'First settings' },
      { id: 'back', label: 'Back' },
    ],
  ]; // prettier-ignore
  let at = 0;
  const menu = createRows(
    box,
    pages[0],
    ctx.nav,
    (id) => {
      if (id === 'back') ctx.pop();
      else if (id.startsWith('next')) {
        at = (at + 1) % pages.length;
        menu.setRows(pages[at]);
      } else if (id === 'erase') {
        ctx.push(
          confirmScreen(ctx, 'Erase your save? The cairn, the ages and every stamp.', () => {
            ctx.store.remove('game');
            Object.assign(s, { ...DEFAULT_SETTINGS });
            ctx.sound.audio.volume('music', s.music);
            save();
            ctx.say('after', 'tare');
          }),
        );
      }
    },
    () => ctx.pop(),
  );
  return { el: layer, update: (dt) => menu.update(dt), close: closer(layer) };
}

const KEY_ACTIONS: readonly [string, string][] = [
  ['forward', 'Lean forward'],
  ['back', 'Lean back'],
  ['left', 'Lean left'],
  ['right', 'Lean right'],
  ['footl', 'Left foot'],
  ['footr', 'Right foot'],
];

/** Controls: what each verb is, and rebinding for keys. */
export function controlsScreen(ctx: Ctx): Screen {
  const { layer, box } = panel(ctx, 'Controls');
  layer.dataset.ui = 'controls';
  const note = document.createElement('div');
  note.className = 'wt-prompts';
  note.style.marginBottom = '1.2vh';
  note.innerHTML = [
    prompt('lean', 'Lean'),
    prompt('footL', 'Left'),
    prompt('footR', 'Right'),
    prompt('both', 'Breathe'),
  ].join('');
  box.append(note);
  const binds = ctx.input.bindingsFor('actionMap:balance');
  const label = (action: string) => binds.label(action, 'keyboard');
  let listening = false;
  const rows: Row[] = [
    ...KEY_ACTIONS.map(([action, title]) => ({
      id: action,
      label: title,
      value: () => (listening ? '…' : label(action)),
    })),
    { id: 'reset', label: 'Reset keys', value: () => '' },
  ];
  const shown: Row[] = rows.slice(0, 5).concat({ id: 'more', label: 'More' });
  let page = 0;
  const menu = createRows(
    box,
    shown,
    ctx.nav,
    (id) => {
      if (id === 'more') {
        page = 1 - page;
        menu.setRows(page ? rows.slice(5).concat({ id: 'more', label: 'Back to the first' }) : shown);
      } else if (id === 'reset') {
        binds.reset();
      } else if (!listening) {
        listening = true;
        void ctx.input.listen('keyboard').then((code) => {
          listening = false;
          if (!code) return;
          const old = binds
            .codes(id)
            .find((c) => !c.startsWith('Pad') && !c.startsWith('Mouse') && !c.startsWith('Arrow'));
          binds.rebind(id, code, old ? { replace: old } : undefined);
          menu.setRows(menu.rows());
        });
      }
    },
    () => {
      if (!listening) ctx.pop();
    },
  );
  return { el: layer, update: (dt) => menu.update(dt), close: closer(layer) };
}
