// Day One teaches by errand. Clock at half speed until done; wandering off is fine, the list waits.
import { say, ask, narrate } from './say.js';
import { addItem, removeSlot, hasRoom, addBeans, payDebt } from './economy.js';
import { grantTool } from './tools.js';
import { sendMail } from './mail.js';
import { HOSTS } from '../data/dialogue/hosts.js';
import { LANDMARKS } from '../data/town.js';
import { tuning } from '../dev/tuning.js';
import { ITEMS } from '../data/items.js';

export const ERRANDS = [
  { id: 'parcel', text: 'Fetch a parcel from Dorrit', pay: 300 },
  { id: 'weeds', text: 'Pull a weed, sell it at the store', pay: 200 },
  { id: 'net', text: 'See Tavi, catch a butterfly', pay: 300 },
  { id: 'rod', text: 'See Bartleby, catch him a fish', pay: 300 },
  { id: 'shovel', text: 'See the Mayor, dig the plaza crack', pay: 300 },
  { id: 'can', text: "Water the Mayor's sapling", pay: 300 },
  { id: 'letter', text: 'Write to Gran, at the Post', pay: 300 },
];
export const SAPLING_SPOT = [15, 37];
export const PLAZA_CRACK = [22, 44];

export const errandsDone = (w) => ERRANDS.every((e) => w.story.errands[e.id] === 'done');
export function completeErrand(g, id) {
  const w = g.world;
  if (!w.story.day1Active || w.story.errands[id] === 'done') return;
  w.story.errands[id] = 'done';
  const e = ERRANDS.find((x) => x.id === id);
  const pay = Math.round(e.pay * tuning.debtMult);
  w.player.debt = Math.max(0, w.player.debt - pay);
  w.player.debtPaid += pay;
  g.sound('debtPaid');
  g.ui.toastMsg(`Errand done. ${pay} beans off the debt.`);
  g.events.emit('errand', { id });
  if (errandsDone(w)) w.flags.day1ReadyForEvening = true;
}
export function day1Lines(g) {
  const w = g.world;
  if (!w.story.day1Active) return [];
  const out = ERRANDS.filter((e) => w.story.errands[e.id] !== 'done').slice(0, 4).map((e) => `· ${e.text}`);
  const left = ERRANDS.filter((e) => w.story.errands[e.id] !== 'done').length;
  if (left > 4) out.push(`  and ${left - 4} more`);
  if (!left) out.push('· See Mrs. Gander at the store');
  return out;
}
/** Set up the village for a new arrival: the crack, the sapling, weeds by the shack. */
export function prepareDayOne(g) {
  const w = g.world;
  const o = w.town.objects;
  o[`${PLAZA_CRACK[0]},${PLAZA_CRACK[1]}`] = { k: 'crack', item: 'unknownFossil' };
  o[`${SAPLING_SPOT[0]},${SAPLING_SPOT[1]}`] = { k: 'sapling', stage: 1, kind: 'pear', mayor: true };
  for (const [x, z] of [[66, 39], [73, 39], [65, 41], [69, 42], [62, 37], [71, 42]]) o[`${x},${z}`] = { k: 'weed' };
  w.story.day1Active = true;
  w.story.stage = 'dayone';
  w.story.errands = {};
  for (const e of ERRANDS) w.story.errands[e.id] = 'open';
  w.museum.open = false;
}
/** Registered once at boot; they check the world, so a reloaded Day One still counts. */
export function listenForErrands(g) {
  g.events.on('caught', (e) => {
    const world = g.world;
    if (!world.story.day1Active) return;
    if (ITEMS[e.id]?.cat === 'bug' && world.story.errands.net === 'got') world.story.errands.net = 'caught';
    if (ITEMS[e.id]?.cat === 'fish' && world.story.errands.rod === 'got') world.story.errands.rod = 'caught';
  });
  g.events.on('sold', (e) => { if (g.world.story.day1Active && e.id === 'weed') completeErrand(g, 'weeds'); });
  g.events.on('dugUp', (e) => { if (g.world.story.day1Active && e.item === 'unknownFossil') completeErrand(g, 'shovel'); });
  g.events.on('wateredMayorSapling', () => { if (g.world.story.day1Active && g.world.story.errands.can === 'got') completeErrand(g, 'can'); });
}
/** Neighbour conversations during Day One. */
export function* day1Talk(g, id) {
  const w = g.world;
  if (!w.story.day1Active) return false;
  const E = w.story.errands;
  if (id === 'dorrit' && E.parcel === 'open') {
    yield* say(g, id, ["Oh, it's you. You're the new one, mmhm. You look peaky. Everybody looks peaky here, it's the goose.", "This is for Mrs. Gander, mmhm. It's her Tuesday soup. She doesn't eat it. Nobody knows what she does with it.", "Take the parcel to the store. Press the Map if you get lost. You won't get lost. There's four streets and a river, mmhm."]);
    if (!hasRoom(w)) return true;
    addItem(g, 'parcel', { questFor: 'gander' });
    g.sound('pickUp');
    E.parcel = 'got';
    return true;
  }
  if (id === 'tavi' && E.net === 'open') {
    yield* say(g, id, ["Hi! Hi hi! You're new! I love that for you, isn't it?!", "Here! This is a net! I've got lots! I've got two! Go on, catch a butterfly! Sneak up, swing it, you'll love it, isn't it?!", "Hold the Use button to get ready, and let go to swing! And go slow, or they notice! They're so clever, isn't it?!"]);
    grantTool(g, 'net');
    g.sound('reveal');
    E.net = 'got';
    return true;
  }
  if (id === 'tavi' && E.net === 'caught') {
    yield* say(g, id, ["You got one! You got one and it's so sad and I'm so happy, isn't it?!", "Keep the net! Keep it forever! I've got the other one, isn't it?!"]);
    completeErrand(g, 'net');
    return true;
  }
  if (id === 'bartleby' && E.rod === 'open') {
    yield* say(g, id, ["No. | … | You're the one who owes the goose. I'd prefer not to know that, and I do.", "That rod. Take it. It's been leaning there since before you came. It's been bothering the wall.", "Catch me a fish, then. Cast at water. Wait for the plunge. Not the little ones. The plunge. | I'd prefer you didn't."]);
    grantTool(g, 'rod');
    g.sound('reveal');
    E.rod = 'got';
    return true;
  }
  if (id === 'bartleby' && E.rod === 'caught') {
    yield* say(g, id, ["You caught one. | … | I don't want it. Keep it. Sell it to the goose.", "I'd prefer not to say thank you. | Keep the rod."]);
    completeErrand(g, 'rod');
    return true;
  }
  return false;
}
/** The Mayor's part of Day One. Returns true when it took over the conversation. */
export function* day1Mayor(g) {
  const w = g.world;
  if (!w.story.day1Active) return false;
  const E = w.story.errands;
  if (E.shovel === 'open') {
    yield* say(g, 'trundle', HOSTS.trundle.lend);
    grantTool(g, 'shovel');
    g.sound('reveal');
    E.shovel = 'got';
    yield* say(g, 'trundle', ["There's a crack… on the plaza. | Star-shaped. | It's been… annoying me. | Dig it… if you would. | I'd do it… but… | I'm on my way… to something."]);
    return true;
  }
  return false;
}
/** Clementine's part: the can, and the letter to Gran. */
export function* day1Clementine(g) {
  const w = g.world;
  if (!w.story.day1Active) return false;
  const E = w.story.errands;
  if (E.can === 'open') {
    yield* say(g, 'clementine', ["Hello. You're the new arrival. I've filled in a form about it. The bee has seen you.", "The Mayor planted a sapling on his way past, a while ago. He can't go back. Somebody should water it.", "Take this can. It's the one that isn't leaking. The sapling is just west of the plaza."]);
    grantTool(g, 'can');
    g.sound('reveal');
    E.can = 'got';
    return true;
  }
  if (E.letter === 'open') {
    yield* say(g, 'clementine', ["You should write to your Gran. There's a desk by the wall. Everyone's got a Gran. Mine was a very large capybara."]);
    E.letter = 'told';
    return true;
  }
  return false;
}
/** Mrs. Gander during Day One: the parcel, and the evening. */
export function* day1Gander(g) {
  const w = g.world;
  if (!w.story.day1Active) return false;
  const E = w.story.errands;
  if (E.parcel === 'got') {
    const i = w.player.pockets.findIndex((s) => s?.id === 'parcel');
    if (i >= 0) {
      removeSlot(g, i);
      yield* say(g, 'gander', ["Ah. Dorrit's parcel. Thank you, dear. I've taken a little off your bill. And added a little for the delivery."]);
      completeErrand(g, 'parcel');
      return true;
    }
  }
  if (errandsDone(w)) {
    yield* say(g, 'gander', ["You've paid off 2,000 beans. You're free to go. Not that you were ever not free. Legally.", "The roof's on, dear. I had it put on while you weren't looking. It's on the bill.", "Get some sleep. The bed saves your place in the world. And mine, in your life."]);
    finishDayOne(g);
    return true;
  }
  return false;
}
export function finishDayOne(g) {
  const w = g.world;
  w.story.day1Active = false;
  w.story.stage = 'free';
  w.flags.shackRoof = true;
  g.town.refreshHome();
  w.player.beans += 300; // Mrs. Gander pays your apron wages, less the apron
  if (w.clock.minute < 18.5 * 60) w.clock.minute = 18.5 * 60;
  sendMail(g, { from: 'gran', body: "Dear {player},\nGot your letter. You always did leave things to the last minute. Here's a fruit. Don't plant it near anything you like.\nGran", gift: 'fig' });
  sendMail(g, { from: 'tavi', body: "Dear {player}!\nYou live here now and it's the best thing that has happened since this morning! Isn't it?!\nTavi", gift: { id: 'smileGift', from: 'tavi' } });
  g.events.emit('day1Done', {});
}
export { sendMail, addBeans, payDebt, narrate, ask, LANDMARKS };
