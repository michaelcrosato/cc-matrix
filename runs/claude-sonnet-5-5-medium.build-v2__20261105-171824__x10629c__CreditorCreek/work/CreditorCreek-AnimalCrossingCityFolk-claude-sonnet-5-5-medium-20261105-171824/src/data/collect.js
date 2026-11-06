// Fish, bugs, fossils, art: plain data. Seasons: 0 Spring 1 Summer 2 Autumn 3 Winter. Times: any day night dusk dawn late.
const ALL = [0, 1, 2, 3];
const S = (s) => s === 'all' ? ALL : s.split('').map(Number);
const F = (id, name, price, where, seasons, time, line, extra = {}) => ({ id, name, price, where, seasons: S(seasons), time, line, kind: 'fish', ...extra });
export const FISH = [
  F('minnow', 'Minnow', 60, 'river', '012', 'any', "That's... that's all of it.", { size: 0 }),
  F('perch', 'Perch', 150, 'river', 'all', 'day', 'It was just sitting there. On purpose.', { size: 1 }),
  F('crawfish', 'Crawfish', 200, 'pond', '01', 'any', 'It has opinions about your thumbs.', { size: 0 }),
  F('carp', 'Carp', 300, 'pond', 'all', 'any', 'Carp diem! ...Sorry. It made me say that.', { size: 1 }),
  F('trout', 'Trout', 400, 'river', '02', 'any', "It isn't pouting. That's just its face.", { size: 1 }),
  F('catfish', 'Catfish', 800, 'pond', '12', 'night', 'It claims to be a different catfish online.', { size: 2 }),
  F('pike', 'Pike', 900, 'river', '23', 'any', 'Someone should tell it about the other end of the hook.', { size: 2 }),
  F('eel', 'Eel', 1200, 'river', '12', 'dusk', 'Slippery. Also, it knows what you did.', { size: 2 }),
  F('salmon', 'Salmon', 1500, 'mouth', '2', 'any', 'It came all this way and now look.', { size: 2 }),
  F('goldencarp', 'Golden Carp', 5000, 'pond', '0', 'dawn', 'It looks expensive and it knows.', { size: 2, rare: true }),
  F('sturgeon', 'Sturgeon', 6000, 'mouth', '3', 'any', 'Older than the Mayor. Slightly faster.', { size: 3, rare: true }),
  F('sardine', 'Sardine', 100, 'sea', 'all', 'any', 'Comes with its own sense of confinement.', { size: 0 }),
  F('mackerel', 'Mackerel', 250, 'sea', '12', 'any', 'Holy it.', { size: 1 }),
  F('seabream', 'Sea Bream', 500, 'sea', '01', 'any', 'Very calm. Suspiciously calm.', { size: 1 }),
  F('flounder', 'Flounder', 700, 'sea', 'all', 'any', 'Both eyes on you. Literally.', { size: 2 }),
  F('pufferfish', 'Pufferfish', 1800, 'sea', '1', 'dusk', "It's taking this very personally.", { size: 1 }),
  F('moonfish', 'Moonfish', 4000, 'sea', '12', 'late', "It's bigger than your whole debt. Almost.", { size: 3, rare: true }),
  F('boot', 'Old Boot', 10, 'any', 'all', 'any', 'Somewhere, a fish is walking funny.', { size: 1, junk: true }),
];
const B = (id, name, price, where, seasons, time, line, extra = {}) => ({ id, name, price, where, seasons: S(seasons), time, line, kind: 'bug', ...extra });
export const BUGS = [
  B('cabbagebutterfly', 'Cabbage Butterfly', 90, 'flower', '01', 'day', "It's very sorry about the cabbage.", { fly: true }),
  B('pillbug', 'Pill Bug', 100, 'rock', 'all', 'any', 'It has rolled up and refused to comment.'),
  B('ladybird', 'Ladybird', 120, 'flower', '0', 'day', 'It came for the aphids and stayed for the drama.'),
  B('pondskater', 'Pond Skater', 130, 'water', '1', 'day', 'Technically walking on water. Not technically impressed.'),
  B('cricket', 'Cricket', 130, 'grass', '2', 'night', 'It was just getting to the good part.'),
  B('moth', 'Moth', 150, 'lamp', 'all', 'night', 'It has found the lamp. It has found its purpose.', { fly: true }),
  B('grasshopper', 'Grasshopper', 160, 'grass', '12', 'day', "It didn't save anything for winter either."),
  B('dragonfly', 'Dragonfly', 180, 'water', '12', 'day', 'Four wings and still somehow caught.', { fly: true }),
  B('bumblebee', 'Bumblebee', 200, 'flower', '01', 'day', "It's too busy for this, and it says so.", { fly: true }),
  B('snail', 'Snail', 200, 'rock', '01', 'rain', 'Not the Mayor. Probably.'),
  B('cicada', 'Cicada', 250, 'tree', '1', 'day', 'Seventeen years underground for this.'),
  B('swallowtail', 'Swallowtail', 300, 'flower', '1', 'day', 'Fancy. It wants you to know that.', { fly: true }),
  B('firefly', 'Firefly', 300, 'water', '1', 'night', "Dimmer up close. Aren't we all.", { fly: true }),
  B('woollybear', 'Woolly Bear', 350, 'tree', '2', 'day', 'Yolanda wants to know where it got that sweater.'),
  B('mantis', 'Praying Mantis', 400, 'flower', '12', 'day', "It isn't praying. It's negotiating."),
  B('snowflea', 'Snow Flea', 600, 'snow', '3', 'day', 'Technically a bug. Emotionally, a snowflake.'),
  B('stagbeetle', 'Stag Beetle', 2000, 'tree', '1', 'night', 'It has been waiting for someone to try that.', { rare: true }),
  B('rhinobeetle', 'Rhino Beetle', 2500, 'tree', '1', 'late', "You're not sure who caught whom.", { rare: true }),
];
export const FOSSILS = [
  { id: 'trilobite', name: 'Trilobite', price: 1100, kind: 'fossil', line: 'A tiny armoured commuter.' },
  { id: 'ammonite', name: 'Ammonite', price: 1200, kind: 'fossil', line: 'A shell that spiralled out of control.' },
  { id: 'amberfly', name: 'Amber Fly', price: 1500, kind: 'fossil', line: 'Stuck forever in a very bad Tuesday.' },
  { id: 'mysterytooth', name: 'Mystery Tooth', price: 900, kind: 'fossil', line: 'Whose is it? Nobody is volunteering.' },
  { id: 'moa_skull', name: 'Moatosaur Skull', price: 2000, kind: 'fossil', set: 'moatosaur', line: 'It is mostly cheekbone.' },
  { id: 'moa_torso', name: 'Moatosaur Torso', price: 2200, kind: 'fossil', set: 'moatosaur', line: 'A lot of ribs, none of them lending.' },
  { id: 'moa_tail', name: 'Moatosaur Tail', price: 2000, kind: 'fossil', set: 'moatosaur', line: 'It had a lot to say, and said it behind.' },
  { id: 'reg_skull', name: 'Regretodon Skull', price: 2400, kind: 'fossil', set: 'regretodon', line: 'It regrets everything, including this.' },
  { id: 'reg_neck', name: 'Regretodon Neck', price: 2600, kind: 'fossil', set: 'regretodon', line: 'Long. Very long. Still no excuse.' },
  { id: 'reg_torso', name: 'Regretodon Torso', price: 2300, kind: 'fossil', set: 'regretodon', line: 'Hollow in all the wrong places.' },
];
export const ART = [
  { id: 'monallama', name: 'Mona Llama', price: 4000, kind: 'art', line: 'She smiles. She knows about the spit.' },
  { id: 'goosepearl', name: 'Goose with a Pearl Earring', price: 5000, kind: 'art', line: 'The pearl is the only thing not judging you.' },
  { id: 'greatwave', name: 'The Great Wave Off Beans', price: 4500, kind: 'art', line: 'A tidal wave of legumes. Terrifying.' },
  { id: 'starrybus', name: 'The Starry Bus Stop', price: 4800, kind: 'art', line: 'Swirling sky, delayed bus.' },
  { id: 'venusflytrap', name: 'The Birth of Venus Flytrap', price: 4200, kind: 'art', line: 'A shell, a plant, a regrettable lunch.' },
  { id: 'thehonk', name: 'The Honk', price: 3800, kind: 'art', line: 'A scream, but it is a goose, so: normal.' },
  { id: 'whistlersmoose', name: "Whistler's Moose", price: 3600, kind: 'art', line: 'A moose in a chair. He would prefer not.' },
  { id: 'cheeseearthly', name: 'The Cheese of Earthly Delights', price: 6000, kind: 'art', line: 'Nobody can look at it for long. Nobody wants to.' },
];
export const PUNS = {
  fish: FISH, bug: BUGS,
};
export const ALL_COLLECT = [...FISH.filter(f => !f.junk), ...BUGS, ...FOSSILS, ...ART];
export const byId = {};
for (const x of [...FISH, ...BUGS, ...FOSSILS, ...ART]) byId[x.id] = x;
export function timeOk(time, hour, wet) {
  switch (time) {
    case 'any': return true;
    case 'day': return hour >= 6 && hour < 18;
    case 'night': return hour >= 19 || hour < 4;
    case 'dusk': return hour >= 17 || hour < 4;
    case 'dawn': return hour >= 4 && hour < 8;
    case 'late': return hour >= 22 || hour < 4;
    case 'rain': return !!wet;
  }
  return true;
}
