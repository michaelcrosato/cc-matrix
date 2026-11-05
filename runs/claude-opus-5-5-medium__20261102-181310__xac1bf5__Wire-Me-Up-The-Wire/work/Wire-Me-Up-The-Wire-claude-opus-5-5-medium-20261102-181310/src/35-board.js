/* ============================================================================
 * 35-board: CHAPTER 3, THE BOARD. The detail's office above a tire shop. Pin the evidence to the organization's
 * pyramid, string the yarn, find the hole at the top. Then the Major comes in wanting dope on the table.
 * ========================================================================== */
const BOARD = (() => {
  const SLOTS = [
    { key: 'dante', role: 'THE TOP', desc: 'Dante Pryor. No photo on file. Ever.', locked: true, at: [.5, 0] },
    { key: 'smoke', role: 'LIEUTENANT', desc: 'Runs the corners, picks up the money', at: [.5, 1] },
    { key: 'kev', role: 'CORNER', desc: 'Handles the cash, never the product', at: [.14, 2] },
    { key: 'tater', role: 'RUNNER', desc: 'Holds the vials, serves the fiends', at: [.32, 2] },
    { key: 'stash', role: 'STASH', desc: 'Where the package sleeps', at: [.5, 2] },
    { key: 'burner', role: 'PHONE', desc: 'The number that got us the wire', at: [.68, 2] },
    { key: 'lookout', role: 'LOOKOUT', desc: 'Twelve years old. Paid to yell.', at: [.86, 2] }
  ];
  const PARENT = { smoke: 'dante', kev: 'smoke', tater: 'smoke', stash: 'tater', burner: 'kev', lookout: 'kev' };
  let talk, cards, pinned, cur, picking, pick, phase, attract, aiT, t;
  function buildCards() {
    const find = (pred) => CASE.photos.find(pred);
    const mk = (key, name, photo, fallback) => ({ key, name, photo: photo || { rigs: fallback, time: '' }, file: !photo });
    const list = [
      mk('smoke', 'SMOKE', find(p => p.id === 'smoke'), [CAST.SMOKE.rig]),
      mk('kev', "LIL' KEV", find(p => p.id.startsWith('h2h-pay')), [CAST.KEV.rig]),
      mk('tater', 'TATER', find(p => p.id.startsWith('h2h-serve')), [CAST.TATER.rig]),
      mk('stash', 'RED DOOR', find(p => p.id === 'stash'), [CAST.TATER.rig]),
      mk('burner', 'BURNER', find(p => p.id === 'burner'), []),
      mk('lookout', 'LOOKOUT', find(p => p.id === 'lookout'), [CAST.LOOKOUT.rig])
    ];
    if (list[4].file) list[4].photo = { id: 'burner', time: '' };
    // shuffle, the way a desk gets
    for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    return list;
  }
  function enter(data) {
    data = data || {};
    attract = !!data.attract; t = 0; aiT = 0; talk = talk || makeTalk(); cards = buildCards(); pinned = {}; cur = 1; picking = false; pick = 0; phase = 'brief';
    L.enabled = false; game.weather = null; music('board'); TOASTS.length = 0; CASE.board = 0;
    if (attract) { phase = 'pin'; return; }
    scene(talk, [
      ['PELL', "Every detail gets a board. Ours is cork from a school that closed in ninety-eight. Pin what you got. Name, face, where they sit."],
      ['PELL', "Money goes up, orders come down. Corner boy answers to the lieutenant, the lieutenant answers to the top. String it so a judge can follow it with his finger."],
      ['BRANDT', "And the top?"], ['PELL', "Fourteen years and nobody's got one picture of Dante Pryor. Not a booking photo, not a wedding, nothing. Man is a rumor with a lawyer."]
    ], () => { phase = 'pin'; });
  }
  const slotXY = (s) => { const W = game.W, H = game.H, gap = Math.floor((H - 68 - 26) / 3); return [Math.round(s.at[0] * W), 26 + s.at[1] * gap]; };
  const CW = 30, CH = 35;
  function pinTo(slot, card) {
    if (!slot || !card || slot.locked || pinned[slot.key]) return;
    if (slot.key === card.key) {
      pinned[slot.key] = card; A.sfx('pin'); A.sfx('right'); CASE.board += card.file ? .5 : 1;
      toast('PINNED: ' + card.name, card.file ? 'Old booking photo. Your own picture would be better.' : slot.desc, card.file ? '#ffb040' : '#9ae89a', 2.5);
      cards = cards.filter(c => c !== card); pick = Math.min(pick, cards.length - 1);
      if (SLOTS.every(s => s.locked || pinned[s.key])) { phase = 'full'; picking = false; game.after(1, major); }
    } else {
      A.sfx('wrong'); game.shake(1);
      if (!attract) { talk.who = 'PELL'; talk.say(E.pick(["That's not where he sits. Look at what he does, not what he looks like.", "No. Money goes up, Detective. Follow the money.", "You want to explain that to a defense attorney? Try again."]), { name: 'DET. AUGIE PELL', portrait: CAST.PELL.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1e2a22' } }); }
    }
  }
  function major() {
    phase = 'major';
    if (attract) { game.after(2, attractNext); return; }
    scene(talk, [
      ['MAJOR', "Nice board. Very nice. Arts and crafts. You know what the Deputy Ops asked me at COMSTAT this morning? He asked me where the dope is."],
      ['MAJOR', "Not the yarn, Lieutenant. The dope. On a table, with a camera. I want that red-door vacant hit by Friday."],
      ['HASKINS', "We hit the stash, we get Tater and a bag, and Pryor changes every phone we're up on. The wire goes dark."],
      ['MAJOR', "And my numbers go up. The wire was always going to go dark. They always do."]
    ], () => talk.say('What does Okafor say?', { name: 'DET. DEE OKAFOR', portrait: CAST.DEE.rig, portraitOpts: { zoom: 2.6, turn: .4, bg: '#1e2a3a' }, choices: ['"Give us tonight. We know where Pryor will be."', '"Yes, sir. Friday."'], onChoice: (i) => {
      CASE.pushed = i === 0;
      scene(talk, i === 0 ? [
        ['MAJOR', "Tonight. One night, Okafor, and then I get my table. You get a picture of your rumor, or you get nothing."],
        ['HASKINS', "That's more than he gives anybody. Go."]
      ] : [
        ['MAJOR', "See, Lieutenant? Somebody here understands the job."],
        ['HASKINS', "(quietly) Okafor. The meet's tonight. The raid's Friday. Get me his face before the Major gets his dope."]
      ], () => { CASE.chapter = Math.max(CASE.chapter, 3); game.go('chapter', { n: 4 }); });
    } }));
  }
  function aiStep(dt) {
    aiT += dt; if (aiT < 1.1 || phase !== 'pin' || !cards.length) return; aiT = 0;
    const c = cards[0], s = SLOTS.find(x => x.key === c.key); cur = SLOTS.indexOf(s); pinTo(s, c);
  }
  function update(dt) {
    tickToasts(dt); t += dt;
    if (attract) { talk.update(dt); aiStep(dt); return; }
    if (talk.update(dt)) return;
    if (phase !== 'pin') return;
    const inp = game.input, open = SLOTS.map((s, i) => i).filter(i => !SLOTS[i].locked && !pinned[SLOTS[i].key]);
    const p = inp.pointer(), cl = inp.clicked();
    if (!open.length || !cards.length) { picking = false; return; }
    if (!picking) {
      if (!open.includes(cur)) cur = open[0];
      const mv = (dx, dy) => { const [x0, y0] = slotXY(SLOTS[cur]); let best = null, bd = 1e9; for (const i of open) { if (i === cur) continue; const [x, y] = slotXY(SLOTS[i]), ddx = x - x0, ddy = y - y0; if (dx && Math.sign(ddx) !== dx) continue; if (dy && Math.sign(ddy) !== dy) continue; const d = Math.abs(ddx) * (dy ? 2 : 1) + Math.abs(ddy) * (dx ? 2 : 1); if (d < bd) { bd = d; best = i; } } if (best !== null) { cur = best; A.sfx('blip'); } };
      if (inp.repeat('left')) mv(-1, 0); if (inp.repeat('right')) mv(1, 0); if (inp.repeat('up')) mv(0, -1); if (inp.repeat('down')) mv(0, 1);
      if (p && inp.lastDevice === 'mouse') for (const i of open) { const [x, y] = slotXY(SLOTS[i]); if (Math.abs(p[0] - x) < CW / 2 + 4 && Math.abs(p[1] - y - 20) < 22) cur = i; }
      const clickSlot = cl && open.find(i => { const [x, y] = slotXY(SLOTS[i]); return Math.abs(cl[0] - x) < CW / 2 + 4 && Math.abs(cl[1] - y - 20) < 22; });
      if (inp.pressed('interact') || inp.pressed('confirm') || clickSlot !== undefined && clickSlot !== null) { if (clickSlot !== undefined && clickSlot !== null) cur = clickSlot; picking = true; pick = 0; A.sfx('select'); }
    } else {
      if (inp.repeat('left')) { pick = (pick + cards.length - 1) % cards.length; A.sfx('blip'); }
      if (inp.repeat('right')) { pick = (pick + 1) % cards.length; A.sfx('blip'); }
      const tray = trayXY();
      if (p && inp.lastDevice === 'mouse') cards.forEach((c, i) => { const [x, y] = tray(i); if (p[0] >= x && p[0] < x + CW && p[1] >= y && p[1] < y + CH) pick = i; });
      const clickCard = cl && cards.findIndex((c, i) => { const [x, y] = tray(i); return cl[0] >= x && cl[0] < x + CW && cl[1] >= y && cl[1] < y + CH; });
      if (inp.pressed('cancel')) { picking = false; A.sfx('cancel'); }
      else if (inp.pressed('interact') || inp.pressed('confirm') || (clickCard !== null && clickCard >= 0)) { if (clickCard !== null && clickCard >= 0) pick = clickCard; picking = false; pinTo(SLOTS[cur], cards[pick]); }
    }
  }
  const trayXY = () => { const W = game.W, H = game.H, n = cards.length, x0 = Math.round(W / 2 - n * (CW + 8) / 2); return (i) => [x0 + i * (CW + 8), H - 61]; };
  function draw(r) {
    const W = r.W, H = r.H;
    r.overlay(g => {
      // the office wall and the cork
      px.rect(g, 0, 0, W, H, '#4a4234');
      const bx = 10, by = 22, bw = W - 20, bh = H - 90;
      px.rect(g, bx - 3, by - 3, bw + 6, bh + 6, '#5a3a22'); px.rect(g, bx, by, bw, bh, '#b08a5a');
      for (let i = 0; i < 400; i++) { const x = bx + ((i * 97) % bw), y = by + ((i * 53 + i * i) % bh); px.dot(g, x, y, i % 2 ? '#9a7448' : '#c09a68'); }
      txt(g, 'CH.3  THE BOARD  •  PRYOR ORGANIZATION', 10, 6, '#f0c060');
      // yarn from each pinned card to its boss
      for (const s of SLOTS) { const par = PARENT[s.key]; if (!par || !(pinned[s.key])) continue; const ps = SLOTS.find(x => x.key === par); const [x0, y0] = slotXY(s), [x1, y1] = slotXY(ps); px.line(g, x0, y0 + 2, x1, y1 + CH, '#c82a2a'); }
      for (let i = 0; i < SLOTS.length; i++) {
        const s = SLOTS[i], [x, y] = slotXY(s), sel = i === cur && phase === 'pin' && !attract;
        const card = pinned[s.key];
        if (s.locked) {   // the hole at the top: a silhouette and a question mark
          px.rect(g, x - CW / 2 + 2, y + 2, CW, CH, '#000'); px.rect(g, x - CW / 2, y, CW, CH, '#e8e4d8'); px.rect(g, x - CW / 2 + 3, y + 3, CW - 6, CW - 6, '#1a1a1c');
          px.disc(g, x, y + 11, 5, '#3a3a3e'); px.rect(g, x - 8, y + 17, 16, 8, '#3a3a3e'); txt(g, '?', x, y + 7, '#c82a2a', { align: 'center' });
        } else if (card) polaroid(g, x - CW / 2, y, card.photo, CW);
        else { px.blend(g, sel ? .3 : .12, 'normal', () => px.rect(g, x - CW / 2, y, CW, CH, sel ? '#f0c060' : '#000000')); for (let k = 0; k < CW; k += 4) { px.dot(g, x - CW / 2 + k, y, '#5a3a22'); px.dot(g, x - CW / 2 + k, y + CH - 1, '#5a3a22'); } }
        if (sel) { px.rect(g, x - CW / 2 - 2, y - 2, CW + 4, 2, '#ffd040'); px.rect(g, x - CW / 2 - 2, y + CH, CW + 4, 2, '#ffd040'); px.rect(g, x - CW / 2 - 2, y, 2, CH, '#ffd040'); px.rect(g, x + CW / 2, y, 2, CH, '#ffd040'); }
        px.disc(g, x, y + 1, 2, '#c82a2a');
        // the index card under it
        px.rect(g, x - 30, y + CH + 1, 60, 10, card ? '#f0ece0' : '#e0d8c4'); txt(g, card ? card.name : s.role, x, y + CH + 2, card ? '#1a1a2a' : '#8a1a1a', { align: 'center', shadow: false });
      }
      // the tray of photos on the desk
      px.rect(g, 0, H - 66, W, 66, '#3a2e22'); px.rect(g, 0, H - 66, W, 2, '#5a4632');
      const tray = trayXY();
      cards.forEach((c, i) => { const [x, y] = tray(i); polaroid(g, x, y - (picking && i === pick ? 6 : 0), c.photo, CW, picking && i === pick); if (c.file) txt(g, 'FILE', x + CW / 2, y + CW - 4, '#8a1a1a', { align: 'center', shadow: false }); });
      if (phase === 'pin' && !talk.open && !attract) {
        const s = SLOTS[cur];
        if (s) { const m = (picking ? 'Pin ' + (cards[pick] ? cards[pick].name : '') + ' as ' : '') + s.role + ': ' + s.desc; const w = E.font.width(m) + 10; px.blend(g, .75, 'normal', () => px.rect(g, W / 2 - w / 2, H - 25, w, 11, '#000')); txt(g, m, W / 2, H - 23, '#f8f0d8', { align: 'center' }); }
        promptRow(g, picking ? [['left', 'Choose'], ['interact', 'Pin it'], [backAct(), 'Back']] : [['up', 'Move'], ['interact', 'Pick a photo for this slot']], W / 2, H - 13);
      }
      drawToasts(g, W, Math.round(H / 2 - 30));
    });
    talk.draw(r);
  }
  return { view: 'side', res: 'ps1', pausable: true, enter, update, draw, talk: () => talk, state: () => ({ phase, pinned: Object.keys(pinned), cards: cards.map(c => c.key), cur, picking }), exit() { } };
})();
