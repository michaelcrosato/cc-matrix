/* 40-story: the cast (def('speaker', ...): name, color, rig, voice), the cutscene runner (camera keys, actors, lines
 * that wait for their voice or a press, hold to skip), radio lines, briefings. Cutscenes run on the Sim's clock and
 * headless (lines time out by their voice's length), so tests can play them to the end. */
const SPK = (id, s) => def('speaker', id, s);
SPK('kai', { name: 'KAI', color: '#ff6a5a', voice: { base: 150, wave: 'sawtooth', rate: 11 }, rig: { build: 'heroic', size: 1.05, weapon: 'gun', outfit: 'coat', sleeves: 'long', hair: 'short', colors: { coat: '#2e3038', cloth: '#e8e4dc', pants: '#24262e', trim: '#c8282a', hair: '#141218', skin: '#c8906a', boot: '#141414' } } });
SPK('rook', { name: 'ROOK', color: '#5a9aff', voice: { base: 105, wave: 'sawtooth', rate: 9, fx: 'gravel' }, rig: { build: 'bulky', size: 1.1, weapon: 'shotgun', outfit: 'coat', hair: 'bald', colors: { coat: '#5a3a24', cloth: '#2e5a9a', pants: '#2e2a26', skin: '#e0b090', boot: '#2a1a10' } } });
SPK('mari', { name: 'MARI', color: '#5ad17a', voice: { base: 230, wave: 'square', rate: 12 }, rig: { build: 'heroic', size: 1, weapon: 'gun', outfit: 'coat', hair: 'ponytail', colors: { coat: '#ff7a2a', cloth: '#f4f0e8', trim: '#22a05a', pants: '#2a3446', hair: '#3a2018', skin: '#c89a74' } } });
SPK('juno', { name: 'JUNO', color: '#ffd34a', voice: { base: 200, wave: 'square', rate: 13, fx: 'radio' }, rig: { build: 'chibi', size: 1, weapon: null, hair: 'spiky', hat: { style: 'band', color: '#f5b700' }, colors: { cloth: '#3a4a6a', pants: '#2a2e3a', hair: '#2ac8b8', skin: '#e8c0a0' } } });
SPK('hale', { name: 'DIRECTOR HALE', color: '#c8d4e8', voice: { base: 175, wave: 'triangle', rate: 10, fx: 'radio' }, rig: { build: 'heroic', weapon: null, outfit: 'coat', hair: 'long', colors: { coat: '#5a6070', cloth: '#2a2e3a', hair: '#d8dce4', skin: '#d8a888' } } });
SPK('tejada', { name: 'DR. TEJADA', color: '#9ae8ff', voice: { base: 140, wave: 'triangle', rate: 9 }, rig: { build: 'heroic', weapon: null, outfit: 'coat', hair: 'short', colors: { coat: '#e8e8e0', cloth: '#6a8aaa', pants: '#4a4a52', hair: '#b8b8b8', skin: '#b8865e' } } });
SPK('krake', { name: 'ADMIRAL KRAKE', color: '#ff4a4a', voice: { base: 95, wave: 'sawtooth', rate: 8, fx: 'boom' }, rig: { build: 'heroic', size: 1.15, weapon: 'cutlass', outfit: 'coat', hair: 'long', cape: { len: 7, width: 5, seg: 2.5 }, hat: { style: 'cap', color: '#1a2240' }, colors: { coat: '#1e2a4a', cloth: '#14182a', trim: '#e8c040', cape: '#1a1e30', capeIn: '#8a1a1a', hair: '#e8e8f0', pants: '#14182a', skin: '#d0a080', metal: '#d8dce4', hilt: '#e8c040' } } });
SPK('barracuda', { name: 'BARRACUDA', color: '#3ae8d8', voice: { base: 210, wave: 'square', rate: 13 }, rig: { build: 'heroic', size: 1.05, weapon: 'harpoon', armor: true, hair: 'ponytail', colors: { cloth: '#1a6a6a', plate: '#2a3a44', pants: '#145050', hair: '#f0f0f0', skin: '#c89a74', metal: '#5a6a74' } } });
SPK('hammerhead', { name: 'HAMMERHEAD', color: '#ff9a3a', voice: { base: 80, wave: 'sawtooth', rate: 6, fx: 'gravel' }, rig: { build: 'bulky', size: 1.6, weapon: 'minigun', armor: true, hat: { style: 'helmet', color: '#4a5058' }, colors: { cloth: '#3a3e44', plate: '#5a6068', pants: '#2a2c30', skin: '#c8906a', metal: '#3a3a40' } } });
SPK('gull', { name: 'THE GULL', color: '#c8ccd8', voice: { base: 190, wave: 'triangle', rate: 10 }, rig: { build: 'heroic', weapon: 'sniper', outfit: 'coat', hood: true, colors: { coat: '#6a7078', cloth: '#4a5056', hair: '#5a6068', pants: '#34383c' } } });
SPK('worker', { name: 'DOCK WORKER', color: '#f2c12e', voice: { base: 130, wave: 'square', rate: 11 }, rig: { build: 'heroic', weapon: null, hat: { style: 'helmet', color: '#f2c12e' }, colors: { cloth: '#ff8a2a', pants: '#3a4a6a' } } });
SPK('fisher', { name: 'FISHERMAN', color: '#f2c12e', voice: { base: 160, wave: 'square', rate: 12 }, rig: { build: 'chibi', weapon: null, outfit: 'coat', hat: { style: 'cap', color: '#f2c12e' }, colors: { coat: '#f2c12e', pants: '#2a3a5a' } } });
SPK('captor', { name: 'RED TIDE', color: '#ff4a4a', voice: { base: 120, wave: 'sawtooth', rate: 11 }, rig: { build: 'heroic', weapon: 'gun', outfit: 'coat', colors: { coat: '#b81e24' } } });
SPK('hq', { name: 'CREST HQ', color: '#8ab4ff', voice: { base: 170, wave: 'triangle', rate: 11, fx: 'radio' }, rig: { build: 'heroic', weapon: null, colors: { cloth: '#2a3454' } } });
TC.speaker = id => reg('speaker', id);

/* ---- cutscenes ---- */
const CUT = (id, steps, o = {}) => def('cutscene', id, Object.assign({ steps }, o));
TC.CUT = CUT;
/** the length of a line in seconds (the voice's syllables, or a reading time) */
function lineDur(text, who) { const sp = reg('speaker', who), rate = sp && sp.voice ? sp.voice.rate : 10, syl = Math.max(2, (text.match(/[aeiouy]+/gi) || []).length); return Math.max(1.4, syl / rate + .9 + (text.match(/[.!?,...]/g) || []).length * .15); }
TC.lineDur = lineDur;
function startCut(sim, id, onDone) {
  const C = reg('cutscene', id); if (!C) { if (onDone) onDone(); return; }
  sim.cut = { id, C, i: 0, t: 0, wait: 0, line: null, cam: null, camK: null, actors: {}, onDone, skipHold: 0, fx: [] };
  sim.ev({ type: 'cutstart', id });
  cutAdvanceSteps(sim);
}
TC.startCut = startCut;
function cutActor(sim, id, o) {
  const cut = sim.cut; let a = cut.actors[o.as || id];
  if (!a) { const sp = reg('speaker', id); a = cut.actors[o.as || id] = { id, rig: makeRig(sim, Object.assign({}, sp ? sp.rig : {}, o.rig || {})), x: 0, y: 0, z: 0, facing: 0, pose: null, expr: null, point: false }; }
  Object.assign(a, { x: o.at ? o.at[0] : a.x, y: o.at ? o.at[1] : a.y, z: o.at ? o.at[2] || 0 : a.z, facing: o.facing !== undefined ? o.facing * DEG : a.facing, pose: o.pose !== undefined ? o.pose : a.pose, expr: o.expr !== undefined ? o.expr : a.expr, point: o.point !== undefined ? o.point : a.point, hide: !!o.hide });
  if (o.to) { a.from = [a.x, a.y, a.z]; a.to = o.to; a.mt = 0; a.mdur = o.dur || 1.5; }
}
/** run steps until one blocks */
function cutAdvanceSteps(sim) {
  const cut = sim.cut;
  while (cut && cut.i < cut.C.steps.length) {
    const s = cut.C.steps[cut.i++];
    if (s.cam) { const c = s.cam; cut.camK = { from: c.from || cut.cam || c.to, to: c.to || c.from, dur: c.dur || .001, t: 0, ease: c.ease || 'inOut' }; cut.cam = Object.assign({}, cut.camK.from); }
    if (s.actor) cutActor(sim, s.actor, s);
    if (s.fx) { cut.fx.push(s.fx); sim.ev({ type: 'cutfx', fx: s.fx, at: s.at }); }
    if (s.music) sim.ev({ type: 'music', song: s.music });
    if (s.sfx) sim.ev({ type: 'sfx', name: s.sfx });
    if (s.screen !== undefined) cut.screen = s.screen;
    if (s.do) s.do(sim);
    if (s.say) { cut.line = { who: s.say[0], text: s.say[1], t: 0, dur: lineDur(s.say[1], s.say[0]) }; sim.ev({ type: 'line', who: s.say[0], text: s.say[1], cut: true }); return; }
    if (s.wait) { cut.wait = s.wait; return; }
  }
  if (cut && cut.i >= cut.C.steps.length && !cut.line && cut.wait <= 0) endCut(sim);
}
function endCut(sim) { const cut = sim.cut; if (!cut) return; sim.cut = null; sim.ev({ type: 'cutend', id: cut.id }); if (cut.onDone) cut.onDone(); }
function cutStep(sim, dt, cmds) {
  const cut = sim.cut; cut.t += dt;
  if (cut.camK) { const k = cut.camK; k.t += dt; const u = clamp(k.t / k.dur, 0, 1), e = k.ease === 'linear' ? u : smooth(u); cut.cam = { x: lerp(k.from.x, k.to.x, e), y: lerp(k.from.y, k.to.y, e), z: lerp(k.from.z, k.to.z, e), yaw: lerpAng(k.from.yaw, k.to.yaw, e), pitch: lerp(k.from.pitch || 0, k.to.pitch || 0, e), fov: k.to.fov || k.from.fov }; }
  for (const id in cut.actors) {
    const a = cut.actors[id];
    if (a.to) { a.mt += dt; const u = clamp(a.mt / a.mdur, 0, 1); a.vx = (a.to[0] - a.from[0]) / a.mdur; a.vy = (a.to[1] - a.from[1]) / a.mdur; a.x = lerp(a.from[0], a.to[0], u); a.y = lerp(a.from[1], a.to[1], u); a.z = lerp(a.from[2], a.to[2] || 0, u); if (u >= 1) { a.to = null; a.vx = a.vy = 0; } }
    a.rig.update(dt, { x: a.x, y: a.y, z: a.z, vx: a.vx || 0, vy: a.vy || 0, facing: a.facing, pose: a.pose, expr: a.expr, point: a.point });
  }
  // presses: confirm advances a line; holding it skips the scene (the presentation passes them as fire)
  const press = cmds.some(c => c && c.firePressed), hold = cmds.some(c => c && c.fireDown);
  cut.skipHold = hold ? cut.skipHold + dt : 0;
  if (cut.skipHold > .6 || cut.skip) { skipCut(sim); return; }
  if (cut.line) { cut.line.t += dt; if (cut.line.t >= cut.line.dur || (press && cut.line.t > .25)) { cut.line = null; sim.ev({ type: 'lineend' }); cutAdvanceSteps(sim); } return; }
  if (cut.wait > 0) { cut.wait -= dt; if (cut.wait <= 0) cutAdvanceSteps(sim); return; }
  cutAdvanceSteps(sim);
}
TC.cutStep = cutStep;
/** skip to the cutscene's end state */
function skipCut(sim) {
  const cut = sim.cut; if (!cut) return;
  for (; cut.i < cut.C.steps.length; cut.i++) { const s = cut.C.steps[cut.i]; if (s.do) s.do(sim); }
  cut.line = null; sim.ev({ type: 'cutskip', id: cut.id }); endCut(sim);
}
TC.skipCut = skipCut;
