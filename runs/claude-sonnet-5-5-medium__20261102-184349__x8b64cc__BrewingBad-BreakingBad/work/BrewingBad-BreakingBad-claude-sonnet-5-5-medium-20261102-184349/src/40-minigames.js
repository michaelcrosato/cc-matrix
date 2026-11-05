/* ---- THE COOK: three steady-hand stages (heat, mix, crystallize) with purity as the score. And the laundry: five beats of timing. ---- */
const hx = E.hex;
const blue = (a, b, t) => '#' + [0, 1, 2].map(i => Math.round(lerp(a[i], b[i], t)).toString(16).padStart(2, '0')).join('');
let cook = null;
const DIRS = ['left', 'down', 'up', 'right'], ARROW = { left: '←', down: '↓', up: '↑', right: '→' };
function newCook(level, auto) {
  const L2 = level === 2;
  return { level, auto, phase: 0, t: 0, scores: [0, 0, 0], band: L2 ? .12 : .17, burner: .2, temp: .2, tgt: .55, drift: 0, inT: 0, tT: 0,
    notes: Array.from({ length: L2 ? 14 : 10 }, (_, i) => ({ lane: Math.floor(Math.random() * 4), at: 1.6 + i * (L2 ? .62 : .8), res: null })), mixT: 0, hits: 0,
    ret: { x: 0, y: 0 }, tg: { x: 0, y: 0, a: 0 }, cT: 0, cIn: 0, done: false, bubbles: [], steam: 0, result: null, fx: [], shake: 0 };
}
function pointerIn(I, rx, ry, rw, rh) { const c = I.clicked(); return c && c[0] >= rx && c[0] < rx + rw && c[1] >= ry && c[1] < ry + rh; }
const scenes = {};
scenes.cook = {
  pausable: true, view: 'side', res: 'ps1', input: KEYMAP,
  enter(d = {}) {
    cook = newCook(d.level || 1, !!d.demo); cook.demo = !!d.demo; L.enabled = false; game.follow(null); game.focus(0, 0, 0); A.music('cook'); game.cam.bounds = null;
  },
  update(dt) {
    const I = game.input, c = cook; c.t += dt; c.steam += dt;
    if (Math.random() < dt * 14) c.bubbles.push({ x: Math.random(), y: 0, v: .3 + Math.random() * .4, t: 0 });
    for (const b of c.bubbles) { b.y += b.v * dt; b.t += dt; } E.prune(c.bubbles, b => b.y >= 1);
    for (const f of c.fx) f.t += dt; E.prune(c.fx, f => f.t >= .8);
    if (c.demo && (I.anyPressed() || (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .5))) { game.go('title'); return; }
    if (c.phase === 0) { if (c.t > 2.6 || (!c.demo && (I.pressed('confirm') || I.clicked()) && c.t > .5)) { c.phase = 1; c.t = 0; c.tT = 0; A.sfx('powerup'); } return; }
    if (c.phase === 1) {                                    // HEAT: keep the needle in the green band
      const T0 = 10, mv = I.move();
      c.drift = Math.sin(c.t * 1.3) * .22 + Math.sin(c.t * 3.1 + 1) * .1;
      c.tgt = .55 + c.drift * .6;
      if (c.auto) c.burner += ((clamp(.55 - c.drift * .35, 0, 1) - c.burner) * 6) * dt;
      else if (I.lastDevice === 'mouse' && I.pointer()) c.burner = clamp(1 - (I.pointer()[1] - game.H * .18) / (game.H * .6), 0, 1);
      else c.burner = clamp(c.burner - mv[1] * dt * .65, 0, 1);
      c.temp += (c.burner + c.drift * .35 - c.temp) * dt * 1.6;
      c.temp = clamp(c.temp, 0, 1);
      const ok = Math.abs(c.temp - .55) < c.band;
      c.inT += ok ? dt : 0; c.tT += dt; c.hot = ok;
      if (Math.random() < dt * (ok ? 4 : 14)) c.fx.push({ k: ok ? 'ok' : 'bad', x: Math.random(), t: 0 });
      if (c.t >= T0) { c.scores[0] = c.inT / c.tT; c.phase = 2; c.t = 0; A.sfx('powerup'); c.mixT = 0; }
      return;
    }
    if (c.phase === 2) {                                    // MIX: tap the lane as the note crosses the line
      const lane = DIRS.findIndex(a => I.pressed(a));
      const cl = I.clicked(), LW = 54, lx0 = game.W / 2 - LW * 2;
      let pick = lane;
      if (cl && cl[1] > game.H * .72) { const k = Math.floor((cl[0] - lx0) / LW); if (k >= 0 && k < 4) pick = k; }
      for (const n of c.notes) {
        if (n.res) continue;
        if (c.auto && Math.abs(c.t - n.at) < .03) { n.res = 'great'; c.hits += 1; c.fx.push({ k: 'hit', x: n.lane, t: 0 }); A.sfx('hit', { vol: .4 }); continue; }
        if (c.t > n.at + .22) { n.res = 'miss'; A.sfx('cancel', { vol: .3 }); }
      }
      if (pick >= 0 && !c.auto) {
        const n = c.notes.filter(n => !n.res && n.lane === pick).sort((a, b) => a.at - b.at)[0];
        if (n && Math.abs(c.t - n.at) < .2) { const e = Math.abs(c.t - n.at); n.res = e < .07 ? 'great' : 'ok'; c.hits += e < .07 ? 1 : .6; c.fx.push({ k: 'hit', x: n.lane, t: 0 }); A.sfx('coin', { vol: .45, pitch: 1 + pick * .12 }); }
        else { c.shake = .2; A.sfx('cancel', { vol: .3 }); }
      }
      c.shake = Math.max(0, c.shake - dt);
      if (c.t > c.notes[c.notes.length - 1].at + .5) { c.scores[1] = clamp(c.hits / c.notes.length, 0, 1); c.phase = 3; c.t = 0; c.cT = 0; c.cIn = 0; c.ret = { x: 0, y: 0 }; A.sfx('powerup'); }
      return;
    }
    if (c.phase === 3) {                                    // CRYSTALLIZE: keep the reticle on the seed
      const T3 = 9, R = Math.min(game.W, game.H) * .26;
      c.tg.a += dt * (c.level === 2 ? 1.5 : 1.0);
      c.tg.x = Math.cos(c.tg.a * 1.1) * R * .8 + Math.sin(c.tg.a * 2.3) * R * .15; c.tg.y = Math.sin(c.tg.a * 1.7) * R * .6 + Math.cos(c.tg.a * 0.9) * R * .2;
      if (c.auto) { c.ret.x += (c.tg.x - c.ret.x) * Math.min(1, dt * 6); c.ret.y += (c.tg.y - c.ret.y) * Math.min(1, dt * 6); }
      else if (I.lastDevice === 'mouse' && I.pointer()) { const p = I.pointer(); c.ret.x = clamp(p[0] - game.W / 2, -R * 1.1, R * 1.1); c.ret.y = clamp(p[1] - game.H * .5, -R * .9, R * .9); }
      else { const mv = I.move(); c.ret.x = clamp(c.ret.x + mv[0] * dt * 150, -R * 1.1, R * 1.1); c.ret.y = clamp(c.ret.y + mv[1] * dt * 130, -R * .9, R * .9); }
      const d = Math.hypot(c.ret.x - c.tg.x, c.ret.y - c.tg.y), rr = c.level === 2 ? 17 : 22;
      c.cT += dt; if (d < rr) c.cIn += dt; c.close = d < rr;
      if (c.close && Math.random() < dt * 10) c.fx.push({ k: 'seed', x: c.ret.x, y: c.ret.y, t: 0 });
      if (c.cT >= T3) {
        c.scores[2] = c.cIn / c.cT;
        const avg = c.scores[0] * .35 + c.scores[1] * .35 + c.scores[2] * .3, purity = Math.round((62 + 37.9 * Math.pow(avg, 1.15)) * 10) / 10;
        const bags = Math.max(1, Math.round((c.level === 2 ? 3 : 2) + purity / 30));
        c.result = { purity: Math.round(purity), exact: purity, bags }; c.phase = 4; c.t = 0; A.music(null); A.sfx(purity > 90 ? 'oneup' : 'powerup');
      }
      return;
    }
    if (c.phase === 4) {
      if (c.t > .8 && (c.demo ? c.t > 4.5 : I.pressed('confirm') || I.clicked())) {
        const res = c.result;
        if (c.demo) game.go('play', { demo: true, after: 'democook' });
        else game.go('play', { after: 'cook', res });
      }
    }
  },
  draw(r) {
    const c = cook, W = r.W, H = r.H;
    r.sky(['#0a1a1e', '#12323a', '#0a1a1e']);
    r.overlay(g => {
      const sh = c.shake > 0 ? Math.round((Math.random() - .5) * 4) : 0;
      // the lab: tiled wall, a bench, a hanging lamp
      px.rect(g, 0, 0, W, H, '#0d2228');
      for (let y = 0; y < H * .62; y += 14) for (let x = (y / 14 % 2) * 14; x < W; x += 28) px.rect(g, x + 1, y + 1, 26, 12, (x + y) % 3 ? '#143a42' : '#12343c');
      px.rect(g, 0, H * .62 | 0, W, H, '#2a1c14'); px.rect(g, 0, H * .62 | 0, W, 5, '#6a4a2e'); px.rect(g, 0, H * .62 + 5 | 0, W, 3, '#3a2818');
      for (let i = 0; i < 6; i++) px.rect(g, 6 + i * (W / 6 | 0), 12, 36, 4, '#5a6a6a');
      // flask on the burner
      const fx = W / 2 + sh, fy = H * .56 | 0, lvl = c.phase >= 2 ? .75 : .5 + c.temp * .2;
      const liquid = blue([40, 120, 60], [40, 190, 255], c.phase >= 3 ? 1 : c.phase === 2 ? .6 : c.temp);
      px.poly(g, [[fx - 8, fy - 46], [fx + 8, fy - 46], [fx + 6, fy - 34], [fx + 26, fy], [fx - 26, fy], [fx - 6, fy - 34]], '#1b4a50');
      px.poly(g, [[fx - 22, fy - 4], [fx + 22, fy - 4], [fx + 14, fy - 20 - lvl * 10], [fx - 14, fy - 20 - lvl * 10]], liquid);
      for (const b of c.bubbles) px.disc(g, fx - 16 + b.x * 32, fy - 4 - b.y * 38, 1 + (b.t * 5 | 0) % 2, '#d8ffff');
      px.rect(g, fx - 28, fy, 56, 4, '#5a5a62'); px.rect(g, fx - 20, fy + 4, 40, 6, '#3a3a42');
      const fl = c.phase === 1 ? c.burner : .3;
      for (let i = 0; i < 5; i++) px.rect(g, fx - 16 + i * 8, fy + 10 - Math.round(fl * 8 + Math.sin(c.steam * 12 + i) * 2), 4, Math.round(fl * 8 + 3), i % 2 ? '#ff9a3a' : '#ffd24a');
      // faces
      hero.rig.drawPortrait(g, 8, H - 58, 50, { zoom: 3, turn: .5 }); E.font.text(g, S.persona ? 'VITRIOL' : 'WENDELL', 34, H - 8, '#e8f1dc', { align: 'center', outline: false, shadow: '#000' });
      portrait.pinky.drawPortrait(g, W - 58, H - 58, 50, { zoom: 3, turn: -.5 }); E.font.text(g, 'PINKY', W - 33, H - 8, '#e8f1dc', { align: 'center', outline: false, shadow: '#000' });
      // title
      const names = ['PREPARE', 'HEAT', 'MIX', 'CRYSTALLIZE', 'RESULT'];
      E.font.text(g, (c.level === 2 ? 'THE PURE BATCH' : 'THE FIRST COOK') + (c.phase >= 1 && c.phase <= 3 ? '  •  STAGE ' + c.phase + ' / 3  •  ' + names[c.phase] : ''), W / 2, 10, '#ffe7a8', { align: 'center', shadow: '#000', outline: false });
      const hint = (txt) => E.font.text(g, txt, W / 2, H - 20, '#b8d8c0', { align: 'center', shadow: '#000', outline: false });
      if (c.phase === 0) {
        E.ui.box(g, W / 2 - 150, H * .12 | 0, 300, 74, { bg: '#10241c', border: '#b8d89a' });
        E.font.text(g, 'Three stages. Steady hands.', W / 2, H * .12 + 8 | 0, '#9ae05a', { align: 'center', outline: false });
        E.font.text(g, '1  HEAT    keep the needle in the green', W / 2 - 130, H * .12 + 24 | 0, '#e8f1dc', { outline: false });
        E.font.text(g, '2  MIX     tap the lanes on the line', W / 2 - 130, H * .12 + 38 | 0, '#e8f1dc', { outline: false });
        E.font.text(g, '3  CRYSTAL keep the reticle on the seed', W / 2 - 130, H * .12 + 52 | 0, '#e8f1dc', { outline: false });
        hint(c.demo ? 'ATTRACT MODE • PRESS ANY BUTTON' : 'Press ' + lab('confirm') + ' to start');
      }
      if (c.phase === 1) {
        const gx = W / 2 - 110, gy = H * .18 | 0, gh = H * .6 | 0;
        E.ui.box(g, gx - 14, gy - 8, 28, gh + 16, { bg: '#0a1612', border: '#4a6a5a' });
        const yy = v => gy + Math.round((1 - v) * gh);
        px.rect(g, gx - 8, yy(.55 + c.band), 16, Math.round(c.band * 2 * gh), '#2f8a3a');
        px.rect(g, gx - 8, yy(c.temp) - 2, 16, 4, c.hot ? '#d8ffa0' : '#ff6a4a');
        px.rect(g, gx + 10, yy(c.burner) - 1, 5, 3, '#ffd24a');
        E.font.text(g, 'FLAME', gx, gy - 18, '#ffd24a', { align: 'center', outline: false, shadow: '#000' });
        E.ui.bar(g, W / 2 - 60, H * .8 | 0, 120, 6, c.t / 10, '#ffd24a');
        hint(c.demo ? 'ATTRACT MODE • PRESS ANY BUTTON' : (I_dev() === 'mouse' ? 'Move the mouse up and down' : 'Hold ' + lab('up') + ' / ' + lab('down') + ' to raise or lower the flame'));
      }
      if (c.phase === 2) {
        const LW = 54, x0 = W / 2 - LW * 2 | 0, top = H * .2 | 0, line = H * .72 | 0;
        for (let k = 0; k < 4; k++) {
          px.rect(g, x0 + k * LW + 2, top, LW - 4, line - top + 30, '#0d1a18'); px.rect(g, x0 + k * LW + 2, line, LW - 4, 26, '#143a30');
          E.font.text(g, ARROW[DIRS[k]], x0 + k * LW + LW / 2, line + 8, '#e8f1dc', { align: 'center', outline: false, scale: 2 });
          E.font.text(g, lab(DIRS[k]), x0 + k * LW + LW / 2, line + 27, '#6a8a7a', { align: 'center', outline: false });
        }
        px.rect(g, x0, line, LW * 4, 2, '#ffd24a');
        for (const n of c.notes) {
          const y = line - (n.at - c.t) * 120;
          if (y < top - 10 || y > line + 40 || n.res === 'great' || n.res === 'ok') continue;
          const col = n.res === 'great' ? '#9aff9a' : n.res === 'ok' ? '#d8e870' : n.res === 'miss' ? '#7a3a3a' : ['#5ab0ff', '#ff6a8a', '#ffd24a', '#9a7aff'][n.lane];
          px.rect(g, x0 + n.lane * LW + 8, y - 6, LW - 16, 12, col);
        }
        hint(c.demo ? 'ATTRACT MODE • PRESS ANY BUTTON' : 'Tap the lane as a note crosses the line • click works too');
      }
      if (c.phase === 3) {
        const cx = W / 2, cy = H * .5, R = Math.min(W, H) * .26;
        px.ell && px.ell(g, cx, cy, R * 1.3, R * 1.05, '#0d1f24');
        for (let a = 0; a < 40; a++) { const t = a / 40 * TAU; px.dot(g, Math.round(cx + Math.cos(t) * R * 1.3), Math.round(cy + Math.sin(t) * R * 1.05), '#3a6a6a'); }
        const rr = c.level === 2 ? 17 : 22;
        px.disc(g, Math.round(cx + c.tg.x), Math.round(cy + c.tg.y), rr, c.close ? '#2f8aa0' : '#1c4a5a');
        px.disc(g, Math.round(cx + c.tg.x), Math.round(cy + c.tg.y), 5, '#d8ffff');
        for (const f of c.fx) if (f.k === 'seed') px.dot(g, Math.round(cx + f.x + Math.sin(f.t * 9) * 4), Math.round(cy + f.y - f.t * 24), '#bff4ff');
        const rx = Math.round(cx + c.ret.x), ry = Math.round(cy + c.ret.y);
        px.line(g, rx - 9, ry, rx + 9, ry, c.close ? '#9aff9a' : '#ffd24a'); px.line(g, rx, ry - 9, rx, ry + 9, c.close ? '#9aff9a' : '#ffd24a');
        E.ui.bar(g, W / 2 - 60, H * .82 | 0, 120, 6, c.cT / 9, '#8fe0ff');
        hint(c.demo ? 'ATTRACT MODE • PRESS ANY BUTTON' : (I_dev() === 'mouse' ? 'Keep the cross on the seed with the mouse' : 'Steer the cross with ' + (pad() ? 'the left stick' : 'WASD') + ' onto the seed'));
      }
      if (c.phase === 4) {
        const res = c.result;
        E.ui.box(g, W / 2 - 130, H * .14 | 0, 260, 118, { bg: '#0f2820', border: '#9ae05a' });
        E.font.title(g, res.purity + '.' + Math.round((res.exact % 1) * 10) + '%', W / 2, H * .14 + 12 | 0, { align: 'center', scale: 3, colors: ['#e8ffff', '#7ad8ff', '#2a8ae0'], depth: 2 });
        E.font.text(g, res.purity >= 97 ? 'ARTISANAL' : res.purity >= 90 ? 'EXCELLENT' : res.purity >= 80 ? 'RESPECTABLE' : 'A LEARNING EXPERIENCE', W / 2, H * .14 + 50 | 0, '#ffe7a8', { align: 'center', outline: false });
        E.font.text(g, 'HEAT ' + Math.round(c.scores[0] * 100) + '%   MIX ' + Math.round(c.scores[1] * 100) + '%   CRYSTAL ' + Math.round(c.scores[2] * 100) + '%', W / 2, H * .14 + 66 | 0, '#b8d8c0', { align: 'center', outline: false });
        E.font.text(g, res.bags + ' BAGS OF BLUE', W / 2, H * .14 + 84 | 0, '#9ae05a', { align: 'center', outline: false });
        if (!c.demo) E.font.text(g, 'Press ' + lab('confirm'), W / 2, H * .14 + 100 | 0, '#ffffff', { align: 'center', outline: false });
      }
    });
  }
};
function I_dev() { return game.input.lastDevice; }

/* ---- the laundry: five beats. The marker swings; press on the green ---- */
let laun = null;
scenes.launder = {
  pausable: true, view: 'side', res: 'ps1', input: KEYMAP,
  enter(d = {}) { laun = { t: 0, round: 0, pos: 0, dir: 1, speed: 1.1, zone: .5, w: .2, hits: 0, results: [], stage: 'intro', wait: 0, demo: !!d.demo, flash: 0 }; L.enabled = false; game.follow(null); game.focus(0, 0, 0); A.music('desk'); },
  update(dt) {
    const I = game.input, l = laun; l.t += dt; l.flash = Math.max(0, l.flash - dt);
    if (l.demo && (I.anyPressed() || (I.padMove && Math.hypot(I.padMove[0], I.padMove[1]) > .5))) { game.go('title'); return; }
    if (l.stage === 'intro') { if (l.t > 2.2 || (!l.demo && (I.pressed('confirm') || I.clicked()) && l.t > .4)) { l.stage = 'play'; l.zone = .25 + Math.random() * .5; l.pos = 0; l.dir = 1; } return; }
    if (l.stage === 'play') {
      l.pos += l.dir * dt * l.speed * (1 + l.round * .25);
      if (l.pos > 1) { l.pos = 1; l.dir = -1; } else if (l.pos < 0) { l.pos = 0; l.dir = 1; }
      const press = l.demo ? Math.abs(l.pos - l.zone) < .02 : (I.pressed('confirm') || I.pressed('interact') || I.pressed('attack') || I.clicked());
      if (press) {
        const e = Math.abs(l.pos - l.zone), sc = e < l.w / 2 ? 1 - e / l.w * .6 : e < l.w ? .35 : 0;
        l.results.push(sc); l.hits += sc; l.flash = .35; A.sfx(sc > .6 ? 'coin' : sc > 0 ? 'pickup' : 'cancel'); l.round++; l.stage = 'wait'; l.wait = .7;
      }
      return;
    }
    if (l.stage === 'wait') { l.wait -= dt; if (l.wait <= 0) { if (l.round >= 5) { l.stage = 'done'; l.t = 0; A.sfx('oneup'); } else { l.stage = 'play'; l.zone = .2 + Math.random() * .6; l.w = Math.max(.12, .2 - l.round * .015); } } return; }
    if (l.stage === 'done') { if (l.t > .6 && (l.demo ? l.t > 3.4 : I.pressed('confirm') || I.clicked())) { const res = { score: l.hits / 5 }; if (l.demo) game.go('play', { demo: true, after: 'demowash' }); else game.go('play', { after: 'launder', res }); } }
  },
  draw(r) {
    const l = laun, W = r.W, H = r.H;
    r.sky(['#142026', '#1d3a3e']);
    r.overlay(g => {
      px.rect(g, 0, 0, W, H, '#16292e'); for (let x = 0; x < W; x += 24) px.rect(g, x, 0, 1, H, '#1c3438');
      px.rect(g, 0, H * .66 | 0, W, H, '#5a4430'); px.rect(g, 0, H * .66 | 0, W, 4, '#8a6a44');
      // a counter stacked with bills
      for (let i = 0; i < 6; i++) { const x = 24 + i * 30, h = 6 + (i * 5 % 18); for (let k = 0; k < h; k += 3) px.rect(g, x, H * .66 - k - 4 | 0, 22, 3, k % 6 ? '#3a9a4a' : '#6ac87a'); }
      E.font.text(g, 'SUDS & DUDS  •  THE BOOKS', W / 2, 10, '#ffe7a8', { align: 'center', outline: false, shadow: '#000' });
      portrait.marnie.drawPortrait(g, W - 62, H - 62, 54, { zoom: 3, turn: -.5 }); hero.rig.drawPortrait(g, 8, H - 62, 54, { zoom: 3, turn: .5 });
      const bx = W / 2 - 120, by = H * .36 | 0;
      E.ui.box(g, bx - 8, by - 10, 256, 50, { bg: '#0f2018', border: '#b8d89a' });
      px.rect(g, bx, by + 6, 240, 14, '#223a30');
      if (l.stage === 'play' || l.stage === 'wait') px.rect(g, bx + Math.round((l.zone - l.w / 2) * 240), by + 6, Math.round(l.w * 240), 14, '#3fae52');
      px.rect(g, bx + Math.round(l.pos * 240) - 1, by + 2, 3, 22, l.flash > 0 ? '#ffffff' : '#ffd24a');
      for (let i = 0; i < 5; i++) { const s = l.results[i]; px.rect(g, W / 2 - 40 + i * 18, by + 32 | 0, 14, 6, s === undefined ? '#2a3a34' : s > .6 ? '#5adc7a' : s > 0 ? '#d8c04a' : '#c8442a'); }
      if (l.stage === 'intro') { E.ui.box(g, W / 2 - 150, H * .12 | 0, 300, 44, { bg: '#10241c', border: '#b8d89a' }); E.font.text(g, 'Five stacks. Press ' + lab('confirm') + ' when the marker', W / 2, H * .12 + 8 | 0, '#e8f1dc', { align: 'center', outline: false }); E.font.text(g, 'is on the green. Miss and the soap takes a bigger cut.', W / 2, H * .12 + 22 | 0, '#e8f1dc', { align: 'center', outline: false }); }
      if (l.stage === 'done') { const pct = Math.round(l.hits / 5 * 100); E.ui.box(g, W / 2 - 110, H * .14 | 0, 220, 62, { bg: '#0f2820', border: '#9ae05a' }); E.font.text(g, 'BOOKS BALANCED: ' + pct + '%', W / 2, H * .14 + 10 | 0, '#9ae05a', { align: 'center', outline: false }); E.font.text(g, 'The soap takes ' + Math.round((.12 + (1 - l.hits / 5) * .25) * 100) + '% for its trouble.', W / 2, H * .14 + 28 | 0, '#e8f1dc', { align: 'center', outline: false }); if (!l.demo) E.font.text(g, 'Press ' + lab('confirm'), W / 2, H * .14 + 44 | 0, '#fff', { align: 'center', outline: false }); }
      if (l.demo) E.font.text(g, 'ATTRACT MODE • PRESS ANY BUTTON', W / 2, H - 20, '#b8d8c0', { align: 'center', outline: false, shadow: '#000' });
    });
  }
};
