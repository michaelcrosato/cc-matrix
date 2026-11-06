/**
 * @file Group Class on one screen: up to four pads, and keyboard and mouse can hold one seat. Mats light in seat colours as people
 * press Cross or Space. Empty seats go to CPU guests unless turned off. The page reads every pad itself, because the
 * engine's gamepad device only follows one, and sends each seat's input with `game:seats`.
 */
import { promptBar } from '../glyphs';
import { closer, panel, type Ctx, type Screen } from '../ctx';

const COLOURS = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'];
const CPU = ['Gerald', 'Bex', 'Old Nan'];

/** Who holds each seat: 'keys', a pad's index, or null. */
const seats: (string | number | null)[] = [null, null, null, null];

/** Sends every joined pad's input. Called every frame while a class runs. */
export function sendSeatInput(ctx: Ctx): void {
  if (!seats.some((s) => typeof s === 'number')) return;
  const pads = navigator.getGamepads?.() ?? [];
  const data = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  seats.forEach((who, i) => {
    if (typeof who !== 'number') return;
    const pad = pads[who];
    if (!pad) return;
    data[i] = 1;
    const o = 4 + i * 5;
    const dead = (v: number) => (Math.abs(v) < 0.1 ? 0 : v);
    data[o] = dead(pad.axes[0] ?? 0);
    data[o + 1] = -dead(pad.axes[1] ?? 0);
    data[o + 2] = Math.max(pad.buttons[6]?.value ?? 0, pad.buttons[4]?.value ?? 0);
    data[o + 3] = Math.max(pad.buttons[7]?.value ?? 0, pad.buttons[5]?.value ?? 0);
    data[o + 4] = pad.buttons[0]?.pressed ? 1 : 0;
  });
  ctx.engine.input?.virtual.axis('game:seats', data);
}

/** The join screen. */
export function joinScreen(ctx: Ctx): Screen {
  const { layer, box } = panel(ctx, 'Group Class');
  layer.dataset.ui = 'join';
  seats.fill(null);
  const row = document.createElement('div');
  row.className = 'wt-seats';
  box.append(row);
  const foot = document.createElement('div');
  foot.innerHTML = promptBar([
    ['ok', 'Join, then Start'],
    ['back', 'Back'],
    ['more', 'CPU guests'],
  ]).replace('wt-bar', 'wt-prompts');
  box.append(foot);
  const draw = () => {
    row.textContent = '';
    seats.forEach((who, i) => {
      const seat = document.createElement('div');
      seat.className = 'wt-seat';
      const cpu = ctx.settings.cpu && i > 0 ? CPU[i - 1] : 'Empty';
      seat.style.background = who !== null ? COLOURS[i] : '#a8b4bc';
      seat.textContent =
        who === 'keys' ? 'Keyboard' : typeof who === 'number' ? `Pad ${who + 1}` : i === 0 ? 'Press to join' : cpu;
      row.append(seat);
    });
  };
  draw();
  const start = () => {
    const kinds = seats.map((who, i) => (who !== null ? 'human' : ctx.settings.cpu && i > 0 ? 'cpu' : 'none'));
    if (kinds[0] === 'none') kinds[0] = 'human';
    ctx.clear();
    ctx.fade(() => {
      ctx.run('game.begin', ctx.store.get('game', {}));
      ctx.run('game.seats', { kinds });
      ctx.run('game.start', { id: 'group' });
    });
  };
  const join = (who: string | number) => {
    if (seats.includes(who)) return start();
    const free = seats.indexOf(null);
    if (free < 0) return;
    seats[free] = who;
    ctx.sound.audio.play('sfx:confirm');
    draw();
  };
  const onKey = (event: KeyboardEvent) => {
    if (event.code === 'Space' || event.code === 'Enter') join('keys');
    if (event.code === 'KeyT') {
      ctx.settings.cpu = !ctx.settings.cpu;
      draw();
    }
  };
  addEventListener('keydown', onKey);
  box.addEventListener('click', () => join('keys'));
  const was = new Map<number, boolean>();
  let armed = 0.3;
  return {
    el: layer,
    update(dt) {
      armed -= dt;
      for (const pad of navigator.getGamepads?.() ?? []) {
        if (!pad) continue;
        const down = pad.buttons[0]?.pressed ?? false;
        if (down && !was.get(pad.index) && armed <= 0) join(pad.index);
        was.set(pad.index, down);
        if (pad.buttons[3]?.pressed && armed <= 0) {
          armed = 0.3;
          ctx.settings.cpu = !ctx.settings.cpu;
          draw();
        }
      }
      if (ctx.nav.pressed('uiCancel')) ctx.pop();
    },
    close() {
      removeEventListener('keydown', onKey);
      closer(layer)();
    },
  };
}
