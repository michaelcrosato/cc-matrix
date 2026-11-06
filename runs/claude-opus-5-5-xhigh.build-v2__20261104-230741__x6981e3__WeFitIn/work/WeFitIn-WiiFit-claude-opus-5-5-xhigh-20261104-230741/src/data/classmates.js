// The cast: names, looks and how well they score.
export const SPEAKERS = {
  ounce: { name: 'Ounce', color: 'teal' },
  coach: { name: 'Coach Plumb', color: 'teal' },
  marguerite: { name: 'Marguerite', color: 'teal' },
  dennis: { name: 'Dennis', color: 'teal' },
  june: { name: 'June', color: 'teal' },
  kevin: { name: 'Kevin', color: 'teal' },
  narrator: { name: '', color: 'teal' },
};

export const LOOKS = {
  coach: { skin: 'sand', top: 'cyan', bottom: 'cyan', shoe: 'white', hair: 'mist', bun: true, long: true },
  marguerite: { skin: 'sand', top: 'plum', bottom: 'white', shoe: 'white', hair: 'white', bun: true, long: true },
  dennis: { skin: 'orange', top: 'lime', bottom: 'navy', shoe: 'slate', hair: 'slate', headband: 'orange' },
  june: { skin: 'sand', top: 'red', bottom: 'ink', shoe: 'white', hair: 'ink', long: true },
};

/** Six starting avatars. */
export const PRESET_LOOKS = [
  { skin: 'sand', top: 'white', bottom: 'sky', shoe: 'white', hair: 'ink', headband: 'red' },
  { skin: 'orange', top: 'cyan', bottom: 'navy', shoe: 'white', hair: 'ink', hairStyle: 'short' },
  { skin: 'red', top: 'sand', bottom: 'teal', shoe: 'slate', hair: 'ink', bun: true, long: true },
  { skin: 'plum', top: 'lime', bottom: 'slate', shoe: 'white', hair: 'ink', hairStyle: 'tall' },
  { skin: 'sand', top: 'orange', bottom: 'white', shoe: 'navy', hair: 'red', hairStyle: 'side' },
  { skin: 'orange', top: 'plum', bottom: 'mist', shoe: 'white', hair: 'mist', headband: 'cyan', long: true },
];
export const SKINS = ['sand', 'orange', 'red', 'plum'];
export const HAIR_STYLES = ['cap', 'short', 'bun', 'tall', 'side', 'bald'];
export const HAIR_COLORS = ['ink', 'slate', 'mist', 'white', 'red', 'orange', 'sand', 'blue'];
export const TOP_COLORS = ['white', 'cyan', 'sky', 'lime', 'orange', 'red', 'plum', 'sand', 'navy'];
export const BOTTOM_COLORS = ['sky', 'navy', 'teal', 'slate', 'white', 'mist', 'ink', 'plum'];
export const HEADBANDS = [null, 'red', 'cyan', 'lime', 'sand', 'white'];

/** Reference skill of each classmate when they share your mats. */
export const CLASSMATE_SKILL = { dennis: 'sloppy', june: 'good', marguerite: 'expert' };
