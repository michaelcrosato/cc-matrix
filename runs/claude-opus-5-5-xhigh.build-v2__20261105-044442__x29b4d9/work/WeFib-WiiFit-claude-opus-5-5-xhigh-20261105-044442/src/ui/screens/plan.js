import { h } from '../dom.js';
import { EVENTS, TIER_NAMES } from '../../data/events.js';
import { diagram } from '../diagrams.js';
import { openJournal } from './journal.js';

/** Today's Plan: up to four big cards, done ones stamped. */
export function openPlan(game, hub) {
  const pr = game.programme, p = game.save.profile;
  const today = pr.classesToday();
  let scr = null;
  const close = () => game.ui.close(scr);
  scr = game.ui.open({
    name: 'plan', className: 'dim',
    prompts: [['use', 'Go there'], ['ask', 'Journal'], ['back', 'Back']],
    back: close,
    alt: () => openJournal(game),
    build: (s) => {
      const def = pr.dayDef(p.today.day);
      s.el.append(h('div.h2', { style: 'margin-top:3rem' }, "Today's Plan"));
      s.el.append(h('div.sign', { style: 'margin-bottom:2.4rem;font-size:3.4rem' }, `Day ${p.today.day}: ${def.name}`));
      const cards = h('div.cards');
      s.el.append(cards);
      for (const id of today) {
        const d = EVENTS[id];
        const done = p.today.done.includes(id);
        const m = pr.medalOf(id, pr.programmeTier(id));
        const el = h(`div.card${done ? '.done' : ''}`,
          h('div.art', { html: diagram(d.diagram) }),
          h('div.name', d.title),
          h('div', d.place),
          done ? h('div.stamp', { 'data-stamp': id }, m ? m.medal.toUpperCase() : 'DONE') : null);
        cards.append(s.item(el, { use: () => {
          close();
          if (hub) hub.goClass(id, !done);
        } }));
      }
      if (!pr.planLeft().length) s.el.append(h('div.tag', { style: 'margin-top:2.4rem' }, 'All done. The Bed Hut is open.'));
    },
  });
  return scr;
}
