// Original code-only score, effects and little nonverbal vowel-like chirps.
export const SONG = {
	bpm: 116,
	steps: 4,
	tracks: [
		{
			name: "dew",
			wave: "triangle",
			vol: 0.22,
			notes:
				"D5 . A5 . F5 . E5 . | D5 . . A4 . . C5 . | E5 . G5 . A5 . G5 . | F5 . E5 . D5 - . . | D5 . F5 . A5 . C6 . | Bb5 . A5 . G5 . E5 . | F5 . D5 . C5 . A4 . | D5 - . . . . . .",
		},
		{
			name: "roots",
			wave: "sine",
			vol: 0.3,
			notes:
				"D3 . . . . . A3 . | D3 . . . . . . . | C3 . . . . . G3 . | Bb2 . . . A2 . . . | D3 . . . . . A3 . | G2 . . . . . D3 . | Bb2 . . . C3 . . . | D3 . . . A2 . . .",
		},
		{
			name: "chase",
			wave: "pulse12",
			vol: 0.09,
			on: false,
			notes:
				"D4 . A4 . D4 . A4 . | D4 . F4 . A4 . F4 . | C4 . G4 . C4 . G4 . | Bb3 . F4 . A3 . E4 .",
		},
		{
			name: "wings",
			wave: "drums",
			vol: 0.13,
			notes:
				"k . . h . . h . | . . s . . . h . | k . . h . . h . | . . s . h . . .",
		},
	],
};
const VOICES = {
	ray: { wave: "saw", freq: 920, to: 120, dur: 0.18, vol: 0.2 },
	dry: { wave: "triangle", freq: 100, to: 80, dur: 0.045, vol: 0.09 },
	collapse: {
		wave: "pulse12",
		freq: 520,
		to: 90,
		dur: 0.2,
		vol: 0.17,
		arp: [0, 7, -7],
		step: 0.04,
	},
	charge: {
		wave: "triangle",
		freq: 660,
		to: 1320,
		dur: 0.16,
		vol: 0.18,
		arp: [0, 4, 7],
		step: 0.04,
	},
	loss: { wave: "sine", freq: 740, to: 180, dur: 0.2, vol: 0.25 },
	warning: { wave: "sine", freq: 370, to: 440, dur: 0.11, vol: 0.11 },
	mature: {
		wave: "pulse12",
		freq: 240,
		to: 580,
		dur: 0.18,
		vol: 0.12,
		arp: [0, 3, 6],
		step: 0.05,
	},
	zap: { wave: "noise", freq: 1600, to: 500, dur: 0.08, vol: 0.16 },
	recover: { wave: "sine", freq: 320, to: 440, dur: 0.09, vol: 0.08 },
	expose: { wave: "triangle", freq: 587, to: 1174, dur: 0.3, vol: 0.19 },
	pulse: { wave: "sine", freq: 90, to: 280, dur: 0.26, vol: 0.2 },
	clear: {
		wave: "triangle",
		freq: 587,
		dur: 0.22,
		vol: 0.22,
		arp: [0, 4, 7, 12],
		step: 0.07,
	},
	defeat: { wave: "triangle", freq: 294, to: 110, dur: 0.4, vol: 0.18 },
	victory: {
		wave: "triangle",
		freq: 587,
		dur: 0.3,
		vol: 0.2,
		arp: [0, 4, 7, 12, 16],
		step: 0.1,
	},
};
export function syllable(ctx, bus, time, freq = 520, dur = 0.12, vol = 0.15) {
	const source = ctx.createOscillator(),
		amp = ctx.createGain(),
		filter = ctx.createBiquadFilter();
	source.type = "sawtooth";
	source.frequency.setValueAtTime(freq, time);
	source.frequency.exponentialRampToValueAtTime(freq * 1.25, time + dur * 0.25);
	source.frequency.exponentialRampToValueAtTime(freq * 0.9, time + dur);
	filter.type = "bandpass";
	filter.frequency.setValueAtTime(freq * 2.7, time);
	filter.Q.value = 3;
	amp.gain.setValueAtTime(0, time);
	amp.gain.linearRampToValueAtTime(vol, time + 0.008);
	amp.gain.exponentialRampToValueAtTime(0.0001, time + dur);
	source.connect(filter);
	filter.connect(amp);
	amp.connect(bus);
	source.start(time);
	source.stop(time + dur + 0.01);
	return { source, amp };
}
export class GardenAudio {
	constructor(game, server = false) {
		this.game = game;
		this.disabled = server;
		this.lastEvent = 0;
		this.lastWing = -10;
		this.lastSting = -10;
		this.lastChat = -10;
		this.song = false;
		this.stopped = false;
	}
	start() {
		if (this.disabled || this.song) return;
		this.game.audio.music(SONG, { sync: true });
		this.song = true;
		this.stopped = false;
	}
	reset(s) {
		this.lastEvent = s?.eid || 0;
		this.lastWing = -10;
		this.lastSting = -10;
		this.start();
	}
	update(s, demo = false) {
		if (this.disabled || this.stopped) return;
		const A = this.game.audio;
		for (const e of s.events)
			if (e.id > this.lastEvent) {
				this.lastEvent = e.id;
				if (VOICES[e.type]) A.sfx(VOICES[e.type]);
				if (
					["encounter", "clear", "victory", "expose"].includes(e.type) &&
					!demo
				)
					this.chatter(e.id);
			}
		if (this.game.paused && !this.game.live) return;
		const near = s.rivals.some((a) => a.state === 2),
			contact = s.players.some((p) => p.contact && p.bees);
		A.layer("chase", near ? 0.09 : 0, 0.35);
		if (s.phase === "play" && s.time - this.lastWing > (near ? 0.19 : 0.36)) {
			this.lastWing = s.time;
			A.sfx({
				wave: "triangle",
				freq: near ? 205 : 170,
				to: near ? 230 : 180,
				dur: 0.065,
				vol: near ? 0.025 : 0.016,
			});
		}
		if (contact && s.time - this.lastSting > 0.16) {
			this.lastSting = s.time;
			A.sfx({
				wave: "pulse12",
				freq: 310 + (s.tick % 5) * 50,
				to: 190,
				dur: 0.045,
				vol: 0.04,
			});
		}
	}
	chatter(seed) {
		const A = this.game.audio;
		if (!A.ready) return;
		const bus = A.bus("voice"),
			c = A.ctx;
		if (!bus || !c) return;
		for (let i = 0; i < 4; i++)
			syllable(
				c,
				bus,
				c.currentTime + i * 0.09,
				440 + ((seed * 13 + i * 17) % 8) * 63,
				0.065 + (i % 2) * 0.035,
				0.07,
			);
	}
	stop() {
		this.stopped = true;
		this.song = false;
		if (this.disabled) return;
		this.game.audio.music(null);
	}
}
