/* ---- FX: simulation events become sights and sounds (never feeds back into the sim) ---- */
const Fx = (() => {
  const P = () => game.particles, M = () => Match.cur();
  let on = false, flash = { t: 0, c: '#fff' };
  const nm = s => s ? s.nick : '', tm = s => s ? s.team.name.split(' ').pop() : '';
  function hook() {
    if (on) return; on = true;
    const b = (t, f) => Bus.on(t, e => { const m = M(); if (!m || m.silent) return; try { f(e, m); } catch (er) { game.fail('fx ' + t, er); } });
    b('stop', (e) => { P().dust(e.s.x, e.s.y, 1, 10, { color: '#ffffff', speed: 60 }); P().bits(e.s.x, e.s.y, 2, 4, ['#ffffff', '#dcecff']); Synth.sfx('skid'); });
    b('pass', (e) => { Synth.sfx('thwap'); });
    b('shot', (e, m) => { Synth.sfx(e.kind === 'slap' ? 'slap' : e.kind === 'onetimer' ? 'onetimer' : e.kind === 'kaboom' ? 'slap' : 'snap'); if (e.kind !== 'wrist') { P().ring(e.s.x, e.s.y, 4, 18, '#ffffff', .3); } if (e.kab) { Synth.sfx('boomsub'); game.shake(4); Talk.say('kaboomshot', {}, { force: true }); } if (e.kind === 'onetimer') { Talk.say('onetimer', { name: nm(e.s) }); Crowd.add(.15); } Crowd.add(.04); if (m.humans.some(h => h.sk === e.s)) Talk.showTip('shoot'); });
    b('post', (e) => { Synth.sfx(e.bar ? 'ping2' : 'ping'); P().glints(Match.cur().puck.x, Match.cur().puck.y, 8, 6, '#ffffff'); UI.banner('POST!', { size: 2, dur: .9, y: .34, color: ['#ffffff', '#cfe6ff'] }); Talk.say('post'); Crowd.add(.2); Synth.react('ahh'); });
    b('boards', (e) => { Synth.sfx('boards'); });
    b('glass_ping', () => Synth.sfx('glass')); b('net_touch', () => Synth.sfx('net'));
    b('goal_line', (e, m) => { Synth.sfx('net'); });
    b('goal', (e, m) => {
      const s = e.scorer; Synth.horn(e.fire); Crowd.add(.8); Synth.react('cheer'); UI.banner('GOAL!', { size: 5, dur: 2.2, y: .22, color: e.fire ? ['#fff', '#ffcc33', '#ff4a1a'] : ['#fffbe8', '#ffe08a', '#ffb347'] }); game.flash(e.fire ? '#ff9a3a' : '#ffffff', .25, .5); game.shake(e.fire ? 8 : 4);
      setTimeout(() => Synth.organ(Synth.GOALSONG[s.team.id] || Synth.GOALSONG.muskrats, 150, .14), 500);
      P().bits(m.puck.x, m.puck.y, 12, 30, [m.teams[e.side].home.trim, '#ffffff', '#ffd36a', m.teams[e.side].home.cloth]);
      if (e.fire) { P().explosion(m.puck.x, m.puck.y, 8, 3); Synth.sfx('boomsub'); }
      Talk.say('goal', { name: nm(s), team: tm(s), score: m.score.join('-'), shot: e.shot === 'slap' ? 'slapshot' : e.shot === 'onetimer' ? 'one-timer' : e.shot }, { force: true, cool: 0 });
      m.hatsT = 0;
    });
    b('hat_trick', (e, m) => { UI.banner('HAT TRICK!', { size: 4, dur: 2.6, y: .34 }); Talk.say('hat', { name: nm(e.s) }, { force: true }); m.hatsT = 4; Synth.sfx('fanfare'); Crowd.add(1); });
    b('save', (e, m) => { Synth.sfx('thump'); UI.banner('SAVE!', { size: 3, dur: .9, y: .3, color: ['#ffffff', '#9fd3ff'] }); Talk.say('save', { goalie: nm(e.g) }); Crowd.add(.25); Synth.react('ahh'); if (e.froze) { P().glints(e.g.x, e.g.y, 10, 8, '#ffffff'); } });
    b('block', () => { Synth.sfx('thump'); });
    b('big_hit', (e, m) => { Synth.sfx('bighit'); game.hitFx && game.hitFx(e.b.x, e.b.y, 12, { power: 1.2, damage: undefined, text: false }); game.freeze(.07); game.shake(4); Cam.bump(1); P().bits(e.b.x, e.b.y, 8, 12, ['#ffffff', '#cfe8ff']); Synth.react('ohh'); UI.banner('BIG HIT!', { size: 3, dur: 1, y: .3, color: ['#fff', '#ffd36a', '#ff7a3a'] }); Talk.say('hit', { name: nm(e.a), victim: nm(e.b) }); Crowd.add(.4); Talk.showTip('glass'); });
    b('check', (e) => { Synth.sfx('thump'); P().sparks && P().sparks(e.b.x, e.b.y, 10, 5, 0); });
    b('bump', () => Synth.sfx('tock'));
    b('glass_crack', (e) => { Synth.sfx('crack'); P().bits(e.s.x, e.s.y, 20, 8, ['#ffffff', '#cfe8ff']); });
    b('glass_shatter', (e, m) => { Synth.sfx('shatter'); P().bits(e.s.x, e.s.y, 24, 40, ['#ffffff', '#cfe8ff', '#9fd3ff']); game.shake(6); UI.banner('THROUGH THE GLASS!', { size: 3, dur: 1.4, y: .3 }); Talk.say('glass', {}, { force: true }); Crowd.add(.6); });
    b('rattle', (e) => { Synth.sfx('boards', { vol: .5 }); });
    b('kaboom_start', (e, m) => { game.flash('#ff8a2a', .4, .8); game.shake(8); P().explosion(e.side ? Rink.X1 - 100 : Rink.X0 + 100, Rink.Y0 - 14, 10, 3); Synth.sfx('boomsub'); Synth.sfx('fanfare'); UI.banner('KA-BOOM!', { size: 6, dur: 2.4, y: .24, color: ['#fff', '#ffe040', '#ff5a1a'] }); Talk.say('kaboom', { team: tm(m.sk.find(s => s.side === e.side)) }, { force: true }); Synth.react('chant'); Talk.showTip('kaboom'); Crowd.add(1); });
    b('kaboom_skate', (e, m) => { if (RNG.fx() < .35) { P().sparks && P().sparks(e.s.x, e.s.y, 2, 2, e.s.heading + PI); P().fire && P().fire(e.s.x, e.s.y, 1, 1, { size: 1 }); } });
    b('blast', (e, m) => { P().explosion(e.g.x, e.g.y, 10, 3); game.shake(8); game.flash('#ffffff', .15); Synth.sfx('boomsub'); Talk.say('blast', { goalie: nm(e.g) }, { force: true }); });
    b('vault_locked', () => UI.banner('VAULT LOCKED', { size: 3, dur: 1.4, y: .3, color: ['#fff', '#ffd36a'] })); b('vault_cracked', () => { UI.banner('THE VAULT IS CRACKED!', { size: 3, dur: 2, y: .3 }); Synth.sfx('shatter'); });
    b('fight_start', (e, m) => { Synth.sfx('whistle'); UI.banner('FIGHT!', { size: 5, dur: 1.6, y: .22, color: ['#fff', '#ff8a6a', '#e03020'] }); Talk.say('fight', { name: nm(e.a), victim: nm(e.b) }, { force: true }); Synth.organ(Synth.ORGAN.fight, 130); Synth.react('roar'); for (const s of [e.a, e.b]) { P().bits(s.x, s.y, 6, 4, [s.jersey, '#222']); } Crowd.add(1); });
    b('fight_hit', (e) => { Synth.sfx('punch'); P().sparks && P().sparks(e.o.x, e.o.y, 14, 6, 0); if (e.kind === 'hay' || RNG.fx() < .2) P().bits(e.o.x, e.o.y, 14, 2, ['#ffffff']); game.shake(e.kind === 'hay' ? 4 : 1.5); game.freeze(e.kind === 'hay' ? .06 : .03); if (e.kind === 'hay') P().text && P().text(e.o.x, e.o.y, 26, 'WHAM', '#ffd36a', { scale: 1 }); });
    b('fight_whiff', () => Synth.sfx('whiff')); b('fight_yank', () => Synth.sfx('whiff')); b('fight_hood', (e) => { UI.banner('JERSEY OVER THE HEAD!', { size: 2, dur: 1.2, y: .34 }); });
    b('fight_end', (e, m) => { Synth.react('roar'); Talk.say('fightend', { name: e.w ? nm(e.w) : '', victim: e.l ? nm(e.l) : '' }, { force: true }); if (e.w) { UI.banner(nm(e.w) + ' WINS!', { size: 3, dur: 2, y: .24 }); } else UI.banner('DRAW!', { size: 3, dur: 1.6 }); });
    b('sin_bin', (e, m) => { UI.banner('POWER PLAY!', { size: 4, dur: 1.8, y: .34, color: ['#fff', '#7aa7ff'] }); Talk.say('powerplay', { team: tm(m.sk.find(s => s.side !== e.s.side)) }); Synth.organ(Synth.ORGAN.sad, 100); });
    b('turtle', () => { Synth.react('boo'); UI.banner('TURTLED!', { size: 2, dur: 1.2, y: .34 }); }); b('challenge', () => Synth.sfx('mrk'));
    b('whistle', () => Synth.sfx('whistle')); b('horn_period', (e, m) => { Synth.sfx('buzzer'); UI.banner(m.ot ? 'END OF OVERTIME' : 'END OF PERIOD ' + e.period, { size: 3, dur: 2.4, y: .3 }); Talk.say('period', { period: ['1st', '2nd', '3rd'][e.period - 1] || 'period', score: m.score.join('-') }, { force: true }); });
    b('final', (e, m) => { UI.banner('FINAL', { size: 6, dur: 3, y: .26 }); Synth.horn(true); Synth.react('roar'); const w = m.score[0] > m.score[1] ? 0 : 1; Talk.say('final', { team: tm(m.sk.find(s => s.side === w)), score: Math.max(...m.score) + '-' + Math.min(...m.score) }, { force: true }); });
    b('overtime', () => UI.banner('SUDDEN DEATH OVERTIME', { size: 3, dur: 2.4 })); b('shootout_begin', () => { UI.banner('SHOOTOUT!', { size: 5, dur: 2, y: .26 }); Talk.say('shootout', {}, { force: true }); });
    b('so_goal', () => { Synth.horn(false); UI.banner('GOAL!', { size: 4, dur: 1.4 }); Synth.react('cheer'); }); b('so_miss', () => { UI.banner('NO GOAL', { size: 3, dur: 1.2, color: ['#fff', '#9ab'] }); Synth.react('ahh'); });
    b('faceoff_drop', (e, m) => { Synth.sfx('tock'); }); b('faceoff_set', (e, m) => { if (m.phase !== 'intro') Talk.say('faceoff', { arena: m.arena.name }, { cool: 40 }); Synth.organ(Synth.ORGAN.vamp, 150, .1); });
    b('item_throw', (e, m) => { Synth.sfx('throw'); Talk.say('item', {}); Talk.showTip('item'); }); b('item_pick', (e) => { Synth.sfx('pickup'); UI.toast(ITEMS[e.kind].name + '!', ITEMS[e.kind].color, 2); P().glints(e.s.x, e.s.y, 12, 8, ITEMS[e.kind].color); });
    b('slip', (e) => { Synth.sfx('slip'); }); b('mascot_down', (e, m) => { UI.banner('MASCOT DOWN!', { size: 3, dur: 1.6 }); Talk.say('mascot', {}, { force: true }); Synth.sfx('bonk'); }); b('thin_ice_break', (e) => { Synth.sfx('splash'); P().bits(e.x, e.y, 4, 14, ['#1a2a4a', '#9fd3ff']); P().ring(e.x, e.y, 4, 30, '#9fd3ff', .6); }); b('frozen', (e) => { Talk.say('ice', {}, { force: true }); Synth.sfx('splash'); });
    b('chirp', (e) => { Talk.bubble(e.s, e.line); Crowd.add(.05); }); b('deke_beat', (e) => { Talk.say('deke', { name: nm(e.s) }); }); b('deke', (e) => { P().dust(e.s.x, e.s.y, 1, 4, { color: '#ffffff' }); });
    b('takeaway', () => {}); b('pass_complete', (e) => { Synth.sfx('tock'); Crowd.add(.01); });
    b('faceoff_win', () => Synth.sfx('tock')); b('replay_start', () => { UI.banner('REPLAY', { size: 2, dur: 1.5, y: .12, color: ['#fff', '#ff6a6a'] }); }); b('objective', (e) => { UI.toast('★ ' + (e.text || 'OBJECTIVE'), '#ffd36a', 3.5); Synth.sfx('star'); });
    b('flood_start', () => { Talk.say('flood', {}, { force: true }); Talk.showTip('flood'); }); b('honk', () => Synth.sfx('ooga')); b('flood_done', (e) => { UI.banner(e.perfect ? 'PERFECT SHEEN!' : 'NICE ICE', { size: 3, dur: 1.8 }); Synth.sfx('fanfare'); });
    b('step', (e, m) => {
      const pk = m.puck; if (pk.fire && m.phase === 'play') { P().fire(pk.x, pk.y, pk.z + 2, 2, { size: 2 }); game.lights.add(pk.x, pk.y, 12, 90, 1.2, { color: '#ff8a2a' }); }
      Crowd.step(e.dt); Synth.crowdSet(Crowd.exc); Rink.panels.forEach(p => { p.shake = Math.max(0, p.shake - e.dt); });
      if (m.hatsT > 0) { m.hatsT -= e.dt; if (RNG.fx() < .5) P().bits(Rink.X0 + RNG.fx() * (Rink.X1 - Rink.X0), Rink.Y0 + RNG.fx() * 380, 90, 1, ['#222', '#e8e8e8', '#b3262a']); }
      if (m.phase === 'goal' && RNG.fx() < .3) P().bits(Rink.CX + (RNG.fx() - .5) * 700, Rink.CY + (RNG.fx() - .5) * 300, 70, 2, ['#ffd36a', '#ff6a6a', '#6ab0ff', '#ffffff']);
      if (m.phase === 'play' && m.clock < 20 && m.period === m.periods && Math.abs(m.score[0] - m.score[1]) <= 1) Crowd.add(.003);
      for (const s of m.sk) if (s.state === 'frozen' && RNG.fx() < .05) P().glints(s.x, s.y, 12, 2, '#cfefff');
    });
  }
  return { hook };
})();
