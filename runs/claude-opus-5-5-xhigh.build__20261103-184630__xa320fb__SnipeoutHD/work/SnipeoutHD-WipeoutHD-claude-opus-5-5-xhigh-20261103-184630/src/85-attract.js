// SNIPEOUT HD: the attract mode. Ten seconds without input on the title or any front-end screen starts a looping demo
// played by the AI, which cheats freely so the features show: a SPARK race at Port Solenne (every weapon in rotation, a
// barrel roll off the Harbour Step), a STORM SNIPEOUT at Meridian Stack (eliminations, respawns, the Stack Drop),
// OVERCLOCK at Karakum Spire (a zone every two seconds), a FLARE race at Borealis Vault (the Vault, the ice tunnel), and
// a title card. Any input (a key, a button, the stick, a click, a touch) returns to the title within one step.
(() => {
const E = My3D2dge, SN = globalThis.SN;
const AT = SN.attract = {
  idleT: 0, IDLE: 10, seg: 0, segT: 0, race: null, tv: null, seen: { weapons: new Set(), tracks: new Set() }, cards: 0,
  PLAYLIST: [
    { track: 'solenne', mode: 'race', cls: 'SPARK', dur: 32 },
    { track: 'meridian', mode: 'snipeout', cls: 'STORM', dur: 32 },
    { track: 'karakum', mode: 'overclock', cls: 'SPARK', dur: 28 },
    { track: 'borealis', mode: 'race', cls: 'FLARE', dur: 32 },
    { card: true, dur: 6 }
  ],
  /** any input this step? (keys, buttons, the stick, the mouse moving or clicking, a touch) */
  anyInput(I) {
    if (I.anyPressed() || I.clicked()) return true;
    const m = I.padMove; if (m && Math.hypot(m[0], m[1]) > .3) return true;
    if (I.held.size) return true;
    const p = I.mouse; if (p && p.active && AT._mt !== undefined && p.t !== AT._mt) { AT._mt = p.t; return true; } AT._mt = p ? p.t : 0;
    return false;
  },
  /** the front end's idle clock: true when the attract should start */
  idle(dt, I) { if (AT.anyInput(I)) { AT.idleT = 0; return false; } AT.idleT += dt; return AT.idleT >= AT.IDLE; },
  rules(seg) {
    // the demo's cheats: infinite energy, every weapon in rotation, a roll on every jump, aggressive pilots
    let k = 0;
    const o = { forcePickup: () => SN.WEAPON_ORDER[(k++) % 10], aiOpts: () => ({ aggression: 1.5, alwaysRoll: true, eager: true }), fastRescue: true, rubberBand: false };
    if (seg.mode !== 'snipeout') o.infiniteEnergy = () => true;   // (the snipeout shows eliminations and respawns)
    if (seg.mode === 'overclock') o.zoneTime = 2;
    return o;
  },
  start(k = 0) { AT.seg = k; AT.segT = 0; AT.begin(); },
  begin() {
    const seg = AT.PLAYLIST[AT.seg]; AT.segT = 0; AT.race = null;
    if (seg.card) { AT.cards++; return; }
    const tw = SN.render.trackWorld(seg.track, seg.mode === 'overclock' ? 'overclock' : 'normal');
    const n = seg.mode === 'overclock' ? 1 : 8, ent = SN.field({ humans: [], size: n, seed: AT.seg + 1 });
    if (seg.mode === 'overclock') { ent.length = 0; ent.push({ pilot: 'takahara', team: 'soratek', control: 'ai' }); }
    const R = AT.race = new SN.Race({ track: tw.T, mode: seg.mode, cls: seg.cls, laps: 9, seed: 9000 + AT.seg * 17 + AT.cards, entrants: ent, intro: false, rules: AT.rules(seg), record: false });
    if (seg.mode === 'overclock') R.player = null;
    SN.render.attach(tw, R); AT.tv = new SN.TVDirector(tw.T, tw.terrain); AT.tw = tw;
    SN.audio.music(SN.TRACKS[seg.track].song === 'solenne' && seg.mode === 'overclock' ? 'overclock' : seg.mode === 'overclock' ? 'overclock' : SN.TRACKS[seg.track].song, { layers: 'all', fade: .8 });
    AT.seen.tracks.add(seg.track);
  },
  step(dt) {
    const seg = AT.PLAYLIST[AT.seg]; AT.segT += dt;
    if (AT.race) {
      const R = AT.race; R.step(dt);
      for (const e of R.events) if (e.t === 'fire') AT.seen.weapons.add(e.weapon);
      if (R.mode === 'overclock' && R.zone >= 14) R.rules.zoneTime = 9999;
      SN.fx.events(R, AT.tw.world); SN.audio.events(R, { radio: false, all: true }); SN.hud.events(R); SN.hud.step(dt);
      const pose = AT.tv.update(R, dt, { attract: true }); if (AT.tw.world) { AT.tw.world.camera.fixed = pose; AT.tw.world.step(dt); }
      SN.audio.humStep(R, AT.tv.target, AT.tw.world, dt, true);
    }
    if (AT.segT >= seg.dur || (AT.race && AT.race.state === 'results')) { AT.seg = (AT.seg + 1) % AT.PLAYLIST.length; AT.begin(); }
  },
  draw(r) {
    const seg = AT.PLAYLIST[AT.seg], g0 = E.current;
    if (AT.race && AT.tw.world) AT.tw.world.draw(r);
    r.overlay(g => {
      const T = (s, x, y, c, o = {}) => E.font.text(g, s, x, y, c, Object.assign({ outline: '#05040c' }, o));
      if (seg.card) { g.fillStyle = '#05040c'; g.fillRect(0, 0, r.W, r.H); g._c = null; SN.drawLogo(g, r.W / 2, r.H / 2 - 40, 1); if (Math.floor(g0.real * 2) % 2) T('PRESS START', r.W / 2, r.H / 2 + 30, '#ffffff', { scale: 2, align: 'center' }); return; }
      // the demo's chrome: a DEMO chip, the logo small, the positions, weapon callouts, PRESS ANY BUTTON
      SN.drawLogo(g, 66, 10, .45);
      SN.UI.panel(g, r.W / 2 - 22, 4, 44, 14, '#ff3ab4', .9, '#ffffff'); T('DEMO', r.W / 2, 7, '#05040c', { align: 'center', outline: false });
      const R = AT.race; if (R) {
        T(SN.MODES[R.mode].label + ' · ' + SN.TRACKS[R.track.id].name + ' · ' + R.cls, r.W / 2, 22, '#7af0ff', { align: 'center', font: 'tiny' });
        if (R.mode === 'overclock') T('ZONE ' + R.zone, r.W - 10, 30, SN.hsl(R.zone * 37 % 360, 100, 65), { align: 'right', scale: 3 });
        else R.order.slice(0, 8).forEach((s, k) => { const tg = AT.tv.target === s; T((k + 1) + ' ' + SN.PILOTS[s.pilot].name.split(' ').slice(-1)[0] + (R.rules.target ? ' ' + s.points : ''), r.W - 8, 30 + k * 9, tg ? '#ffffff' : '#b8c4dc', { align: 'right', font: tg ? undefined : 'tiny' }); });
        const tg = AT.tv.target; if (tg && tg.weapon) { SN.weaponIcon(g, tg.weapon, 8, r.H - 58); T(SN.PILOTS[tg.pilot].name + ' · ' + SN.WEAPONS[tg.weapon].name, 36, r.H - 52, SN.WEAPONS[tg.weapon].color); }
        if (tg) T(Math.round(tg.kmh) + ' KM/H', 36, r.H - 42, '#ffffff');
      }
      if (Math.floor(g0.real * 1.6) % 2) { const I = g0.input, dev = SN.glyph.device(I), act = dev === 'gamepad' ? 'confirm' : 'start', w = E.font.width('PRESS ANY BUTTON', { scale: 2 }), gw = SN.glyph.draw(g, act, -999, -999, { input: I }), x0 = Math.round(r.W / 2 - (gw + 6 + w) / 2); SN.glyph.draw(g, act, x0, r.H - 20, { input: I }); T('PRESS ANY BUTTON', x0 + gw + 6, r.H - 22, '#ffffff', { scale: 2 }); }
    });
  }
};
/** the SNIPEOUT HD logo: the title font in chrome, an HD badge, a light sweep */
SN.drawLogo = (g, cx, y, k = 1) => {
  const sc = Math.max(1, Math.round(5 * k)), t = E.current ? E.current.real : 0;
  E.font.title(g, 'SNIPEOUT', cx - (k < .8 ? 10 : 18 * k), y, { scale: sc, colors: ['#ffffff', '#9ff4ff', '#29c8e8', '#1a2a4a'], align: 'center', depth: Math.max(1, Math.round(2 * k)), depthColor: '#05040c' });
  const w = E.font.width('SNIPEOUT', { scale: sc }), bx = cx + w / 2 - (k < .8 ? 6 : 14 * k), bs = Math.max(1, Math.round(2 * k));
  E.px.rect(g, bx, y + 2, E.font.width('HD', { scale: bs }) + 6, 7 * bs + 6, '#ff3ab4'); E.font.text(g, 'HD', bx + 3, y + 5, '#05040c', { scale: bs, outline: false });
  if (k >= .8 && !E.current.reduceMotion) { const sx = cx - w / 2 + ((t * 120) % (w + 120)) - 60; g.save(); g.globalAlpha = .35; g.fillStyle = '#ffffff'; for (let i = 0; i < 6; i++) g.fillRect(Math.round(sx + i), y + i * 6 - 2, 3, 6); g.restore(); g._c = null; }
};
})();
