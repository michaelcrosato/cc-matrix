/* scenes/title.js: the studio, the sea, Tare hopping on a mat, the logo. Attract starts after 10 s without input. */
(() => {
'use strict';
const E = My3D2dge, G = window.G, { px } = E, game = G.game;
const txt = (...a) => G.txt(...a);
let pills, tare, idle = 0, sub = null, t = 0;
const buildMenu = () => {
  const items = []; const latest = !G.inSession && game.saves.latest();
  if (latest) items.push({ label: 'Continue', id: 'continue' });
  items.push({ label: latest ? 'Members' : 'New Member', id: 'member' });
  items.push({ label: 'Class', id: 'class', sub: undefined });
  if (G.anyFreePlay()) items.push({ label: 'Free Play', id: 'free' });
  items.push({ label: 'Settings', id: 'settings' }, { label: 'About', id: 'about' });
  pills = G.menuPills = new G.Pills(items, { x: () => Math.round(game.W * .69), y: () => Math.round(game.H * .3), w: 150, h: 19, gap: 5, onPick(i, it) {
    if (it.id === 'continue') { const s = game.saves.latest(); if (s && game.saves.load(s.slot)) G.startDay(); else G.go('member'); }
    else if (it.id === 'member') G.go('member');
    else if (it.id === 'class') G.go('class');
    else if (it.id === 'free') { const s = game.saves.latest(); if (s) game.saves.load(s.slot); G.go('freeplay'); }
    else if (it.id === 'settings') game.menu('settings');
    else if (it.id === 'about') G.go('about');
  } });
};
/** has any member reached the ending? Free Play opens then */
G.anyFreePlay = () => { for (let i = 0; i < 3; i++) { const m = G.Save.member(i); if (m && m.data && m.data.freePlay) return true; } return false; };
G.scenes.title = {
  view: 'brawler', camera: { zoom: false },
  enter(d) { t = 0; idle = 0; tare = new G.TareBody(-74, 8); tare.scale = 3; buildMenu(); G.L.enabled = false; G.music('studio'); game.timeScale = G.DEV.timeScale; G.talk.close(); G.dbg.activity = null; G.attractOn = false; if (d && d.fromAttract) { tare.say('shocked', 3); G.mutter('tare', G.DATA.lines.tare.attractBack, { attract: true, auto: 3 }); } else { G.Save.save(); if (G.pendingLine) { tare.say('sad', 3); G.mutter('tare', G.pendingLine, { attract: true, auto: 4 }); G.pendingLine = null; } } },
  update(dt) {
    t += dt; G.stageCam(34, 8); G.talk.update(dt);
    if (Math.floor(t / 1.7) !== Math.floor((t - dt) / 1.7)) tare.hop(42);
    tare.update(dt);
    if (game.shell && game.shell.screen) { idle = 0; return; }
    pills.update(dt);
  },
  draw(r) {
    G.ROOMS.studio(r);
    G.drawMat(r, -74, 8, 54, 15, '#bfeee0');
    tare.draw(r, { scale: 3 });
    r.overlay(g => {
      const W = game.W, H = game.H;
      G.title(g, G.TITLE, W / 2, Math.max(12, H * .06), W < 360 ? 3 : 4);
      txt(g, G.DATA.lines.motto, W / 2, Math.max(12, H * .06) + 38, '#14a8c8', { align: 'center', shadow: '#ffffff' });
      pills.draw(g);
      G.prompts(g, [['confirm', 'Pick']]);
    });
    G.talk.draw(r);
  }
};
})();
