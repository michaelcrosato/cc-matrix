/* 31-map: the island map. Pick where to spend the slot. Also the HUD for day, time, money and weather. */
G.hudTop = (r, extra) => {
  const s = G.state; if (!s) return;
  r.overlay(g => {
    const di = G.dayInfo(), w = 200, x = 4, y = 3;
    E.ui.box(g, x, y, w, 15, { bg: ['#0e2a38', '#061620'], border: '#ffd36a', alpha: .92 });
    G.text(g, 'DAY ' + Math.min(5, s.day) + '  ' + G.SLOTS[Math.min(2, s.slot)].toUpperCase(), x + 5, y + 4, '#ffd24a');
    G.text(g, ({ sunny: 'Sunny', cloudy: 'Cloudy' })[di.weather] || 'Sunny', x + 98, y + 4, '#bfe9ee');
    G.text(g, G.fmtMoney(s.money), x + w - 5, y + 4, '#9bffb0', { align: 'right' });
    if (s.partner) { E.ui.box(g, x, y + 17, w, 13, { bg: ['#0e2a38', '#061620'], border: '#ff6a8a', alpha: .9 }); G.text(g, 'Partner ' + G.CAST[s.partner].name, x + 5, y + 20, '#ffd0dc'); G.text(g, '♥'.repeat(G.hearts(s.partner)) + '•'.repeat(5 - G.hearts(s.partner)), x + w - 5, y + 20, '#ff6a8a', { align: 'right' }); }
    if (extra) extra(g);
  });
};

G.scenes.map = G.wrapScene({
  view: 'threequarter', input: G.INPUT_MENU, res: 'ps1', expand: true, name: 'map', pausable: true,
  enter() {
    this.t = 0; G.music('promenade'); G.game.focus(0, 0, 14); G.game.lights.enabled = false;
    const s = G.state; this.story = null; this.sp = null; this.nav = null;
    const key = G.storyKey(); if (key && !s.flags['done:' + s.day + ':' + s.slot]) { this.story = key; return; }
    this.build(); this.hint = null;
  },
  build() {
    const W = G.game.W, H = G.game.H, s = G.state, night = s.slot === 2;
    const nodes = Object.values(G.PLACES).map(p => ({ id: p.id, x: Math.round(p.mx * W), y: Math.round(24 + p.my * (H - 70)), w: 74, h: 18, label: p.name, p, disabled: p.night && !night, onPick: n => { G.game.go('location', { loc: n.id }); } }));
    const by = H - 18, bx = [Math.round(W * .3), Math.round(W * .5), Math.round(W * .7)];
    nodes.push({ id: 'journal', x: bx[0], y: by, w: 70, h: 14, label: 'Journal', btn: true, onPick: () => G.game.go('journal', { back: 'map' }) });
    nodes.push({ id: 'album', x: bx[1], y: by, w: 70, h: 14, label: 'Postcards', btn: true, onPick: () => G.game.go('album', { back: 'map' }) });
    nodes.push({ id: 'save', x: bx[2], y: by, w: 70, h: 14, label: 'Save', btn: true, onPick: () => G.game.saves.show('save') });
    this.nav = new G.NodeNav(nodes, { start: 2 });
  },
  update(dt) {
    this.t += dt;
    if (this.story) { const k = this.story; this.story = null; G.runStory(k); return; }
    if (!this.nav) return; this.nav.update(dt);
    if (G.game.input.pressed('photo')) G.openPhoto && G.openPhoto('Isla Fortuna');
  },
  draw(r) {
    const W = r.W, H = r.H, g = r.tgt, s = G.state, t = this.t, night = s && s.slot === 2;
    // sea
    px.rect(g, 0, 0, W, H, night ? '#0a2a5a' : '#2a98d0');
    for (let y = 0; y < H; y += 3) px.rect(g, 0, y, W, 1, night ? '#0c3068' : ((y / 3 & 1) ? '#2a9ad4' : '#38aadc'));
    for (let i = 0; i < 40; i++) { const x = (i * 53 + Math.floor(t * 10 + i * 7)) % W, y = (i * 37) % H; px.rect(g, x, y, 6, 1, night ? '#1c4a8a' : '#bfeefc'); }
    // island: layered blobs
    const blob = (cx, cy, rx, ry, c) => { const pts = []; for (let a = 0; a < 28; a++) { const an = a / 28 * TAU, wob = 1 + .08 * Math.sin(an * 5 + 1) + .05 * Math.sin(an * 3); pts.push([cx + Math.cos(an) * rx * wob, cy + Math.sin(an) * ry * wob]); } px.poly(g, pts, c); };
    blob(W * .5, H * .5, W * .46, H * .4, night ? '#10304a' : '#d8f4f8'); blob(W * .5, H * .5, W * .44, H * .38, night ? '#2a3a4a' : '#f2d79a'); blob(W * .5, H * .5, W * .36, H * .3, night ? '#123a2a' : '#4fb860'); blob(W * .5, H * .46, W * .22, H * .16, night ? '#0e2e20' : '#3a9a4a');
    blob(W * .5, H * .36, 20, 14, night ? '#4a4a5a' : '#8a8a96');
    // buildings and paths drawn per place
    const n = this.nav; if (!n) return;
    for (const nd of n.nodes) {
      if (nd.btn) continue;
      px.rect(g, nd.x - 2, nd.y - 2, 4, 4, '#ffd36a');
    }
    r.overlay(gg => {
      for (let i = 0; i < n.nodes.length; i++) {
        const nd = n.nodes[i], sel = i === n.i, x = nd.x - nd.w / 2, y = nd.y - nd.h / 2;
        const dis = nd.disabled;
        if (nd.btn) { E.ui.box(gg, x, y, nd.w, nd.h, sel ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: ['#1b4a5a', '#0b2430'], border: '#2a6a7a', alpha: .9 }); G.text(gg, nd.label, nd.x, y + 4, '#fff', { align: 'center' }); continue; }
        E.ui.box(gg, x, y, nd.w, nd.h, sel ? { bg: ['#ff9a3c', '#ff4f6a'], border: '#fff6c8' } : { bg: dis ? ['#2a3a44', '#16222a'] : ['#1b4a5a', '#0b2430'], border: dis ? '#4a5a64' : '#ffd36a', alpha: .95 });
        G.text(gg, nd.label, nd.x, y + 5, dis ? '#7a8a94' : '#fff', { align: 'center' });
        // who is there
        if (!dis) { const who = G.npcsAt(nd.id); who.slice(0, 5).forEach((id, k) => { px.disc(gg, Math.round(x + 6 + k * 8), Math.round(y + nd.h + 5), 3, G.CAST[id].cloth); px.disc(gg, Math.round(x + 6 + k * 8), Math.round(y + nd.h + 5), 1, '#ffffff66'); }); }
        if (sel) { const p = nd.p, w = 200, bx = Math.round(clamp(nd.x - w / 2, 4, W - w - 4)), by = nd.y > H / 2 ? Math.round(nd.y - 56) : Math.round(nd.y + 26); G.panel(gg, bx, by, w, 28); G.text(gg, p.blurb, bx + 6, by + 5, '#fff6c8'); G.text(gg, dis ? 'Opens at night.' : G.npcsAt(nd.id).map(id => G.CAST[id].name).join(', ') || 'Quiet right now.', bx + 6, by + 16, dis ? '#ffb0a0' : '#bfe9ee'); }
      }
      E.font.title(gg, 'ISLA FORTUNA', W / 2, 20, { align: 'center', scale: 1, colors: ['#fff6c8', '#ffd24a', '#ff9a3c'] });
    });
    G.hudTop(r);
    G.drawPrompts(r, [['confirm', 'Go'], ['photo', 'Postcard'], ['pause', 'Menu']]);
  }
});
