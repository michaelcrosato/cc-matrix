/* SKILLER7 — attract mode (§7.23): after 10 s idle on the title, a loop of seven vignettes played by a cheating bot
 * (god mode, infinite Red, aim that snaps, everything revealed). Any key, button, click, wheel, stick or mouse move
 * exits; the input that exits never reaches the menu. */
const VIGNETTES = [
  { cap: 'HOLD TO MOVE. STOP TO KILL.', area: '00A', node: 'r7', persona: 'ignaz', t: 20, setup: () => { setFlag('firstThaw'); setFlag('pim1done'); }, route: [{ goto: 'j1' }, { fn: () => S7.startWave('lobby') }, { goto: 'j2' }, { clear: true }, { goto: 'j4' }, { goto: 'j2' }, { goto: 'j3' }] },
  { cap: 'SEVEN KILLERS. ONE BODY.', area: '01A', node: 'mk', persona: 'rurik', t: 24, setup: () => { S7.startWave('market'); }, route: [{ wait: 2.5 }, { switch: 'dagny' }, { wait: 2.5 }, { switch: 'kasimir' }, { skill: true }, { wait: 2 }, { switch: 'mireille' }, { wait: 2.5 }, { switch: 'brigid' }, { wait: 2.5 }, { switch: 'ignaz' }, { wait: 2.5 }, { goto: 'f1' }] },
  { cap: 'SCAN. FIND THE WARM SPOT.', area: '00B', node: 'x1', persona: 'dagny', t: 20, route: [{ goto: 'j5' }, { clear: true }, { goto: 'r306' }, { clear: true }, { goto: 'j5' }, { goto: 'c2' }] },
  { cap: 'LAWINE!', area: '01C', node: 'jp', persona: 'dagny', t: 22, setup: () => { setFlag('cornice'); }, route: [{ goto: 'al', tuck: true }, { goto: 'bk2', tuck: true }, { goto: 'vb', tuck: true }] },
  { cap: 'SKY CABINS.', area: '01D', node: 'gs', persona: 'ignaz', t: 22, route: [{ hold: 'move', untilFn: () => false }] },
  { cap: 'EIN, ZWEI, DREI, VIER.', area: '01B', node: 'bb', persona: 'dagny', t: 22, setup: () => { setFlag('mirrors'); }, route: [{ goto: 'br' }, { flag: 'band' }] },
  { cap: 'THE POWDER KING.', area: '01F', node: 'fe', persona: 'ignaz', t: 24, route: [{ flag: 'avalaughDown' }, { goto: 'a1' }, { goto: 'sl0' }, { goto: 'sl1' }] }
];
S7.VIGNETTES = VIGNETTES;
const ATT = { i: 0, t: 0, saved: null, title: 0, seen: new Set(), loops: 0 };
S7.ATT = ATT;
function startVignette(i) {
  const v = VIGNETTES[i]; ATT.i = i; ATT.t = 0; ATT.seen.add(i);
  S7.newGame({ seed: 11 + i, difficulty: 'Piste' }); G.attract = true; G.noSaves = true;
  for (const id of ORDER) G.roster[id].unlocked = true; G.red = 999; G.items.edelweiss = 3; G.items.ember = 1; G.items.servicekey = 1;
  G.persona = v.persona; S7.enterArea(v.area, v.node, { noAutosave: true });
  if (v.setup) v.setup();
  BG.card(v.cap, 'DEMO', 2.2);
  S7.bot.run(v.route.map(s => Object.assign({ timeout: 999 }, s)), { cheat: true });
  S7.presenter.enterArea && S7.presenter.enterArea(G.area);
  S7.flurry();
}
S7.startVignette = startVignette;
S7.attractScene = game => ({
  touch: [], camera: false,
  enter() {
    game.input.touchEnabled = false;
    ATT.saved = Object.assign({}, CHEATS); Object.assign(CHEATS, { god: true, infRed: true, revealAll: true, oneHit: false });
    ATT.title = 0; ATT.loops = 0; ATT.seen = new Set(); ATT.exitArm = .25; game.input.consumeAll(); startVignette(0);
  },
  exit() { Object.assign(CHEATS, ATT.saved || {}); S7.BOT.on = false; if (G) G.attract = false; S7.saveDev && S7.saveDev(); },
  update(dt) {
    ATT.exitArm -= dt;
    const I0 = S7.game.input;
    if (ATT.exitArm <= 0 && (idleTick(1 / 120) || In.click())) { I0.consumeAll(); IDLE.t = 0; S7.flurry(); game.go('title', null, { fade: 'white', seconds: .3 }); return; }
    if (ATT.title > 0) { ATT.title -= dt; if (ATT.title <= 0) startVignette(0); return; }
    ATT.t += dt;
    const I = S7.bot.intent(dt);
    if (G.mode === 'results') S7.closeResults();
    game.timeScale = G.mode === 'ring' ? .15 : 1;
    simUpdate(dt, I); S7.presenter.step(dt);
    const v = VIGNETTES[ATT.i];
    if (ATT.t >= v.t || G.mode === 'gameover' || G.mode === 'end') {
      if (ATT.i + 1 < VIGNETTES.length) startVignette(ATT.i + 1); else { ATT.title = 3; ATT.loops++; }
    }
  },
  draw(r) {
    if (ATT.title > 0) { S7.presenter.drawTitle && S7.presenter.drawTitle(r); r.overlay(g => { px.rect(g, 0, 0, r.W, r.H, '#000'); E.font.title(g, 'SKILLER', r.W / 2 - 14, r.H * .35, { scale: 5, colors: ['#ffffff', INK], outline: '#000', depth: 3, align: 'center' }); E.font.title(g, '7', r.W / 2 + tw('SKILLER', 5) / 2 - 6, r.H * .35, { scale: 5, colors: ['#ff5060', RED], outline: '#000', depth: 3 }); }); }
    else { S7.presenter.draw(r); r.overlay(g => UI.hud(g, r, 1 / 60)); }
    r.overlay(g => {
      const [mx, my] = [Math.round(r.W * .05), Math.round(r.H * .05)];
      E.font.title(g, 'SKILLER7', mx, my - 2, { scale: 1, colors: [INK, '#c8c0b8'], outline: '#000' });
      txt(g, 'DEMO', r.W - mx - tw('DEMO', 2), my, RED, { scale: 2 });
      if (Math.floor(UI.t * 2) % 2 === 0 || true) { const s = S7.touchOnly() ? 'TAP TO RETURN' : 'PRESS ANY BUTTON'; px.blend(g, .7, 'normal', () => px.rect(g, r.W / 2 - tw(s, 2) / 2 - 8, r.H - my - 20, tw(s, 2) + 16, 18, '#000')); txt(g, s, r.W / 2 - tw(s, 2) / 2, r.H - my - 17, Math.floor(UI.t * 2) % 2 ? INK : GOLD, { scale: 2 }); }
    });
  }
});
