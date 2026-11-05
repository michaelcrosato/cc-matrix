/* BATZOOKA BASEBALL: the HUD, call stamps, play-by-play and crowd reactions. Everything here listens to the bus. */
BZ.hud = { stamps: [], radio: null, radioQ: [], radioCool: 0, hype: 0, banner: null, flashT: 0, mph: 0, lastType: '' };
BZ.hudReset = () => { Object.assign(BZ.hud, { stamps: [], radio: null, radioQ: [], radioCool: 0, hype: 0, banner: null, mph: 0, lastType: '' }); };
const stamp = (text, color = '#ffffff', big = 1, secs = 1.1) => { BZ.hud.stamps.push({ text, color, t: 0, life: secs, big }); if (BZ.hud.stamps.length > 3) BZ.hud.stamps.shift(); };
const say = (pool, pri = 1, vars = {}) => {
  const H = BZ.hud, lines = BZ.lines[pool]; if (!lines) return;
  let t = lines[Math.floor(BZ.rng.fx() * lines.length)];
  for (const k in vars) t = t.replace('{' + k + '}', vars[k]);
  if (H.radioCool > 0 && pri < 3) return;
  const gm = My3D2dge.current; if (gm && gm.settings && gm.settings.commentary === false) return;
  const who = (BZ.rng.fx() < .5) ? 'TEX' : 'DUSTY';
  H.radio = { text: t, who, t: 0, life: Math.min(5.5, 2.2 + t.length * .045) }; H.radioCool = 2.4;
  BZ.babble(t, who === 'TEX' ? .8 : 1.15, .06);
};
BZ.say = say;
BZ.hudBind = () => {
  const H = BZ.hud, hype = v => { H.hype = clamp(H.hype + v, 0, 1); };
  const M = () => BZ.M;
  BZ.on('strike', d => { stamp(d.swing ? 'STRIKE!' : 'STRIKE!', '#ff8a8a', 1); say('strike', 1); });
  BZ.on('whiff', () => { say('whiff', 2); });
  BZ.on('ball', () => { stamp('BALL', '#9ad0ff', 1); say('ball', 1); });
  BZ.on('foul', () => { stamp('FOUL!', '#ffd070', 1); say('foul', 1); });
  BZ.on('contact', d => { H.flashT = d.kind === 'bz' ? .3 : .05; hype(d.Q > .7 ? .25 : .08); if (d.kind === 'bz') { stamp('BATZOOKA!!', '#ff7a2a', 2, 1.6); say('batzooka', 3); BZ.sfx('boom'); } });
  BZ.on('single', () => { stamp('BASE HIT!', '#9aff9a', 1.3, 1.2); say('single', 2); hype(.25); BZ.sfx('crowd'); });
  BZ.on('double', () => { stamp('DOUBLE!', '#9aff9a', 1.5, 1.4); say('double', 2); hype(.3); BZ.sfx('crowd'); });
  BZ.on('triple', () => { stamp('TRIPLE!', '#9aff9a', 1.8, 1.5); say('triple', 2); hype(.4); BZ.sfx('crowd'); });
  BZ.on('homer', d => { stamp('HOME RUN!', '#ffd23a', 2.4, 2.4); say('homer', 4, { d: BZ.feet(d.dist) }); hype(.7); BZ.sfx('crowd'); BZ.charge(); const g = My3D2dge.current; if (g) { g.flash('#ffffff', .25, .5); g.shake(d.bz ? 7 : 4); } });
  BZ.on('robbed', () => { stamp('ROBBED!', '#7affc0', 2, 1.8); say('robbed', 4); hype(.4); BZ.sfx('crowd'); });
  BZ.on('catch', d => { if (!d.robbed) { stamp('CAUGHT!', '#ffffff', 1.2); say('fly', 1); } });
  BZ.on('out', d => { if (d.how !== 'fly') { stamp('OUT!', '#ff6a6a', 1.5); BZ.sfx('out'); say('grounder', 1); } hype(.1); BZ.sfx('groan', { vol: .3 }); });
  BZ.on('strikeout', () => { stamp('STRIKEOUT!', '#ff6a6a', 2, 1.5); say('strikeout', 3); hype(.25); });
  BZ.on('walk', d => { stamp(d.hbp ? 'HIT BY PITCH!' : 'WALK', '#9ad0ff', 1.3, 1.3); say('walk', 2); });
  BZ.on('steal', () => { stamp('STOLEN BASE!', '#9aff9a', 1.5, 1.4); say('steal', 3); hype(.2); BZ.sfx('safe'); });
  BZ.on('run', d => { stamp('RUN SCORES!', '#ffd23a', 1.5, 1.3); say('run', 2); hype(.3); BZ.sfx('safe'); });
  BZ.on('doubleplay', () => { stamp('DOUBLE PLAY!', '#ff9ad0', 2, 1.6); say('doubleplay', 3); });
  BZ.on('rhubarb', () => { H.banner = { text: 'RHUBARB!', sub: 'The benches have cleared! MASH the button!', t: 0, life: 2.4, color: '#ff7a2a' }; say('rhubarb', 4); });
  BZ.on('meterfull', d => { stamp('BATZOOKA READY!', '#ffb030', 1.4, 1.5); BZ.sfx('coin'); });
  BZ.on('firepitch', () => { stamp('FIREBALL!', '#ff7a2a', 1.8, 1.2); });
  BZ.on('superfield', () => { stamp('ROCKET GLOVE!', '#ffd070', 1.8, 1.4); });
  BZ.on('wildthrow', () => { stamp('WILD THROW!', '#ffb08a', 1.3); BZ.sfx('groan', { vol: .2 }); });
  BZ.on('geyser', () => { BZ.sfx('boom', { vol: .2 }); });
  BZ.on('burn', () => { stamp('HOT FOOT!', '#ff7a2a', 1.4); });
  BZ.on('lostincorn', () => { stamp('LOST IN THE CORN!', '#e8d048', 1.6, 1.5); });
  BZ.on('half', d => { H.banner = { text: (d.half ? 'BOTTOM ' : 'TOP ') + 'OF THE ' + BZ.ord(d.inn), sub: BZ.M.sides[d.half].team.name + ' AT BAT', t: 0, life: 2.4, color: '#ffffff' }; if (d.inn > 1 || d.half) say('inning', 1); else say('start', 3); });
  BZ.on('gameover', d => { H.banner = { text: 'FINAL', sub: '', t: 0, life: 99, color: '#ffd23a' }; say('end', 4); });
  BZ.on('pitch', d => { H.mph = BZ.mph(d.speed); H.lastType = G.PITCHES[d.type].name; });
  BZ.on('wall', () => { BZ.sfx('mitt'); });
  BZ.on('batterup', () => { });
};
BZ.hudUpdate = dt => {
  const H = BZ.hud;
  H.hype = Math.max(0, H.hype - dt * .08); H.radioCool -= dt; H.flashT = Math.max(0, H.flashT - dt);
  for (const s of H.stamps) s.t += dt; H.stamps = H.stamps.filter(s => s.t < s.life);
  if (H.radio) { H.radio.t += dt; if (H.radio.t > H.radio.life) H.radio = null; }
  if (H.banner) { H.banner.t += dt; if (H.banner.t > H.banner.life) H.banner = null; }
};

/* ---- drawing ---- */
const shadowText = (g, t, x, y, c, o = {}) => E.font.text(g, t, x, y, c, Object.assign({ shadow: '#000', outline: false }, o));
function diamond(g, x, y, M) {
  px.poly(g, [[x + 11, y], [x + 22, y + 11], [x + 11, y + 22], [x, y + 11]], 'rgba(30,34,70,.9)');
  const occ = [false, false, false]; for (const r of M.runners) if (r.state === 'run' && onBaseSafe(r)) occ[Math.round(r.pos) - 1] = true;
  [[1, 22, 11], [2, 11, 0], [3, 0, 11]].forEach(([b, dx, dy]) => { px.rect(g, x + dx - 3, y + dy - 3, 7, 7, occ[b - 1] ? '#ffd23a' : '#4a4a68'); });
}
const onBaseSafe = r => Math.abs(r.pos - Math.round(r.pos)) < .06 && Math.round(r.pos) >= 1 && Math.round(r.pos) <= 3;
BZ.drawScorebug = (g, M, W_) => {
  const x = 4, y = 4, w = 124, h = 44;
  px.rect(g, x, y, w, h, 'rgba(8,10,26,.82)'); px.rect(g, x, y, w, 1, '#ffd23a');
  for (let i = 0; i < 2; i++) {
    const s = M.sides[i], yy = y + 4 + i * 11, at = M.half === i;
    px.rect(g, x + 4, yy + 1, 5, 7, s.team.chip); shadowText(g, s.team.short, x + 12, yy + 1, at ? '#ffffff' : '#a8a8c8');
    shadowText(g, String(M.score[i]), x + 44, yy + 1, '#ffe070', { align: 'right' });
    px.rect(g, x + 50, yy + 2, 40, 5, '#14162a'); px.rect(g, x + 51, yy + 3, Math.round(38 * s.meter / 100), 3, s.meter >= 100 ? (Math.floor(M.clock * 6) % 2 ? '#ffee66' : '#ff7a2a') : '#ff9a30');
    if (at) shadowText(g, '\u25b8', x + 92, yy + 1, '#ffd23a');
  }
  shadowText(g, (M.half ? 'BOT ' : 'TOP ') + M.inn, x + 4, y + 29, '#ffd23a');
  shadowText(g, M.balls + '-' + M.strikes, x + 40, y + 29, '#e8e8ff');
  for (let i = 0; i < 3; i++) px.disc(g, x + 66 + i * 7, y + 32, 2, i < M.outs ? '#ff5a5a' : '#3a3a58');
  diamond(g, x + w - 26, y + 14, M);
};
BZ.drawZone = (g, game, M, role, x, y, w, h) => {
  const u = w / 3.4, cx = x + w / 2, cy = y + h / 2;
  px.rect(g, x, y, w, h, 'rgba(8,10,26,.72)'); px.rect(g, x, y, w, 1, '#8888cc'); px.rect(g, x, y + h - 1, w, 1, '#8888cc'); px.rect(g, x, y, 1, h, '#8888cc'); px.rect(g, x + w - 1, y, 1, h, '#8888cc');
  // the strike zone
  const zx0 = cx - u, zy0 = cy - u, zs = u * 2;
  px.rect(g, zx0, zy0, zs, 1, '#ffffff'); px.rect(g, zx0, zy0 + zs, zs + 1, 1, '#ffffff'); px.rect(g, zx0, zy0, 1, zs, '#ffffff'); px.rect(g, zx0 + zs, zy0, 1, zs + 1, '#ffffff');
  for (let i = 1; i < 3; i++) { px.rect(g, zx0 + zs * i / 3, zy0, 1, zs, 'rgba(255,255,255,.22)'); px.rect(g, zx0, zy0 + zs * i / 3, zs, 1, 'rgba(255,255,255,.22)'); }
  const p = M.pitch;
  // the aim reticle (pitcher) and bat ring (batter)
  const showAim = role === 'pitch' && (M.phase === 'setup' || M.phase === 'windup' || M.phase === 'pitch');
  if (showAim) { const ax = cx + (p ? p.aim.u + p.aft.u : M.aim.u) * u, ay = cy + (p ? p.aim.v + p.aft.v : M.aim.v) * u; px.line(g, ax - 5, ay, ax + 5, ay, '#ff7a5a', 1); px.line(g, ax, ay - 5, ax, ay + 5, '#ff7a5a', 1); px.disc(g, ax, ay, 4, 'rgba(255,122,90,.25)'); }
  const rad = TUNE.sweet * u * (M.sw && M.sw.kind === 'bz' ? 2.4 : 1);
  const kx = cx + M.cur.u * u, ky = cy + M.cur.v * u, hot = M.sw ? '#ffee66' : '#7aff9a';
  if (role === 'bat' || role === 'both') {
    for (let a = 0; a < 16; a++) { const t = a / 16 * TAU; px.dot(g, kx + Math.cos(t) * rad, ky + Math.sin(t) * rad, hot); }
    px.dot(g, kx, ky, hot);
  }
  if (M.pitch && M.pitch.released && (M.phase === 'pitch' || M.phase === 'call')) {
    const uv = BZ.pitchUV(M.pitch, Math.min(M.pitch.t, M.pitch.T)), s = uv.s, bx = cx + uv.u * u, by = cy + uv.v * u, rr_ = 1.5 + 5 * s * s;
    px.disc(g, bx, by, rr_ + 1, 'rgba(0,0,0,.5)'); px.disc(g, bx, by, rr_, M.pitch.type === 'fire' ? '#ff8a30' : '#ffffff');
  }
  shadowText(g, role === 'pitch' ? 'AIM' : 'ZONE', x + 3, y + 3, '#aaaadd');
};
function radioBox(g, M, W_, H_) {
  const R = BZ.hud.radio; if (!R) return;
  const w = Math.min(W_ - 270, 250), x = Math.max(BZ.M && BZ.M.mode === 'derby' ? 162 : 136, (W_ - w) / 2), y = 4;
  px.rect(g, x, y, w, 20, 'rgba(8,10,26,.85)'); px.rect(g, x, y, w, 1, R.who === 'TEX' ? '#ffb070' : '#70c0ff');
  shadowText(g, R.who, x + 3, y + 3, R.who === 'TEX' ? '#ffb070' : '#70c0ff');
  const lines = E.font.wrap(R.text, w - 8); shadowText(g, lines[0] || '', x + 5, y + 10, '#ffffff');
  if (lines[1]) shadowText(g, lines[1], x + 5, y + 18, '#ffffff');
}
BZ.drawStamps = (g, W_, H_) => {
  const H = BZ.hud, ys = [H_ * .3, H_ * .3 + 24, H_ * .3 + 46];
  H.stamps.forEach((s, i) => {
    const k = s.t / s.life, pop = Math.min(1, s.t * 8), sc = Math.max(1, Math.round(s.big * (1.4 - .4 * pop))), a = k > .8 ? 1 - (k - .8) * 5 : 1;
    if (a <= 0) return;
    E.font.title(g, s.text, W_ / 2, ys[i] || ys[2], { scale: sc, colors: [s.color, shade(s.color, .6)], outline: '#101020', depth: 1, depthColor: '#000', align: 'center' });
  });
  if (H.banner) {
    const b = H.banner, k = b.t / b.life, wipe = Math.min(1, b.t * 6) * (k > .85 ? 1 - (k - .85) / .15 : 1);
    const h = 40 * wipe, y = H_ / 2 - h / 2; px.rect(g, 0, y, W_, h, 'rgba(8,10,26,.85)'); px.rect(g, 0, y, W_, 1, '#ffd23a'); px.rect(g, 0, y + h - 1, W_, 1, '#ffd23a');
    if (wipe > .6) { E.font.title(g, b.text, W_ / 2, y + 6, { scale: 2, colors: [b.color, shade(b.color, .7)], outline: '#101020', align: 'center' }); if (b.sub) shadowText(g, b.sub, W_ / 2, y + 28, '#e8e8ff', { align: 'center' }); }
  }
};
function shade(hex, k) { const c = E.hex ? E.hex(hex) : [255, 255, 255]; return '#' + c.map(v => clamp(Math.round(v * k), 0, 255).toString(16).padStart(2, '0')).join(''); }
BZ.shade = shade;
/* the prompts line under the action: what can I press now */
BZ.drawPrompts = (g, game, M, W_, H_, ctl) => {
  const items = BZ.promptsFor(M, game);
  let x = 6; const y = H_ - 14;
  px.rect(g, 0, y - 3, W_, 17, 'rgba(8,10,26,.6)');
  for (const [a, label] of items) { x += BZ.prompt(g, game, x, y, a, label, { input: ctl }) + 5; if (x > W_ - 60) break; }
};
BZ.promptsFor = (M, game) => {
  const bs = M.sides[M.half], ds = M.sides[1 - M.half], ph = M.phase;
  if (M.mode === 'derby') return [['stick', 'Aim'], ['swing', 'Swing'], ['power', M.sides[0].meter >= 100 ? 'BATZOOKA!' : 'Power swing']];
  const humanBat = bs.human, humanDef = ds.human;
  if (ph === 'setup' || ph === 'windup' || ph === 'pitch' || ph === 'call') {
    if (humanDef && !humanBat) return [['stick', 'Aim pitch'], ['dive', 'Pitch type'], ['swing', 'Throw'], ['power', ds.meter >= 100 ? 'FIREBALL!' : ''], ['dive', 'hold: Beanball']].filter(x => x[1]);
    if (humanBat && !humanDef) return [['stick', 'Aim bat'], ['swing', 'Swing'], ['tri', 'hold: Bunt'], ['power', bs.meter >= 100 ? 'BATZOOKA!' : 'Power swing'], ['cir', 'Steal']].filter(x => x[1]);
    if (humanBat && humanDef) return [['stick', 'Aim'], ['swing', 'Swing / Throw'], ['power', 'Power']];
    return [['pause', 'Pause']];
  }
  if (ph === 'play') {
    const out = [];
    if (humanDef) out.push(['stick', 'Chase'], ['dive', 'Dive / Jump'], ['turbo', 'Turbo'], ['th', 'Home'], ['t3', '3rd'], ['t2', '2nd'], ['t1', '1st']);
    if (humanBat) out.push(['tri', 'Advance'], ['cir', 'Recall'], ['turbo', 'Turbo']);
    return out.length ? out : [['pause', 'Pause']];
  }
  if (ph === 'rhubarb') return [['swing', 'MASH!']];
  return [['pause', 'Pause']];
};
