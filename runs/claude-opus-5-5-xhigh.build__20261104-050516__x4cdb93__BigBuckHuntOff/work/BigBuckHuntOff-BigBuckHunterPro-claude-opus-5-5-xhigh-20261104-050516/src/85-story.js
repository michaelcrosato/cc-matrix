// 85-story: the Hunt-Off's people talking: each beat a few short lines with live portraits and gibberish voices; the
// rivals' scores; a hunt's results (the total, the rank, bragging rights, initials on the board); the ceremony.
const BEATS = {
  welcome: [['emcee', 'Welcome to the 41st Annual Big Buck Hunt-Off!'], ['emcee', 'Three hunts. One trophy wall. Zero does!'], ['dub', "Name's Dub. Forty years guidin'. Lost twice. On purpose."]],
  rivals: [['dwayne', "Hope you packed a lunch, cuz. You'll be here a while."], ['loretta', "Ignore him. He shot a mailbox in '09."], ['earl', "I'm mostly here for the chili."]],
  'hollow-intro': [['dub', 'Whitetails thick as ticks out here.'], ['dub', "Bucks got antlers. Does don't. Can't tell? Don't pull."], ['dub', "Pump after every shot. This rifle's older'n me."], ['dub', "Got you a grunt tube, too. Blow it, they'll stop and look."]],
  'iron-rack-legend': [['dub', 'Old Iron Rack. Fourteen points.'], ['dub', "Walks in the fog so nobody can count 'em."], ['dub', 'Been dodgin\' hunters since your daddy wore diapers.'], ['dub', "He'll show three times. Third time, he's got company."]],
  'crow-patrol-brief': [['granny', 'Crows ate my sweet corn. Every last ear!'], ['granny', 'Shoot the crows, sugar. Not Hank.'], ['granny', "Hank's the scarecrow. He's got feelin's."]],
  'hollow-outro-behind': [['dwayne', "Scope's crooked. That's all that is."], ['dub', "Sure, Dwayne. Sure it is."]],
  'hollow-outro-ahead': [['dwayne', 'Told ya. Bring a lunch.'], ['loretta', "One hunt don't make a season, Dwayne."]],
  'bugle-intro': [['dub', 'Bugle Ridge. Elk country. Air\'s thin, so are excuses.'], ['dub', "Elk hear a bugle, they come lookin' for a fight."], ['dub', "Give 'em a call and they'll stop to see who's talkin'."], ['dub', 'Bulls only. Cows run the herd. Leave the bosses be.']],
  'duke-legend': [['dub', "The Duke don't come out for just anybody."], ['dub', 'Answer him back. Make him curious.'], ['dub', 'Every call brings him to the next gap in the timber.'], ['dub', "Call too much and he'll know it's you."]],
  'saucer-brief': [['loretta', "Pull!... That's what you say. Then you shoot it."], ['loretta', "Golden clay's worth a fortune. Don't miss it."]],
  'bugle-outro-behind': [['dwayne', "Elk are just big deer with an attitude. Like me."], ['earl', "Chili's gettin' cold."]],
  'bugle-outro-ahead': [['dwayne', "Thin air. My brain's starvin'. That's all."], ['loretta', 'Now that was shootin\'.']],
  'muskeg-intro': [['dub', 'Muskeg Lake. First snow. Watch your footing.'], ['dub', 'Moose ain\'t skittish. Moose is a truck with opinions.'], ['earl', "Chili's on the fire if you live."], ['dub', 'Big racks, big targets. Still bulls only.']],
  'bigmo-legend': [['dub', "Big Mo don't run from you."], ['dub', 'He runs AT you. Hold steady.'], ['dub', 'Heart or lungs. Anything less just makes him mad.']],
  'snowball-brief': [['earl', 'The snowmen are back. They want revenge.'], ['earl', 'Shoot the snowballs. Knock their hats off.'], ['earl', "And if the big one comes... aim for the hat."]],
  'muskeg-outro-behind': [['dwayne', "Moose cheated. Moose had antlers."], ['dub', 'They all do, Dwayne. That\'s the point.']],
  'muskeg-outro-ahead': [['dwayne', 'I want a recount.'], ['earl', "Recount the chili. I had three bowls."]],
  'party-intro': [['emcee', 'PARTY HUNT! Every hunter for themselves!'], ['dub', 'Same rules. Bucks only. First hit takes it.']],
  'quick-intro': [['emcee', 'QUICK DRAW! One site per hunt, then the clays!'], ['emcee', 'Most points wins. GO!']],
  'range-intro': [['dub', "This here's my range. Paper don't run, so you got no excuse."], ['dub', "I'll show you the ropes. Do what I say, when I say."]],
  'ceremony-win': [['emcee', 'OUR NEW HUNT-OFF CHAMPION!'], ['dub', 'Hang it on the wall, kid.'], ['dwayne', '...Next year, cuz. Next year.']],
  'ceremony-lose': [['emcee', "THERE'S ALWAYS NEXT YEAR!"], ['dub', 'Hang what you got on the wall, kid. You earned it.'], ['loretta', 'You shot clean. That counts for somethin\'.']]
};
for (const id in BEATS) def('beat', id, { lines: BEATS[id] });
const talk = new E.Dialog(game, { voice: null, speed: 48, lines: 3 });
G.talk = talk;
SEG.dialog = (H, o) => {
  let id = o.beat;
  if (o.outro) { const me = H.players[0].score, dw = H.hunt.rivals ? H.hunt.rivals.dwayne : 0; id = H.hunt.outro + (me >= dw ? '-ahead' : '-behind'); if (H.mode !== 'campaign' && H.mode !== 'single') id = null; }
  const lines = id && has('beat', id) ? reg('beat', id).lines.slice() : [];
  let i = -1, done = !lines.length || H.mode === 'attract' || H.hubMode, speaker = null;
  const nextLine = () => {
    i++; if (i >= lines.length) { done = true; return; }
    const [who, text, opt] = lines[i], C = CAST[who]; speaker = who;
    talk.say(text, { name: C.name, portrait: castRig(who), portraitSize: 44, onDone: () => nextLine() });
    talk.nameColor = C.color; G.bab.say(text, C.voice);
  };
  return { block: true, canShoot: false, showReticles: false, cinema: true,
    enter() { if (!done) nextLine(); },
    update(dt) {
      if (done) return true;
      if (speaker) castRig(speaker).update(dt, { x: 0, y: 0, z: 0, vx: 0, vy: 0, facing: Math.PI / 2, expr: /!/.test(lines[i] && lines[i][1]) ? 'shout' : 'smile' });
      if (H.players.some(p => p.input.pressed('cancel') || p.input.pressed('start'))) { talk.close(); done = true; G.bab.stop(); return true; }
      talk.update(dt);
      return done;
    },
    skip() { talk.close(); done = true; },
    exit() { if (talk.open) talk.close(); },
    draw(g, W, Ht) { if (!done) Glyph.cue(g, 'cancel', 'SKIP', W - 10, 14, H.players[0].input, { align: 'right' }); },
    drawR: true
  };
};
/* ---------- rivals: their posted scores ---------- */
function rivalBoard(H) {
  if (H.mode !== 'campaign') return null;
  const c = G.campaign || {}, order = ['hollow', 'bugle', 'muskeg'], idx = order.indexOf(H.huntId), frac = H.rivalFrac || 0;
  return RIVALS.map(id => { let s = 0; for (let j = 0; j < idx; j++) s += reg('hunt', order[j]).rivals[id]; s += Math.round(reg('hunt', H.huntId).rivals[id] * frac); return { id, name: CAST[id].name, score: s, color: CAST[id].color }; });
}
bus.on('huntStart', H => { if (H.mode === 'campaign') { H.rivalFrac = 0; H.rivalBoard = rivalBoard(H); H.rival = { id: 'dwayne', name: 'DWAYNE', score: H.hunt.rivals.dwayne }; const c = G.campaign || {}; if (c.scores) { let s = 0; for (const k in c.scores) if (k !== H.huntId) s += c.scores[k]; H.campaignBefore = s; } } });
bus.on('segment', seg => { const H = G.hunt; if (H && H.mode === 'campaign') { const total = H.hunt.sites.length + 2, done = H.siteResults.length + (H.trophyInfo ? 1 : 0) + (H.bonusResult ? 1 : 0); H.rivalFrac = Math.min(1, done / total); H.rivalBoard = rivalBoard(H); } });
const cab = new E.Arcade(game, { id: 'bbho', hud: false, lives: 1, colors: ['#e8843a', '#ffffff', '#ffd040'] });
G.cab = cab;
function seedTables() {
  const names = ['DUB', 'MAE', 'DWN', 'LOR', 'ERL'];
  for (const [mode, base] of [['hollow', 5200], ['bugle', 6000], ['muskeg', 5600], ['campaign', 15000], ['party', 6000], ['crow-patrol', 1800], ['saucer-season', 1700], ['snowball-standoff', 2000], ['range', 3000]]) {
    const k = 'arcade:bbho:' + mode; if (Array.isArray(E.store.get(k, null))) continue;
    E.store.set(k, names.map((n, i) => ({ name: n, score: Math.round(base * (1 - i * .14) / 10) * 10 })));
  }
}
SEG.results = (H, o) => {
  let t = 0, phase = 'show', entering = false, bragging = false;
  const mode = o.bonusOnly ? (H.bonusResult ? H.bonusResult.id : 'bonus') : H.mode === 'party' ? 'party' : H.mode === 'quick' ? 'party' : H.huntId;
  const par = o.bonusOnly ? 1500 : H.hunt.par;
  return { block: true, canShoot: false, showReticles: false, cinema: true, actorsLive: false,
    enter() {
      if (H.mode === 'campaign') { const dw = H.hunt.rivals.dwayne; if (H.players[0].score > dw) { bragging = true; H.players[0].addScore(1000); } H.rivalFrac = 1; H.rivalBoard = rivalBoard(H); }
      for (const p of H.players) { const key = mode; p.newBest = Records.setBest(key, p.score); }
      Records.stat('hunts', 1); Records.save();
      if (G.sfx) { G.sfx.music('results'); if (H.players.some(p => p.newBest)) G.sfx.sting('newrecord'); }
      this.rank = rankFor(H.players[0].score, par);
    },
    update(dt) {
      t += dt;
      if (phase === 'show' && t > 1 && (anyConfirm(H) || (H.mode === 'attract' || H.hubMode) && t > 4 || t > 30)) {
        const best = H.players.slice().sort((a, b) => b.score - a.score)[0];
        if (!H.players[0].bot && H.mode !== 'attract' && cab.qualifies(best.score, mode)) { phase = 'initials'; entering = true; cab.enter(best.score, mode, () => { entering = false; phase = 'done'; t = 0; if (G.sfx) G.sfx.play('confirm'); }); }
        else { phase = 'done'; t = 0; }
      }
      if (phase === 'initials') cab.update(dt);
      if (phase === 'done' && (t > .4 || H.mode === 'attract')) return true;
      return false;
    },
    skip() { phase = 'done'; t = 1; cab.entry = null; },
    draw(g, W, Ht) {
      dim(g, W, Ht, .65);
      const bw = Math.min(W - 30, 360), bh = 204, x = W / 2 - bw / 2, y = Ht / 2 - bh / 2;
      E.ui.box(g, x, y, bw, bh, { bg: ['#2e2014', '#140c06'], border: '#e8843a' });
      E.font.title(g, o.bonusOnly ? 'BONUS COMPLETE' : 'HUNT COMPLETE', W / 2, y + 10, { scale: 2, colors: ['#fff6d8', '#ffc040', '#e0602a'], outline: '#1a0c08', depth: 2, depthColor: '#5a2a10', align: 'center' });
      E.font.text(g, o.bonusOnly ? (H.bonusResult ? H.bonusResult.name.toUpperCase() : '') : H.hunt.name.toUpperCase(), W / 2, y + 34, '#f4ead8', { align: 'center', outline: false });
      if (H.players.length === 1) {
        const p = H.players[0];
        E.font.text(g, fmt(p.score), W / 2, y + 50, '#ffffff', { align: 'center', scale: 4, outline: '#1a0c08' });
        E.font.text(g, this.rank, W / 2, y + 88, '#ffd040', { align: 'center', scale: 2, outline: false });
        if (bragging) E.font.text(g, '+1,000 BRAGGING RIGHTS (BEAT DWAYNE)', W / 2, y + 108, '#7ad04a', { align: 'center', outline: false });
        if (p.newBest) E.font.text(g, 'NEW BEST!', W / 2, y + 120, '#7ad0ff', { align: 'center', outline: false });
        const st = p.stats, acc = st.shots ? Math.round(st.hits / st.shots * 100) : 0;
        E.font.text(g, 'BUCKS ' + st.bucks + '   ACCURACY ' + acc + '%   LONGEST ' + Math.round(st.longest) + ' M', W / 2, y + 134, '#d8c8a8', { align: 'center', outline: false });
        if (H.trophyInfo) E.font.text(g, (H.trophyInfo.bagged ? 'TROPHY BAGGED: ' : 'GOT AWAY: ') + H.trophyInfo.name.toUpperCase(), W / 2, y + 146, H.trophyInfo.bagged ? '#ffd040' : '#b8a488', { align: 'center', outline: false });
        if (H.rivalBoard) { const list = H.rivalBoard.concat([{ name: 'YOU', score: (H.campaignBefore || 0) + p.score, color: p.color }]).sort((a, b) => b.score - a.score); list.forEach((r, q) => { E.font.text(g, (q + 1) + '. ' + r.name, x + 40 + (q % 2) * 160, y + 160 + Math.floor(q / 2) * 11, r.color, { outline: false }); E.font.text(g, fmt(r.score), x + 150 + (q % 2) * 160, y + 160 + Math.floor(q / 2) * 11, '#ffffff', { align: 'right', outline: false }); }); }
      } else {   // a podium
        const order = H.players.slice().sort((a, b) => b.score - a.score), hs = [70, 52, 40, 30], pos = [1, 0, 2, 3];
        order.forEach((p, q) => { const slot = pos.indexOf(q) >= 0 ? pos.indexOf(q) : q, cx = x + bw / 2 + (slot - (order.length - 1) / 2) * 76, h = hs[q]; px.rect(g, cx - 30, y + 178 - h, 60, h, E.tones(p.color).sh); px.rect(g, cx - 28, y + 180 - h, 56, h - 4, E.tones(p.color).base); E.font.text(g, String(q + 1), cx, y + 182 - h, '#ffffff', { align: 'center', scale: 2, outline: false }); E.font.text(g, p.name, cx, y + 150 - h, p.color, { align: 'center', outline: false }); E.font.text(g, fmt(p.score), cx, y + 162 - h, '#ffffff', { align: 'center', outline: false }); drawReticleShape(g, cx, y + 140 - h, p.shape, p.color, 5); });
        E.font.text(g, order[0].name + ' WINS!', W / 2, y + 40, order[0].color, { align: 'center', scale: 2, outline: false });
      }
      if (phase === 'initials') { E.font.text(g, 'A HIGH SCORE! YOUR INITIALS:', W / 2, y + bh - 50, '#ffd040', { align: 'center', outline: false }); cab.draw({ overlay: f => f(g), W, H: Ht, bw: W + 2, bh: Ht + 2, game: G.game }); }
      else if (t > 1) Glyph.cue(g, 'confirm', 'CONTINUE', W / 2, y + bh + 12, H.players[0].input);
    }
  };
};
