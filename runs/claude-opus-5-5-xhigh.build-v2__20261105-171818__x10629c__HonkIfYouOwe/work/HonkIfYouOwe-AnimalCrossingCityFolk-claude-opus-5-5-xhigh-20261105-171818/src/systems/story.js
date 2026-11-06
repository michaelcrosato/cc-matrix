// The year's story beats: museum, Chime, Rocco's leaving, Fitch's arrival, the last night, Year Two.
import { say, ask } from './say.js';
import { sendMail } from './mail.js';
import { favourFarEnd } from './favours.js';
import { addItem, hasRoom } from './economy.js';
import { villageDay } from '../core/calendar.js';
import { remember } from './memory.js';

export function storyMorning(g, c) {
  const w = g.world;
  const f = w.flags;
  const day = w.clock.daysPlayed;
  const once = (k, fn) => { if (!f[k]) { f[k] = true; fn(); } };
  if (day >= 2) once('museumOpen', () => {
    w.museum.open = true;
    sendMail(g, { from: 'museum', body: "Dear {player},\nThe museum is open! It was open before, but now it's open on purpose. Bring me your fossil! Bring me everything!\nDr. Quill\nP.S. Is this the right address? Is this a letter?", arriveDay: w.clock.day });
    sendMail(g, { from: 'gander', body: "Dear {player},\nAn Axe and a Slingshot have come in at the store. I've put your name on them. Not on the price.\nMrs. Gander", arriveDay: w.clock.day });
    sendMail(g, { from: 'clementine', body: "Dear {player},\nThe bus runs from the stop by the road. The fare is listening. It goes to the Big City. It comes back. Mostly.\nClementine", arriveDay: w.clock.day });
  });
  if (day >= 3) once('chimeAsk', () => sendMail(g, { from: 'clementine', body: "Dear {player},\nThe Old Bell needs a tune. Whatever you set at the Hall, everyone hears, every hour, forever. No pressure. I've said that twice now, and the bee is laughing.\nClementine", arriveDay: w.clock.day }));
  // Rocco's story
  if (day === 7 || (day > 7 && !f.roccoTalked && w.npcs.rocco.moved === 'here')) f.roccoNews = true;
  if (day >= 8 && w.npcs.rocco.moved === 'here') f.roccoBoxes = true;
  if (day >= 9 && w.npcs.rocco.moved === 'here') roccoLeaves(g);
  if (day >= 15) once('roccoLetter', () => sendMail(g, { from: 'rocco', body: "{player}!\nThe City's got HILLS! Well, ramps! I've got a room up four flights and I roll round the block! Tell Nib to keep at it! I'm coming back for the Long Night, let's roll!\nRocco", arriveDay: w.clock.day }));
  if (villageDay(w.clock.day).calendarDay === 16) f.roccoVisit = true;
  if (villageDay(w.clock.day).calendarDay === 11) once('soupNote', () => sendMail(g, { from: 'dorrit', body: "Dear {player},\nThe Great Soup is tomorrow, mmhm. Everyone adds three things. Bring something good. Don't bring a boot. Someone always brings a boot.\nDorrit", arriveDay: w.clock.day }));
  if (c.season === 3 && Object.values(w.town.objects).filter((o) => o.k === 'snowball').length < 8) g.life?.spawnSnowballs?.();
  if (day === 17 || (f.yearDone && !f.yearTwoLetter)) once('yearTwoLetter', () => sendMail(g, { from: 'clementine', body: "Dear {player},\nIt's a new year. It's the same year, but with the number changed. The village thanks you. The bee is thinking about it.\nClementine", arriveDay: w.clock.day }));
}
export function roccoLeaves(g) {
  const w = g.world;
  const r = w.npcs.rocco;
  if (r.moved !== 'here') return;
  r.moved = 'gone';
  w.npcs.fitch.moved = 'here';
  const best = r.friend >= 70;
  const argued = w.story.roccoArgue === true;
  const body = argued
    ? "{player}!\nYou told me to stay! Nobody ever told me to stay! I'm still going! But I rolled slower past your house! Let's roll!\nRocco"
    : "{player}!\nI'm off! There's a whole City with stairs in it and I'm going to beat them all! Look after Nib! Let's roll!\nRocco";
  sendMail(g, { from: 'rocco', body, gift: best ? 'roccoTrophy' : null, arriveDay: w.clock.day });
  remember(g, 'gift', { item: 'goodbye', about: 'rocco' });
  g.npcs.get('rocco').inside = true;
  g.npcs.syncVisibility(g.npcs.get('rocco'));
  g.npcs.get('fitch').inside = false;
  g.npcs.syncVisibility(g.npcs.get('fitch'));
  g.events.emit('moveOut', { id: 'rocco' });
  g.events.emit('moveIn', { id: 'fitch' });
}
export function* storyTalk(g, id) {
  const w = g.world;
  const f = w.flags;
  if (yield* favourFarEnd(g, id)) return true;
  if (id === 'rocco' && f.roccoNews && !f.roccoTalked) {
    f.roccoTalked = true;
    yield* say(g, id, ["Hey! I've got news! Big news! Heavy news! I've been looking at the road! Let's… let's roll!", "I'm leaving! Day after tomorrow! There's a whole Big City out there with hills I've never beaten! I've rolled everything here! Twice!"]);
    const c = yield* ask(g, id, "What do you reckon? You think I should go? Be honest! I'm going anyway!", ['Stay. Please.', 'You should go.', "Who's going to train Nib?"]);
    if (c === 0) {
      w.story.roccoArgue = true;
      yield* say(g, id, ["…Nobody's ever said that to me. I don't have a trophy for that. I'd have to make a new one.", "I'm still going! But… I'll roll a bit slower past your place! Let's roll."]);
      w.npcs[id].friend = Math.min(100, w.npcs[id].friend + 12);
    } else if (c === 1) {
      w.story.roccoArgue = false;
      yield* say(g, id, ["That's what I said! To the mirror! It agreed! Let's roll!"]);
    } else {
      w.story.roccoArgue = null;
      yield* say(g, id, ["Ha! Nib's got potential! He'll be fine! He doesn't know I'm going! Don't tell him! He'll be so relieved. | …Let's roll."]);
    }
    g.events.emit('roccoTalk', { argue: w.story.roccoArgue });
    return true;
  }
  if (id === 'rocco' && f.roccoBoxes) {
    yield* say(g, id, ["Boxes! So many boxes! They're great for the arms! I've packed the gym! It's in a box! The box is the gym now! Let's roll!"]);
    return true;
  }
  if (id === 'fitch' && !f.fitchMet) {
    f.fitchMet = true;
    yield* say(g, id, ["Hey. Hey, friend. New guy. Fitch. I got the armadillo's place. He left me the gym. I sold the gym.", "Lived here a whole morning and I can already tell you what you need. Nothing. For twelve beans. No refunds."]);
    return true;
  }
  return false;
}
export { addItem, hasRoom };
