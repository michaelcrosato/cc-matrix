/* ---- HUD: big, few, readable from the couch. Prompts follow the device used last ---- */
const TX = { shadow: '#000', outline: false };
let logOpen = false, hot = null, runT = 0, runLen = 180;

function bar(g, x, y, w, label, v, max, col, o = {}) {
  E.font.text(g, label, x, y, o.labelColor || '#f4ecd8', TX);
  const bx = x + 38, k = clamp(v / max, 0, 1);
  px.rect(g, bx - 1, y - 1, w + 2, 9, '#0a0608'); px.rect(g, bx, y, w, 7, '#2a2028');
  if (o.lag !== undefined) px.rect(g, bx, y, Math.round(w * clamp(o.lag / max, 0, 1)), 7, '#e8e0d0');
  px.rect(g, bx, y, Math.round(w * k), 7, col); px.rect(g, bx, y, Math.round(w * k), 2, E.shade(col, .3));
  if (o.flash) px.blend(g, .5, 'add', () => px.rect(g, bx, y, Math.round(w * k), 7, '#ffffff'));
}
function drawHud(r) {
  r.overlay(g => {
    const W = r.W, H = r.H, corner = game.cornerArea ? game.cornerArea() : null, rightPad = corner ? Math.max(8, W - corner.x0 + 4) : 8;
    // top left: health, stress, heat
    E.ui.box(g, 4, 4, 140, S.mode === 'run' ? 30 : 40, { bg: ['#1a1216', '#0a0608'], border: '#6a5a4a', alpha: .82 });
    bar(g, 9, 9, 96, 'HEALTH', hero.hp, hero.max, '#d83a3a', { lag: hero.lag * hero.max });
    const rage = S.stress > 75;
    bar(g, 9, 20, 96, rage ? 'RAGE!' : 'STRESS', S.stress, 100, rage ? '#ff5a2a' : '#a86ad8', { flash: rage && (game.time * 6 | 0) % 2, labelColor: rage ? '#ff8a6a' : undefined });
    if (S.mode !== 'run' || van) bar(g, 9, S.mode === 'run' ? 20 + 11 : 31, 96, 'HEAT', S.heat, 100, van && van.alert > 0 ? '#ffffff' : '#4a8ae8');
    if (hero2) { E.ui.box(g, 4, 48, 140, 14, { bg: ['#1a1216', '#0a0608'], border: '#6a5a4a', alpha: .82 }); bar(g, 9, 52, 96, 'CHRISSY', hero2.hp, hero2.max, '#3ab0d8'); }
    // top right: money, respect, ammo
    const rx = W - rightPad;
    E.font.text(g, fmt$(S.money), rx, 6, '#8af08a', { align: 'right', scale: 2, shadow: '#000', outline: false });
    E.font.text(g, '★ ' + S.respect + ' RESPECT', rx, 23, '#f0c860', Object.assign({ align: 'right' }, TX));
    if (S.ch >= 3 || S.mode === 'run') E.font.text(g, 'AMMO ' + S.ammo, rx, 33, S.ammo ? '#e8e8f0' : '#ff6a5a', Object.assign({ align: 'right' }, TX));
    if (S.mode === 'run') { const left = Math.max(0, runLen - runT); E.font.text(g, (left / 60 | 0) + ':' + String(Math.floor(left % 60)).padStart(2, '0'), W / 2, 6, left < 20 ? '#ff6a5a' : '#ffffff', { align: 'center', scale: 2, shadow: '#000', outline: false }); }
    // the objective
    const st = STEPS[S.step];
    if (S.mode !== 'run' && st && st.title && !attract) {
      const ot = 'CH.' + S.ch + '  ' + st.title.toUpperCase(), ow = E.font.width(ot) + 14;
      E.ui.box(g, Math.round(W / 2 - ow / 2), 2, ow, 13, { bg: ['#1a1216', '#0a0608'], border: '#6a5a4a', alpha: .82 });
      E.font.text(g, ot, W / 2, 5, '#f4ecd8', { align: 'center', shadow: '#000', outline: false });
      const tgt = st.at && st.at();
      if (tgt && tgt[0] !== A.id) E.font.text(g, '→ ' + (tgt[0] === 'town' ? 'Head outside' : 'Go into ' + area(tgt[0]).name), W / 2, 16, '#c8b890', Object.assign({ align: 'center' }, TX));
    }
    // notes
    let ny = 28; for (const n of notes) { const a = clamp(n.t, 0, 1); if (a > .3 || (game.time * 8 | 0) % 2) E.font.text(g, n.text, W / 2, ny, '#ffe8a0', Object.assign({ align: 'center' }, TX)); ny += 10; }
    // the prompt for what's in reach, or the car's controls
    const bottom = H - 22;
    if (!talk.open && !logOpen && !attract) {
      if (driving) promptRow(g, W / 2, bottom, [['gas', 'Gas'], ['brake', 'Brake'], ['interact', 'Get out'], ['horn', 'Horn']], { center: true, panel: true });
      else if (hot && hot.label) promptRow(g, W / 2, bottom, [['interact', hot.label]], { center: true, panel: true });
      else if (game.settings.hints && (S.ch >= 3 || fightOn || S.mode === 'run')) promptRow(g, 8, H - 16, [['attack', 'Punch'], ['heavy', 'Haymaker'], ['dodge', 'Roll'], ['fire', 'Pistol'], ...(S.flags.breathe ? [['breathe', 'Breathe']] : [])], { color: '#d8d0c0' });
      else if (game.settings.hints) promptRow(g, 8, H - 16, [['interact', 'Use'], ['sprint', 'Run'], ['log', 'Job log'], ['view', 'Camera']], { color: '#d8d0c0' });
    }
    if (breathing) { const k = (Math.sin(game.time * 1.6) + 1) / 2; E.font.text(g, k > .5 ? 'IN... 2... 3... 4' : 'OUT... 2... 3... 4', W / 2, H / 2 + 40, '#c8e0ff', { align: 'center', scale: 2, shadow: '#000', outline: false }); }
    // the fight's foes: the nearest's bar
    const tgtFoe = foes.filter(f => !f.dead).sort((a, b) => E.dist(a, hero) - E.dist(b, hero))[0];
    if (tgtFoe && E.dist(tgtFoe, hero) < 120) { const w = tgtFoe.k.boss ? 160 : 90; E.font.text(g, tgtFoe.name, W / 2, H - 46, tgtFoe.k.boss ? '#ff8a6a' : '#f4ecd8', { align: 'center', shadow: '#000', outline: false }); px.rect(g, W / 2 - w / 2 - 1, H - 37, w + 2, 6, '#0a0608'); px.rect(g, W / 2 - w / 2, H - 36, Math.round(w * clamp(tgtFoe.hp / tgtFoe.max, 0, 1)), 4, '#e8603a'); }
    // the chapter's title card
    if (chapterCard > 0 && S.mode !== 'run') {
      const a = clamp(chapterCard, 0, 1), y = Math.round(H * .3);
      px.blend(g, .5 * a, 'normal', () => px.rect(g, 0, y - 8, W, 52, '#000000'));
      if (a > .3) { E.font.text(g, 'CHAPTER ' + S.ch, W / 2, y, '#c8a060', { align: 'center', shadow: '#000', outline: false }); E.font.title(g, CHAPTERS[S.ch].title.toUpperCase(), W / 2, y + 14, { scale: 2, align: 'center', colors: ['#fff6e0', '#e8c070', '#a8702a'], outline: '#1a0c08', depth: 2, depthColor: '#4a2a10' }); }
    }
    if (attract) {
      E.font.title(g, 'THE SOPRANIACS', W / 2, H - 46, { scale: 2, align: 'center', colors: ['#ffffff', '#e83a3a', '#8a1a1a'], outline: '#100404', depth: 2, depthColor: '#3a0808' });
      if ((game.real * 2 | 0) % 2) E.font.text(g, touchOnly() ? 'DEMO  •  TAP TO RETURN' : 'DEMO  •  PRESS ANY BUTTON', W / 2, H - 20, '#ffffff', { align: 'center', scale: 1, shadow: '#000', outline: false });
    }
    if (logOpen) drawLog(g, W, H);
    if (HUB && hubCountdown() > 0) { const c = hubCountdown() >= 99 ? 'GET READY' : String(Math.ceil(hubCountdown())); E.font.title(g, c, W / 2, H / 2 - 20, { scale: c.length > 2 ? 2 : 4, align: 'center' }); E.font.text(g, 'COLLECTION RUN: grab the most cash before time is up', W / 2, H / 2 + 20, '#ffffff', { align: 'center', shadow: '#000', outline: false }); }
  });
}
// the job log: one panel, a few big lines
function drawLog(g, W, H) {
  px.blend(g, .6, 'normal', () => px.rect(g, 0, 0, W, H, '#000000'));
  const w = Math.min(300, W - 20), h = 180, x = Math.round((W - w) / 2), y = Math.round((H - h) / 2);
  E.ui.box(g, x, y, w, h, { bg: ['#2a1c18', '#0e0806'], border: '#c8a060' });
  E.font.text(g, 'JOB LOG', x + w / 2, y + 8, '#f0c860', { align: 'center', scale: 2, shadow: '#000', outline: false });
  const st = STEPS[S.step];
  E.font.text(g, 'CHAPTER ' + S.ch + ': ' + CHAPTERS[S.ch].title.toUpperCase(), x + 12, y + 30, '#c8a060', TX);
  E.font.text(g, (st && st.title) || 'Free roam', x + 12, y + 44, '#ffffff', { scale: 1, shadow: '#000', outline: false });
  E.font.text(g, (st && st.text) || '', x + 12, y + 56, '#d8d0c0', { wrap: w - 24, shadow: '#000', outline: false });
  let ly = y + 92;
  if (S.ch === 3) for (const k of ['pastry', 'vesuvio', 'club']) { E.font.text(g, (S.jobs[k] ? '★ ' : '• ') + 'Envelope: ' + JOB_SPOTS[k][3], x + 16, ly, S.jobs[k] ? '#8af08a' : '#f4ecd8', TX); ly += 11; }
  if (S.ch === 3) { E.font.text(g, (S.flags.ma ? '★ ' : '• ') + 'Optional: visit Ma at Green Groves', x + 16, ly, S.flags.ma ? '#8af08a' : '#c8b890', TX); ly += 11; }
  E.font.text(g, 'Ducks lower stress. Gabagool heals. Heat 100: arrested. Stress 100: panic attack.', x + 12, y + h - 38, '#a89880', { wrap: w - 24, shadow: '#000', outline: false });
  promptRow(g, x + w / 2, y + h - 14, [['log', 'Close']], { center: true });
}
