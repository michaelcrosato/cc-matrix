/** @file Native input bindings, PlayStation-first glyphs and keyboard/pad menu navigation. */
import { defineActionMap, getActionMap } from '../../../engine';
import type { Context } from './context';
const actions = {
  forward: ['KeyW', 'ArrowUp', 'PadLeftStickUp'],
  back: ['KeyS', 'ArrowDown', 'PadLeftStickDown'],
  left: ['KeyA', 'ArrowLeft', 'PadLeftStickLeft'],
  right: ['KeyD', 'ArrowRight', 'PadLeftStickRight'],
  jump: ['Space', 'PadSouth'],
  crouch: ['KeyC', 'PadEast'],
  sprint: ['ShiftLeft', 'PadLeftStick'],
  interact: ['KeyE', 'PadWest'],
  reload: ['KeyR', 'Hold:PadWest'],
  fire: ['MouseLeft', 'PadRightTrigger'],
  aim: ['MouseRight', 'PadLeftTrigger'],
  weapon1: ['Digit1'],
  weapon2: ['Digit2'],
  weapon3: ['Digit3'],
  swap: ['PadNorth', 'WheelDown'],
  previous: ['WheelUp'],
  holster: ['KeyX', 'Hold:PadNorth'],
  melee: ['KeyV', 'PadRightStick'],
  throw: ['KeyG', 'PadRightShoulder'],
  frag: ['KeyJ', 'Hold:PadRightShoulder'],
  heal: ['KeyH', 'PadLeftShoulder'],
  pill: ['KeyP', 'PadLeft'],
  map: ['KeyM', 'PadUp'],
  locator: ['KeyB', 'PadDown'],
  quickfire: ['KeyF', 'PadRight'],
  ledger: ['KeyL', 'PadSelect'],
  viewCamera: ['KeyT', 'Hold:PadSelect'],
  seat: ['KeyQ'],
};
defineActionMap('actionMap:field', {
  description: 'Controller-first mercenary controls with direct pointer-locked mouse look.',
  actions,
  view: ['ledger', 'viewCamera'],
  look: true,
  aimWith: 'centre',
  lock: true,
});
defineActionMap('actionMap:field-use', {
  description: 'Contextual held use for repairs and revives.',
  actions: { ...actions, reload: ['KeyR'] },
  view: ['ledger', 'viewCamera'],
  look: true,
  aimWith: 'centre',
  lock: true,
});
defineActionMap('actionMap:field-drive', {
  description: 'Driving with triggers or WASD, with a free look.',
  actions: {
    ...actions,
    throttle: ['KeyW', 'PadRightTrigger'],
    brake: ['KeyS', 'PadLeftTrigger'],
    driveLeft: ['KeyA', 'PadLeftStickLeft'],
    driveRight: ['KeyD', 'PadLeftStickRight'],
    handbrake: ['Space', 'PadSouth'],
    seat: ['KeyQ', 'PadNorth'],
  },
  view: ['ledger', 'viewCamera'],
  look: true,
  aimWith: 'centre',
  lock: true,
});
for (const [id, base] of [
  ['field-map', 'field'],
  ['field-drive-map', 'field-drive'],
])
  defineActionMap(`actionMap:${id}`, {
    description: 'Walk or drive while using the paper map and its pencil.',
    actions: {
      ...getActionMap(`actionMap:${base}`).actions,
      jump: ['Space'],
      handbrake: ['Space'],
      mapMark: ['PadSouth'],
      melee: ['KeyV'],
      mapZoom: ['PadRightStick'],
      swap: ['PadNorth'],
      previous: [],
    },
    view: ['ledger', 'viewCamera', 'mapMark', 'mapZoom'],
    look: true,
    aimWith: 'centre',
    lock: false,
  });
export const PROMPTS: Record<string, [string, string, string]> = {
  interact: ['E', '□', 'X'],
  reload: ['Hold R', 'Hold □', 'Hold X'],
  heal: ['H', 'L1', 'LB'],
  pill: ['P', '◀', '◀'],
  map: ['M', '▲', '▲'],
  locator: ['B', '▼', '▼'],
  fire: ['LMB', 'R2', 'RT'],
  back: ['Esc', '○', 'B'],
  select: ['Enter', '✕', 'A'],
};
export function glyph(ctx: Context, key: string): string {
  const row = PROMPTS[key] ?? [key, key, key];
  if (ctx.device !== 'gamepad' && (key === 'back' || key === 'select')) return row[0];
  if (ctx.device !== 'gamepad' && ctx.engine?.input) {
    const bindings = ctx.engine.input.bindings,
      family = bindings.codes(key).some((c) => c.startsWith('Mouse')) ? 'mouse' : 'keyboard',
      label = bindings.label(key, family);
    if (label && label !== '—') return key === 'reload' ? `Hold ${label}` : label;
  }
  return row[ctx.device === 'gamepad' ? (ctx.glyphs === 'Xbox' ? 2 : 1) : 0];
}
export function refreshGlyphs(ctx: Context): void {
  document.querySelectorAll<HTMLElement>('[data-glyph]').forEach((el) => {
    const action = el.dataset.glyph!;
    el.textContent = glyph(ctx, action);
  });
}
export function navigation(ctx: Context, onActivity: () => void): () => void {
  let lastButtons: boolean[] = [],
    lastRepeat = 0,
    lastAxis = 0;
  const items = () =>
    [...ctx.root.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, textarea')].filter(
      (x) => x.offsetParent !== null,
    );
  const move = (by: number) => {
    const a = items();
    if (!a.length) return;
    const i = a.indexOf(document.activeElement as HTMLElement);
    a[(i + by + a.length) % a.length].focus();
    document.activeElement?.scrollIntoView({ block: 'nearest' });
  };
  const key = (e: KeyboardEvent) => {
    const wasAttract = ctx.screen === 'attract';
    onActivity();
    if (wasAttract) {
      e.preventDefault();
      return;
    }
    ctx.device = 'keyboard';
    refreshGlyphs(ctx);
    if ((e.target as HTMLElement)?.matches('input,textarea,select') && e.code !== 'Escape') return;
    if (e.code === 'Escape') {
      e.preventDefault();
      ctx.back();
      return;
    }
    if (ctx.screen === 'play' || ctx.screen === 'attract') return;
    if (['ArrowDown', 'ArrowUp'].includes(e.code)) {
      e.preventDefault();
      move(e.code === 'ArrowDown' ? 1 : -1);
    }
    if (e.code === 'Enter' && document.activeElement === document.body) items()[0]?.click();
  };
  addEventListener('keydown', key);
  const pointer = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') {
      ctx.device = 'keyboard';
      onActivity();
      refreshGlyphs(ctx);
    }
  };
  addEventListener('pointermove', pointer);
  addEventListener('pointerdown', pointer);
  const timer = setInterval(() => {
    const p = [...navigator.getGamepads()].find(Boolean);
    if (!p) return;
    const b = p.buttons.map((x) => x.pressed),
      axis = p.axes[1] ?? 0,
      active = b.some(Boolean) || p.axes.some((a) => Math.abs(a) > 0.25);
    const wasAttract = ctx.screen === 'attract';
    if (active) {
      ctx.device = 'gamepad';
      onActivity();
      document.getElementById('touch-notice')?.classList.add('dismissed');
      refreshGlyphs(ctx);
    }
    if (wasAttract && active) {
      lastButtons = b;
      lastAxis = axis;
      return;
    }
    const modal = ctx.screen !== 'play' && ctx.screen !== 'attract';
    if (modal) {
      const now = performance.now();
      if ((b[13] && !lastButtons[13]) || (axis > 0.6 && (lastAxis <= 0.6 || now - lastRepeat > 220))) {
        move(1);
        lastRepeat = now;
      }
      if ((b[12] && !lastButtons[12]) || (axis < -0.6 && (lastAxis >= -0.6 || now - lastRepeat > 220))) {
        move(-1);
        lastRepeat = now;
      }
      if (b[0] && !lastButtons[0]) {
        const el = document.activeElement as HTMLElement;
        if (ctx.root.contains(el)) el.click();
        else items()[0]?.click();
      }
      if (b[1] && !lastButtons[1]) ctx.back();
      const horizontal = (b[15] && !lastButtons[15] ? 1 : 0) - (b[14] && !lastButtons[14] ? 1 : 0);
      if (horizontal) {
        const input = document.activeElement as HTMLInputElement;
        if (input?.type === 'range') {
          input.stepUp(horizontal);
          input.dispatchEvent(new Event('input'));
        } else ctx.root.querySelector<HTMLElement>(horizontal > 0 ? '[data-next]' : '[data-prev]')?.click();
      }
    }
    if (b[9] && !lastButtons[9] && !b[8])
      if (ctx.screen === 'play') ctx.open(ctx.hubSession ? 'settings' : 'pause');
      else ctx.back();
    lastButtons = b;
    lastAxis = axis;
  }, 50);
  return () => {
    clearInterval(timer);
    removeEventListener('keydown', key);
    removeEventListener('pointermove', pointer);
    removeEventListener('pointerdown', pointer);
  };
}
export const CONTROL_PAGES = [
  [
    ['Move', 'WASD / left stick'],
    ['Look', 'Mouse / right stick'],
    ['Fire · aim', 'LMB · RMB / R2 · L2'],
    ['Jump · crouch', 'Space · C / ✕ · ○'],
    ['Use · reload', 'E · hold R / □ · hold □'],
    ['Sprint', 'Shift / L3'],
  ],
  [
    ['Weapon slots', '1 2 3 / △ cycles'],
    ['Holster', 'X / hold △'],
    ['Map · locator', 'M · B / D-pad up · down'],
    ['Pills · flare', 'P · F / D-pad left · right'],
    ['Heal · melee', 'H · V / L1 · R3'],
    ['Throw molotov', 'G / R1'],
    ['Frag grenade', 'J / hold R1'],
  ],
  [
    ['Drive', 'WASD / R2 · L2 · left stick'],
    ['Handbrake', 'Space / ✕'],
    ['Exit · mounted gun', 'E · Q / □ · △'],
    ['Repair', 'Hold use at the bonnet for 3 seconds'],
    ['Ledger · camera', 'L · T / Create · hold Create'],
    ['Pause', 'Esc / Options'],
  ],
];
