/* Voices (§10.4): base pitch (Hz), range (semitones), rate, source wave and each speaker's tic. */
S7.voice('holle', { pitch: 420, range: 5, rate: .7, wave: 'triangle', vib: 6, vol: .7 });
S7.voice('rosalind', { pitch: 260, range: 2, rate: 1.2, wave: 'square' });
S7.voice('concierge', { pitch: 120, range: 1, rate: .8, wave: 'sawtooth', band: true, crackle: true });
S7.voice('fohn', { pitch: 160, range: 4, rate: .9, wave: 'sine', breath: true, glide: true, vol: 1.2 });
S7.voice('pim', { pitch: 520, range: 3, rate: 1.3, wave: 'triangle', echo: true });
S7.voice('murmel', { pitch: 200, range: 2, rate: .7, wave: 'sawtooth', lowpass: 600 });
S7.voice('ansel', { pitch: 110, range: 1, rate: .8, wave: 'sawtooth' });
S7.voice('dagny', { pitch: 330, range: 3, rate: 1.4, wave: 'square' });
S7.voice('ignaz', { pitch: 140, range: 2, rate: .8, wave: 'sawtooth', vib: 5 });
S7.voice('rurik', { pitch: 95, range: 2, rate: 1, wave: 'sawtooth', gravel: true });
S7.voice('kasimir', { pitch: 180, range: 7, rate: 1.1, wave: 'square', yodel: true });
S7.voice('mireille', { pitch: 300, range: 4, rate: 1, wave: 'triangle', breath: true });
S7.voice('brigid', { pitch: 240, range: 2, rate: 1, wave: 'square' });
S7.voice('grau', { pitch: 150, range: 1, rate: 1, wave: 'square', ding: true });
S7.voice('hansi', { pitch: 210, range: 5, rate: 1.1, wave: 'square', glide: true });
S7.voice('band', { pitch: 260, range: 6, rate: 1.2, wave: 'square' });
S7.voice('whiteout', { pitch: 380, range: 6, rate: 1.3, wave: 'square' });
