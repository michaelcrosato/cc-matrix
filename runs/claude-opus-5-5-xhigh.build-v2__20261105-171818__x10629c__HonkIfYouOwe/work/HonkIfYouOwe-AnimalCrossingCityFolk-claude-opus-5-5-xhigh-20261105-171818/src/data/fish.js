// Fish: data only. where: river pond mouth sea any. hours: [from, to) or null. rare: weight down.
export const FISH = [
  { id: 'minnow', name: 'Minnow', beans: 60, where: 'river', seasons: [0, 1, 2], size: 'S', icon: 'fish2', color: 'mist', line: "That's… that's all of it." },
  { id: 'perch', name: 'Perch', beans: 150, where: 'river', seasons: [0, 1, 2, 3], hours: [5, 19], size: 'S', icon: 'fish1', color: 'lime', line: 'It was just sitting there. On purpose.' },
  { id: 'crawfish', name: 'Crawfish', beans: 200, where: 'pond', seasons: [0, 1], size: 'S', icon: 'crab', color: 'red', line: 'It has opinions about your thumbs.' },
  { id: 'carp', name: 'Carp', beans: 300, where: 'pond', seasons: [0, 1, 2, 3], size: 'M', icon: 'fish1', color: 'orange', line: 'Carp diem! …Sorry. It made me say that.' },
  { id: 'trout', name: 'Trout', beans: 400, where: 'river', seasons: [0, 2], size: 'M', icon: 'fish1', color: 'sky', line: "It isn't pouting. That's just its face." },
  { id: 'catfish', name: 'Catfish', beans: 800, where: 'pond', seasons: [1, 2], hours: [19, 29], size: 'M', icon: 'fish3', color: 'slate', line: 'It claims to be a different catfish online.' },
  { id: 'pike', name: 'Pike', beans: 900, where: 'river', seasons: [2, 3], size: 'L', icon: 'fish2', color: 'green', line: 'Someone should tell it about the other end of the hook.' },
  { id: 'eel', name: 'Eel', beans: 1200, where: 'river', seasons: [1, 2], hours: [17, 29], size: 'M', icon: 'fish2', color: 'night', line: 'Slippery. Also, it knows what you did.' },
  { id: 'salmon', name: 'Salmon', beans: 1500, where: 'mouth', seasons: [2], size: 'L', icon: 'fish1', color: 'orange', line: 'It came all this way and now look.' },
  { id: 'goldenCarp', name: 'Golden Carp', beans: 5000, where: 'pond', seasons: [0], hours: [5, 9], rare: true, size: 'L', icon: 'fish3', color: 'sand', line: 'It looks expensive and it knows.' },
  { id: 'sturgeon', name: 'Sturgeon', beans: 6000, where: 'mouth', seasons: [3], rare: true, size: 'XL', icon: 'fish2', color: 'mist', line: 'Older than the Mayor. Slightly faster.' },
  { id: 'sardine', name: 'Sardine', beans: 100, where: 'sea', seasons: [0, 1, 2, 3], size: 'S', icon: 'fish2', color: 'sky', line: 'Comes with its own sense of confinement.' },
  { id: 'mackerel', name: 'Mackerel', beans: 250, where: 'sea', seasons: [1, 2], size: 'M', icon: 'fish1', color: 'teal', line: 'Holy it.' },
  { id: 'seaBream', name: 'Sea Bream', beans: 500, where: 'sea', seasons: [0, 1], size: 'M', icon: 'fish3', color: 'red', line: 'Very calm. Suspiciously calm.' },
  { id: 'flounder', name: 'Flounder', beans: 700, where: 'sea', seasons: [0, 1, 2, 3], size: 'L', icon: 'fish3', color: 'plum', line: 'Both eyes on you. Literally.' },
  { id: 'pufferfish', name: 'Pufferfish', beans: 1800, where: 'sea', seasons: [1], hours: [17, 29], size: 'M', icon: 'fish3', color: 'sand', line: "It's taking this very personally." },
  { id: 'moonfish', name: 'Moonfish', beans: 4000, where: 'sea', seasons: [1, 2], hours: [21, 28], rare: true, size: 'XL', icon: 'fish3', color: 'white', line: "It's bigger than your whole debt. Almost." },
];
export const OLD_BOOT = { id: 'oldBoot', name: 'Old Boot', beans: 10, where: 'any', seasons: [0, 1, 2, 3], icon: 'boot', color: 'plum', size: 'S', line: 'Somewhere, a fish is walking funny.', noMuseum: true };
export const FISH_LEN = { S: 0.34, M: 0.6, L: 0.9, XL: 1.3 };
export const fishNow = (where, season, hour) => {
  const h = hour < 5 ? hour + 24 : hour;
  return FISH.filter((f) => (f.where === where) && f.seasons.includes(season) && (!f.hours || (h >= f.hours[0] && h < f.hours[1])));
};
