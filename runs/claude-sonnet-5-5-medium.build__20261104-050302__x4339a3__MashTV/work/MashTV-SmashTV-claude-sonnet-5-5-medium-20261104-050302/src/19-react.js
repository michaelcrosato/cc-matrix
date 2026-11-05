// MASH TV: the broadcast layer. Gameplay emits events; this table turns them into lines, crowd, stings and banners (cosmetic only: safe on hub clients).
MT.hud = MT.hud || { banner() {}, popup() {}, tutorial() {} };   // replaced by 31-hud
const lines = MT.lines = { cur: null, q: [], lastQuip: -99, now: 0, last: null };
lines.allowed = prio => { if (MT.cheats && MT.cheats.muteChatter && prio < 3) return false; const c = MT.game && MT.game.settings.chatter; if (prio >= 3) return true; if (c === 'Off') return prio >= 2 && false; if (c === 'Less') return prio >= 1; return true; };
lines.say = function (spk, text, o = {}) {
  const prio = o.prio === undefined ? 1 : o.prio;
  if (!lines.allowed(prio) && !o.force) return null;
  if (prio === 0) { if (lines.now - lines.lastQuip < 6) return null; lines.lastQuip = lines.now; }
  const item = { spk, text, prio, hint: o.hint, done: false, t: 0, dur: 0, voice: o.voice, silent: !!o.silent };
  if (lines.cur && prio > lines.cur.prio) { lines.cur.done = true; lines.cur = null; lines.q = lines.q.filter(q => q.prio >= prio); }
  else if (lines.cur && prio === 0) return null;
  if (lines.cur) { if (lines.q.length < 4) lines.q.push(item); } else lines.start(item);
  return item;
};
lines.start = function (item) {
  lines.cur = item; item.t = 0;
  const voice = item.voice || ({ LANCE: 'lance', PENNY: 'penny', ANNC: 'annc', NETWORK: 'network', MASHY: 'mashy', SPONSOR: 'lance' }[item.spk] || 'lance');
  item.dur = MT.babble ? MT.babble.say(item.text, voice, { emotion: 1 }) : item.text.length / 14; item.dur = Math.max(.8, item.dur);
  if (MT.audioDuck) MT.audioDuck(item.dur + .4);
};
lines.update = function (dt) {
  lines.now += dt; const c = lines.cur; if (!c) return;
  c.t += dt; if (c.t > c.dur + .9 || c.skip) { c.done = true; lines.cur = null; if (lines.q.length) { lines.q.sort((a, b) => b.prio - a.prio); lines.start(lines.q.shift()); } }
};
lines.skip = function () { if (lines.cur) lines.cur.skip = true; };
lines.clear = function () { lines.cur = null; lines.q = []; };
lines.shown = function () { const c = lines.cur; if (!c) return ''; const n = Math.ceil(c.text.length * Math.min(1, c.t / (c.dur * .92))); return c.text.slice(0, n); };
// a cutscene line: returns a handle {done}; yield E.until(() => h.done)
lines.cut = function (spk, text, o = {}) { const it = lines.say(spk, MT.sub(text, o.vars || {}), { prio: 3, force: true, voice: o.voice }); return it || { done: true }; };
const pool = (key, vars) => { const p = MT.TEXT.pool[key]; const i = (lines.pi = lines.pi || {}); i[key] = ((i[key] || 0) + 1 + Math.floor(MT.fxr() * 3)) % p.length; return MT.sub(p[i[key]], vars); };
MT.react = {
  handle(w, ev) {
    const d = ev.data, g = w.game, S = MT.sfx, C = MT.crowd, hud = MT.hud, T = MT.TEXT;
    switch (ev.name) {
      case 'shot': S('shot_' + d.w, { x: 1 }); break;
      case 'laser': S('laser'); break;
      case 'slide': S('slide'); break;
      case 'hit': S('hitE'); break;
      case 'kill': S('pop'); break;
      case 'boom': S('boom'); break;
      case 'rocketBoom': S('rocketBoom'); break;
      case 'pop': S('popcorn'); break;
      case 'swing': S('baton'); break;
      case 'clap': S('clap'); break;
      case 'popperBurst': S('popperPop'); break;
      case 'fuse': S('fuse'); break;
      case 'mimeBeep': S('beep'); break;
      case 'mimeBlast': S('mimeBlast'); break;
      case 'mimePfft': S('pfft'); break;
      case 'beam': S('beam'); break;
      case 'throw': S('boo'); break;
      case 'splat': S('splat'); break;
      case 'lens': S('lens'); break;
      case 'shell': S('shell'); break;
      case 'roar': S('roar'); break;
      case 'stomp': S('stomp'); break;
      case 'wallCrash': S('crash'); break;
      case 'tink': S('tink'); break;
      case 'bossHit': S('bossHit'); break;
      case 'doorOpen': S('doorOpen'); break;
      case 'doorSlam': S('doorSlam'); break;
      case 'pyro': S('pyro'); break;
      case 'beltAlarm': S('alarm'); break;
      case 'wheelClick': S('wheelClick'); break;
      case 'drop': S('zip'); break;
      case 'land': S('land'); break;
      case 'cageOpen': S('fanfare'); hud.banner('KEY CAGE OPEN!', '#ffcc33', 1.6); break;
      case 'safeOpen': S('fanfare'); hud.banner('THE SAFE IS OPEN!', '#ffcc33', 1.6); break;
      case 'cash': { const c = w.cs.find(q => q.slot === d.slot); if (d.amt > 0 && !d.kill || (d.kill && c)) { g.particles.text(d.x, d.y, 14, '+' + MT.fmt$(d.amt), c ? c.color : '#ffd23a', { scale: d.amt >= 5000 ? 2 : 1 }); } if (!d.kill) S('cash'); else S('coin'); break; }
      case 'bomb': S('bomb'); C('gasp', .5); hud.banner('SHOWSTOPPER!', '#ffffff', .8); break;
      case 'showboat': { S('flourish'); C('cheer', Math.min(1, d.gain / 20)); g.particles.text(d.x, d.y, 30, 'STYLE +' + Math.round(d.gain), '#ff8ad8', { scale: 2 }); if (d.gain >= 10) lines.say('LANCE', pool('boat'), { prio: 0 }); break; }
      case 'multikill': C('cheer', .6); lines.say('LANCE', d.n >= 6 ? T.pool.multi[2] : d.n >= 4 ? T.pool.multi[1] : T.pool.multi[0], { prio: 0 }); break;
      case 'hurt': S('buzzer'); C('ooh', .6); if (MT.fxr() < .5) lines.say('LANCE', pool('hurt'), { prio: 0 }); break;
      case 'lowHp': lines.say('LANCE', pool('low'), { prio: 1 }); break;
      case 'death': S('death'); C('laugh', .7); hud.banner('MASHED!', '#ff3344', 1.4); lines.say('LANCE', pool('death', { NAME: d.name }), { prio: 1 }); break;
      case 'out': hud.banner('OUT OF LIVES!', '#ff3344', 1.4); break;
      case 'rejoin': S('oneup'); break;
      case 'weapon': { S('powerup'); const W = MT.WEAPONS[d.w]; if (W) hud.banner(W.name + '!', '#7affb0', 1.1); break; }
      case 'capsule': g.particles.glints(d.x, d.y, 12, 6, '#fff'); break;
      case 'expire': S('expire'); hud.banner('BACK TO BASICS', '#c8c0e0', .9); break;
      case 'pickup': S('powerup'); break;
      case 'prize': { S('prizeFanfare'); hud.banner('YOU WON: ' + d.name + '! (' + MT.fmt$(d.value) + ')', '#ffcc33', 2.4); C('cheer', .6); lines.say('PENNY', 'OOOH! ' + d.name + '! ' + d.joke, { prio: 1 }); break; }
      case 'key': { S('keyChime'); if (d.bonus) hud.banner('KEY BONUS +$10,000!', '#ffcc33', 1.4); else hud.banner('GOLDEN KEY ' + d.n + '/' + MT.KEYS_TOTAL, '#ffcc33', 1.8); if (d.first) lines.say('LANCE', T.pool.key[0], { prio: 1 }); else lines.say('LANCE', T.pool.key[1], { prio: 0 }); break; }
      case 'mimeKey': lines.say('LANCE', T.pool.mime[0], { prio: 1 }); break;
      case 'life': S('oneup'); hud.banner('ENCORE!', '#ffcc33', 1.4); lines.say('LANCE', T.pool.life[0], { prio: 0 }); break;
      case 'prime': S('primeSting'); hud.banner('PRIME TIME!', '#ff2e88', 2); C('cheer', 1); if (MT.music) MT.music.layer('prime', 1); lines.say('LANCE', pool('prime'), { prio: 1 }); break;
      case 'primeEnd': if (MT.music) MT.music.layer('prime', 0); break;
      case 'stunt': hud.banner("WE'RE LOSING VIEWERS!", '#ff3344', 2); S('alarm'); lines.say('LANCE', pool('stunt'), { prio: 1 }); break;
      case 'bankrupt': S('bankrupt'); hud.banner('BANKRUPT!', '#ff3344', 1.6); break;
      case 'jackpot': S('fanfare'); break;
      case 'spinAgain': hud.banner('SPIN AGAIN!', '#2ee6ff', 1.2); break;
      case 'wheelStop': hud.banner(MT.WHEEL_SEGS[d.seg] + '!', '#ffcc33', 1.6); S('drumHit'); lines.say('LANCE', MT.WHEEL_SEGS[d.seg] + '!', { prio: 2 }); break;
      case 'wheelBreaks': hud.banner('THE WHEEL BREAKS LOOSE!', '#ff3344', 2); lines.say('LANCE', T.boss.wheel.phase3, { prio: 3, force: true }); break;
      case 'bossPhase3': hud.banner("MASHY'S GONE MASHY!", '#ff3344', 2); lines.say('LANCE', T.boss.mashy.phase3, { prio: 3, force: true }); break;
      case 'commercial': hud.banner("WE'LL BE RIGHT BACK!", '#2ee6ff', 2.5); S('jingle'); lines.say('LANCE', T.boss.lance.commercial[0][1], { prio: 3, force: true }); break;
      case 'lanceRobot': S('glitch'); hud.banner('LANCE WAS A ROBOT ALL ALONG!', '#ff2e88', 3); break;
      case 'networkReveal': S('glitch'); hud.banner('THE NETWORK', '#2ee6ff', 2.5); break;
      case 'channel': S('channelFlip'); break;
      case 'partDown': S('partDown'); break;
      case 'bossDead': S('bossDead'); C('cheer', 1); break;
      case 'micDrop': S('slam'); break;
      case 'hatchOpen': S('hatch'); break;
      case 'enemy': if (d.first && T.intro[d.kind] && w.mode !== 'client' && !w.session && !w.demo) { lines.say('LANCE', T.intro[d.kind][0], { prio: 2, hint: T.intro[d.kind][1] }); } break;
      case 'roomIntro': S('mashStart'); if (!w.demo) lines.say('LANCE', pool('roomStart'), { prio: 0 }); break;
      case 'roomStart': break;
      case 'wave': break;
      case 'clear': if (!d.boss) { S('tada'); hud.banner('ROOM CLEAR!', '#7affb0', 1.8); C('cheer', .8); lines.say('LANCE', pool('clear'), { prio: 1 }); } else { S('bossFanfare'); } break;
      case 'exit': hud.banner('PICK A DOOR!', '#ffcc33', 2); S('beacon'); break;
      case 'exitPicked': break;
      case 'hurry': hud.banner('HURRY UP!', '#ff3344', 1.5); lines.say('LANCE', T.pool.hurry[0], { prio: 1 }); break;
      case 'statuette': S('prizeFanfare'); hud.banner('THE NETWORK (YES, ALL OF IT)!', '#ffcc33', 3); break;
      case 'leave': hud.banner(d.name + ' LEFT THE STUDIO', '#c8c0e0', 1.8); break;
    }
  }
};
