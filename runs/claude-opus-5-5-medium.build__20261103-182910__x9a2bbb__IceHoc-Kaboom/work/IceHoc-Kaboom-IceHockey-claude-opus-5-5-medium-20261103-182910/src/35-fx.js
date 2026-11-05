/* ---- Fx: the only place simulation events become particles, light, shakes, crowd reactions and sounds (PLAN 8) ---- */
const Fx = (() => {
  const flashes = [];   // timed lights: { x, y, z, r, i, color, t, life }
  const light = (x, y, z, r, i, color, life) => flashes.push({ x, y, z, r, i, color, t: 0, life });
  let banner = null;
  const setBanner = (text, colors, life = 2, sub) => { banner = { text, colors: colors || ['#ffffff', '#ffe08a', '#ffb347', '#e0662a'], t: 0, life, sub }; };
  function event(e, replay) {
    if (!M) return;
    const vol = replay ? .7 : 1;
    switch (e.type) {
      case 'shot': {
        A.sfx(e.kind === 'wrist' ? 'snap' : e.kind === 'onetimer' ? 'onetimer' : e.kind === 'kaboom' ? 'kaboom' : 'slap', { vol });
        if (e.kind === 'slap' || e.kind === 'onetimer' || e.kind === 'kaboom') { P.ring(e.x, e.y, 3, 22, '#e8f6ff', .3); P.dust(e.x, e.y, 0, 6); }
        if (e.kind === 'kaboom') { game.shake(4); game.flash('#ff8a3a', .1, .5); }
        Crowd.hype(.1); break;
      }
      case 'pass': A.sfx('thwap', { vol: .8 * vol }); break;
      case 'possession': A.sfx('tock', { vol: .6 * vol }); break;
      case 'battle': A.sfx('clack', { vol: .5 }); break;
      case 'stop': { A.sfx('hstop', { vol }); const s = M.byId[e.by]; if (s) { P.bits(e.x, e.y, 1, 8, ['#ffffff', '#e8f4ff', '#cfe6ff']); P.dust(e.x, e.y, 1, 6); } break; }
      case 'post': A.sfx(e.bar ? 'bar' : 'ping', { vol }); P.sparks(e.x, e.y, 10, 8); Crowd.react('ahh'); if (!replay) setBanner(e.bar ? 'CROSSBAR!' : 'POST!', ['#ffffff', '#d8e8ff', '#9ab8e8'], 1.2); break;
      case 'save': {
        A.sfx(e.kind === 'glove' ? 'thump' : 'boards', { vol: .7 * vol }); Crowd.hype(.15);
        const g = M.byId[e.goalie]; if (g) P.dust(g.x, g.y, 8, 6);
        if (!replay && e.kind !== 'cover' && RNG.fx() < .35) setBanner('SAVE!', ['#ffffff', '#c8f0ff', '#5ab0e8'], 1);
        break;
      }
      case 'boards': A.sfx(e.snow ? 'thump' : 'boards', { vol: Math.min(1, e.speed / 300) * vol }); if (e.snow) P.dust(e.x, e.y, 6, 8); break;
      case 'glass_hit': A.sfx('glassclack', { vol: Math.min(1, e.speed / 300) * vol }); { const p = Rink.panels[e.panel]; if (p) p.shake = .3; } break;
      case 'rattle': A.sfx('boards', { vol: .6 }); { const p = Rink.panelAt(e.x, e.y); if (p) p.shake = .4; } break;
      case 'hit': {
        const v = M.byId[e.victim];
        if (e.big) { A.sfx('bighit', { vol }); if (!replay) { game.hitFx(v.x, v.y, 14, { power: 1.4 }); game.shake(3); setBanner(e.accidental ? 'OOF!' : 'BIG HIT!', ['#ffffff', '#ffd0a0', '#ff6a3a', '#a01a1a'], 1.4); } P.bits(v.x, v.y, 4, 12, ['#ffffff', '#dff0ff']); Crowd.react('ohh'); Crowd.hype(.4); }
        else { A.sfx('thump', { vol }); P.dust(v.x, v.y, 4, 4); Crowd.hype(.1); }
        Synth.babble('oof', (v.def.look && v.def.look.voice) || 'mid', { maxSyl: 1, vol: .6 });
        break;
      }
      case 'glass': {
        const p = Rink.panels[e.panel];
        if (e.state === 'shattered') { A.sfx('shatter', { vol }); P.bits(p.m[0], p.m[1], 24, 30, ['#e8f8ff', '#bfe6ff', '#ffffff', '#9ad0f0']); game.shake(4); if (!replay) setBanner('THROUGH THE GLASS!', ['#ffffff', '#c8f0ff', '#5ab0e8', '#1a5a9a'], 2); Crowd.react('ohh'); Crowd.hype(.6); Crowd.flinch(p.m[0]); }
        else { A.sfx('crack', { vol }); P.bits(p.m[0], p.m[1], 26, 6, ['#e8f8ff', '#ffffff']); }
        break;
      }
      case 'goal': {
        A.sfx('horn'); Synth.goalSting(e.team === 0 ? M.cfg.home : M.cfg.away); Crowd.react('cheer'); Crowd.hype(1); Crowd.goal(e.team);
        const g = Skater.attackGoal(e.team); light(g.x + Rink.outDir(g.side) * 30, g.y, 40, 140, 1.4, '#ff2a2a', 3);
        if (!replay) { game.flash('#ffffff', .1, .4); setBanner(e.kind === 'kaboom' ? 'KA-BOOM GOAL!' : 'GOAL!', null, 2.6, e.name + (e.assists && e.assists.length ? '  (' + e.assists.map(a => M.byId[a] ? M.byId[a].name : '').join(', ') + ')' : '')); }
        P.sparks(M.puck.x, M.puck.y, 8, 20, null, { color: '#ffe08a' });
        if (e.kind === 'kaboom') { P.explosion(g.x, g.y, 10, 1.6); A.sfx('horn', { pitch: 1.26 }); for (let i = 0; i < 20; i++) P.bits(g.x, g.y, 20, 4, ['#ff3a3a', '#ffd040', '#3aff8a', '#5a8aff']); }
        break;
      }
      case 'blast': { P.explosion(e.x, e.y, 10, 1.2); A.sfx('kaboom', { vol }); game.shake(5); light(e.x, e.y, 10, 120, 1.5, '#ff8a2a', .6); break; }
      case 'kaboom_start': {
        if (replay) break; A.sfx('kaboom'); game.flash(e.gilded ? '#ffd040' : '#ff7a2a', .2, .8); game.shake(6); Crowd.react('chant'); Crowd.hype(1);
        setBanner(e.gilded ? 'GILDED MODE!' : 'KA-BOOM!', e.gilded ? ['#fffbe0', '#ffe070', '#d9a520', '#6a4a10'] : ['#ffffff', '#ffd040', '#ff7a1a', '#c01a1a'], 2.4, M.teams[e.team].short);
        const bx = Rink.C.x + (e.team ? 144 : -144); P.explosion(bx, Rink.Y0 - 10, 30, 1.4); Synth.layer('kaboom', true); Synth.layer('kaboom2', true); break;
      }
      case 'kaboom_end': if (M.kaboomT[0] <= 0 && M.kaboomT[1] <= 0) { Synth.layer('kaboom', false); Synth.layer('kaboom2', false); } break;
      case 'kaboom_shot': game.shake(3); break;
      case 'fight_start': if (!replay) { A.sfx('whistle'); setBanner('FIGHT!', ['#ffffff', '#ffd0d0', '#ff4a4a', '#8a0a0a'], 1.6); Synth.sting('fight'); Synth.layer('fight', true); Crowd.hype(1); Crowd.stand(true); } break;
      case 'fight_hit': { A.sfx('punch'); const v = M.byId[e.victim]; if (v) { P.impact ? P.impact(v.x, v.y, 26, 1, '#ffffff') : P.sparks(v.x, v.y, 26, 6); if (e.kind === 'hay' && e.big && RNG.fx() < .5) P.bits(v.x, v.y, 26, 1, ['#ffffff']); P.add && P.add({ kind: 'bit', x: v.x, y: v.y, z: 30, vx: 0, vy: 0, vz: 40, color: '#9ad0ff', life: .5 }); } game.shake(e.kind === 'hay' ? 3 : 1); break; }
      case 'fight_whiff': A.sfx('whoosh'); break;
      case 'jersey_over': setBanner('JERSEY OVER THE HEAD!', ['#ffffff', '#ffe08a', '#ffb347'], 1.4); break;
      case 'fight_end': Synth.layer('fight', false); Crowd.stand(false); if (!e.draw) { Crowd.react('cheer'); setBanner('K.O.!', ['#ffffff', '#ffd0d0', '#ff4a4a'], 1.4, e.winnerName + ' WINS'); A.sfx('twinkle'); } else setBanner('SEPARATED', null, 1.2); break;
      case 'sin_bin': setBanner('POWER PLAY', ['#ffffff', '#c8e0ff', '#5a8ae8'], 1.8, M.teams[1 - e.team].short); Synth.sting('sad'); break;
      case 'turtle': Crowd.react('boo'); setBanner('TURTLE!', ['#ffffff', '#d0ffd0', '#4ac04a'], 1.2); break;
      case 'item_throw': A.sfx('throw'); break;
      case 'item': A.sfx('pickup'); P.glints(e.x, e.y, 6, 10, (ITEMS[e.kind] || {}).color || '#ffffff'); P.text && P.text(e.x, e.y, 24, (ITEMS[e.kind] || {}).name || e.kind, '#ffe08a', { scale: 1 }); break;
      case 'octopus_land': A.sfx('splort'); break;
      case 'hazard': A.sfx('splort'); P.dust(e.x, e.y, 2, 6); Crowd.react('ohh'); break;
      case 'mascot_down': A.sfx('bighit'); Crowd.react('cheer'); setBanner('MASCOT DOWN!', ['#ffffff', '#c8ffff', '#18b5b0'], 1.6); P.bits(e.x, e.y, 10, 14, ['#ffffff', '#f4f8ff']); break;
      case 'thin_ice_break': A.sfx('splash'); A.sfx('crack'); P.bits(e.x, e.y, 2, 24, ['#e8f8ff', '#9ad0f0', '#3a6a9a']); game.shake(3); setBanner('THE ICE BROKE!', ['#ffffff', '#c8f0ff', '#3a8ad0'], 1.8); break;
      case 'ice_crack': A.sfx('crack'); break;
      case 'plunge': A.sfx('splash'); P.bits(e.x, e.y, 2, 14, ['#9ad0f0', '#ffffff']); Crowd.react('ohh'); break;
      case 'buried': A.sfx('thump'); P.dust(e.x, e.y, 6, 16); break;
      case 'hat_trick': setBanner('HAT TRICK!', ['#ffffff', '#ffe08a', '#ffb347'], 2.4); Crowd.react('cheer'); break;
      case 'hoser_hat_trick': UI.toast('HOSER HAT TRICK!', 'A goal, an assist and a fight'); break;
      case 'whistle': A.sfx(e.kind === 'out' ? 'whistle' : 'whistle1'); Synth.sting('walkup'); break;
      case 'faceoff_drop': A.sfx('tock'); break;
      case 'period_end': A.sfx('buzzer'); setBanner(e.n >= (M.cfg.periods) ? (M.score[0] === M.score[1] ? 'END OF REGULATION' : 'FINAL') : 'END OF ' + Match.periodName(e.n), null, 2.4, M.teams[0].abbr + ' ' + M.score[0] + ' - ' + M.score[1] + ' ' + M.teams[1].abbr); break;
      case 'ot_start': setBanner('OVERTIME', null, 2, 'Next goal wins'); break;
      case 'shootout_start': setBanner(M.so && M.so.showcase ? 'SHOOTOUT SHOWCASE' : 'SHOOTOUT', null, 2); break;
      case 'shootout_attempt': A.sfx(e.ok ? 'horn' : 'deny'); if (e.ok) Crowd.react('cheer'); else Crowd.react('ahh'); break;
      case 'final': A.sfx('horn'); A.sfx('buzzer'); setBanner('FINAL', null, 3, M.teams[0].abbr + ' ' + M.score[0] + ' - ' + M.score[1] + ' ' + M.teams[1].abbr); Crowd.react(e.winner === 0 ? 'cheer' : 'boo'); break;
      case 'deke': A.sfx('whoosh', { vol: .6 }); break;
      case 'deke_beat': Crowd.hype(.2); break;
      case 'chirp': A.sfx('zip', { vol: .5 }); break;
      case 'poke': A.sfx('clack', { vol: .7 }); break;
      case 'block': A.sfx('thump', { vol: .7 }); break;
      case 'boost_start': setBanner('GILDED BOOST!', ['#fffbe0', '#ffe070', '#d9a520'], 2, '"Synergy, boys!"'); A.sfx('zip'); break;
      case 'organ_boost': setBanner('DORIS! PLAY THE SONG!', ['#ffffff', '#ffe0ff', '#c86ab0'], 2.4); Synth.sting('charge'); Crowd.react('cheer'); Crowd.hype(1); break;
      case 'vault_cracked': setBanner('THE VAULT IS CRACKED!', ['#fffbe0', '#ffe070', '#d9a520'], 2.2); A.sfx('shatter'); break;
      case 'vault_locked': setBanner('VAULT LOCKED', ['#ffffff', '#d0d0d0', '#808080'], 1.4); A.sfx('bighit'); break;
      case 'twister': A.sfx('zip'); break;
      case 'objective': A.sfx('star'); UI.toast('★ OBJECTIVE', e.text); break;
      case 'crate_break': A.sfx('crack'); P.bits(e.x, e.y, 4, 14, ['#c8a060', '#8a6030']); break;
      case 'drop_start': A.sfx('zip', { vol: .6 }); break;
      case 'octopus_twirl': Crowd.react('cheer'); break;
      case 'intro': A.sfx('tock'); break;
      case 'goal_mark': break;
    }
  }
  Bus.on('*', e => { if (M && !Replay.playing && !(M.cfg.session && Net.isClient())) event(e, false); });
  function step(dt) {
    for (let i = flashes.length - 1; i >= 0; i--) { flashes[i].t += dt; if (flashes[i].t > flashes[i].life) flashes.splice(i, 1); }
    if (banner) { banner.t += dt; if (banner.t > banner.life) banner = null; }
  }
  function lights() { for (const f of flashes) game.lights.add(f.x, f.y, f.z, f.r, f.i * (1 - f.t / f.life) * (.7 + .3 * Math.sin(f.t * 20)), { color: f.color }); }
  return { event, step, lights, setBanner, light, get banner() { return banner; }, clear() { banner = null; flashes.length = 0; } };
})();
