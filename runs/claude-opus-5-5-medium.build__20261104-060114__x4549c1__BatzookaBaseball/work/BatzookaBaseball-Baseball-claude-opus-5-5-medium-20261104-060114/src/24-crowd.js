/* CROWD AND BALLPARK LIFE: hype (follows the batting team's meter), reactions by side, the wave above 70, fireworks or
 * confetti after homers and wins, vendors, and the between-innings shows (Mascot Race, Dance Cam, T-Shirt Cannon,
 * Grounds Crew Shuffle), each about 4 s and skippable. */
const SHOWS = [['race', 'THE MASCOT RACE'], ['dance', 'DANCE CAM'], ['tshirt', 'T-SHIRT CANNON'], ['rakers', 'GROUNDS CREW SHUFFLE']];
function pickShow() { const i = Math.floor(RF() * SHOWS.length); return { kind: SHOWS[i][0], title: SHOWS[i][1], len: 4.2, t: 0, trip: Math.floor(RF() * 3) }; }
const CROWD = { jump: 0, side: 0, groan: 0, wave: 0, waveOn: false, pops: [] };
BZ.CROWD = CROWD;
BZ.bus.on('homer', d => { CROWD.jump = 2.5; CROWD.side = d.team; sfx('roar'); });
BZ.bus.on('hit', d => { CROWD.jump = 1.2; CROWD.side = M ? M.half : 0; sfx('cheer'); });
BZ.bus.on('catch', d => { CROWD.jump = d.dive || d.wall ? 1.5 : .6; CROWD.side = M ? 1 - M.half : 1; if (d.dive || d.wall) sfx('roar'); });
BZ.bus.on('strikeout', () => { CROWD.jump = .8; CROWD.side = M ? 1 - M.half : 1; CROWD.groan = 1; sfx('oooh'); });
BZ.bus.on('error', () => { CROWD.groan = 1.2; sfx('groan'); });
BZ.bus.on('bowlOver', () => { CROWD.jump = 1.2; sfx('oooh'); });
BZ.bus.on('rhubarbStart', () => { CROWD.jump = 12; sfx('roar'); });
function celebrate(x, y) {
  if (HEADLESS || !M) return;
  const night = M.park.night;
  for (let i = 0; i < 5; i++) game.after(i * .25, () => { const px_ = x + (RF() - .5) * 300, py_ = y + (RF() - .5) * 200, z = 140 + RF() * 80;
    if (night) { P.explosion(px_, py_, z, .6, { debris: false, shake: 0, freeze: false }); P.glints(px_, py_, z, 14, ['#ff5a5a', '#5ab0ff', '#ffe060', '#7dffb0'][i % 4]); sfx('firework'); }
    else { P.bits(px_, py_, z, 26, ['#ff5a5a', '#5ab0ff', '#ffe060', '#7dffb0', '#ffffff']); sfx('pop'); } });
}
BZ.bus.on('fireworks', d => celebrate(d.x, d.y));
BZ.bus.on('gameEnd', () => { if (M && !M.fast) celebrate(HX, HY - 700); });
BZ.bus.on('siloPop', () => { if (!HEADLESS) { const kit = PARK_CACHE.kernel, s = kit && kit.props.find(p => p.kind === 'silo'); if (s) P.bits(s.x, s.y, 120, 60, ['#fff4c0', '#ffe080', '#ffffff']); } });
function crowdStep(dt) {
  CROWD.jump = Math.max(0, CROWD.jump - dt); CROWD.groan = Math.max(0, CROWD.groan - dt);
  const hype = M ? offense().meter : 0; CROWD.waveOn = hype > 70; if (CROWD.waveOn) CROWD.wave += dt * 1.2;
  if (M && M.show) M.show.t += dt;
  for (const p of CROWD.pops) p.t -= dt; CROWD.pops = CROWD.pops.filter(p => p.t > 0);
  if (M && !M.fast && RF() < dt * .08 && CROWD.pops.length < 2) { const kit = PARK_CACHE[M.parkId]; if (kit && kit.fans.length) { const f = kit.fans[Math.floor(RF() * kit.fans.length)], t = ['PEANUTS!', 'GET YER DOGS!', 'COLD LEMONADE!', 'POPCORN!', 'PEANUTS! PEANUTS!'][Math.floor(RF() * 5)]; CROWD.pops.push({ x: f.x, y: f.y, z: f.z + 20, text: t, t: 1.8 }); if (RF() < .3 && !BZ.babble.q.length) BZ.babble.say(t, 'vendor'); } }
}
