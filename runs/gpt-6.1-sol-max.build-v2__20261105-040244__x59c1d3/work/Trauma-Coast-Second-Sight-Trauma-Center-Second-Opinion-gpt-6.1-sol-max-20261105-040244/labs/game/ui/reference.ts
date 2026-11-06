/** @file Paged clinical Handbook, source information, interview feedback and patient correspondence. */
import { interview } from '../data/about';
import { HELP, TOOLS } from '../data/tools';
import { CASES } from '../data/cases';
import type { UIContext } from './context';
import { page } from './pages';
import { button, esc, toolIcon } from './icons';
const questions = {
  testing: [
    'How many issues did testing catch?',
    'How many were critical or game breaking?',
    'What was the most helpful test?',
    'What was the least helpful test?',
  ],
  engine: [
    'What did you like most about the engine?',
    'Did you get stuck or guess wrong?',
    'What was most important to build yourself?',
    'What was hardest about using the engine?',
    'What did you change in the engine, and why?',
    'What one engine improvement would you make?',
  ],
  prompt: [
    'What did you like most about this prompt?',
    'What was confusing?',
    'What was hardest to do?',
    'What would you change?',
  ],
};
export const aboutCards = [
  ...Object.entries(interview.sourceInformation).map(([key, value]) => ({
    section: 'Source Information',
    title: key === 'artDirection' ? 'Art direction' : key.charAt(0).toUpperCase() + key.slice(1),
    body: value,
    key,
  })),
  ...interview.testingFeedback.map((body, i) => ({
    section: 'Testing Feedback',
    title: questions.testing[i],
    body,
    key: '',
  })),
  ...interview.engineFeedback.map((body, i) => ({
    section: 'Engine Feedback',
    title: questions.engine[i],
    body,
    key: '',
  })),
  ...interview.promptFeedback.map((body, i) => ({
    section: 'Prompt Feedback',
    title: questions.prompt[i],
    body,
    key: '',
  })),
  {
    section: 'Credits',
    title: 'Harbor Light General',
    body: 'Original game, characters, geometry, animations and synthesized score. Built with my-3dge and three.js (MIT); Rapier and stdlib mathematics (Apache-2.0). Inspired by Trauma Center: Second Opinion. All characters and events in Port Verity are fictional.',
    key: 'credits',
  },
];
export function about(index: number): string {
  const card = aboutCards[((index % aboutCards.length) + aboutCards.length) % aboutCards.length];
  return page(
    'About & credits',
    card.section.toUpperCase(),
    `<article class="feedback-card"><div class="eyebrow">${esc(card.section)}</div><h3>${esc(card.title)}</h3><p data-about="${card.key}">${esc(card.key === 'usage' ? (document.getElementById('usage-record')?.textContent ?? card.body) : card.body)}</p></article>`,
    `${button('back', 'Back')}${button('ref-prev', '← Previous')}<span class="about-index">${index + 1} / ${aboutCards.length}</span>${button('ref-next', 'Next →')}`,
  );
}
const extra = [
  [
    'The Gift',
    'Space / Triangle starts pulse-lock. Match the next three ECG beats.',
    'Stillpoint slows field time; your hands stay fast. Second Pulse protects vitals and rewards clean work.',
    'Start with your colleague within one second for CONSULT.',
  ],
  [
    'The flap',
    'Forceps on the gold handle. Pull upward to raise the tissue.',
    'Release above the clip line to hold it for eight seconds. A partner can hold indefinitely.',
    'You cannot treat what is below a closed flap.',
  ],
  [
    'Several sites',
    'Q / E or D-pad left / right changes the operating site.',
    'Every other site keeps bleeding. In Gala Night each table has its own vitals.',
    'An edge alert means another site needs your hands.',
  ],
  [
    'Code blue',
    'LMB + RMB, or L2 + R2. Both together when the charge reaches green.',
    'Eight seconds, two tries. A successful shock restores 25 vitals.',
    'A lost patient ends the whole operation.',
  ],
  [
    'LULL',
    'Lilac. It quiets the monitor while draining life.',
    'Laser the small ones; Forceps the cocoons. Gel every numb patch.',
    'The Matron opens her maw for 2.5 seconds. Two Binder doses.',
  ],
  [
    'SOLACE',
    'Amber. Large ones thrive under the Laser.',
    'Cut through at least 1.5 metres to divide them. Only the smallest generation burns.',
    'Mother Solace hides beneath a flap. Ask your colleague to hold it.',
  ],
  [
    'REVERIE',
    'Ink-blue. A raised ripple moves under the tissue.',
    'Scanner reveals it for six seconds. Laser brings it to the surface for three.',
    'Three exposures. Listen for the true heartbeat among the decoys.',
  ],
  [
    'BALM',
    'Pearl lacquer, spreading half a metre at a time.',
    'Lacquer blocks sutures and suction. Gel dissolves it. Laser works at a cost to vitals.',
    'Two Binder doses kill a Node; its film fades in six seconds.',
  ],
  [
    'MERCY',
    'White-gold. Anesthesia, The Kindness, Last Rites.',
    'Laser the shield; Binder the core. Restart the heart and close the rakes.',
    'Cut with the heartbeat. Extract all five tendrils. Gift, Binder, then one final shock.',
  ],
];
export function handbook(c: UIContext, index: number): string {
  const count = 12 + Math.max(0, Math.min(5, c.d.progress.unlocked - 3)),
    i = ((index % count) + count) % count;
  const data = i < 8 ? [TOOLS[i], ...HELP[TOOLS[i]]] : extra[i - 8];
  return page(
    'The surgical Handbook',
    'READ THE BODY / TRUST THE TOOLS',
    `${i < 8 ? `<div class="handbook-icon">${toolIcon(i)}</div>` : ''}<article class="handbook-text"><div class="eyebrow">${i < 8 ? `INSTRUMENT ${i + 1} / KEY ${i + 1}` : 'CHARGE NURSE’S NOTES'}</div><h2>${esc(data[0])}</h2>${data
      .slice(1)
      .map((text) => `<p>${esc(text)}</p>`)
      .join('')}</article>`,
    `${button('back', 'Back')}${button('ref-prev', '← Previous')}<span class="about-index">${i + 1} / ${count}</span>${button('ref-next', 'Next →')}`,
  );
}
export function postcards(c: UIContext, index: number): string {
  const ids = Object.keys(c.d.progress.postcards),
    id = ids[index % Math.max(1, ids.length)],
    cs = CASES.find((c) => c.id === id);
  return page(
    'The people you saved',
    'POSTCARDS / PORT VERITY',
    ids.length
      ? `<article class="postcard"><div class="eyebrow" style="color:#537767">HARBOR LIGHT GENERAL</div><h3>Dear Doctor,</h3><p>${esc(c.d.progress.postcards[id])}</p><div class="signature">${esc(cs?.patient ?? 'The night shift')}</div></article>`
      : '<article class="handbook-text"><h3>The post has not arrived yet.</h3><p>Finish an operation. Every patient has a life beyond the monitor.</p></article>',
    `${button('back', 'Back')}${ids.length > 1 ? button('ref-prev', '← Previous') : ''}<span class="small">${ids.length} postcard${ids.length === 1 ? '' : 's'} received</span>${ids.length > 1 ? button('ref-next', 'Next →') : ''}`,
  );
}
