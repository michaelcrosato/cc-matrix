import { boot } from '../tests/lib/boot.mjs';
const { e, game } = await boot(); e.step(60);
console.log('song', game.audioSys.song, 'music vol', e.audio.volume.music, 'errors', e.errors, 'plays', JSON.stringify(Object.keys(e.audio.counts).slice(0,5)));
game.say('Forty miles of track and not one station that remembers its name.', 'bakr', 4); e.step(200); console.log('counts', Object.keys(e.audio.counts).length, e.errors);
