// The campaign scene: the continent on the left, the selected castle and its command menu on the right. Each season it
// shows the tidings, lets the realm muster (summon, bind, evolve, move, quest, equip, march), resolves the marches
// (human battles go to the battle scene and come back here), and then the aftermath. The stick or arrows move the
// cursor from castle to castle; A opens the castle's commands, B goes back; the mouse hovers and clicks.
(() => {
  const H = G, px = E.px;
  const ses = H.session = H.session || { cs: null, human: 'verdance', battle: null, hub: null };
  const SUB_TITLE = { summon: 'Summon a monster', bind: 'Bind a monster', unbind: 'Unbind a monster', evolve: 'Evolve a monster', move: 'Move knight to', march: 'March on', equip: 'Equip from the treasury' };

  H.campaignScene = {
    pausable: true,
    view: 'overhead',
    // enter(data): { start: true, realm } to begin, or { resume: true } after a battle the campaign was waiting for
    enter(data = {}) {
      const game = this.game;
      if (data.story) { this.phase = 'tidings'; this.afterTidings(); return; }   // back from an event: the next one, or the muster
      if (data.resumeBattle && ses.cs.s.pending) { this.startBattle(ses.cs.s.pending); return; }   // back from the rival lines: the battle goes on
      this.focusMenu = false; this.toast = null; this.sub = null; this.kIdx = 0;
      this.sel = this.sel || H.get('realm', ses.human).capital;
      if (data.start || !ses.cs) {
        const humans = data.humans || [data.realm || ses.human];
        ses.human = humans[0];
        ses.cs = H.CampaignSim.create({ humans, seed: data.seed || ((Math.random() * 1e9) | 0) + 1 });
        this.mi = 0;
        this.phase = 'tidings';
        this.sel = H.get('realm', ses.human).capital;
      } else if (data.resume) {
        const r = ses.cs.finishPending(ses.battle);
        ses.battle = null;
        this.afterResolve(r);
        return;
      } else {
        this.phase = ses.cs.s.phase === 'muster' ? 'tidings' : 'muster';
      }
      this.cursorCastle = this.sel;
      this.reportAt = ses.cs.s.report.length;
      this.enterPhase();
    },
    exit() { if (this.game.audio) this.game.audio.duck && this.game.audio.duck(false); },

    enterPhase() {
      const game = this.game, cs = ses.cs;
      game.saves.canSave = cs.s.phase === 'muster' && !cs.s.ended;
      // the season's own theme; the season's sting when the turn comes
      const song = H.SEASON_SONG[cs.season];
      if (this.songSeason !== cs.season) { this.songSeason = cs.season; this.wipe = 1.4; this.wipeColor = H.get('season', cs.season).color; game.audio.music(H.SONGS[song]); if (cs.s.seasonsPlayed > 0) game.audio.sting(H.STING[song], { at: 'bar' }); }
      if (this.phase === 'tidings') {
        if (cs.s.candle <= 3) game.audio.sfx('candle_hiss');
        this.reportAt = cs.s.report.length;
        if (cs.s.seasonsPlayed > 0) game.saves.autosave();   // the autosave runs at every tidings, as the plan asks
      }
      if (this.phase === 'muster') { this.buildMenu(); if (cs.s.stilled) this.say('The Gray Knight has stilled ' + H.get('castle', cs.s.stilled).name + '.'); }
      if (this.phase === 'over') this.game.go('ending', { outcome: cs.outcome() });
    },

    // the tidings are read: the season's queued events play one at a time, then the muster opens
    afterTidings() {
      const ev = ses.cs.nextEvent();
      if (ev) { this.game.go('event', { event: ev.id, next: { scene: 'campaign', data: { story: true } } }); return; }
      this.mi = 0; ses.human = ses.cs.s.humans[0];
      this.phase = 'muster';
      this.enterPhase();
    },
    // the resolution of a march: a battle to fight, or the season is over
    afterResolve(r) {
      const cs = ses.cs;
      if (r && r.battle) { this.startBattle(r.battle); return; }
      if (cs.s.ended) { this.phase = 'over'; this.game.go('ending', { outcome: cs.outcome() }); return; }
      this.phase = 'aftermath';
      this.aftermathLines = this.linesSince(this.reportAt);
    },
    // the report lines since a point, without the next season's tidings (those are read at the start of muster)
    linesSince(at) { return ses.cs.s.report.slice(at).filter(x => x.kind !== 'tidings').map(x => x.text); },
    startBattle(pending) {
      const cs = ses.cs, march = pending.march;
      // two rulers on the field trade their lines first; each pair does so once
      const ra = cs.realmRuler(march.by), rb = cs.realmRuler(cs.ownerOf(march.to));
      const key = [ra, rb].sort().join('-');
      if (ra && rb && H.RIVAL_LINES[key] && !cs.s.flags['rival-' + key]) {
        cs.s.flags['rival-' + key] = true;
        this.game.go('event', { lines: H.RIVAL_LINES[key], sky: ['#1a1428', '#3a2a50'], next: { scene: 'campaign', data: { resumeBattle: true } } });
        return;
      }
      const playerSide = cs.isHuman(march.by) ? 0 : 1;
      const song = march.to === 'meridian' ? 'boss' : cs.s.realms[cs.ownerOf(march.to)] && cs.ownerOf(march.to) === 'dominion' ? 'hourless' : (playerSide === 0 ? 'battle_attack' : 'battle_defend');
      const humanSides = [];
      if (cs.isHuman(march.by)) humanSides.push(0);
      if (cs.isHuman(cs.ownerOf(march.to))) humanSides.push(1);
      const sim = H.BattleSim.load(pending.sim);
      ses.battle = sim;
      this.game.go('battle', {
        sim, playerSide, humanSides, askDelegate: true, song,
        onDone: (done) => { ses.battle = done; this.game.go('campaign', { resume: true }); }
      });
    },

    // the muster's menu for the selected castle
    buildMenu() {
      const cs = ses.cs, c = this.sel, human = ses.human;
      const knights = this.knightsHere();
      const K = knights[this.kIdx] || null;
      const holds = cs.ownerOf(c) === human;
      const items = [];
      items.push({ label: K ? 'Knight: ' + H.get('knight', K.id).name : 'Knight: none here', key: 'knight', disabled: knights.length < 2 && !K, sub: K ? (K.state === 'ready' ? 'ready' : K.state === 'quest' ? 'on quest' : 'hurt') : '' });
      items.push({ label: 'Summon monster', key: 'summon', disabled: !holds, sub: holds ? cs.s.realms[human].mana + ' mana' : '' });
      items.push({ label: 'Bind a monster', key: 'bind', disabled: !(holds && K) });
      items.push({ label: 'Unbind a monster', key: 'unbind', disabled: !(holds && K && cs.bondedTo(K.id).length) });
      items.push({ label: 'Evolve a monster', key: 'evolve', disabled: !(holds && K) });
      items.push({ label: 'Move knight', key: 'move', disabled: !(holds && K && K.state === 'ready') });
      items.push({ label: 'March on a castle', key: 'march', disabled: !(holds && K && K.state === 'ready') });
      items.push({ label: 'Send on a quest', key: 'quest', disabled: !(holds && K && K.state === 'ready') });
      items.push({ label: 'Equip from treasury', key: 'equip', disabled: !(holds && K) });
      items.push({ label: 'Done mustering', key: 'end' });
      this.menu = new H.List(items, { x: 0, y: 0, w: 148, title: null, rowH: 12, maxRows: 9, onPick: (i, it) => this.pick(it.key) });
      this.menu.onCancel = () => { this.focusMenu = false; };
    },
    knightsHere() {
      const cs = ses.cs;
      return cs.knightsAt(this.sel);
    },
    // one choice from the menu
    pick(key) {
      const cs = ses.cs, human = ses.human, K = this.knightsHere()[this.kIdx] || null;
      if (key === 'knight') { const n = this.knightsHere().length; if (n) this.kIdx = (this.kIdx + 1) % n; this.buildMenu(); return; }
      if (key === 'end') {
        // hot-seat: the next human musters after the device is passed on; the last one ends the muster
        if (this.mi < cs.s.humans.length - 1) { this.mi++; ses.human = cs.s.humans[this.mi]; this.sel = H.get('realm', ses.human).capital; this.cursorCastle = this.sel; this.phase = 'pass'; this.enterPhase(); return; }
        this.endMuster(); return;
      }
      if (key === 'summon') { this.openSub('summon', H.ids('species').map(id => ({ label: H.get('species', id).name, sub: cs.summonCost(id) + ' mana', value: id, disabled: cs.s.realms[human].mana < cs.summonCost(id) })), v => ({ t: 'summon', castle: this.sel, species: v })); return; }
      if (key === 'bind') { const ms = cs.unboundAt(this.sel); if (!ms.length) return this.say('No free monster here.'); this.openSub('bind', ms.map(m => ({ label: H.get('species', m.species).name, sub: m.hp + ' HP', value: m.uid })), v => ({ t: 'bind', monster: v, knight: K.id })); return; }
      if (key === 'unbind') { const ms = cs.bondedTo(K.id); this.openSub('unbind', ms.map(m => ({ label: H.get('species', m.species).name, value: m.uid })), v => ({ t: 'unbind', monster: v })); return; }
      if (key === 'evolve') { const ms = cs.bondedTo(K.id).filter(m => m.form === 0); if (!ms.length) return this.say('No monster of ' + H.get('knight', K.id).name + '\'s to evolve.'); this.openSub('evolve', ms.map(m => ({ label: H.get('species', m.species).name, sub: 'cost ' + cs.evolveCost(m.species), value: m.uid })), v => ({ t: 'evolve', monster: v })); return; }
      if (key === 'move') { const to = H.neighbourCastles(K.castle).filter(c => cs.ownerOf(c) === human); if (!to.length) return this.say('No road to a castle of yours.'); this.openSub('move', to.map(c => ({ label: H.get('castle', c).name, value: c })), v => ({ t: 'move', knight: K.id, to: v })); return; }
      if (key === 'march') { const to = H.neighbourCastles(K.castle).filter(c => cs.ownerOf(c) !== human); if (!to.length) return this.say('No enemy on a road from here.'); this.openSub('march', to.map(c => ({ label: H.get('castle', c).name, sub: H.get('realm', cs.ownerOf(c)).name, value: c })), v => ({ t: 'march', knight: K.id, to: v })); return; }
      if (key === 'quest') { this.act({ t: 'quest', knight: K.id }); return; }
      if (key === 'equip') { if (!cs.s.stock.length) return this.say('The treasury is empty.'); this.openSub('equip', cs.s.stock.map(id => ({ label: H.get('item', id).name, sub: H.get('item', id).desc.split('.')[0], value: id })), v => ({ t: 'equip', knight: K.id, item: v })); return; }
    },
    openSub(kind, items, make) {
      this.subKind = kind; this.subMake = make;
      this.sub = new H.List(items, { x: Math.round((this.game.W || 427) * .6) + 4, y: 116, w: 150, title: SUB_TITLE[kind], rowH: 12, maxRows: 8,
        onPick: (i, it) => { const a = make(it.value); this.sub = null; this.act(a); },
        onCancel: () => { this.sub = null; } });
    },
    act(a) {
      const err = ses.cs.do(a, ses.human);
      if (err) { this.say(err); H.sfx(this.game, 'ui_error'); }
      else { this.say('Done.'); H.sfx(this.game, a.t === 'summon' ? 'summon_rise' : a.t === 'promote' ? 'capture' : 'ui_confirm'); }
      this.buildMenu();
    },
    say(text) { this.toast = { text, t: 2.6 }; },
    // the muster ends once: a second press while the marches are on their way does nothing
    endMuster() {
      if (this.phase !== 'muster' || ses.cs.s.phase !== 'muster') return;
      this.phase = 'march';
      const r = ses.cs.endMuster();
      this.afterResolve(r);
    },

    // the continent: the castle the cursor is on, by the arrow keys' direction, and the mouse
    panel(r) { return { x: 6, y: 14, w: Math.round(r.W * .58), h: r.H - 28 }; },
    castlePos(r, id) { const T = H.mapTransform(this.panel(r)), c = H.get('castle', id); return { x: T.X(c.x), y: T.Y(c.y) }; },
    nearestCastle(r, dir) {
      const from = this.castlePos(r, this.cursorCastle), d = H.DIRS[dir];
      const dx = Math.cos(H.DIR_ANGLE[dir] * Math.PI / 180), dy = Math.sin(H.DIR_ANGLE[dir] * Math.PI / 180);
      let best = null;
      for (const c of H.ids('castle')) {
        if (c === this.cursorCastle) continue;
        const p = this.castlePos(r, c), vx = p.x - from.x, vy = p.y - from.y, len = Math.hypot(vx, vy) || 1;
        const along = (vx * dx + vy * dy) / len;
        if (along < .5) continue;
        const score = len * (2 - along);
        if (!best || score < best.score) best = { id: c, score };
      }
      return best ? best.id : null;
    },

    update(dt) {
      const game = this.game, I = game.input, cs = ses.cs, r = game.r || { W: game.W, H: game.H };
      if (this.toast) { this.toast.t -= dt; if (this.toast.t <= 0) this.toast = null; }
      if (this.wipe > 0) this.wipe -= dt;
      if (this.phase === 'pass') { if (I.pressed('confirm') || I.clicked()) { this.phase = 'muster'; this.enterPhase(); } return; }
      if (this.phase === 'tidings') { if (I.pressed('confirm') || I.clicked()) this.afterTidings(); return; }
      if (this.phase === 'aftermath') { if (I.pressed('confirm') || I.clicked()) { this.phase = 'tidings'; this.enterPhase(); } return; }
      if (this.phase !== 'muster') return;
      // pointer: over a castle moves the cursor; a click on one selects it and opens its menu
      const p = I.pointer && I.pointer(), c = I.clicked && I.clicked();
      const hit = (pt) => H.ids('castle').find(id => { const q = this.castlePos({ W: game.W, H: game.H }, id); return Math.hypot(q.x - pt[0], q.y - pt[1]) < 9; });
      if (p && !this.sub && !this.focusMenu) { const h = hit(p); if (h && h !== this.cursorCastle) { this.cursorCastle = h; this.sel = h; this.kIdx = 0; this.buildMenu(); } }
      if (c && !this.sub) { const h = hit(c); if (h) { this.cursorCastle = h; this.sel = h; this.kIdx = 0; this.focusMenu = true; this.buildMenu(); return; } }
      if (this.sub) { this.sub.update(game); return; }
      if (this.focusMenu) {
        if (I.pressed('left') || I.pressed('right')) { const n = this.knightsHere().length; if (n > 1) { this.kIdx = (this.kIdx + (I.pressed('right') ? 1 : n - 1)) % n; this.buildMenu(); } }
        this.menu.update(game);
        if (I.pressed('cancel')) this.focusMenu = false;
        return;
      }
      // the map: the arrows jump to the next castle that way
      const v = I.move(), len = Math.hypot(v[0], v[1]);
      this.stick = (this.stick || 0) - dt;
      if (len > .5 && this.stick <= 0) {
        const id = this.nearestCastle(r, H.dirFromVector(v[0], v[1]));
        if (id) { this.cursorCastle = id; this.sel = id; this.kIdx = 0; this.buildMenu(); H.sfx(game, 'cursor'); }
        this.stick = .22;
      } else if (len <= .5) this.stick = 0;
      if (I.pressed('confirm')) { this.focusMenu = true; }
      if (I.pressed('endTurn')) this.pick('end');
    },

    draw(r) {
      const game = this.game;
      r.sky(['#16202e', '#25344a']);
      if (this.phase === 'tidings') return this.drawTidings(r);
      if (this.phase === 'pass') return this.drawPass(r);
      if (this.phase === 'aftermath') return this.drawAftermath(r);
      this.drawMap(r);
      this.drawSide(r);
      // the season wipe: a band of the new season's colour sweeps across as the turn comes
      if (this.wipe > 0) { const k = 1 - this.wipe / 1.4, x = Math.round(k * r.W * 1.2); r.overlay(g => { px.rect(g, 0, 0, Math.min(x, r.W), r.H, this.wipeColor || '#ffffff'); px.rect(g, Math.max(0, x - 8), 0, 8, r.H, '#ffffff'); }); }
      if (this.toast) r.overlay(g => { E.ui.box(g, r.W / 2 - 110, r.H - 30, 220, 16, { bg: ['#1c1830', '#0e0b18'], alpha: .9 }); E.font.text(g, this.toast.text, r.W / 2, r.H - 26, '#fff4c8', { align: 'center', shadow: '#000' }); });
      H.promptRow(r, game, this.focusMenu ? [['confirm', 'Choose'], ['cancel', 'Map'], ['left', 'Knight']] : [['confirm', 'Open'], ['endTurn', 'Done mustering']], 6, r.H - 12);
    },
    drawMap(r) {
      const cs = ses.cs, P = this.panel(r), T = H.mapTransform(P);
      r.overlay(g => {
        E.ui.box(g, P.x - 2, P.y - 2, P.w + 4, P.h + 4, { bg: ['#2a3a2a', '#1a2a1a'], border: '#5a7a5a', alpha: 1 });
        // roads
        for (const [a, b] of H.ROADS) {
          const pa = H.get('castle', a), pb = H.get('castle', b);
          px.line(g, T.X(pa.x), T.Y(pa.y), T.X(pb.x), T.Y(pb.y), '#8a7a5a', 1);
        }
        // the castles, the realm's colour behind each, the cursor's ring, and the knights' banners
        for (const c of H.ids('castle')) {
          const ca = H.get('castle', c), x = Math.round(T.X(ca.x)), y = Math.round(T.Y(ca.y));
          const owner = cs.ownerOf(c);
          px.disc(g, x, y + 3, 9, H.REALM_FILL[owner] || '#666');
          px.disc(g, x, y + 3, 7, '#1c1a24');
          H.drawCastle(g, x, y, owner, { capital: ca.capital, scale: 1 });
          if (cs.isStill(c)) { px.disc(g, x, y - 12, 4, '#8a8a92'); px.disc(g, x, y - 12, 3, '#d8d8e0'); px.line(g, x, y - 12, x, y - 14, '#2a2a30', 1); px.line(g, x, y - 12, x + 2, y - 12, '#2a2a30', 1); }
          if (ca.goal) E.font.text(g, 'M', x, y - 20, '#ffd36a', { align: 'center', shadow: '#000' });
          // the troops on the castle: a little figure for each knight (in its realm's colour), a dot for each monster
          const here = cs.knightsAt(c), beasts = cs.monstersAt(c);
          here.slice(0, 4).forEach((k, i) => { const fx = x - 14 + i * 7, fy = y + 13; px.disc(g, fx, fy - 5, 1.6, '#f0d8b0'); px.rect(g, fx - 1.5, fy - 3, 3, 4, H.REALM_FILL[k.realm] || '#c8c0d8'); px.rect(g, fx - 1.5, fy + 1, 1, 2, '#2a2230'); px.rect(g, fx + .5, fy + 1, 1, 2, '#2a2230'); });
          beasts.slice(0, 6).forEach((m, i) => px.disc(g, x - 14 + i * 5 + 1, y + 21, 1.4, m.bondTo ? '#e8d890' : '#9ad870'));
          if (here.length > 4) E.font.text(g, '+' + (here.length - 4), x + 14, y + 12, '#f0ecff', { shadow: '#000' });
        }
        // marches in progress this season
        for (const m of cs.s.marches) {
          const a = H.get('castle', m.from), b = H.get('castle', m.to);
          px.line(g, T.X(a.x), T.Y(a.y), T.X(b.x), T.Y(b.y), '#ffd36a', 2);
        }
        const cur = this.castlePos({ W: r.W, H: r.H }, this.cursorCastle);
        const pulse = 9 + Math.sin(this.game.time * 6) * 1;
        for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2; px.rect(g, Math.round(cur.x + Math.cos(a) * pulse), Math.round(cur.y + Math.sin(a) * pulse), 1, 1, '#ffffff'); }
        const cc = H.get('castle', this.cursorCastle);
        E.font.text(g, cc.name, P.x + 4, P.y + P.h - 10, '#fff4c8', { shadow: '#000' });
      });
    },
    drawSide(r) {
      const cs = ses.cs, x = Math.round(r.W * .6) + 4, w = r.W - x - 6, c = this.sel;
      const ca = H.get('castle', c), owner = cs.ownerOf(c);
      const season = H.get('season', cs.season), mana = cs.s.realms[ses.human].mana;
      r.overlay(g => {
        E.ui.box(g, x - 4, 6, w + 8, 46, { bg: ['#1c1830', '#0e0b18'], alpha: .92 });
        E.font.text(g, season.name + ' ' + cs.s.year + ' • Candle ' + cs.s.candle, x, 10, season.color, { shadow: '#000' });
        E.font.text(g, 'Mana ' + mana + ' • ' + H.get('realm', ses.human).name, x, 22, '#e8e0ff', { shadow: '#000' });
        E.font.text(g, ca.name + ' • ' + H.get('realm', owner).name, x, 34, '#fff4c8', { shadow: '#000' });
      });
      const knights = cs.knightsAt(c), monsters = cs.monstersAt(c);
      r.overlay(g => {
        let yy = 58;
        E.font.text(g, 'Knights: ' + (knights.length ? '' : 'none'), x, yy, '#cfc6ec', { shadow: '#000' });
        knights.slice(0, 3).forEach((k, i) => {
          const kn = H.get('knight', k.id);
          const st = k.state === 'ready' ? '' : k.state === 'quest' ? ' (quest)' : ' (hurt)';
          E.font.text(g, (this.focusMenu && i === this.kIdx ? '▸' : ' ') + kn.name + ' L' + k.level + st, x, yy + 10 + i * 9, k.state === 'ready' ? '#f0ecff' : '#9a94b0', { shadow: '#000' });
        });
        E.font.text(g, 'Monsters here: ' + monsters.length, x, yy + 40, '#cfc6ec', { shadow: '#000' });
        E.font.text(g, ca.capital ? 'Capital' : ca.goal ? 'The Calendar City' : 'Yield ' + ca.yield, x, yy + 50, '#bfe8a0', { shadow: '#000' });
      });
      if (this.sub) this.sub.draw(r);
      else if (this.phase === 'muster') {
        this.menu.x = x; this.menu.y = 126; this.menu.w = w - 10;
        this.menu.draw(r);
      }
    },
    drawPass(r) {
      const cs = ses.cs, n = cs.s.humans.indexOf(ses.human) + 1;
      r.sky(['#101838', '#2a2050']);
      r.overlay(g => E.font.title(g, 'PLAYER ' + n, r.W / 2, r.H * .3, { scale: 3, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' }));
      H.panel(r, r.W / 2 - 140, r.H * .3 + 40, 280, 58);
      H.say(r, 'Pass the device to the ruler of ' + H.get('realm', ses.human).name + '. Your rivals, look away.', r.W / 2 - 128, r.H * .3 + 50, 256, '#f0ecff');
      H.promptRow(r, this.game, [['confirm', 'I am ready']], r.W / 2 - 40, r.H - 14);
    },
    drawTidings(r) {
      const cs = ses.cs, season = H.get('season', cs.season);
      r.sky(season.name === 'Winter' ? ['#1a2a3a', '#3a5a7a'] : season.name === 'Summer' ? ['#3a2014', '#7a4a2a'] : season.name === 'Autumn' ? ['#2a1a10', '#6a4420'] : ['#14301c', '#2e5a34']);
      r.overlay(g => {
        E.font.title(g, season.name.toUpperCase(), r.W / 2, 24, { scale: 2, colors: ['#fff6c8', season.color], outline: '#1a0c10', align: 'center' });
        E.font.text(g, 'Year ' + cs.s.year + ' • the Hour-Candle has ' + cs.s.candle + ' season' + (cs.s.candle === 1 ? '' : 's'), r.W / 2, 56, '#e8e0ff', { align: 'center', shadow: '#000' });
      });
      H.panel(r, 24, 78, r.W - 48, 100);
      H.say(r, 'Tidings. ' + H.get('season', cs.season).tidings, 34, 88, r.W - 68, '#f4f0ff');
      H.promptRow(r, this.game, [['confirm', 'Muster the realm']], r.W / 2 - 60, r.H - 14);
    },
    drawAftermath(r) {
      const lines = this.aftermathLines || [];
      r.sky(['#101820', '#20303a']);
      r.overlay(g => E.font.title(g, 'AFTERMATH', r.W / 2, 14, { scale: 2, colors: ['#fff6c8', '#ffd36a'], outline: '#1a0c10', align: 'center' }));
      H.panel(r, 18, 46, r.W - 36, r.H - 84);
      const shown = lines.slice(-12);
      shown.forEach((t, i) => H.say(r, '• ' + t, 28, 54 + i * 15, r.W - 56, '#f0ecff'));
      if (!shown.length) H.say(r, 'A quiet season. Nothing marched, nothing fell.', 28, 54, r.W - 56);
      H.promptRow(r, this.game, [['confirm', 'Next season']], r.W / 2 - 40, r.H - 14);
    }
  };
})();
