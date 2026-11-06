// The Ledger: five big lines, written as Harrow would write it.
export class Ledger {
  v = { moved: 0, paid: 0, friends: 0, stones: 0, cells: 0 }; notes = [];
  constructor(game) { this.game = game; }
  reset() { this.v = { moved: 0, paid: 0, friends: 0, stones: 0, cells: 0 }; this.notes = []; }
  add(k, n) { this.v[k] = (this.v[k] ?? 0) + n; }
  note(kind, a, b) { this.notes.push([kind, a, b]); }
  hectares() { return Math.round(this.game.fire.counts.burnt * 0.25 * 10) / 10; }
  lines() {
    const v = this.v, one = (n, a, b) => `${n} ${n === 1 ? a : b}`;
    return [
      { big: one(this.hectares(), 'HECTARE', 'HECTARES'), small: 'BURNED, BY MY COUNT. THE GREEN COMES BACK FASTER THAN THE PEOPLE.' },
      { big: one(v.moved, 'PERSON', 'PEOPLE'), small: 'MOVED OFF THE LAND. THE SHEET SHOWS WHERE THEY WERE.' },
      { big: one(v.paid, 'MAN', 'MEN'), small: 'YOU WERE PAID TO KILL. THE INVOICES AGREE.' },
      { big: one(v.friends, 'FRIEND', 'FRIENDS'), small: 'LOST. THESE ARE NOT ON ANY SHEET.' },
      { big: one(v.stones, 'STONE', 'STONES'), small: 'EARNED. ROUGH. NOTHING HERE IS CUT.' },
    ];
  }
  toJson() { return { v: this.v, notes: this.notes }; }
  fromJson(j) { this.v = j.v; this.notes = j.notes; }
}
