// Sound test: every song, SFX and speaker.
import { App } from '../../app.js';
import { SFX_DEFS } from '../../audio/sfx.js';
import { SONG_LABELS, SONGS } from '../../audio/songs.js';
import { syllabify, VOICES } from '../../audio/voice.js';
import { Menu } from '../menu.js';
import { MenuScreen } from './common.js';

const SONG_IDS = Object.keys(SONGS);
const SFX_IDS = Object.keys(SFX_DEFS);
const SPEAKER_IDS = Object.keys(VOICES).filter((v) => v !== 'narrator');
const SPEAK = 'Thank you. I have written that down. Is that close?';

export class SoundTestScreen extends MenuScreen {
  freezes = false;
  constructor() {
    const menu = new Menu([], { width: 320, onBack: () => App.stack.pop(this) });
    super('soundtest', 'Sound Test', menu, { prompts: [['adjust', 'Change'], ['confirm', 'Play'], ['back', 'Back']] });
    this.song = 0; this.sfx = 0; this.who = 0;
    menu.setItems([
      { label: 'Song', id: 'song', value: () => SONG_LABELS[SONG_IDS[this.song]], adjust: (d) => { this.song = (this.song + d + SONG_IDS.length) % SONG_IDS.length; }, action: () => App.music(SONG_IDS[this.song]) },
      { label: 'Stop music', id: 'stop', action: () => App.music(null) },
      { label: 'SFX', id: 'sfx', value: () => SFX_IDS[this.sfx], adjust: (d) => { this.sfx = (this.sfx + d + SFX_IDS.length) % SFX_IDS.length; }, action: () => App.sfx(SFX_IDS[this.sfx]), sound: 'menuMove' },
      { label: 'Speaker', id: 'speaker', value: () => SPEAKER_IDS[this.who], adjust: (d) => { this.who = (this.who + d + SPEAKER_IDS.length) % SPEAKER_IDS.length; }, action: () => this.speak(), sound: 'menuMove' },
    ]);
  }
  speak() {
    const who = SPEAKER_IDS[this.who];
    if (who === 'kevin') App.sfx('gullSquawk');
    else App.speak(syllabify(SPEAK, who), who);
  }
}
