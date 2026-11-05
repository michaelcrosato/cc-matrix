// The game: the engine's Game with our input map, settings and pause items; drawing a play through the Vista (props,
// actors, particles, foreground dressing, weather, the scope lenses, the stink cloud, snow splats); story beats with the
// cast's Humanoid portraits and gibberish voices.
(() => {
const B = BB, E = B.E, px = E.px;
B.HAS_DOM = typeof document !== 'undefined' && !!document.getElementById && !!document.getElementById('screen');
B.HUB = typeof AIHub !== 'undefined' && AIHub.active;
const HUNT_KEYS = {
  up: ['KeyW', 'ArrowUp', 'Pad12'], down: ['KeyS', 'ArrowDown', 'Pad13'], left: ['KeyA', 'ArrowLeft', 'Pad14'], right: ['KeyD', 'ArrowRight', 'Pad15'],
  fire: ['Mouse0', 'Pad7', 'KeyJ'], pump: ['KeyR', 'Space', 'Pad2'], scope: ['Mouse2', 'Pad6', 'KeyL'], breath: ['ShiftLeft', 'Pad5'], call: ['KeyQ', 'Pad3'], board: ['Tab', 'Pad4'], more: ['KeyM'],
  start: ['Enter', 'NumpadEnter', 'Pad9'], pause: ['Escape', 'KeyP', 'Pad9'], confirm: ['Enter', 'NumpadEnter', 'Space', 'Pad0'], cancel: ['Escape', 'Backspace', 'Pad1']
};
B.HUNT_KEYS = HUNT_KEYS;
B.loadTuning(); B.loadRecords();
const game = B.game = new E.Game({
  canvas: B.HAS_DOM ? 'screen' : undefined, res: [480, 270], expand: true, view: 'side', input: HUNT_KEYS, id: 'bigbuckhuntoff',
  autoPause: !B.HUB, corner: !B.HUB, backGesture: !B.HUB,
  menu: {
    items: [['Restart site', () => B.restartSite()], ['Restart hunt', () => B.restartHunt()], ['Dev mode', () => B.openDev()]],
    settings: B.GAME_SETTINGS,
    controls: { fire: 'Shoot', pump: 'Pump / reload', scope: 'Scope', breath: 'Hold breath', call: 'Call', board: 'Standings', more: false, attack: false, dash: false, skill: false, jump: false },
    quit: B.HUB ? false : 'title'
  }
});
B.initAudio(game);
// the wheel pumps too (a press on one step, a release on the next)
if (B.HAS_DOM) {
  const cv = document.getElementById('screen');
  cv.addEventListener('wheel', e => { if (B.inPlay && e.deltaY > 0) { game.input.press('Act:pump'); game.after ? setTimeout(() => game.input.release('Act:pump'), 30) : 0; } }, { passive: true });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  window.addEventListener('mousedown', () => { game.input._bbMouse = true; });
  window.addEventListener('keydown', () => { game.input._bbMouse = false; });
}

// ---- cast portraits (engine Humanoids) ----
const H = E.Humanoid;
B.PORTRAITS = {};
const mk = (who, o) => { try { B.PORTRAITS[who] = new H(Object.assign({ size: 1.3, weapon: null }, o)); } catch (e) { B.PORTRAITS[who] = null; } };
mk('dub', { build: 'bulky', outfit: 'coat', hair: 'short', hat: { style: 'cap', color: '#f07020' }, colors: { skin: '#e0a880', hair: '#c8c8c0', cloth: '#7a6a48', coat: '#7a6a48', pants: '#4a4232' } });
mk('granny', { build: 'chibi', outfit: 'robe', hair: 'long', colors: { skin: '#f0c0a0', hair: '#e0e0e0', cloth: '#a85a7a', coat: '#a85a7a' } });
mk('dwayne', { build: 'heroic', outfit: 'shirt', hair: 'spiky', hat: { style: 'cap', color: '#3a4228' }, colors: { skin: '#e0b090', hair: '#6a4a2a', cloth: '#5a6a3a', pants: '#3a4228', eye: '#101010', iris: '#101010' } });
mk('loretta', { build: 'heroic', outfit: 'shirt', hair: 'ponytail', colors: { skin: '#e8b898', hair: '#6a3a1a', cloth: '#c83a32', pants: '#3a4a6a' } });
mk('earl', { build: 'bulky', outfit: 'shirt', hair: 'bald', hat: { style: 'cap', color: '#8a2a2a' }, colors: { skin: '#e0a880', cloth: '#3a5a8a', pants: '#3a5a8a' } });
mk('emcee', { build: 'heroic', outfit: 'coat', hair: 'short', hat: { style: 'band', color: '#c8a040' }, colors: { skin: '#e8b898', hair: '#2a1a10', cloth: '#2a2a3a', coat: '#2a2a3a' } });
for (const k in B.PORTRAITS) { const r = B.PORTRAITS[k]; if (r) for (let i = 0; i < 5; i++) r.update(1 / 30, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: 0 }); }

// ---- story beats ----
const beat = (id, lines) => B.def('beat', id, { lines });
beat('welcome', [['emcee', 'Welcome to the 41st Annual Big Buck Hunt-Off!'], ['emcee', 'Three hunts. One trophy wall. Zero does!'], ['dub', "Name's Dub. Forty years guidin'. Lost twice. On purpose."]]);
beat('rivals', [['dwayne', "Hope you packed a lunch, cuz. You'll be here a while."], ['loretta', "Ignore him. He shot a mailbox in '09."], ['earl', "I'm mostly here for the chili."]]);
beat('hollow-intro', [['dub', 'Whitetails thick as ticks out here.'], ['dub', "Bucks got antlers. Does don't. Can't tell? Don't pull."], ['dub', "Pump after every shot. This rifle's older'n me."]]);
beat('bugle-intro', [['dub', "Elk hear a bugle, they come lookin' for a fight."], ['dub', "Give 'em a call and they'll stop to see who's talkin'."], ['dub', 'Long shots up here. Scope in and hold your breath.']]);
beat('muskeg-intro', [['dub', "Moose ain't skittish. Moose is a truck with opinions."], ['earl', 'Chili\'s on the fire if you live.'], ['dub', 'Takes more than one in the gut to stop a moose.']]);
beat('range-intro', [['dub', "Welcome to my range. Paper bucks don't run. Much."]]);
beat('ceremony-win', [['emcee', 'Our new Hunt-Off champion!'], ['dub', 'Hang it on the wall, kid.'], ['dwayne', "Scope's crooked. That's all that is."]]);
beat('ceremony-lose', [['emcee', "There's always next year!"], ['dub', 'You did fine. The deer did finer.'], ['dwayne', 'Told ya. Bring a lunch.']]);
beat('outro-ahead', [['dwayne', "Scope's crooked. That's all that is."]]);
beat('outro-behind', [['dwayne', 'Told ya. Bring a lunch.']]);
const talk = B.talk = new E.Dialog(game, { voice: null });
B.story = (lines, done) => {
  if (typeof lines === 'string') lines = B.get('beat', lines).lines;
  let i = 0;
  const next = () => {
    if (i >= lines.length) { if (done) done(); return; }
    const [who, line] = lines[i++], C = B.CAST[who] || { name: who.toUpperCase() };
    B.bus.emit('voice', { who, line });
    talk.say([line], { name: C.name, portrait: B.PORTRAITS[who] || undefined, onDone: next });
  };
  next();
};
B.skipStory = () => { if (talk.open) talk.close(); };

// ---- drawing a play ----
const worldDrawables = w => {
  if (w._drawables) return w._drawables;
  const out = [];
  for (const p of w.trees.concat(w.props)) { const P = B.PROPS[p.kind]; out.push({ x: p.x, y: p.y, z: p.z, rad: Math.max(p.r, p.h * .6), maxD: P.tree ? 700 : 500, draw: (r) => P.draw(r, p, { id: 0 }) }); }
  return (w._drawables = out);
};
B.actorDrawable = (a, glint) => ({
  x: a.x, y: a.y, z: a.z, rad: a.rig ? 2.4 * a.rig.size : 1.5, maxD: 1400,
  draw: r => { const id = 100 + (a.id % 60000); if (a.rig) a.rig.draw(r, { id, glint }); else if (a.parts) B.drawParts(r, a.parts, { id }); }
});
B.envForSite = (site, t) => {
  const env = B.envFor(site.hunt, t);
  if (site.def.fogFn) { const m = site.def.fogFn(t, site); env.fogNear = B.lerp(14, env.fogNear, m); env.fogFar = B.lerp(85, env.fogFar, m); env.fogMax = B.lerp(1, env.fogMax, m); }
  if (site.def.fogBanks) { const k = .5 + .5 * Math.sin(t * .35); env.fogNear = B.lerp(25, 60, k); env.fogFar = B.lerp(120, 260, k); env.fogMax = .95; }
  return env;
};
const tgtMain = new B.Target(480, 270);
B.mainTarget = tgtMain;
// draw the world for a play (or a free lens) into g
B.drawWorld = (g, W, H, o) => {
  const site = o.site, world = o.world || (site && site.world), lens = o.lens || site.lens, t = o.time || 0;
  if (tgtMain.W !== W || tgtMain.H !== H) tgtMain.resize(W, H);
  lens.W = W; lens.H = H; if (lens.update) lens.update();
  const env = o.env || (site ? B.envForSite(site, t) : B.envFor(world.hunt, t));
  env.time = t;
  const glint = B.setting('glint');
  const objs = worldDrawables(world).slice();
  const actors = o.actors || (site ? site.herd.list : []);
  for (const a of actors) { if (a.gone || (a.hidden && a.cat === 'animal' && a.trophy)) continue; objs.push(B.actorDrawable(a, glint)); }
  if (o.extra) for (const x of o.extra) objs.push(x);
  if (o.fx && o.fx.length) objs.push({ x: lens.x, y: lens.y, z: lens.z, cull: false, draw: r => { for (const f of o.fx) r.dot(f.x, f.y, f.z, f.size, f.c); } });
  B.vista.render(tgtMain, lens, world, env, objs);
  // scope lenses: the same camera magnified about each scoped player's swayed aim point, masked to a circle
  if (o.players) for (const p of o.players) if (p.scopeK > .05 && !p.ghost) scopeInto(tgtMain, p, lens, world, env, objs, o.t || 0);
  const cv = tgtMain.canvas();
  if (cv && g.drawImage) g.drawImage(cv, 0, 0);
  return env;
};
function scopeInto(T, p, lens, world, env, objs, t) {
  const R = Math.round(54 * p.scopeK * (T.H / 270)), size = R * 2; if (R < 4) return;
  const aim = B.aimPoint(p, t), mag = B.TUNING.scopeMag;
  const st = B.vista.target('scope' + p.n, size, size), L = lens.magnified(aim[0], aim[1], mag, size, size);
  B.vista.render(st, L, world, env, objs);
  const cx = Math.round(p.ret[0]), cy = Math.round(p.ret[1]);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = x - R + .5, dy = y - R + .5; if (dx * dx + dy * dy > R * R) continue;
    const X = cx - R + x, Y = cy - R + y; if (X < 0 || Y < 0 || X >= T.W || Y >= T.H) continue;
    T.frame[Y * T.W + X] = st.frame[y * size + x];
  }
  p._scopeR = R;
}
// overlays after the world: foreground dressing, weather, stink, splats, scope rings, vignette
B.drawOverlays = (g, W, H, o) => {
  const site = o.site, t = o.time || 0, v = site ? site.v : null;
  // weather: screen-space flakes and leaves in three layers (cosmetic)
  const wx = site ? site.hunt.weather : null;
  if (wx) {
    const n = Math.round(90 * wx.amount * (W * H) / (480 * 270)), yaw = site.lens.yaw;
    for (let i = 0; i < n; i++) {
      const layer = i % 3, sp = [18, 30, 46][layer], seed = i * 7.31;
      const x = ((B.hash2(i, 1, 3) * W * 1.4 + Math.sin(t * .7 + seed) * 12 - yaw * 300 * (layer + 1) + t * (wx.kind === 'leaves' ? 12 : 4)) % (W * 1.4) + W * 1.4) % (W * 1.4) - W * .2;
      const y = ((B.hash2(i, 2, 3) * H + t * sp) % (H + 10)) - 5;
      if (wx.kind === 'snow') px.rect(g, x, y, layer === 2 ? 2 : 1, layer === 2 ? 2 : 1, layer ? '#ffffff' : '#d8e0ec');
      else { const c = wx.color[i % wx.color.length]; px.rect(g, x, y, 2, layer === 2 ? 2 : 1, c); if (layer === 2) px.rect(g, x + 1, y + 1, 1, 1, E.shade(c, -.3)); }
    }
  }
  // foreground dressing by vantage
  if (v && !o.noDressing) dressing(g, W, H, v.kind, t, site);
  // scope rings
  if (o.players) for (const p of o.players) if (p.scopeK > .05 && p._scopeR && !p.ghost) {
    const R = p._scopeR, cx = Math.round(p.ret[0]), cy = Math.round(p.ret[1]);
    for (let a = 0; a < 96; a++) { const q = a / 96 * Math.PI * 2; for (let k = 0; k < 3; k++) px.rect(g, cx + Math.round(Math.cos(q) * (R + k)), cy + Math.round(Math.sin(q) * (R + k)), 1, 1, k === 1 ? '#3a3a40' : '#0a0a0c'); }
    px.rect(g, cx - R + 4, cy, R * 2 - 8, 1, '#0a0a0c'); px.rect(g, cx, cy - R + 4, 1, R * 2 - 8, '#0a0a0c');
    px.rect(g, cx - R + 4, cy - 1, R - 10, 3, '#0a0a0c'); px.rect(g, cx + 6, cy - 1, R - 10, 3, '#0a0a0c'); px.rect(g, cx - 1, cy + 6, 3, R - 10, '#0a0a0c');
    px.rect(g, cx - 1, cy - 1, 3, 3, p.color);
    // the breath arc
    const n = Math.round(24 * p.breath); for (let k = 0; k < n; k++) { const q = Math.PI * .75 + k / 24 * Math.PI * .5; px.rect(g, cx + Math.round(Math.cos(q) * (R + 5)), cy + Math.round(Math.sin(q) * (R + 5)), 2, 2, p.shaky > 0 ? '#ff5040' : p.breathHeld ? '#80e0ff' : '#c8d8e0'); }
  }
  // the stink cloud
  if (o.play && o.play.stink > 0) { const k = o.play.stink / 3; px.blend(g, .55 * k, 'normal', () => { for (let i = 0; i < 14; i++) px.disc(g, W * (.2 + B.hash2(i, 4, 1) * .6) + Math.sin(t + i) * 10, H * (.25 + B.hash2(i, 5, 1) * .5), 30 + 20 * B.hash2(i, 6, 1), '#6a9a30'); }); }
  // snow splats
  if (o.play) for (const s of o.play.splats) { const k = 1 - s.t / 2.2; px.blend(g, Math.min(1, k * 1.4), 'normal', () => { const cx = s.x * W, cy = s.y * H, r = s.r * H; px.disc(g, cx, cy, r, '#f0f4fa'); for (let i = 0; i < 7; i++) { const a = i * .9; px.disc(g, cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * .35, '#e4ecf6'); } }); }
  // vignette: darkened corners
  const vg = Math.round(Math.min(W, H) * .12);
  px.blend(g, .25, 'multiply', () => { px.rect(g, 0, 0, W, 3, '#202030'); px.rect(g, 0, H - 3, W, 3, '#202030'); });
};
function dressing(g, W, H, kind, t, site) {
  const sway = Math.sin(t * .6) * 2;
  if (kind === 'treestand') {   // the stand's rail and a bit of bark
    px.rect(g, 0, H - 14, W, 5, '#5a4632'); px.rect(g, 0, H - 14, W, 1, '#8a6a48'); px.rect(g, 0, H - 9, W, 9, '#3a2c20');
    for (let x = 30; x < W; x += 120) { px.rect(g, x, H - 30, 6, 30, '#4a3a2a'); px.rect(g, x, H - 30, 2, 30, '#6a5440'); }
  } else if (kind === 'blind') {   // the blind's window frame
    px.rect(g, 0, 0, W, 10, '#2a2a1e'); px.rect(g, 0, H - 16, W, 16, '#2a2a1e'); px.rect(g, 0, 0, 10, H, '#2a2a1e'); px.rect(g, W - 10, 0, 10, H, '#2a2a1e');
    for (let x = 0; x < W; x += 6) { px.rect(g, x, 10, 3, 2 + (x * 7 % 5), '#3a3a28'); px.rect(g, x, H - 18 - (x * 3 % 4), 3, 3, '#3a3a28'); }
  } else if (kind === 'canoe') {   // the canoe's bow
    const bob = Math.sin(site ? site.bobT * 2 * Math.PI / 3.1 : 0) * 2;
    px.poly(g, [[W / 2 - 70, H + 2], [W / 2 - 8, H - 40 + bob], [W / 2 + 8, H - 40 + bob], [W / 2 + 70, H + 2]], '#a83a22');
    px.poly(g, [[W / 2 - 60, H + 2], [W / 2 - 6, H - 36 + bob], [W / 2 + 6, H - 36 + bob], [W / 2 + 60, H + 2]], '#6a2a1a');
    px.rect(g, W / 2 - 1, H - 40 + bob, 2, 42, '#e8d8b0');
  } else if (kind === 'porch') { px.rect(g, 0, H - 12, W, 12, '#8a6a48'); for (let x = 0; x < W; x += 16) px.rect(g, x, H - 12, 1, 12, '#5a4632'); px.rect(g, 0, H - 26, W, 3, '#e8e0d0'); for (let x = 8; x < W; x += 24) px.rect(g, x, H - 26, 3, 14, '#e8e0d0'); }
  else {   // grass tufts and leaves in the bottom corners
    for (let i = 0; i < 26; i++) { const x = i < 13 ? i * 4 : W - (i - 13) * 4, h = 10 + (i * 37 % 14), s = Math.round(sway * (h / 24)); px.line(g, x, H, x + s, H - h, i % 3 ? '#4a5a2a' : '#6a7a3a', 2); }
  }
}

// ---- tags over bagged animals (the bagger's colour, its points) ----
B.drawTags = (g, play) => {
  const site = play.site; if (!site) return;
  for (const a of site.herd.list) {
    if (!a.dead || a.cat !== 'animal' || !a.legal || a.paper) continue;
    const P = site.lens.project(a.x, a.y, a.z + (a.rig ? 1.2 * a.rig.size : 1)); if (!P) continue;
    const k = play.players.find(p => p.n === a.bagger), rec = k && k.site.kills.find(x => x.a === a);
    const label = rec ? '+' + rec.pts : 'BAGGED';
    const w = E.font.width(label) + 6, x = Math.round(P[0] - w / 2), y = Math.round(P[1] - 14);
    px.rect(g, x, y, w, 10, '#0a0806'); px.rect(g, x + 1, y + 1, w - 2, 8, B.SEATS[a.bagger] || '#888'); B.text(g, label, P[0], y + 2, '#ffffff', { align: 'center', shadow: false });
    px.line(g, Math.round(P[0]), y + 10, Math.round(P[0]), y + 14, '#0a0806');
  }
};
})();
