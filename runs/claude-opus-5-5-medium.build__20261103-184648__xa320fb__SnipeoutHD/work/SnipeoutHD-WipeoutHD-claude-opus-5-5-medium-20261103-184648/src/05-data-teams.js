// Teams, craft, pilots, principals, speed classes, difficulty, weapons and pickup tables
(() => {
const SN = globalThis.SN;
SN.TEAMS = [
  { id: 'kestrel', name: 'KESTREL DYNAMICS', short: 'KESTREL', city: 'OSLO', stats: { speed: 6, thrust: 6, handling: 6, shield: 6 },
    colors: ['#f2f5f8', '#29c8e8', '#1a2a4a', '#7af0ff'], craft: 'KD-9 FJORD', design: 'fjord', copy: 'Precision is a form of courage. Kestrel has been brave since 2109.' },
  { id: 'hammerhead', name: 'HAMMERHEAD HEAVY INDUSTRIES', short: 'HAMMERHEAD', city: 'LAGOS', stats: { speed: 6, thrust: 4, handling: 3, shield: 9 },
    colors: ['#ff7a1a', '#2b2d33', '#ffd23f', '#ffb347'], craft: 'HH ANVIL', design: 'anvil', copy: 'Builds cranes, bridges and the occasional champion. All three survive impact.' },
  { id: 'soratek', name: 'SORA-TEK', short: 'SORA-TEK', city: 'OSAKA', stats: { speed: 5, thrust: 6, handling: 9, shield: 4 },
    colors: ['#f7f7f7', '#e0213a', '#16161c', '#ff5a6e'], craft: 'ST TSUBAME', design: 'tsubame', copy: 'Sora-Tek does not turn corners. Corners are informed of a change in direction.' },
  { id: 'volta', name: 'VOLTA NERO', short: 'VOLTA NERO', city: 'TURIN', stats: { speed: 9, thrust: 4, handling: 4, shield: 5 },
    colors: ['#141418', '#e8b84a', '#c8202a', '#ffd36a'], craft: 'VN SAETTA', design: 'saetta', copy: 'Straight lines, beautifully. Everything else, eventually.' },
  { id: 'caldera', name: 'CALDERA SYSTEMS', short: 'CALDERA', city: 'SANTIAGO', stats: { speed: 5, thrust: 9, handling: 5, shield: 5 },
    colors: ['#d8361c', '#6a2bd8', '#24202a', '#ff6a2a'], craft: 'CS VOLCAN', design: 'volcan', copy: 'Geothermal engineering. Zero to everything in four seconds.' },
  { id: 'nullset', name: 'NULL//SET', short: 'NULL//SET', city: 'BERLIN', stats: { speed: 8, thrust: 7, handling: 5, shield: 3 },
    colors: ['#0b0b0e', '#6aff3a', '#ff2a8a', '#6aff3a'], craft: 'N//S GHOSTLINE', design: 'ghostline', copy: 'No sponsor. No logo. No comment.' }
];
SN.TEAM = {}; for (const t of SN.TEAMS) SN.TEAM[t.id] = t;

SN.PILOTS = [
  { id: 'ingrid', name: 'INGRID VALE', team: 'kestrel', hair: 'ponytail', hc: '#f0d080', skin: '#f2d0b8', f0: 210, skill: .01, aggr: .8, line: 'Clean lines. Clean wins.', more: ['Holding the line.', 'Precision. Look it up.'] },
  { id: 'tomas', name: 'TOMAS BREKKE', team: 'kestrel', hair: 'short', hc: '#6a4a30', skin: '#e8c8a8', f0: 120, skill: 0, aggr: .7, line: 'Holding position.', more: ['Steady.', 'Shield is holding.'] },
  { id: 'amara', name: 'AMARA OKAFOR', team: 'hammerhead', hair: 'short', hc: '#1a1410', skin: '#8a5a3a', f0: 200, skill: .01, aggr: 1.0, line: "Shield's fine. Is yours?", more: ['That one stung.', 'Built for this.'] },
  { id: 'dayo', name: 'DAYO ADEYEMI', team: 'hammerhead', hair: 'bald', hc: '#1a1410', skin: '#6a4028', f0: 105, skill: 0, aggr: 1.2, line: 'Coming through. Literally.', more: ['Make room.', 'Heavy traffic.'] },
  { id: 'rin', name: 'RIN TAKAHARA', team: 'soratek', hair: 'long', hc: '#14141a', skin: '#f0d4b8', f0: 230, skill: .02, aggr: .7, line: 'Too wide. Again.', more: ['Apex taken.', 'Informed of the corner.'] },
  { id: 'kenji', name: 'KENJI MORI', team: 'soratek', hair: 'spiky', hc: '#202028', skin: '#e8c8a0', f0: 130, skill: 0, aggr: .9, line: 'Apex. Apex. Apex.', more: ['Too slow, rookie.', 'Inside line.'] },
  { id: 'luca', name: 'LUCA FERRANTE', team: 'volta', hair: 'short', hc: '#2a1a12', skin: '#e0b890', f0: 125, skill: .02, aggr: 1.0, line: 'Watch the straight. Watch it go.', more: ['Straight lines win.', 'Arrivederci.'] },
  { id: 'giulia', name: 'GIULIA MARCHETTI', team: 'volta', hair: 'long', hc: '#5a3420', skin: '#f0c8a0', f0: 215, skill: .01, aggr: 1.1, line: 'Ciao. Behind you.', more: ['Beautiful.', 'Not today.'] },
  { id: 'valentina', name: 'VALENTINA SOTO', team: 'caldera', hair: 'ponytail', hc: '#2a1810', skin: '#d8a880', f0: 205, skill: .01, aggr: 1.2, line: 'Hot engine. Hotter temper.', more: ['Launching.', 'Burn it.'] },
  { id: 'mateo', name: 'MATEO ARAYA', team: 'caldera', hair: 'short', hc: '#1a1008', skin: '#c89870', f0: 115, skill: 0, aggr: 1.0, line: 'Launching.', more: ['Pit lane, now.', 'Full power.'] },
  { id: 'kaizero', name: 'KAI-ZERO', team: 'nullset', hair: 'short', hood: true, hc: '#0b0b0e', skin: '#c8b8a8', f0: 140, crush: true, skill: .03, aggr: 1.3, line: 'Rookies make the best wreckage.', more: ['Behind you. Still.', 'Smile for the wreck report.'] },
  { id: 'hex', name: 'HEX', team: 'nullset', hair: 'spiky', hc: '#ff2a8a', skin: '#e8d0c0', f0: 175, skill: .02, aggr: 1.2, line: 'Signal lost. Yours.', more: ['No comment.', 'Glitch in your line.'] }
];
SN.PILOT = {}; for (const p of SN.PILOTS) SN.PILOT[p.id] = p;
SN.pilotsOf = team => SN.PILOTS.filter(p => p.team === team);

SN.PRINCIPALS = {
  kestrel: { name: 'DIRECTOR SOLVEIG HALE', f0: 180, hair: 'long', hc: '#d8d0c0', skin: '#f0d8c8' },
  hammerhead: { name: 'CHIEF EMEKA OBI', f0: 100, hair: 'bald', hc: '#101010', skin: '#5a3420' },
  soratek: { name: 'DR. HARUKA ISE', f0: 190, hair: 'short', hc: '#202020', skin: '#f0d8c0' },
  volta: { name: 'SIGNOR ARMANDO VELLUTI', f0: 110, hair: 'short', hc: '#a0a0a0', skin: '#e0c0a0' },
  caldera: { name: 'INGENIERA PAZ ROJAS', f0: 170, hair: 'ponytail', hc: '#301810', skin: '#c89070' },
  nullset: { name: 'THE ADMIN', f0: 90, crush: true, glitch: true }
};

SN.CLASSES = [
  { id: 'spark', name: 'SPARK', top: 1440, unlock: 'FROM THE START' },
  { id: 'flare', name: 'FLARE', top: 1840, unlock: 'WIN THE ROOKIE LICENCE' },
  { id: 'storm', name: 'STORM', top: 2240, unlock: 'EARN THREE FLARE MEDALS' },
  { id: 'singularity', name: 'SINGULARITY', top: 2720, unlock: 'MEDAL IN THE GRAND PRIX' }
];
SN.CLASS = {}; for (const c of SN.CLASSES) SN.CLASS[c.id] = c;

SN.DIFFICULTY = { Easy: { skill: .8, aggr: .6, rb: .4, top: .93 }, Normal: { skill: .92, aggr: 1, rb: 1, top: .97 }, Hard: { skill: .99, aggr: 1.3, rb: 1.2, top: 1.0 } };

/** a team's craft numbers at a class (§3.2), before the tuning sliders */
SN.craftStats = (teamId, clsId) => {
  const t = SN.TEAM[teamId].stats, ct = SN.CLASS[clsId].top, top = ct * (.94 + .012 * t.speed), k = Math.sqrt(top / 1440), h = .82 + .035 * t.handling;
  return { top, athr: .55 * top * (.8 + .04 * t.thrust), steer: 1.9 * k * h / 1.9, grip: 5.5 * k * h, gripMax: 640 * Math.pow(top / 1440, 1.5) * h, dmgMul: 1.35 - .06 * t.shield, mass: .8 + .05 * t.shield, hk: k * h };
};

/* ---- weapons (§3.4) ---- */
SN.WEAPONS = [
  { id: 'swarm', name: 'SWARM', color: '#ff4a4a', absorb: 16, desc: 'Three rockets fanned ahead. Tap to fire.' },
  { id: 'seeker', name: 'SEEKER', color: '#ff9a2a', absorb: 22, desc: 'Hold the target ahead to lock, then fire. It homes.' },
  { id: 'mine', name: 'MINEFIELD', color: '#ff3ad0', absorb: 18, desc: 'Drops five mines behind you. They wait.' },
  { id: 'cannon', name: 'CANNON', color: '#ffe23a', absorb: 14, desc: 'Hold to stream bolts at whoever is ahead.' },
  { id: 'rail', name: 'RAILSHOT', color: '#bff8ff', absorb: 28, desc: 'Hold to charge, release to snipe. Hitscan.' },
  { id: 'tremor', name: 'TREMOR', color: '#5aff6a', absorb: 30, desc: 'A shockwave rolls ahead. Airborne craft dodge it.' },
  { id: 'bulwark', name: 'BULWARK', color: '#4a8aff', absorb: 12, desc: 'Four seconds of invulnerability.' },
  { id: 'auto', name: 'AUTOPILOT', color: '#3ae8d0', absorb: 10, desc: 'Race control flies for five seconds.' },
  { id: 'nitro', name: 'NITRO', color: '#ffb000', absorb: 10, desc: 'A long, hot boost.' },
  { id: 'siphon', name: 'SIPHON', color: '#b0ff3a', absorb: 20, desc: 'Latches onto the craft ahead and drains its shield into yours.' }
];
SN.WEAPON = {}; SN.WEAPONS.forEach((w, i) => { w.i = i; SN.WEAPON[w.id] = w; });
SN.PICKUP_TABLE = {
  front: [2, 1, 4, 3, 1, 0, 3, 0, 1, 1], mid: [3, 3, 2, 2, 2, 1, 2, 1, 2, 2], back: [2, 3, 1, 1, 2, 3, 1, 3, 3, 2], snipeout: [3, 3, 2, 3, 3, 2, 2, 0, 1, 2]
};
})();
