// ---- the dev labs: the Animal Lab (every animal, its states and its hit zones) and the Sound Lab (every sound) ----------
// Both open from Dev mode. They use the same painters and sound definitions as the game, so what you hear and see here
// is what the game plays.
const LAB = { i: 0, state: 0, zones: false, t: 0, back: 'dev', song: null, sound: 0 };
const LAB_STATES = ['walk', 'graze', 'bolt', 'stare', 'down'];
const LAB_KINDS = Object.keys(SPECIES);

function labAnimal() {
  const id = LAB_KINDS[LAB.i], sp = SPECIES[id], st = LAB_STATES[LAB.state];
  return { id: 0, species: id, x: .5, fy: .86, hn: .42 * (sp.size > 1 ? 1 : 1.1), dir: 1, state: st, phase: LAB.t * 4,
    fall: st === 'down' ? 1 : 0, dead: st === 'down', antlers: sp.antlerPts ? 8 : 0, trophy: false, pop: sp.kind === 'snowman' ? 1 : null, flash: 0 };
}

const animalLabScene = {
  enter(data) { LAB.back = data && data.from === 'dev' ? 'dev' : 'menu'; LAB.t = 0; },
  update(dt) {
    const I = GAME.input;
    LAB.t += dt;
    if (I.pressed('right')) LAB.i = (LAB.i + 1) % LAB_KINDS.length;
    if (I.pressed('left')) LAB.i = (LAB.i + LAB_KINDS.length - 1) % LAB_KINDS.length;
    if (I.pressed('down')) LAB.state = (LAB.state + 1) % LAB_STATES.length;
    if (I.pressed('up')) LAB.state = (LAB.state + LAB_STATES.length - 1) % LAB_STATES.length;
    if (I.pressed('confirm')) LAB.zones = !LAB.zones;
    if (I.pressed('cancel')) GAME.go(LAB.back === 'dev' ? 'dev' : 'menu', { resume: true, from: 'lab' });
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, a = labAnimal(), sp = SPECIES[a.species];
      paintLand(g, W, H, HUNTS[0], titleWorld(), r.game.time);
      E.ui.box(g, W * .03, H * .04, W * .94, H * .92, { bg: ['#120c20', '#080510'], alpha: .9 });
      E.font.title(g, 'ANIMAL LAB', W / 2, H * .07, { scale: Math.max(1, Math.round(H / 220)), colors: ['#ffe27a', '#d88a30'], align: 'center' });
      paintAnimal(g, W, H, a, r.game.time);
      if (LAB.zones && sp.zone !== 'small') {
        const bw = a.hn * sp.aspect * (H / W), x0 = a.x - bw / 2, y0 = a.fy - a.hn;
        for (const z of zonesFor(sp.zone)) {
          const X0 = (x0 + z.u[0] * bw) * W, X1 = (x0 + z.u[1] * bw) * W, Y0 = (y0 + z.v[0] * a.hn) * H, Y1 = (y0 + z.v[1] * a.hn) * H;
          const col = z.kill ? '#ff4a3a' : '#ffb040';
          E.px.line(g, X0, Y0, X1, Y0, col, 1); E.px.line(g, X1, Y0, X1, Y1, col, 1);
          E.px.line(g, X1, Y1, X0, Y1, col, 1); E.px.line(g, X0, Y1, X0, Y0, col, 1);
          E.font.text(g, z.id.toUpperCase() + ' ×' + z.mult, (X0 + X1) / 2, (Y0 + Y1) / 2 - 4, '#ffffff', { align: 'center', outline: '#000' });
        }
      }
      E.font.text(g, sp.label + '   ' + LAB_STATES[LAB.state].toUpperCase() + '   ' + (LAB.i + 1) + '/' + LAB_KINDS.length, W / 2, H * .84, '#ffe27a', { align: 'center', outline: '#000' });
      E.font.text(g, 'LEFT/RIGHT ANIMAL   UP/DOWN STATE   ' + GAME.input.label('confirm') + ' HIT ZONES   ' + GAME.input.label('cancel') + ' BACK', W / 2, H * .9, '#c8c0e0', { align: 'center', outline: '#000' });
    });
  },
};

// the sound list: every effect, song and voice in the game
const SOUND_LIST = [
  ['sfx', 'shot'], ['sfx', 'pump'], ['sfx', 'click'], ['sfx', 'kill'], ['sfx', 'wound'], ['sfx', 'doe'], ['sfx', 'penalty'],
  ['sfx', 'call'], ['sfx', 'chirp'], ['sfx', 'ui'], ['sfx', 'ok'],
  ['song', 'title'], ['song', 'hunt'], ['song', 'bonus'], ['song', 'results'],
  ['voice', 'Dub'], ['voice', 'Granny Mae'], ['voice', 'Dwayne'], ['voice', 'Loretta'], ['voice', 'Earl'], ['voice', 'Hank'], ['voice', 'EMCEE'],
];
function playSound(i) {
  const [kind, name] = SOUND_LIST[i];
  if (kind === 'sfx') SFX[name]();
  else if (kind === 'song') { LAB.song = name; GAME.audio.music(SONGS[name]); }
  else babble(name, 'Hello there, shooter. Pump it, pump it, bucks only.');
}

const soundLabScene = {
  enter(data) { LAB.back = data && data.from === 'dev' ? 'dev' : 'menu'; LAB.sound = 0; LAB.song = null; },
  update() {
    const I = GAME.input, n = SOUND_LIST.length;
    if (I.pressed('down') || (I.repeat && I.repeat('down', .4, .12))) LAB.sound = (LAB.sound + 1) % n;
    if (I.pressed('up') || (I.repeat && I.repeat('up', .4, .12))) LAB.sound = (LAB.sound + n - 1) % n;
    if (I.pressed('confirm')) playSound(LAB.sound);
    if (I.pressed('cancel')) { GAME.audio.music(null); GAME.go(LAB.back === 'dev' ? 'dev' : 'menu', { resume: true, from: 'lab' }); }
  },
  draw(r) {
    r.overlay(g => {
      const W = r.W, H = r.H, rows = SOUND_LIST.length, lh = Math.max(10, Math.round(H * .036));
      paintLand(g, W, H, HUNTS[0], titleWorld(), r.game.time);
      E.ui.box(g, W * .2, H * .04, W * .6, H * .92, { bg: ['#120c20', '#080510'], alpha: .94 });
      E.font.title(g, 'SOUND LAB', W / 2, H * .07, { scale: Math.max(1, Math.round(H / 220)), colors: ['#ffe27a', '#d88a30'], align: 'center' });
      const top = H * .16 - Math.max(0, (LAB.sound - 9) * lh);
      SOUND_LIST.forEach(([kind, name], i) => {
        const y = top + i * lh;
        if (y < H * .14 || y > H * .86) return;
        const sel = i === LAB.sound;
        if (sel) E.ui.box(g, W * .22, y - 3, W * .56, lh, { bg: '#3a2a10', gradient: false, alpha: .8 });
        E.font.text(g, kind.toUpperCase() + '   ' + name.toUpperCase(), W * .25, y, sel ? '#ffe27a' : '#cfc8e8', { outline: '#000' });
      });
      const now = LAB.song ? 'PLAYING SONG: ' + LAB.song.toUpperCase() : 'CONFIRM PLAYS THE SOUND';
      E.font.text(g, now, W / 2, H * .9, '#ffffff', { align: 'center', outline: '#000' });
      E.font.text(g, 'UP/DOWN CHOOSE   ' + GAME.input.label('confirm') + ' PLAY   ' + GAME.input.label('cancel') + ' BACK', W / 2, H * .94, '#c8c0e0', { align: 'center', outline: '#000' });
    });
  },
};
