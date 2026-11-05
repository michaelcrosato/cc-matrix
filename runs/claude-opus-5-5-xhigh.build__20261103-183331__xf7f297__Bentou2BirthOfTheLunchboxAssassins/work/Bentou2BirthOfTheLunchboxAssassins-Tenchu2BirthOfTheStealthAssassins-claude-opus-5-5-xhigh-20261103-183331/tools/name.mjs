// The deliverable's name by TASK.md's rule, [GameTitle-SOURCE-claude-opus-5-5-xhigh-20261103-183331]: GameTitle is the
// title drawn for the game (on its title screen and in exit-interview.json), SOURCE is TASK.md's first line. Both are
// written whole, each word capitalized, with only what a file name can't safely hold (spaces, the colon) left out
export const TITLE = 'Bentou 2: Birth of the Lunchbox Assassins', SOURCE = 'Tenchu 2: Birth of the Stealth Assassins', TAIL = 'claude-opus-5-5-xhigh-20261103-183331';
export const fileSafe = s => s.split(/[^A-Za-z0-9]+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('');
export const NAME = fileSafe(TITLE) + '-' + fileSafe(SOURCE) + '-' + TAIL;
