// Bugs: data only. spot: flower grass water near trunk rock lamp snow. kind: flier | crawler | sitter.
export const BUGS = [
  { id: 'cabbageButterfly', name: 'Cabbage Butterfly', beans: 90, spot: 'flower', seasons: [0, 1], hours: [6, 18], kind: 'flier', icon: 'butterfly', color: 'white', line: "It's very sorry about the cabbage." },
  { id: 'pillBug', name: 'Pill Bug', beans: 100, spot: 'rock', seasons: [0, 1, 2, 3], kind: 'crawler', icon: 'beetle', color: 'slate', line: 'It has rolled up and refused to comment.' },
  { id: 'ladybird', name: 'Ladybird', beans: 120, spot: 'flower', seasons: [0], kind: 'crawler', icon: 'beetle', color: 'red', line: 'It came for the aphids and stayed for the drama.' },
  { id: 'pondSkater', name: 'Pond Skater', beans: 130, spot: 'water', seasons: [1], kind: 'crawler', icon: 'hopper', color: 'night', line: 'Technically walking on water. Not technically impressed.' },
  { id: 'cricket', name: 'Cricket', beans: 130, spot: 'grass', seasons: [2], hours: [18, 30], kind: 'crawler', icon: 'hopper', color: 'plum', line: 'It was just getting to the good part.' },
  { id: 'moth', name: 'Moth', beans: 150, spot: 'lamp', seasons: [0, 1, 2, 3], hours: [18, 29], kind: 'flier', icon: 'flier', color: 'mist', line: 'It has found the lamp. It has found its purpose.' },
  { id: 'grasshopper', name: 'Grasshopper', beans: 160, spot: 'grass', seasons: [1, 2], kind: 'crawler', icon: 'hopper', color: 'lime', line: "It didn't save anything for winter either." },
  { id: 'dragonfly', name: 'Dragonfly', beans: 180, spot: 'near', seasons: [1, 2], kind: 'flier', icon: 'flier', color: 'sky', line: 'Four wings and still somehow caught.' },
  { id: 'bumblebee', name: 'Bumblebee', beans: 200, spot: 'flower', seasons: [0, 1], kind: 'flier', icon: 'bee', color: 'sand', line: "It's too busy for this, and it says so." },
  { id: 'snail', name: 'Snail', beans: 200, spot: 'rock', seasons: [0, 1], rainOnly: true, kind: 'crawler', icon: 'snail', color: 'orange', line: 'Not the Mayor. Probably.' },
  { id: 'cicada', name: 'Cicada', beans: 250, spot: 'trunk', seasons: [1], hours: [6, 18], kind: 'sitter', icon: 'beetle', color: 'green', line: 'Seventeen years underground for this.' },
  { id: 'swallowtail', name: 'Swallowtail', beans: 300, spot: 'flower', seasons: [1], hours: [6, 18], kind: 'flier', icon: 'butterfly', color: 'orange', line: 'Fancy. It wants you to know that.' },
  { id: 'firefly', name: 'Firefly', beans: 300, spot: 'near', seasons: [1], hours: [19, 28], kind: 'flier', icon: 'flier', color: 'lime', line: 'Dimmer up close. Aren’t we all.' },
  { id: 'woollyBear', name: 'Woolly Bear', beans: 350, spot: 'trunk', seasons: [2], kind: 'sitter', icon: 'hopper', color: 'orange', line: 'Yolanda wants to know where it got that sweater.' },
  { id: 'prayingMantis', name: 'Praying Mantis', beans: 400, spot: 'flower', seasons: [1, 2], kind: 'crawler', icon: 'hopper', color: 'green', line: "It isn't praying. It's negotiating." },
  { id: 'snowFlea', name: 'Snow Flea', beans: 600, spot: 'snow', seasons: [3], hours: [10, 15], kind: 'crawler', icon: 'beetle', color: 'navy', line: 'Technically a bug. Emotionally, a snowflake.' },
  { id: 'stagBeetle', name: 'Stag Beetle', beans: 2000, spot: 'trunk', seasons: [1], hours: [19, 29], rare: true, kind: 'sitter', icon: 'beetle', color: 'night', line: 'It has been waiting for someone to try that.' },
  { id: 'rhinoBeetle', name: 'Rhino Beetle', beans: 2500, spot: 'trunk', seasons: [1], hours: [22, 29], rare: true, kind: 'sitter', icon: 'beetle', color: 'plum', line: "You're not sure who caught whom." },
];
export const bugsNow = (season, hour, raining) => {
  const h = hour < 5 ? hour + 24 : hour;
  return BUGS.filter((b) => b.seasons.includes(season) && (!b.hours || (h >= b.hours[0] && h < b.hours[1])) && (!b.rainOnly || raining));
};
