/* ---- PRESENTATION: camera director, crowd, effects, commentary, HUD, match drawing ---- */
const Cam = (() => {
  let zoom = 1, punch = 0, fx = 0, fy = 0, viewSet = '';
  const want = () => S('camMode') === 'Overhead' ? 'topdown' : 'threequarter';
  function setView(id) { if (viewSet !== id || game.view.id !== id) { viewSet = id; try { game.setView(id); } catch (e) {} } }
  function reset() { viewSet = ''; zoom = 1; punch = 0; }
  function update(m, dt) {
    const p = m.puck; let tx = p.x + p.vx * .25, ty = p.y + p.vy * .25, z = { Near: .95, Normal: .78, Far: .62 }[S('camDist')] || .78, view = want();
    const hs = m.humans.filter(h => h.sk && !h.remote || (h.sk && m.cfg.session && h.seat === AIHubSeat()));
    const mine = HUB ? m.humans.find(h => h.seat === (window.AIHub && AIHub.me)) : null;
    if (mine && mine.sk) { tx = lerp(tx, mine.sk.x, .3); ty = lerp(ty, mine.sk.y, .3); }
    else if (hs.length === 1 && hs[0].sk && Math.hypot(hs[0].sk.x - tx, hs[0].sk.y - ty) > 220) { tx = lerp(tx, hs[0].sk.x, .25); ty = lerp(ty, hs[0].sk.y, .25); }
    else if (hs.length > 1) { let sx = tx, sy = ty, n = 1; for (const h of hs) { sx += h.sk.x; sy += h.sk.y; n++; } const cx = sx / n, cy = sy / n; let sp = 0; for (const h of hs) sp = Math.max(sp, Math.hypot(h.sk.x - cx, h.sk.y - cy)); tx = cx; ty = cy; z *= clamp(1.1 - sp / 700, .78, 1); }
    if (m.phase === 'faceoff') z *= 1.12;
    if (Math.hypot(p.vx, p.vy) > 400) z *= .93;
    if (m.phase === 'fight' && m.fight) { view = 'brawler'; tx = m.fight.cx; ty = m.fight.cy; z = 1.25; }
    else if (m.phase === 'goal' && m.scorer) { tx = lerp(p.x, m.scorer.x, .7); ty = m.scorer.y; z *= 1.25; }
    else if (m.phase === 'replay') { view = 'brawler'; z = 1.0; }
    else if (m.phase === 'intro') { const u = clamp(m.pt / (m.cfg.introLen || 4.2), 0, 1); tx = lerp(Rink.CX - 300, Rink.CX + 300, u); ty = Rink.CY; z = .95; }
    else if (m.phase === 'flood' && m.fl) { tx = m.fl.x; ty = m.fl.y; z = .7; }
    else if (m.phase === 'shootout') { tx = lerp(Rink.CX, Sim.oppGoalX(m, m.so ? m.so.turn : 0), .5); ty = Rink.CY; z *= 1.1; }
    else if (m.phase === 'final' || m.phase === 'periodEnd') { z *= 1.1; }
    punch = Math.max(0, punch - dt * 3);
    zoom += (z * (1 + punch * .1) - zoom) * Math.min(1, dt * 4);
    fx += (tx - fx) * Math.min(1, dt / (m.phase === 'play' ? .15 : .25)); fy += (ty - fy) * Math.min(1, dt / .15);
    if (!isFinite(fx) || Math.abs(fx - tx) > 800) { fx = tx; fy = ty; }
    setView(view); game.setZoom(zoom); game.focus(fx, fy, 6);
  }
  const bump = (v = 1) => { punch = Math.max(punch, v); };
  return { update, bump, reset, snap(x, y) { fx = x; fy = y; }, setView };
})();
const AIHubSeat = () => (window.AIHub && AIHub.me);

const Crowd = (() => {
  let fans = [], exc = 0, wave = -9, arenaId = '';
  const SKIN = ['#e8c4a0', '#c89070', '#8a5a3a', '#f0d0b0', '#a87050'];
  function build(arena) {
    if (arenaId === arena.id) return; arenaId = arena.id; fans = [];
    const add = (x, y, z, k) => { const h = U.hash(x, y), home = h < .7; fans.push({ x, y, z, c: arena.crowd[(h * 13 | 0) % arena.crowd.length], home: h, sk: SKIN[(h * 29 | 0) % 5], ph: h * 40, sign: h > .985 ? ['BARN BURNER', 'KABOOM!', 'MARGE 4 PM', 'SAVE THE ICEBOX', 'PIPESY <3'][(h * 977 | 0) % 5] : null, k }); };
    const hs = [20, 28, 36, 44, 52, 60, 68, 76];
    for (let r = 0; r <= 10; r++) for (let c = 4; c <= 65; c++) for (const dx of [4, 12]) add(c * 16 + dx, r * 16 + 9, hs[clamp(((10 - r) / 1.7 | 0), 0, 7)], 'n');
    for (let c = 1; c <= 6; c++) for (let r = 11; r <= 41; r++) { const z = hs[clamp(((6 - c) / 1.2 | 0), 0, 7)]; add(c * 16 + 5, r * 16 + 4, z, 'w'); add(c * 16 + 11, r * 16 + 12, z, 'w'); }
    for (let c = 63; c <= 68; c++) for (let r = 11; r <= 41; r++) { const z = hs[clamp(((c - 63) / 1.2 | 0), 0, 7)]; add(c * 16 + 5, r * 16 + 4, z, 'e'); add(c * 16 + 11, r * 16 + 12, z, 'e'); }
  }
  function draw(r, m, t) {
    const goalSide = m.phase === 'goal' && m.scorer ? m.scorer.side : -1; const e = exc;
    for (const f of fans) {
      if (!r.visible(f.x, f.y, f.z, 20, 20, 30)) continue;
      let up = Math.sin(t * 2 + f.ph) * .5; if (e > .5) up += Math.abs(Math.sin(t * (4 + e * 4) + f.ph)) * e * 2.2; if (goalSide >= 0) up += Math.abs(Math.sin(t * 9 + f.ph)) * 4; if (m.phase !== 'goal' && t - wave < 3 && Math.abs((f.x / 1120) * 3 - (t - wave)) < .3) up += 5;
      r.queue(f.x, f.y, f.z + up, g => { const [x, y] = r.w(f.x, f.y, f.z + up), X = Math.round(x), Y = Math.round(y); px.rect(g, X - 2, Y - 5, 4, 5, f.c); px.rect(g, X - 1, Y - 8, 3, 3, f.sk); if (up > 3) { px.rect(g, X - 3, Y - 9, 1, 4, f.sk); px.rect(g, X + 3, Y - 9, 1, 4, f.sk); } if (f.sign && m.phase !== 'intro') { px.rect(g, X - 8, Y - 17, 16, 7, '#f4f0e0'); E.font.text(g, f.sign.slice(0, 7), X, Y - 16, '#222', { align: 'center', font: 'tiny', outline: false }); } });
    }
  }
  const setExc = v => { exc = clamp(v, 0, 1); };
  return { build, draw, add(v) { exc = clamp(exc + v, 0, 1); }, step(dt) { exc = Math.max(0, exc - dt * .08); }, get exc() { return exc; }, wave() { wave = game.time; }, reset() { exc = 0; } };
})();

const Talk = (() => {
  let dlg = null, bubbles = [], lastSay = -99, lastType = {}, lastLine = {}, quiet = 0, tipsShown = {}, tip = null;
  const booth = () => ({ chuck: Rigs.portrait && Rigs.PEOPLE.chuck, moose: Rigs.PEOPLE.moose });
  let portraits = null;
  function init() { dlg = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#ffd36a', alpha: .85, speed: 40 }); }
  function fill(s, v) { return s.replace(/\{(\w+)\}/g, (_, k) => v[k] != null ? v[k] : ''); }
  function say(type, vars = {}, o = {}) {
    if (S('commentary') === 'Off') return; const m = Match.cur(); const now = game.time; const pool = TEXT.talk[type]; if (!pool) return;
    if (now - lastSay < (o.force ? 0 : 1.2) || now - (lastType[type] || -99) < (o.cool != null ? o.cool : 6)) return;
    let line = pool[(RNG.fx() * pool.length) | 0]; for (let i = 0; i < 4 && lastLine[line] && now - lastLine[line] < 120; i++) line = pool[(RNG.fx() * pool.length) | 0];
    lastLine[line] = now; lastType[type] = now; lastSay = now; quiet = 0;
    let who = 'CHUCK'; if (/^Moose:/.test(line)) { who = 'MOOSE'; line = line.replace(/^Moose:\s*/, ''); }
    const text = fill(line, vars); speak(who, text);
  }
  function speak(who, text, o = {}) {
    const vk = who === 'MOOSE' ? 'moose' : 'chuck';
    if (S('subtitles') === 'Off' || !dlg) { Synth.babble(text, vk, { excl: /!/.test(text) }); return; }
    if (!portraits) portraits = { CHUCK: Rigs.PEOPLE.chuck(), MOOSE: Rigs.PEOPLE.moose() };
    dlg.voice = Synth.dialogVoice(vk);
    dlg.say(text, { name: who, portrait: portraits[who], auto: o.auto || 2.5, modal: false, alpha: .85 });
  }
  function bubble(s, text) { bubbles.push({ s, text, t: 2 }); if (bubbles.length > 4) bubbles.shift(); Synth.babble(text, s.def[10], { excl: true }); }
  function update(dt) {
    if (dlg) dlg.update(dt); for (const b of bubbles) b.t -= dt; bubbles = bubbles.filter(b => b.t > 0);
    const m = Match.cur(); if (m && m.phase === 'play') { quiet += dt; if (quiet > 14 && game.time - lastSay > 8) { quiet = 0; say('filler', {}, { cool: 30 }); } }
  }
  function draw(r) {
    for (const b of bubbles) { const s = b.s; r.queue(s.x, s.y, 60, g => { const [x, y] = r.w(s.x, s.y, 58), lines = E.font.wrap(b.text, 90, { font: 'tiny' }), h = lines.length * 7 + 4, w = 94; const X = Math.round(x - w / 2), Y = Math.round(y - h - 4); px.rect(g, X, Y, w, h, '#fffbe8'); px.rect(g, X, Y, w, 1, '#222'); px.rect(g, X, Y + h - 1, w, 1, '#222'); px.rect(g, X, Y, 1, h, '#222'); px.rect(g, X + w - 1, Y, 1, h, '#222'); lines.forEach((l, i) => E.font.text(g, l, X + 3, Y + 2 + i * 7, '#222', { font: 'tiny', outline: false })); }, { emissive: true }); }
    if (dlg) dlg.draw(r);
  }
  function showTip(key, chipsOnly) {
    if (S('tips') === 'Off' || tipsShown[key] || !TEXT.tips[key]) return; tipsShown[key] = true; try { E.store.set('ihk:tips', tipsShown); } catch (e) {} tip = { text: TEXT.tips[key], t: 5 };
  }
  function drawTip(g, r, dt) { if (!tip) return; tip.t -= dt; if (tip.t <= 0) { tip = null; return; } const tw = Glyphs.width(tip.text), w = Math.min(r.W - 8, tw + 16); UI.box(g, r.W / 2 - w / 2, 38, w, 16, { border: '#4fe3a1', alpha: .92 }); Glyphs.text(g, tip.text, r.W / 2, 46, { align: 'center', color: '#e8fff0' }); }
  return { init, say, speak, bubble, update, draw, showTip, drawTip, reset() { bubbles = []; tip = null; lastType = {}; lastSay = -99; quiet = 0; if (dlg) dlg.close && dlg.close(); }, loadTips() { try { tipsShown = E.store.get('ihk:tips', {}) || {}; } catch (e) { tipsShown = {}; } }, resetTips() { tipsShown = {}; try { E.store.set('ihk:tips', {}); } catch (e) {} } };
})();
