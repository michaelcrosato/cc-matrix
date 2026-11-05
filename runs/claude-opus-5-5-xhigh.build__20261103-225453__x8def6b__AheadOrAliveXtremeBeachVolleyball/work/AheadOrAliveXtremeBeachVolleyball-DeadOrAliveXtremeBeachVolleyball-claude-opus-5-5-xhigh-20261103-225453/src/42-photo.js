/* 42-photo: Postcards. Photo mode (from the pause menu, Create / C in places and on match results; never in sessions or
 * the attract) freezes play; the stick pans, the right stick or a right-drag orbits, L2/R2 or the wheel zooms, Cross
 * shoots, Square picks the subject, Triangle opens the panel (pose, expression, filter, frame), R3 / H hides the UI.
 * A photo is kept as a spec, never pixels: the place, time and weather, the camera, and everyone's suit, pose, face and
 * spot. The album re-renders them live (palms still sway); one can be the title's backdrop, or saved as a PNG. */
G.POSES = [['Wave', { pose: 'wave' }], ['Peace', { poseW: { peace: 1 } }], ['Hips', { pose: 'hips' }], ['Cheer', { pose: 'cheer' }], ['Stretch', { poseW: { stretch: 1 } }], ['Look Back', { poseW: { lookback: 1 } }], ['Sit', { poseW: { sit: 1 } }], ['Victory', { clip: 'Victory', pose: 'cheer' }], ['Salute', { clip: 'Salute', pose: 'wave' }], ['Bow', { clip: 'Bow', pose: 'kneel' }]];
G.EXPRS = ['smile', 'shout', 'wince', 'neutral'];
G.FILTERS = ['Clean', 'Sunny', 'Sepia', 'Retro', 'Night Glow'];
G.FRAMES = ['None', 'Postcard'];
G.photoAllowed = false;
const poseState = (P, x, y, facing, t) => { const pz = (G.POSES.find(q => q[0] === P.pose) || G.POSES[0])[1]; const s = { x, y, z: 0, vx: 0, vy: 0, facing, expr: P.expr === 'neutral' ? null : P.expr }; if (pz.pose) s.pose = pz.pose; if (pz.poseW) s.poseW = Object.assign({}, pz.poseW); return { s, clip: pz.clip && G.Anim.has(pz.clip) ? pz.clip : null, t }; };
G.photo = {
  allowed() { return !G.hub && !G.attract && (G.photoAllowed || (G.inMatchScene && G.M && G.M.phase === 'results')); },
  /** gather the people of the scene shown now */
  gather() {
    const sc = G.game.scene, out = [];
    if (G.inMatchScene && G.M) for (const p of G.M.players) out.push({ id: p.cast, rig: p.rig, x: p.x, y: p.y, facing: p.facing, suit: p.rig.suitId, acc: p.rig.accs, kit: p.rig.kit });
    else if (sc && sc.hero) { out.push({ id: G.state.me, rig: sc.heroRig, x: sc.hero.x, y: sc.hero.y, facing: sc.hero.facing }); for (const n of sc.npcs || []) out.push({ id: n.id, rig: n.rig, x: n.x, y: n.y, facing: n.facing }); }
    for (const q of out) { const w = G.wearOf(q.id) || {}; q.suit = q.suit || w.suit; q.acc = q.acc || w.acc || []; q.pose = 'Wave'; q.expr = 'smile'; }
    return out;
  },
  open(kind) {
    if (!this.allowed()) { G.sfx('ui_error'); return; }
    const g = G.game, people = this.gather(); if (!people.length) return;
    const loc = G.inMatchScene ? 'beach' : (g.scene && g.scene.loc) || 'beach';
    const st = G.state, ov = {
      id: 'photo', modal: true, sceneBound: true, people, sub: 0, filter: 0, frame: 1, panel: false, hide: false, t: 0, flash: 0, dev: null,
      loc, ts: g.timeScale, view: g.view, yaw: g.yaw || 0, zoom: g.zoom, fx: people[0].x, fy: people[0].y, fz: 16, nav: new G.Nav(), row: 0,
      update(dt) {
        const I = g.input, rdt = G.realDt; this.t += rdt; this.flash = Math.max(0, this.flash - rdt * 3);
        if (this.dev) { this.dev.t += rdt; if (this.dev.t > 2.2) this.dev = null; }
        // the people hold their poses, still breathing (cosmetic, on real time)
        for (const q of this.people) { const P = poseState(q, q.x, q.y, q.facing, this.t); G.Anim.idle(q.rig, rdt, P.s, { clip: P.clip, t: this.t }); }
        if (this.panel) {
          const rows = ['pose', 'expr', 'filter', 'frame'];
          if (I.repeat('up', .35, .12)) { this.row = (this.row + 3) % 4; G.sfx('ui_tick'); } if (I.repeat('down', .35, .12)) { this.row = (this.row + 1) % 4; G.sfx('ui_tick'); }
          const d = I.repeat('right', .35, .12) ? 1 : I.repeat('left', .35, .12) ? -1 : 0, q = this.people[this.sub];
          if (d) { G.sfx('ui_tick'); const k = rows[this.row]; if (k === 'pose') q.pose = G.POSES[(G.POSES.findIndex(x => x[0] === q.pose) + d + G.POSES.length) % G.POSES.length][0]; else if (k === 'expr') q.expr = G.EXPRS[(G.EXPRS.indexOf(q.expr) + d + 4) % 4]; else if (k === 'filter') this.filter = (this.filter + d + 5) % 5; else this.frame = (this.frame + 1) % 2; }
          if (I.pressed('extra') || I.pressed('cancel')) { this.panel = false; G.sfx('ui_back'); }
          if (I.pressed('confirm')) this.panel = false;
          return true;
        }
        const m = I.move(), dv = g.view.screenDirToGround(m[0], m[1]); this.fx += dv[0] * 120 * rdt; this.fy += dv[1] * 120 * rdt;
        g.follow(null); g.focus(this.fx, this.fy, this.fz); g.cam.smooth = .1;
        const aim = I.padAim, pan = I.pan && I.pan(); if (aim && Math.abs(aim[0]) > .4 && g.rotateView) { this._rot = (this._rot || 0) + aim[0] * rdt * 90; if (Math.abs(this._rot) >= 15) { g.rotateView(Math.sign(this._rot) * 15); this._rot = 0; } }
        if (pan && Math.abs(pan[0]) > 2 && g.rotateView) g.rotateView(pan[0] > 0 ? 5 : -5);
        if (G.wheel) g.setZoom(clamp(g.zoom * (G.wheel > 0 ? .9 : 1.1), .75, 2.5));
        if (I.down('trigL')) g.setZoom(clamp(g.zoom * (1 - rdt), .75, 2.5)); if (I.down('trigR')) g.setZoom(clamp(g.zoom * (1 + rdt), .75, 2.5));
        if (I.pressed('alt')) { this.sub = (this.sub + 1) % this.people.length; G.sfx('ui_tick'); const q = this.people[this.sub]; this.fx = q.x; this.fy = q.y; }
        if (I.pressed('extra')) { this.panel = true; this.row = 0; G.sfx('ui_select'); }
        if (I.pressed('hide')) this.hide = !this.hide;
        if (I.pressed('confirm')) this.shoot();
        if (I.pressed('cancel') || I.pressed('esc')) this.close();
        return true;
      },
      spec() {
        const s = G.state;
        return { loc: this.loc, day: s ? s.day : 1, slot: s ? s.slot : 1, tod: G.curTod || 'afternoon', weather: s ? G.weatherNow() : 'sunny', cam: { x: this.fx, y: this.fy, z: this.fz, yaw: g.yaw || 0, zoom: g.zoom, view: g.view.id },
          people: this.people.map(q => ({ id: q.id, suit: q.suit, acc: q.acc, kit: q.kit, pose: q.pose, expr: q.expr, x: Math.round(q.x), y: Math.round(q.y), facing: +q.facing.toFixed(2) })), filter: G.FILTERS[this.filter], frame: G.FRAMES[this.frame] };
      },
      shoot() {
        G.sfx('shutter'); this.flash = 1; G.sting('photo');
        const sp = this.spec(); G.photo.add(sp); this.dev = { t: 0 };
        G.bus.emit('photo', sp);
      },
      close() { G.overlay.remove(ov); G.popInput(); g.timeScale = this.ts; g.setZoom(this.zoom); if (g.resetCamera) { /* keep the view, undo the turn */ } if (this.yaw !== (g.yaw || 0) && g.rotateView) g.rotateView(this.yaw - (g.yaw || 0)); const sc = g.scene; if (sc && sc.hero) g.follow(sc.hero, { z: 16 }); g.input.consumeAll(); G.sfx('ui_back'); },
      draw(r) {
        G.photo.filterFx(r, G.FILTERS[this.filter]);
        r.overlay(gg => {
          if (this.frame) G.photo.frameFx(gg, r, G.state ? G.state.day : 1);
          if (this.flash > 0) px.blend(gg, this.flash, 'normal', () => px.rect(gg, 0, 0, r.W, r.H, '#ffffff'));
          if (this.dev) { const k = clamp(this.dev.t / .5, 0, 1), w = 64, h = 46, x = Math.round(r.W - w - 12), y = Math.round(r.H - h - 30 + (1 - k) * 60); E.ui.box(gg, x, y, w, h, { bg: ['#f8f6f0', '#e8e4dc'], border: '#a89878', alpha: 1 }); px.rect(gg, x + 4, y + 4, w - 8, h - 16, E.mix('#78c8f0', '#ffd36a', this.dev.t / 2.2)); E.font.text(gg, 'Developing...', x + w / 2, y + h - 11, '#5a4a3a', { align: 'center', outline: false, font: 'tiny' }); }
          if (this.hide) return;
          const q = this.people[this.sub], s = r.w(q.x, q.y, 52); G.ui.tag(gg, '▼ ' + G.castName(q.id), s[0], s[1], '#2a1a10', '#ffd36a');
          E.font.text(gg, 'PHOTO MODE', Math.round(r.W * .05), Math.round(r.H * .05), '#ffd36a', { shadow: '#000', outline: false });
          if (this.panel) {
            const x = Math.round(r.W * .05), y = Math.round(r.H * .2), vals = [q.pose, q.expr, G.FILTERS[this.filter], G.FRAMES[this.frame]];
            G.ui.panel(gg, x, y, 150, 96, { title: 'POSTCARD' });
            ['Pose', 'Expression', 'Filter', 'Frame'].forEach((l, i) => { const it = { x: x + 6, y: y + 10 + i * 20, w: 138, h: 16, label: l, value: () => vals[i] }; G.ui.stepper(gg, it, i === this.row); });
            G.promptBar(gg, r, [['move', 'Change'], ['extra', 'Done']], this.frame ? { y: r.H - 20 - 18 } : {});
          } else G.promptBar(gg, r, [['confirm', 'Take'], ['alt', 'Subject'], ['extra', 'Pose & filter'], ['move', 'Pan'], ['hide', 'Hide UI'], ['cancel', 'Exit']], this.frame ? { y: r.H - 20 - 18 } : {});   // (above a postcard frame's caption)
        });
      }
    };
    g.timeScale = 0; G.overlay.push(ov); G.sfx('ui_select'); G.pushInput('MENU');
    return ov;
  },
  add(spec) {
    const st = G.state; const album = st ? st.album : G.unlocks.album;
    if (album.length >= 24) album.shift();
    album.push(spec); if (st) st.stats.photos++;
    G.saveUnlocks(); G.toast('Postcard saved', album.length + '/24 in your album', 'camera');
  },
  autoGroup(S) {
    const st = G.state; if (!st) return;
    const people = Object.values(S.actors).map(a => ({ id: a.id, suit: (G.wearOf(a.id) || {}).suit, acc: (G.wearOf(a.id) || {}).acc || [], pose: 'Cheer', expr: 'smile', x: Math.round(a.x), y: Math.round(a.y), facing: Math.PI / 2 }));
    const spec = { loc: S.loc, day: st.day, slot: 2, tod: 'night', weather: 'clear', cam: { x: S.camAt[0], y: S.camAt[1], z: 10, yaw: 0, zoom: 1, view: 'threequarter' }, people, filter: 'Night Glow', frame: 'Postcard', party: true };
    st.album.push(spec); if (st.album.length > 24) st.album.shift(); st.partyPhoto = spec; G.saveUnlocks();
  },
  /* ---- re-rendering a spec: prepare() in update sets the camera; renderSpec() in draw draws it ---- */
  rigsFor(spec) {
    if (spec._rigs) return spec._rigs;
    Object.defineProperty(spec, '_rigs', { value: spec.people.map(q => G.makeRig(q.id, { suit: q.suit, acc: q.acc, kit: q.kit })), enumerable: false, configurable: true });
    return spec._rigs;
  },
  prepare(spec) { const g = G.game, v = E.VIEWS[spec.cam.view] || E.VIEWS.threequarter; if (g.view !== v) g.setView(v); g.follow(null); g.cam.bounds = null; g.focus(spec.cam.x, spec.cam.y, spec.cam.z); g.setZoom(spec.cam.zoom || 1); },
  renderSpec(r, spec, o = {}) {
    const L = G.LOCS[spec.loc] || G.LOCS.beach, map = spec.loc === 'beach' ? G.courtMap : G.getLocMap(spec.loc), t = G.now();
    if (L.sky) G.drawSky(r, spec.tod, r.w(spec.cam.x, 0, 0)[1]);
    map.drawFloor(r); map.queueWalls(r);
    if (spec.loc === 'beach') { G.drawShore(r, t); G.drawCourtProps(r, { tod: spec.tod }); G.drawNet(r); }
    else G.scenes.location.drawDressing.call({ L, loc: spec.loc, tod: spec.tod }, r);
    const rigs = this.rigsFor(spec);
    spec.people.forEach((q, i) => { const P = poseState(q, q.x, q.y, q.facing, t); G.Anim.idle(rigs[i], 1 / 60, P.s, { clip: P.clip, t }); r.shadow(q.x, q.y, 6, .3); r.actor(q.x, q.y, 0, (g, ox, oy) => rigs[i].draw(g, ox, oy, r.view)); });
    if (spec.tod === 'night') for (const q of spec.people) G.game.lights.add(q.x, q.y, 30, 80, .6, { color: '#ffd8a0' });
    this.filterFx(r, spec.filter);
    if (spec.frame === 'Postcard' && !o.title) r.overlay(g => this.frameFx(g, r, spec.day));
  },
  filterFx(r, f) {
    if (!f || f === 'Clean') return;
    r.overlay(g => {
      const W = r.W, H = r.H;
      if (f === 'Sunny') px.blend(g, .22, 'screen', () => px.rect(g, 0, 0, W, H, '#ffb060'));
      else if (f === 'Sepia') { px.blend(g, .5, 'multiply', () => px.rect(g, 0, 0, W, H, '#c89860')); px.blend(g, .15, 'screen', () => px.rect(g, 0, 0, W, H, '#704020')); }
      else if (f === 'Retro') { for (let y = 0; y < H; y += 2) px.blend(g, .25, 'multiply', () => px.rect(g, 0, y, W, 1, '#202040')); px.blend(g, .15, 'add', () => px.rect(g, 0, 0, W, H, '#ff5fa2')); }
      else if (f === 'Night Glow') { px.blend(g, .4, 'multiply', () => px.rect(g, 0, 0, W, H, '#4050a0')); px.blend(g, .18, 'add', () => px.rect(g, 0, 0, W, H, '#5ff0ff')); }
    });
  },
  frameFx(g, r, day) {
    const W = r.W, H = r.H, b = 8; px.rect(g, 0, 0, W, b, '#f8f4e8'); px.rect(g, 0, H - b - 12, W, b + 12, '#f8f4e8'); px.rect(g, 0, 0, b, H, '#f8f4e8'); px.rect(g, W - b, 0, b, H, '#f8f4e8');
    E.font.text(g, 'Greetings from Isla Fortuna', b + 4, H - b - 9, '#c8302a', { outline: false });
    E.font.text(g, 'Day ' + day + ' of the Invitational', W - b - 4, H - b - 9, '#5a4a3a', { align: 'right', outline: false });
    const sx = W - b - 26, sy = b + 4; px.rect(g, sx, sy, 22, 26, '#ff9e5e'); px.rect(g, sx + 2, sy + 2, 18, 22, '#ffd36a'); px.sprite(g, G.BALL_SPR[0], sx + 8, sy + 9);
  }
};
/* ---- the album: a 4x2 grid of thumbnails, each re-rendered from its spec; open one to see it live ---- */
G.drawThumb = (g, spec, x, y, w, h, on) => {
  const P = G.TOD[spec.tod] || G.TOD.afternoon, fl = spec.loc === 'casino' ? '#5a1a3a' : spec.loc === 'pool' ? '#7ad8e0' : spec.loc === 'promenade' ? '#d8c8a8' : spec.loc === 'villa' ? '#c48a5a' : '#ecd49a';
  for (let yy = 0; yy < h * .45; yy += 2) px.rect(g, x, y + yy, w, 2, E.mix(P.sky[0], P.sky[P.sky.length - 1], yy / (h * .45)));
  px.rect(g, x, y + Math.round(h * .45), w, Math.round(h * .12), P.sea[1]); px.rect(g, x, y + Math.round(h * .57), w, Math.ceil(h * .43), fl);
  const rigs = G.photo.rigsFor(spec), n = spec.people.length;
  spec.people.slice(0, 6).forEach((q, i) => { const r = rigs[i]; const S = poseState(q, 0, 0, Math.PI / 2, G.now()); G.Anim.idle(r, 1 / 60, S.s, { clip: S.clip, t: G.now() }); r.draw(g, Math.round(x + w * (i + 1) / (Math.min(n, 6) + 1)), Math.round(y + h - 4), E.VIEWS.court); });
  E.ui.box(g, x - 2, y - 2, w + 4, h + 4, { bg: 'transparent', border: on ? '#ffd36a' : '#f8f4e8', gradient: false, alpha: 0 });
  px.rect(g, x - 2, y - 2, w + 4, 2, on ? '#ffd36a' : '#f8f4e8'); px.rect(g, x - 2, y + h, w + 4, 2, on ? '#ffd36a' : '#f8f4e8'); px.rect(g, x - 2, y, 2, h, on ? '#ffd36a' : '#f8f4e8'); px.rect(g, x + w, y, 2, h, on ? '#ffd36a' : '#f8f4e8');
};
G.scenes.album = {
  view: 'threequarter', input: G.PRESETS.MENU, camera: false,
  enter(d) { G.useInput('MENU'); this.from = (d && d.from) || 'menu'; this.at = d && d.at; this.page = 0; this.nav = new G.Nav(); this.open = null; G.music('siesta'); },
  album() { return G.state ? G.state.album : G.unlocks.album; },
  items() { const W = G.game.W, H = G.game.H, A = this.album(), cw = Math.round(W * .19), ch = Math.round(cw * .62), x0 = Math.round(W / 2 - (cw * 4 + 18) / 2), y0 = Math.round(H * .2); return A.slice(this.page * 8, this.page * 8 + 8).map((s, i) => ({ id: 'p' + (this.page * 8 + i), k: this.page * 8 + i, x: x0 + (i % 4) * (cw + 6), y: y0 + Math.floor(i / 4) * (ch + 14), w: cw, h: ch, spec: s, onPress: () => { this.open = this.page * 8 + i; } })); },
  leave() { G.sfx('ui_back'); if (this.from === 'menu') G.game.go('menu'); else G.game.go('location', { loc: this.from, at: this.at }); },
  update(dt) {
    const I = G.game.input, A = this.album();
    if (this.open !== null) {
      const s = A[this.open]; if (!s) { this.open = null; return; }
      G.photo.prepare(s);
      if (I.pressed('cancel') || I.pressed('confirm')) { this.open = null; G.game.setView(E.VIEWS.threequarter); G.game.setZoom(1); G.sfx('ui_back'); }
      else if (I.pressed('alt')) G.confirm('Delete this postcard?', () => { A.splice(this.open, 1); this.open = null; G.saveUnlocks(); }, { destructive: true });
      else if (I.pressed('extra')) { G.unlocks.titlePostcard = s; if (G.state) G.state.titlePostcard = s; G.saveUnlocks(); G.toast('Title backdrop set', 'It shows behind the logo', 'camera'); }
      else if (I.pressed('tabR') && !G.hub) this.exportPNG();
      return;
    }
    const ev = this.nav.update(this.items(), I, { wheelTabs: true }), pages = Math.max(1, Math.ceil(A.length / 8));
    if (ev.tab) { this.page = (this.page + ev.tab + pages) % pages; G.sfx('ui_tab'); }
    if (ev.back) this.leave();
  },
  exportPNG() {
    try { const c = G.game.screen.canvas || document.getElementById('screen'), url = c.toDataURL('image/png'), a = document.createElement('a'); a.href = url; a.download = 'isla-fortuna-postcard.png'; document.body.appendChild(a); a.click(); a.remove(); G.toast('Saved as a PNG', 'isla-fortuna-postcard.png', 'camera'); } catch (e) { G.toast('Could not save the PNG', String(e.message || e)); }
  },
  draw(r) {
    const A = this.album();
    if (this.open !== null && A[this.open]) { G.photo.renderSpec(r, A[this.open]); r.overlay(g => G.promptBar(g, r, [['cancel', 'Back'], ['alt', 'Delete'], ['extra', 'Title backdrop'], !G.hub && ['tabR', 'Save PNG']])); return; }
    r.overlay(g => {
      const W = r.W, H = r.H; for (let y = 0; y < H; y += 2) px.rect(g, 0, y, W, 2, E.mix('#c8a050', '#5a3a1a', y / H));
      G.ui.title(g, 'ALBUM', W / 2, Math.round(H * .04), { scale: 2 });
      const its = this.items();
      if (!its.length) E.font.text(g, 'No postcards yet. Take one from the pause menu, or press ' + G.btnName('snap') + ' in a place.', W / 2, H / 2, '#fff8e8', { align: 'center', outline: false, wrap: W * .7 });
      for (const it of its) { G.drawThumb(g, it.spec, it.x, it.y, it.w, it.h, this.nav.focus === it.id); E.font.text(g, G.placeName[it.spec.loc] + ' · Day ' + it.spec.day, it.x + it.w / 2, it.y + it.h + 3, '#fff8e8', { align: 'center', outline: false, font: 'tiny' }); }
      E.font.text(g, A.length + '/24 postcards', W / 2, Math.round(H * .86), '#fff3c0', { align: 'center', shadow: '#000', outline: false });
      G.promptBar(g, r, [['confirm', 'Open'], ['tabL', 'Page'], ['cancel', 'Back']]);
    });
  }
};
