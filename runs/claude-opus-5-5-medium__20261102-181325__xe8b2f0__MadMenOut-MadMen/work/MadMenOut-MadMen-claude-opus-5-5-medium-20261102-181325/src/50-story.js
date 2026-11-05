/* MAD MEN OUT — evenings and endings: side-view vignettes over the Manhattan skyline (a bar, an apartment, the last
 * night), each a short scene of lines and one choice that carries into the next day. */
const STAGE_MID = 480;
const stage = new E.PlatformMap({ rows: ['S'.repeat(60), 'S'.repeat(60)], legend: { S: 1 }, types: { 1: { style: 'wood', side: '#4a2e1c', top: '#6a4228' } }, edges: 'open' });
const SKY = {
  manhattan: new E.Backdrop({ sky: ['#06071a', '#18183e', '#3a2450', '#6a3a5a'], moon: { x: .82, y: .16, r: 8, color: '#f4ecd8' }, stars: 40, starsY: .45,
    layers: [{ kind: 'city', color: '#2a2450', y: .5, height: .4, parallax: .04, windows: '#ffe0a0' }, { kind: 'city', color: '#1c1838', y: .62, height: .45, parallax: .1, windows: '#ffd070', seed: 5 }, { kind: 'city', color: '#100e22', y: .74, height: .4, parallax: .2, windows: '#ffb85a', seed: 11 }] }),
  dusk: new E.Backdrop({ sky: ['#1a1440', '#5a3a78', '#e0766a', '#f8c080'], sun: { x: .5, y: .66, r: 18, color: '#ffd8a0' },
    layers: [{ kind: 'mountains', color: '#5a3a6a', y: .62, height: .26, parallax: .05 }, { kind: 'hills', color: '#3a2448', y: .78, height: .16, parallax: .16 }] }),
  office: new E.Backdrop({ sky: ['#28405a', '#5a7898', '#e0a878', '#f0c890'], sun: { x: .7, y: .7, r: 14, color: '#ffe0a0' },
    layers: [{ kind: 'city', color: '#3a4258', y: .55, height: .42, parallax: .04, windows: '#ffe8b0' }, { kind: 'city', color: '#262c40', y: .7, height: .4, parallax: .12, windows: '#ffd890', seed: 9 }] })
};
const VG = { spec: null, t: 0, actors: [], done: false, card: null };
function vgFocus() { game.focus(STAGE_MID, 0, 32 + (game.H / 2 - 46) / -game.view.bz); }
function playVignette(spec) { VG.spec = spec; game.go('vignette', null, { fade: 'dissolve', seconds: .6 }); }
const vignetteScene = {
  pausable: true, view: 'side', views: ['side', 'brawler'], input: KEYS, res: 'ps1', touch: [],
  enter() {
    const sp = VG.spec; VG.t = 0; VG.card = sp.card || null; VG.cardT = 0;
    VG.actors = sp.actors.map(a => ({ ...a, z: 32 }));
    game.follow(null); game.cam.bounds = null; L.enabled = true; L.ambient = sp.ambient || .45; music(sp.music || 'evening');
    if (sp.weather) game.weather = sp.weather;
    game.after(sp.card ? 2.6 : .6, () => sp.script());
  },
  exit() { talk.close(); game.weather = null; },
  update(dt) {
    VG.t += dt; VG.cardT += dt; vgFocus();
    if (game.input.pressed('view') && !talk.open) { game.nextView(); game.note(game.view.label.toUpperCase() + ' VIEW'); }
    for (const a of VG.actors) {
      const rig = rigOf(a.id), talking = talk.open && talk.portrait === rig && talk.typing;
      if (a.walk) { a.x += a.walk * dt; if (Math.abs(a.x - a.to) < 2) a.walk = 0; }
      rig.update(dt, { x: a.x, y: a.y || 0, z: 32, vx: a.walk || 0, vy: 0, facing: a.face, pose: talking ? 'wave' : a.pose || null, expr: a.expr || (talking ? 'smile' : null) });
    }
    if (VG.card && VG.cardT > 2.4 && (game.input.pressed('confirm') || VG.cardT > 4)) VG.card = null;
    if (talk.update(dt)) speak(talk); else speak(talk);
  },
  draw(r) {
    const sp = VG.spec; (SKY[sp.sky] || SKY.manhattan).draw(r); stage.draw(r);
    for (const p of sp.props || []) {
      if (p.shape) r.shape(p.shape, p.x, p.y || 0, p.z || 32, { facing: p.facing !== undefined ? p.facing : Math.PI / 2 });
      else r.prop(p.prop, p.x, p.y || 0, p.z || 32, { size: p.size || 1.2, color: p.color, light: p.light });
      if (p.glow) L.add(p.x, p.y || 0, (p.z || 32) + p.glow[0], p.glow[1], .8, { color: p.glow[2] });
    }
    for (const a of VG.actors) r.actor(a.x, a.y || 0, 32, (g, ox, oy) => rigOf(a.id).draw(g, ox, oy, r.view));
    r.overlay(g => {
      if (sp.caption) { txt(g, sp.caption, 10, 10, COL.gold); if (sp.sub) txt(g, sp.sub, 10, 21, COL.dim, { font: 'tiny' }); }
      if (VG.card) {
        const a = Math.min(1, VG.cardT * 2);
        px.blend(g, .85 * a, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0806'));
        E.font.title(g, VG.card[0], r.W / 2, r.H / 2 - 28, { align: 'center', scale: 3, colors: ['#fff6d8', '#e8c36a', '#8a5a20'], depth: 2 });
        txt(g, VG.card[1], r.W / 2, r.H / 2 + 6, COL.ink, { align: 'center' });
        if (VG.card[2]) txt(g, VG.card[2], r.W / 2, r.H / 2 + 20, COL.dim, { align: 'center', font: 'tiny' });
      }
    });
    talk.draw(r);
  }
};

/* a card between days ("WEDNESDAY · Clear Skies"), then the office */
function nextDay() {
  S.day++; S.haze = S.flags.lateNight ? 1 : 0;
  S.composure = clamp(Math.max(S.composure, 40) + (S.flags.earlyNight ? 25 : 10) - (S.flags.lateNight ? 15 : 0), 0, 100);
  S.flags.lateNight = S.flags.earlyNight = false;
  const D = dayData();
  playVignette({ sky: 'office', ambient: .8, music: 'lounge', actors: [], props: [], card: [D.title, D.subtitle, D.date], script: () => game.go('office', null, { fade: 'dissolve', seconds: .5 }) });
}

/* ---- THE EVENINGS ---- */
function goEvening(kind, v) {
  if (S.demo) { attractNext(); return; }
  if (kind === 'bar') {
    playVignette({ sky: 'manhattan', caption: 'THE HARLEQUIN ROOM', sub: 'Monday, 7:40 PM', ambient: .42,
      actors: [{ id: 'jack', x: STAGE_MID - 14, face: 0 }, { id: 'monty', x: STAGE_MID + 14, face: Math.PI }],
      props: [{ shape: 'mmShelfBottles', x: STAGE_MID, y: -30 }, { shape: 'mmBar', x: STAGE_MID, y: -10 }, { shape: 'mmStool', x: STAGE_MID - 40, y: 6 }, { shape: 'mmStool', x: STAGE_MID + 40, y: 6 },
        { prop: 'lamp', x: STAGE_MID - 70, y: -6, light: true }, { prop: 'lamp', x: STAGE_MID + 70, y: -6, light: true }, { shape: 'mmPlant', x: STAGE_MID - 110, y: -8 }],
      script: () => say([
        v.won ? ['monty', 'To Belle Rouge! And to you, you magnificent liar. She signed before the coffee was cold.'] : ['monty', 'We\'ll get the next one. We always say that. Sometimes it\'s even true.'],
        ['jack', v.won ? 'She didn\'t want a husband. She wanted a pen.' : 'She wanted something I didn\'t bring her.'],
        ['narrator', 'The bartender slides a folded note across the bar. "Message for a Mr. Penn. The gentleman said you\'d know."'],
        ['narrator', 'Four words, in a hand you haven\'t seen in eleven years: "Walt. I\'m in town. L."'],
        ['monty', 'Who\'s Penn? You look like you\'ve seen a ghost.']], null,
        [{ label: 'Nobody. Another round, Monty.' }, { label: 'Nobody. I\'m going home.' }],
        i => {
          if (i === 0) { S.flags.lateNight = true; S.rapport.monty = clamp(S.rapport.monty + 1, -3, 3); say([['monty', 'That\'s my boy. Bartender! Two more of whatever he\'s pretending not to need.'], ['narrator', 'You get home at two. Tomorrow will remember this.']], nextDay); }
          else { S.flags.earlyNight = true; say([['monty', 'Suit yourself. Some of us have a reputation to maintain.'], ['narrator', 'You walk home along Park Avenue. The note stays in your pocket. You can feel it there, like a stone.']], nextDay); }
        }) });
  } else if (kind === 'apartment') {
    const ruthCalls = S.rapport.ruth >= 1;
    playVignette({ sky: 'manhattan', caption: 'YOUR APARTMENT, EAST 63RD STREET', sub: 'Wednesday, 10:15 PM', ambient: .38, weather: { kind: 'rain', amount: .5, wind: .2 },
      actors: [{ id: 'jack', x: STAGE_MID, face: Math.PI, pose: null }],
      props: [{ shape: 'mmSofa', x: STAGE_MID - 50, y: -8 }, { shape: 'mmCredenza', x: STAGE_MID + 60, y: -12 }, { shape: 'mmPhone', x: STAGE_MID + 52, y: -12, z: 45 }, { shape: 'mmDeskLamp', x: STAGE_MID + 70, y: -12, z: 45, glow: [6, 60, '#ffd890'] },
        { shape: 'mmBarCart', x: STAGE_MID + 110, y: -8 }, { shape: 'mmPlant', x: STAGE_MID - 110, y: -10 }, { shape: 'mmHatStand', x: STAGE_MID - 140, y: -10 }],
      script: () => say([
        ['narrator', v.won ? 'Skylark signed. The champagne in the icebox is for an occasion that never seems to come.' : 'Skylark walked. The rain on the window sounds like applause for somebody else.'],
        ...(S.flags.heardFile ? [['narrator', 'Theo Barrow asked for your personnel file today. There is nothing in it that\'s true.']] : []),
        ['narrator', 'The telephone rings.']], null,
        [{ label: 'Pick it up.' }, { label: 'Let it ring.' }],
        i => {
          if (i === 1) { S.composure = clamp(S.composure + 10, 0, 100); S.flags.earlyNight = true; say([['narrator', 'It rings eleven times. You count every one. Then the apartment is very quiet, and you sleep like a man with nothing to hide.']], nextDay); return; }
          if (ruthCalls) { S.rapport.ruth = clamp(S.rapport.ruth + 1, -3, 3); say([['ruth', 'Mr. Calloway? I\'m sorry, it\'s late. I couldn\'t stop thinking about the Kesslers.'], ['ruth', 'The father and the son want the same thing. They just don\'t know it yet. I\'ll put something under your door.'], ['jack', 'Go to bed, Ruth. And Ruth? Good work.']], nextDay); }
          else say([['lenny', 'Walt? It\'s Lenny. Don\'t hang up. I talked to a fella from your office today. Barrow. He bought me lunch.'], ['lenny', 'He asked a lot of questions, Walt. I\'m sorry. I didn\'t know it was a secret.'], ['narrator', 'You put the receiver down very gently, as if it might go off.']], () => { S.composure = clamp(S.composure - 10, 0, 100); nextDay(); });
        }) });
  } else ending();
}

/* ---- THE ENDING: three of them, from what you won and what you did about Walter Penn ---- */
function endingKind() {
  const wonK = S.won.includes('kessler');
  if (!wonK) return 'out';
  if (S.won.length >= 2 && !S.flags.paidTheo) return 'partner';
  return 'usual';
}
function ending() {
  const k = endingKind();
  S.flags.ending = k;
  if (!S.demo) { const best = E.store.get('mmo:best', 0); if (S.billings > best) E.store.set('mmo:best', S.billings); E.store.set('mmo:endings', Object.assign(E.store.get('mmo:endings', {}), { [k]: true })); }
  const theoLine = S.flags.paidTheo ? ['narrator', 'Theo Barrow moves into the office across the hall from yours, with a brass plate that says HEAD OF ACCOUNTS. He waves at you through the glass every morning.'] :
    S.flags.confessed || S.flags.montyKnows ? ['narrator', 'Theo Barrow told Monty Crane everything he knew. Monty Crane already knew. Theo is in Cleveland now, with a smaller agency and a bigger car.'] :
    ['narrator', 'Theo Barrow never says the name Walter Penn out loud. He doesn\'t have to. He keeps it the way men keep a gun in a drawer.'];
  const lenny = S.flags.metLenny ? ['narrator', 'A postcard from Pennsylvania arrives in November. A farmhouse, a creek. "Proud of you, Walt. L."'] : S.flags.paidLenny ? ['narrator', 'Lenny Dorsett took the bus home with two hundred of your dollars. He never writes.'] : ['narrator', 'You never see Lenny Dorsett again. Some nights you wish you had.'];
  if (k === 'partner') playVignette({ sky: 'office', caption: 'THE CONFERENCE ROOM', sub: 'Friday, 6:05 PM', ambient: .7, music: 'lounge',
    actors: [{ id: 'jack', x: STAGE_MID, face: Math.PI / 2 * 0 }, { id: 'monty', x: STAGE_MID + 32, face: Math.PI }, { id: 'bell', x: STAGE_MID + 62, face: Math.PI }, { id: 'ruth', x: STAGE_MID - 34, face: 0, pose: 'cheer' }, { id: 'dolores', x: STAGE_MID - 62, face: 0 }],
    props: [{ shape: 'mmConfTable', x: STAGE_MID, y: -18 }, { shape: 'mmPlant', x: STAGE_MID - 110, y: -10 }, { shape: 'mmCredenza', x: STAGE_MID + 110, y: -20 }],
    script: () => say([['monty', 'Ladies and gentlemen, the Kesslers. Three million dollars, and both of them smiling. I didn\'t know Germans could do that.'],
      ['bell', 'Mr. Calloway. Mr. Crane and I have discussed the letterhead. It is time it said something new.'],
      ['monty', 'Bellweather, Crane and Calloway. It\'s a mouthful. So are you.'], theoLine, lenny,
      ['narrator', 'You stand at the window while they pour the champagne. Eleven floors down, the city keeps moving, and for once you don\'t want to be anywhere else.']], () => credits('partner')) });
  else if (k === 'usual') playVignette({ sky: 'manhattan', caption: 'YOUR OFFICE', sub: 'Friday, 9:30 PM', ambient: .4,
    actors: [{ id: 'jack', x: STAGE_MID, face: Math.PI }],
    props: [{ shape: 'mmDesk', x: STAGE_MID - 20, y: -14 }, { shape: 'mmDeskLamp', x: STAGE_MID - 12, y: -14, z: 45, glow: [6, 60, '#ffd890'] }, { shape: 'mmBarCart', x: STAGE_MID + 70, y: -10 }, { shape: 'mmSofa', x: STAGE_MID - 100, y: -10 }],
    script: () => say([['narrator', 'The Kesslers signed. Monty bought the whole floor dinner and fell asleep in the elevator.'],
      ['narrator', S.won.length >= 2 ? 'Three accounts in a week. On Monday they\'ll want four.' : 'One account out of three. It was enough to keep the lights on. It is never enough to keep them on for long.'], theoLine, lenny,
      ['jack', 'Business as usual.'], ['narrator', 'You pour one more and look at your own reflection in the black glass, and it looks back like a man who is very good at his job.']], () => credits('usual')) });
  else playVignette({ sky: 'dusk', caption: 'ROUTE 66, WEST OF TULSA', sub: 'Three weeks later', ambient: .65, music: 'evening',
    actors: [{ id: 'jack', x: STAGE_MID - 20, face: 0 }],
    props: [{ prop: 'sign', x: STAGE_MID + 60, y: -6, size: 1.4 }, { prop: 'cactus', x: STAGE_MID - 120, y: -12 }, { prop: 'cactus', x: STAGE_MID + 140, y: -14 }, { prop: 'rock', x: STAGE_MID + 100, y: 4 }],
    script: () => say([['narrator', 'The Kesslers took their account to Chicago. On Monday, Monty Crane closed his office door and asked for your resignation, and gave you a very good bottle with it.'],
      ['monty', 'You\'re the best I ever saw, Jack. That\'s what makes it hurt.'], theoLine, lenny,
      ['narrator', 'You bought a used Kessler with the severance and drove west with the window down. The road, it turns out, is still there.'],
      ['jack', 'Every man has a moment when he has to decide who he is. I just keep having mine.'], ['narrator', 'Mad Men out.']], () => credits('out')) });
}
const ENDINGS = { partner: ['NAME ON THE DOOR', 'Bellweather, Crane & Calloway'], usual: ['BUSINESS AS USUAL', 'You keep your office, and your secrets'], out: ['MAD MEN OUT', 'The road is still there'] };
function credits(kind) {
  game.go('credits', { kind }, { fade: 'dissolve', seconds: 1 });
}
const creditsScene = {
  view: 'side', input: KEYS, res: 'ps1', touch: [],
  enter(d) { this.kind = d && d.kind; this.t = 0; music('evening'); L.enabled = false; game.follow(null); },
  update(dt) { this.t += dt; vgFocus(); if (this.t > 2 && (game.input.pressed('confirm') || game.input.pressed('start') || game.input.clicked())) { game.input.consumeAll(); game.go('about', { from: 'title' }); } },
  draw(r) {
    SKY.manhattan.draw(r);
    const e = ENDINGS[this.kind] || ENDINGS.usual;
    r.overlay(g => {
      px.blend(g, .55, 'normal', () => px.rect(g, 0, 0, r.W, r.H, '#0a0806'));
      E.font.title(g, e[0], r.W / 2, 30, { align: 'center', scale: 3, colors: ['#fff6d8', '#e8c36a', '#8a5a20'], depth: 2 });
      txt(g, e[1], r.W / 2, 62, COL.ink, { align: 'center' });
      const rows = [['Accounts won', S.won.length + ' of 3'], ['Annual billings', money(S.billings)], ['Best ever', money(E.store.get('mmo:best', S.billings))],
        ['Endings found', Object.keys(E.store.get('mmo:endings', {})).length + ' of 3']];
      rows.forEach(([a, b], i) => { txt(g, a, r.W / 2 - 8, 88 + i * 14, COL.dim, { align: 'right' }); txt(g, b, r.W / 2 + 8, 88 + i * 14, COL.gold); });
      S.results.forEach((x, i) => txt(g, x.company + ': ' + (x.won ? 'won, ' + money(x.billings) : 'lost') + ' (interest ' + x.interest + ')', r.W / 2, 152 + i * 11, x.won ? '#a8e0a8' : '#e0a8a0', { align: 'center', font: 'tiny' }));
      if (this.t > 2) txt(g, key('confirm') + ' credits', r.W / 2, r.H - 16, COL.ink, { align: 'center' });
    });
  }
};
