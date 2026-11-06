// The first twenty minutes: the bus in the rain, the goose, and seven errands that teach every verb.
import { G, bus } from '../state.js';
import { Script, say, ask, Toasts, until } from '../ui/dialogue.js';
import { UI, panel, hit, promptRow } from '../ui/kit.js';
import { drawText, textWidth } from '../ui/font.js';
import { keyboardScreen } from '../ui/screens.js';
import { NPC } from '../actors/npcs.js';
import { HOSTS_TALK } from './talk.js';
import { setPlace, Trans } from '../world/places.js';
import { LANDMARK } from '../world/layout.js';
import { ITEMS, TOOL_ORDER } from '../data/items.js';
import { giveItem, hasItem, takeItem, earn, addEnt, remember, friendGain, addLetter } from '../core/world.js';
import { equip } from './interact.js';
import { T } from '../dev/tuning.js';
import { upgradeHome, letterFlow } from './services.js';
import { Nature } from './nature.js';
import { rngOf, fmt } from '../core/util.js';
import { M } from '../audio/music.js';
import { HAIRS } from '../art/critter.js';
import { rideScene } from './city.js';
export const ERRANDS = [['parcel', 'Fetch a parcel from Dorrit'], ['weed', 'Pull a weed, sell it at the store'], ['bug', 'Catch a butterfly for Tavi'], ['fish', 'Catch Bartleby a fish'], ['dig', 'Dig the crack on the plaza'], ['water', "Water the Mayor's sapling"], ['letter', 'Write to Gran at the Post']];
const PAY = 286;
const NAME_IDEAS = ['Pat', 'Morgan', 'Ash', 'Robin', 'Sam', 'Quinn', 'Jo', 'Toby', 'Wren', 'Bean'];
const TOWN_IDEAS = ['Lesser Wallop', 'Mudford', 'Nowhere-on-Sea', 'Tiddling', 'Upper Regret', 'Puddock', 'Little Fuss'];
function done(k) { const w = G.world; const d = w.day1; if (d[k + 'Done']) return; d[k + 'Done'] = true; w.p.debt = Math.max(0, w.p.debt - Math.round(PAY * T.debt)); w.p.paidTotal += PAY; G.ctx.audio.play('reveal'); Toasts.add(`Errand done. ${fmt(PAY)} beans off your debt.`, 3.5); bus.emit('errand', k); if (ERRANDS.every(([e]) => d[e + 'Done'])) Script.run(evening()); }
export const errandsLeft = () => { const d = G.world.day1; return ERRANDS.filter(([k]) => !d[k + 'Done']); };
export function drawErrands(h, y = 28) { const w = G.world; if (!w.day1 || w.day1.done || !w.day1.started) return; const left = ERRANDS; const pw = 196, ph = 10 + left.length * 12 + 12; panel(h, 472 - pw, y, pw, ph, { fill: 'white' }); drawText(h, 472 - pw + 8, y + 5, "Today's errands", { color: 'navy' }); left.forEach(([k, label], i) => { const dn = w.day1[k + 'Done']; drawText(h, 472 - pw + 8, y + 18 + i * 12, (dn ? '✕ ' : '· ') + label, { color: dn ? 'mist' : 'ink' }); }); }
function* evening() { const w = G.world; if (w.day1.done) return; w.day1.done = true; w.clock.speedHalf = false; if (w.clock.minute < 18 * 60) w.clock.minute = 18 * 60; yield 0.4; yield say('gander', `You've paid off 2,000 beans. You're free to go. Not that you were ever not free. Legally.`); yield say('gander', 'The roof has been installed. It is included. The bed is in. The rain is complimentary. Do use the bed, dear. It saves everything.'); w.flags.roofOn = true; G.view.setHomeModel(Math.max(1, w.p.tier)); bus.emit('dayOneDone'); }
export function finishDayOne() { const w = G.world; w.flags.roofOn = true; G.view.setHomeModel(Math.max(1, w.p.tier)); for (const [k] of ERRANDS) w.day1[k + 'Done'] = true; w.day1.done = true; w.clock.speedHalf = false; }
// ---- The opening: bus, name, look
export function openingScript(world, opts) {
  return (function* () {
    const w = G.world; M.override = 'bus'; G.player.actor.visible = false; G.view.town.visible = false; rideScene(true, 0); w.clock.frozen = true; G.opening = { t: 0 }; w.clock.minute = 22 * 60; G.view.rain.intensity = 0.9;
    const answers = {}; yield 1;
    yield say('hester', 'End of the line? Nobody gets off there on purpose.', { name: 'The Driver' });
    yield say('hester', 'Hester. I drive the bus. I only drive the bus. Who are you, then?');
    let name = null; UI.push(keyboardScreen({ title: 'Your name', initial: '', max: 12, suggest: () => rngOf(`${G.time}`).pick(NAME_IDEAS), onDone: (t) => { name = t; }, opaque: false })); yield until(() => name); w.name = name;
    yield say('hester', `${name}. Right. And what's the town called, ${name}? I only drive the bus.`);
    let town = null; UI.push(keyboardScreen({ title: 'Name the village', initial: '', max: 16, suggest: () => rngOf(`${G.time}t`).pick(TOWN_IDEAS), onDone: (t) => { town = t; }, opaque: false })); yield until(() => town); w.town = town;
    yield say('hester', `${town}. Never heard of it. That's the good news.`);
    const a1 = yield ask('hester', 'What are you running from?', ['A family business', 'A bad haircut', 'My own potential', 'Nothing. Why? Who said?'], {});
    const a2 = yield ask('hester', 'Favourite weather?', ['Rain', 'Fog', 'Sun, in moderation', 'Thunder, at a distance'], {});
    const a3 = yield ask('hester', 'How do you take bad news?', ['With a nod', 'With soup', 'I hide', 'I bill someone'], {});
    w.p.look.hair = [0, 3, 2, 5][a1]; w.p.look.hairColor = ['orange', 'plum', 'ink', 'red'][a2]; w.p.look.eyes = [0, 4, 3, 2][a3]; G.player.rebuild(); answersReflect(answers);
    yield say('hester', "There's a reflection in the window there, if you can stand it. You look like someone who owes money.");
    const s = reflectScreen(); UI.push(s); yield until(() => s.closed);
    yield say('hester', 'End of the line. Mind the step. There is no step. Mind it anyway.');
    let ok = false; Trans.go(() => { rideScene(false); M.override = null; G.opening = null; w.clock.frozen = false; w.clock.minute = 8 * 60; G.view.rain.intensity = 0; G.player.actor.visible = true; G.view.town.visible = true; setPlace('town', LANDMARK.busStop[0], LANDMARK.busStop[1] + 1, 0); ok = true; }); yield until(() => ok); yield 0.3;
    const g = NPC.rt.gander; g.staffOut = [LANDMARK.busStop[0] + 1.6, LANDMARK.busStop[1] + 1.2]; g.force = [g.staffOut[0], 0, g.staffOut[1]]; NPC.rt.gander.talkTo = true; G.focusZoom = 2.1;
    yield say('gander', "You're late. No, you're exactly on time. I've already billed you for being late.", { actor: NPC.actors.gander });
    let there = false; Trans.go(() => { setPlace('town', 74.5, 38.6, Math.PI); g.force = [76.4, 0, 38.8]; G.view.setHomeModel(1); there = true; }); yield until(() => there); yield 0.2;
    yield say('gander', "Mrs. Gander. I hold the note on your shack. That's it, with no roof. The roof is included. The rain is complimentary. The 8,000 beans are not.", { actor: NPC.actors.gander });
    upgradeHome(1); w.p.debt = Math.round(8000 * T.debt); w.flags.intro = true; w.p.look.shirt = 's_apron'; G.player.rebuild(); w.day1.started = true; bus.emit('arrived');
    yield say('gander', "Apron on. You'll work it off. I've made a list. Take your time. I've noted how much.", { actor: NPC.actors.gander });
    g.force = null; g.talkTo = false; G.focusZoom = null; Toasts.add('Errands: see the list. The clock runs at half speed until they’re done.', 5);
  })();
}
const answersReflect = () => {};
function reflectScreen() { const w = G.world; const rows = [['Hair', 'hair', HAIRS.map((_, i) => i), (v) => HAIRS[v]], ['Colour', 'hairColor', ['orange', 'ink', 'sand', 'red', 'plum', 'blue', 'white', 'lime'], (v) => v], ['Eyes', 'eyes', [0, 1, 2, 3, 4, 5], (v) => ['Dots', 'Tall', 'Wide', 'Sleepy', 'Sparkly', 'Crossed'][v]]]; return { id: 'reflect', title: 'Your reflection', focus: 0, closed: false, freezes: true, spin: 0, opaque: true, get prompts() { return [['confirm', 'That will do']]; }, focusLabel() { return rows[this.focus][0]; }, itemsModel() { return rows.map((r) => r[0]); }, input(c, dt) { const n = c.nav; if (n === 'up') this.focus = (this.focus + 2) % 3; if (n === 'down') this.focus = (this.focus + 1) % 3; const r = rows[this.focus]; if (n === 'left' || n === 'right') { const i = r[2].indexOf(w.p.look[r[1]]); w.p.look[r[1]] = r[2][(i + (n === 'left' ? r[2].length - 1 : 1)) % r[2].length]; G.player.rebuild(); UI.sfx('uiTick'); } if (c.confirm() || c.clickL()) { this.closed = true; UI.pop(this); } }, draw(h) { h.rect(0, 0, 480, 270, 'navy'); for (let i = 0; i < 26; i++) { const y = (i * 37 + Math.floor(UI.time * 70)) % 270, x = (i * 91) % 480; h.rect(x, y, 1, 6, 'blue'); } panel(h, 120, 30, 240, 170); drawText(h, 240, 38, 'A reflection, in a bus window, in the rain', { color: 'navy', align: 'center' }); G.drawAvatarCard?.(h, 186, 58); rows.forEach((r, i) => { const f = i === this.focus, y = 140 + i * 18; if (f) h.rect(128, y - 3, 224, 16, 'navy'); drawText(h, 136, y, r[0], { color: f ? 'white' : 'ink' }); drawText(h, 344, y, `← ${r[3](w.p.look[r[1]])} →`, { color: f ? 'sand' : 'slate', align: 'right' }); }); promptRow(h, 240, 206, [['confirm', 'That will do']], { align: 'center', back: 'ink' }); } }; }
// ---- Errand conversations
export function storyTalk(id) {
  const w = G.world, d = w.day1; if (!d || d.done) return null; const a = NPC.actors[id];
  if (id === 'dorrit' && !d.parcel) return (function* () { d.parcel = true; yield say(id, 'You look peaky, mmhm. You must be the new one. I made soup. It\'s Tuesday\'s. Tuesday was a good day for soup, mmhm.', { actor: a }); yield say(id, "Take this parcel to the goose. It's her waistcoat buttons. Don't shake it. Don't sniff it. Do sniff the soup.", { actor: a }); giveItem(w, { id: 'parcel', to: 'gander' }); Toasts.add('Got the Parcel. Take it to Mrs. Gander, at the store.'); w.npcs.dorrit.lastTalk = w.clock.day; friendGain(w, id, 3); bus.emit('talked', id); })();
  if (id === 'tavi' && !d.bugGiven) return (function* () { d.bugGiven = true; yield say(id, "Hi hi hi! You're new! I love you! I've got a net! It's for you! I don't know why I had it!", { actor: a }); w.p.tools.includes('net') || w.p.tools.push('net'); equip('net'); yield say(id, "Press and hold to get ready, let go to swing! Walk soft, or they get scared, isn't it?! There's a butterfly! Catch it! Don't tell it I said!", { actor: a }); const it = ITEMS.cabbagefly; Nature.spawnBug(it, w.p.x + 2.4, w.p.z + 1.4, 0.8, 'flower'); w.npcs.tavi.lastTalk = w.clock.day; friendGain(w, id, 3); bus.emit('talked', id); })();
  if (id === 'tavi' && d.bugGiven && !d.bugDone && d.bug) return (function* () { const i = hasItem(w, 'cabbagefly'); yield say(id, "You did it! You caught it! Now you can keep it, isn't it?! I'm so proud! I hardly know you!", { actor: a }); done('bug'); })();
  if (id === 'bartleby' && !d.fishGiven) return (function* () { d.fishGiven = true; yield say(id, "Rod? I've got a rod. I'd prefer not. No. Take it. You can catch me a fish. Don't make it a thing.", { actor: a }); w.p.tools.includes('rod') || w.p.tools.push('rod'); equip('rod'); yield say(id, "Stand by the water. Cast. Wait for the big bite, not the little ones. Press again when it goes under. You'll work it out. Go away.", { actor: a }); w.npcs.bartleby.lastTalk = w.clock.day; bus.emit('talked', id); })();
  if (id === 'bartleby' && d.fishGiven && !d.fishDone && w.p.pockets.some((e) => e && ITEMS[e.id]?.cat === 'fish')) return (function* () { const i = w.p.pockets.findIndex((e) => e && ITEMS[e.id]?.cat === 'fish'); const it = ITEMS[w.p.pockets[i].id]; w.p.pockets[i] = null; yield say(id, `${/^[AEIOU]/.test(it.name) ? 'An' : 'A'} ${it.name.toLowerCase()}. Fine. I didn't ask for one. I did. I'd prefer not to discuss it.`, { actor: a }); done('fish'); friendGain(w, id, 5); })();
  return null;
}
export function wireDayOne() {
  const prevG = HOSTS_TALK.gander, prevT = HOSTS_TALK.trundle, prevC = HOSTS_TALK.clementine;
  HOSTS_TALK.gander = function* (actor) { const w = G.world, d = w.day1; if (d && !d.done) { const i = w.p.pockets.findIndex((e) => e?.id === 'parcel' && e.to === 'gander'); if (i >= 0) { w.p.pockets[i] = null; yield say('gander', "My buttons. On time, for once. Well. In a sense. There. That's a little off your account, dear. Don't spend it all on breathing.", { actor }); done('parcel'); } } yield* prevG(actor); };
  HOSTS_TALK.trundle = function* (actor) { const w = G.world, d = w.day1; if (d && !d.done && !w.p.tools.includes('shovel')) { yield say('trundle', "Ah… you're… the new… one. I'm on… my way… somewhere. Have… my shovel.", { actor }); w.p.tools.push('shovel'); equip('shovel'); yield say('trundle', 'There\'s a… crack… on the plaza. Star… shaped. Dig it. Stand… in front. I\'ll… wait.', { actor }); return; } yield* prevT(actor); };
  HOSTS_TALK.clementine = function* (actor) { const w = G.world, d = w.day1; if (d && !d.done) { if (!w.p.tools.includes('can')) { yield say('clementine', "Welcome. It's fine here. Everything is. The bee says you'll want this watering can. The Mayor's sapling is by the pond. It looks thirsty. It's been fine about it.", { actor }); w.p.tools.push('can'); equip('can'); } if (!d.letterDone) { const p = yield ask('clementine', 'You could write to your gran, while you are here. She has written to ask if you are dead.', ['Write to Gran', 'Not yet'], { actor, cancel: 1 }); if (p === 0) { const before = w.stats.letters; let text = null; UI.push(keyboardScreen({ title: 'Dear Gran…', max: 90, lines: true, onDone: (t) => { text = t; }, onCancel: () => { text = false; } })); yield until(() => text !== null); if (text) { G.ctx.audio.play('stamp'); w.stats.letters++; remember(w, 'letter', { to: 'gran', snip: text.slice(0, 18) }); addLetter(w, { from: 'gran', subject: 'From Gran', body: `Dear ${w.name}. You wrote: "${text.slice(0, 40)}". I've read worse. I've written worse. Here's some fruit. Gran.`, gift: 'fig' }); bus.emit('letter', 'gran', text); addLetter(w, { from: 'dorrit', subject: 'From Dorrit', body: `Welcome, ${w.name}, mmhm. I've left soup somewhere near you. You'll know. Dorrit.`, gift: 'pear' }); yield say('clementine', "Your letter's stamped. A bee has been living in the stamp drawer. We've agreed to share.", { actor }); done('letter'); return; } } } } yield* prevC(actor); };
  bus.on('weed', () => { const d = G.world.day1; if (d && !d.done) { d.weed = true; Toasts.add('Now sell it to Mrs. Gander. She will take anything. It is her whole deal.'); } });
  bus.on('sold', (it) => { const d = G.world.day1; if (d && !d.done && it.id === 'weed') done('weed'); });
  bus.on('caught', (it) => { const d = G.world.day1; if (!d || d.done) return; if (it.cat === 'bug') { d.bug = true; if (d.bugGiven && !d.bugDone) done('bug'); } if (it.cat === 'fish') { d.fish = true; Toasts.add('Take it to Bartleby. He would prefer you did not.'); } });
  bus.on('dug', () => { const d = G.world.day1; if (d && !d.done) { G.world.flags.day1Fossil = true; done('dig'); } });
  bus.on('watered', (e) => { const d = G.world.day1; if (d && !d.done && e.mayor) done('water'); });
}
