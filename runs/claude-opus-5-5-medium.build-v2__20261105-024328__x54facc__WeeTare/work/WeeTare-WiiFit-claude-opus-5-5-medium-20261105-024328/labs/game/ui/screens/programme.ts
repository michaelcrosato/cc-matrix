/**
 * @file The daily screens: the Programme (today's list), the Noticeboard (a 3 by 2 page of activity cards), Results, Evening and
 * the credits. One idea per screen. Results are one word, one number, one sentence, one small graph.
 */
import { BOARD, DAYS, UNLOCKS } from '../../scenes/data/days';
import { promptBar } from '../glyphs';
import { lineText } from '../lines';
import { closer, panel, type Ctx, type Screen } from '../ctx';
import { createRows } from '../menu';
import { ACTIVITY_TITLES, TITLE } from '../titles';
import { CREDITS } from '../about-data';

/** Today's list with stamps and "Go". */
export function programmeScreen(ctx: Ctx): Screen {
  const flow = ctx.flow();
  const list = DAYS[flow.day - 1] ?? [];
  const { layer, box } = panel(ctx, flow.free ? 'Free Play' : `Day ${flow.day}`);
  layer.dataset.ui = 'programme';
  const rows = list.map((id) => ({
    id,
    label: ACTIVITY_TITLES[id] ?? id,
    value: () => (ctx.flow().done.includes(id) ? '✓ Stamped' : 'Go'),
    off: flow.done.includes(id),
  }));
  const finished = list.every((id) => flow.done.includes(id));
  const menu = createRows(
    box,
    [...rows, ...(finished ? [{ id: 'sleep', label: 'Go to your hut' }] : []), { id: 'board', label: 'Noticeboard' }],
    ctx.nav,
    (id) => {
      if (id === 'board') {
        ctx.pop();
        return ctx.push(boardScreen(ctx, false));
      }
      ctx.pop();
      ctx.fade(() => {
        if (id === 'sleep') ctx.run('game.evening');
        else ctx.run('game.start', { id });
      });
    },
    () => ctx.pop(),
  );
  return { el: layer, update: (dt) => menu.update(dt), close: closer(layer) };
}

/** The Noticeboard. `free` starts the save first: it was opened from the title. */
export function boardScreen(ctx: Ctx, free: boolean): Screen {
  const { layer, box } = panel(ctx, 'Noticeboard');
  layer.dataset.ui = 'board';
  const flow = ctx.flow();
  const save = ctx.store.get<{ bests?: Record<string, number> }>('game', {});
  const bests = free ? (save.bests ?? {}) : flow.bests;
  const pebbles = free ? ((save as { pebbles?: number }).pebbles ?? 0) : flow.pebbles;
  const expertOpen = pebbles >= (UNLOCKS.find((u) => u.id === 'expert')?.at ?? 10);
  const grid = document.createElement('div');
  grid.className = 'wt-grid';
  box.append(grid);
  const foot = document.createElement('div');
  foot.style.marginTop = '1.4vh';
  foot.className = 'wt-prompts';
  foot.innerHTML = promptBar([
    ['page', 'Page'],
    ['ok', 'Go'],
    ['back', 'Back'],
    ...(expertOpen ? ([['more', 'Expert']] as const) : []),
  ]).replace('wt-bar', 'wt-prompts');
  box.append(foot);
  const met = (id: string) => (bests[id] ?? -1) >= 0 || flow.free;
  const size = 6;
  let page = 0;
  let at = 0;
  let expert = false;
  const items = () => BOARD.slice(page * size, (page + 1) * size);
  const go = (id: string) => {
    if (!met(id)) return;
    ctx.clear();
    ctx.fade(() => {
      if (free) ctx.run('game.begin', ctx.store.get('game', {}));
      ctx.run('game.start', { id, expert });
    });
  };
  const draw = () => {
    grid.textContent = '';
    items().forEach((id, i) => {
      const card = document.createElement('div');
      card.className = 'wt-card';
      card.dataset.focus = i === at ? '1' : '0';
      card.dataset.id = id;
      card.dataset.off = met(id) ? '0' : '1';
      const best = bests[id];
      card.innerHTML = `<span>${ACTIVITY_TITLES[id]}</span><small>${met(id) ? (best !== undefined ? `Best ${Math.round(best)}` : 'Open') : 'Not yet met'}</small>`;
      card.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse') {
          at = i;
          draw();
        }
      });
      card.addEventListener('click', () => go(id));
      grid.append(card);
    });
    (box.querySelector('.wt-h') as HTMLElement).textContent =
      `Noticeboard ${page + 1} of ${Math.ceil(BOARD.length / size)}${expert ? ' · Expert' : ''} · ${pebbles} pebbles`;
  };
  draw();
  return {
    el: layer,
    update() {
      const input = ctx.nav;
      const count = items().length;
      if (input.pressed('uiRight')) at = (at + 1) % count;
      if (input.pressed('uiLeft')) at = (at + count - 1) % count;
      if (input.pressed('uiDown')) at = Math.min(count - 1, at + 3);
      if (input.pressed('uiUp')) at = Math.max(0, at - 3);
      const pad = navigator.getGamepads?.()[0];
      const next = input.pressed('uiAccept') ? 'go' : '';
      if (pressedPage(ctx, pad, 1)) {
        page = (page + 1) % Math.ceil(BOARD.length / size);
        at = 0;
      }
      if (pressedPage(ctx, pad, -1)) {
        page = (page + Math.ceil(BOARD.length / size) - 1) % Math.ceil(BOARD.length / size);
        at = 0;
      }
      if (
        input.pressed('uiRight') ||
        input.pressed('uiLeft') ||
        input.pressed('uiDown') ||
        input.pressed('uiUp') ||
        wasPaged
      )
        draw();
      wasPaged = false;
      const triangle = pad?.buttons[3]?.pressed ?? false;
      if (expertOpen && (lastKey === 'KeyT' || (triangle && !triangleWas))) {
        lastKey = '';
        expert = !expert;
        draw();
      }
      triangleWas = triangle;
      if (next === 'go') go(items()[at]);
      if (input.pressed('uiCancel')) ctx.pop();
    },
    close: closer(layer),
  };
}

let wasPaged = false;
let triangleWas = false;
let lastKey = '';
const held = { q: false, e: false, l: false, r: false };
addEventListener('keydown', (event) => {
  lastKey = event.code;
  if (event.code === 'KeyQ') held.q = true;
  if (event.code === 'KeyE') held.e = true;
});

/** Whether a page turn was asked for: L1, R1 or Q, E. */
function pressedPage(_ctx: Ctx, pad: Gamepad | null | undefined, dir: number): boolean {
  let turn = false;
  if (dir > 0 && held.e) [turn, held.e] = [true, false];
  if (dir < 0 && held.q) [turn, held.q] = [true, false];
  const button = pad?.buttons[dir > 0 ? 5 : 4]?.pressed ?? false;
  if (dir > 0) {
    if (button && !held.r) turn = true;
    held.r = button;
  } else {
    if (button && !held.l) turn = true;
    held.l = button;
  }
  if (turn) wasPaged = true;
  return turn;
}

/** The results screen. */
export function resultsScreen(ctx: Ctx, onLeave: () => void): Screen {
  const flow = ctx.flow();
  const { last } = flow;
  const { layer, box } = panel(ctx);
  layer.dataset.ui = 'results';
  const prev = flow.ages.length > 1 ? flow.ages[flow.ages.length - 2] : 0;
  const isCheck = last.id === 'check';
  const body = document.createElement('div');
  if (isCheck) {
    body.innerHTML = `<div style="display:flex;justify-content:center"><div class="wt-dial"><i style="transform:rotate(${(last.age - 18) * 3 - 90}deg)"></i><b>${last.age}</b></div></div><div class="wt-body" data-ui="recal">Recalibrating\u2026</div>`;
    setTimeout(() => body.querySelector('[data-ui=recal]')?.remove(), 2200);
    const needle = body.querySelector('i') as HTMLElement;
    needle.animate(
      [
        { transform: 'rotate(-90deg)' },
        { transform: 'rotate(250deg)', offset: 0.5 },
        { transform: 'rotate(120deg)', offset: 0.7 },
        { transform: needle.style.transform },
      ],
      { duration: 2200, easing: 'ease-out' },
    );
  } else {
    body.innerHTML = `<div class="wt-rank">${last.rank}</div><div class="wt-score">${last.score}</div>`;
  }
  if (last.id === 'group' && flow.group) {
    // the podium: least wobbly first, and a sash
    const NAMES = ['You', 'Gerald', 'Bex', 'Old Nan'];
    const order = flow.group.seats.map((i) => ({ i, score: flow.group!.scores[i] })).sort((a, b) => b.score - a.score);
    const podium = document.createElement('div');
    podium.className = 'wt-seats';
    podium.dataset.ui = 'podium';
    order.forEach(({ i, score }, place) => {
      const cell = document.createElement('div');
      cell.className = 'wt-seat';
      cell.style.background = ['#e8443a', '#3b82f6', '#22c55e', '#f5b700'][i];
      cell.style.height = `${24 - place * 4}vh`;
      cell.textContent = `${NAMES[i]} ${Math.round(score)}`;
      if (place === 0) {
        const sash = document.createElement('div');
        sash.textContent = 'Least Wobbly';
        cell.append(sash);
      }
      podium.append(cell);
    });
    body.textContent = '';
    body.append(podium);
  }
  const pebbles = document.createElement('div');
  pebbles.className = 'wt-pebbles';
  pebbles.dataset.ui = 'pebbles';
  for (let k = 0; k < last.pebbles; k++) {
    const p = document.createElement('i');
    p.style.animationDelay = `${0.25 * k}s`;
    pebbles.append(p);
  }
  const line = document.createElement('div');
  line.className = 'wt-body';
  line.style.margin = '1.2vh 0 2vh';
  const remark = isCheck
    ? lineText(!prev ? 'age.first' : last.age < prev ? 'age.younger' : last.age > prev ? 'age.older' : 'age.same', {
        age: last.age,
        prev,
        diff: Math.abs(last.age - prev),
      })
    : lineText(`rank.${last.rank}`);
  line.textContent = remark;
  box.append(body, pebbles, line);
  ctx.sound.say(isCheck ? 'tare' : 'plumb', remark);
  const menu = createRows(
    box,
    [
      { id: 'carry', label: 'Carry on' },
      { id: 'again', label: 'Again' },
    ],
    ctx.nav,
    (id) => {
      ctx.pop();
      if (id === 'again') ctx.fade(() => ctx.run('game.again'));
      else onLeave();
    },
    () => {
      ctx.pop();
      onLeave();
    },
  );
  return { el: layer, update: (dt) => menu.update(dt), close: closer(layer) };
}

/** A small line graph of ages. */
function ageGraph(ages: readonly number[]): string {
  if (!ages.length) return '';
  const points = ages
    .map((a, i) => `${(i / Math.max(1, ages.length - 1)) * 300},${90 - ((a - 18) / 64) * 80}`)
    .join(' ');
  const dots = ages
    .map(
      (a, i) =>
        `<circle cx="${(i / Math.max(1, ages.length - 1)) * 300}" cy="${90 - ((a - 18) / 64) * 80}" r="6" fill="#ff8a70"/>`,
    )
    .join('');
  return `<svg class="wt-graph" viewBox="-10 0 320 100"><polyline points="${points}" fill="none" stroke="#3a4a55" stroke-width="4"/>${dots}</svg>`;
}

/** The evening: calendar stamp, the age graph, a closing remark, Sleep. */
export function eveningScreen(ctx: Ctx): Screen {
  const flow = ctx.flow();
  const { layer, box } = panel(ctx, flow.free ? 'Evening' : `Day ${flow.day} ✓`);
  layer.dataset.ui = 'evening';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1.2vh;margin-bottom:2vh';
  wrap.innerHTML = ageGraph(flow.ages);
  const remark = document.createElement('div');
  remark.className = 'wt-body';
  const text = lineText(`evening.${Math.min(6, flow.day)}`);
  remark.textContent = text;
  wrap.append(remark);
  box.append(wrap);
  ctx.sound.say('tare', text);
  const menu = createRows(
    box,
    [{ id: 'sleep', label: 'Sleep' }],
    ctx.nav,
    () => {
      ctx.pop();
      ctx.fade(() => ctx.run('game.sleep'));
    },
    () => {
      ctx.pop();
      ctx.run('game.leave');
    },
  );
  return { el: layer, update: (dt) => menu.update(dt), close: closer(layer) };
}

/** The credits: they roll past the guests holding poses, then Free Play. */
export function creditsScreen(ctx: Ctx, done: () => void): Screen {
  const layer = document.createElement('div');
  layer.className = 'wt-layer';
  layer.dataset.ui = 'credits';
  const score = ctx.flow().tiltScore;
  const remark = lineText(score > 750 ? 'final.high' : score > 450 ? 'final.mid' : 'final.low');
  layer.innerHTML = `<div class="wt-title">${TITLE}</div>`;
  const box = document.createElement('div');
  box.className = 'wt-panel wt-body';
  box.style.maxHeight = '50vh';
  const lines = [remark, ...CREDITS, lineText('after')];
  box.textContent = lines[0];
  layer.append(box);
  const bar = document.createElement('div');
  bar.innerHTML = promptBar([['ok', 'Stay']]);
  layer.append(bar);
  ctx.root.append(layer);
  ctx.sound.say('tare', remark);
  let at = 0;
  let wait = 7;
  return {
    el: layer,
    update(dt) {
      wait -= dt;
      if (wait <= 0 && at < lines.length - 1) {
        at += 1;
        wait = 5;
        box.textContent = lines[at];
      }
      if (ctx.nav.pressed('uiAccept') || ctx.nav.pressed('uiCancel') || (at === lines.length - 1 && wait < -6)) {
        ctx.pop();
        done();
      }
    },
    close: closer(layer),
  };
}
