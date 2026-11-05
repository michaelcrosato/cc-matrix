// MASH TV: boss painters (read only boss fields).
MT.paint.boss = function (r, b, w) {
  if (b.hidden && !(b.kind === 'lance' && b.stage !== 'starmaker')) return;
  const t = w.time;
  if (b.kind === 'mashy') paintMashy(r, b, w, t); else if (b.kind === 'wheel') paintWheel(r, b, w, t); else paintLance(r, b, w, t);
};
const U = (r, x, y, z) => { const [a] = r.w(x, y, z), [c] = r.w(x + 10, y, z); return (c - a) / 10; };
function partFlash(b, id) { const p = b.part(id); return p && p.flash > 0; }
function paintMashy(r, b, w, t) {
  r.shadow(b.x, b.y, 28, .5);
  if (b.sub === 'tele') r.decal(() => { const [ax, ay] = r.w(b.x, b.y, 1), [bx, by] = r.w(b.x + Math.cos(b.ca) * 220, b.y + Math.sin(b.ca) * 220, 1); px.line(r.tgt, ax, ay, bx, by, '#ff3344', 2); r.groundRing(b.x, b.y, 30 + Math.sin(t * 30) * 2, '#ff5a5a', .8); });
  r.queue(b.x, b.y + 6, 0, g => {
    const [cx, cy] = r.w(b.x, b.y, 0), u = U(r, b.x, b.y, 0), fl = b.flash > 0, mad = b.phase === 3;
    // treads
    for (const sd of [-1, 1]) { const x0 = cx + sd * 22 * u - 8 * u, y0 = cy - 6 * u; px.rect(g, Math.round(x0), Math.round(y0), Math.round(16 * u), Math.round(10 * u), '#14081c'); px.rect(g, Math.round(x0 + 1), Math.round(y0 + 1), Math.round(16 * u - 2), Math.round(10 * u - 2), '#3a3a4a'); for (let i = 0; i < 4; i++) { const yy = y0 + ((i * 3 + (b.treadT || 0) * 2) % (10 * u)); px.rect(g, Math.round(x0 + 1), Math.round(yy), Math.round(16 * u - 2), 1, '#1c1c28'); } }
    // body potato
    const by = cy - 26 * u; px.ell(g, cx, by, 27 * u, 25 * u, '#14081c'); px.ell(g, cx, by, 26 * u, 24 * u, fl ? '#fff' : (mad ? '#d89060' : '#d8b878')); px.ell(g, cx - 6 * u, by - 7 * u, 13 * u, 10 * u, fl ? '#fff' : (mad ? '#e8a878' : '#ecd49a'));
    for (const [dx, dy] of [[-12, 6], [14, -4], [6, 12], [-4, -12]]) px.dot(g, cx + dx * u, by + dy * u, '#a08848');
    // tux + bow tie
    px.poly(g, [[cx - 14 * u, by + 14 * u], [cx + 14 * u, by + 14 * u], [cx + 10 * u, by + 24 * u], [cx - 10 * u, by + 24 * u]], '#14081c'); px.poly(g, [[cx - 5 * u, by + 14 * u], [cx + 5 * u, by + 14 * u], [cx, by + 24 * u]], '#fff');
    px.poly(g, [[cx, by + 12 * u], [cx - 7 * u, by + 8 * u], [cx - 7 * u, by + 16 * u]], '#ff2e88'); px.poly(g, [[cx, by + 12 * u], [cx + 7 * u, by + 8 * u], [cx + 7 * u, by + 16 * u]], '#ff2e88'); px.disc(g, cx, by + 12 * u, 2 * u, '#c01860');
    // eyes
    const j = Math.sin(b.eyeJ * 9) * 1.2 * u; for (const sd of [-1, 1]) { px.disc(g, cx + sd * 8 * u, by - 6 * u, 6 * u, '#14081c'); px.disc(g, cx + sd * 8 * u, by - 6 * u, 5 * u, '#fff'); px.disc(g, cx + sd * 8 * u + j, by - 5 * u + Math.abs(j), 2.4 * u, mad ? '#ff3344' : '#14081c'); }
    // mouth / hatch
    const hp = b.part('hatch'), open = b.open; px.ell(g, cx, by + 6 * u, 10 * u, open ? 6 * u : 2.4 * u, '#14081c'); if (open) px.ell(g, cx, by + 6 * u, 8 * u, 4.6 * u, hp.flash > 0 ? '#fff' : '#ff6a3a'); else px.rect(g, Math.round(cx - 8 * u), Math.round(by + 6 * u), Math.round(16 * u), 1, '#fff');
    // arms
    const near = b.aimA !== undefined ? b.aimA : Math.PI / 2;
    if (b.partAlive('armL')) { const ax = cx - 30 * u, ay = by + 6 * u; px.disc(g, ax, ay, 8 * u, '#14081c'); px.disc(g, ax, ay, 7 * u, partFlash(b, 'armL') ? '#fff' : '#9aa0b0'); px.rect(g, Math.round(ax - 3 * u), Math.round(ay), Math.round(6 * u), Math.round(12 * u), '#14081c'); px.rect(g, Math.round(ax - 2 * u), Math.round(ay), Math.round(4 * u), Math.round(11 * u), '#ffe27a'); px.dot(g, ax, ay + 12 * u, '#fff'); }
    else { px.disc(g, cx - 30 * u, by + 6 * u, 4 * u, '#444'); }
    if (b.partAlive('armR')) { const ax = cx + 30 * u, ay = by + 6 * u; px.disc(g, ax, ay, 8 * u, '#14081c'); px.disc(g, ax, ay, 7 * u, partFlash(b, 'armR') ? '#fff' : '#9aa0b0'); for (let i = -1; i <= 1; i++) { px.rect(g, Math.round(ax + i * 3.5 * u - 1), Math.round(ay), 3, Math.round(12 * u), '#14081c'); px.rect(g, Math.round(ax + i * 3.5 * u), Math.round(ay), 1, Math.round(11 * u), '#b86a30'); } }
    else { px.disc(g, cx + 30 * u, by + 6 * u, 4 * u, '#444'); }
    if (b.sub === 'stream') px.blend(g, .5, 'add', () => px.disc(g, cx + 30 * u, by + 18 * u, 4 * u, '#ffaa50'));
  }, { solid: true });
}
function paintWheel(r, b, w, t) {
  r.shadow(b.x, b.y, 30, .4);
  r.queue(b.x, b.y + 8, 0, g => {
    const rolling = b.phase === 2, zc = 44, [cx, cy] = r.w(b.x, b.y, zc), u = U(r, b.x, b.y, zc), R = 44 * u, fl = b.flash > 0;
    if (!rolling) { px.rect(g, Math.round(cx - 6 * u), Math.round(cy), Math.round(12 * u), Math.round(40 * u), '#14081c'); px.rect(g, Math.round(cx - 4 * u), Math.round(cy), Math.round(8 * u), Math.round(40 * u), '#5a5a70'); }
    px.disc(g, cx, cy, R + 3 * u, '#14081c'); px.disc(g, cx, cy, R + 1.5 * u, '#ffcc33');
    const COL = ['#d02838', '#2858d0', '#e8d030', '#101018', '#ff2e88', '#30a860', '#ffcc33', '#8a40d0'], NAMES = ['TOMATO', 'LASER', 'MIME', 'BANKRUPT', 'DISCO', 'GOONS', 'JACKPOT', 'SPIN'];
    for (let i = 0; i < 8; i++) {
      const a0 = b.rot + i * Math.PI / 4, a1 = a0 + Math.PI / 4, pts = [[cx, cy]]; for (let k = 0; k <= 6; k++) { const a = a0 + (a1 - a0) * k / 6; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); }
      px.poly(g, pts, b.void[i] ? '#050508' : COL[i]); const am = a0 + Math.PI / 8; px.line(g, cx, cy, cx + Math.cos(a0) * R, cy + Math.sin(a0) * R, '#14081c', 1);
      if (R > 12) E.font.text(g, b.void[i] ? 'VOID' : NAMES[i], Math.round(cx + Math.cos(am) * R * .66), Math.round(cy + Math.sin(am) * R * .66 - 2), '#fff', { align: 'center', font: 'tiny', outline: false, shadow: '#000' });
      if (!b.void[i]) { const bx = cx + Math.cos(am) * R * .88, by = cy + Math.sin(am) * R * .88, lit = Math.floor(t * 6 + i) % 2; px.disc(g, bx, by, 3 * u, '#14081c'); px.disc(g, bx, by, 2.4 * u, partFlash(b, 'b' + i) ? '#fff' : lit ? '#fff7a0' : '#ffb030'); }
    }
    for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2 + b.rot * .3; if (Math.floor(t * 8 + i) % 2) px.dot(g, cx + Math.cos(a) * (R + 1.5 * u), cy + Math.sin(a) * (R + 1.5 * u), '#fff'); }
    px.disc(g, cx, cy, 15 * u, '#14081c'); px.disc(g, cx, cy, 13.5 * u, fl || partFlash(b, 'core') ? '#fff' : b.jackpotOn ? '#ffe068' : '#c8d0e0'); E.font.text(g, '$', Math.round(cx), Math.round(cy - 3), '#14081c', { align: 'center', outline: false });
    const kick = b.click > 0 ? 2 : 0; px.poly(g, [[cx - 5 * u, cy - R - 7 * u - kick], [cx + 5 * u, cy - R - 7 * u - kick], [cx, cy - R + 3 * u]], '#14081c'); px.poly(g, [[cx - 3.5 * u, cy - R - 6 * u - kick], [cx + 3.5 * u, cy - R - 6 * u - kick], [cx, cy - R + 1 * u]], '#ff3344');
  }, { solid: true });
  if (b.beams) for (const bm of b.beams) { const a = bm.ang !== undefined ? bm.ang : bm.a, live = bm.t > .8; r.decal(() => { const [ax, ay] = r.w(b.x, b.y, 1), [bx, by] = r.w(b.x + Math.cos(a) * 400, b.y + Math.sin(a) * 400, 1); px.line(r.tgt, ax, ay, bx, by, live ? '#ff3a6a' : '#ff9ab0', live ? 3 : 1); }); }
}
function paintLance(r, b, w, t) {
  if (b.stage === 'starmaker' || b.stage === 'transition' && b.sub !== 'crash') {
    if (b.hidden) return;
    r.shadow(b.x, b.y, 24, .35 + Math.sin(b.bob * 2) * .05);
    const z = 26 + Math.sin(b.bob * 2.4) * 3;
    for (const c of b.cones) if (c.lit || true) r.decal(() => { r.groundArc(b.x, b.y, 14, 150, c.a - .16, c.a + .16, c.lit ? '#fff7a0' : '#ffe9a0', c.lit ? .55 : .15); });
    if (b.slam) { const s = b.slam; if (s.state === 'tele') r.decal(() => { r.groundRing(s.x, s.y, 30, '#ff3344', .9); r.groundDisc(s.x, s.y, 30 * Math.min(1, s.t), '#ff3344', .25); }); }
    if (b.shock) r.decal(() => r.groundRing(b.shock.x, b.shock.y, b.shock.r, '#ffffff', .9));
    const rig = MT.hostRig('lance'); const up = b.slam && (b.slam.state === 'rise') ? 40 + b.slam.t * 200 : 0;
    r.queue(b.x, b.y, 4, g => {
      const [cx, cy] = r.w(b.x, b.y, z + up), u = U(r, b.x, b.y, z), fl = b.flash > 0;
      px.ell(g, cx, cy + 4 * u, 24 * u, 10 * u, '#14081c'); px.ell(g, cx, cy + 3 * u, 23 * u, 9 * u, fl ? '#fff' : '#e8a818'); px.ell(g, cx, cy + 1 * u, 18 * u, 6 * u, '#ffe068');
      for (let i = 0; i < 12; i++) { const a = i / 12 * 6.28 + t * 3; px.dot(g, cx + Math.cos(a) * 21 * u, cy + 3 * u + Math.sin(a) * 8 * u, Math.floor(t * 10 + i) % 2 ? '#fff' : '#ff2e88'); }
      px.blend(g, .5, 'add', () => { px.ell(g, cx, cy + 12 * u, 14 * u, 4 * u, Math.floor(t * 20) % 2 ? '#2ee6ff' : '#9affff'); });
      for (const [id, sd] of [['turL', -1], ['turR', 1]]) if (b.partAlive(id)) { const tx = cx + sd * 38 * u, ty = cy; px.disc(g, tx, ty, 8 * u, '#14081c'); px.disc(g, tx, ty, 7 * u, partFlash(b, id) ? '#fff' : '#9aa0b0'); px.disc(g, tx, ty, 4 * u, '#fff7a0'); }
    }, { solid: true });
    if (rig) r.actor(b.x, b.y, z + 8 + up, (g, ox, oy) => rig.draw(g, ox, oy, r.view), { flash: b.flash > 0 ? '#fff' : undefined });
  } else if (b.sub === 'crash') {
    const rig = MT.hostRig('lance'); r.queue(b.x, b.y, 4, g => { const [cx, cy] = r.w(b.x, b.y, 4), u = U(r, b.x, b.y, 4); px.ell(g, cx, cy, 22 * u, 9 * u, '#5a4a20'); px.blend(g, .6, 'add', () => px.disc(g, cx, cy - 6 * u, 10 * u, '#ff9a3c')); }, {});
    if (rig) r.actor(b.x + 18, b.y + 10, 0, (g, ox, oy) => rig.draw(g, ox, oy, r.view), {});
  }
  if (b.stage === 'network' || (b.stage === 'transition' && b.sub === 'crash')) {
    const wu = b.wallU;
    r.queue(184, 20, 30, g => {
      const [x0, y0] = r.w(76, 16, 70 * wu), [x1, y1] = r.w(292, 16, 0); px.rect(g, Math.round(x0), Math.round(y0), Math.round(x1 - x0), Math.round(y1 - y0), '#06060c'); px.rect(g, Math.round(x0), Math.round(y0), Math.round(x1 - x0), 1, '#ffcc33');
      if (wu < .99) return;
      for (const p of b.parts) if (p.tv && p.alive) {
        const x = b.px(p), y = b.py(p), [sx, sy] = r.w(x, y, 30), u = U(r, x, y, 30), ch = b.channels.find(c => 'tv' + c.i === p.id), fl = p.flash > 0;
        px.rect(g, Math.round(sx - 12 * u), Math.round(sy - 9 * u), Math.round(24 * u), Math.round(18 * u), '#14081c'); px.rect(g, Math.round(sx - 10.5 * u), Math.round(sy - 7.5 * u), Math.round(21 * u), Math.round(15 * u), fl ? '#fff' : '#2a2a3a');
        const sw = Math.round(18 * u), sh = Math.round(12 * u), X = Math.round(sx - 9 * u), Y = Math.round(sy - 6 * u);
        if (!ch) { px.rect(g, X, Y, sw, sh, '#10182a'); px.rect(g, X, Y + Math.round((t * 10 + x) % sh), sw, 1, '#1c2c4a'); }
        else { const tele = ch.t < .5; if (tele && Math.floor(t * 30) % 2) px.rect(g, X, Y, sw, sh, '#ffffff'); else if (ch.ch === 'static') { for (let i = 0; i < 18; i++) px.rect(g, X + Math.floor(MT.fxr() * sw), Y + Math.floor(MT.fxr() * sh), 2, 1, MT.fxr() < .5 ? '#fff' : '#888'); px.rect(g, X, Y, sw, sh, 'rgba(0,0,0,0)'); } else if (ch.ch === 'news') { px.rect(g, X, Y, sw, sh, '#1840a0'); px.rect(g, X, Y + sh - 3, sw, 3, '#d02838'); px.rect(g, X + 2, Y + 2, 6, 5, '#f0c8a0'); } else if (ch.ch === 'cartoon') { px.rect(g, X, Y, sw, sh, '#60d0ff'); px.disc(g, X + sw / 2, Y + sh / 2, 3 * u, '#ffcc33'); } else if (ch.ch === 'shopping') { px.rect(g, X, Y, sw, sh, '#30a860'); E.font.text(g, '$', X + sw / 2, Y + 1, '#fff', { align: 'center', outline: false }); } else { px.rect(g, X, Y, sw, sh, '#7a2ab0'); px.disc(g, X + sw / 2, Y + sh / 2, 4 * u, '#f0c8a0'); px.rect(g, X + sw / 2 - 2, Y + sh / 2 + 1, 4, 1, '#fff'); } }
        if (ch && ch.ch === 'news' && ch.t > ch.tele) { const [bx, by] = r.w(x, y + 200, 0); const live = ch.t > ch.tele + .8; px.line(g, sx, sy + 9 * u, bx, by, live ? '#ffffff' : '#ff9ab0', live ? 4 : 1); }
      }
      const eye = b.part('eye'); if (eye.alive) { const [ex, ey] = r.w(184, 54, 36), u = U(r, 184, 54, 36), op = b.eyeOpen; px.disc(g, ex, ey, 21 * u, '#14081c'); px.disc(g, ex, ey, 19 * u, eye.flash > 0 ? '#fff' : '#c8d0e0'); px.disc(g, ex, ey, 14 * u, '#101828'); px.disc(g, ex, ey, (6 + op * 5) * u, op > .5 ? '#ff3344' : '#2ee6ff'); px.dot(g, ex - 3 * u, ey - 3 * u, '#fff'); }
    }, { solid: true });
  }
}
