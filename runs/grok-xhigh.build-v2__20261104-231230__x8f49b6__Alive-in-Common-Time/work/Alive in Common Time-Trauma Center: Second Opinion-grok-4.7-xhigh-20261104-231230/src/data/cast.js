/** Speakers. Pitch and rate drive the gibberish voices. Colors are dialogue tags. */

export const CAST = {
  narration: { name: 'Narration', color: '#d7e4e6', pitch: 140, rate: 1, formant: 1, breath: 0 },
  ren: { name: 'Ren', color: '#e8443a', pitch: 190, rate: 1.25, formant: 1, breath: 0.05, waver: 0.04 },
  bea: { name: 'Bea', color: '#f5b700', pitch: 130, rate: 0.82, formant: 0.9, breath: 0.02 },
  bell: { name: 'Bell', color: '#e6c56b', pitch: 85, rate: 1, formant: 0.85, breath: 0, chorus: 0.02 },
  pip: { name: 'Pip', color: '#3b82f6', pitch: 280, rate: 1.55, formant: 1.15, breath: 0 },
  sorrento: { name: 'Sorrento', color: '#b7c4c8', pitch: 110, rate: 1, formant: 1, breath: 0, monotone: true },
  ines: { name: 'Ines', color: '#22c55e', pitch: 150, rate: 1, formant: 1.05, breath: 0, clipped: true },
  voss: { name: 'Voss', color: '#c4b5a0', pitch: 120, rate: 0.78, formant: 0.95, breath: 0.45 },
  patient: { name: 'Patient', color: '#e8b48f', pitch: 160, rate: 1, formant: 1, breath: 0.1 },
};

export const SPEAKERS = Object.keys(CAST);

export function castOf(who) {
  return CAST[who] || CAST.patient;
}
