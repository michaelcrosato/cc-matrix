/* 51-attract: after 10 s with no input on the title or the menu, an AI-played broadcast: a spectacle match, then a
 * montage of the vacation (each beat the real scene, driven by a demo script), then a title card; then again. Any input
 * returns to the title with the input consumed. A DEMO tag shows top left. The demos run on a throwaway state. */
G.attract = {
  active: false, idle: 0, beat: -1, t: 0, cycle: 0, quiet: false,
  BEATS: [
    { id: 'match', dur: 50, caption: null },
    { id: 'map', dur: 7, caption: 'FIVE DAYS IN PARADISE' },
    { id: 'gift', dur: 7, caption: 'MAKE FRIENDS • GIVE GIFTS' },
    { id: 'shop', dur: 7, caption: 'COLLECT 21 SWIMSUITS' },
    { id: 'poolhop', dur: 8, caption: 'POOL HOP' },
    { id: 'casino', dur: 8, caption: 'CASINO NIGHTS' },
    { id: 'photo', dur: 6, caption: 'SNAP POSTCARDS' },
    { id: 'final', dur: 8, caption: 'BEAT THE HOUSE' },
    { id: 'card', dur: 5, caption: null }
  ],
  reset() { this.idle = 0; G.anyInput = false; },
  /** called every step by every scene: counts idle time on the title and menu, and runs the director */
  watch(dt) {
    const g = G.game, I = g.input, name = g.sceneName;
    const touched = G.anyInput || I.anyPressed() || Math.hypot(...I.move()) > .2 || (I.clicked && I.clicked()); G.anyInput = false;
    if (this.active) {
      if (touched && this.t > .3) { this.stop(); return; }
      this.t += dt; const B = this.BEATS[this.beat];
      if (B && this.t >= B.dur) this.next();
      return;
    }
    if (name !== 'title' && name !== 'menu') { this.idle = 0; return; }
    if (touched || g.paused || G.overlay.list.length) { this.idle = 0; return; }
    this.idle += dt;
    if (this.idle >= 10) this.start();
  },
  start() {
    this.active = true; this.beat = -1; this.cycle++; this.saved = G.state; G.seed('cosmetic', 1000 + this.cycle); G.seed('match', 77 + this.cycle * 13);
    this.next();
  },
  next() {
    for (const o of G.overlay.list.slice()) if (o.kind === 'photo') G.overlay.remove(o);
    G.game.timeScale = 1; G.talkBox().close();
    this.beat = (this.beat + 1) % this.BEATS.length; this.t = 0;
    if (this.beat === 0) { G.seed('match', 77 + this.cycle * 13); this.cycle++; }
    const B = this.BEATS[this.beat]; G.state = G.demoState();
    const pick = G.rshuffle('cosmetic', G.FIGHTERS);
    if (B.id === 'match') {
      const tods = ['afternoon', 'sunset', 'night', 'morning'], tod = tods[this.cycle % 4];
      G.startMatch({ mode: 'attract', spectacle: true, cpuAll: true, pointsToWin: 21, tod, weather: 'sunny', title: 'EXHIBITION', subtitle: 'Isla Fortuna Invitational', skipIntro: false,
        teams: [[{ id: pick[0], suit: G.CAST[pick[0]].suit, acc: G.CAST[pick[0]].acc }, { id: pick[1], suit: G.CAST[pick[1]].suit, acc: G.CAST[pick[1]].acc }], [{ id: pick[2], suit: G.CAST[pick[2]].suit, acc: G.CAST[pick[2]].acc }, { id: pick[3], suit: G.CAST[pick[3]].suit, acc: G.CAST[pick[3]].acc }]],
        after: () => this.next() }, { fade: .3 });
    } else if (B.id === 'final') {
      G.startMatch({ mode: 'attract', spectacle: true, cpuAll: true, pointsToWin: 21, tod: 'sunset', final: true, specials: { glare: true }, title: 'THE FORTUNA CUP FINAL', subtitle: 'versus THE HOUSE', skipIntro: true,
        teams: [[{ id: pick[0], suit: G.CAST[pick[0]].suit, acc: G.CAST[pick[0]].acc }, { id: pick[1], suit: G.CAST[pick[1]].suit, acc: G.CAST[pick[1]].acc }], [{ id: 'sonny', suit: 'house_sonny', acc: ['aviators'] }, { id: 'pepper', suit: 'pinstripe', acc: [] }]], after: () => this.next() }, { fade: .3 });
    } else if (B.id === 'map') G.go('map', { demo: true }, { fade: .3 });
    else if (B.id === 'gift') G.go('location', { loc: 'beach', demo: 'gift' }, { fade: .3 });
    else if (B.id === 'shop') G.go('shop', { shop: 'coral', demo: true }, { fade: .3 });
    else if (B.id === 'poolhop') G.go('poolhop', { demo: true }, { fade: .3 });
    else if (B.id === 'casino') G.go('casino', { demo: true }, { fade: .3 });
    else if (B.id === 'photo') G.go('location', { loc: 'pool', demo: 'photo' }, { fade: .3 });
    else if (B.id === 'card') G.go('title', { card: true }, { fade: .3 });
  },
  stop() {
    this.active = false; this.idle = 0; G.state = this.saved || null; for (const o of G.overlay.list.slice()) if (o.kind === 'photo') G.overlay.remove(o); G.game.timeScale = 1; G.talkBox().close();
    G.game.input.consumeAll(); G.curSong = null; G.go('title', null, { fade: .2 });
  },
  draw(r) {
    if (!this.active) return;
    const B = this.BEATS[this.beat];
    r.overlay(g => {
      const blink = Math.floor(G.game.real * 2) % 2;
      E.ui.box(g, 6, 6, 38, 13, { bg: '#c8202c', border: '#ffd36a' }); E.font.text(g, 'DEMO', 13, 9, blink ? '#ffffff' : '#ffd36a', { outline: false });
      if (B && B.caption) { const y = Math.round(r.H * .14), k = Math.min(1, this.t * 3); px.blend(g, .7 * k, 'normal', () => px.rect(g, 0, y - 6, r.W, 30, '#061a24')); E.font.title(g, B.caption, r.W / 2, y, { scale: 2, colors: ['#fff7d6', '#ffd36a', '#ff9e5e'], align: 'center', depth: 2 }); }
      const msg = G.touchOnly() ? 'Controller or keyboard required' : 'PRESS ANY BUTTON';
      if (blink || G.touchOnly()) E.font.text(g, msg, r.W / 2, r.H - 34, '#fff8e8', { align: 'center', shadow: '#000', outline: false, scale: G.touchOnly() ? 1 : 1 });
    });
  }
};
const _dn = G.drawNotices; G.drawNotices = r => { _dn(r); G.attract.draw(r); };
/** a throwaway vacation for the demos */
G.demoState = () => { const S = G.newState('amara', 4242); S.day = 2; S.slot = 1; S.partner = 'lola'; S.money = 88000; S.chips = 120; S.bag = { portable_speaker: 1, mochi_box: 2 }; S.demo = true; return S; };
