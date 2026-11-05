/* ---- FX: the only place simulation events become sensory: particles, lights, shakes, flashes, crowd reactions and
 * sounds. Each handler reads the event (positions in it) and draws from RNG.fx only ---- */
const Fx = (() => {
  const m = () => Match.m;
  const who = id => m() && m().byId(id);
  const nm = id => { const s = who(id); return s && s.def ? s.def.name : ''; };
  const at = e => [e.x !== undefined ? e.x : Rink.C.x, e.y !== undefined ? e.y : Rink.C.y];
  const quiet = () => !m() || m().cfg.mode === 'session' && Net.ended;
  const SH = n => game.shake(n * (S('shake') === undefined ? 1 : S('shake')));
  function wire() {
    Bus.on('stop', e => { const s = who(e.by); if (!s) return; P.dust(s.x, s.y, 2, 6); P.bits(s.x + Math.cos(s.facing) * 6, s.y + Math.sin(s.facing) * 6, 3, 6, ['#ffffff', '#e8f4ff', '#cfe8ff']); Synth.sfx('stop', { vol: .8 }); });
    Bus.on('pass', e => { Synth.sfx('pass'); });
    Bus.on('pass_complete', e => Synth.sfx('tock'));
    Bus.on('possession', e => { if (e.how === 'pickup' || e.how === 'catch') Synth.sfx('tock', { vol: .6 }); });
    Bus.on('shot', e => {
      const s = who(e.by); Synth.sfx(e.kind === 'slap' || e.kind === 'kaboom' ? 'slap' : e.kind === 'onetimer' ? 'onetimer' : 'wrist');
      if (s && (e.kind === 'slap' || e.kind === 'onetimer')) P.ring(s.x + Math.cos(s.facing) * 10, s.y + Math.sin(s.facing) * 10, 2, 18, '#ffffff', .25);
      if (e.kind === 'kaboom' && s) { P.explosion(s.x + Math.cos(s.facing) * 12, s.y + Math.sin(s.facing) * 12, 4, .8, { debris: false, freeze: false, shake: 0 }); Synth.sfx('fire'); SH(2); }
      Crowd.excite(.1);
    });
    Bus.on('post', e => { Synth.sfx(e.bar ? 'bar' : 'post'); const [x, y] = at(e); P.sparks(x, y, e.bar ? 20 : 8, 8, null, { color: '#ffe8a0' }); Crowd.react('ahh'); Crowd.excite(.25); });
    Bus.on('save', e => { const g = who(e.goalie); Synth.sfx(e.kind === 'glove' ? 'catch' : 'pad'); if (g) P.bits(g.x, g.y, 8, 4, ['#ffffff', '#e8eef4']); Crowd.excite(.12); if (e.freeze) Synth.sfx('whistle'); });
    Bus.on('goal', e => {
      if (quiet()) return; const M = m(), [x, y] = at(e), team = M.teams[e.team];
      if (e.so) { Synth.horn(false, 1.6); Crowd.react('cheer'); return; }
      Synth.horn(e.kind === 'kaboom'); Synth.sting('sting-' + team.def.song);
      game.flash(e.kind === 'kaboom' ? '#ff8a3a' : '#ffffff', .12, .6); SH(e.kind === 'kaboom' ? 6 : 3);
      for (let k = 0; k < 4; k++) P.sparks(x, y, 10 + k * 4, 14, null, { color: [team.def.trim, team.def.dark, '#ffffff', '#ffd36a'][k] });
      P.bits(x, y, 16, 24, [team.def.trim, team.def.dark, '#ffffff', '#ffd36a', '#ff6a6a']);
      if (e.kind === 'kaboom') { P.explosion(x, y, 10, 1.6, { freeze: false, shake: 0 }); P.fire(x, y, 8, 18, { size: 1.4 }); if (M.arena.flames) Fx.fireworks(); }
      Crowd.react('roar'); Crowd.excite(1); Crowd.jump(e.team, 3);
      game.input.rumble(.8, .4);
    });
    Bus.on('hit', e => {
      const [x, y] = at(e), big = e.big;
      Synth.sfx(big ? 'bighit' : 'check', { vol: big ? 1 : .7 });
      if (big) { SH(3); P.impact && P.impact(x, y, 12, 1.2, '#ffffff'); P.bits(x, y, 4, 10, ['#ffffff', '#e8f4ff']); P.dust(x, y, 2, 8); Crowd.react('ohh'); Crowd.excite(.6); Synth.say('oof!', (who(e.victim) || {}).def ? who(e.victim).def.voice : null, { vol: .9 }); Replay.want(m(), 'BIG HIT', e.power / 40); game.input.rumble(.6, .25); }
      else { P.dust(x, y, 3, 3); Crowd.excite(.1); }
      if (e.kaboom && big) P.explosion(x, y, 8, .7, { freeze: false, shake: 0, debris: false });
    });
    Bus.on('knockdown', e => { const s = who(e.victim); if (s) s.dizzy = 2.2; });
    Bus.on('glass', e => { const [x, y] = at(e); if (e.state === 'shattered') { Synth.sfx('shatter'); P.bits(x, y, 30, 40, ['#d8f0ff', '#ffffff', '#a8d8f8', '#c8e8ff']); SH(4); game.flash('#e8f4ff', .08, .4); Crowd.react('gasp'); Crowd.flinch(x); Replay.want(m(), 'THROUGH THE GLASS', 6); } else { Synth.sfx('crack'); P.bits(x, y, 28, 8, ['#d8f0ff', '#ffffff']); } Crowd.excite(.5); });
    Bus.on('rattle', e => { Synth.sfx('boards', { vol: clamp(e.speed / 300, .3, 1) }); const p = Rink.panelAt(e.x, e.y); if (p) p.shake = Math.max(p.shake, .4); Crowd.pound(e.x); });
    Bus.on('puck_boards', e => { Synth.sfx(e.snow ? 'net' : 'boards', { vol: clamp(e.speed / 500, .2, .8) }); if (e.snow) P.dust(e.x, e.y, 2, 3); });
    Bus.on('puck_glass', e => { Synth.sfx('glass', { vol: clamp(e.speed / 500, .3, 1) }); Crowd.pound(e.x); });
    Bus.on('net_hit', () => Synth.sfx('net'));
    Bus.on('deke', e => { Synth.sfx('deke'); const s = who(e.by); if (s && e.spin) P.glints(s.x, s.y, 14, 4, '#ffffff'); });
    Bus.on('deke_beat', e => { Crowd.react('ahh'); Crowd.excite(.3); });
    Bus.on('deke_dodge', e => { Crowd.react('ahh'); });
    Bus.on('poke', () => Synth.sfx('clack')); Bus.on('battle', () => Synth.sfx('clack', { vol: .6 })); Bus.on('clack', () => Synth.sfx('clack'));
    Bus.on('chirp', e => { const s = who(e.by); if (s) Synth.say(TEXT.chirps[e.line], s.def.voice, { vol: .9 }); });
    Bus.on('gloves', e => { Synth.sfx('glove'); Crowd.excite(.4); });
    Bus.on('turtle', () => { Crowd.react('boo'); Synth.organ('sad'); });
    Bus.on('fight_start', e => { Synth.sfx('whistle2'); Synth.organ('fight'); Synth.layer('fight', 1, .4); Crowd.react('cheer'); Crowd.stand(6); const M = m(); if (M && M.fight) for (const gr of M.fight.gear) P.add && P.add({ kind: 'bit', x: gr.x, y: gr.y, z: 14, vz: 60, life: .5, color: gr.color }); });
    Bus.on('fight_move', e => { if (e.move === 'hay') Synth.sfx('whiff', { vol: .5 }); });
    Bus.on('fight_hit', e => { if (e.kind === 'yank') { Synth.sfx('glove'); return; } Synth.sfx('punch', { vol: e.big ? 1 : .7 }); const s = who(e.victim); if (s) { const voice = s.def.voice; Synth.say(e.big ? 'oof!' : 'uh', voice, { vol: .7 }); P.bits(e.x, e.y, 22, e.big ? 5 : 2, ['#bfe8ff', '#ffffff']); if (e.big && RNG.fx() < .35) P.bits(e.x, e.y, 24, 1, ['#ffffff']); } if (e.big) SH(2); Crowd.excite(.2); });
    Bus.on('fight_whiff', () => { Synth.sfx('whiff'); Crowd.react('ahh'); });
    Bus.on('fight_hood', () => { Crowd.react('roar'); });
    Bus.on('fight_end', e => { Synth.sfx('whistle'); Synth.layer('fight', 0, 1); Crowd.react(e.draw ? 'boo' : 'roar'); Crowd.excite(.8); });
    Bus.on('sin_bin', e => { if (e.team === m().teams.findIndex(t => !t.human) || true) Synth.organ('sad'); });
    Bus.on('kaboom_start', e => {
      const M = m(); if (!M) return; const team = M.teams[e.team], col = e.gilded ? '#ffd84a' : team.def.trim;
      Synth.sfx('kaboom'); game.flash(col, .2, .8); SH(6); Crowd.chant(); Crowd.excite(1);
      const bx = Rink.C.x + (e.team === 0 ? -140 : 140); P.explosion(bx, Rink.Y0 - 10, 30, 1.6, { freeze: false, shake: 0 });
      for (let k = 0; k < 5; k++) P.fire(Rink.C.x + (k - 2) * 120, Rink.Y0 + 2, 2, 6, { size: 1.2 });
      Synth.layer('kaboom', 1, .4); Synth.layer('toms', 1, .4);
      game.input.rumble(1, .6);
    });
    Bus.on('kaboom_end', e => { Synth.layer('kaboom', 0, 1.2); Synth.layer('toms', 0, 1.2); });
    Bus.on('kaboom_shot', e => { Crowd.excite(.5); });
    Bus.on('kaboom_body', e => { P.explosion(e.x, e.y, 10, .9, { freeze: false, shake: 0 }); Synth.sfx('blast'); SH(4); });
    Bus.on('kaboom_boards', e => { P.explosion(e.x, e.y, 14, 1, { freeze: false, shake: 0 }); Synth.sfx('blast'); SH(4); });
    Bus.on('blast', e => { P.explosion(e.x, e.y, 14, 1.4, { freeze: false, shake: 0 }); P.fire(e.x, e.y, 10, 12); Synth.sfx('blast'); SH(5); Crowd.react('roar'); Replay.want(m(), 'KA-BOOM!', 8); });
    Bus.on('vault_locked', e => { const g = who(e.goalie); if (g) P.sparks(g.x, g.y, 16, 20, null, { color: '#ffd84a' }); Synth.sfx('post'); Crowd.react('ohh'); });
    Bus.on('vault_cracked', e => { const g = who(e.goalie); if (g) { P.explosion(g.x, g.y, 18, 1.2, { freeze: false, shake: 0 }); P.bits(g.x, g.y, 18, 20, ['#ffd84a', '#c8901a', '#ffffff']); } Crowd.react('roar'); SH(5); });
    Bus.on('twister', e => { const s = who(e.by); if (s) P.glints(s.x, s.y, 16, 10, '#ffd84a'); });
    Bus.on('item_throw', () => Synth.sfx('throw', { vol: .6 }));
    Bus.on('item_land', e => { P.dust(e.x, e.y, 2, 3); if (e.kind === 'octopus') Synth.sfx('splort'); });
    Bus.on('item', e => { const s = who(e.by); Synth.sfx('pickup'); if (s) { P.text(s.x, s.y, 36, ITEM_DEFS[e.kind].name, ITEM_DEFS[e.kind].color, { scale: 1, bounce: false }); P.glints(s.x, s.y, 16, 8, ITEM_DEFS[e.kind].color); } });
    Bus.on('hazard', e => { Synth.sfx(e.kind === 'octopus' ? 'splort' : 'whiff'); Crowd.react('ahh'); });
    Bus.on('thin_ice_break', e => { Synth.sfx('splash'); P.bits(e.x, e.y, 4, 24, ['#ffffff', '#cfe8ff', '#5a8ab8']); SH(3); Crowd.react('gasp'); });
    Bus.on('ice_crack', e => Synth.sfx('crack', { vol: .6 }));
    Bus.on('plunge', e => { Synth.sfx('splash'); Synth.sfx('freeze'); P.bits(e.x, e.y, 6, 16, ['#ffffff', '#8ab8e8']); });
    Bus.on('buried', e => { P.dust(e.x, e.y, 6, 14); Synth.sfx('net'); });
    Bus.on('mascot_down', e => { Crowd.react('cheer'); const p = m() && m().extras.find(x => x.kind === 'pete'); if (p) Synth.say('ooof! bear down!', CAST.pete.voice); });
    Bus.on('ref_down', () => { Crowd.react('ohh'); });
    Bus.on('crate', e => { Synth.sfx('crate'); P.bits(e.x, e.y, 4, 14, ['#c8945a', '#8a5a32']); P.dust(e.x, e.y, 2, 8); });
    Bus.on('drop_start', () => Synth.sfx('menuMove'));
    Bus.on('hat_trick', e => { const M = m(); if (!M) return; for (let k = 0; k < 28; k++) { const it = Items.make('hat', Rink.C.x + (RNG.fx() - .5) * 700, Rink.Y0 - 40); it.z = 40; const tx = Rink.C.x + (RNG.fx() - .5) * 700, ty = Rink.C.y + (RNG.fx() - .5) * 300; it.vx = (tx - it.x) / 1; it.vy = (ty - it.y) / 1; it.vz = 300; it.air = true; it.t = 999; it.color = ['#c83a2a', '#3a6aa8', '#e8b43a', '#141414', '#5a8a3a'][k % 5]; M.items.push(it); } Crowd.react('roar'); });
    Bus.on('faceoff_drop', () => Synth.sfx('tock'));
    Bus.on('faceoff', e => { if (e.dot === 'center') Synth.organ('walkup'); });
    Bus.on('stoppage', e => { if (e.why !== 'fight' && e.why !== 'freeze') Synth.sfx('whistle'); if (RNG.fx() < .5) Synth.organ(RNG.fx() < .5 ? 'clap' : 'charge'); if (e.why === 'freeze') {} });
    Bus.on('octopus_cleared', () => { const M = m(); if (M) M.octoTwirl = 1.5; Crowd.react('cheer'); });
    Bus.on('period_end', () => { Synth.sfx('buzzer'); Synth.organ('period'); });
    Bus.on('final', e => { Synth.sfx('buzzer'); if (e.winner >= 0) Synth.horn(false, 1.8); Crowd.react(e.winner === 0 ? 'roar' : 'cheer'); });
    Bus.on('shootout_attempt', e => { if (!e.ok) { Crowd.react('ohh'); } });
    Bus.on('organ_boost', () => { Synth.organ('charge'); Crowd.react('cheer'); Synth.claps(8, .3); });
    Bus.on('boost_start', () => { Synth.sfx('powerup'); });
    Bus.on('objective', e => { Synth.sfx('star'); UI.toast('★ ' + e.text); });
    Bus.on('item_end', () => {});
    Bus.on('call', e => { const s = who(e.by); if (s) Synth.say('hey!', s.def.voice, { vol: .7 }); });
    // the replay re-fires the marks it recorded
    for (const t of ['hit', 'glass', 'shot', 'post', 'save', 'blast', 'goal', 'kaboom_body', 'kaboom_boards']) Bus.on(t, e => Replay.mark({ type: t, x: e.x, y: e.y, big: e.big, kind: e.kind, state: e.state }));
  }
  function replayEvent(e) {
    if (e.type === 'hit' && e.big) { P.bits(e.x, e.y, 4, 10, ['#ffffff', '#e8f4ff']); Synth.sfx('bighit', { vol: .7 }); }
    else if (e.type === 'glass' && e.state === 'shattered') { P.bits(e.x, e.y, 30, 30, ['#d8f0ff', '#ffffff']); Synth.sfx('shatter', { vol: .6 }); }
    else if (e.type === 'post') Synth.sfx('post', { vol: .6 });
    else if (e.type === 'blast' || e.type === 'kaboom_body' || e.type === 'kaboom_boards') P.explosion(e.x, e.y, 12, 1, { freeze: false, shake: 0 });
    else if (e.type === 'goal') { P.sparks(e.x, e.y, 10, 12, null, { color: '#ffd36a' }); }
  }
  function fireworks() { for (let k = 0; k < 6; k++) game.after(k * .25, () => { const x = Rink.C.x + (RNG.fx() - .5) * 600, y = Rink.Y0 - 60 + RNG.fx() * 40; P.sparks(x, y, 120, 26, null, { color: ['#ffd84a', '#ff4ab8', '#4af0f0', '#ffffff'][k % 4] }); P.ring(x, y, 4, 40, '#ffffff', .4); Synth.sfx('boom', { vol: .4 }); }); }
  /** each step: the continuous effects (KABOOM skates, the fireball puck, steam, speed lines, fire trails) */
  function frame(M, dt) {
    if (!M) return;
    const pk = M.puck;
    if (pk.onFire && !pk.owner && RNG.fx() < .9) P.fire(pk.x, pk.y, pk.z + 2, 1, { size: .7 });
    for (const s of M.skaters) {
      const sp = Math.hypot(s.vx, s.vy);
      if (M.kaboom[s.team] > 0 && sp > 60 && RNG.fx() < .3) P.sparks(s.x, s.y, 1, 1, Math.atan2(-s.vy, -s.vx), { color: M.teams[s.team].id === 'grizzlies' ? '#ffd84a' : '#ffa040' });
      if ((s.items.hotsauce > 0) && sp > 60 && RNG.fx() < .5) P.fire(s.x - s.vx * .03, s.y - s.vy * .03, 2, 1, { size: .5 });
      if (s.turboOn && sp > 150 && RNG.fx() < .25) P.dust(s.x - s.vx * .05, s.y - s.vy * .05, 1, 1);
      if (s.dizzy > 0) s.dizzy -= dt;
      if (s.twistT > 0 && RNG.fx() < .6) P.glints(s.x, s.y, 14, 1, '#ffd84a');
    }
    for (let i = 0; i < Rink.melt.length; i++) if (Rink.melt[i] > .3 && RNG.fx() < .004) { const x = Rink.X0 + (i % Rink.SW) * 16 + 8, y = Rink.Y0 + Math.floor(i / Rink.SW) * 16 + 8; P.smoke(x, y, 2, 1, { size: .5, color: '#e8eef4' }); }
  }
  return { wire, replayEvent, frame, fireworks, nm };
})();
