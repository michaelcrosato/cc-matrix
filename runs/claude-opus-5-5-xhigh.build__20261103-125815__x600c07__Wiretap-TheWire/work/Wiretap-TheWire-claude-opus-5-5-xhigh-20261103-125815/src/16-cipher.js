/* 16-cipher: "turn the pad" (App. C). Each digit becomes the one sitting in its place after the keypad turns a quarter
   clockwise (1→7 2→4 3→1 4→8 5→5 6→2 7→9 8→6 9→3 0→0). After the robbery Tee turns it the other way. The decoder: turn
   the keypad with L1/R1 and the digits change under your eyes; a match with a number you know locks it. */
const PAD = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
/** the digit sitting in d's place after r clockwise quarter turns of the pad */
function rot(d, r) {
  d = +d; if (d === 0 || d === 5) return d; r = ((r % 4) + 4) % 4; let row = Math.floor((d - 1) / 3), col = (d - 1) % 3;
  for (let i = 0; i < r; i++) { const nr = 2 - col, nc = row; row = nr; col = nc; }   // where the digit's place takes its new digit from
  return PAD[row][col];
}
const encode = (num, dir) => num.replace(/\d/g, d => rot(d, dir === 'ccw' ? 3 : 1));
const decodeWith = (num, r) => num.replace(/\d/g, d => rot(d, r));
const CODES = { 11: 'package ready', 22: 'call me at the usual phone', 33: 'the count', 44: 'need product', 55: 'all clear', 77: 'police around', 99: 'stop everything' };
const SENDERS = { '07': 'Tee', 13: 'Rook', 14: 'Pigeon', 21: 'Corey', '00': 'Easy\'s people' };
const PAGES = {
  m1: { group: 'mem', enc: '555-0781', code: '22', from: '07', dir: 'cw' }, m2: { group: 'mem', enc: '555-0743', code: '11', from: '00', dir: 'cw' },
  m3: { group: 'mem', enc: '555-0769', code: '33', from: '07', dir: 'cw' }, m4: { group: 'mem', enc: '555-0769', code: '77', from: '14', dir: 'cw' },
  m5: { group: 'mem', enc: '555-0798', code: '44', from: '07', dir: 'cw' },
  l1: { group: 's1', enc: '555-0743', code: '11', from: '00', dir: 'cw' }, l2: { group: 's1', enc: '555-0769', code: '33', from: '07', dir: 'cw' },
  flip: { group: 's2', enc: '555-0329', code: '22', from: '07', dir: 'ccw' }
};
const NUMBERS = { P1: '555-0187', P2: '555-0143', P3: '555-0129', P4: '555-0161', P5: '555-0174', PG: '555-0110' };
const Cipher = {
  r: 0, sel: null, s: null, fails: 0,
  /** which known number a decoded string matches (only numbers Dana knows) */
  match(num) { for (const k in STATE.numbers) if (STATE.numbers[k].known && STATE.numbers[k].n === num) return k; return null; },
  solved(id) { return !!(STATE.cipher.decoded && STATE.cipher.decoded[id]); },
  solvedCount(group) { return Object.keys(PAGES).filter(id => PAGES[id].group === group && this.solved(id)).length; },
  lock(id, k) {
    const p = PAGES[id], codes = hasFact('codes:known');
    STATE.cipher.decoded[id] = k + ' ' + NUMBERS[k] + (codes ? ' · ' + CODES[p.code] : ' · code ' + p.code) + (codes ? ' · from ' + SENDERS[p.from] : '');
    STATE.cipher.solved[p.dir] = true; addFact('page:' + id);
    addEvidence({ id: 'page:' + id, kind: 'page', ref: { '07': 'tee', '00': 'dale', 14: 'pigeon' }[p.from] || null, line: k, code: p.code, pts: 2, direct: true, text: 'Decoded page ' + p.enc + ' ' + p.code + ' ' + p.from + ' → ' + NUMBERS[k] + ' (' + (PHONE_LABEL[k] || k) + ')' });
    if (p.from === '07' && (k === 'P1' || k === 'P2')) addFact('num:' + k + ':tee');
    if (p.from === '00' && k === 'P3') addFact('num:P3:dale');
    if (p.from === '14') addFact('num:P1:pigeon');
    casePoint('page', 'Page decoded: ' + k + ', ' + (PHONE_LABEL[k] || ''));
    if (p.dir === 'ccw') { addFact('flip:solved'); Talk.radio('hal', 'They didn\'t change the lock. They just turned the key the other way.', 4); }
    bus.emit('decoded', { id, k });
  },
  open(ids, o = {}) {
    this.ids = ids; this.sel = ids.find(i => !this.solved(i)) || ids[0]; this.r = 0; this.fails = 0; this.o = o;
    const s = this.s = UI.open({ id: 'cipher', cls: '',
      html: () => this.html(), legend: () => [['tabPrev', 'Turn left'], ['tabNext', 'Turn right'], ['confirm', 'Choose page'], ['uiInfo', 'Hint'], ['cancel', 'Done']],
      onTab: d => this.turn(d), onInfo: () => this.hint(),
      onSelect: id => { if (id.startsWith('pg:')) { this.sel = id.slice(3); UI.render(s); } else if (id === 'L') this.turn(-1); else if (id === 'R') this.turn(1); },
      onBack: () => { UI.close(s); this.s = null; if (o.onClose) o.onClose(); } });
    return s;
  },
  turn(d) {
    this.r = ((this.r + d) % 4 + 4) % 4; Snd.play('knock', { pitch: 1.8, vol: .4 });
    const id = this.sel, p = PAGES[id];
    if (id && !this.solved(id)) {
      const k = this.match(decodeWith(p.enc, this.r));
      if (k) { Snd.play('secret'); this.lock(id, k); const nx = this.ids.find(i => !this.solved(i)); if (nx) game.after(.6, () => { this.sel = nx; if (this.s) UI.render(this.s); }); }
      else { this.fails++; if (this.fails >= 8 && game.settings.hints && tip('cipherHint')) Toast('Hal', 'Try the other way round. Locks turn both ways.'); }
    }
    if (this.s) UI.render(this.s);
  },
  hint() { Talk.radio(hasFact('stmt:corey:code') ? 'corey' : 'hal', hasFact('stmt:corey:code') ? 'The numbers... it\'s the phone, man. You turn it.' : 'Pager codes on a corner are never hard. They\'re a habit. Look at the keypad.', 4); },
  html() {
    const p = PAGES[this.sel], dec = p ? decodeWith(p.enc, this.r) : '', k = p ? this.match(dec) : null, solved = p && this.solved(this.sel), codes = hasFact('codes:known');
    const keypad = `<div style="display:flex;flex-direction:column;align-items:center;gap:.5em"><div class="keypad" style="transform:rotate(${this.r * 90}deg)">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<b style="transform:rotate(${-this.r * 90}deg)">${n}</b>`).join('')}</div>
      <div class="keypad"><b>*</b><b>0</b><b>#</b></div><div><button class="btn" data-f="L">⟲ Turn</button><button class="btn" data-f="R">Turn ⟳</button></div><p class="muted">Turned ${['0°', '90° right', '180°', '90° left'][this.r]}</p></div>`;
    return `<div class="panel file"><div class="kicker">The pager · ${this.ids.filter(i => this.solved(i)).length} / ${this.ids.length} decoded</div><h1>Turn the pad</h1>
      <div style="display:flex;gap:2em;flex-wrap:wrap;align-items:flex-start">${keypad}
      <div style="flex:1;min-width:16em"><div class="digits">${p ? esc(p.enc) + ' <span class="muted">' + esc(p.code + ' ' + p.from) + '</span>' : ''}</div>
      <div class="digits" style="color:#3a2a14">→ ${esc(solved ? NUMBERS[(STATE.cipher.decoded[this.sel] || '').split(' ')[0]] || dec : dec)}</div>
      <p>${solved ? `<span class="match">MATCH: ${esc(STATE.cipher.decoded[this.sel])}</span>` : k ? `<span class="match">MATCH</span>` : `<span class="nomatch">NO MATCH</span> <span class="muted">against the numbers in your notebook</span>`}</p>
      ${codes ? `<p class="muted">Code ${esc(p.code)}: ${esc(CODES[p.code])} · sender ${esc(p.from)}: ${esc(SENDERS[p.from])}</p>` : '<p class="muted">The two-digit codes go out in the clear. Somebody has to tell you what they mean.</p>'}
      <div class="choices">${this.ids.slice(0, 6).map(i => `<button class="btn" data-f="pg:${i}">${this.solved(i) ? '✓ ' : '· '}${esc(PAGES[i].enc + ' ' + PAGES[i].code + ' ' + PAGES[i].from)}</button>`).join('')}</div></div></div></div>`;
  }
};
