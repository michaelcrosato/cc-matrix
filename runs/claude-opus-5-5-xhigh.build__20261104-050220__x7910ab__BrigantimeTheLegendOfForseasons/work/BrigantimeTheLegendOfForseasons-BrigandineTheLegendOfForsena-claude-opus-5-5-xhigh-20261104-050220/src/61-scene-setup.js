// SETUP: a new campaign in four steps (players, each claiming a device or sharing; realm cards, one per human, no
// repeats; difficulty; Begin), and Skirmish (a map, a season or the turning Wheel, 2 to 4 sides each Human or CPU, an
// army per side: a realm and a level band; the "Banners of the Wheel" preset). Also the battle builders they use.

const SU = G.UI, SPX = E.px;

/* ---- armies for skirmish, the tutorial and the hub ---- */
/** a field troop for a knight at a level (its data troop, scaled to the band) */
G.troopAt = (id, level, o = {}) => {
  const d = G.get('knight', id), cls = o.cls || d.cls, stats = G.classStats(cls, level);
  const k = G.unitFromKnight({ id, cls, level, stats, elem: d.elem, items: o.items || {}, ruler: o.ruler === undefined ? !!d.ruler : o.ruler, realm: o.realm || d.realm }, { boost: o.boost || 0 });
  const monsters = (o.monsters || d.troop.map(([sp, lv, f]) => [sp, lv, f])).map(([sp, lv, f], i) => {
    const lvl = o.monsters ? lv : Math.max(1, Math.round(level + (lv - d.level))), form = f || (lvl >= 22 ? 3 : lvl >= 12 ? 2 : 1);
    return G.unitFromMonster({ uid: id + ':' + i, sp, form, level: lvl, realm: o.realm || d.realm }, { boost: o.boost || 0 });
  });
  return { knight: k, monsters, formation: d.form };
};
const ROSTER = { verdance: ['gareth', 'lynette', 'wren'], solmark: ['morgause', 'agravain', 'elidure'], amberlyn: ['pellam', 'lamorak', 'vesna'], hoarfast: ['mordrain', 'ragnell', 'nimue'], dominion: ['meliant', 'bertilak', 'aurelie'], brigands: ['dafydd', 'hob', 'abbot'] };
G.ROSTER = ROSTER;
/** the class a knight would have reached at a level */
const clsAt = (id, level) => { let c = G.get('knight', id).cls; const cl = G.get('class', c); if (cl.line === 'ruler' || cl.unique) return c; const line = G.LINES[cl.line]; if (!line) return c; return line[level >= 20 ? 2 : level >= 10 ? 1 : 0]; };
/** a skirmish's BattleSim spec: { map, season ('wheel'), sides: [{ realm, ctl: 'human' | 'easy' | 'normal' | 'hard', level, seat }], seed, shrine } */
G.skirmishSpec = o => {
  const shrine = o.map === 'wheel_shrine';
  const sides = o.sides.map((sd, i) => {
    const ids = ROSTER[sd.realm] || ROSTER.verdance, n = shrine ? 1 : 3;
    return { realm: sd.realm, role: shrine ? 'seat' : i === 0 ? 'att' : 'def', human: sd.ctl === 'human', ai: sd.ctl === 'human' ? 'normal' : sd.ctl, seat: shrine ? (o.sides.length === 2 ? [0, 2][i] : i) : i,
      items: { herb: 2, remedy: 1 }, troops: ids.slice(0, n).map(id => G.troopAt(id, sd.level, { cls: clsAt(id, sd.level), realm: sd.realm, monsters: shrine ? G.HUB_TROOPS[sd.realm] : null })) };
  });
  return { seed: o.seed || 1, map: o.map, season: o.season === 'wheel' ? 'spring' : o.season, wheel: o.season === 'wheel' || shrine, mode: shrine ? 'shrine' : 'siege', bells: shrine ? 6 : undefined, sides };
};
/** the hub / Banners of the Wheel troops: a ruler at 10 with two monsters at 10 */
G.HUB_TROOPS = { verdance: [['unicorn', 10], ['pixie', 10]], solmark: [['cinderhound', 10], ['sunbird', 10]], amberlyn: [['scarecrow', 10], ['griffin', 9]], hoarfast: [['frostwolf', 10], ['icegolem', 9]], dominion: [['clockwork', 10], ['minute', 10]], brigands: [['ogre', 9], ['skeleton', 10]] };
G.SEAT_REALM = ['verdance', 'solmark', 'amberlyn', 'hoarfast'];
/** the tutorial: the ruler and the realm's squire against a brigand patrol on Border Meadow, in Spring */
G.tutorialBattle = (realm, done) => {
  const squire = { verdance: 'lynette', solmark: 'agravain', amberlyn: 'lamorak', hoarfast: 'ragnell' }[realm] || 'lynette', ruler = G.RULER[realm];
  const sarge = { knight: G.unitFromKnight({ id: 'hob', cls: 'brigand', level: 3, stats: G.classStats('brigand', 3), elem: 'summer', items: {}, ruler: false, realm: 'brigands' }), monsters: [['slime', 3], ['bat', 2], ['bat', 2], ['skeleton', 3]].map(([sp, lv], i) => G.unitFromMonster({ uid: 'patrol' + i, sp, form: 1, level: lv, realm: 'brigands' })), formation: 'vanguard' };
  sarge.knight.name = 'Sergeant'; sarge.knight.ref = 'sergeant';
  const spec = { seed: 11, map: 'border_meadow', season: 'spring', mode: 'siege', sides: [
    { realm, role: 'att', human: true, items: { herb: 2 }, troops: [G.troopAt(ruler, G.get('knight', ruler).level, { realm }), G.troopAt(squire, G.get('knight', squire).level, { realm })] },
    { realm: 'brigands', role: 'def', human: false, ai: 'easy', troops: [sarge] }] };
  return { spec, ctx: { kind: 'tutorial', region: G.get('realm', realm).season, sides: ['human', 'ai'], playerSide: 0, intro: [['ruler', 'There: a sergeant and his beasts on our border road.'], ['knight', 'Rout their knight and the patrol breaks. Mind the bridge.']], realm, onEnd: (res) => done(res) } };
};

/* ---- campaign setup ---- */
const ST = { step: 0, t: 0 };
G.SCENES.setup = {
  view: 'threequarter', input: G.PRESET,
  enter() { Object.assign(ST, { step: 0, t: 0, players: 1, realms: [], pick: 0, diff: 1, st: { f: 0 } }); G.In.idle = 0; G.game.allowJoin && G.game.allowJoin({ max: 4, onJoin: (inp, n) => { SU.toast('Player ' + n + ' joins with their own controller', '#7ae07a'); ST.players = Math.max(ST.players, n); } }); },
  exit() { G.game.allowJoin && G.game.allowJoin(false); },
  back() { return stepBack(); },
  update(dt) {
    G.inputTick(dt); ST.t += dt; SU.tickToasts(dt);
    if (G.In.idle > 10) { G.Attract.start(); return; }
    const inp = G.inp();
    if (ST.step === 0) {
      if (G.repeat('left')) { ST.players = Math.max(1, ST.players - 1); G.sfx('ui_move'); }
      if (G.repeat('right')) { ST.players = Math.min(4, ST.players + 1); G.sfx('ui_move'); }
      if (inp.pressed('confirm') || clickedAt('next')) { ST.step = 1; ST.realms = []; ST.pick = 0; G.sfx('ui_confirm'); }
      if (inp.pressed('cancel')) { G.game.go('title'); }
    } else if (ST.step === 1) {
      const free = G.PLAYABLE.filter(r => !ST.realms.includes(r));
      if (G.repeat('left')) { ST.pick = (ST.pick + 3) % 4; G.sfx('ui_move'); }
      if (G.repeat('right')) { ST.pick = (ST.pick + 1) % 4; G.sfx('ui_move'); }
      const hov = hoverCard(); if (hov !== null && hov !== ST.pick) { ST.pick = hov; G.sfx('ui_move'); }
      const r = G.PLAYABLE[ST.pick];
      if (inp.pressed('confirm') || clickedCard() !== null) { if (!free.includes(r)) { G.sfx('ui_error'); SU.toast('Taken by another player', SU.COL.bad); } else { ST.realms.push(r); G.sfx('ui_confirm'); if (ST.realms.length >= ST.players) ST.step = 2; } }
      if (inp.pressed('cancel')) stepBack();
    } else if (ST.step === 2) {
      if (G.repeat('up')) { ST.diff = (ST.diff + 2) % 3; G.sfx('ui_move'); }
      if (G.repeat('down')) { ST.diff = (ST.diff + 1) % 3; G.sfx('ui_move'); }
      if (inp.pressed('confirm')) { ST.step = 3; G.sfx('ui_confirm'); }
      if (inp.pressed('cancel')) stepBack();
    } else {
      if (inp.pressed('confirm')) begin();
      if (inp.pressed('cancel')) stepBack();
    }
  },
  draw(r) {
    r.sky(['#0a0c20', '#1a1e40', '#2a2a50']);
    r.overlay(g => {
      const k = SU.k(), W = r.W, H = r.H;
      SU.title(g, ['PLAYERS', 'CHOOSE A REALM', 'DIFFICULTY', 'BEGIN'][ST.step], W / 2, 10, { scale: 2 });
      if (ST.step === 0) {
        SU.box(g, W / 2 - 110 * k, 50, 220 * k, 90 * k);
        SU.text(g, '←  ' + ST.players + (ST.players === 1 ? ' player' : ' players') + '  →', W / 2, 60, '#ffffff', { align: 'center', scale: 2 });
        SU.text(g, 'Hot-seat: each human commands a realm in turn.', W / 2, 84, SU.COL.dim, { align: 'center' });
        SU.text(g, 'Press Start or Cross on another controller', W / 2, 96, SU.COL.dim, { align: 'center' }); SU.text(g, 'to claim it, or share this one.', W / 2, 106, SU.COL.dim, { align: 'center' });
        (G.game.players || []).forEach((p, i) => SU.text(g, 'P' + (i + 1) + ': ' + (i === 0 ? 'keyboard, mouse and pad' : 'own controller'), W / 2, 120 + i * 10 * k, E.PLAYER_COLORS ? E.PLAYER_COLORS[i] : '#ffffff', { align: 'center' }));
      } else if (ST.step === 1) {
        const cw = Math.min(100 * k, (W - 30) / 4), ch = 172 * k, x0 = Math.round(W / 2 - cw * 2 - 6);
        ST.cards = [];
        G.PLAYABLE.forEach((id, i) => {
          const R = G.get('realm', id), x = x0 + i * (cw + 4), y = 34, taken = ST.realms.indexOf(id), on = i === ST.pick;
          ST.cards.push({ x, y, w: cw, h: ch });
          SU.box(g, x, y, cw, ch, { bg: [E.tones(R.color).sh, E.tones(R.color).deep], border: on ? SU.COL.focus : '#8a86a0', alpha: taken >= 0 ? .5 : .95 });
          SPX.rect(g, x + cw / 2 - 8, y + 5, 16, 18, R.color); SPX.sprite(g, G.sigil(R.sigil, R.trim), x + cw / 2 - 3, y + 8);
          G.knightVis(R.ruler).portrait(g, x + cw / 2 - 22 * k, y + 26, 44 * k, { bg: E.tones(R.color).deep });
          SU.text(g, R.short.toUpperCase(), x + cw / 2, y + 31 + 46 * k, '#ffffff', { align: 'center' });
          SPX.sprite(g, G.elemIcon(R.season), x + cw / 2 - 3, y + 41 + 48 * k);
          SU.text(g, G.get('knight', R.ruler).short, x + cw / 2, y + 51 + 48 * k, E.tones(R.color).lt, { align: 'center' });
          E.font.wrap(R.pitch.join(' '), cw - 8, { scale: k }).slice(0, 6).forEach((l, j) => SU.text(g, l, x + cw / 2, y + 63 + 48 * k + j * 10 * k, SU.COL.dim, { align: 'center' }));
          if (taken >= 0) SU.text(g, 'P' + (taken + 1), x + cw / 2, y + ch - 14, '#ffe080', { align: 'center', scale: 2 });
          if (on) SU.focusFrame(g, x, y, cw, ch, ST.t);
        });
        SU.text(g, 'Player ' + (ST.realms.length + 1) + ', choose your realm', W / 2, 38 + ch, '#ffffff', { align: 'center' });
      } else if (ST.step === 2) {
        const D = [['Easy', 'Rivals are slower; the Hour-Candle burns 16 seasons; more EXP.'], ['Normal', 'The intended war. The candle burns 12 seasons.'], ['Hard', 'Rivals are richer and bolder; the candle burns 10 seasons.']];
        D.forEach(([n, d], i) => { const y = 50 + i * 30 * k, on = i === ST.diff; SU.box(g, W / 2 - 130 * k, y, 260 * k, 26 * k, { alpha: on ? .98 : .7, border: on ? SU.COL.focus : '#8a86a0' }); SU.text(g, n, W / 2 - 122 * k, y + 4, on ? SU.COL.focus : '#ffffff'); SU.text(g, d, W / 2 - 122 * k, y + 14 * k, SU.COL.dim); });
      } else {
        SU.box(g, W / 2 - 130 * k, 50, 260 * k, 80 * k);
        SU.text(g, ST.realms.map((r2, i) => 'P' + (i + 1) + ': ' + G.get('realm', r2).short).join('   '), W / 2, 60, '#ffffff', { align: 'center' });
        SU.text(g, 'Difficulty: ' + ['Easy', 'Normal', 'Hard'][ST.diff], W / 2, 76, SU.COL.dim, { align: 'center' });
        SU.text(g, 'The prologue plays, then Spring of Year 1 begins.', W / 2, 92, SU.COL.dim, { align: 'center' });
        SU.text(g, 'Press ' + G.labelOf('confirm') + ' to begin', W / 2, 110, SU.COL.focus, { align: 'center' });
      }
    });
    SU.prompts(r, ST.step === 1 ? [['left', 'Realm'], ['confirm', 'Choose'], ['cancel', 'Back']] : ST.step === 2 ? [['up', 'Choose'], ['confirm', 'Next'], ['cancel', 'Back']] : [['left', 'Change'], ['confirm', 'Next'], ['cancel', 'Back']]);
    SU.drawToasts(r);
  }
};
function stepBack() { if (ST.step === 0) { G.game.go('title'); return true; } if (ST.step === 1 && ST.realms.length) { ST.realms.pop(); return true; } ST.step--; G.sfx('ui_cancel'); return true; }
function hoverCard() { const inp = G.inp(), p = inp.pointer && inp.pointer(); if (!p || inp.lastDevice !== 'mouse' || !ST.cards) return null; const i = ST.cards.findIndex(c => p[0] >= c.x && p[0] < c.x + c.w && p[1] >= c.y && p[1] < c.y + c.h); return i >= 0 ? i : null; }
function clickedCard() { const inp = G.inp(), c = inp.clicked && inp.clicked(); if (!c || !ST.cards) return null; const i = ST.cards.findIndex(q => c[0] >= q.x && c[0] < q.x + q.w && c[1] >= q.y && c[1] < q.y + q.h); if (i >= 0) ST.pick = i; return i >= 0 ? i : null; }
function clickedAt() { const inp = G.inp(), c = inp.clicked && inp.clicked(); return !!c; }
function begin() {
  const humans = ST.realms.slice(), diff = ['easy', 'normal', 'hard'][ST.diff], seed = (Date.now() % 100000) + 1;
  // seats: player i commands humans[i]; players with their own controller read it
  G.seats = {}; humans.forEach((r, i) => { G.seats[r] = i; });
  G.sfx('ui_confirm');
  const sim = G.CampaignSim.create({ seed, humans, difficulty: diff });
  G.game.go('prologue', { done: () => G.startCampaign(sim) });
}
/** the input of a realm's seat (hot-seat with several controllers), or null (shared) */
G.seatOf = realm => { const i = G.seats && G.seats[realm]; return i !== undefined && G.game.players && G.game.players[i] && G.game.players.length > 1 ? G.game.players[i] : null; };

/* ---- skirmish setup ---- */
const SK = { st: { f: 0 }, t: 0 };
const MAPS = G.all('map').filter(m => !['border_meadow', 'clockwork_sanctum'].includes(m.id)).map(m => m.id);
const SEAS = ['spring', 'summer', 'autumn', 'winter', 'wheel'];
const CTL = ['human', 'easy', 'normal', 'hard'], REALMS6 = ['verdance', 'solmark', 'amberlyn', 'hoarfast', 'dominion', 'brigands'], BANDS = [5, 10, 15, 20];
G.SCENES.skirmishSetup = {
  view: 'threequarter', input: G.PRESET,
  enter(d = {}) { if (!SK.cfg || d.reset) SK.cfg = { preset: 0, map: 0, season: 0, n: 2, sides: [{ ctl: 0, realm: 0, band: 1 }, { ctl: 2, realm: 1, band: 1 }, { ctl: 2, realm: 2, band: 1 }, { ctl: 2, realm: 3, band: 1 }] }; SK.st = { f: 0 }; SK.t = 0; G.In.idle = 0; G.game.allowJoin && G.game.allowJoin({ max: 4 }); },
  exit() { G.game.allowJoin && G.game.allowJoin(false); },
  update(dt) {
    G.inputTick(dt); SK.t += dt; SU.tickToasts(dt);
    if (G.In.idle > 10) { G.Attract.start(); return; }
    const rows = skRows(), inp = G.inp();
    const res = SU.nav(SK.st, SK.items || SU.synth(rows.length), { horizontal: false });
    const row = rows[SK.st.f];
    if (row && row.change) { if (G.repeat('left')) { row.change(-1); G.sfx('ui_move'); } if (G.repeat('right')) { row.change(1); G.sfx('ui_move'); } }
    if (res === 'pick' && row) { if (row.act) row.act(); else if (row.change) { row.change(1); G.sfx('ui_move'); } }
    if (res === 'back') G.game.go('title');
  },
  draw(r) {
    r.sky(['#0a0c20', '#1a1e40', '#2a2a50']);
    r.overlay(g => {
      const k = SU.k(), W = r.W, rows = skRows(), lh = 12 * k, w = 260 * k, x = Math.round(W / 2 - w / 2), y = 32;
      SU.title(g, 'SKIRMISH', W / 2, 8, { scale: 2 });
      SU.box(g, x - 6, y - 4, w + 12, rows.length * lh + 8);
      SK.items = rows.map((rw, i) => ({ x, y: y + i * lh, w, h: lh - 1 }));
      rows.forEach((rw, i) => { const it = SK.items[i], on = i === SK.st.f; if (on) SPX.rect(g, it.x - 2, it.y - 1, it.w + 4, it.h + 1, '#2e3a78'); SU.text(g, rw.label, x + 4, it.y + 1, rw.color || (on ? SU.COL.focus : '#ffffff')); if (rw.value !== undefined) SU.text(g, (rw.change ? '← ' : '') + rw.value + (rw.change ? ' →' : ''), x + w - 4, it.y + 1, on ? '#ffffff' : SU.COL.dim, { align: 'right' }); if (on) SU.focusFrame(g, it.x - 2, it.y - 1, it.w + 4, it.h + 1, SK.t); });
    });
    SU.prompts(r, [['up', 'Choose'], ['left', 'Change'], ['confirm', 'Select'], ['cancel', 'Back']]);
    SU.drawToasts(r);
  }
};
function skRows() {
  const c = SK.cfg, shrine = c.preset === 1 || MAPS[c.map] === 'wheel_shrine';
  const rows = [
    { label: 'Preset', value: ['Custom battle', 'Banners of the Wheel'][c.preset], change: d => { c.preset = (c.preset + 2 + d) % 2; if (c.preset === 1) { c.map = MAPS.indexOf('wheel_shrine'); c.season = 4; } } },
    { label: 'Map', value: G.get('map', MAPS[c.map]).name, change: d => { c.map = (c.map + MAPS.length + d) % MAPS.length; c.preset = MAPS[c.map] === 'wheel_shrine' ? 1 : 0; if (MAPS[c.map] !== 'wheel_shrine') c.n = 2; } },
    { label: 'Season', value: shrine ? 'The Wheel (turns each bell)' : SEAS[c.season] === 'wheel' ? 'The Wheel (turns each bell)' : G.SEASON_NAME[SEAS[c.season]], change: d => { if (!shrine) c.season = (c.season + 5 + d) % 5; } },
    { label: 'Sides', value: c.n + (shrine ? '' : ' (siege maps take 2)'), change: d => { if (shrine) c.n = G.clamp(c.n + d, 2, 4); } }
  ];
  for (let i = 0; i < c.n; i++) {
    const sd = c.sides[i], hn = c.sides.slice(0, i + 1).filter(x => x.ctl === 0).length;
    rows.push({ label: 'Side ' + (i + 1) + (shrine ? '' : i === 0 ? ' (attacker)' : ' (defender)'), value: CTL[sd.ctl] === 'human' ? 'Human P' + hn : 'CPU ' + G.cap(CTL[sd.ctl]), change: d => { sd.ctl = (sd.ctl + 4 + d) % 4; }, color: G.get('realm', REALMS6[sd.realm]).color });
    rows.push({ label: '   Army', value: G.get('realm', REALMS6[sd.realm]).short + (shrine ? '' : ' • level ' + BANDS[sd.band]), change: d => { sd.realm = (sd.realm + 6 + d) % 6; } });
    if (!shrine) rows.push({ label: '   Level band', value: BANDS[sd.band], change: d => { sd.band = (sd.band + 4 + d) % 4; } });
  }
  rows.push({ label: 'BEGIN THE BATTLE', color: '#ffe080', act: () => startSkirmish() });
  return rows;
}
function startSkirmish() {
  const c = SK.cfg, map = MAPS[c.map], shrine = map === 'wheel_shrine';
  const sides = c.sides.slice(0, shrine ? c.n : 2).map(sd => ({ realm: REALMS6[sd.realm], ctl: CTL[sd.ctl], level: shrine ? 10 : BANDS[sd.band] }));
  const spec = G.skirmishSpec({ map, season: shrine ? 'wheel' : SEAS[c.season], sides, seed: (Date.now() % 9999) + 1 });
  const humanIdx = []; let n = 0; const seats = sides.map(sd => (sd.ctl === 'human' ? n++ : null));
  sides.forEach((sd, i) => { if (sd.ctl === 'human') humanIdx.push(i); });
  const ctx = { kind: 'skirmish', region: shrine ? 'hour' : G.get('realm', sides[1].realm).season || 'neutral', sides: sides.map(sd => (sd.ctl === 'human' ? 'human' : 'ai')), seats, playerSide: humanIdx.length ? humanIdx[0] : undefined,
    onEnd: (res, bsim) => G.game.go('results', { res, sim: bsim, playerSide: humanIdx.length ? humanIdx[0] : 0, ctx: 'skirmish', next: () => G.game.go('skirmishAfter', {}) }) };
  G.sfx('ui_confirm');
  G.game.go('battle', { spec, ctx }, { fade: 'swirl', seconds: .4 });
}
/* ---- after a skirmish: Rematch, Change setup or Title ---- */
const SA = { st: { f: 0 } };
G.SCENES.skirmishAfter = {
  view: 'threequarter', input: G.PRESET,
  enter() { SA.st = { f: 0 }; },
  update(dt) { G.inputTick(dt); const res = SU.nav(SA.st, SA.items || SU.synth(3)); if (res === 'pick') { G.sfx('ui_confirm'); [() => startSkirmish(), () => G.game.go('skirmishSetup', {}), () => G.game.go('title')][SA.st.f](); } if (res === 'back') G.game.go('title'); },
  draw(r) {
    r.sky(['#0a0c20', '#1a1e40', '#2a2a50']);
    r.overlay(g => { const k = SU.k(), W = r.W, opts = ['Rematch', 'Change setup', 'Title']; SU.title(g, 'SKIRMISH', W / 2, 20, { scale: 2 }); SA.items = opts.map((o, i) => ({ x: W / 2 - 60 * k, y: 60 + i * 18 * k, w: 120 * k, h: 14 * k })); opts.forEach((o, i) => { const it = SA.items[i], on = i === SA.st.f; SPX.rect(g, it.x, it.y, it.w, it.h, on ? '#2e3a78' : '#1a1e40'); SU.text(g, o, W / 2, it.y + 3, on ? SU.COL.focus : '#ffffff', { align: 'center' }); if (on) SU.focusFrame(g, it.x, it.y, it.w, it.h, 0); }); });
    SU.prompts(r, [['up', 'Choose'], ['confirm', 'Select']]);
  }
};
