// The whole race world for one circuit: road, terrain, dressing, sky, lamps. Used by the race and by replays.
import { Precipitation, THREE } from '../../pixel-engine.js';
import { buildTrackMesh, THEMES } from './trackmesh.js';
import { buildDressing } from './dressing.js';
import { applyHour, buildSkyDressing, nightOf } from './sky.js';
import { registerParticles } from './particles.js';
import { SkidMarks } from './skid.js';
const { Group } = THREE;
function lampPools(tr) { // Harbour Lights: lamps every 16 samples, their pools baked into the road's colours.
  const lamps = new Float32Array(tr.N), idx = [];
  for (let i = 0; i < tr.N; i += 16) { idx.push(i); for (let o = -3; o <= 3; o++) lamps[(i + o + tr.N) % tr.N] = Math.max(lamps[(i + o + tr.N) % tr.N], 1 - Math.abs(o) / 4); }
  return { lamps, idx };
}
export function buildWorld(ctx, tr, line, { hour, hourEnd = null, rain = false, speeds = null }) {
  registerParticles(ctx);
  const night = nightOf(hourEnd ?? hour), group = new Group(), theme = THEMES[tr.id];
  const pools = tr.id === 'harbour' ? lampPools(tr) : null;
  const mesh = buildTrackMesh(tr, line, { lamps: pools && night > 0.25 ? pools.lamps : null, lampIdx: pools?.idx ?? null, speeds, night: night > 0.5 });
  group.add(mesh.group);
  const dress = buildDressing(ctx, tr, mesh, hour, night);
  group.add(dress.group);
  const cx = (Math.min(...tr.x) + Math.max(...tr.x)) / 2, cz = (Math.min(...tr.z) + Math.max(...tr.z)) / 2;
  group.add(buildSkyDressing(tr, theme, hour, { cx, cz, seed: tr.N, skyline: tr.id === 'harbour' }));
  ctx.scene.add(group);
  const skids = new SkidMarks(1400, tr.surface === 'dirt' ? 'plum' : 'ink'); ctx.scene.add(skids.mesh);
  let curHour = null, inTunnel = false, rainFx = null;
  const setHour = (h, tunnel = 0) => { applyHour(ctx.engine, h, { rain, tunnel }); curHour = h; };
  setHour(hour);
  if (rain) { rainFx = new Precipitation({ kind: 'rain', count: 1100, area: [70, 26, 70], color: 0x94b0c2, speed: 26 }); rainFx.wind.set(1.2, 0.4); ctx.scene.add(rainFx); }
  const out = {
    group, mesh, dress, skids, theme, field: mesh.field, night, rain,
    lamps: dress.lamps,
    setHourIf(h) { if (Math.abs(h - curHour) > 0.05) setHour(h, inTunnel ? 1 : 0); },
    update(dt, t, cheer, focus, sAtFocus) {
      dress.update(dt, t, cheer, focus);
      if (dress.tunnel && sAtFocus !== undefined) { const now = sAtFocus > dress.tunnel[0] && sAtFocus < dress.tunnel[1]; if (now !== inTunnel) { inTunnel = now; setHour(curHour, now ? 1 : 0); } }
      if (rainFx && focus) rainFx.update(dt, focus);
    },
    fixedUpdate(dt) { dress.fixedUpdate(dt); },
    setLights(n, green) { dress.lamps.forEach((l, k) => { l.red.visible = !green && k < n; l.green.visible = !!green; }); },
  };
  return out;
}
