// Island stations: where they are, what they offer. Plain data.
export const STATIONS = [
  { id: 'weigh', name: 'Weigh-In Terrace', x: 0, z: 3, r: 2.6, blurb: 'Ounce lives here. Ounce has opinions.', acts: [] },
  { id: 'pavilion', name: 'Pavilion of Holding Still', x: -11, z: 3, r: 4, blurb: 'Stand. Then stand more.', acts: ['tree', 'heron', 'warrior', 'chair', 'fold', 'plank'] },
  { id: 'shed', name: 'The Rep Shed', x: 11, z: 3, r: 4, blurb: 'Reps are counted. Regrets are filed.', acts: ['squat', 'lunge', 'press'] },
  { id: 'beach', name: 'Beat Beach', x: 12, z: -10, r: 4, blurb: 'Rhythm for people who have it.', acts: ['hoop', 'step'] },
  { id: 'lagoon', name: 'Lagoon Games', x: -12, z: -10, r: 4.2, blurb: 'Water nearby. Dignity optional.', acts: ['header', 'slack', 'tray', 'pier'] },
  { id: 'jog', name: 'Jogging Path', x: 0, z: 11, r: 2.6, blurb: 'A path. Around the island. Once.', acts: ['jog'] },
  { id: 'jar', name: 'The Sweat Jar', x: 4, z: -4, r: 2.4, blurb: 'Every drip is a minute of you.', acts: [] },
  { id: 'locker', name: 'Locker Room', x: -4, z: -4, r: 2.6, blurb: 'Change into something less noted.', acts: [] },
  { id: 'hall', name: 'Hall of Numbers', x: 0, z: -8, r: 3, blurb: 'Records, a chart, and a calendar.', acts: [] },
  { id: 'hammock', name: 'Hammock', x: 14, z: 10, r: 2.6, blurb: 'End the day. Ounce will say something.', acts: [] },
];
export const stationById = (id) => STATIONS.find((s) => s.id === id);
export const stationOfAct = (act) => STATIONS.find((s) => s.acts.includes(act));
