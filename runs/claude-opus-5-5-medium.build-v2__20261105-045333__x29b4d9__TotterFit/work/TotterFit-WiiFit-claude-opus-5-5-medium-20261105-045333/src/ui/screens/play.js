// Intro cards, results, the age reveal, credits.
import { el, txt } from '../ui.js';
import { TIER_NAMES } from '../../data/programme.js';
import { FIXED } from '../../core/loop.js';
import { EVENTS } from '../../data/events.js';
import { TITLE } from '../../data/config.js';
import { EXIT } from '../../data/about.js';
const DIAGRAMS = {
  lean: 'M-40 20 L0 -30 L40 20', hat: 'M-44 -4 H44 M-30 -4 L-22 18 H22 L30 -4 M0 -46 v26', ring: 'M-40 0 a40 40 0 1 0 80 0 a40 40 0 1 0 -80 0 M-18 0 a18 18 0 1 0 36 0 a18 18 0 1 0 -36 0', stack: 'M-44 30 H44 M-34 18 H34 V30 H-34 Z M-26 6 H26 V18 H-26 Z M-16 -6 H16 V6 H-16 Z',
  feet: 'M-34 30 q-10 -28 8 -36 q16 4 8 36 z M26 30 q-16 -28 0 -36 q18 8 10 36 z', gull: 'M-40 -10 q20 -22 40 0 q20 -22 40 0 M-40 28 H40', tug: 'M-46 0 H46 M-46 -14 V14 M46 -14 V14 M0 -20 V20', circle: 'M36 0 a36 36 0 1 1 -8 -22 M28 -22 l-2 -18 M28 -22 l-18 2', tray: 'M-40 10 H40 M-28 10 V-14 H-16 V10 M-6 10 V-14 H6 V10 M16 10 V-14 H28 V10', dive: 'M-46 -30 H-6 M-6 -30 q26 -24 40 30 M34 0 l6 26 M-46 28 q14 -8 28 0 t28 0 t28 0 t28 0', raft: 'M-44 14 q44 -30 88 0 M-28 8 V-12 M0 0 V-22 M28 8 V-12',
};
export function diagram(kind) { const d = DIAGRAMS[kind] || DIAGRAMS.lean; return `<svg viewBox="-60 -60 120 120" height="${Math.round(innerHeight * .2)}" aria-hidden="true"><circle r="56" fill="#F7E7CC" stroke="#1A1420" stroke-width="5"/><path d="${d}" fill="none" stroke="#1A1420" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }
export function openIntro(g, Cls, tier, cb) {
  const ui = g.ui;
  ui.open('intro', (e) => {
    e.classList.add('dim'); const c = el('div', 'bigcard'); c.appendChild(txt('div', 'title-h', Cls.title)); c.appendChild(txt('div', 'small', `${Cls.discipline} · ${Cls.place} · ${TIER_NAMES[tier] || 'Gentle'}`));
    const r = el('div', 'row'); const dg = el('div'); dg.innerHTML = diagram(Cls.diagram); const col = el('div', 'col'); col.style.maxWidth = '54vw'; col.append(txt('div', 'line', Cls.sentence), txt('div', 'line', Cls.can), txt('div', 'line', Cls.cant)); r.append(dg, col); c.appendChild(r);
    c.appendChild(ui.promptBar(Cls.verbs)); e.appendChild(c);
    const row = el('div', 'row'); const go = ui.btn('Begin', () => cb('go'), { def: true }); row.appendChild(go); e.appendChild(row);
    e.appendChild(ui.bottom([['use', 'Begin'], ['back', 'Back']]));
  }, { onBack: () => cb('back') });
}
export function openResults(g, Cls, res, medal, tier, cb, kind) {
  const ui = g.ui; g.audio.sting(medal.id); g.audio.sfx('stamp');
  g.speech.clear();
  const key = medal.id === 'attended' ? 'attended' : medal.id === 'exemplary' ? 'exemplary' : medal.id === 'suspicious' ? 'suspicious' : 'results';
  const who = Cls.instructor; const line = who !== 'trudy' && g.rngFlow() < .6 ? g.line(who, 'done') : g.line('trudy', key);
  ui.open('results', (e) => {
    e.classList.add('dim'); e.appendChild(txt('div', 'title-h', Cls.title));
    const mid = el('div', 'row'); const st = el('div', 'medalstamp'); st.style.background = medal.colour; st.textContent = medal.name; mid.appendChild(st);
    const col = el('div', 'col'); const big = el('div', 'hudnum'); big.style.position = 'static'; big.textContent = String(res.big); big.appendChild(txt('small', '', res.label)); col.append(big, txt('div', 'gaugeTag', res.stats || `Form ${Math.round(res.form)}`)); mid.appendChild(col); e.appendChild(mid);
    const c = el('div', 'bigcard'); c.appendChild(txt('div', 'line', line || 'Thank you for attending.')); e.appendChild(c);
    const row = el('div', 'row'); row.append(ui.btn('Continue', () => cb('go'), { def: true }), ui.btn('Try Again', () => cb('retry'))); e.appendChild(row);
    e.appendChild(ui.bottom([['use', 'Choose'], ['move', 'Move']]));
  }, {});
}
export function* ageReveal(g, age, prev) {
  const ui = g.ui; g.speech.clear();
  const layer = ui.open('agereveal', (e) => { e.classList.add('dim'); e.style.background = 'rgba(26,20,32,.76)'; e.appendChild(txt('div', 'title-h', 'Your Wobble Age is')); const c = el('div', 'counter'); c.id = 'ageC'; for (let i = 0; i < 2; i++) c.appendChild(txt('div', 'wheel', '0')); e.appendChild(c); const sp = el('div', 'grow'); e.appendChild(sp); }, {});
  g.audio.sfx('drum', { dur: 2.2 }); const W = layer.el.querySelectorAll('.wheel'); let t = 0;
  while (t < 2.4) { t += FIXED; if (Math.floor(t * 120) % 4 === 0) { W[0].textContent = String(Math.floor(g.rngFlow() * 10)); W[1].textContent = String(Math.floor(g.rngFlow() * 10)); } yield; }
  W[0].textContent = String(Math.floor(age / 10)); W[1].textContent = String(age % 10); g.audio.sting('reveal'); g.rig.shake(.1);
  let line; if (prev != null && age < prev) line = g.line('trudy', 'ageDown', { age, prev, diff: prev - age }); else if (prev != null && age > prev) line = g.line('trudy', 'ageUp', { age, prev }); else line = g.line('trudy', age >= 62 ? 'ageHigh' : age >= 40 ? 'ageMid' : 'ageLow', { age });
  yield .6; yield* g.sayText('trudy', line); ui.close();
}
export function* stampCard(g) {
  const p = g.profile, ui = g.ui; const def = g.dayDef();
  const layer = ui.open('daycard', (e) => { e.classList.add('dim'); e.appendChild(el('div', 'grow')); const c = el('div', 'bigcard'); c.appendChild(txt('div', 'title-h', `Day ${p.day}`)); c.appendChild(txt('div', 'line', def ? def.name : 'Maintenance')); e.appendChild(c); e.appendChild(el('div', 'grow')); }, {});
  g.audio.sfx('stamp'); yield 2; ui.close(); void layer;
}
export function* credits(g) {
  const ui = g.ui, lines = [TITLE, 'Fredoka, by Milena Brandão and Hafontia (SIL OFL)', 'Three.js r180 · Rapier 0.19.3', 'Every line, note and marble made in code', 'Ms. Stillwater, as herself', 'Coach Bolster, loudly', 'Gary, without permission', 'Thank you for leaning.'];
  const hub = g.hub; const old = hub?.placeCam; let t = 0; if (hub) hub.placeCam = () => { const a = t * .2; g.rig.set(Math.sin(a) * 40, 16, Math.cos(a) * 40, 0, 2, 0); };
  for (const l of lines) { const layer = ui.open('credits', (e) => { e.appendChild(el('div', 'grow')); e.appendChild(txt('div', 'title-h', l)); e.appendChild(el('div', 'grow')); }, {}); let w = 0, adv = false; while (w < 3.2 && !adv) { w += FIXED; t += FIXED; if (w > .6 && g.input.merged.use) adv = true; yield; } ui.close(); void layer; }
  if (hub) hub.placeCam = old;
}
export { EVENTS, EXIT };
