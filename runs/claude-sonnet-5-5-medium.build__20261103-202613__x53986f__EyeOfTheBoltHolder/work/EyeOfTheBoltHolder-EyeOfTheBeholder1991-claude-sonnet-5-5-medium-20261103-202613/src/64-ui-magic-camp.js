/* CAST MENU and CAMP. */
(() => {
  const P = () => UI.PAL, E = My3D2dge;
  UI.screens.cast = {
    enter(mi) { this.F = new UI.Focus(); this.mi = mi; this.lvl = 1; this.pick = null; const m = B.S.party.members[mi]; this.m = m; const sl = B.slotsFor(m); this.lvl = [1, 2, 3].find(l => sl[l - 1] > 0) || 1; },
    update(dt) {
      const inp = UI.game.input, S = B.S, p = S.party, m = this.m; if (!m || m.state !== 'ok') { UI.close(); return; }
      if (this.pick) { // choose a member to target
        const n = p.members.length; if (inp.repeat('left', .3, .1)) this.pick.i = (this.pick.i + n - 1) % n; if (inp.repeat('right', .3, .1)) this.pick.i = (this.pick.i + 1) % n;
        const ck = inp.clicked(); if (ck) { const r = UI.game.r; for (let pos = 0; pos < n; pos++) { const [x, y, w, h] = UI.cardRect(r, pos, n); if (ck[0] >= x && ck[0] < x + w && ck[1] >= y) { this.pick.i = p.formation[pos]; this.go(this.pick.sp, this.pick.i); return; } } }
        if (inp.pressed('confirm')) { inp.consume('confirm'); this.go(this.pick.sp, this.pick.i); } if (inp.pressed('cancel')) { inp.consume('cancel'); this.pick = null; } return;
      }
      if (inp.pressed('tabL')) this.lvl = this.lvl > 1 ? this.lvl - 1 : 3; if (inp.pressed('tabR')) this.lvl = this.lvl < 3 ? this.lvl + 1 : 1;
      const known = B.known(m).filter(k => B.SPELLS[k].lvl === this.lvl), F = this.F, r = UI.game.r; F.begin(); const x0 = Math.round(r.W / 2) - 130; known.forEach((k, i) => F.add(k, x0 + 6, 52 + i * 12, 248, 11)); if (!known.length) F.add('none', x0 + 6, 52, 248, 11, { skip: true });
      const res = F.run(); if (!res) return; if (res.act === 'back') { UI.close(); return; } if ((res.act === 'confirm' || res.act === 'click') && res.item && res.item.id !== 'none') { const sp = B.SPELLS[res.item.id]; if (sp.tg === 'member') { this.pick = { sp: sp.id, i: p.selected }; } else this.go(sp.id, null); }
    },
    go(id, tgt) { if (B.cmdCast(B.S.party.members.indexOf(this.m), id, tgt)) UI.close(); else { UI.sfx('ui_err'); this.pick = null; } },
    draw(g, r) {
      const m = this.m; if (!m) return; UI.veil(g, r, .45); const x0 = Math.round(r.W / 2) - 130, y0 = 14; UI.panel(g, x0, y0, 260, 150);
      UI.text(g, m.name + ' - ' + (m.cls === 'mage' ? 'Spellbook' : 'Prayers'), x0 + 8, y0 + 6, P().focus);
      for (let l = 1; l <= 3; l++) { const sel = l === this.lvl, sl = B.slotsFor(m)[l - 1]; UI.text(g, 'L' + l + (sl ? ' (' + sl + ')' : ''), x0 + 120 + (l - 1) * 42, y0 + 6, sel ? P().focus : P().dim); }
      const known = B.known(m).filter(k => B.SPELLS[k].lvl === this.lvl);
      known.forEach((k, i) => { const sp = B.SPELLS[k], left = B.spellLeft(m, k), q = this.F.items[i]; if (!q) return; const sel = this.F.cur === i; if (sel) { g.fillStyle = 'rgba(255,211,106,.15)'; g.fillRect(q.x - 2, q.y - 1, q.w + 4, q.h + 1); } UI.text(g, sp.n + ' ×' + (B.CHEATS.spells ? 'inf' : left), q.x, q.y, left > 0 ? (sel ? P().focus : P().text) : P().dim); UI.text(g, { front: 'ahead', line: 'line', member: 'friend', party: 'party', door: 'door' }[sp.tg], q.x + 200, q.y, '#8ab0ff', { font: 'tiny' }); });
      if (!known.length) UI.text(g, 'Nothing known at this level.', x0 + 10, 54, P().dim);
      const sel = known[this.F.cur]; if (sel) UI.wrap(B.SPELLS[sel].d, 244).forEach((l, i) => UI.text(g, l, x0 + 8, y0 + 112 + i * 9, '#c8c0b0'));
      UI.prompts(g, [['confirm', 'Cast'], ['tabL', 'Level'], ['cancel', 'Back']], x0 + 252, y0 + 138, { right: true });
      if (this.pick) { const n = B.S.party.members.length; const pos = B.S.party.formation.indexOf(this.pick.i), [x, y, w, h] = UI.cardRect(r, pos, n); g.strokeStyle = '#7aff9a'; g.lineWidth = 2; g.strokeRect(x - 1, y - 1, w + 2, h + 2); g.lineWidth = 1; UI.text(g, 'Choose who: ← → and ' + UI.game.input.label('confirm'), r.W / 2, r.H - 64, '#7aff9a', { align: 'center' }); }
    }
  };
  const TILES = [['Rest', 'rest'], ['Memorize', 'mem'], ['Pray', 'pray'], ['Scribe', 'scribe'], ['Formation', 'form'], ['Eat', 'eat'], ['Save Game', 'save'], ['Load Game', 'load'], ['Settings', 'settings'], ['Leave Camp', 'leave']];
  UI.screens.camp = {
    enter() { this.F = new UI.Focus(); this.mode = 'menu'; this.F.id = 'rest'; this.sel = null; this.m = 0; this.msg = ''; },
    exit() { if (B.S.camp) B.cmdCamp('close'); },
    casters(type) { return B.S.party.members.map((m, i) => i).filter(i => { const m = B.S.party.members[i]; return m.state !== 'dead' && (type === 'mage' ? m.cls === 'mage' : (m.cls === 'cleric' || m.cls === 'paladin')); }); },
    update(dt) {
      const S = B.S, inp = UI.game.input, F = this.F, p = S.party, r = UI.game.r; if (!S.camp) { UI.close(); return; }
      const c = S.camp; F.begin();
      if (this.mode === 'menu') {
        const w = 118, h = 24, x0 = Math.round(r.W / 2) - w - 3, y0 = 58;
        TILES.forEach((t, i) => { const dis = (t[1] === 'mem' && !this.casters('mage').length) || (t[1] === 'pray' && !this.casters('cleric').length) || (t[1] === 'scribe' && !this.casters('mage').length); F.add(t[1], x0 + (i % 2) * (w + 6), y0 + Math.floor(i / 2) * (h + 3), w, h, { skip: dis, dis }); });
        const res = F.run(); if (!res) return; if (res.act === 'back') { B.cmdCamp('close'); UI.close(); return; }
        if ((res.act === 'confirm' || res.act === 'click') && res.item && !res.item.dis) this.pickTile(res.item.id);
        return;
      }
      if (this.mode === 'rest') { if (!c.rest) { if (inp.pressed('confirm') || inp.pressed('cancel')) { inp.consume('confirm'); inp.consume('cancel'); this.mode = 'menu'; } } else if (inp.pressed('cancel')) { inp.consume('cancel'); B.cmdCamp('stopRest'); } return; }
      if (this.mode === 'eat') { if (inp.pressed('confirm') || inp.pressed('cancel')) { inp.consume('confirm'); inp.consume('cancel'); this.mode = 'menu'; } return; }
      if (this.mode === 'mem' || this.mode === 'pray') {
        const list = this.casters(this.mode === 'mem' ? 'mage' : 'cleric'); if (!list.includes(this.m)) this.m = list[0]; const m = p.members[this.m]; if (!m) { this.mode = 'menu'; return; }
        if (inp.pressed('tabR')) { this.m = list[(list.indexOf(this.m) + 1) % list.length]; } if (inp.pressed('tabL')) { this.m = list[(list.indexOf(this.m) + list.length - 1) % list.length]; }
        const kn = B.known(m), sl = B.slotsFor(m); const x0 = Math.round(r.W / 2) - 150; let y = 50;
        for (let l = 1; l <= 3; l++) { kn.filter(k => B.SPELLS[k].lvl === l).forEach(k => { F.add('k:' + k, x0 + 8, y, 130, 10); y += 11; }); }
        for (let l = 1; l <= 3; l++) for (let i = 0; i < sl[l - 1]; i++) F.add('o:' + l + ':' + i, x0 + 160 + i * 34, 50 + (l - 1) * 22, 32, 20);
        const res = F.run(); if (!res) { if (inp.pressed('alt')) { B.cmdCamp('same', { m: this.m }); } return; } if (res.act === 'back') { this.mode = 'menu'; F.id = 'rest'; return; }
        if ((res.act === 'confirm' || res.act === 'click') && res.item) { const id = res.item.id; if (id.startsWith('k:')) { const sp = B.SPELLS[id.slice(2)]; B.cmdCamp('memorize', { m: this.m, lvl: sp.lvl, spell: sp.id }); } else if (id.startsWith('o:')) { const [, l, i] = id.split(':'); B.cmdCamp('memorize', { m: this.m, lvl: +l, slot: +i, spell: null }); } }
        return;
      }
      if (this.mode === 'scribe') {
        const locs = []; p.members.forEach((m, mi) => m.pack.forEach((ref, i) => { if (ref && B.ITEMS[ref.id].t === 'scroll' && B.SPELLS[B.ITEMS[ref.id].spell].cls === 'mage') locs.push({ k: 'pack', m: mi, i }); })); this.locs = locs; const mages = this.casters('mage');
        locs.forEach((l, i) => F.add('l:' + i, Math.round(r.W / 2) - 120, 60 + i * 12, 240, 11)); if (!locs.length) F.add('none', 0, 0, 1, 1);
        const res = F.run(); if (!res) return; if (res.act === 'back') { this.mode = 'menu'; F.id = 'rest'; return; }
        if ((res.act === 'confirm' || res.act === 'click') && res.item && res.item.id.startsWith('l:')) { const l = locs[+res.item.id.slice(2)]; const sp = B.ITEMS[B.getLoc(l).id].spell; const mg = p.members[mages.find(i => !p.members[i].book.includes(sp)) ?? -1]; if (mg) { B.cmdCamp('scribe', { m: p.members.indexOf(mg), loc: l }); this.msg = mg.name + ' scribes ' + B.SPELLS[sp].n + '.'; } else { this.msg = 'Everyone who can already knows it.'; UI.sfx('ui_err'); } }
        return;
      }
      if (this.mode === 'form') {
        const n = p.members.length, x0 = Math.round(r.W / 2) - 60; for (let pos = 0; pos < 6; pos++) F.add('f:' + pos, x0 + (pos & 1) * 66, 62 + (pos >> 1) * 36, 54, 32, { skip: pos >= n });
        const res = F.run(); if (!res) return; if (res.act === 'back') { this.mode = 'menu'; F.id = 'rest'; this.sel = null; return; }
        if ((res.act === 'confirm' || res.act === 'click') && res.item) { const pos = +res.item.id.slice(2); if (this.sel == null) this.sel = pos; else { B.cmdCamp('swap', { a: this.sel, b: pos }); this.sel = null; UI.sfx('ui_ok'); } }
      }
    },
    pickTile(id) {
      const S = B.S, g = UI.game;
      switch (id) {
        case 'rest': B.cmdCamp('rest'); this.mode = 'rest'; break; case 'mem': this.mode = 'mem'; this.m = this.casters('mage')[0]; this.F.id = null; break; case 'pray': this.mode = 'pray'; this.m = this.casters('cleric')[0]; this.F.id = null; break;
        case 'scribe': this.mode = 'scribe'; this.msg = ''; this.F.id = null; break; case 'form': this.mode = 'form'; this.sel = null; this.F.id = 'f:0'; break; case 'eat': B.cmdCamp('eat'); this.mode = 'eat'; break;
        case 'save': g.saves.show('save'); break; case 'load': g.saves.show('load'); break; case 'settings': g.menu('settings'); break; case 'leave': B.cmdCamp('close'); UI.close(); break;
      }
    },
    draw(g, r) {
      const S = B.S, c = S.camp; if (!c) return; UI.veil(g, r, .5); const cx = Math.round(r.W / 2), P2 = P(), F = this.F;
      // campfire glow
      g.save(); g.globalAlpha = .12 + .04 * Math.sin(UI.game.real * 9); g.fillStyle = '#ff8a30'; g.fillRect(0, 0, r.W, r.H); g.restore();
      UI.panel(g, cx - 130, 10, 260, r.H - 20); UI.title(g, 'CAMP', cx, 16, { scale: 2 });
      if (this.mode === 'menu') {
        TILES.forEach((t, i) => { const q = F.items[i]; if (!q) return; const sel = F.cur === i; UI.panel(g, q.x, q.y, q.w, q.h, { focus: sel && !q.dis }); UI.text(g, t[0], q.x + q.w / 2, q.y + 8, q.dis ? '#4a4030' : sel ? P2.focus : P2.text, { align: 'center' }); });
        UI.text(g, c.summary || 'The fire is low. The dark is patient.', cx, 48, P2.dim, { align: 'center' }); UI.prompts(g, [['confirm', 'Choose'], ['cancel', 'Leave']], cx, r.H - 28, { center: true });
      } else if (this.mode === 'rest') {
        UI.text(g, c.rest ? 'Resting... hour ' + c.hour + ' of 8' : (c.summary || 'Rested.'), cx, 52, P2.focus, { align: 'center' }); const ms = S.party.members;
        ms.forEach((m, i) => { const y = 70 + i * 16; UI.text(g, m.name, cx - 110, y, m.state === 'dead' ? P2.dim : P2.text); E.ui.bar(g, cx - 50, y + 1, 100, 6, m.max ? m.hp / m.max : 0, P2.hp); UI.text(g, m.hp + '/' + m.max, cx + 56, y, '#c8c0b0'); UI.text(g, m.food + '%', cx + 100, y, m.food <= 25 ? P2.bad : P2.food); });
        UI.prompts(g, [[c.rest ? 'cancel' : 'confirm', c.rest ? 'Stop' : 'Done']], cx, r.H - 28, { center: true });
      } else if (this.mode === 'eat') { UI.text(g, 'Eat', cx, 56, P2.focus, { align: 'center' }); UI.wrap(c.summary || '', 230).forEach((l, i) => UI.text(g, l, cx, 74 + i * 10, P2.text, { align: 'center' })); UI.prompts(g, [['confirm', 'Done']], cx, r.H - 28, { center: true }); }
      else if (this.mode === 'mem' || this.mode === 'pray') {
        const p = S.party, m = p.members[this.m]; if (!m) return; const x0 = cx - 150; UI.text(g, (this.mode === 'mem' ? 'Memorize' : 'Pray') + ' - ' + m.name, cx, 34, P2.focus, { align: 'center' }); const sl = B.slotsFor(m);
        F.items.forEach((q, i) => { const sel = F.cur === i; if (q.id.startsWith('k:')) { const sp = B.SPELLS[q.id.slice(2)]; if (sel) { g.fillStyle = 'rgba(255,211,106,.15)'; g.fillRect(q.x - 2, q.y - 1, q.w + 4, q.h + 1); } UI.text(g, 'L' + sp.lvl + ' ' + sp.n, q.x, q.y, sel ? P2.focus : P2.text); } else if (q.id.startsWith('o:')) { const [, l, k] = q.id.split(':'), id = m.prep[+l][+k]; g.fillStyle = '#0e0c0a'; g.fillRect(q.x, q.y, q.w, q.h); g.strokeStyle = sel ? P2.focus : '#5a4a2a'; g.strokeRect(q.x + .5, q.y + .5, q.w - 1, q.h - 1); if (id) UI.text(g, B.SPELLS[id].n.slice(0, 7), q.x + 2, q.y + 6, '#8ab0ff', { font: 'tiny' }); } });
        for (let l = 1; l <= 3; l++) UI.text(g, 'Level ' + l + ' (' + sl[l - 1] + ')', x0 + 160, 42 + (l - 1) * 22, P2.dim, { font: 'tiny' });
        const fi = F.items[F.cur], kid = fi && fi.id.startsWith('k:') ? fi.id.slice(2) : null; if (kid) UI.wrap(B.SPELLS[kid].d, 130).forEach((l, i) => UI.text(g, l, x0 + 160, 124 + i * 9, '#c8c0b0'));
        UI.prompts(g, [['confirm', 'Fill slot'], ['alt', 'Same as before'], ['tabL', 'Next'], ['cancel', 'Back']], cx, r.H - 28, { center: true });
      } else if (this.mode === 'scribe') {
        UI.text(g, 'Scribe: learn a scroll into the spellbook', cx, 38, P2.focus, { align: 'center' }); (this.locs || []).forEach((l, i) => { const ref = B.getLoc(l), sel = F.cur === i; if (ref) { UI.icon(g, ref.id, cx - 120, 59 + i * 12, 10); UI.text(g, B.ITEMS[ref.id].n + '  (' + S.party.members[l.m].name + ')', cx - 106, 61 + i * 12, sel ? P2.focus : P2.text); } }); if (!(this.locs || []).length) UI.text(g, 'No scrolls to learn.', cx, 70, P2.dim, { align: 'center' }); if (this.msg) UI.text(g, this.msg, cx, r.H - 44, P2.good, { align: 'center' }); UI.prompts(g, [['confirm', 'Learn'], ['cancel', 'Back']], cx, r.H - 28, { center: true });
      } else if (this.mode === 'form') {
        UI.text(g, 'Formation - rows: front fights, middle needs reach, back needs missiles or magic', cx, 34, P2.focus, { align: 'center', font: 'tiny' }); const p = S.party;
        F.items.forEach((q, i) => { if (q.skip) return; const pos = +q.id.slice(2), mi = p.formation[pos], m = p.members[mi], sel = F.cur === i; UI.panel(g, q.x, q.y, q.w, q.h, { focus: sel }); if (this.sel === pos) { g.strokeStyle = '#7aff9a'; g.strokeRect(q.x - 1, q.y - 1, q.w + 2, q.h + 2); } if (m) { if (!m.rig) m.rig = B.rigFor(m); m.rig.drawPortrait(g, q.x + 3, q.y + 3, 26, { zoom: 2.4, turn: .4, bg: '#2a2438' }); UI.text(g, m.name.slice(0, 6), q.x + 31, q.y + 6, P2.text, { font: 'tiny' }); UI.text(g, B.CLASSES[m.cls].n, q.x + 31, q.y + 16, P2.dim, { font: 'tiny' }); } });
        ['FRONT', 'MIDDLE', 'BACK'].forEach((t, i) => UI.text(g, t, cx - 112, 76 + i * 36, P2.dim, { font: 'tiny' })); UI.prompts(g, [['confirm', this.sel == null ? 'Pick' : 'Swap'], ['cancel', 'Back']], cx, r.H - 28, { center: true });
      }
    }
  };
})();
