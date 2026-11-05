/* BASKETBLAM - match HUD, banners, announcers, and the event wiring that makes every moment loud */

/* ---- announcers (two hype commentators, gibberish voices) ---- */
const talk = new E.Dialog(game, { lines: 2, place: 'bottom', border: '#ffd36a', speed: 46 });
const speakerRigs = {};
const speakerRig = k => speakerRigs[k] || (speakerRigs[k] = makeSpeakerRig(k));
let annT = 0, annWho = 0, annPrio = 0;
function say(key, text, prio = 1, o = {}) {
  if (game.settings.announcer === 'Off' && !o.force) return;
  if (S.mode === 'attract' && !o.force) return;
  if (talk.open && prio < annPrio && annT < 2.5) return;
  const v = VOICES[key]; talk.voice = voiceFor(key); annPrio = prio; annT = 0;
  talk.say(text, { name: v.name, portrait: speakerRig(key), portraitSize: 30, auto: o.auto || 1.5, modal: o.modal === true, alpha: .86, nameColor: v.color });
}
function announce(kind, data = {}, prio = 1) {
  const bank = LINES[kind]; if (!bank) return;
  let s = pick(bank); const p = data.p !== undefined ? S.players[data.p] : null;
  s = s.replace('{n}', p ? p.name : 'SOMEBODY').replace('{a}', data.a !== undefined ? S.players[data.a].name : '').replace('{b}', data.b !== undefined ? S.players[data.b].name : '')
    .replace('{p}', data.pname || '').replace('{w}', data.w || '').replace('{score}', data.score || '').replace('{t}', data.t || '');
  annWho ^= 1; say(annWho ? 'RICO' : 'LOU', s, prio);
}

/* ---- the HUD ---- */
function drawHud(g, r) {
  const M = S.match; if (!M) return;
  const W = r.W, H = r.H, cx = W / 2, h = TEAMS[S.teams[0]], a = TEAMS[S.teams[1]];
  // score bug
  const bw = 196, bx = Math.round(cx - bw / 2), by = 4;
  panel(g, bx, by, bw, 26, { bg: ['#14162a', '#0a0b16'], border: '#8a8ec8', alpha: .92 });
  px.rect(g, bx + 3, by + 3, 4, 20, h.color); px.rect(g, bx + bw - 7, by + 3, 4, 20, a.color);
  txt(g, h.short, bx + 10, by + 4, '#f0ecff', { font: 'tiny' });
  txt(g, a.short, bx + bw - 10, by + 4, '#f0ecff', { font: 'tiny', align: 'right' });
  txt(g, String(M.score[0]), bx + 30, by + 11, '#ffffff', { scale: 2 }); txt(g, String(M.score[1]), bx + bw - 30, by + 11, '#ffffff', { scale: 2, align: 'right' });
  const ql = M.sudden ? 'SUDDEN BLAM' : M.ot ? 'OT' + M.ot : 'Q' + M.quarter;
  txt(g, mmss(M.clock), cx, by + 4, M.clock < 10 ? '#ff6a4a' : '#ffe08a', { align: 'center', scale: 1 });
  txt(g, ql, cx, by + 14, '#9ab0ff', { align: 'center', font: 'tiny' });
  const sc = Math.max(0, Math.ceil(M.shotClock)); txt(g, String(sc), cx, by + 20, sc <= 5 ? '#ff4a3a' : '#c8c8e8', { align: 'center', font: 'tiny' });
  if (M.novaT[0] > 0) { txt(g, '★ SUPERNOVA', bx, by + 29, '#ff9a3a', { font: 'tiny' }); }
  if (M.novaT[1] > 0) { txt(g, 'SUPERNOVA ★', bx + bw, by + 29, '#ff9a3a', { font: 'tiny', align: 'right' }); }
  // streak pips
  for (let t = 0; t < 2; t++) for (let i = 0; i < Math.min(M.streak[t], tune('novaStreak')); i++) px.rect(g, t ? bx + bw - 14 - i * 5 : bx + 10 + i * 5, by + 24, 4, 2, '#ff8a2a');
  // power-up timers
  S.players.forEach(p => { if (p.pu) { const d = POWERUPS.find(q => q.id === p.pu); const x = p.team ? W - 70 : 6, y = 40 + (p.slot % 2) * 12; txt(g, d.name, x, y, d.color, { font: 'tiny' }); E.ui.bar(g, x, y + 7, 50, 2, p.puT / d.dur, d.color); } });
  // banners
  S.fx.banners.forEach((b, i) => {
    const u = b.t / b.life, a1 = u < .12 ? u / .12 : u > .8 ? (1 - u) / .2 : 1, sc = b.scale * (u < .1 ? 1 + (1 - u / .1) * .6 : 1);
    px.blend && px.blend(g, clamp(a1, 0, 1), 'normal', () => bigText(g, b.text, cx + (b.shake ? (Math.random() - .5) * b.shake : 0), Math.round(H * b.y) - i * 0, { scale: Math.max(1, Math.round(sc)), colors: b.colors }));
    if (!px.blend) bigText(g, b.text, cx, Math.round(H * b.y), { scale: Math.round(sc), colors: b.colors });
  });
  // phase captions
  if (M.phase === 'tip') {
    const t = M.tip; if (t) { const human = t.jumpers.find(p => p.input); if (human) { txt(g, 'JUMP BALL!', cx, H * .5 - 40, '#ffffff', { align: 'center', scale: 2 }); drawPrompts(g, [['shoot', 'JUMP AT THE TOP']], cx, H * .5 - 22); } }
  }
  if (M.phase === 'inbound' && M.inbound && M.inbound.who.input && !M.inbound.thrown) drawPrompts(g, [['pass', 'THROW IT IN']], cx, H * .62);
  if (M.phase === 'break') drawBreak(g, r);
  if (S.fx.flash > 0) { px.blend && px.blend(g, clamp(S.fx.flash, 0, 1) * .6, 'add', () => px.rect(g, 0, 0, W, H, '#ffffff')); }
  // controls hint, first seconds
  if (M.time < 14 && S.mode !== 'attract' && S.mode !== 'camp' && M.phase !== 'end') {
    const list = [['shoot', 'SHOOT'], ['pass', 'PASS'], ['turbo', 'TURBO'], ['shove', 'SHOVE']];
    drawPrompts(g, list, cx, H - 15);
  }
  if (S.dev.overlay) drawDevOverlay(g, r);
  if (!S.dev.open && !S.howto) talk.draw(r);
  if (S.mode === 'attract') { txt(g, 'DEMO - PRESS ANY BUTTON', cx, H - 30, '#ffe08a', { align: 'center' }); }
}
function drawBreak(g, r) {
  const M = S.match, W = r.W, H = r.H, cx = W / 2;
  px.rect(g, 0, 0, W, H, '#00000099'.slice(0, 7)); px.blend && px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, W, H, '#05040a'));
  const kind = M.breakKind, title = kind === 'half' ? 'HALFTIME REPORT' : kind === 'ot' ? 'OVERTIME!' : kind === 'sudden' ? 'SUDDEN BLAM!' : 'END OF Q' + M.quarter;
  panel(g, cx - 130, 38, 260, 150);
  bigText(g, title, cx, 46, { scale: 2 });
  const h = TEAMS[S.teams[0]], a = TEAMS[S.teams[1]];
  txt(g, h.name, cx - 120, 76, h.color); txt(g, a.name, cx + 120, 76, a.color, { align: 'right' });
  txt(g, String(M.score[0]), cx - 40, 70, '#fff', { scale: 3, align: 'center' }); txt(g, String(M.score[1]), cx + 40, 70, '#fff', { scale: 3, align: 'center' });
  const rows = [['POINTS', 'pts'], ['DUNKS', 'dunks'], ['BLOCKS', 'blocks'], ['STEALS', 'steals']];
  rows.forEach(([lb, k], i) => {
    const hv = S.players[0].st[k] + S.players[1].st[k], av = S.players[2].st[k] + S.players[3].st[k], y = 104 + i * 12;
    txt(g, String(hv), cx - 60, y, '#e8e4f8', { align: 'center' }); txt(g, lb, cx, y, '#9a9ac8', { align: 'center', font: 'tiny' }); txt(g, String(av), cx + 60, y, '#e8e4f8', { align: 'center' });
  });
  if (kind === 'half') { const gag = HALFTIME_GAGS[(M.score[0] + M.score[1]) % HALFTIME_GAGS.length]; txt(g, gag, cx, 160, '#ffd36a', { align: 'center', font: 'tiny' }); }
  else if (kind === 'ot' || kind === 'sudden') txt(g, kind === 'ot' ? 'ALL TIED UP. ONE MORE MINUTE.' : 'NEXT BASKET WINS. NO PRESSURE.', cx, 160, '#ffd36a', { align: 'center', font: 'tiny' });
  else txt(g, 'Catch your breath. Back in ' + Math.ceil(M.breakT) + '.', cx, 160, '#c8c8e8', { align: 'center', font: 'tiny' });
}

/* ---- event wiring: announcer, banners, sound, camera ---- */
let wired = false;
function wireEvents() {
  if (wired) return; wired = true;
  const P0 = i => S.players[i];
  on('tipoff', e => { announce('tipoff', { a: e.a, b: e.b }, 2); sfx('whistle'); });
  on('basket', e => {
    const p = P0(e.p), M = S.match; sfx('cheer'); S.fx.shake = Math.max(S.fx.shake, 2);
    rumble(p, .4, .15);
    if (e.dunk) {
      const d = DUNKS.find(x => x.id === e.dunk); banner(d.name + '!', { colors: ['#fffbe8', '#ffd36a', '#ff5a2a'], scale: 3, life: 1.5 });
      announce(DUNKS.indexOf(d) >= 5 ? 'bigdunk' : 'dunk', { p: e.p }, 3); sting('dunk');
      if (e.oop) { announce('oop', { p: e.p }, 4); banner('ALLEY-OOP!', { y: .24, scale: 2, colors: ['#ffffff', '#8affc0', '#20c080'] }); }
    } else if (e.three) { banner('THREE-POINTER!', { scale: 2, colors: ['#fffbe8', '#8ad0ff', '#2a8aff'] }); announce('three', { p: e.p }, 2); sting('basket'); }
    else { announce(e.perfect ? 'perfect' : 'two', { p: e.p }, 1); }
    if (e.bonus === 'gold') banner('GOLD BALL: DOUBLE!', { y: .24, scale: 2, colors: ['#fff6c0', '#ffd23a', '#e89010'] });
    if (e.bonus === 'jackpot') { banner('JACKPOT +2!', { y: .24, scale: 2, colors: ['#fff6c0', '#ffd23a', '#e89010'] }); sfx('jackpot'); announce('jackpot', {}, 3); }
    if (e.perfect && !e.dunk) sfx('perfect');
    P.glints && P.glints(HOOPS[e.team === 0 ? 1 : 0].x, HOOPS[e.team === 0 ? 1 : 0].y, RIM_Z, 6);
    S.players.forEach(q => { if (q.team === e.team) q.cheer = 1.2; });
    if (e.dunk) { const h = attackHoop(e.team); S.fx.cam = 1; S.fx.camX = h.x; game.timeScale = 1; }
  });
  on('dunkStart', e => { const p = P0(e.p); rumble(p, .5, .3); });
  on('release', e => { /* nothing loud */ });
  on('block', e => { banner('REJECTED!', { colors: ['#ffffff', '#ff9a8a', '#e83a2a'], scale: 3, life: 1.2 }); announce('block', { p: e.p }, 3); sfx('slam', { vol: .6 }); S.players[e.p].cheer = .8; });
  on('steal', e => { banner('STOLEN!', { scale: 2, colors: ['#ffffff', '#aee8ff', '#3a9ae8'], life: .9 }); announce('steal', { p: e.p }, 1); });
  on('shove', e => { banner('SHOVED!', { scale: 2, y: .4, colors: ['#ffffff', '#ffc08a', '#e8601a'], life: .8 }); announce('shove', { p: e.p }, 1); });
  on('fumble', e => announce('fumble', {}, 1));
  on('supernovaOn', e => { banner('SUPERNOVA!', { scale: 4, colors: ['#ffffff', '#ffd36a', '#ff3a1a'], life: 2, shake: 2 }); announce('nova', { p: e.p }, 4); sfx('nova'); sting('nova'); S.fx.flash = .8; S.players.filter(p => p.team === e.team).forEach(p => p.turbo = 1); });
  on('supernovaOff', e => { sfx('novaOff'); announce('novaOff', {}, 2); });
  on('shatter', e => { announce('shatter', {}, 5); });
  on('goaltend', e => { banner('GOALTEND!', { scale: 3, colors: ['#ffffff', '#ffe08a', '#e8a010'] }); announce('goaltend', {}, 3); sfx('whistle'); });
  on('powerupPick', e => { const d = POWERUPS.find(q => q.id === e.id); banner(d.name + '!', { scale: 2, colors: ['#ffffff', d.color, d.color], y: .28, life: 1.2 }); announce('power', { p: e.p, pname: d.name }, 2); });
  on('shotClockViolation', e => { banner('SHOT CLOCK!', { scale: 3, colors: ['#ffffff', '#ff9a8a', '#e83a2a'] }); announce('clock', {}, 2); });
  on('quarterEnd', e => { announce(S.match.quarter === 2 ? 'half' : 'quarter', { score: S.match.score[0] + ' TO ' + S.match.score[1] }, 3); sfx('cheer'); });
  on('overtime', e => { banner('OVERTIME!', { scale: 4, colors: ['#ffffff', '#ffd36a', '#ff3a1a'], life: 2 }); announce('overtime', {}, 4); });
  on('sudden', e => { banner('SUDDEN BLAM!', { scale: 4, colors: ['#ffffff', '#ffd36a', '#ff3a1a'], life: 2 }); announce('sudden', {}, 4); });
  on('gameEnd', e => { const w = e.winner < 0 ? 'NOBODY' : TEAMS[S.teams[e.winner]].name; announce('end', { w }, 6); sfx('buzzer'); sfx('cheer'); });
  on('taunt', e => { const p = P0(e.p); if (S.mode !== 'attract') say(p.team ? 'LOU' : 'RICO', p.name + ': ' + e.text, 1); });
  on('alleyoop', e => { });
  on('spin', e => { });
  on('inbound', e => { });
  on('powerupSpawn', e => { sfx('tick', { vol: 1.2 }); });
}
