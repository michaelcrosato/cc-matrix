/* OLYMPIYIKES! — hype and YIKES TURBO (§5.5), Yikes moments (§5.8), the crowd's excitement (§5.11). */
(() => {
'use strict';
const E = My3D2dge, O = OLY, game = O.game, G = O.G, clamp = E.clamp;

O.Crowd = { level: .3, wave: 0, on: false,
  update(dt) { this.level = Math.max(.2, this.level - dt * .12); this.wave = Math.max(0, this.wave - dt); if (O.CrowdAudio) O.CrowdAudio.level = this.level; },
  excite(k = .3) { this.level = Math.min(1, this.level + k); },
  doWave(s = 4) { this.wave = s; this.level = 1; } };

O.Hype = {
  /** gain hype (scaled by the global slider); a full flame flashes the turbo prompt */
  gain(ctx, a, k) { if (!a || a.turboT > 0) return; const was = a.hype; a.hype = clamp(a.hype + k * G.hypeGain, 0, 1); if (was < 1 && a.hype >= 1 && !ctx.sandbox && a.human) O.sfx('powerup', { vol: .4 }); },
  update(ctx, a, dt) {
    if (a.turboT > 0) { a.turboT -= dt; if (a.turboT <= 0) { a.turboT = 0; if (!ctx.sandbox) game.audio.layer('hype', 0, .5); } }
    else if (a.hype < 1) a.hype = Math.max(0, a.hype - G.hypeDecay * dt);
    if (a.pilot && a.pilot.cheat === 'perfect' || a.infHype) a.hype = Math.max(a.hype, a.turboT > 0 ? 0 : 1);
  },
  /** fire turbo if the flame is full */
  fire(ctx, a) {
    if (a.hype < 1 || a.turboT > 0 || ctx.def.noTurbo) return false;
    a.hype = 0; a.turboT = G.turboTime; a.turbos = (a.turbos || 0) + 1;
    if (!ctx.sandbox) {
      O.sfx('turbo'); game.audio.layer('hype', 1, .3); O.Crowd.doWave(3); O.CrowdAudio.cheer();
      O.Comms.cue('turbo', { name: a.short, nation: a.nat.name });
      if (a.human) O.banner(ctx.def.turbo || 'YIKES TURBO!', { life: 1.2, y: .2, scale: 2, colors: ['#ffffff', '#ffd060', '#ff5a1a'] });
    }
    ctx.emit('turbo', { a });
    return true;
  },
  /** the turbo multiplier on an event's quantity */
  mult(a, m) { return a.turboT > 0 ? 1 + (m - 1) * G.turboPower : 1; }
};

/** a Yikes moment: stamp, sting, gasp, commentary, sympathy hype, the nation's yikes count */
O.Yikes = {
  trigger(ctx, a, word, kind) {
    a.yikes = (a.yikes || 0) + 1; a.notes = a.notes || [];
    if (ctx.meet && ctx.meet.yikes && !ctx.sandbox) ctx.meet.yikes[a.nat.id] = (ctx.meet.yikes[a.nat.id] || 0) + 1;
    a.hype = clamp((a.hype || 0) + G.yikesHype, 0, 1);
    ctx.emit('yikes', { a, kind: kind || word, word });
    if (ctx.sandbox) return;
    if (a.human || ctx.attract || ctx.active.length <= 2) {
      O.stamp(word || 'OLYMPIYIKES!'); O.sting('yikes'); game.shake(4); O.CrowdAudio.gasp();
      O.Comms.cue(kind === 'falsestart' ? 'falsestart' : kind === 'foul' ? 'foul' : 'yikes', { name: a.short, nation: a.nat.name }, { prio: 8 });
    }
  }
};
})();
