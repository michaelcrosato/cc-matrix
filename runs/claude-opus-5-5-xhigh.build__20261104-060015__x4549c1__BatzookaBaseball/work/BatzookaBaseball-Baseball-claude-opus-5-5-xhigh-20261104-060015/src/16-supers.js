/* =============================================================================
 * 16-supers: the Batzooka meter (the crowd's roar, one per team), its gains, the
 * Comeback Boost, and the supers: BATZOOKA! (the batter), the team super pitch,
 * Laser Arm (a fielder) and Afterburners (the runners). Turbo refills here too.
 * ========================================================================== */
BZ.GAINS = { contact: [6, 15], single: 10, xbh: 15, homer: 25, strikeout: 12, bigCatch: 20, doublePlay: 15, steal: 10, headfirst: 5, rhubarb: 50, target: 20 };
BZ.supers = {
  gain(M, side, amt, why) {
    if (side === undefined || side === null || !M || M.mode === 'derby') return;
    const T = M.teams[side]; if (!T) return;
    if (M.cheats && M.cheats.infMeter && (T.humans.length || M.attract)) { T.meter = 100; return; }
    const trailing = (side === 0 ? M.teams[1].runs - M.teams[0].runs : M.teams[0].runs - M.teams[1].runs) >= 3;
    const comeback = trailing && (!BZ.game || !BZ.game.settings || BZ.game.settings.comeback !== false) ? 1.5 : 1;
    const hype = M.upgrades && M.upgradeTeam === side ? 1 + .1 * (M.upgrades.hype || 0) : 1;
    const before = T.meter;
    T.meter = clamp(T.meter + amt * TUNE.meterGain * comeback * hype, 0, 100);
    if (before < 100 && T.meter >= 100) BZ.bus.emit('meterFull', { side, team: T.id });
    BZ.bus.emit('meter', { side, value: T.meter, why });
  },
  install(M) {
    const off = () => BZ.offense(M).side, def = () => BZ.defense(M).side, on = (e, f) => M.unsub.push(BZ.bus.on(e, f));
    on('contact', d => this.gain(M, off(), lerp(BZ.GAINS.contact[0], BZ.GAINS.contact[1], clamp(d.Q || 0, 0, 1)), 'contact'));
    on('hit', d => this.gain(M, off(), d.bases >= 2 ? BZ.GAINS.xbh : BZ.GAINS.single, 'hit'));
    on('homer', () => this.gain(M, off(), BZ.GAINS.homer, 'homer'));
    on('strikeout', () => this.gain(M, def(), BZ.GAINS.strikeout, 'strikeout'));
    on('catch', d => { if (d.fly && (d.dive || d.wall)) this.gain(M, def(), BZ.GAINS.bigCatch, 'catch'); });
    on('doublePlay', () => this.gain(M, def(), BZ.GAINS.doublePlay, 'dp'));
    on('steal', d => { if (d.ok) this.gain(M, off(), BZ.GAINS.steal, 'steal'); });
    on('headfirst', () => this.gain(M, off(), BZ.GAINS.headfirst, 'headfirst'));
    on('target', () => this.gain(M, off(), BZ.GAINS.target, 'target'));
  },
  /** arm the Batzooka (the next swing) */
  arm(M, side) {
    const T = M.teams[side]; if (T.meter < 100 || T.batzookaArmed) return false;
    T.batzookaArmed = true; BZ.bus.emit('batzookaArmed', { side }); BZ.sfx('charge'); BZ.sting('ignite');
    return true;
  },
  /** spend the armed Batzooka (on any swing) */
  spend(M, side) { const T = M.teams[side]; if (!T.batzookaArmed) return false; T.batzookaArmed = false; T.meter = 0; return true; },
  /** turbo refills between pitches */
  pitchTick(M) { for (const T of M.teams) T.turbo = Math.min(100, T.turbo + 15); },
  turboTick(M, dt) { for (const T of M.teams) { if (!M.play || M.phase !== 'inPlay') T.turbo = Math.min(100, T.turbo + 10 * dt); if (M.cheats.infTurbo && T.humans.length) T.turbo = 100; if (M.cheats.infMeter && T.humans.length) T.meter = 100; } },
  hype(M) { const O = M && M.teams ? Math.max(M.teams[0].meter, M.teams[1].meter) : 0; return clamp(O / 100, 0, 1); }
};
