// The island's places, near (x, z). Tall things stay in the -x, -z quadrant so they never hide the player.
export const STATIONS = {
  terrace: { name: 'Weigh-In Terrace', at: [0, 3], radius: 2.2, kind: 'terrace', verb: 'Stand' },
  pavilion: { name: 'Pavilion of Holding Still', at: [-11, 3], radius: 4.4, kind: 'menu', activities: ['tree', 'heron', 'warrior', 'chair', 'fold', 'plank'], verb: 'Enter' },
  shed: { name: 'The Rep Shed', at: [11, 3], radius: 4, kind: 'menu', activities: ['squats', 'lunges', 'press'], verb: 'Enter' },
  beach: { name: 'Beat Beach', at: [12, -10], radius: 4.8, kind: 'menu', activities: ['hoop', 'step'], verb: 'Enter' },
  lagoon: { name: 'Lagoon Games', at: [-12, -10], radius: 4.8, kind: 'menu', activities: ['header', 'slackline', 'tray', 'pier'], verb: 'Enter' },
  gate: { name: 'Jogging Path', at: [0, 11], radius: 2.8, kind: 'menu', activities: ['jog'], verb: 'Enter' },
  jar: { name: 'The Sweat Jar', at: [4, -4], radius: 2.2, kind: 'scene', scene: 'jar', verb: 'Look at' },
  locker: { name: 'Locker Room', at: [-4, -4], radius: 2.4, kind: 'scene', scene: 'locker', verb: 'Enter', unlockDay: 2 },
  hall: { name: 'Hall of Numbers', at: [0, -8], radius: 2.8, kind: 'scene', scene: 'records', verb: 'Read' },
  hammock: { name: 'Hammock', at: [14, 10], radius: 2.2, kind: 'hammock', verb: 'Lie down' },
};
export const STATION_IDS = Object.keys(STATIONS);
