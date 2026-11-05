// Dipout HD: content data. Speeds are m/s, lengths are metres (z up, y south, x east).
(() => {
  const SN = globalThis.SN;

  // Speed classes: each faster and harder to hold.
  SN.CLASSES = [
    { id: 'spark', name: 'SPARK', top: 128, thrust: 34, shieldMul: 1.1, grip: 1.0 },
    { id: 'flare', name: 'FLARE', top: 150, thrust: 40, shieldMul: 1.0, grip: 0.95 },
    { id: 'storm', name: 'STORM', top: 170, thrust: 45, shieldMul: 0.92, grip: 0.9 },
    { id: 'singularity', name: 'SINGULARITY', top: 190, thrust: 50, shieldMul: 0.85, grip: 0.85 },
  ];

  // Teams and their liveries (body colour, stripe, glow). Four teams, each with two pilots.
  SN.TEAMS = [
    { id: 'aurex', name: 'AUREX', body: '#d8dde6', stripe: '#1f6fd6', glow: '#36c8ff' },
    { id: 'vantorr', name: 'VANTORR', body: '#2a2d36', stripe: '#ff4f3d', glow: '#ff7a4f' },
    { id: 'halcyon', name: 'HALCYON', body: '#e9e3d0', stripe: '#18a06a', glow: '#7dffb1' },
    { id: 'ostrane', name: 'OSTRANE', body: '#5a2f7a', stripe: '#ffd23a', glow: '#d07bff' },
  ];
  SN.PILOTS = [
    { id: 'kade', name: 'KADE ORSOLYA', team: 0, skill: 1.0 },
    { id: 'ines', name: 'INES VARRO', team: 0, skill: 0.92 },
    { id: 'tavi', name: 'TAVI OKONKWO', team: 1, skill: 1.05 },
    { id: 'mira', name: 'MIRA SOLDNE', team: 1, skill: 0.95 },
    { id: 'lune', name: 'LUNE HADDAD', team: 2, skill: 0.9 },
    { id: 'pell', name: 'PELL ESTRADA', team: 2, skill: 1.0 },
    { id: 'rook', name: 'ROOK ANDVIK', team: 3, skill: 1.08 },
    { id: 'sable', name: 'SABLE QUILL', team: 3, skill: 0.94 },
  ];

  // Weapons. Each has a colour for its pickup and a one-line description for the HUD and About.
  SN.WEAPONS = {
    swarm: { name: 'SWARM', color: '#ff9a3c', desc: 'Homing missile. Finds the nearest craft ahead.', dmg: 16, speed: 170, life: 4 },
    cannon: { name: 'CANNON', color: '#ff4d6d', desc: 'Straight, fast bolt. Hard to dodge at range.', dmg: 11, speed: 260, life: 2.2 },
    mine: { name: 'MINE', color: '#c7ff3c', desc: 'Dropped behind. Floats until someone touches it.', dmg: 26, life: 40 },
    tremor: { name: 'TREMOR', color: '#8b7bff', desc: 'Shockwave. Knocks grounded craft in a wide ring.', dmg: 12, radius: 38, life: 0.6 },
    bulwark: { name: 'BULWARK', color: '#4fd8ff', desc: 'Shield for four seconds. Incoming hits cut to a fifth.', life: 4 },
  };
  SN.WEAPON_TABLE = ['swarm', 'cannon', 'mine', 'tremor', 'bulwark'];

  // Tracks: closed loops of metres, built from a formula so Node and the browser agree.
  // Each track has jumps (a crest that throws the craft into the air) and banked bends.
  const loop = (id, name, o) => ({ id, name, ...o });
  SN.TRACKS = [
    loop('nordlicht', 'NORDLICHT RING', {
      N: 72, R: 640, ax: 120, ay: 0.7, wob: 90, zBase: 0, zWave: 26,
      crest: [{ at: 0.18, h: 9, w: 0.011 }, { at: 0.62, h: 12, w: 0.012 }],
      pads: [0.05, 0.27, 0.45, 0.7, 0.9],
      tint: '#0d1a33', neon: '#36c8ff', sky: ['#05070f', '#0c2038', '#2a4a7a'], lane: 0.4,
    }),
    loop('vault', 'VAULT SPIRAL', {
      N: 84, R: 520, ax: 150, ay: 0.55, wob: 60, zBase: 14, zWave: 34,
      crest: [{ at: 0.09, h: 10, w: 0.0115 }, { at: 0.52, h: 14, w: 0.013 }, { at: 0.8, h: 8, w: 0.0115 }],
      pads: [0.03, 0.22, 0.4, 0.6, 0.78],
      tint: '#1a0f1f', neon: '#ff7a4f', sky: ['#0a0410', '#2a1030', '#6a2a48'], lane: 0.55,
    }),
  ];

  // Control points for a track: a closed ring whose radius and height vary, with gaussian crests.
  SN.trackPoints = (def) => {
    const pts = [];
    for (let i = 0; i < def.N; i++) {
      const t = (i / def.N) * SN.TAU;
      const r = def.R + def.wob * Math.sin(3 * t) + 30 * Math.cos(5 * t);
      let z = def.zBase + def.zWave * Math.sin(t * 2 + 0.6) * 0.5;
      for (const c of def.crest) {
        let d = Math.abs(t / SN.TAU - c.at);
        d = Math.min(d, 1 - d);
        z += c.h * Math.exp(-((d / c.w) * (d / c.w)));
      }
      pts.push([Math.cos(t) * r, Math.sin(t) * r * def.ay * 1.6, z]);
    }
    return pts;
  };
  SN.trackDef = (id) => SN.TRACKS.find((t) => t.id === id) || SN.TRACKS[0];
})();
