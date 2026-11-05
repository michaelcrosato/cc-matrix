/* 44-car-montage: the car rides (a beige Lumina, a city going by; topics as choices, ○ skips) and the epilogue montage:
   fourteen cards, each picked by rules over the flags (App. G), shown as letterboxed live vignettes on Penn Row. */
const carBg = () => new E.Backdrop({ sky: ['#0a0c1a', '#1a1a34', '#3a2a40'], moon: { x: .8, y: .2, r: 7, color: '#e8e0c8' }, stars: 20, layers: [{ kind: 'city', color: '#141424', y: .5, height: .4, parallax: .15 }, { kind: 'city', color: '#20203a', y: .62, height: .32, parallax: .35 }, { kind: 'city', color: '#2a2a44', y: .74, height: .2, parallax: .7 }] });
scenes.car = withGlobals({
  view: 'side', views: ['side'], pausable: true, camera: false,
  enter(d) {
    this.b = d.beat; this.t = 0; this.bg = carBg(); World.setTOD('day'); game.lights.enabled = false; game.weather = STATE.ep === 4 ? { kind: 'rain', amount: .6, wind: .4 } : null;
    Snd.music('field'); Snd.musicScale(.5); Amb.set('car'); this.left = 2; this.leaving = false;
    this.dana = rigOf('dana'); this.lou = rigOf('lou'); Talk.cast.dana = this.dana; Talk.cast.lou = this.lou;
    game.after(.6, () => this.ask());
  },
  exit() { Snd.musicScale(1); Talk.cast = {}; },
  ask() {
    const topics = CAR_TOPICS[this.b.topics].filter(t => !t.used);
    if (!topics.length || this.left <= 0) return this.leave();
    Talk.play([{ who: 'dana', text: this.left === 2 ? 'Ridley\'s twenty minutes in this traffic.' : '...', choices: topics.map(t => ({ label: t.label, do: () => { t.used = true; this.left--; return t.lines.slice(); } })).concat([{ label: 'Just drive', do: () => { this.left = 0; return [['lou', 'Suits me.']]; } }]) }], () => this.ask());
  },
  leave() { if (this.leaving) return; this.leaving = true; CAR_TOPICS[this.b.topics].forEach(t => { t.used = false; }); game.after(.8, () => Director.done()); },
  update(dt) {
    this.t += dt; if (Talk.open && game.input.pressed('cancel') && !Globals.blocked()) { Talk.stop(); this.leave(); }
    Talk.update(dt); this.dana.update(dt, { x: 0, y: 0, z: 0, facing: 0 }); this.lou.update(dt, { x: 0, y: 0, z: 0, facing: 0 });
    game.focus(this.t * 140, 0, 40);
  },
  draw(r) {
    this.bg.draw(r); const cx = Math.round(r.W / 2), cy = Math.round(r.H * .66);
    r.overlay(g => {
      px.rect(g, 0, cy + 22, r.W, r.H - cy - 22, '#1a1a1e'); for (let x = -((this.t * 140) % 40); x < r.W; x += 40) px.rect(g, Math.round(x), cy + 34, 18, 2, '#c8a830');
      for (let x = -((this.t * 90) % 120); x < r.W; x += 120) { px.rect(g, Math.round(x), cy - 60, 2, 82, '#2a2a30'); px.rect(g, Math.round(x) - 4, cy - 62, 10, 3, '#ffd890'); }
      const bob = Math.round(Math.sin(this.t * 9) * .6);
      px.rect(g, cx - 72, cy - 8 + bob, 144, 26, '#a8946a'); px.rect(g, cx - 56, cy - 28 + bob, 100, 22, '#a8946a'); px.rect(g, cx - 52, cy - 25 + bob, 44, 17, '#28303a'); px.rect(g, cx - 4, cy - 25 + bob, 44, 17, '#28303a');
      px.rect(g, cx - 72, cy + 2 + bob, 144, 2, '#8a7a5a'); px.rect(g, cx + 64, cy - 6 + bob, 8, 5, '#fff0c0'); px.rect(g, cx - 72, cy - 4 + bob, 4, 4, '#c82a2a');
      for (const wx of [cx - 46, cx + 42]) { px.disc(g, wx, cy + 18, 9, '#141416'); px.disc(g, wx, cy + 18, 4, '#7a7a80'); }
      try { this.dana.drawPortrait(g, cx - 44, cy - 27 + bob, 22, { zoom: 1.1, turn: .9, bg: '#28303a' }); this.lou.drawPortrait(g, cx + 4, cy - 27 + bob, 22, { zoom: 1.1, turn: -.9, bg: '#28303a' }); } catch (e) { /* headless */ }
      E.font.text(g, 'Beige Chevy Lumina, westbound', 8, 8, '#9a9080', { outline: false });
      if (Talk.open) Glyph.prompt(g, 'cancel', 'Skip the ride', r.W - 8, 8, '#9a9080', 'right');
    });
    Talk.draw(r);
  }
});

/* ---- the montage (App. G): for each person the first matching row wins ---- */
const MONTAGE = [
  { who: 'corner', at: [30.5, 32], cast: [['tee', 30.5, 32.1], ['tavon', 30.6, 31], ['dink', 30.45, 33.3]], rows: [{ text: 'The corner at Gaither & Ridley: open for business by Monday.' }] },
  { who: 'tee', at: [30.5, 32], cast: [['tee', 30.5, 32, Math.PI / 2, 'hips']], rows: [
    { if: f => f.path === 'A' && f.i5 === 'weight' && f.teeShort, text: 'Terrence Mabry: pleaded to twelve years. Easy stopped paying his mother\'s rent in March.' },
    { if: f => f.path === 'A' && f.i5 === 'weight' && Meters.caseBand() === 'high', text: 'Terrence Mabry: pleaded to twelve years. Never said Easy\'s name.' },
    { if: f => f.path === 'A' && f.i5 === 'weight', text: 'Terrence Mabry: pleaded to six years. Out in four. Never said Easy\'s name.' },
    { if: f => f.path === 'A' && f.i5 === 'talk', text: 'Terrence Mabry: agreed to testify. Moved to a prison in Pennsylvania under another name.' },
    { if: f => f.path === 'B' && f.i5 === 'stay' && f.teeShort, text: 'Terrence Mabry: cut loose by Easy, then indicted. Testified against him.' },
    { if: f => f.path === 'B' && f.i5 === 'stay', text: 'Terrence Mabry: indicted with Darnell Booker eighteen months later.' },
    { if: f => f.path === 'B' && f.i5 === 'run', text: 'Terrence Mabry: last seen boarding a Greyhound to Charlotte.' },
    { if: f => f.path === 'shut', text: 'Terrence Mabry: runs three corners now.' }, { text: 'Terrence Mabry: pleaded to six years. Out in four.' }] },
  { who: 'easy', at: [46.5, 26.5], cast: [['easy', 46.5, 26.6, Math.PI / 2], ['lonnie', 47.6, 26.8, Math.PI / 2]], rows: [
    { if: f => f.path === 'B' && Meters.caseBand() === 'high', text: 'Darnell Booker: arrested at Mama B\'s on a Thursday. The count was light.' }, { if: f => f.path === 'B', text: 'Darnell Booker: indicted. The case is still in discovery.' },
    { if: f => f.path === 'A', text: 'Darnell Booker: opened a second check-cashing store on Cathedral Row.' }, { text: 'Darnell Booker: sponsored the church\'s back-to-school drive.' }] },
  { who: 'pigeon', at: [34.6, 36.3], cast: [['pigeon', 34.4, 36.3, Math.PI, null, 40]], rows: [
    { if: f => f.lossOn === 'pigeon' && f.rookFree && f.path === 'A', text: 'Nobody has seen Junior Hollis since October. His grandmother still feeds the birds.', empty: true },
    { if: f => f.lossOn === 'pigeon', text: 'Junior Hollis: back on the roof. The birds are gone.' },
    { if: f => f.pigeonTrust >= 70 || (f.path === 'B' && f.countRunner !== 'pigeon'), text: 'Junior Hollis: started ninth grade at a school in the county. Still keeps one bird.' }, { text: 'Junior Hollis: running for Tavon now. Fourteen.' }] },
  { who: 'corey', at: [29, 36.3], cast: [['corey', 29.6, 36.4, 0, 'lean']], rows: [
    { if: f => f.coreyCI && !f.coreyExposed, text: 'Corey Lyle: moved to an aunt\'s in Richmond. Calls Detective Whitlock on her birthday.' }, { if: f => f.coreyCI && f.coreyExposed && f.coreyRescued, text: 'Corey Lyle: relocated by the State\'s Attorney. Testified for two days.' },
    { if: f => f.coreyCI && f.coreyExposed, text: 'Corey Lyle: found in a vacant on Harlow Street. No witnesses.', empty: true }, { text: 'Corey Lyle: serving five years for possession with intent.', empty: true }] },
  { who: 'rook', at: [36, 29.5], cast: [['rook', 36.5, 29.9, -Math.PI / 2, 'hips']], rows: [{ if: f => f.wallOff, text: 'Ricky Batts: eight years on a gun charge from a taillight stop.', empty: true }, { text: 'Ricky Batts: shot in December over a parking space. His son got the shoes.', empty: true }] },
  { who: 'sunday', at: [58, 40], cast: [['sunday', 57.4, 40.5, Math.PI]], car: ['hearse', 58.4, 40.5, Math.PI / 2], rows: [
    { if: f => f.dilemma === 'call', text: 'Royal Odom: robbed a Hurricane stash in November. Nobody called it in.' }, { if: f => f.dilemma === 'go', text: 'Royal Odom: sent Detective Whitlock a card at Christmas. No return address.' },
    { text: 'Royal Odom: still drives the hearse. Still doesn\'t work Sundays.' }] },
  { who: 'pruitt', at: [64, 26.5], cast: [['pruitt', 64, 26.6, Math.PI / 2, 'hips'], ['ostrowski', 65, 26.7, Math.PI / 2]], rows: [{ text: 'Maj. Leland Pruitt: promoted to Colonel, Administrative Bureau.' }] },
  { who: 'dana', at: [22.5, 29.5], cast: [['dana', 22.8, 28.6, Math.PI / 2]], rows: [
    { if: f => f.path === 'A', text: 'Dana Whitlock: back in Western narcotics. Drives past the corner every day.' }, { if: f => f.path === 'B', text: 'Dana Whitlock: assigned to the State\'s Attorney\'s money task force.' }, { text: 'Dana Whitlock: back in uniform on the midnight shift.' }],
    extra: f => f.momSafe ? ' Her mother moved to the county in November.' : '' },
  { who: 'lou', at: [42.5, 30.9], cast: [['lou', 42.6, 30.85, -Math.PI / 2, 'sit']], rows: [{ if: f => f.path !== 'shut', text: 'Lou Szabo: back in Homicide. Fourteen open cases on the board.' }, { text: 'Lou Szabo: retired. Took up fishing. Hates fishing.' }] },
  { who: 'ren', at: [62.5, 29.5], cast: [['ren', 61.6, 28.8, 0, 'camera']], car: ['van', 62.5, 29.5, Math.PI], rows: [{ text: 'Renata Ocasio: transferred to the Tactical Section. Kept the camera.' }] },
  { who: 'navarre', at: [30.5, 15.5], cast: [['navarre', 30.6, 15.4, Math.PI / 2]], rows: [{ if: f => f.path === 'A', text: 'Gil Navarre: promoted to captain.' }, { text: 'Gil Navarre: passed over for captain.' }] },
  { who: 'hal', at: [35.5, 26.5], cast: [['hal', 35.6, 26.6, Math.PI / 2, 'phone']], rows: [{ text: 'Hal Pettiford: kept the wire room. Nobody told him to leave.' }] },
  { who: 'teaser', at: [62.5, 48.5], cast: [['harstad', 61.6, 48.4, 0, 'phone']], car: ['boxtruck', 63, 48.5, Math.PI / 2], rows: [{ text: 'Glenn Harstad: guest of honor at State Senator Marian Ocheltree\'s harbor fundraiser.' }] }
];
function montageCards() { const f = F(); return MONTAGE.map(m => { const row = m.rows.find(r => !r.if || r.if(f)) || m.rows[m.rows.length - 1]; return { m, text: row.text + (m.extra ? m.extra(f) : ''), empty: !!row.empty }; }); }
scenes.montage = withGlobals({
  view: 'iso', views: ['iso'], camera: false,
  enter() {
    World.cur = World.map; Flow.reset(World.map); World.setTOD('dusk'); Snd.music('montage'); Amb.set('streetDay'); this.cards = montageCards(); this.i = -1; this.t = 0; this.done = false; this.next();
    if (!HEADLESS && UI.root) { this.cap = document.createElement('div'); this.cap.className = 'montage-cap'; UI.root.appendChild(this.cap); }
  },
  exit() { if (this.cap) this.cap.remove(); },
  next() {
    this.i++; this.t = 0; if (this.i >= this.cards.length) { if (!this.done) { this.done = true; this.tbc = 0; } return; }
    const c = this.cards[this.i], m = c.m; this.agents = []; this.car = null;
    if (!c.empty) for (const [id, x, y, f, pose, z] of m.cast) { const a = new Agent({ person: id, x: W(x - .5), y: W(y - .5) }); a.facing = f === undefined ? Math.PI / 2 : f; a.pose = pose || null; if (z) a.body.z = z; this.agents.push(a); }
    if (m.who === 'corner') { this.sim = new CornerSim({ rate: .3, autoReup: true }); } else this.sim = null;
    if (m.car) this.car = { id: m.car[0], x: W(m.car[1] - .5), y: W(m.car[2] - .5), f: m.car[3] };
    game.focus(W(m.at[0] - .5), W(m.at[1] - .5), 10); game.cam.snap = true; game.setZoom(1.7);
    if (this.cap) { this.cap.textContent = c.text; this.cap.style.opacity = 0; requestAnimationFrame(() => { if (this.cap) { this.cap.style.transition = 'opacity .8s'; this.cap.style.opacity = 1; } }); }
  },
  update(dt) {
    this.t += dt; const hold = Globals.auto ? 2.5 : 6;
    if (this.done) { this.tbc += dt; if (this.cap) this.cap.textContent = 'TO BE CONTINUED'; if (this.tbc > 4 || (this.tbc > 1 && game.input.pressed('confirm'))) { this.tbc = -1e9; Director.go('e5.credits'); } return; }
    if (this.t > hold || (this.t > .8 && game.input.pressed('confirm'))) this.next();
    if (this.sim) this.sim.tick(dt, []); for (const a of this.agents || []) a.update(dt);
  },
  draw(r) {
    World.draw(r); if (this.sim) this.sim.draw(r); for (const a of this.agents || []) drawAgent(r, a);
    if (this.car) r.shape(this.car.id, this.car.x, this.car.y, 0, { facing: this.car.f });
    r.overlay(g => { const bar = Math.round((r.H - r.W / 2.35) / 2); if (bar > 0) { px.rect(g, 0, 0, r.W, bar, '#000'); px.rect(g, 0, r.H - bar, r.W, bar, '#000'); } if (this.done) { px.rect(g, 0, 0, r.W, r.H, '#000'); } Glyph.prompt(g, 'confirm', 'Next', r.W - 8, r.H - 14, '#9a9080', 'right'); });
  }
});
