// Music: one song at a time from data/songs.js, through the engine's sequencer. The Settings slider sets its level.
import { SONGS } from '../data/songs.js';
export function playSong(audio, id) { audio.playMusic(id === null ? null : SONGS[id], id ?? undefined); }
