/**
 * @file Dev Mode (reached from the pause menu; absent in hub sessions): live sliders for every tunable with Reset (per group and
 * for all), jumps to any day, activity or finale step, finish-now at a chosen rank, cheats (bot plays for me, no topple,
 * unlock all, give pebbles, reset save, throwaway save), and tools (time scale, pause and frame step, free camera, state
 * overlay, seed, copy tuned settings). Works with pad, keyboard and mouse. Page-side.
 * @example
 * const dev = createDev(root, app, engine); dev.open();
 */
import type { Engine } from '../../../engine';
import { TUNABLES } from '../scenes/settings';
import { ACTIVITY_INFO } from '../scenes/data/days';
import type { App } from './app';
import { insOf } from './ins';

export function createDev(root: HTMLElement, app: App, engine: Engine) {
  let el: HTMLElement | null = null;
  let overlay: HTMLElement | null = null;
  let group = 'Wobble';
  let free = false;
  const ins = insOf(engine);
  const groups = [...new Set(TUNABLES.map((t) => t.group))];
  const val = (path: string): number => {
    try {
      return Number(
        (engine.inspector as unknown as { get(k: string): unknown }).get?.(path) ??
          TUNABLES.find((t) => t.path === path)!.def,
      );
    } catch {
      return TUNABLES.find((t) => t.path === path)!.def;
    }
  };
  const btn = (label: string, fn: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = label;
    b.onclick = fn;
    return b;
  };
  function render(): void {
    if (!el) return;
    el.innerHTML = '<h2>Dev Mode</h2>';
    const tabs = document.createElement('div');
    groups.forEach((g) =>
      tabs.appendChild(
        btn(g === group ? `[${g}]` : g, () => {
          group = g;
          render();
        }),
      ),
    );
    el.appendChild(tabs);
    for (const t of TUNABLES.filter((x) => x.group === group)) {
      const l = document.createElement('label');
      const v = val(t.path);
      l.innerHTML = `<span>${t.label}</span>`;
      const r = document.createElement('input');
      r.type = 'range';
      r.min = String(t.min);
      r.max = String(t.max);
      r.step = String((t.max - t.min) / 100);
      r.value = String(v);
      const o = document.createElement('b');
      o.textContent = v.toFixed(2);
      r.oninput = () => {
        ins.set(t.path, Number(r.value));
        o.textContent = Number(r.value).toFixed(2);
      };
      l.append(r, o);
      el.appendChild(l);
    }
    const row = (title: string, items: HTMLElement[]) => {
      const h = document.createElement('p');
      h.textContent = title;
      h.style.margin = '1vh 0 0';
      el!.appendChild(h);
      items.forEach((i) => el!.appendChild(i));
    };
    row('Reset', [
      btn('Reset group', () => {
        TUNABLES.filter((t) => t.group === group).forEach((t) => ins.set(t.path, t.def));
        render();
      }),
      btn('Reset all', () => {
        TUNABLES.forEach((t) => ins.set(t.path, t.def));
        render();
      }),
    ]);
    row(
      'Jump to day',
      [1, 2, 3, 4, 5].map((d) =>
        btn(`Day ${d}`, () => {
          app.save.day = d;
          ins.actions.run('game.day', { day: d });
          app.store.set('save', app.save);
        }),
      ),
    );
    row(
      'Jump to activity',
      Object.keys(ACTIVITY_INFO).map((a) =>
        btn(ACTIVITY_INFO[a].title, () => {
          close();
          app.resume();
          jump(a);
        }),
      ),
    );
    row(
      'Finale steps',
      ['storm', 'east', 'carts', 'stone', 'dawn'].map((p) =>
        btn(p, () => {
          close();
          app.resume();
          jump('tilt');
          setTimeout(() => ins.actions.run('dev.phase', { phase: p }), 400);
        }),
      ),
    );
    row(
      'Finish now at rank',
      [
        ['Present', 100],
        ['Adequate', 400],
        ['Composed', 600],
        ['Serene', 800],
        ['Unsettling', 950],
      ].map(([n, s]) =>
        btn(String(n), () => {
          close();
          app.resume();
          ins.actions.run('dev.finish', { score: s });
        }),
      ),
    );
    row('Cheats', [
      btn('Bot plays for me', () => ins.actions.run('game.bot', { kind: 'perfect' })),
      btn('Bot off', () => ins.actions.run('game.bot', { kind: '' })),
      btn('No topple', () => ins.set('game.noTopple', true)),
      btn('Topple on', () => ins.set('game.noTopple', false)),
      btn('Unlock all', () => {
        app.save.day = Math.max(app.save.day, 2);
        app.save.finished = true;
        app.store.set('save', app.save);
      }),
      btn('Give 10 pebbles', () => {
        app.save.pebbles += 10;
        app.store.set('save', app.save);
        ins.actions.run('game.cairn', { count: app.save.pebbles, age: 40 });
      }),
      btn('Reset save', () => {
        app.store.remove('save');
        location.reload();
      }),
      btn('Throwaway save', () => {
        sessionStorage.setItem('ww-throwaway', sessionStorage.getItem('ww-throwaway') === '1' ? '0' : '1'); // a throwaway save lives in memory only
        location.reload();
      }),
    ]);
    row('Tools', [
      btn('0.25x', () => ins.timeScale(0.25)),
      btn('1x', () => ins.timeScale(1)),
      btn('4x', () => ins.timeScale(4)),
      btn('Frame step', () => {
        ins.pause();
        ins.step(1);
      }),
      btn('Free camera', () => {
        free = !free;
        app.setCamera(free ? 'cam3=fly' : 'cam3=stage,roam');
      }),
      btn('State overlay', () => {
        if (overlay) {
          overlay.remove();
          overlay = null;
        } else {
          overlay = document.createElement('pre');
          overlay.style.cssText =
            'position:absolute;left:2vh;top:2vh;background:rgba(255,255,255,.85);padding:1vh;font-size:2.4vh;pointer-events:none';
          root.appendChild(overlay);
        }
      }),
      btn('New seed', () => ins.seed(ins.seed() + 1)),
      btn('Copy tuned settings', () => {
        const o: Record<string, number> = {};
        TUNABLES.forEach((t) => {
          if (val(t.path) !== t.def) o[t.path] = val(t.path);
        });
        void navigator.clipboard?.writeText(JSON.stringify(o, null, 1));
      }),
      btn('Close', () => {
        close();
        app.openPause();
      }),
    ]);
  }
  function jump(a: string): void {
    if (a === 'board') return;
    app.fade(() => {
      ins.actions.run('game.leave');
      if (a === 'group') ins.actions.run('game.round', { players: 1, cpu: true });
      else ins.actions.run('game.start', { event: a });
      app.setMap('actionMap:balance');
      app.setCamera('cam3=stage,mat');
    });
  }
  function close(): void {
    el?.remove();
    el = null;
  }
  return {
    open(): void {
      el = document.createElement('div');
      el.className = 'panel dev';
      root.appendChild(el);
      render();
    },
    close,
    isOpen: () => !!el,
    tick(state: Record<string, unknown>): void {
      if (overlay) overlay.textContent = JSON.stringify(state, null, 1);
    },
  };
}
