// Four field-surgery scenes. view = viewmodel key, clip = clip name, sounds = [fraction, sfx]. Data only.
export const SURGERY = [
  { id: 'pliers', view: 'pliers', clip: 'pliers', dur: 4, line: 'PLIERS. FOREARM. THIS WILL BE LOUD.', sounds: [[0.2, 'grunt'], [0.5, 'pliers'], [0.75, 'pliers'], [0.9, 'grunt']] },
  { id: 'knife', view: 'knife', clip: 'knifeCut', dur: 4, line: 'SHRAPNEL IN THE THIGH. HOLD STILL.', sounds: [[0.2, 'knife'], [0.45, 'grunt'], [0.65, 'knife'], [0.9, 'grunt']] },
  { id: 'finger', view: 'syrette', clip: 'snap', dur: 3, line: 'JUST A FINGER. ONE, TWO.', sounds: [[0.55, 'breath'], [0.63, 'snap'], [0.8, 'grunt']] },
  { id: 'lighter', view: 'lighter', clip: 'lighter', dur: 4, line: 'SEAL IT. THIS IS THE BAD PART.', sounds: [[0.2, 'lighter'], [0.4, 'sizzle'], [0.7, 'grunt']] },
];
