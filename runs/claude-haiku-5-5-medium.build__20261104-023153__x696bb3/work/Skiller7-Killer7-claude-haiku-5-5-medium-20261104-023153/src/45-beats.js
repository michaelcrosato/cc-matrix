/* Skiller7: the cutscenes. Each beat is a generator of camera shots and dialogue (see S7.cutStep in 40-scenes). */
S7.BEATS = {
  t00: function* () {
    yield { shot: { at: [2.5, 14.5, 3.4], look: [11, 11.5, 1.2], fov: 56 }, t: 2.6 };
    yield { say: S7.LINES.t00Arrival, opts: { name: 'THE GRAND HOTEL NADA' } };
  },
  t01: function* () {
    yield { shot: { at: [57.5, 2.5, 4.2], look: [60.5, 40.5, 1.0], fov: 54 }, t: 2.6 };
    yield { say: S7.LINES.t01Arrival, opts: { name: 'APRES PISTE' } };
  },
  boss: function* (r) {
    const b = r.sim.boss, p = r.sim.pos;
    yield { shot: { at: [b.x - p.dx * 4.5, b.y - p.dy * 4.5, p.z + 2.4], look: [b.x, b.y, p.z + 1.8], fov: 46 }, t: 3.4 };
    yield { say: [b.def.line], opts: { name: b.def.name, voice: S7.VOICE.bell } };
  }
};
