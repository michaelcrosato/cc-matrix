import { h } from '../dom.js';
import { medalSVG } from '../../game/results.js';
import { MEDALS } from '../../data/config.js';
import { EVENTS, TIER_NAMES } from '../../data/events.js';

/** Calendar, the Wobble Age graph, the medals shelf, silly totals. */
export function openJournal(game, onClose = null) {
  if (!game.save.profile) { const i = game.save.data.profiles.findIndex((x) => x); if (i >= 0) game.programme.selectProfile(i); }
  const p = game.save.profile;
  let scr = null;
  const close = () => { game.ui.close(scr); if (onClose) onClose(); };
  const medalKeys = p ? Object.keys(p.medals) : [];
  const medalPages = [];
  for (let i = 0; i < medalKeys.length; i += 8) medalPages.push(medalKeys.slice(i, i + 8));
  if (!medalPages.length) medalPages.push([]);
  const total = 2 + medalPages.length + 1;
  scr = game.ui.open({
    name: 'journal', className: 'dim',
    prompts: [['page', 'Pages'], ['back', 'Back']],
    back: close,
    build(s) {
      const title = h('div.h2', { style: 'margin-top:2rem' }, 'Journal');
      const box = h('div', { style: 'margin-top:1rem' });
      s.el.append(title, box);
      const page = (pg) => {
        box.innerHTML = '';
        if (!p) { box.append(h('div.tag', 'Nobody has checked in yet. Trudy has left the page open.')); return; }
        if (pg === 0) {
          title.textContent = 'Your Days';
          const cal = h('div.calendar');
          const n = Math.max(14, p.stamps.length + 1);
          for (let i = 1; i <= Math.min(21, n); i++) {
            const stamp = p.stamps.find((x) => x.day === i);
            cal.append(h('div.day', String(i), stamp ? h('b', 'DONE') : null));
          }
          box.append(cal);
        } else if (pg === 1) {
          title.textContent = 'Wobble Age';
          box.append(graph(p));
        } else if (pg < total - 1) {
          title.textContent = 'The Medal Shelf';
          const sh = h('div.shelf');
          for (const k of medalPages[pg - 2]) {
            const [id, tier] = k.split(':');
            const rec = p.medals[k];
            const m = MEDALS.find((x) => x.id === rec.medal) || MEDALS[0];
            sh.append(h('div.m.tag', h('span', { html: medalSVG(m) , style: 'width:9rem;height:9rem;display:block' }), `${EVENTS[id].title}`, h('span', TIER_NAMES[tier])));
          }
          if (!medalPages[pg - 2].length) sh.append(h('div.tag', { style: 'grid-column:span 4' }, 'No medals yet. The shelf is very level.'));
          box.append(sh);
        } else {
          title.textContent = 'Silly Totals';
          box.append(h('div.totals.tag',
            h('div', `Floor Exercises: ${p.floorExercises}`),
            h('div', `Minutes: ${Math.round(p.minutes)}`),
            h('div', `Marbles: ${p.marbles}`),
            h('div', `Classes: ${p.classes}`)));
        }
      };
      s.pager(total, page);
      page(0);
    },
  });
  return scr;
}

function graph(p) {
  const ages = p.ages.slice(-12);
  const w = 1200, ht = 460;
  const xOf = (i) => 80 + (i * (w - 160)) / Math.max(1, ages.length - 1);
  const yOf = (a) => 40 + ((99 - a) / 81) * (ht - 90);
  let path = '';
  ages.forEach((a, i) => { path += `${i ? 'L' : 'M'}${xOf(i).toFixed(0)} ${yOf(a.age).toFixed(0)} `; });
  const dots = ages.map((a, i) => `<circle cx="${xOf(i)}" cy="${yOf(a.age)}" r="13" fill="#F5B700" stroke="#1A1420" stroke-width="5"/>`).join('');
  const first = ages[0] ? ages[0].age : '-', last = ages.length ? ages[ages.length - 1].age : '-';
  const best = ages.length ? Math.min(...ages.map((a) => a.age)) : '-';
  const svg = `<svg viewBox="0 0 ${w} ${ht}"><rect x="2" y="2" width="${w - 4}" height="${ht - 4}" rx="24" fill="#FFF4DC" stroke="#1A1420" stroke-width="7"/><path d="${path}" fill="none" stroke="#1A1420" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>${dots}</svg>`;
  return h('div.col', h('div.graph', { html: svg }), h('div.row',
    h('div.tag', { style: 'font-size:4.4rem' }, `First: ${first}`), h('div.tag', { style: 'font-size:4.4rem' }, `Latest: ${last}`), h('div.tag', { style: 'font-size:4.4rem' }, `Best: ${best}`)));
}
