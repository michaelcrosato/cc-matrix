// Olympiyikes! scenes C: single event select, records, how to play, about & credits, hub waiting screen.
(() => {
'use strict';
const E = My3D2dge, O = OLY, { px } = E, game = O.game, clamp = E.clamp;

const MEDAL_COL = ['', '#ffd23a', '#d8dce6', '#e0a070'];
const medalDot = (g, x, y, m, s = 5) => { if (!m || m > 3) { px.disc(g, x, y, s, '#2a3156'); return; } px.disc(g, x, y, s, '#6a4a10'); px.disc(g, x, y, s - 1, MEDAL_COL[m]); O.T(g, m + '', x, y - 3, '#5a3a10', { s: 1, align: 'center', shadow: false }); };

// ================================================================ SINGLE EVENT SELECT (4 x 3 grid)
O.scene('single', {
  menu: true, lock: .3, view: 'brawler',
  enter() { this.i = this.i || 0; game.setView('brawler'); O.music('title'); },
  update(dt) {
    if (O.locked()) return;
    for (const p of game.players) {
      let c = this.i; if (p.repeat('right', .3, .12)) c = c % 4 === 3 ? c - 3 : c + 1; if (p.repeat('left', .3, .12)) c = c % 4 === 0 ? c + 3 : c - 1; if (p.repeat('down', .3, .12)) c = (c + 4) % 12; if (p.repeat('up', .3, .12)) c = (c + 8) % 12;
      if (c !== this.i) { this.i = c; O.sfx('select'); }
      if (p.pressed('confirm')) { O.sfx('confirm'); return O.go('eventcard', { ev: O.SCHEDULE_ALL()[this.i], single: true }); }
      if (p.pressed('cancel')) { O.sfx('cancel'); return O.go('nations', { next: 'single' }); }
    }
    const pt = O.lastPointer, c = game.input.clicked();
    if (this.rects) this.rects.forEach((q, k) => { if (O.pointerMoved && pt && pt[0] >= q[0] && pt[0] < q[0] + q[2] && pt[1] >= q[1] && pt[1] < q[1] + q[3] && this.i !== k) { this.i = k; O.sfx('select'); } if (c && c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]) { this.i = k; O.go('eventcard', { ev: O.SCHEDULE_ALL()[k], single: true }); } });
  },
  draw(r) {
    r.sky(['#101a50', '#2a2c78', '#6a3a8a']);
    r.overlay(g => {
      O.stars(g, r, 40, 13); O.T(g, 'SINGLE EVENT', r.W / 2, 6, '#ffe27a', { s: 2, align: 'center' });
      const ids = O.SCHEDULE_ALL(), lab = O.store.get('laurels', {}); this.rects = [];
      const tw = 90, th = 48, gx = (r.W - (tw * 4 + 12 * 3)) / 2, gy = 26;
      ids.forEach((id, i) => {
        const ev = O.EV[id], x = gx + (i % 4) * (tw + 12), y = gy + Math.floor(i / 4) * (th + 8), sel = i === this.i; this.rects.push([x, y, tw, th]);
        if (sel) { O.focusBar(g, x - 2, y - 2, tw + 4, th + 4); } px.rect(g, x, y, tw, th, ev.season === 'summer' ? '#1a4a8a' : '#2a2a88'); if (sel) px.rect(g, x + 1, y + 1, tw - 2, th - 2, ev.season === 'summer' ? '#2a62b0' : '#3a3aa8');
        O.picto(g, id, x + 20, y + 20, 1.1, '#fff'); O.T(g, ev.name.toUpperCase(), x + tw / 2, y + th - 12, '#fff', { s: 1, align: 'center' }); medalDot(g, x + tw - 12, y + 10, lab[id] && lab[id] <= 3 ? lab[id] : 0, 6);
        O.T(g, ev.season === 'summer' ? 'SUMMER' : 'WINTER', x + 38, y + 8, ev.season === 'summer' ? '#ffd36a' : '#bfe0ff', { s: 1 });
      });
      const ev = O.EV[ids[this.i]]; O.wrap(ev.desc, r.W - 40, 1).forEach((l, i) => O.T(g, l, 20, r.H - 62 + i * 10, '#dfe6ff', { s: 1 }));
      O.strip(g, r, [['confirm', 'Choose'], ['cancel', 'Back']], 0);
    });
  }
});
O.SCHEDULE_ALL = () => ['sprint', 'javelin', 'swim', 'diving', 'archery', 'weights', 'skijump', 'downhill', 'bobsled', 'figure', 'curling', 'hockey'];

// ================================================================ RECORDS
O.scene('records', {
  menu: true, lock: .3, view: 'brawler',
  enter() { this.tab = this.tab || 0; game.setView('brawler'); },
  update(dt) {
    if (O.locked()) return; const n = 14;
    for (const p of game.players) { if (p.repeat('right', .3, .12) || p.pressed('tabR')) { this.tab = (this.tab + 1) % n; O.sfx('select'); } if (p.repeat('left', .3, .12) || p.pressed('tabL')) { this.tab = (this.tab + n - 1) % n; O.sfx('select'); } if (p.pressed('cancel')) { O.sfx('cancel'); return O.go('menu'); } }
    const c = game.input.clicked(); if (c && this.tabR) this.tabR.forEach((q, k) => { if (c[0] >= q[0] && c[0] < q[0] + q[2] && c[1] >= q[1] && c[1] < q[1] + q[3]) { this.tab = k; O.sfx('select'); } });
  },
  draw(r) {
    r.sky(['#101a50', '#223a8a', '#4a6ab0']);
    r.overlay(g => {
      O.stars(g, r, 40, 21); O.T(g, 'RECORDS', r.W / 2, 4, '#ffe27a', { s: 2, align: 'center' });
      const ids = O.SCHEDULE_ALL(); this.tabR = []; const tw = (r.W - 20) / 14;
      for (let k = 0; k < 14; k++) { const x = 10 + k * tw, sel = k === this.tab; this.tabR.push([x, 22, tw, 16]); px.rect(g, x, 22, tw - 1, 16, sel ? '#f2b632' : 'rgba(10,14,50,.85)'); if (k < 12) O.PICTO[ids[k]](g, x + tw / 2, 30, .5, sel ? '#101533' : '#cfd8ff'); else O.T(g, k === 12 ? 'L' : 'C', x + tw / 2, 26, sel ? '#101533' : '#fff', { s: 1, align: 'center', shadow: false }); }
      if (this.tab < 12) {
        const ev = O.EV[ids[this.tab]]; O.T(g, ev.name.toUpperCase(), r.W / 2, 44, '#fff', { s: 2, align: 'center' });
        O.T(g, 'WORLD RECORD  ' + ev.fmt(O.Records.worldRecord(ev)), r.W / 2, 64, '#ffb04a', { s: 1, align: 'center' });
        const t = O.Records.table(ev); for (let i = 0; i < 5; i++) { const y = 80 + i * 22, row = t[i]; px.rect(g, 60, y, r.W - 120, 19, 'rgba(10,14,50,.85)'); O.T(g, (i + 1) + '', 72, y + 3, '#ffe27a', { s: 2 }); if (row) { O.T(g, row.n, 100, y + 3, '#fff', { s: 2 }); O.flag(g, 150, y + 2, 22, 14, O.NAT[row.nat] || O.NATIONS[0]); O.T(g, ev.fmt(row.v), r.W - 70, y + 3, '#ffe27a', { s: 2, align: 'right' }); } else O.T(g, '---', 100, y + 3, '#555b80', { s: 2 }); }
      } else if (this.tab === 12) {
        O.T(g, 'LAURELS', r.W / 2, 44, '#fff', { s: 2, align: 'center' }); const lab = O.store.get('laurels', {});
        ids.forEach((id, i) => { const x = 40 + (i % 4) * 88, y = 66 + Math.floor(i / 4) * 44; O.picto(g, id, x + 12, y + 12, .9, '#fff'); medalDot(g, x + 36, y + 12, lab[id] && lab[id] <= 3 ? lab[id] : 0, 8); O.T(g, lab[id] ? (lab[id] === 1 ? 'GOLD' : lab[id] === 2 ? 'SILVER' : lab[id] === 3 ? 'BRONZE' : 'ENTERED') : '-', x + 12, y + 28, '#cfd8ff', { s: 1 }); });
      } else {
        O.T(g, 'MEDAL CABINET', r.W / 2, 44, '#fff', { s: 2, align: 'center' }); const cab = O.store.get('cabinet', {});
        ids.forEach((id, i) => O.PICTO[id](g, 104 + i * 25, 66, .5, '#cfd8ff'));
        O.NATIONS.forEach((n, ri) => { const y = 78 + ri * 16; O.flag(g, 24, y, 20, 12, n); O.T(g, n.id, 48, y + 2, '#fff', { s: 1 }); ids.forEach((id, i) => medalDot(g, 104 + i * 25, y + 6, cab[n.id] && cab[n.id][id] ? cab[n.id][id] : 0, 5)); });
      }
      O.strip(g, r, [[['left', 'right'], 'Tabs'], ['cancel', 'Back']], 0);
    });
  }
});

// ================================================================ HOW TO PLAY
const BASICS = [
  ['MASH', 'Alternate the two buttons as fast as you can. On a pad that is the square and circle buttons, or L1 and R1. On a keyboard it is J and K.'],
  ['TIMING', 'Many events hide a moving marker. Press the action button when it is in the green. Timing assist in Settings widens it.'],
  ['HYPE & TURBO', 'Good moves fill the hype flame. When it is full, press the turbo button for five seconds of ON FIRE power.'],
  ['YIKES!', 'Falls, fouls and false starts are Olympiyikes. They look terrible, make the crowd gasp, and even pay a little hype.']
];
O.scene('howto', {
  menu: true, lock: .3, view: 'brawler',
  enter() { this.page = 0; game.setView('brawler'); },
  update() {
    if (O.locked()) return; const n = 5;
    for (const p of game.players) { if (p.repeat('right', .3, .12) || p.pressed('tabR')) { this.page = (this.page + 1) % n; O.sfx('select'); } if (p.repeat('left', .3, .12) || p.pressed('tabL')) { this.page = (this.page + n - 1) % n; O.sfx('select'); } if (p.pressed('cancel')) { O.sfx('cancel'); return O.go('menu'); } }
  },
  draw(r) {
    r.sky(['#101a50', '#223a8a', '#4a6ab0']);
    r.overlay(g => {
      O.stars(g, r, 40, 31); O.T(g, 'HOW TO PLAY', r.W / 2, 4, '#ffe27a', { s: 2, align: 'center' });
      const ids = O.SCHEDULE_ALL();
      if (this.page === 0) { BASICS.forEach(([h, t], i) => { const y = 26 + i * 40; O.panel(g, 20, y, r.W - 40, 36, { alpha: .85 }); O.T(g, h, 28, y + 4, '#ffe27a', { s: 2 }); O.wrap(t, r.W - 60, 1).forEach((l, k) => O.T(g, l, 28, y + 20 + k * 8, '#fff', { s: 1 })); }); }
      else { const per = 4, base = (this.page - 1) * 4; for (let k = 0; k < per; k++) { const id = ids[base + k]; if (!id) continue; const ev = O.EV[id], y = 24 + k * 44; O.panel(g, 14, y, r.W - 28, 41, { alpha: .85 }); O.picto(g, id, 36, y + 20, 1, '#fff'); O.T(g, ev.name.toUpperCase(), 58, y + 4, '#ffe27a', { s: 1 }); O.wrap(ev.goal, r.W - 140, 1).forEach((l, i) => O.T(g, l, 58, y + 15 + i * 9, '#fff', { s: 1 })); let x = 58; const yy = y + 30; ev.rows({}).slice(0, 3).forEach(row => { if (Array.isArray(row[0])) { if (row[0][0] === 'mashL') x += O.Prompt.pair(g, x, yy - 1, 'mashL', 'mashR', { pi: 0 }) + 2; else x += O.Prompt.draw(g, x, yy - 1, row[0][0], { pi: 0 }) + 2; } else x += O.Prompt.draw(g, x, yy - 1, row[0], { pi: 0 }) + 2; O.T(g, row[1], x, yy, '#cfd8ff', { s: 1 }); x += O.TW(row[1], 1) + 8; }); } }
      for (let i = 0; i < 5; i++) px.rect(g, r.W / 2 - 25 + i * 11, r.H - 34, 8, 4, i === this.page ? '#ffe27a' : '#445');
      O.strip(g, r, [[['left', 'right'], 'Page'], ['cancel', 'Back']], 0);
    });
  }
});

// ================================================================ ABOUT & CREDITS
O.scene('about', {
  menu: true, lock: .3, view: 'brawler',
  enter() { this.page = 0; this.scroll = 0; game.setView('brawler'); },
  update(dt) {
    if (O.locked()) return; const pages = O.ABOUT.pages, n = pages.length;
    for (const p of game.players) { if (p.repeat('right', .3, .12) || p.pressed('tabR')) { this.page = (this.page + 1) % n; this.scroll = 0; O.sfx('select'); } if (p.repeat('left', .3, .12) || p.pressed('tabL')) { this.page = (this.page + n - 1) % n; this.scroll = 0; O.sfx('select'); } if (p.repeat('down', .25, .06)) this.scroll += 1; if (p.repeat('up', .25, .06)) this.scroll = Math.max(0, this.scroll - 1); if (p.pressed('cancel')) { O.sfx('cancel'); return O.go('menu'); } }
    this.scroll = Math.min(this.scroll, Math.max(0, (this.nLines || 0) - 14));
  },
  draw(r) {
    r.sky(['#101a50', '#223a8a', '#4a6ab0']);
    r.overlay(g => {
      O.stars(g, r, 30, 41); const pg = O.ABOUT.pages[this.page]; O.T(g, 'ABOUT & CREDITS', r.W / 2, 4, '#ffe27a', { s: 2, align: 'center' });
      O.T(g, pg.title.toUpperCase(), r.W / 2, 22, '#fff', { s: 2, align: 'center' });
      const w = r.W - 40; O.panel(g, 14, 40, r.W - 28, r.H - 80, { alpha: .88 });
      const lines = []; pg.lines.forEach(l => { if (l === '') lines.push(''); else O.wrap(l, w - 12, 1).forEach(x => lines.push(x)); }); this.nLines = lines.length;
      const vis = Math.floor((r.H - 96) / 9); lines.slice(this.scroll, this.scroll + vis).forEach((l, i) => O.T(g, l, 24, 48 + i * 9, '#e6ecff', { s: 1, shadow: '#000' }));
      if (lines.length > vis) O.T(g, (this.scroll > 0 ? '↑ ' : '') + (this.scroll + vis < lines.length ? '↓' : ''), r.W - 30, r.H - 52, '#ffe27a', { s: 1, align: 'right' });
      for (let i = 0; i < O.ABOUT.pages.length; i++) px.rect(g, r.W / 2 - O.ABOUT.pages.length * 6 + i * 12, r.H - 32, 8, 4, i === this.page ? '#ffe27a' : '#445');
      O.strip(g, r, [[['left', 'right'], 'Page'], [['up', 'down'], 'Scroll'], ['cancel', 'Back']], 0);
    });
  }
});
})();
