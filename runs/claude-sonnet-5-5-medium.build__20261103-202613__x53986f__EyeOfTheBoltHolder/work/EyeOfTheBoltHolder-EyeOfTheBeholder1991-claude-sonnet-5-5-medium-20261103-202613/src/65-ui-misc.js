/* MAP, JOURNAL, ABOUT, GAME OVER, ENDING, NPC TALK. */
(() => {
  const E = My3D2dge, P = () => UI.PAL;
  UI.screens.map = {
    enter() { this.fl = B.S.floor; this.pan = [0, 0]; },
    update(dt) {
      const inp = UI.game.input, S = B.S, vis = B.ORDER.filter(f => S.floors[f].visited);
      if (inp.pressed('tabL') || inp.pressed('tabR')) { const i = vis.indexOf(this.fl), d = inp.pressed('tabR') ? 1 : -1; this.fl = vis[(i + d + vis.length) % vis.length] || this.fl; UI.sfx('ui_tab'); }
      if (inp.repeat('left', .2, .05)) this.pan[0] += 8; if (inp.repeat('right', .2, .05)) this.pan[0] -= 8; if (inp.repeat('up', .2, .05)) this.pan[1] += 8; if (inp.repeat('down', .2, .05)) this.pan[1] -= 8;
      if (inp.pressed('cancel') || inp.pressed('map') || inp.pressed('start')) { inp.consume('cancel'); UI.close(); } else if (inp.pressed('journal')) { UI.close(); UI.open('journal'); }
    },
    draw(g, r) {
      const S = B.S, def = B.FLOORS[this.fl], F = S.floors[this.fl]; if (!def || def.race) { } UI.veil(g, r, .7); UI.panel(g, 6, 4, r.W - 12, r.H - 8, { bg: ['#d8c898', '#b8a470'] });
      const s = Math.max(5, Math.min(10, Math.floor(Math.min((r.W - 40) / def.w, (r.H - 60) / def.h)))), w = def.w * s, h = def.h * s, x0 = Math.round((r.W - w) / 2) + this.pan[0], y0 = 22 + this.pan[1];
      E.font.text(g, def.name, r.W / 2, 8, '#3a2a10', { align: 'center', outline: false, scale: 1 });
      const seen = (x, y) => x >= 0 && y >= 0 && x < def.w && y < def.h && (F.seen[y * def.w + x] || B.CHEATS.reveal), ch = (x, y) => B.chAt(this.fl, x, y);
      for (let y = 0; y < def.h; y++) for (let x = 0; x < def.w; x++) {
        const c = ch(x, y), k = B.key(x, y); const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(d => seen(x + d[0], y + d[1]) && ch(x + d[0], y + d[1]) !== '#');
        if (c === '#') { if (near) { g.fillStyle = '#4a3a20'; g.fillRect(x0 + x * s, y0 + y * s, s, s); } continue; } if (!seen(x, y)) continue;
        let col = '#e8dcb0'; if (c === '+' || c === 'L' || c === 'M') { const d = F.doors[k]; col = d && d.open ? '#b8a070' : c === 'L' ? '#a05a3a' : c === 'M' ? '#7a5ab0' : '#8a5a2a'; } else if (c === '=') col = F.gates[def.gates[k]] ? '#b8a070' : '#6a6a78'; else if (c === '<' || c === '>') col = '#3a8aaa'; else if (c === 'P') col = '#7a7a5a'; else if (c === 'O') col = '#1a1410'; else if (c === 'H') col = F.secrets[k] ? '#e8dcb0' : '#4a3a20';
        g.fillStyle = col; g.fillRect(x0 + x * s, y0 + y * s, s, s);
        if (c === '>' || c === '<') { g.fillStyle = '#fff'; g.fillRect(x0 + x * s + s / 2 - 1, y0 + y * s + 2, 2, s - 4); }
        if ((def.features || []).some(f => f.k === 'plaque' && f.at[0] === x && f.at[1] === y)) { g.fillStyle = '#6a4a20'; g.fillRect(x0 + x * s + 1, y0 + y * s + 1, 2, 2); }
      }
      if (S.floor === this.fl) {
        const p = S.party, px = x0 + p.cx * s + s / 2, py = y0 + p.cy * s + s / 2; g.fillStyle = '#c02020'; g.beginPath(); g.moveTo(px + B.DX[p.dir] * s * .45, py + B.DY[p.dir] * s * .45); g.lineTo(px + B.DX[(p.dir + 1) % 4] * s * .3 - B.DX[p.dir] * s * .25, py + B.DY[(p.dir + 1) % 4] * s * .3 - B.DY[p.dir] * s * .25); g.lineTo(px + B.DX[(p.dir + 3) % 4] * s * .3 - B.DX[p.dir] * s * .25, py + B.DY[(p.dir + 3) % 4] * s * .3 - B.DY[p.dir] * s * .25); g.fill();
        for (const n of F.npcs || []) if (!n.gone && seen(n.cx, n.cy)) { g.fillStyle = '#2a8a3a'; g.fillRect(x0 + n.cx * s + s / 2 - 1, y0 + n.cy * s + s / 2 - 1, 3, 3); }
        if (p.members.some(m => m.cls === 'ranger' && m.state === 'ok') || B.CHEATS.reveal) for (const m of F.mons) if (m.hp > 0 && (B.CHEATS.reveal || Math.abs(m.cx - p.cx) + Math.abs(m.cy - p.cy) <= 4)) { g.fillStyle = '#b02020'; g.fillRect(x0 + m.cx * s + s / 2 - 1, y0 + m.cy * s + s / 2 - 1, 2, 2); }
      }
      UI.prompts(g, [['tabL', 'Floor'], ['up', 'Pan'], ['journal', 'Journal'], ['cancel', 'Close']], r.W / 2, r.H - 16, { center: true });
    }
  };
  UI.screens.journal = {
    enter() { this.tab = 0; this.i = 0; this.read = null; this.F = new UI.Focus(); },
    update(dt) {
      const inp = UI.game.input, S = B.S; if (this.read) { if (inp.pressed('cancel') || inp.pressed('confirm')) { inp.consume('cancel'); inp.consume('confirm'); this.read = null; } return; }
      if (inp.pressed('tabL')) { this.tab = (this.tab + 3) % 4; this.i = 0; UI.sfx('ui_tab'); } if (inp.pressed('tabR')) { this.tab = (this.tab + 1) % 4; this.i = 0; UI.sfx('ui_tab'); }
      const n = this.tab === 1 ? S.notes.length : 0; if (inp.repeat('down', .3, .08)) this.i = Math.min(Math.max(0, n - 1), this.i + 1); if (inp.repeat('up', .3, .08)) this.i = Math.max(0, this.i - 1);
      if (this.tab === 1 && inp.pressed('confirm') && S.notes.length) { inp.consume('confirm'); this.read = S.notes[this.i]; }
      const ck = inp.clicked(); if (ck && ck[1] < 28) { const r = UI.game.r; const w = Math.floor((r.W - 20) / 4); const t = Math.floor((ck[0] - 10) / w); if (t >= 0 && t < 4) { this.tab = t; this.i = 0; } }
      if (inp.pressed('cancel') || inp.pressed('journal')) { inp.consume('cancel'); UI.close(); }
    },
    draw(g, r) {
      const S = B.S, P2 = P(), names = ['Quests', 'Notes', 'Deeds', 'Log']; UI.veil(g, r, .7); UI.panel(g, 6, 4, r.W - 12, r.H - 8);
      const tw = Math.floor((r.W - 20) / 4); names.forEach((n, i) => { UI.text(g, n, 10 + i * tw + tw / 2, 10, i === this.tab ? P2.focus : P2.dim, { align: 'center' }); if (i === this.tab) { g.fillStyle = P2.focus; g.fillRect(12 + i * tw, 20, tw - 4, 1); } });
      let y = 28; const line = (t, c, o) => { const ls = UI.wrap(t, r.W - 40); for (const l of ls) { UI.text(g, l, 16, y, c || P2.text, o); y += 10; } };
      if (this.read) { UI.panel(g, 24, 24, r.W - 48, r.H - 50, { bg: ['#d8c898', '#b8a470'], focus: true }); const n = B.NOTES[this.read]; UI.text(g, n[0], r.W / 2, 34, '#3a2a10', { align: 'center' }); UI.wrap(n[1], r.W - 80).forEach((l, i) => E.font.text(g, l, 36, 52 + i * 10, '#2a1a08', { outline: false })); UI.prompts(g, [['cancel', 'Close']], r.W / 2, r.H - 40, { center: true }); return; }
      if (this.tab === 0) { for (const [id, nm, tx, done] of B.QUESTS) { const d = done(S.flags); UI.text(g, (d ? '+ ' : '• ') + nm, 16, y, d ? P2.good : P2.focus); y += 10; UI.wrap(tx, r.W - 50).forEach(l => { UI.text(g, l, 24, y, P2.text); y += 9; }); y += 4; } for (const n of ['tamsin', 'durgan', 'veil']) { UI.text(g, (S.flags['joined_' + n] ? '+ ' : '• ') + B.NPCS[n].name + (S.flags['joined_' + n] ? ' travels with you.' : ' waits to be found.'), 16, y, S.flags['joined_' + n] ? P2.good : P2.text); y += 10; } }
      else if (this.tab === 1) { if (!S.notes.length) line('You have read nothing yet. Press ' + UI.game.input.label('use') + ' at a plaque.', P2.dim); S.notes.forEach((id, i) => { const sel = i === this.i; UI.text(g, (sel ? '▸ ' : '  ') + B.NOTES[id][0], 16, y, sel ? P2.focus : P2.text); y += 10; }); }
      else if (this.tab === 2) { UI.text(g, 'Hidden deeds: ' + Object.values(S.special).filter(Boolean).length + ' of 3', 16, y, P2.focus); y += 12; const D = { d1: ['The Offering', 'A forgiven dagger.'], d2: ['The Hour', 'The great clock strikes.'], d3: ['The Flames', 'Three flames, in order.'] }; for (const k of ['d1', 'd2', 'd3']) { const got = S.special[k]; UI.text(g, got ? '+ ' + D[k][0] + ' - ' + D[k][1] : '? ???', 16, y, got ? P2.good : P2.dim); y += 10; } y += 6; UI.text(g, 'Secrets found: ' + S.stats.secrets + ' of 3', 16, y, P2.focus); }
      else { const lg = S.log.slice(-14); lg.forEach((t, i) => { const ls = UI.wrap(t, r.W - 40); UI.text(g, ls[0], 16, y, P2.text); y += 10; }); }
      UI.prompts(g, [['tabL', 'Tab'], ['confirm', this.tab === 1 ? 'Read' : ''], ['cancel', 'Close']].filter(x => x[1]), r.W / 2, r.H - 16, { center: true });
    }
  };
  UI.screens.about = {
    pause: true,
    enter() { this.page = 0; this.scroll = 0; },
    pages() { return B.ABOUT.pages; },
    update(dt) {
      const inp = UI.game.input, n = this.pages().length; if (inp.pressed('tabL')) { this.page = (this.page + n - 1) % n; this.scroll = 0; UI.sfx('ui_tab'); } if (inp.pressed('tabR')) { this.page = (this.page + 1) % n; this.scroll = 0; UI.sfx('ui_tab'); }
      if (inp.repeat('down', .25, .04)) this.scroll += 8; if (inp.repeat('up', .25, .04)) this.scroll = Math.max(0, this.scroll - 8);
      const ck = inp.clicked(); if (ck) { const r = UI.game.r, w = Math.floor((r.W - 12) / n); if (ck[1] < 22) { this.page = Math.max(0, Math.min(n - 1, Math.floor((ck[0] - 6) / w))); this.scroll = 0; } else if (ck[0] > r.W / 2) this.scroll += 30; else this.scroll = Math.max(0, this.scroll - 30); }
      if (inp.pressed('cancel')) { inp.consume('cancel'); UI.close(); }
    },
    draw(g, r) {
      const pages = this.pages(), P2 = P(); UI.veil(g, r, .85); UI.panel(g, 4, 3, r.W - 8, r.H - 6); const w = Math.floor((r.W - 12) / pages.length);
      pages.forEach((pg, i) => { UI.text(g, pg.tab, 6 + i * w + w / 2, 8, i === this.page ? P2.focus : P2.dim, { align: 'center', font: 'tiny' }); if (i === this.page) { g.fillStyle = P2.focus; g.fillRect(8 + i * w, 16, w - 4, 1); } });
      g.save(); g.beginPath(); g.rect(8, 20, r.W - 16, r.H - 40); g.clip(); let y = 24 - this.scroll; const pg = pages[this.page];
      if (pg.title) { UI.title(g, pg.title, r.W / 2, y, { scale: 2 }); y += 24; }
      let total = 0; for (const [k, v] of pg.rows) { if (v == null) { UI.text(g, k, 12, y, P2.focus); y += 11; total += 11; continue; } if (k.length > 20) { const ks = UI.wrap(k, r.W - 34), ls2 = UI.wrap(v, r.W - 34); ks.forEach((l, i) => UI.text(g, l, 12, y + i * 9, P2.focus)); y += ks.length * 9 + 1; total += ks.length * 9 + 1; ls2.forEach((l, i) => UI.text(g, l, 16, y + i * 9, P2.text)); y += ls2.length * 9 + 6; total += ls2.length * 9 + 6; continue; } const ls = UI.wrap(v, r.W - 110); UI.text(g, k, 12, y, P2.focus, { font: 'normal' }); ls.forEach((l, i) => { UI.text(g, l, 92, y + i * 9, P2.text); }); const hh = Math.max(11, ls.length * 9 + 3); y += hh; total += hh; }
      g.restore(); this.max = Math.max(0, total + 30 - (r.H - 50)); this.scroll = Math.min(this.scroll, this.max);
      UI.prompts(g, [['tabL', 'Page'], ['down', 'Scroll'], ['cancel', 'Back']], r.W / 2, r.H - 15, { center: true });
    }
  };
  UI.screens.over = {
    pause: true,
    enter() { this.F = new UI.Focus(); this.F.id = 'last'; },
    update(dt) { const F = this.F, r = UI.game.r; F.begin(); const x0 = Math.round(r.W / 2) - 60; [['last', 'Load last save'], ['load', 'Load game'], ['title', 'Title']].forEach((b, i) => F.add(b[0], x0, 110 + i * 18, 120, 15)); const res = F.run(); if (!res || !res.item || (res.act !== 'confirm' && res.act !== 'click')) return; const id = res.item.id; if (id === 'last') { const s = UI.game.saves.latest(); if (s) UI.game.saves.load(s.slot); else UI.sfx('ui_err'); } else if (id === 'load') UI.game.saves.show('load'); else { UI.close(); B.quit(); } },
    draw(g, r) { UI.veil(g, r, .78); UI.title(g, 'THE PARTY IS LOST', r.W / 2, 46, { scale: 3, colors: ['#ffe0e0', '#ff7a6a', '#c8202a', '#6a1018'], depthColor: '#2a0408' }); UI.text(g, 'The Drains keep what they take.', r.W / 2, 90, '#c8b8b0', { align: 'center' }); const F = this.F; ['Load last save', 'Load game', 'Title'].forEach((t, i) => { const q = F.items[i]; if (!q) return; const sel = F.cur === i; UI.panel(g, q.x, q.y, q.w, q.h, { focus: sel }); UI.text(g, t, q.x + q.w / 2, q.y + 4, sel ? P().focus : P().text, { align: 'center' }); }); }
  };
  UI.screens.ending = {
    pause: true,
    enter() { this.ph = 0; this.t = 0; this.F = new UI.Focus(); B.Music.play('ending'); UI.cutscene(B.ENDING, () => { this.ph = 1; this.t = 0; }); },
    update(dt) { this.t += dt; if (this.ph === 1) { const inp = UI.game.input; if (this.t > 34 || inp.pressed('confirm') || inp.pressed('cancel')) { inp.consume('confirm'); inp.consume('cancel'); this.ph = 2; } } else if (this.ph === 2) { const F = this.F, r = UI.game.r; F.begin(); F.add('title', Math.round(r.W / 2) - 50, r.H - 36, 100, 15); const res = F.run(); if (res && (res.act === 'confirm' || res.act === 'click')) { UI.close(); UI.endShown = false; B.quit(); } } },
    draw(g, r) {
      const S = B.S, P2 = P(); if (this.ph === 0) { UI.veil(g, r, .4); return; } UI.veil(g, r, .9);
      if (this.ph === 1) { const cr = B.ABOUT.pages[B.ABOUT.pages.length - 1].rows; let y = r.H - this.t * 8; UI.title(g, 'EYE OF THE BOLT-HOLDER', r.W / 2, y, { scale: 2 }); y += 30; for (const [k, v] of cr) { UI.text(g, k, r.W / 2, y, P2.focus, { align: 'center' }); y += 11; if (v) UI.wrap(v, r.W - 60).forEach(l => { UI.text(g, l, r.W / 2, y, P2.text, { align: 'center' }); y += 10; }); y += 6; } UI.prompts(g, [['confirm', 'Skip']], r.W / 2, r.H - 14, { center: true }); }
      else { UI.panel(g, r.W / 2 - 110, 20, 220, r.H - 70); UI.title(g, 'THE LOCKS LET GO', r.W / 2, 28, { scale: 2 }); const t = S.playTime, rows = [['Time', Math.floor(t / 3600) + 'h ' + Math.floor(t / 60 % 60) + 'm'], ['Monsters felled', S.stats.kills], ['Secrets found', S.stats.secrets + ' of 3'], ['Hidden deeds', Object.values(S.special).filter(Boolean).length + ' of 3'], ['Deaths', S.stats.deaths], ['Highest level', Math.max(...S.party.members.map(m => m.lvl))], ['Rests', S.stats.rests]]; rows.forEach((rw, i) => { UI.text(g, rw[0], r.W / 2 - 90, 60 + i * 13, P2.dim); UI.text(g, String(rw[1]), r.W / 2 + 90, 60 + i * 13, P2.focus, { align: 'right' }); }); const q = this.F.items[0]; if (q) { UI.panel(g, q.x, q.y, q.w, q.h, { focus: true }); UI.text(g, 'Title', q.x + q.w / 2, q.y + 4, P2.focus, { align: 'center' }); } }
    }
  };
  /* ---- NPCs and dialogue ---- */
  UI.talkNpc = (id) => {
    const S = B.S, n = B.NPCS[id], v = B.VOICES[n.voice]; const rig = (B.View.npcs && B.View.npcs[id]) ? B.View.npcs[id].rig : new E.Humanoid({ colors: { skin: n.look.skin, cloth: n.look.cloth } });
    const pages = n.talk.map(t => t[1]); const speaker = n.name;
    if (S.party.members.length >= 6) { UI.say(['Your party is full.'], { name: speaker, portrait: rig, voice: v }); return; }
    UI.say(pages, { name: speaker, portrait: rig, portraitSize: 40, portraitOpts: { zoom: 3, turn: .5, bg: '#1a1612' }, voice: v, done: () => {
      UI.say([n.ask], { name: speaker, portrait: rig, voice: v, choices: ['Yes, join us', 'Not now'], onChoice: (i) => { UI.say([i === 0 ? n.yes : n.no], { name: speaker, portrait: rig, voice: v, done: () => { if (i === 0) B.npcJoin(id); else if (id === 'veil') B.veilJoined(false); } }); } });
    } });
  };
  UI.ysolde = () => {
    const n = B.NPCS.ysolde, v = B.VOICES.ysolde, rig = new E.Humanoid({ hair: 'long', colors: { skin: '#c0d8f0', hair: '#c0d0ff', cloth: '#7aaadf' } }); const S = B.S;
    UI.say(n.talk.map(t => t[1]), { name: n.name, portrait: rig, portraitSize: 40, portraitOpts: { zoom: 3, turn: .5, bg: '#102040' }, voice: v, done: () => {
      UI.say(['The clock is whole. I may rest, or I may keep it for you. What would you have of a ghost?'], { name: n.name, portrait: rig, voice: v, choices: ['Rest, Guildmistress.', 'Stay a while. We may need you.'], onChoice: (i) => {
        if (i === 0) { S.flags.ysoldeRest = true; B.giveXP(60, 'choice'); UI.say(['Then I shall. The guild is, at last, on time.'], { name: n.name, portrait: rig, voice: v }); }
        else { S.flags.ysoldeStay = true; B.give('scrraise'); B.give('loaf'); UI.say(['Then take this, and this. A ghost is poor company, but generous.'], { name: n.name, portrait: rig, voice: v }); B.log('Ysolde leaves a Scroll of Raising and a Loaf.', 'good'); } } });
    } });
  };
  UI.hook = (e) => {
    if (e.t === 'castmenu') UI.open('cast', e.m); else if (e.t === 'talk') UI.talkNpc(e.id); else if (e.t === 'clockWhole') UI.game.after(1.2, () => UI.ysolde());
    else if (e.t === 'ending') { }
    else if (e.t === 'aware') UI.tipOnce('aware', 'A step to the side makes a wound-up blow miss. Watch for the wind-up.');
    else if (e.t === 'pickup') UI.tipOnce('hand', 'The party holds one item. ' + UI.game.input.label('use') + ' stows it, ' + UI.game.input.label('throw') + ' throws it.');
  };
})();
