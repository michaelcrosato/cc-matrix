/**
 * @file Dev Mode, from the pause menu: live sliders for every numeric `game.*` setting with Reset per group and for all, jumps to
 * any day, activity or finale step, finish at a rank, cheats, and the tools: time scale, frame step, free camera, a state
 * overlay, a new seed, and copying the tuned settings as JSON. Works with pad, keyboard and mouse. Absent in hub sessions.
 */
import { BOARD, RANKS } from '../../scenes/data/days';
import { GAME_NUMBERS } from '../../scenes/settings';
import { closer, type Ctx, type Screen } from '../ctx';
import { ACTIVITY_TITLES } from '../titles';

interface DevRow {
  label: string;
  value?: () => string;
  slide?: { path: string; min: number; max: number };
  change?: (dir: number) => void;
  pick?: () => void;
}

const round3 = (v: number) => Math.round(v * 1000) / 1000;

/** Overlay state, kept between openings. */
let overlay: HTMLElement | null = null;

export function updateDevOverlay(ctx: Ctx): void {
  if (!overlay) return;
  const flow = ctx.flow();
  const seat = (
    ctx.inspector.state('seat').entities[0] as unknown as
      { wobble: { x: number; y: number; calm: number; sync: number } } | undefined
  )?.wobble;
  const island = (
    ctx.inspector.state('island').entities[0] as unknown as { island: { tiltX: number; tilt: number } } | undefined
  )?.island;
  overlay.textContent = `CoB ${seat?.x.toFixed(2)}, ${seat?.y.toFixed(2)}\ncalm ${seat?.calm.toFixed(2)} sync ${seat?.sync.toFixed(2)}\ntilt ${island?.tiltX.toFixed(1)} / ${island?.tilt.toFixed(1)}\n${flow.ev?.id ?? flow.mode} ${flow.ev?.phase ?? ''}\ntick ${ctx.inspector.info().tick}\n${ctx.inspector.hash().slice(0, 12)}`;
}

/** The dev panel. */
export function devScreen(ctx: Ctx): Screen {
  const el = document.createElement('div');
  el.className = 'wt-dev';
  el.dataset.ui = 'dev';
  const tabs = document.createElement('div');
  tabs.className = 'tabs';
  const list = document.createElement('div');
  list.className = 'rows';
  el.append(tabs, list);
  ctx.root.append(el);
  const { inspector } = ctx;
  const defaultOf = (path: string) => GAME_NUMBERS[path as keyof typeof GAME_NUMBERS].default;
  const tuned: Record<string, number> = ((window as unknown as { __wtDev?: Record<string, number> }).__wtDev ??= {});
  const valueOf = (path: string) => tuned[path] ?? defaultOf(path);
  const setValue = (path: string, value: number) => {
    tuned[path] = value;
    inspector.set(path, value);
  };
  const groups = [...new Set(Object.keys(GAME_NUMBERS).map((p) => p.split('.')[1]))];
  const sliders = (): DevRow[] => {
    const rows: DevRow[] = [
      {
        label: 'Reset all to defaults',
        pick: () => Object.keys(GAME_NUMBERS).forEach((p) => setValue(p, defaultOf(p))),
      },
    ];
    for (const group of groups) {
      const paths = Object.keys(GAME_NUMBERS).filter((p) => p.split('.')[1] === group);
      rows.push({ label: `Reset ${group}`, pick: () => paths.forEach((p) => setValue(p, defaultOf(p))) });
      for (const path of paths) {
        const spec = GAME_NUMBERS[path as keyof typeof GAME_NUMBERS];
        rows.push({
          label: path.replace('game.', ''),
          slide: { path, min: spec.minimum, max: spec.maximum },
          value: () => String(round3(valueOf(path))),
        });
      }
    }
    return rows;
  };
  const go = (fn: () => void) => () => {
    ctx.clear();
    inspector.resume(); // a jump leaves the pause menu behind, so nothing else would
    fn();
  };
  const jumps = (): DevRow[] => [
    ...[1, 2, 3, 4, 5].map((day) => ({ label: `Day ${day}`, pick: go(() => ctx.run('game.day', { day })) })),
    ...[...BOARD, 'tilt'].map((id) => ({
      label: ACTIVITY_TITLES[id] ?? id,
      pick: go(() => ctx.run('game.start', { id })),
    })),
    { label: 'Finale: the Centre Stone', pick: go(() => ctx.run('game.start', { id: 'tilt', only: 'stone' })) },
    ...RANKS.map((rank) => ({
      label: `Finish now: ${rank.name}`,
      pick: go(() => ctx.run('game.finishAt', { score: rank.floor + 1 })),
    })),
  ];
  const flow = () => ctx.flow();
  const cheats = (): DevRow[] => [
    { label: 'Bot plays for me', value: () => (flow().bot ? 'On' : 'Off'), pick: () => ctx.run('game.bot', { skill: flow().bot ? '' : 'perfect' }) },
    { label: 'No topple', value: () => (flow().noTopple ? 'On' : 'Off'), pick: () => ctx.run('game.flags', { noTopple: !flow().noTopple }) },
    { label: 'Unlock all', pick: () => ctx.run('game.flags', { pebbles: Math.max(flow().pebbles, 40), free: true, bests: Object.fromEntries(BOARD.map((id) => [id, 1])) }) },
    { label: 'Give 10 pebbles', pick: () => ctx.run('game.flags', { pebbles: flow().pebbles + 10 }) },
    { label: 'Reset save', pick: () => ctx.store.remove('game') },
    { label: 'Throwaway save (no writes)', value: () => ((window as unknown as { __wtSandbox?: boolean }).__wtSandbox ? 'On' : 'Off'), pick: () => { const w = window as unknown as { __wtSandbox?: boolean }; w.__wtSandbox = !w.__wtSandbox; } },
  ]; // prettier-ignore
  let scale = 1;
  let fly = false;
  const tools = (): DevRow[] => [
    { label: 'Time scale', value: () => String(scale), pick: () => { scale = scale === 1 ? 4 : scale === 4 ? 0.25 : 1; inspector.timeScale(scale); } },
    { label: 'Frame step', pick: () => void inspector.step(1) },
    { label: 'Free camera', value: () => (fly ? 'On' : 'Off'), pick: () => { fly = !fly; (inspector as unknown as { camera: { set(code: string, o?: object): unknown } }).camera.set(fly ? 'cam3=fly' : 'cam3=chase', { blend: true }); (window as unknown as { __wtFly?: boolean }).__wtFly = fly; } },
    { label: 'State overlay', value: () => (overlay ? 'On' : 'Off'), pick: () => { if (overlay) { overlay.remove(); overlay = null; } else { overlay = document.createElement('div'); overlay.className = 'wt-overlay'; overlay.dataset.ui = 'dev-overlay'; ctx.root.append(overlay); } } },
    { label: 'New seed', value: () => String(inspector.seed()), pick: go(() => { inspector.seed(inspector.seed() + 1); }) },
    { label: 'Copy tuned settings', pick: () => void navigator.clipboard?.writeText(JSON.stringify(tuned, null, 1)).catch(() => undefined) },
  ]; // prettier-ignore
  const TABS: [string, () => DevRow[]][] = [
    ['Sliders', sliders],
    ['Jumps', jumps],
    ['Cheats', cheats],
    ['Tools', tools],
  ];
  let tab = 0;
  let at = 0;
  let rows: DevRow[] = [];
  const VISIBLE = 13;
  let top = 0;
  let hovering = false;
  const paint = () => {
    tabs.textContent = '';
    TABS.forEach(([name], i) => {
      const t = document.createElement('div');
      t.className = 'tab';
      t.dataset.on = i === tab ? '1' : '0';
      t.textContent = name;
      t.addEventListener('click', () => { tab = i; at = 0; build(); }); // prettier-ignore
      tabs.append(t);
    });
    list.textContent = '';
    if (!hovering)
      top = Math.max(0, Math.min(rows.length - VISIBLE, at < top ? at : at >= top + VISIBLE ? at - VISIBLE + 1 : top));
    hovering = false;
    const start = top;
    rows.slice(start, start + VISIBLE).forEach((row, k) => {
      const i = start + k;
      const node = document.createElement('div');
      node.className = 'drow';
      node.dataset.focus = i === at ? '1' : '0';
      const label = document.createElement('span');
      label.textContent = row.label;
      node.append(label);
      if (row.slide) {
        const { path, min, max } = row.slide;
        const range = document.createElement('input');
        range.type = 'range';
        range.min = String(min);
        range.max = String(max);
        range.step = String((max - min) / 100);
        range.value = String(valueOf(path));
        range.dataset.path = path;
        range.addEventListener('input', () => { setValue(path, Number(range.value)); paintValue(); }); // prettier-ignore
        node.append(range);
      } else node.append(document.createElement('span'));
      const value = document.createElement('span');
      value.className = 'dval';
      value.textContent = row.value?.() ?? '';
      node.append(value);
      node.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse' && at !== i) { at = i; hovering = true; paintFocus(); } }); // prettier-ignore
      node.addEventListener('click', (event) => { if (!(event.target instanceof HTMLInputElement)) { row.pick?.(); paint(); } }); // prettier-ignore
      list.append(node);
    });
  };
  const paintFocus = () => paint();
  const paintValue = () => {
    list.querySelectorAll<HTMLElement>('.drow').forEach((node) => {
      const input = node.querySelector('input');
      const v = node.querySelector('.dval');
      if (input && v) v.textContent = String(round3(Number(input.value)));
    });
  };
  const build = () => {
    rows = TABS[tab][1]();
    paint();
  };
  build();
  return {
    el,
    update() {
      const input = ctx.nav;
      if (input.pressed('uiUp')) { at = (at + rows.length - 1) % rows.length; paint(); } // prettier-ignore
      if (input.pressed('uiDown')) { at = (at + 1) % rows.length; paint(); } // prettier-ignore
      const dir = input.pressed('uiRight') ? 1 : input.pressed('uiLeft') ? -1 : 0;
      if (dir) {
        const row = rows[at];
        if (row?.slide) {
          const { path, min, max } = row.slide;
          setValue(path, Math.max(min, Math.min(max, valueOf(path) + (dir * (max - min)) / 40)));
          paint();
        } else {
          tab = (tab + dir + TABS.length) % TABS.length;
          at = 0;
          build();
        }
      }
      if (input.pressed('uiAccept')) { rows[at]?.pick?.(); if (ctx.stack.length) build(); } // prettier-ignore
      if (input.pressed('uiCancel')) ctx.pop();
    },
    close: closer(el),
  };
}
