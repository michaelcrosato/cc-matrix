/** @file Large, paged settings and live developer controls. Slider changes take effect immediately. */
import { refreshGlyphs } from './controls';
import { TUNING } from '../scenes/settings';
import { PLACES } from '../scenes/map';
import { CONTRACTS } from '../scenes/content';
import { GUNS } from '../weapons/guns';
import { audio, setVoiceVolume } from '../sounds/page';
import { shell, button, type Context } from './context';
let settingsPage = 0,
  devPage = 1;
function slider(
  root: HTMLElement,
  label: string,
  current: number,
  min: number,
  max: number,
  step: number,
  change: (v: number) => void,
): void {
  const row = document.createElement('label');
  row.className = 'slider-row';
  const text = document.createElement('span');
  text.textContent = label;
  const output = document.createElement('output');
  output.textContent = current.toFixed(step < 0.1 ? 3 : step < 1 ? 1 : 0);
  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  input.value = String(current);
  input.setAttribute('aria-label', label);
  input.oninput = () => {
    const v = Number(input.value);
    output.textContent = v.toFixed(step < 0.1 ? 3 : step < 1 ? 1 : 0);
    change(v);
  };
  row.append(text, output, input);
  root.append(row);
}
function picker(root: HTMLElement, label: string, options: string[], value: string, onPick: (v: string) => void): void {
  const row = document.createElement('label');
  row.className = 'select-row';
  const span = document.createElement('span');
  span.textContent = label;
  const select = document.createElement('select');
  select.setAttribute('aria-label', label);
  for (const v of options) {
    const o = document.createElement('option');
    o.value = v;
    o.textContent = v;
    select.append(o);
  }
  select.value = value;
  select.onchange = () => onPick(select.value);
  row.append(span, select);
  root.append(row);
}
function pager(root: HTMLElement, index: number, names: string[], move: (n: number) => void): void {
  const nav = document.createElement('div');
  nav.className = 'pager';
  const a = button(nav, '‹', () => move((index - 1 + names.length) % names.length));
  a.dataset.prev = '';
  const span = document.createElement('span');
  span.textContent = `${names[index]} · ${index + 1} / ${names.length}`;
  nav.append(span);
  const b = button(nav, '›', () => move((index + 1) % names.length));
  b.dataset.next = '';
  root.append(nav);
}
export function settings(ctx: Context): void {
  const root = shell(ctx, 'Settings', 'FIELD ADJUSTMENTS'),
    store = ctx.store;
  pager(root, settingsPage, ['Sound', 'Controls', 'Picture'], (n) => {
    settingsPage = n;
    settings(ctx);
  });
  const live = (key: string, v: unknown) => {
    ctx.inspector()?.set(key, v);
    store.set(key, v);
  };
  if (settingsPage === 0) {
    for (const [bus, label] of [
      ['master', 'Master'],
      ['music', 'Music'],
      ['effects', 'Effects'],
      ['ui', 'Voices'],
      ['ambience', 'Ambience'],
    ] as const)
      slider(root, label, audio.volume(bus), 0, 1, 0.01, (v) => {
        audio.volume(bus, v);
        if (bus === 'ui') setVoiceVolume(v);
        store.set(`audio.${bus}`, v);
      });
  } else if (settingsPage === 1) {
    picker(root, 'Button glyphs', ['PlayStation', 'Xbox'], ctx.glyphs, (v) => {
      ctx.glyphs = v;
      store.set('glyphs', v);
      refreshGlyphs(ctx);
    });
    slider(root, 'Mouse sensitivity', store.get('input.sensitivity', 1), 0.1, 3, 0.1, (v) =>
      live('input.sensitivity', v),
    );
    slider(root, 'Stick sensitivity', store.get('input.stickSensitivity', 1), 0.1, 3, 0.1, (v) =>
      live('input.stickSensitivity', v),
    );
    picker(root, 'Invert look', ['Off', 'On'], store.get('input.invert', false) ? 'On' : 'Off', (v) => {
      live('input.invert', v === 'On');
      live('input.stickInvert', v === 'On');
    });
    picker(
      root,
      'Crouch',
      ctx.inHub ? ['Hold'] : ['Hold', 'Toggle'],
      ctx.inHub ? 'Hold' : store.get('input.crouch', 'hold') === 'hold' ? 'Hold' : 'Toggle',
      (v) => live('input.crouch', v.toLowerCase()),
    );
    picker(root, 'Pad aim assist', ['On', 'Off'], store.get('assist', true) ? 'On' : 'Off', (v) =>
      store.set('assist', v === 'On'),
    );
  } else {
    picker(root, 'Camera', ['First person', 'Over shoulder'], store.get('camera', 'First person'), (v) => {
      store.set('camera', v);
      if (ctx.c?.mode === 'story')
        ctx.inspector()?.camera.set(v === 'First person' ? 'cam3=first' : 'cam3=shoulder', { blend: true });
    });
    slider(root, 'Field of view', store.get('cam.fov', 76), 70, 110, 1, (v) => live('cam.fov', v));
    slider(root, 'Fever effects', store.get('feverIntensity', 0.7), 0, 1, 0.1, (v) => store.set('feverIntensity', v));
    slider(root, 'Screen shake', store.get('shake', 0.6), 0, 1, 0.1, (v) => {
      store.set('shake', v);
      ctx.inspector()?.set('cam.effects', v > 0);
    });
    slider(root, 'Subtitle size', store.get('subtitles', 1), 0.8, 1.5, 0.1, (v) => {
      store.set('subtitles', v);
      document.documentElement.style.setProperty('--sub-size', String(v));
    });
    picker(root, 'Quality', ['low', 'medium', 'high'], store.get('quality', 'low'), (v) => live('quality', v));
    button(root, 'Fullscreen', () => {
      void document.documentElement.requestFullscreen().catch(() => {});
    });
  }
}
export function dev(ctx: Context): void {
  const groups = [...new Set(TUNING.map((t) => t[5])), 'Cheats', 'Travel & spawn', 'Story & world'] as string[];
  const group = groups[devPage],
    root = shell(ctx, 'Dev mode', 'BALANCE IS A FIELD EXPERIMENT');
  pager(root, devPage, groups, (n) => {
    devPage = n;
    dev(ctx);
  });
  for (const [path, label, defaultValue, min, max, category] of TUNING)
    if (category === group) {
      const key = `game.${path}`,
        current = Number(ctx.frame?.setting(key) ?? defaultValue),
        step = max < 1 ? 0.0002 : max < 10 ? 0.05 : max < 200 ? 1 : 100;
      slider(root, label, current, min, max, step, (v) => ctx.inspector()?.set(key, v));
    }
  if (group === 'Cheats')
    for (const [key, label] of [
      ['god', 'Invulnerable'],
      ['ammo', 'Infinite ammo'],
      ['noWear', 'No wear or jams'],
      ['noFever', 'No fever'],
      ['invisible', 'Invisible to patrols'],
      ['oneShot', 'One shot kills'],
      ['noclip', 'Noclip'],
    ])
      picker(root, label, ['Off', 'On'], ctx.frame?.setting(`game.${key}`) ? 'On' : 'Off', (v) =>
        ctx.inspector()?.set(`game.${key}`, v === 'On'),
      );
  if (group === 'Travel & spawn') {
    let where = PLACES[0].id as string,
      g = GUNS[4].key as string;
    picker(
      root,
      'Travel to',
      PLACES.map((p) => p.name),
      PLACES[0].name,
      (v) => {
        where = PLACES.find((p) => p.name === v)!.id;
      },
    );
    button(root, 'Go to place', () => {
      ctx.inspector()?.actions.run('place', { place: where });
      ctx.open('play');
    });
    picker(
      root,
      'Weapon',
      GUNS.map((x) => x.name),
      GUNS[4].name,
      (v) => {
        g = GUNS.find((x) => x.name === v)!.key;
      },
    );
    button(root, 'Issue selected weapon', () =>
      ctx.inspector()?.actions.run('spawn', { kind: 'gun', key: g, condition: 1 }),
    );
    button(root, 'Spawn pickup', () => ctx.inspector()?.actions.run('spawn', { kind: 'vehicle', key: 'pickup' }));
    button(root, 'Spawn squad', () => ctx.inspector()?.actions.run('spawn', { kind: 'squad' }));
    button(root, 'Give 100 stones and supplies', () =>
      ctx.inspector()?.actions.run('give', { stones: 100, pills: 8, syr: 5 }),
    );
  }
  if (group === 'Story & world') {
    let contract = 0;
    picker(
      root,
      'Contract',
      CONTRACTS.map((c) => c.name),
      CONTRACTS[0].name,
      (v) => {
        contract = CONTRACTS.findIndex((c) => c.name === v);
      },
    );
    button(root, 'Begin selected contract', () => {
      ctx.inspector()?.actions.run('story', { contract });
      ctx.open('play');
    });
    slider(root, 'Hour', ctx.c?.hour ?? 17, 0, 23.9, 0.1, (v) => ctx.inspector()?.actions.run('weather', { hour: v }));
    button(root, 'Ignite ahead', () => {
      const p = ctx.p;
      if (p)
        ctx.inspector()?.actions.run('ignite', {
          x: p.actor.x + Math.sin(p.actor.yaw) * 18,
          z: p.actor.z + Math.cos(p.actor.yaw) * 18,
          radius: 2,
        });
    });
    button(root, 'Rain / clear', () => ctx.inspector()?.actions.run('weather', { rain: !ctx.c?.rain }));
    button(root, 'Regrow scars', () => ctx.inspector()?.actions.run('regrow', {}));
    button(root, 'Fever now', () => ctx.inspector()?.actions.run('fever', {}));
  }
  button(
    root,
    'Reset to defaults',
    () => {
      for (const [path, , v] of TUNING) ctx.inspector()?.set(`game.${path}`, v);
      for (const key of ['god', 'ammo', 'noWear', 'noFever', 'invisible', 'oneShot', 'noclip'])
        ctx.inspector()?.set(`game.${key}`, false);
      dev(ctx);
    },
    'reset-defaults',
  );
}
