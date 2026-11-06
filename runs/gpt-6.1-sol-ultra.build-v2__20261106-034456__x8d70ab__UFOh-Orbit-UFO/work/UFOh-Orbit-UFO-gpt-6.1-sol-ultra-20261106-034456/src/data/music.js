// Original score: small falling stars above a steady orbital pulse.
// Native my-3D2dge chip-song data; all notes are synthesized at runtime.
export const MUSIC = Object.freeze({
	title: {
		bpm: 92,
		steps: 4,
		len: 64,
		tracks: [
			{
				name: "beacon",
				wave: "triangle",
				vol: 0.18,
				notes:
					"D5 - . . A5 - . . | F5 - . . E5 - . . | D5 - . . C5 - . . | A4 - . . . . . . | D5 - . . A5 - . . | C6 - . . A5 - . . | F5 - . . E5 - . . | D5 - - - . . . .",
			},
			{
				name: "orbit",
				wave: "pulse12",
				vol: 0.045,
				notes:
					"D4 . A4 . D5 . A4 . | F4 . A4 . C5 . A4 . | C4 . G4 . C5 . G4 . | A3 . E4 . A4 . E4 .",
			},
			{
				name: "depth",
				wave: "sine",
				vol: 0.17,
				notes:
					"D2 - - - - - - - | F2 - - - - - - - | C2 - - - - - - - | A1 - - - - - - -",
			},
		],
	},
	mission: {
		bpm: 112,
		steps: 4,
		len: 64,
		tracks: [
			{
				name: "flight",
				wave: "triangle",
				vol: 0.13,
				notes:
					"D5 . . . A4 . C5 . | D5 - . . F5 . E5 . | D5 . . . A4 . G4 . | A4 - . . . . C5 . | D5 . . . A5 . G5 . | F5 - . . E5 . C5 . | D5 . F5 . E5 . C5 . | A4 - - - . . . .",
			},
			{
				name: "motor",
				wave: "pulse",
				vol: 0.045,
				notes:
					"D3 . D4 . A3 . D4 . | F3 . F4 . C4 . F4 . | C3 . C4 . G3 . C4 . | A2 . A3 . E3 . A3 .",
			},
			{
				name: "low",
				wave: "sine",
				vol: 0.19,
				notes:
					"D2 - - . D2 - . . | F2 - - . F2 - . . | C2 - - . C2 - . . | A1 - - . A1 - . .",
			},
			{
				name: "dust",
				wave: "drums",
				vol: 0.09,
				notes:
					"k . . . h . . . | . . s . h . . . | k . . . h . . h | . . s . h . h .",
			},
		],
	},
	boss: {
		bpm: 132,
		steps: 4,
		len: 64,
		tracks: [
			{
				name: "alarm",
				wave: "pulse12",
				vol: 0.07,
				notes:
					"D4 . D5 . A4 . F4 . | D4 . D5 . Bb4 . A4 . | Eb4 . Eb5 . Bb4 . G4 . | A3 . A4 . E4 . C#4 .",
			},
			{
				name: "challenge",
				wave: "triangle",
				vol: 0.15,
				notes:
					"D5 - . . . . F5 . | A5 - . . G5 . F5 . | Eb5 - . . G5 . Bb5 . | A5 - - - E5 - . . | D5 - . . F5 . A5 . | C6 - . . Bb5 . A5 . | G5 . F5 . Eb5 . C#5 . | D5 - - - . . . .",
			},
			{
				name: "weight",
				wave: "sine",
				vol: 0.22,
				notes:
					"D2 . D2 . D2 . D3 . | D2 . D2 . Bb1 . A1 . | Eb2 . Eb2 . Eb2 . Bb1 . | A1 . A1 . E2 . A1 .",
			},
			{
				name: "clock",
				wave: "drums",
				vol: 0.12,
				notes:
					"k . h . s . h . | k . h . s . h h | k . h . s . h . | k k h . s . h h",
			},
		],
	},
	victory: {
		bpm: 104,
		steps: 4,
		len: 64,
		tracks: [
			{
				name: "home",
				wave: "triangle",
				vol: 0.19,
				notes:
					"D5 - F5 - A5 - D6 - | C6 - A5 - F5 - - - | G5 - A5 - C6 - E6 - | D6 - - - - - . . | F5 - A5 - C6 - F6 - | E6 - D6 - C6 - A5 - | G5 - A5 - C6 - E6 - | D6 - - - - - . .",
			},
			{
				name: "glow",
				wave: "sine",
				vol: 0.18,
				notes:
					"D3 - - - F3 - - - | A3 - - - F3 - - - | C3 - - - E3 - - - | D3 - - - - - - -",
			},
		],
	},
	defeat: {
		bpm: 72,
		steps: 4,
		len: 64,
		tracks: [
			{
				name: "drift",
				wave: "triangle",
				vol: 0.15,
				notes:
					"A4 - - - F4 - - - | E4 - - - D4 - - - | C4 - - - A3 - - - | D4 - - - - - . . | . . . . . . . . | . . . . . . . . | . . . . . . . . | . . . . . . . .",
			},
			{
				name: "distance",
				wave: "sine",
				vol: 0.14,
				notes:
					"D2 - - - - - - - | Bb1 - - - - - - - | A1 - - - - - - - | D2 - - - - - - -",
			},
		],
	},
});
