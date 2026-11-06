// The City's venues: each has a hands-on bit that is not a menu.
import { item, CLOTHES, FURNITURE } from '../data/items.js';
import { ART, FISH, BUGS } from '../data/collect.js';
import { ListScreen, PocketsScreen, confirmBox } from '../ui/screens.js';
import { LookScreen } from './story.js';
import { W, H } from '../ui/controls.js';
import { textWidth } from '../ui/draw.js';
import { GOSSIP, HOST_LINES } from '../data/dialogue.js';
import { NEIGHBOURS } from '../data/neighbours.js';
import { seeded } from '../core/rng.js';
import { fmtClock } from '../core/calendar.js';
import { drawItemIcon } from '../ui/icons.js';
const THEMES = [['Something damp', 'damp'], ['Something warm', 'warm'], ['Something fancy', 'fancy'], ['Something bright', 'bright'], ['Something cool', 'cool'], ['Something plain, honestly', 'plain'], ['Something odd', 'odd']];
const H_ = (g, id) => g.sys.venues.host(id);
export const venues2 = {
  async salon(g) {
    const w = g.world, f = H_(g, 'fleece'); const c = await g.ask(f, HOST_LINES.fleece[Math.floor(g.rng() * 2)].text, ['A new look (200 beans)', 'Just gossip', 'Bye']);
    if (c === 2) return; if (c === 1) { await g.say(f, this.gossip(g)); return; }
    if (w.beans < 200) { await g.say(f, 'Mon cher, the hair is free. The talent costs 200 beans.'); return; }
    g.sfx('tick'); g.ui.push(new LookScreen()); await g.ui.top.promise; g.addBeans(-200); g.sfx('sparkle'); g.player.actor.play('Dance', { restart: true }); await g.say(f, 'Magnifique! A cut is a story. This one is yours.'); await g.say(f, this.gossip(g)); g.player.actor.play('Idle');
  },
  gossip(g) { const o = NEIGHBOURS[Math.floor(g.rng() * NEIGHBOURS.length)]; const gs = GOSSIP[Math.floor(g.rng() * GOSSIP.length)]; return 'One piece of gossip, free with every cut: ' + gs.text.replace('{neighbour}', o.name); },
  async couture(g) {
    const w = g.world, f = H_(g, 'flavia'); const r = seeded('theme', w.seed, w.year, w.day); const [themeName, tag] = THEMES[r.int(0, THEMES.length - 1)];
    const c = await g.ask(f, `${HOST_LINES.flavia[0].text} Today's theme: ${themeName}.`, ['Fashion check', 'Browse the couture rail', 'Bye']);
    if (c === 0) { const L = w.look; const outfit = CLOTHES.find(x => x.id === L.outfit), hat = CLOTHES.find(x => x.id === L.hat), gl = CLOTHES.find(x => x.id === L.glasses); const tags = [...(outfit?.tags ?? []), ...(hat?.tags ?? []), ...(gl?.tags ?? [])]; let plumes = 1 + (tags.includes(tag) ? 2 : 0) + (tags.includes('fancy') ? 1 : 0) + (outfit?.couture ? 1 : 0) + (hat ? 0.5 : 0); plumes = Math.min(5, Math.floor(plumes)); const wing = []; await g.say(f, `Stand in better lighting. ... No. Further. Keep going. ... Mm. I see ${tags.length ? tags.join(', ') : 'nothing in particular'}.`); g.sfx('reveal'); await g.say(f, `${'♥'.repeat(plumes)}${'-'.repeat(5 - plumes)}  ${plumes} plume${plumes === 1 ? '' : 's'}. ${['Tragic.', 'An attempt.', 'Almost an opinion.', 'Pleasing. Dangerous.', 'Magnificent.', 'You may touch the velvet.'][plumes]}`); w.flags.plumes = Math.max(w.flags.plumes ?? 0, plumes); w.flags.fashionChecked = true; }
    else if (c === 1) { if ((w.flags.plumes ?? 0) < 3) { await g.say(f, 'The rail is behind the velvet rope. The rope has standards. Three plumes, darling.'); return; } const list = CLOTHES.filter(x => x.couture); await new Promise(res => { const sc = new ListScreen({ title: 'Couture rail', items: () => list.map(it => ({ label: it.name, value: it.price, item: it, it, sub: 'Couture. It costs what it costs.' })), onPick: async (row) => { if (g.world.beans < row.it.price) { g.ui.toast('Darling. No.'); return; } if (g.give(row.it.id)) { g.addBeans(-row.it.price); g.sfx('cash'); g.ui.toast('Bought ' + row.it.name); } }, pickLabel: 'Buy' }); g.ui.push(sc); sc.promise.then(res); }); }
  },
  async magda(g) { try { await this.magdaInner(g); } finally { g.freeCam = null; g.zoomOverride = null; const r = (await import('../world/rooms.js')).ROOMS.magda; r.group.userData.shown?.forEach(o => r.group.remove(o)); r.group.userData.shown = []; } },
  async magdaInner(g) {
    const w = g.world, m = H_(g, 'magda'); const r = seeded('magda', w.seed, w.year, w.day, Math.floor(g.hour)); const picks = []; const pool = ART.slice(); while (picks.length < 3) { const a = pool.splice(r.int(0, pool.length - 1), 1)[0]; picks.push({ ...a, forged: r() < 0.4, cost: Math.round(a.price * 1.25) }); }
    const c = await g.ask(m, HOST_LINES.magda[Math.floor(g.rng() * 2)].text, ['See the paintings', 'Rare furniture', 'Bye']);
    if (c === 1) { const it = item('cheesebed'); if (await confirmBox(g, m, `A Cheese Bed. 5,000 beans. Legitimate. Mostly.`, 'Buy', 'Pass')) { if (w.beans >= 5000 && g.give('cheesebed')) { g.addBeans(-5000); g.sfx('cash'); } else await g.say(m, 'You are short, or your pockets are. Either way, the bed stays.'); } return; }
    if (c !== 0) return;
    const FLAWS = { monallama: 'one ear missing', goosepearl: 'an extra earring', greatwave: 'a wave short of a sea', starrybus: 'a missing star', venusflytrap: 'one fewer tooth', thehonk: 'a calmer face', whistlersmoose: 'one antler too many', cheeseearthly: 'a smug mouse in the corner' };
    for (const p of picks) {
      { const { buildPainting } = await import('../art/items3d.js'); const room = (await import('../world/rooms.js')).ROOMS.magda; room.group.userData.shown?.forEach(o => room.group.remove(o)); const pm = buildPainting(p.id, p.forged); pm.position.set(5, 1.6, 0.4); pm.scale.setScalar(1.6); room.group.add(pm); room.group.userData.shown = [pm]; g.freeCam = { x: room.ox + 5, z: room.oz + 3 }; g.zoomOverride = 2.0; if (p.forged) { pm.children[1].rotation.z = 0.04; } }
      await g.say(m, `${p.name}. ${p.cost} beans. ${p.forged ? 'Authentic.' : 'Authentic. Truly.'}`); await g.say(null, `Catalogue print: ${p.name}, complete.  Painting: ${p.forged ? FLAWS[p.id] ?? 'something is off' : 'matches the print, down to the dust'}.`);
      const buy = await g.ask(m, 'Well?', ['Buy it', 'Spot a fake', 'Pass']);
      if (buy === 1) { if (p.forged) { g.sfx('reveal'); await g.say(m, `...Fine. It's forged. By a cousin. A very *talented* cousin. Take a free flower.`); g.give('seedpack'); w.flags.spotted = (w.flags.spotted ?? 0) + 1; } else await g.say(m, `Fake? It is *genuine*. You wound me. You also hurt the painting.`); }
      else if (buy === 0) { if (w.beans < p.cost) { await g.say(m, 'You haven\'t the beans, dear.'); continue; } if (g.give(p.id)) { g.addBeans(-p.cost); const slot = w.pockets.slice().reverse().find(s => s.id === p.id); if (slot) slot.forged = p.forged; g.sfx('cash'); await g.say(m, 'Pleasure. You didn\'t see me. I wasn\'t here. I am a rumour with a till.'); } }
    }
  },
  async theatre(g) {
    g.freeCam = null; g.zoomOverride = null;
    const w = g.world, b = H_(g, 'bellows'); const all = ['Laugh', 'Cry', 'Shock', 'Anger', 'Love', 'Shrug', 'Bow', 'Dance']; const next = all.find(e => !w.emotes[e]);
    await g.say(b, HOST_LINES.bellows[0].text); const SKETCHES = [['A man walks into a bar.', 'He is, disappointingly, a bar owner.', 'The bar closes. He had so many opinions.', 'He had been inside the whole time.'], ['A goose and a duck debate a mortgage.', 'The goose invoices the duck for the debate.', 'The duck replies in kind: quacks, formally.', 'Both leave. They owe each other nothing. Gasp.']]; const sk = SKETCHES[w.daysPlayed % 2];
    for (let i = 0; i < 3; i++) await g.say({ name: 'The Cast', type: 'hearth', pitch: 0.9, voice: 'flute' }, sk[i], { speed: 28 });
    await g.say({ name: 'The Cast', type: 'hearth', pitch: 0.9 }, sk[3], { speed: 28 });
    const gotIt = await new Promise(res => { const sc = { id: 'laugh', t: 0, tick(ui, dt, active) { this.t += dt; ui.d.rect(130, 100, 220, 40, 'night'); ui.d.text(240, 108, 'Laugh now!', 'sand', { align: 'center' }); ui.d.rect(140, 126, 200 * Math.max(0, 1 - this.t / 1.6), 6, 'red'); if (active) { if (ui.c.pressed('alt') || ui.c.input.wasPressed('KeyL') || ui.c.pressed('confirm')) { ui.pop(this); res(this.t > 0.15 && this.t < 1.6); } else if (this.t > 1.6) { ui.pop(this); res(false); } } ui.prompt('laugh', 'Laugh'); } }; g.ui.push(sc); });
    if (gotIt) { g.sfx('laugh'); g.player.actor.play('Laugh', { restart: true }); if (next) { w.emotes[next] = true; g.sfx('reveal'); await g.say(b, `Bravo! Perfectly timed! You've learned the emote: ${next}. Use it from the emote wheel.`); } else await g.say(b, 'Bravo! You know every emote. We are out of lessons. We are not out of ticket prices.'); } else await g.say(b, 'Silence! The worst review a comedian can receive. ...Try again tomorrow. The sketch will be the same.');
    w.flags.theatre = true;
  },
  async auction(g) {
    const w = g.world, p = H_(g, 'pemberton'); const c = await g.ask(p, HOST_LINES.pemberton[0].text, ['Bid on three lots', 'Consign an item', 'Bye']);
    if (c === 1) { const s = await new Promise(res => g.ui.push(new PocketsScreen({ title: 'Consign which?', pick: res }))); if (!s) return; const it = item(s.id); if (!it.price) { await g.say(p, 'Worthless! Charming, but worthless! Next!'); return; } g.take(it.id); const sold = Math.round(it.price * (1.1 + g.rng() * 0.8)); g.sys.mail.queue(g, { from: "Pemberton's", subject: 'Sold, sold, sold', body: `Your ${it.name} sold for ${sold} beans. Our fee was nothing. Our fee is on the back. The back is blank. Enclosed: the beans.`, gift: 'beanbag', arriveDay: w.day + 1 }); w.flags.consigned = (w.flags.consigned ?? 0) + sold; await g.say(p, `Consigned! The result arrives by mail! Probably tomorrow!`); return; }
    if (c !== 0) return;
    const r = seeded('auction', w.seed, w.year, w.day); const pool = [...FISH.filter(f => f.price > 800), ...BUGS.filter(b => b.price > 500), ...ART].sort(() => r() - 0.5).slice(0, 3);
    for (const lot of pool) {
      const won = await this.bidOn(g, lot, r); if (won) { g.sfx('cash'); } 
    }
  },
  bidOn(g, lot, r) {
    return new Promise(res => {
      const w = g.world; const start = Math.round(lot.price * 0.4); let price = start; const inc = Math.max(50, Math.round(lot.price * 0.08)); let leader = 'none'; let clock = 3.2; const lim = [0.9, 1.2, 1.5].map(x => Math.round(lot.price * x * (0.8 + r() * 0.4))); const names = ['Lady Ottoline', 'A suspicious hat', 'Ozzie (in disguise)']; let next = 0.6; let log = 'Opening bid ' + start; let phase = 'run';
      const sc = { id: 'auction', freeze: false, tick(ui, dt, active) {
        const d = ui.d; ui.game.frozen = true; d.rect(60, 30, 360, 190, 'night'); d.panel(70, 38, 340, 174, { fill: 'white', trim: 'sand' }); d.text(240, 46, "Pemberton's: " + lot.name, 'navy', { align: 'center' }); drawItemIcon(d, 224, 62, lot, 3);
        d.text(240, 100, `Bid: ${price}`, 'red', { align: 'center' }); d.text(240, 114, `Leader: ${leader === 'you' ? 'YOU' : leader}`, 'ink', { align: 'center' }); d.text(240, 128, log, 'navy', { align: 'center' });
        const label = clock < 1.1 ? 'Going twice...' : clock < 2.2 ? 'Going once...' : 'Bids, bids, bids!'; d.text(240, 146, label, clock < 2.2 ? 'red' : 'ink', { align: 'center' }); d.rect(100, 162, 280 * Math.max(0, clock / 3.2), 6, 'orange'); d.text(240, 176, `Your beans: ${w.beans}`, 'ink', { align: 'center' });
        if (!active) return; clock -= dt; next -= dt;
        if (ui.c.pressed('confirm') || ui.c.input.wasPressed('Space')) { const bid = price + inc; if (leader !== 'you' && w.beans >= bid) { price = bid; leader = 'you'; clock = 3.2; g.sfx('paddle'); log = `You raise the paddle: ${price}`; } else if (w.beans < bid) log = 'Your paddle is heavier than your wallet.'; }
        if (next <= 0 && leader === 'you' || next <= 0 && leader === 'none') { next = 0.7 + r() * 0.8; const who = r.int(0, 2); if (lim[who] >= price + inc && r() < 0.8) { price += inc; leader = names[who]; clock = 3.2; log = `${names[who]} bids ${price}`; g.sfx('paddle'); } }
        if (clock <= 0) { ui.pop(this); ui.game.frozen = false; if (leader === 'you') { if (g.give(lot.id)) { g.addBeans(-price); w.flags.auctionsWon = (w.flags.auctionsWon ?? 0) + 1; g.ui.toast(`Won: ${lot.name} for ${price}`); res(true); } else { g.ui.toast('Pockets full: the lot goes to the next bidder.'); res(false); } } else { g.ui.toast(leader === 'none' ? 'No bids. A sad gavel.' : `${leader} takes it for ${price}.`); res(false); } }
        ui.prompt('confirm', 'Raise paddle'); } };
      g.ui.push(sc);
    });
  },
  async bureau(g) {
    const w = g.world, b = H_(g, 'brisket'); const c = await g.ask(b, HOST_LINES.brisket[0].text, ['Rate my home', 'How scoring works', 'Bye']);
    if (c === 1) { await g.say(b, 'Item value, matching sets of four, colour harmony, cosy rules: a lamp by a seat, a rug under a table, something growing, music playing. Minus clutter. Out of S, A, B or C.'); return; }
    if (c !== 0) return; const r = this.homeScore(g); await g.say(b, r.critique); await g.say(b, `Grade: ${r.grade}. (${r.score} points.)`); const order = ['C', 'B', 'A', 'S']; if (order.indexOf(r.grade) > order.indexOf(w.rating.grade === '-' ? 'C' : w.rating.grade) || w.rating.grade === '-') { w.rating.grade = r.grade; const reward = { C: 'plantbig', B: 'mosslamp', A: 'loftmirror', S: 'trophy_snow' }[r.grade]; g.give(reward); g.sfx('reveal'); await g.say(b, `A new grade! A reward: ${item(reward).name}. It is not a bribe. It is a *citation*.`); }
  },
  homeScore(g) {
    const w = g.world; const furn = w.home.furn.map(f => item(f.id)); const val = furn.reduce((a, f) => a + (f.price || 0), 0); const sets = {}; for (const f of furn) sets[f.set] = (sets[f.set] ?? 0) + 1; const setBonus = Object.values(sets).filter(n => n >= 4).length * 300; const hasLamp = furn.some(f => f.fn === 'lamp') && furn.some(f => f.fn === 'seat'); const rug = furn.some(f => f.rug) && furn.some(f => f.model?.startsWith('table')); const grow = furn.some(f => f.grows); const music = !!w.flags.stereoOn; const chairs = furn.filter(f => f.fn === 'seat').length; const clutter = Math.max(0, furn.length - 12) * 150;
    const score = Math.round(val / 6 + setBonus + (hasLamp ? 200 : 0) + (rug ? 200 : 0) + (grow ? 200 : 0) + (music ? 150 : 0) - clutter + (chairs > 4 ? -200 : 0)); const grade = score > 1800 ? 'S' : score > 1100 ? 'A' : score > 500 ? 'B' : 'C';
    const critique = chairs > 4 ? 'Too many chairs. Who are you expecting?' : !hasLamp ? 'No lamp near a seat. Is the home a cave? A fashionable cave?' : !grow ? 'Nothing growing. A home needs something alive. Even a mould, in a pinch.' : furn.length < 3 ? 'Sparse. Intentionally sparse? No. Nobody is that confident.' : 'A home with intent. A *slightly* damp intent, but intent.'; return { score, grade, critique };
  },
  async cafe(g) {
    const w = g.world, l = H_(g, 'lou'); const c = await g.ask(l, '...coffee?', ['Mild blend (50)', 'Bold blend (100)', 'Midnight blend (150)', 'No']);
    if (c === 3) return; const cost = [50, 100, 150][c]; if (w.beans < cost) { await g.say(l, '...beans.'); return; } g.addBeans(-cost); g.sfx('slurp'); w.coffeeUntil = w.min < 420 ? 420 : 1440 + 420; w.coffeeDay = w.day; await g.say(l, ['...mild.', '...bold.', '...midnight.'][c]); g.ui.toast('Jog speed up until the day ends'); const words = [['...fish...', '...pond...', '...dusk...'], ['...beetle...', '...night...', '...tree...'], ['...golden...', '...spring...', '...dawn...']][c]; await g.say(l, `Three words. ${words.join(' ')} ...that's all. ...it's a hint.`); w.flags.hint = words[0];
  },
  async fortune(g) {
    const w = g.world, n = H_(g, 'nibbles'); const r = seeded('fortune', w.seed, w.year, w.day); const F = ['I see a tall stranger. He\'s holding... (chew) ...that part\'s gone now. Good luck, though.', 'A fish will find you at dusk. Or you will find a fish. Or a boot. (chew) The card says boot.', 'Someone will give you a gift you do not want. (chew) ...and one you do. The second card is gone.', 'Your debt will shrink. (chew) ...or it will become smaller by comparison.', 'I see rain. Or a very sad sun. (chew) Tarot is vague.'];
    const t = F[r.int(0, F.length - 1)]; w.luck = w.day; g.sfx('chew'); await g.say(n, t); g.ui.toast('Luck is up until morning'); 
  },
};
