// Year's end: an almanac of your year, then the credits.
import { panel, drawText, dim, textBlock } from '../draw.js';
import { NEIGHBOURS } from '../../data/neighbours.js';
import { ITEMS } from '../../data/items.js';

class YearPage {
  constructor(g, onClose) { this.id = 'yearAlmanac'; this.onClose = onClose; this.page = 0; this.lines = yearFacts(g); }
  labels() { return this.lines; }
  currentText() { return this.lines.join(' / '); }
  update(g, inp) { if (inp.confirm || inp.back || inp.mouse.click) { g.ui.pop(this); this.onClose?.(); } }
  prompts() { return [['confirm', 'Turn the page']]; }
  draw(g, hud) {
    hud.rect(0, 0, 480, 270, 'ink');
    panel(hud, 60, 18, 360, 234, { fill: 'white', trim: 'sand' });
    drawText(hud, 240, 28, `The Year in ${g.world.player.town}`, { align: 'center', color: 'ink', scale: 2 });
    this.lines.forEach((l, i) => drawText(hud, 240, 60 + i * 20, l, { align: 'center', color: i % 2 ? 'plum' : 'ink' }));
  }
}
export function yearFacts(g) {
  const w = g.world;
  const s = w.stats;
  const most = Object.entries(s.talks).sort((a, b) => b[1] - a[1])[0];
  const soldTop = Object.entries(s.sold).sort((a, b) => b[1] - a[1])[0];
  return [
    `Biggest catch: ${s.biggest ?? 'nothing you would admit to'}`,
    `Fish caught: ${s.fish}. Bugs caught: ${s.bugs}.`,
    `Most-sold to the goose: ${soldTop ? ITEMS[soldTop[0]]?.name ?? soldTop[0] : 'nothing, somehow'}`,
    w.player.debt > 0 ? `Debt status: ${w.player.debt.toLocaleString('en-US')} beans, and noted` : 'Debt status: nil. She is thinking about it.',
    `Talked to most: ${most ? NEIGHBOURS[most[0]]?.name ?? most[0] : 'nobody, which is a choice'}`,
    `Weeds pulled: ${s.weeds}. Wishes made: ${s.wishes}.`,
    `Favours done: ${s.favoursDone}. Contests placed: ${s.contestsWon}.`,
    `Days lived: ${s.days}. Nobody is counting. Mrs. Gander is counting.`,
  ];
}
const CREDITS = [
  ['Honk If You Owe', 3], ['', 1],
  ['A life in a very small village', 1], ['one bus ride from a very big city', 1], ['', 1],
  ['Mrs. Gander as herself', 1], ['Mayor Trundle, arriving shortly', 1], ['Dorrit, Tavi, Bartleby, Lady Ottoline', 1], ['Rocco, Nib, Ozzie, Yolanda, and Fitch (no refunds)', 1], ['Clementine, and the bee', 1], ['Dr. Quill, Madame Mothwick, Old Rind, Vesper', 1], ['Hester at the wheel', 1], ['Monsieur Fleece, Flavia Rosé, Magda', 1], ['Sir Reginald Bellows, Pemberton, Agent Brisket', 1], ['Languid Lou, Madame Nibbles', 1], ['Inspector Pimm, with reluctance', 1], ['', 1],
  ['Written and played by a very fast machine', 1], ['Built on the Pixel Engine kit', 1], ['All the music is new. All the voices are nonsense.', 1], ['', 1],
  ['Thank you for staying', 1], ['The goose has noted it', 1], ['', 1],
  ['Year Two begins in the morning', 2],
];
class Credits {
  constructor(g, onClose) { this.id = 'credits'; this.onClose = onClose; this.y = 280; this.t = 0; }
  labels() { return CREDITS.map((c) => c[0]); }
  open(g) { g.music.setOverride('credits'); g.events.emit('credits', {}); }
  update(g, inp, dt) {
    this.t += dt;
    this.y -= dt * (inp.confirm ? 60 : 16);
    const h = CREDITS.reduce((a, c) => a + 14 * c[1] + 2, 0);
    if (this.y < -h - 20 || inp.back) { g.music.setOverride(null); g.ui.pop(this); this.onClose?.(); }
  }
  prompts() { return null; }
  draw(g, hud) {
    hud.rect(0, 0, 480, 270, 'ink');
    let y = Math.round(this.y);
    for (const [t, s] of CREDITS) { if (t && y > -30 && y < 280) drawText(hud, 240, y, t, { align: 'center', color: s > 1 ? 'sand' : 'white', scale: s }); y += 14 * s + 2; }
  }
}
export const yearAlmanac = (g, onClose) => new YearPage(g, onClose);
export const creditsScreen = (g, onClose) => new Credits(g, onClose);
export { dim, textBlock };
