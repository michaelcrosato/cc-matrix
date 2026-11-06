/* Original music and voices for K.C.'s Hungry Hullabaloo.
 * Every sound is a Web Audio oscillator/noise voice; there are no audio assets.
 * The native engine owns the sequencer, its music clock and all volume buses. */

const PITCHES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const noteNumber = (value) => {
	const m = /^([A-G])([#b]?)(\d)$/.exec(value);
	return m
		? (Number(m[3]) + 1) * 12 +
				PITCHES[m[1]] +
				(m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0)
		: 60;
};
const noteName = (number) =>
	`${["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][((number % 12) + 12) % 12]}${Math.floor(number / 12) - 1}`;
const transpose = (notes, semitones) =>
	notes
		.split(/\s+/)
		.map((n) => (/^[A-G]/.test(n) ? noteName(noteNumber(n) + semitones) : n))
		.join(" ");
const frequency = (number) => 440 * 2 ** ((number - 69) / 12);
const melody =
	"G4 . C5 . E5 G5 . E5 D5 . C5 . A4 . G4 . | E4 . G4 . C5 . D5 E5 G5 - E5 . D5 . C5 . | A4 . C5 . E5 . A5 G5 E5 . D5 . C5 D5 . E5 | F5 . E5 D5 C5 . A4 . G4 . D5 . C5 - . .";
const bass =
	"C3 . . G3 C3 . G2 . C3 . . G3 C3 . G2 . | A2 . . E3 A2 . E2 . A2 . . E3 A2 . E2 . | F2 . . C3 F2 . C3 . F2 . . C3 F2 . A2 . | G2 . . D3 G2 . B2 . C3 . G2 . C3 - . .";
const chords =
	". . C4 E4 . . G4 E4 . . C4 E4 . . G4 E4 | . . A3 C4 . . E4 C4 . . A3 C4 . . E4 C4 | . . F3 A3 . . C4 A3 . . F3 A3 . . C4 A3 | . . G3 B3 . . D4 B3 . . C4 E4 . . G4 E4";
const pollen =
	". . . . G5 . . . . . E5 . . . D5 . | . . . . E5 . . . . . C5 . . . A4 . | . . . . C6 . . . . . A5 . . . G5 . | . . . . D6 . . . G5 . . . C6 - . .";
const fright =
	"C6 . B5 . A#5 . A5 . G#5 . G5 . F#5 . G5 . | E6 . D#6 . D6 . C#6 . C6 . B5 . A#5 . B5 .";

export const AUDIO_CAPTIONS = Object.freeze({
	bite: "Chomp! The sentries are frightened.",
	catch: "Gotcha! Sentry in a spin.",
	pursuit: "Heads up! The crawler is hunting.",
	warning: "Heads up! The crawler is hunting.",
	plant: "Snack planted.",
	invalid: "No room for that snack.",
	wrap: "Through the garden gate!",
	hit: "Oof! Back to the nursery.",
	respawn: "Fresh from the nursery!",
	clear: "Garden gobbled!",
	victory: "Venus is delicious!",
	defeat: "A noble nibble. Try again!",
	recover: "Sentry back on patrol.",
});

export const EFFECTS = Object.freeze({
	bite: [
		{ wave: "triangle", freq: 780, to: 145, dur: 0.095, vol: 0.32 },
		{ wave: "noise", freq: 1750, to: 530, dur: 0.055, vol: 0.09 },
		{ wave: "sine", freq: 460, to: 970, delay: 0.08, dur: 0.1, vol: 0.16 },
	],
	catch: [
		{
			wave: "square",
			freq: 392,
			arp: [0, 4, 7, 12],
			step: 0.033,
			dur: 0.16,
			vol: 0.11,
		},
		{ wave: "sine", freq: 1046, to: 1568, delay: 0.12, dur: 0.2, vol: 0.17 },
	],
	pursuit: [
		{ wave: "triangle", freq: 196, to: 185, dur: 0.16, vol: 0.24 },
		{
			wave: "pulse12",
			freq: 392,
			delay: 0.12,
			arp: [0, -1, 0, 6],
			step: 0.07,
			dur: 0.3,
			vol: 0.08,
		},
	],
	fright: [
		{ wave: "sine", freq: 1300, to: 790, dur: 0.2, vol: 0.12, vib: [17, 0.09] },
	],
	recover: [
		{
			wave: "triangle",
			freq: 349,
			arp: [0, -2, -5],
			step: 0.07,
			dur: 0.23,
			vol: 0.22,
		},
	],
	wrap: [
		{ wave: "sine", freq: 220, to: 1174, dur: 0.19, vol: 0.2 },
		{ wave: "sine", freq: 1568, to: 440, delay: 0.12, dur: 0.2, vol: 0.12 },
	],
	tree: [
		{
			wave: "triangle",
			freq: 1174,
			arp: [0, 7],
			step: 0.037,
			dur: 0.09,
			vol: 0.17,
		},
	],
	plant: [
		{ wave: "sine", freq: 155, to: 523, dur: 0.12, vol: 0.24 },
		{ wave: "triangle", freq: 784, delay: 0.07, dur: 0.12, vol: 0.1 },
	],
	invalid: [
		{ wave: "triangle", freq: 175, to: 147, dur: 0.075, vol: 0.16 },
		{ wave: "triangle", freq: 147, delay: 0.095, dur: 0.07, vol: 0.14 },
	],
	chew: [
		{ wave: "noise", freq: 770, to: 350, dur: 0.075, vol: 0.07 },
		{ wave: "triangle", freq: 180, to: 110, dur: 0.075, vol: 0.13 },
	],
	hit: [
		{ wave: "noise", freq: 1050, to: 140, dur: 0.18, vol: 0.17 },
		{
			wave: "triangle",
			freq: 440,
			arp: [0, -2, -5, -9, -12],
			step: 0.05,
			dur: 0.28,
			vol: 0.25,
		},
	],
	respawn: [
		{
			wave: "sine",
			freq: 330,
			arp: [0, 4, 7, 12],
			step: 0.05,
			dur: 0.24,
			vol: 0.18,
		},
	],
	clear: [
		{
			wave: "triangle",
			freq: 523,
			arp: [0, 4, 7, 12, 16, 19],
			step: 0.055,
			dur: 0.34,
			vol: 0.2,
		},
	],
	defeat: [
		{
			wave: "triangle",
			freq: 523,
			arp: [0, -1, -4, -7, -12],
			step: 0.09,
			dur: 0.5,
			vol: 0.2,
		},
	],
	victory: [
		{
			wave: "sine",
			freq: 523,
			arp: [0, 4, 7, 12, 19, 24],
			step: 0.07,
			dur: 0.48,
			vol: 0.2,
		},
	],
	menu: [{ wave: "triangle", freq: 659, to: 784, dur: 0.045, vol: 0.13 }],
	confirm: [
		{
			wave: "triangle",
			freq: 784,
			arp: [0, 7, 12],
			step: 0.035,
			dur: 0.12,
			vol: 0.13,
		},
	],
	cancel: [{ wave: "triangle", freq: 440, to: 294, dur: 0.09, vol: 0.13 }],
});

// These instruments are registered with the native music synthesizer. The same
// functions are also used by renderAudioProof, so the offline test covers the
// actual oscillators, filters and envelopes that play in the game.
function instrument(ctx, bus, time, freq, duration, volume, kind = "pluck") {
	const end = time + Math.max(0.025, duration),
		gain = ctx.createGain(),
		filter = ctx.createBiquadFilter();
	const source = ctx.createOscillator();
	source.type =
		kind === "reed" ? "triangle" : kind === "bell" ? "sine" : "triangle";
	source.frequency.setValueAtTime(Math.max(35, freq), time);
	filter.type = "lowpass";
	filter.frequency.setValueAtTime(
		kind === "bell" ? 6500 : kind === "reed" ? 2600 : 3400,
		time,
	);
	filter.Q.value = 0.6;
	gain.gain.setValueAtTime(0, time);
	gain.gain.linearRampToValueAtTime(
		volume * (kind === "bell" ? 0.7 : 0.85),
		time + 0.006,
	);
	gain.gain.exponentialRampToValueAtTime(0.0001, end + 0.04);
	source.connect(filter);
	filter.connect(gain);
	gain.connect(bus);
	source.start(time);
	source.stop(end + 0.055);
	let overtone = null;
	if (kind === "bell" || kind === "pluck") {
		overtone = ctx.createOscillator();
		const overGain = ctx.createGain();
		overtone.type = "sine";
		overtone.frequency.setValueAtTime(
			freq * (kind === "bell" ? 2.003 : 2),
			time,
		);
		overGain.gain.setValueAtTime(
			volume * (kind === "bell" ? 0.18 : 0.13),
			time,
		);
		overGain.gain.exponentialRampToValueAtTime(0.0001, end);
		overtone.connect(overGain);
		overGain.connect(bus);
		overtone.start(time);
		overtone.stop(end + 0.04);
	}
	return {
		sources: overtone ? [source, overtone] : [source],
		gain,
		end: end + 0.055,
	};
}

// Tiny invented syllables: two resonant formants turn a soft saw into a garden
// keeper's nonsense. Their rhythms and pitch contours carry the intent.
const VOWELS = [
	[610, 1300],
	[330, 1850],
	[460, 950],
	[320, 770],
	[700, 1700],
];
const PHRASES = {
	bite: [
		[0, 0.075, 0],
		[7, 0.095, 2],
		[12, 0.12, 1],
	],
	catch: [
		[7, 0.085, 1],
		[12, 0.11, 0],
		[16, 0.15, 4],
	],
	pursuit: [
		[0, 0.11, 2],
		[-3, 0.09, 3],
		[5, 0.17, 0],
	],
	plant: [
		[0, 0.08, 3],
		[5, 0.13, 1],
	],
	hit: [
		[3, 0.09, 4],
		[-5, 0.18, 2],
	],
	respawn: [
		[0, 0.075, 1],
		[4, 0.09, 0],
		[7, 0.13, 4],
	],
	clear: [
		[0, 0.08, 0],
		[4, 0.08, 1],
		[7, 0.11, 4],
		[12, 0.18, 0],
	],
	defeat: [
		[0, 0.1, 3],
		[-3, 0.12, 2],
		[-7, 0.17, 3],
	],
	victory: [
		[0, 0.075, 0],
		[7, 0.08, 1],
		[12, 0.1, 4],
		[16, 0.1, 0],
		[19, 0.19, 1],
	],
};
function syllable(ctx, bus, time, freq, dur, vowel, volume) {
	const osc = ctx.createOscillator(),
		out = ctx.createGain(),
		filters = VOWELS[vowel % VOWELS.length].map((f, i) => {
			const filter = ctx.createBiquadFilter(),
				g = ctx.createGain();
			filter.type = "bandpass";
			filter.frequency.setValueAtTime(f, time);
			filter.frequency.linearRampToValueAtTime(
				f * (i ? 0.92 : 1.1),
				time + dur,
			);
			filter.Q.value = i ? 4 : 3;
			g.gain.value = i ? 0.35 : 0.7;
			osc.connect(filter);
			filter.connect(g);
			g.connect(out);
			return filter;
		});
	osc.type = "sawtooth";
	osc.frequency.setValueAtTime(freq, time);
	osc.frequency.exponentialRampToValueAtTime(freq * 1.12, time + dur * 0.25);
	osc.frequency.exponentialRampToValueAtTime(freq * 0.94, time + dur);
	out.gain.setValueAtTime(0, time);
	out.gain.linearRampToValueAtTime(volume, time + 0.009);
	out.gain.setValueAtTime(volume * 0.85, time + dur * 0.65);
	out.gain.linearRampToValueAtTime(0, time + dur);
	out.connect(bus);
	osc.start(time);
	osc.stop(time + dur + 0.015);
	return { source: osc, gain: out, filters, end: time + dur + 0.015 };
}

export function makeGardenSong(garden = 0, kind = "play") {
	const index = Math.max(0, Math.min(4, garden | 0)),
		shift = [0, 2, 5, 7, 9][index],
		title = kind === "title",
		workshop = kind === "workshop";
	const bpm = title ? 98 : workshop ? 92 : [112, 120, 124, 130, 138][index];
	return {
		bpm,
		steps: 4,
		len: 64,
		tracks: [
			{
				name: "nibble",
				wave: title ? "gardenBell" : index === 3 ? "gardenReed" : "gardenPluck",
				vol: title ? 0.13 : 0.16,
				gate: 0.68,
				notes: transpose(melody, shift),
			},
			{
				name: "roots",
				wave: "triangle",
				vol: title ? 0.17 : 0.23,
				gate: 0.72,
				notes: transpose(bass, shift),
			},
			{
				name: "leaves",
				wave: "gardenReed",
				vol: title ? 0.035 : 0.05,
				gate: 0.4,
				notes: transpose(chords, shift),
			},
			{
				name: "pollen",
				wave: "gardenBell",
				vol: title ? 0.04 : index === 2 ? 0.075 : 0.05,
				gate: 0.6,
				notes: transpose(pollen, shift),
			},
			{
				name: "drums",
				wave: "drums",
				vol: title || workshop ? 0.035 : index === 4 ? 0.09 : 0.065,
				notes:
					index === 1
						? "k . h . . . h . k . h . s . . h"
						: index === 3
							? "k . h . s . h . k h . h s . h h"
							: "k . h . s . h . k . h h s . h .",
			},
			{
				name: "fright",
				wave: "gardenBell",
				vol: 0.075,
				on: false,
				gate: 0.42,
				notes: transpose(fright, shift),
			},
		],
	};
}

export function makeSting(kind = "clear", garden = 0) {
	const shift = [0, 2, 5, 7, 9][Math.max(0, Math.min(4, garden | 0))];
	const tunes = {
		clear: [
			"G4 . C5 . E5 . G5 . C6 - E6 . D6 . C6 - - - . . . . . .",
			"C3 . G3 . C3 . G3 . C4 - G3 . G3 . C3 - - - . . . . . .",
			144,
		],
		defeat: [
			"E5 . D#5 . D5 . C#5 . C5 - G4 . C4 - - - . . . . . . . .",
			"C3 - - - B2 - - - Bb2 - G2 . C2 - - - . . . . . . . .",
			106,
		],
		victory: [
			"G4 . C5 . E5 . G5 . C6 - . G5 E5 . C5 . A5 . G5 . E5 . D5 . C5 - - - . . . | C5 E5 G5 C6 . G5 E5 C5 A4 C5 F5 A5 . F5 D5 B4 C5 - - - - - - - . . . . . . . .",
			"C3 . G3 . C4 . G3 . C3 - . G2 C3 . G2 . F3 . C4 . F3 . C3 . G3 . C3 - - - . . . | C3 . G3 . C4 . G3 . F3 . C4 . F3 . G3 . C3 - - - - - - - . . . . . . . .",
			136,
		],
	};
	const [lead, low, bpm] = tunes[kind] || tunes.clear;
	return {
		bpm,
		steps: 4,
		loop: false,
		tracks: [
			{
				wave: "gardenBell",
				vol: 0.21,
				gate: 0.85,
				notes: transpose(lead, shift),
			},
			{
				wave: "gardenReed",
				vol: 0.1,
				octave: -1,
				gate: 0.7,
				notes: transpose(lead, shift),
			},
			{ wave: "triangle", vol: 0.24, notes: transpose(low, shift) },
		],
	};
}

export class GardenAudio {
	constructor(game) {
		this.game = game;
		this.audio = game.audio;
		this.kind = null;
		this.garden = 0;
		this.stopped = false;
		this.disposed = false;
		this.frightened = false;
		this.voiceWait = 0;
		this.live = [];
		this.voices = [];
		this.clock = 0;
		this.starts = 0;
		this.eventCounts = {};
		this.lastCaption = "";
		this.voiceCount = 0;
		this.audio.instrument("gardenPluck", (c, b, t, f, d, v) =>
			instrument(c, b, t, f, d, v, "pluck"),
		);
		this.audio.instrument("gardenReed", (c, b, t, f, d, v) =>
			instrument(c, b, t, f, d, v, "reed"),
		);
		this.audio.instrument("gardenBell", (c, b, t, f, d, v) =>
			instrument(c, b, t, f, d, v, "bell"),
		);
		for (const [name, spec] of Object.entries(EFFECTS))
			this.audio.define(`garden-${name}`, spec);
	}
	scene(kind, garden = 0) {
		if (this.disposed) return;
		garden = Math.max(0, Math.min(4, garden | 0));
		if (this.kind === kind && this.garden === garden && !this.stopped) return;
		this._silence();
		this.kind = kind;
		this.garden = garden;
		this.frightened = false;
		this.stopped = false;
		this._start();
	}
	_start() {
		if (this.disposed || this.stopped || !this.kind) return;
		const sting = ["clear", "defeat", "victory"].includes(this.kind);
		const song = sting
			? makeSting(this.kind, this.garden)
			: makeGardenSong(
					this.garden,
					this.kind === "attract" ? "play" : this.kind,
				);
		this.audio.music(song, { sync: true, loop: !sting, fade: 0.12 });
		if (this.frightened && !sting) {
			this.audio.layer("fright", 0.9, 0.01);
			this.audio.layer("nibble", 0.65, 0.01);
		}
		this.starts++;
	}
	event(event) {
		if (this.disposed || this.stopped || !event) return "";
		const aliases = {
			pickup: "tree",
			seed: "tree",
			sentry: "catch",
			sentryCatch: "catch",
			warning: "pursuit",
			hunt: "pursuit",
			life: "hit",
			damage: "hit",
			invalidPlant: "invalid",
			plantReject: "invalid",
			gardenClear: "clear",
			gameOver: "defeat",
			win: "victory",
			sentryRecover: "recover",
		};
		const type = aliases[event.type] || event.type;
		if (!EFFECTS[type]) return "";
		this.eventCounts[type] = (this.eventCounts[type] || 0) + 1;
		const sound = this.audio.sfx(`garden-${type}`, {
			vary: 0,
			pitch:
				type === "tree"
					? 1 + ((event.value || this.eventCounts.tree) % 3) * 0.07
					: 1,
		});
		this.live.push({ sound, end: this.clock + 0.9 });
		this.lastCaption = AUDIO_CAPTIONS[type] || "";
		if (PHRASES[type] && this.voiceWait <= 0)
			this._speak(type, event.actor || 0);
		return this.lastCaption;
	}
	_speak(type, actor) {
		const c = this.audio.ctx,
			bus = this.audio.bus("voice");
		if (
			this.game.headless ||
			!c ||
			c.state !== "running" ||
			!bus ||
			this.audio.muted
		)
			return;
		const phrase = PHRASES[type],
			base =
				(type === "pursuit" ? 185 : type === "hit" ? 260 : 330) *
				(Number(actor) % 2 ? 1.17 : 1);
		let at = c.currentTime + 0.012;
		for (const [pitch, duration, vowel] of phrase) {
			const s = syllable(
				c,
				bus,
				at,
				base * 2 ** (pitch / 12),
				duration,
				vowel,
				0.18,
			);
			this.voices.push(s);
			at += duration + 0.024;
		}
		this.voiceWait = at - c.currentTime + 0.35;
		this.voiceCount++;
	}
	update(dt, view) {
		if (this.disposed) return;
		this.clock += Math.max(0, dt);
		this.voiceWait = Math.max(0, this.voiceWait - dt);
		this.live = this.live.filter((v) => v.end > this.clock);
		if (this.audio.ctx)
			this.voices = this.voices.filter(
				(v) => v.end > this.audio.ctx.currentTime,
			);
		if (this.stopped) return;
		const fright = !!(
			view &&
			view.fright > 0 &&
			["play", "attract"].includes(this.kind)
		);
		if (fright !== this.frightened) {
			this.frightened = fright;
			this.audio.layer("fright", fright ? 0.9 : 0, 0.16);
			this.audio.layer("nibble", fright ? 0.65 : 1, 0.16);
		}
	}
	_silence() {
		this.audio.music(null);
		for (const s of this.live)
			try {
				s.sound.stop(0);
			} catch {}
		this.live = [];
		const now = this.audio.ctx?.currentTime || 0;
		for (const v of this.voices) {
			try {
				v.gain.gain.cancelScheduledValues(now);
				v.gain.gain.setValueAtTime(0, now);
				v.source.stop(now + 0.002);
			} catch {}
		}
		this.voices = [];
		this.voiceWait = 0;
		// The native sequencer keeps short stings separately from its primary song.
		// Disconnect them as well when a session ends or the game is suspended.
		for (const s of this.audio._stings || [])
			try {
				s.bus?.disconnect();
			} catch {}
		if (this.audio._stings) this.audio._stings.length = 0;
	}
	stop() {
		if (this.disposed) return;
		this.stopped = true;
		this._silence();
	}
	resume() {
		if (this.disposed || !this.stopped) return;
		this.stopped = false;
		this._start();
	}
	dispose() {
		if (this.disposed) return;
		this.stop();
		this.disposed = true;
		this.kind = null;
	}
	diagnostics() {
		return {
			kind: this.kind,
			garden: this.garden,
			stopped: this.stopped,
			disposed: this.disposed,
			starts: this.starts,
			frightened: this.frightened,
			musicVolume: this.audio.musicVolume,
			effectsVolume: this.audio.sfxVolume,
			voiceVolume: this.audio.voiceVolume,
			context: this.audio.ctx?.state || "locked",
			playing: this.audio.pos.playing,
			liveEffects: this.live.length,
			liveSyllables: this.voices.length,
			voicePhrases: this.voiceCount,
			events: { ...this.eventCounts },
			caption: this.lastCaption,
		};
	}
}

export async function renderAudioProof(
	OfflineCtor = globalThis.OfflineAudioContext,
) {
	if (!OfflineCtor)
		return { supported: false, reason: "OfflineAudioContext unavailable" };
	const sampleRate = 44100,
		duration = 3,
		ctx = new OfflineCtor(2, sampleRate * duration, sampleRate);
	const master = ctx.createGain();
	master.gain.value = 0.7;
	master.connect(ctx.destination);
	const music = ctx.createGain(),
		effects = ctx.createGain(),
		voice = ctx.createGain();
	music.gain.value = 0.1;
	effects.gain.value = 0.7;
	voice.gain.value = 0.65;
	music.connect(master);
	effects.connect(master);
	voice.connect(master);
	const tones = [60, 64, 67, 72, 69, 67, 64, 62, 60];
	for (let i = 0; i < tones.length; i++)
		instrument(
			ctx,
			music,
			0.04 + i * 0.12,
			frequency(tones[i]),
			0.15,
			0.22,
			["pluck", "reed", "bell"][i % 3],
		);
	instrument(ctx, effects, 1.25, 760, 0.13, 0.25, "pluck");
	instrument(ctx, effects, 1.4, 145, 0.13, 0.25, "reed");
	let t = 1.75;
	for (const [pitch, dur, vowel] of PHRASES.bite) {
		syllable(ctx, voice, t, 330 * 2 ** (pitch / 12), dur, vowel, 0.18);
		t += dur + 0.024;
	}
	const rendered = await ctx.startRendering();
	let peak = 0,
		energy = 0,
		finite = true,
		nonzero = 0;
	for (let channel = 0; channel < rendered.numberOfChannels; channel++)
		for (const value of rendered.getChannelData(channel)) {
			if (!Number.isFinite(value)) finite = false;
			peak = Math.max(peak, Math.abs(value));
			energy += value * value;
			if (Math.abs(value) > 1e-7) nonzero++;
		}
	return {
		supported: true,
		finite,
		nonzero,
		peak,
		rms: Math.sqrt(energy / (rendered.length * rendered.numberOfChannels)),
		frames: rendered.length,
		channels: rendered.numberOfChannels,
		musicGain: music.gain.value,
		effectsGain: effects.gain.value,
		voiceGain: voice.gain.value,
		bounded: peak < 1,
	};
}
