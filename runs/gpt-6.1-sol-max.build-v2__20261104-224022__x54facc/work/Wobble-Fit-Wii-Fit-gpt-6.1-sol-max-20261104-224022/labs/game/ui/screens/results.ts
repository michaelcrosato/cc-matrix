/** @file One rank, one number, a remark, and pebbles. The morning adds its age dial and seven-day graph. */
import type { ScreenApp } from '../context';
import { ageFor, pebblesFor, rank } from '../../scenes/data/days';
import { EVENING } from '../lines/cast';
import { safe } from '../glyphs';
export function results(a: ScreenApp): void {
  const f = a.flow;
  if (!f) return;
  const r = f.event,
    score = r.id === 'group' ? r.score / 3 : r.score,
    check = r.id === 'check',
    age = ageFor(score);
  const ages = f.ages.slice(-7),
    points = ages
      .map((v, i) => `${10 + i * (180 / Math.max(1, ages.length - 1))},${8 + ((82 - v) / 64) * 45}`)
      .join(' ');
  const yesterday = f.ages.length >= 2 ? f.ages[f.ages.length - 2] : null;
  const remark = check
    ? yesterday === null
      ? 'Your first Wobble Age. A useful beginning. We will ask again tomorrow.'
      : age < yesterday
        ? `${yesterday - age} years younger by standing still. Science.`
        : age === yesterday
          ? 'Exactly as wobbly as yesterday. This is also consistency.'
          : 'A little more wobble today. Perhaps the island helped.'
    : f.message;
  const pebbles = pebblesFor(score);
  a.ui.menu(
    'results',
    check ? 'YOUR MORNING CHECK' : 'A LITTLE MORE ACCOMPLISHED',
    check ? 'Wobble Age' : rank(score),
    '',
    [
      {
        id: 'continue',
        label: 'Carry on',
        detail: f.done.length >= 3 ? 'There may be time for a little rest.' : 'Your programme will be here.',
        action: () => {
          a.run('game.leave');
          a.resume();
        },
      },
      { id: 'again', label: 'Again, please', action: () => a.start(r.id) },
    ],
    {
      hero: true,
      extra: `<div class="result-number">${check ? age : Math.round(r.score)}<span class="result-unit">${check ? 'years of wobble' : `/ ${r.id === 'group' ? '3000' : '1000'}`}</span></div><p class="result-remark">${safe(remark)}</p>${check ? `<svg class="age-graph" viewBox="0 0 200 65" aria-label="Your recent Wobble Ages"><polyline points="${points}"/>${ages.map((v, i) => `<circle cx="${10 + i * (180 / Math.max(1, ages.length - 1))}" cy="${8 + ((82 - v) / 64) * 45}" r="3"/>`).join('')}</svg>` : ''}<div class="result-pebbles"><span class="pebble-art">${Array.from({ length: pebbles }, () => '<i></i>').join('')}</span>+ ${pebbles} pebbles · ${f.pebbles} in your cairn</div>`,
    },
  );
  a.ui.root.insertAdjacentHTML(
    'beforeend',
    `<div class="result-dial"><div class="needle"></div><div class="dial-face"><i></i><i></i></div><div class="dial-smile"></div></div><div class="stamp-text">${check ? 'MORNING, RECORDED' : safe(score >= 900 && f.pebbles < 40 ? 'RECORDED' : rank(score).toUpperCase())}</div>`,
  );
  a.ui.back = () => {
    a.run('game.leave');
    a.resume();
  };
}

export function evening(a: ScreenApp): void {
  const f = a.flow ?? a.save,
    ages = f.ages.slice(-7),
    points = ages
      .map((v, i) => `${10 + (i * 180) / Math.max(1, ages.length - 1)},${8 + ((82 - v) / 64) * 45}`)
      .join(' ');
  a.ui.menu(
    'results',
    `DAY ${f.day} · RECORDED`,
    'A little less wobble.',
    EVENING[Math.min(4, f.day - 1)],
    [
      {
        id: 'sleep',
        label: 'Sleep at your hut',
        detail: 'Tomorrow has a fresh centre.',
        action: () => {
          a.run('game.sleep');
          a.resume();
        },
      },
      { id: 'back', label: 'A little more time outside', action: a.resume },
    ],
    {
      hero: true,
      extra: `<div class="checkmarks">${Array.from({ length: 5 }, (_, i) => `<span class="day-mark ${i < f.day ? 'done' : ''}">${i < f.day ? '✓' : i + 1}</span>`).join('')}</div><svg class="age-graph" viewBox="0 0 200 65" aria-label="Recent Wobble Ages"><polyline points="${points}"/></svg>`,
    },
  );
  a.ui.back = a.resume;
}
