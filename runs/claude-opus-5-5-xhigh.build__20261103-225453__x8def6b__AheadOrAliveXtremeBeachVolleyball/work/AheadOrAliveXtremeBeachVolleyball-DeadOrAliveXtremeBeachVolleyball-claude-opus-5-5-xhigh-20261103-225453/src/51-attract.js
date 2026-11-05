/* 51-attract: after 10 s with no input on the title or the menu, an AI-played broadcast loops: a spectacle match on
 * Sunset Courts (the camera cutting between Broadcast and Serve Cam every 2 points), then a montage of the vacation in
 * seven captioned beats, then the title card. It runs on a throwaway demo save and may cheat freely. Any key, button,
 * stick, mouse move, click, wheel or touch returns to the title, with that input consumed. */
G.ATTRACT_IDLE = 10;
G.attract = null;
G.attractT = 0; G._ap = null;
G.attractReset = () => { G.attractT = 0; };
/** was there any input this step? keys, buttons, a stick past its dead zone, the mouse moving 4 px, a click, the wheel, a touch */
G.anyInput = () => {
  for (const I of G.game.players) {
    if (I.anyPressed && I.anyPressed()) return true;
    if (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > 0) return true;
    if (I.clicked && I.clicked()) return true;
  }
  const I = G.game.input, p = I.pointer && I.pointer();
  if (p) { if (G._ap && Math.hypot(p[0] - G._ap[0], p[1] - G._ap[1]) > 4) { G._ap = p.slice(); return true; } if (!G._ap) G._ap = p.slice(); }
  if (G.wheel) return true;
  return false;
};
/** the title and menu call this each step: true when the attract has just started */
G.attractIdle = dt => {
  if (G.attract) return false;
  if (G.anyInput()) { G.attractT = 0; return false; }
  G.attractT += dt;
  if (G.attractT >= G.ATTRACT_IDLE) { G.startAttract(); return true; }
  return false;
};
const BEATS = [
  { id: 'match', len: 50 }, { id: 'map', len: 7, cap: 'FIVE DAYS IN PARADISE' }, { id: 'friends', len: 7, cap: 'MAKE FRIENDS · GIVE GIFTS' }, { id: 'suits', len: 7, cap: 'COLLECT 21 SWIMSUITS' },
  { id: 'pool', len: 8, cap: 'POOL HOP' }, { id: 'casino', len: 8, cap: 'CASINO NIGHTS' }, { id: 'photo', len: 6, cap: 'SNAP POSTCARDS' }, { id: 'final', len: 8, cap: 'BEAT THE HOUSE' }, { id: 'card', len: 5 }
];
G.ATTRACT_BEATS = BEATS;
G.startAttract = () => {
  const A = G.attract = { i: -1, t: 0, cycle: 0, saved: G.state, log: [] };
  G.overlay.push(G.attractOverlay);
  G.nextBeat();
  return A;
};
G.demoState = () => {
  const seed = 101 + G.attract.cycle * 13, me = G.FIGHTERS[G.attract.cycle % 6];
  const st = G.newState(me, seed); G.state = st; st.flags.tutorialDone = true; st.money = 86000; st.chips = 120;
  const pick = G.npcs(st)[0]; st.affinity[pick] = 60; G.dayStart(); G.setPartner(pick);
  st.bag = { plush_seal: 2, hot_sauce: 1, surf_wax: 1, snow_globe: 1, mochi_box: 1, portable_speaker: 1 };
  return st;
};
G.nextBeat = () => {
  const A = G.attract; A.i = (A.i + 1) % BEATS.length; A.t = 0; if (A.i === 0) A.cycle++;
  const B = BEATS[A.i]; A.beat = B.id; A.log.push(B.id); if (A.log.length > 30) A.log.shift(); A.sub = 0; A.k = 0;
  G.seed('attract', 77 + A.cycle * 5 + A.i);
  const g = G.game;
  if (B.id === 'match' || B.id === 'final') {   // (the demo save is dropped as the match scene enters: the scene shown now draws from it through the fade)
    const L = G.shuffle('attract', G.FIGHTERS), tod = G.pick('attract', ['afternoon', 'sunset', 'night', 'morning']);
    const suit = id => G.pick('attract', [G.CAST[id].suit].concat(G.SUIT_IDS.filter(s => !G.SUITS[s].tastes || G.SUITS[s].tastes.some(t => G.CAST[id].tastes.includes(t))))), mk = id => ({ cast: id, suit: suit(id), skill: 1 });
    const final = B.id === 'final';
    const cfg = { mode: 'attract', spectacle: !final, seed: 900 + A.cycle * 31 + A.i, tod: final ? 'sunset' : tod, pointsToWin: 21, commentary: true, replay: !final, final, introTime: final ? .8 : 2.2,
      teams: final ? [[mk(L[0]), mk(L[1])], [{ cast: 'sonny', kit: 'final', skill: .9 }, { cast: 'pepper', kit: 'final', skill: .95 }]] : [[mk(L[0]), mk(L[1])], [mk(L[2]), mk(L[3])]],
      specials: final ? { glare: true, houseEdge: true } : {}, firstServe: final ? 1 : 0, music: final ? 'house' : 'spike', title: final ? 'THE FORTUNA CUP' : 'BEACH MATCH',
      teamNames: final ? [G.castName(L[0]) + ' & ' + G.castName(L[1]), 'The House'] : null, onResults: () => ({ update() {}, draw() {} }) };
    G.game.go('match', { cfg }, { fade: .3 });
    A.points = 0;
    return;
  }
  G.demoState();
  if (B.id === 'map') { G.state.slot = 0; g.go('map', null, { fade: .3 }); }
  else if (B.id === 'friends') g.go('location', { loc: 'beach', at: [330, 250] }, { fade: .3 });
  else if (B.id === 'suits') g.go('shop', { shop: 'coral', from: 'promenade' }, { fade: .3 });
  else if (B.id === 'pool') g.go('poolhop', { bot: true, seed: 5 + A.cycle }, { fade: .3 });
  else if (B.id === 'casino') { G.state.slot = 2; G.Slots.forced = '7'; g.go('casino', { station: 'slots', at: [80, 150] }, { fade: .3 }); }
  else if (B.id === 'photo') { G.state.slot = 1; g.go('location', { loc: 'pool', at: [220, 250] }, { fade: .3 }); }
  else if (B.id === 'card') { G.state = A.saved; g.go('title', null, { fade: .3 }); }
};
G.stopAttract = () => {
  const A = G.attract; if (!A) return;
  G.attract = null; G.overlay.remove(G.attractOverlay); const ph = G.overlay.get('photo'); if (ph) { G.overlay.remove(ph); G.popInput(); }
  G.state = A.saved; G.Slots.forced = false; G.BJ.forced = null; G.game.timeScale = 1; G.attractT = 0; G._ap = null;
  for (const I of G.game.players) I.consumeAll();
  G.musicNow = null; G.game.go('title', null, { fade: .25 });
};
/* any input ends the attract on the very step it happens, even while a scene fades */
if (E.onStep) E.onStep(() => { if (G.attract && G.anyInput()) G.stopAttract(); });
G.attractOverlay = {
  id: 'attract',
  update(dt, took) {
    const A = G.attract; if (!A) return false;
    if (G.anyInput()) { G.stopAttract(); return true; }
    const rdt = G.realDt, B = BEATS[A.i]; A.t += rdt; A.k += rdt;
    const g = G.game, sc = g.scene;
    if (B.id === 'match' && G.M) {   // the camera cuts between Broadcast and Serve Cam every 2 points
      const pts = G.M.rules.score[0] + G.M.rules.score[1];
      if (pts - A.points >= 2) { A.points = pts; G.M.camMode = G.M.camMode === 'Broadcast' ? 'Serve Cam' : 'Broadcast'; }
      if (G.M.phase === 'results' || G.M.phase === 'end') { if (A.t > 8) G.nextBeat(); return false; }
    }
    if (B.id === 'map' && A.k > 2.2 && G.state) { A.k = 0; G.state.slot = (G.state.slot + 1) % 3; if (G.state.slot === 0) G.state.day = G.state.day % 5 + 1; g.go('map', null, { fade: .2 }); }
    if (B.id === 'friends' && sc && sc.npcs && A.sub === 0 && A.t > 1.5) {
      A.sub = 1; const n = sc.npcs.find(q => !q.staff && !q.partner) || sc.npcs[0];
      if (n) { const loved = Object.keys(G.GIFT_TASTE_TABLE).find(k => G.giftTaste(n.id, k) === 'love') || 'plush_seal'; G.state.bag[loved] = 1; sc.ui = { kind: 'bag', npc: n, items: [{ id: loved, n: 1, kind: 'gift' }], page: 0, nav: new G.Nav() }; }
    }
    if (B.id === 'friends' && sc && sc.ui && sc.ui.kind === 'bag' && A.sub === 1 && A.t > 2.6) { A.sub = 2; sc.giveFromBag(sc.ui.items[0]); }
    if (B.id === 'suits' && sc && sc.nav && A.k > .9) { A.k = 0; const its = sc.items(); if (its.length) { A.sub = (A.sub + 1) % its.length; sc.nav.focus = its[A.sub].id; } }
    if (B.id === 'casino' && sc && sc.slot) {
      if (sc.station === 'slots' && sc.slot.phase === 'idle' && A.t > .8) { G.Slots.forced = '7'; sc.slot.phase = 'spin'; sc.slot.spin = [true, true, true]; sc.slot.t = 0; G.state.chips -= 1; }
      if (sc.station === 'slots' && A.t > 4.2) { sc.station = 'blackjack'; sc.bj.phase = 'bet'; G.BJ.forced = [{ r: 'A', s: '♠' }, { r: 'K', s: '♥' }, { r: '9', s: '♣' }, { r: '7', s: '♦' }]; sc.say('pepper', G.pickLine('pepper', 'dealer')); A.sub = 0; }
      if (sc.station === 'blackjack' && sc.bj.phase === 'bet' && A.t > 4.8 && A.sub === 0) { A.sub = 1; sc.bj.bet = 10; G.state.chips -= 10; sc.bj.hands = [{ cards: [G.BJ.draw(), G.BJ.draw()], bet: 10 }]; sc.bj.dealer = [G.BJ.draw(), G.BJ.draw()]; sc.bj.hands[0].bj = G.BJ.isBJ(sc.bj.hands[0].cards); sc.bj.cur = 0; sc.dealerTurn(); G.sfx('card_deal'); }
    }
    if (B.id === 'photo' && sc && sc.hero && A.sub === 0 && A.t > .8) { A.sub = 1; G.photoAllowed = true; const was = G.attract; G.attract = null; const ov = G.photo.open(); G.attract = was; if (ov) { ov.panel = false; ov.filter = 1; } A.photo = ov; }
    if (B.id === 'photo' && A.photo && A.k > .5) { A.k = 0; if (G.game.rotateView) G.game.rotateView(15); if (A.t > 4 && !A.shot) { A.shot = true; G.sfx('shutter'); A.photo.flash = 1; } }
    if (A.t >= B.len) {
      if (B.id === 'photo' && A.photo) { G.overlay.remove(A.photo); G.popInput(); G.game.timeScale = 1; A.photo = null; A.shot = false; }
      G.nextBeat();
    }
    return false;
  },
  draw(r) {
    const A = G.attract; if (!A) return;
    const B = BEATS[A.i];
    r.overlay(g => {
      const sf = G.safe(r);
      const dy = r.H - sf.y - 14 - (A.photo && A.photo.frame ? 22 : 0);   // (bottom left, above a postcard's frame: every scene keeps its HUD at the top, and its prompt bar is hidden while the demo plays)
      if (B.id !== 'card') { E.ui.box(g, sf.x, dy, 34, 13, { bg: ['#ff5f7a', '#c8304a'], border: '#ffd0d8', alpha: .95 }); E.font.text(g, 'DEMO', sf.x + 17, dy + 3, '#fff8e8', { align: 'center', outline: false }); }
      if (B.cap) { const k = clamp(A.t / .4, 0, 1) * clamp((B.len - A.t) / .4, 0, 1), y = Math.round(r.H * .72); px.blend(g, .6 * k, 'multiply', () => px.rect(g, 0, y - 6, r.W, 34, '#102030')); E.font.title(g, B.cap, Math.round(r.W / 2 + (1 - k) * 60), y, { scale: B.cap.length > 18 ? 2 : 3, align: 'center', colors: ['#fff7d6', '#ffd36a', '#ff9e5e'], depth: 2 }); }
      if (G.touchOnly()) E.font.text(g, 'Controller or keyboard required', r.W / 2, r.H - sf.y - 10, '#ffd36a', { align: 'center', shadow: '#000', outline: false });
      // (blinking; the title card blinks its own)
      else if (B.id !== 'card' && Math.floor(G.now() * 1.5) % 2) { const w = G.promptW('confirm', 'PRESS'); E.font.text(g, 'PRESS', Math.round(r.W / 2 - w / 2), r.H - sf.y - 10, '#fff8e8', { shadow: '#000', outline: false }); G.glyph(g, Math.round(r.W / 2 - w / 2 + E.font.width('PRESS') + 4), r.H - sf.y - 11, 'confirm'); }
    });
  }
};
