/** Original procedural score, sound vocabulary, and formant-like nonsense voice.
 * Native game.audio supplies music/FX synthesis and buses when passed in. No files or TTS.
 */
export const AUDIO_DEFAULTS = Object.freeze({
	music: 0.1,
	effects: 0.7,
	voice: 0.65,
});
const clamp = (n, a = 0, b = 1) =>
	Math.max(a, Math.min(b, Number.isFinite(+n) ? +n : a));
const freq = (n) =>
	typeof n === "number"
		? n
		: (() => {
				const m = /^([A-G])([#b]?)(-?\d)$/.exec(n);
				return m
					? 440 *
							2 **
								(({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] +
									(m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) +
									(+m[3] + 1) * 12 -
									69) /
									12)
					: 440;
			})();
const repeat = (s, n) => Array(n).fill(s).join(" | ");
const melody =
	"C5 . G5 . Bb5 A5 G5 . Eb5 . D5 . G4 . Bb4 . | C5 . Eb5 G5 . F5 Eb5 . D5 . Bb4 . C5 - . .";
const pulse = "C3 . C3 . G2 . C3 . Ab2 . Ab2 . Bb2 . G2 .";
const drum = "k . h . . . h . s . h . . k h .";
export const SCORES = Object.freeze({
	title: {
		bpm: 98,
		steps: 4,
		tracks: [
			{ wave: "triangle", vol: 0.2, notes: melody },
			{
				wave: "pulse12",
				vol: 0.075,
				notes: repeat("C4 . . G4 . . Eb4 . Bb3 . . D4 . . G3 .", 2),
			},
			{ wave: "triangle", vol: 0.19, notes: repeat(pulse, 2) },
		],
	},
	combat: {
		bpm: 116,
		steps: 4,
		tracks: [
			{ wave: "pulse12", vol: 0.14, notes: melody },
			{ wave: "triangle", vol: 0.25, notes: repeat(pulse, 2) },
			{ wave: "drums", vol: 0.35, notes: repeat(drum, 2) },
		],
	},
	escalation: {
		bpm: 128,
		steps: 4,
		tracks: [
			{
				wave: "pulse12",
				vol: 0.14,
				notes:
					"C6 . G5 Bb5 . A5 G5 . Eb5 . G5 . D5 . Bb4 . | C5 Eb5 G5 . Bb5 . A5 G5 F5 . Eb5 D5 C5 - . .",
			},
			{ wave: "triangle", vol: 0.25, notes: repeat(pulse, 2) },
			{
				wave: "square",
				vol: 0.055,
				notes: repeat(
					"C4 G4 Eb4 G4 C4 G4 D4 G4 Ab3 Eb4 C4 Eb4 Bb3 F4 D4 F4",
					2,
				),
			},
			{
				wave: "drums",
				vol: 0.4,
				notes: repeat("k . h h . . h . s . h h k . h .", 2),
			},
		],
	},
	boss: {
		bpm: 136,
		steps: 4,
		tracks: [
			{
				wave: "saw",
				vol: 0.085,
				notes:
					"C5 . B4 C5 G5 . Gb5 G5 Bb5 . A5 G5 Eb5 . D5 . | C5 G4 C5 Eb5 G5 Bb5 A5 G5 F5 Eb5 D5 Bb4 C5 - . .",
			},
			{
				wave: "triangle",
				vol: 0.27,
				notes: repeat("C2 . C3 C2 G2 . C3 . Ab2 . Ab3 . Bb2 G2 G3 .", 2),
			},
			{
				wave: "pulse12",
				vol: 0.05,
				notes: repeat(
					"G4 C5 Eb5 C5 Gb4 B4 D5 B4 Ab4 C5 Eb5 C5 Bb4 D5 F5 D5",
					2,
				),
			},
			{
				wave: "drums",
				vol: 0.5,
				notes: repeat("k . h h k . h . s . h h k k h .", 2),
			},
		],
	},
	victory: {
		bpm: 108,
		steps: 4,
		loop: false,
		tracks: [
			{
				wave: "triangle",
				vol: 0.25,
				notes: "C5 . E5 . G5 . B5 C6 - - G5 . E5 . G5 . C6 - - - . . . .",
			},
			{
				wave: "pulse12",
				vol: 0.09,
				notes: "E4 . G4 . C5 . G5 E5 - - C5 . G4 . C5 . E5 - - - . . . .",
			},
			{
				wave: "triangle",
				vol: 0.24,
				notes: "C3 - . . G3 - . . C3 - . . G2 - . . C3 - - - . . . .",
			},
		],
	},
	failure: {
		bpm: 82,
		steps: 4,
		loop: false,
		tracks: [
			{
				wave: "triangle",
				vol: 0.25,
				notes: "G5 - . . Eb5 - . . D5 - . . B4 - . . C5 - - - . . . .",
			},
			{
				wave: "sine",
				vol: 0.23,
				notes: "C3 - - - Ab2 - - - G2 - - - G2 - - - C2 - - - . . . .",
			},
		],
	},
});

export const SOUNDS = Object.freeze({
	fire: [
		{ wave: "pulse12", freq: 1250, to: 420, dur: 0.105, vol: 0.16 },
		{ wave: "triangle", freq: 1900, to: 700, dur: 0.055, vol: 0.1 },
	],
	"launch-missile": [
		{ wave: "noise", freq: 2800, to: 900, dur: 0.15, vol: 0.16 },
		{ wave: "sine", freq: 650, to: 300, dur: 0.13, vol: 0.13 },
	],
	"launch-mine": [
		{ wave: "sine", freq: 230, to: 540, dur: 0.28, vol: 0.2, vib: [12, 0.04] },
		{ wave: "triangle", freq: 460, to: 270, dur: 0.24, vol: 0.09 },
	],
	"launch-roller": [
		{
			wave: "square",
			freq: 96,
			to: 220,
			dur: 0.24,
			vol: 0.13,
			arp: [0, 7, 0, 12],
			step: 0.06,
		},
		{ wave: "noise", freq: 780, dur: 0.16, vol: 0.1 },
	],
	"launch-hunter": [
		{
			wave: "triangle",
			freq: 1100,
			to: 500,
			dur: 0.22,
			vol: 0.18,
			arp: [0, 4, 7, 11],
			step: 0.05,
		},
	],
	"intercept-missile": [
		{ wave: "noise", freq: 4200, to: 1000, dur: 0.1, vol: 0.22 },
		{ wave: "triangle", freq: 880, to: 1500, dur: 0.11, vol: 0.14 },
	],
	"intercept-mine": [
		{ wave: "noise", freq: 1400, to: 500, dur: 0.18, vol: 0.22 },
		{ wave: "sine", freq: 440, to: 1400, dur: 0.22, vol: 0.21 },
	],
	"intercept-roller": [
		{ wave: "noise", freq: 2200, to: 250, dur: 0.22, vol: 0.23 },
		{ wave: "square", freq: 160, to: 80, dur: 0.16, vol: 0.12 },
	],
	"intercept-hunter": [
		{
			wave: "triangle",
			freq: 1400,
			dur: 0.22,
			vol: 0.19,
			arp: [0, 7, 12, 19],
			step: 0.045,
		},
		{ wave: "noise", freq: 4800, to: 1400, dur: 0.12, vol: 0.18 },
	],
	kill: [
		{ wave: "noise", freq: 1900, to: 200, dur: 0.23, vol: 0.24 },
		{ wave: "triangle", freq: 240, to: 70, dur: 0.19, vol: 0.17 },
	],
	lock: [
		{ wave: "sine", freq: 500, to: 620, dur: 0.09, vol: 0.16 },
		{ wave: "sine", freq: 620, to: 740, dur: 0.09, delay: 0.13, vol: 0.16 },
	],
	warning: [
		{ wave: "pulse12", freq: 840, dur: 0.07, vol: 0.12 },
		{ wave: "pulse12", freq: 1120, dur: 0.07, delay: 0.12, vol: 0.12 },
	],
	land: [
		{ wave: "noise", freq: 400, to: 100, dur: 0.2, vol: 0.26 },
		{ wave: "sine", freq: 120, to: 45, dur: 0.23, vol: 0.3 },
	],
	"brake-ready": [
		{
			wave: "triangle",
			freq: 523,
			dur: 0.32,
			vol: 0.22,
			arp: [0, 7, 12, 19],
			step: 0.075,
		},
	],
	brake: [
		{ wave: "sine", freq: 1300, to: 120, dur: 0.7, vol: 0.3 },
		{ wave: "noise", freq: 5500, to: 160, dur: 0.6, vol: 0.16 },
		{ wave: "triangle", freq: 100, to: 70, dur: 1.1, vol: 0.14 },
	],
	"brake-end": [{ wave: "triangle", freq: 180, to: 720, dur: 0.3, vol: 0.15 }],
	hit: [
		{ wave: "noise", freq: 600, to: 80, dur: 0.42, vol: 0.3 },
		{ wave: "saw", freq: 170, to: 45, dur: 0.35, vol: 0.14 },
	],
	recover: [
		{
			wave: "triangle",
			freq: 330,
			dur: 0.44,
			vol: 0.23,
			arp: [0, 5, 7, 12],
			step: 0.1,
		},
	],
	phase: [
		{ wave: "noise", freq: 3500, to: 100, dur: 0.6, vol: 0.3 },
		{
			wave: "triangle",
			freq: 70,
			to: 420,
			dur: 0.65,
			vol: 0.23,
			arp: [0, 7, 12, 19],
			step: 0.15,
		},
	],
	victory: [
		{
			wave: "triangle",
			freq: 523,
			dur: 0.7,
			vol: 0.2,
			arp: [0, 4, 7, 12, 16, 19, 24],
			step: 0.1,
		},
	],
	defeat: [
		{ wave: "saw", freq: 440, to: 55, dur: 0.8, vol: 0.15 },
		{ wave: "noise", freq: 900, to: 80, dur: 0.55, vol: 0.17 },
	],
	focus: [{ wave: "sine", freq: 740, to: 980, dur: 0.055, vol: 0.1 }],
	confirm: [
		{
			wave: "triangle",
			freq: 700,
			dur: 0.15,
			vol: 0.16,
			arp: [0, 7, 12],
			step: 0.05,
		},
	],
});
const ALIASES = {
	shot: "fire",
	shoot: "fire",
	playerShot: "fire",
	damage: "hit",
	playerHit: "hit",
	recovery: "recover",
	revive: "recover",
	wave: "phase",
	waveClear: "phase",
	"wave-clear": "phase",
	"boss-phase": "phase",
	"charge-ready": "brake-ready",
	brakeReady: "brake-ready",
	brakeEnd: "brake-end",
	"brake-release": "brake-end",
	"roller-land": "land",
	win: "victory",
	loss: "defeat",
	menu: "focus",
	select: "focus",
};

// A tiny private PRNG is entirely independent of authoritative gameplay randomness.
function random(seed = 0x71774) {
	let n = seed >>> 0;
	return () => {
		n ^= n << 13;
		n ^= n >>> 17;
		n ^= n << 5;
		return (n >>> 0) / 4294967296;
	};
}

/** Flexible synthesis core shared by live and offline checks. */
class Synth {
	constructor(ctx, buses, seed) {
		this.ctx = ctx;
		this.buses = buses;
		this.nodes = new Set();
		this.rnd = random(seed);
		this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
		const a = this.noise.getChannelData(0);
		for (let i = 0; i < a.length; i++) a[i] = this.rnd() * 2 - 1;
	}
	track(node) {
		this.nodes.add(node);
		node.onended = () => {
			this.nodes.delete(node);
			try {
				node.disconnect();
			} catch {}
		};
		return node;
	}
	voice(p, bus = "effects", at = this.ctx.currentTime + 0.006, scale = 1) {
		const c = this.ctx,
			t = Math.max(c.currentTime, at + (p.delay || 0)),
			duration = Math.max(0.015, p.dur || 0.15),
			end = t + duration;
		const g = c.createGain(),
			f = Math.max(20, freq(p.freq || 440)),
			v = Math.max(0.00001, (p.vol ?? 0.2) * scale);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(v, t + Math.min(0.006, duration * 0.1));
		g.gain.exponentialRampToValueAtTime(0.00001, end);
		let s;
		if (p.wave === "noise") {
			s = c.createBufferSource();
			s.buffer = this.noise;
			s.loop = true;
			const filter = c.createBiquadFilter();
			filter.type = p.filter || "bandpass";
			filter.Q.value = 0.8;
			filter.frequency.setValueAtTime(f, t);
			if (p.to)
				filter.frequency.exponentialRampToValueAtTime(
					Math.max(20, freq(p.to)),
					end,
				);
			s.connect(filter);
			filter.connect(g);
		} else {
			s = c.createOscillator();
			s.type =
				p.wave === "saw"
					? "sawtooth"
					: p.wave === "pulse" || p.wave === "pulse12"
						? "square"
						: p.wave || "triangle";
			s.frequency.setValueAtTime(f, t);
			if (p.to)
				s.frequency.exponentialRampToValueAtTime(Math.max(20, freq(p.to)), end);
			if (p.arp)
				for (let k = 0; k * (p.step || 0.06) < duration; k++)
					s.frequency.setValueAtTime(
						f * 2 ** (p.arp[Math.min(k, p.arp.length - 1)] / 12),
						t + k * (p.step || 0.06),
					);
			s.connect(g);
		}
		g.connect(this.buses[bus]);
		this.track(s);
		s.start(t);
		s.stop(end + 0.012);
		return s;
	}
	syllable(index, emotion, at) {
		const c = this.ctx,
			t = Math.max(c.currentTime, at),
			mood =
				emotion === "angry"
					? 1.18
					: emotion === "defeated"
						? 0.75
						: emotion === "proud"
							? 0.92
							: 1;
		const duration = 0.065 + (index % 3) * 0.018,
			vowel = index % 5,
			fundamental = (115 + (index % 7) * 13) * mood;
		const amp = c.createGain();
		amp.gain.setValueAtTime(0, t);
		amp.gain.linearRampToValueAtTime(0.28, t + 0.009);
		amp.gain.exponentialRampToValueAtTime(0.00001, t + duration);
		amp.connect(this.buses.voice);
		const formants = [
			[650, 1100],
			[400, 1850],
			[330, 2400],
			[500, 850],
			[300, 730],
		][vowel];
		for (let k = 0; k < 2; k++) {
			const oscillator = this.track(c.createOscillator()),
				band = c.createBiquadFilter(),
				mix = c.createGain();
			oscillator.type = k ? "triangle" : "sawtooth";
			oscillator.frequency.setValueAtTime(fundamental * (k ? 1.006 : 1), t);
			oscillator.frequency.exponentialRampToValueAtTime(
				fundamental * (emotion === "angry" ? 1.25 : 0.83),
				t + duration,
			);
			band.type = "bandpass";
			band.Q.value = 4.5;
			band.frequency.setValueAtTime(formants[k], t);
			band.frequency.linearRampToValueAtTime(
				formants[k] * (1.1 - vowel * 0.035),
				t + duration,
			);
			mix.gain.value = k ? 0.5 : 1;
			oscillator.connect(band);
			band.connect(mix);
			mix.connect(amp);
			oscillator.start(t);
			oscillator.stop(t + duration + 0.015);
		}
		if (index % 4 === 1)
			this.voice(
				{ wave: "noise", freq: 3500, dur: 0.025, vol: 0.025 },
				"voice",
				t,
			);
		return duration;
	}
	stop() {
		for (const n of this.nodes) {
			try {
				n.stop(this.ctx.currentTime);
			} catch {}
			try {
				n.disconnect();
			} catch {}
		}
		this.nodes.clear();
	}
}

function makeBuses(ctx, output = ctx.destination) {
	const master = ctx.createGain();
	master.gain.value = 0.65;
	const limiter = ctx.createDynamicsCompressor();
	limiter.threshold.value = -12;
	limiter.knee.value = 12;
	limiter.ratio.value = 5;
	limiter.attack.value = 0.003;
	limiter.release.value = 0.16;
	master.connect(limiter);
	limiter.connect(output);
	const buses = { master };
	for (const name of ["music", "effects", "voice"]) {
		buses[name] = ctx.createGain();
		buses[name].connect(master);
	}
	return buses;
}
function tokens(s) {
	return s.replace(/\|/g, " ").trim().split(/\s+/);
}
function musicStep(synth, song, step, time) {
	for (const track of song.tracks) {
		const notes = tokens(track.notes),
			note = notes[step % notes.length];
		if (note === "." || note === "-") continue;
		if (track.wave === "drums") {
			const p =
				note === "k"
					? { wave: "sine", freq: 150, to: 40, dur: 0.12, vol: 0.22 }
					: note === "s"
						? { wave: "noise", freq: 1700, dur: 0.11, vol: 0.18 }
						: {
								wave: "noise",
								freq: 6500,
								filter: "highpass",
								dur: 0.035,
								vol: 0.08,
							};
			synth.voice(p, "music", time, track.vol || 1);
		} else {
			let hold = 1;
			while (hold < notes.length && notes[(step + hold) % notes.length] === "-")
				hold++;
			synth.voice(
				{
					wave: track.wave,
					freq: note,
					dur: (60 / song.bpm / song.steps) * hold * 0.88,
					vol: track.vol ?? 0.16,
				},
				"music",
				time,
			);
		}
	}
}

export class AudioDirector {
	constructor(options = {}) {
		if (options?.bus && options?.define) options = { engineAudio: options };
		this.native = options.engineAudio || null;
		this.ctx = options.context || null;
		this.ownsContext = !options.context && !this.native;
		this.volumes = { ...AUDIO_DEFAULTS, ...options.volumes };
		this.scene = "title";
		this.paused = false;
		this.terminated = false;
		this.unlocked = !!options.context;
		this.handles = new Set();
		this.last = {};
		this.musicIndex = 0;
		this.timer = null;
		this.synth = null;
		this.buses = null;
		this.scheduled = 0;
		this.speechEnd = 0;
		this.stats = { effects: 0, syllables: 0, musicSteps: 0, unlocks: 0 };
		if (this.native) {
			for (const [name, voice] of Object.entries(SOUNDS))
				this.native.define("timelout-" + name, voice);
			this.setVolumes(this.volumes);
		}
		if (this.ctx) this.initGraph();
	}
	initGraph() {
		if (this.synth || !this.ctx) return;
		if (this.native)
			this.buses = {
				music: this.native.bus("music"),
				effects: this.native.bus("sfx"),
				voice: this.native.bus("voice"),
			};
		else this.buses = makeBuses(this.ctx);
		this.synth = new Synth(this.ctx, this.buses, 0x71774);
		this.setVolumes(this.volumes);
	}
	async unlock() {
		if (this.terminated) return false;
		try {
			if (this.native) {
				if (!this.native.bus("voice")) return false;
				this.ctx = this.native.ctx;
			}
			if (!this.ctx) {
				const Context =
					globalThis.AudioContext || globalThis.webkitAudioContext;
				if (!Context) return false;
				this.ctx = new Context();
			}
			this.initGraph();
			if (this.ctx.state === "suspended" && this.ctx.resume)
				await this.ctx.resume();
			this.unlocked = true;
			this.stats.unlocks++;
			this.setVolumes(this.volumes);
			this.startMusic();
			return true;
		} catch {
			return false;
		}
	}
	setVolumes(values = {}) {
		for (const k of Object.keys(AUDIO_DEFAULTS))
			if (k in values) this.volumes[k] = clamp(values[k]);
		if (this.native) {
			this.native.musicVolume = this.volumes.music;
			this.native.sfxVolume = this.volumes.effects;
			this.native.voiceVolume = this.volumes.voice;
			this.native.applyVolume();
		} else if (this.buses)
			for (const k of Object.keys(AUDIO_DEFAULTS))
				this.buses[k].gain.value = this.volumes[k];
		return { ...this.volumes };
	}
	setScene(name) {
		if (!SCORES[name])
			name =
				name === "finale"
					? "boss"
					: name === "results" || name === "ending"
						? "victory"
						: "combat";
		if (name === this.scene) return;
		this.scene = name;
		this.musicIndex = 0;
		this.scheduled = this.ctx?.currentTime || 0;
		this.stopSources();
		this.startMusic();
	}
	startMusic() {
		if (!this.unlocked || this.paused || this.terminated || !this.ctx) return;
		if (this.native) {
			this.native.music(SCORES[this.scene], {
				sync: false,
				fade: 0.12,
				loop: SCORES[this.scene].loop !== false,
			});
			return;
		}
		if (typeof this.ctx.startRendering === "function" || this.timer) return;
		this.scheduled = this.ctx.currentTime + 0.02;
		const pump = () => {
			if (this.paused || this.terminated) return;
			const song = SCORES[this.scene],
				length = Math.max(...song.tracks.map((t) => tokens(t.notes).length));
			while (this.scheduled < this.ctx.currentTime + 0.15) {
				if (song.loop === false && this.musicIndex >= length) return;
				musicStep(this.synth, song, this.musicIndex++, this.scheduled);
				this.stats.musicSteps++;
				this.scheduled += 60 / song.bpm / song.steps;
			}
		};
		pump();
		this.timer = setInterval(pump, 65);
	}
	event(kind, details = {}) {
		if (this.terminated || this.paused || !this.unlocked || !this.ctx) return;
		if (typeof kind === "object") {
			details = kind;
			kind = kind.type || kind.kind;
		}
		kind = ALIASES[kind] || kind;
		const family =
			details.family ||
			details.weapon ||
			details.threat ||
			details.threatType ||
			(["missile", "mine", "roller", "hunter"].includes(details.kind)
				? details.kind
				: null);
		if (kind === "intercept") kind = "intercept-" + (family || "missile");
		if (kind === "launch" || kind === "spawn")
			kind = "launch-" + (family || "missile");
		if (kind === "warning" && family === "mine") kind = "lock";
		const voice = SOUNDS[kind];
		if (!voice) return;
		const now = this.ctx.currentTime,
			gap = kind === "fire" ? 0.045 : kind === "focus" ? 0.07 : 0.03;
		if (now - (this.last[kind] ?? -Infinity) < gap) return;
		this.last[kind] = now;
		this.stats.effects++;
		if (this.native) {
			const h = this.native.sfx("timelout-" + kind, { vary: 0.02 });
			this.handles.add(h);
			if (this.handles.size > 64)
				this.handles.delete(this.handles.values().next().value);
		} else for (const p of voice) this.synth.voice(p, "effects");
	}
	speak(text, emotion = "gloat") {
		if (!this.unlocked || this.paused || this.terminated || !this.synth)
			return 0;
		const words = String(text).slice(0, 160).split(/\s+/),
			now = this.ctx.currentTime;
		let t = now + 0.02,
			n = 0;
		// Text controls phrasing only. Every audible unit is an invented oscillator syllable.
		for (const word of words) {
			const syllables = Math.min(4, Math.max(1, Math.round(word.length / 3)));
			for (let k = 0; k < syllables; k++) {
				const index =
					(word.charCodeAt(k % Math.max(1, word.length)) + n * 7) % 31;
				t += this.synth.syllable(index, emotion, t) + 0.018;
				n++;
			}
			t += /[.!?]$/.test(word) ? 0.15 : 0.035;
		}
		this.stats.syllables += n;
		this.speechEnd = t;
		return t - now;
	}
	stopSources() {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
		this.synth?.stop();
		for (const h of this.handles) h.stop?.(0);
		this.handles.clear();
		this.speechEnd = 0;
	}
	pause(value = true) {
		if (this.terminated || this.paused === !!value) return;
		this.paused = !!value;
		if (this.paused) {
			this.stopSources();
			this.native?.stopMusic(0);
		} else this.startMusic();
	}
	async destroy() {
		if (this.terminated) return;
		this.terminated = true;
		this.stopSources();
		this.native?.stopMusic(0);
		if (this.native) {
			this.native.musicVolume = 0;
			this.native.sfxVolume = 0;
			this.native.voiceVolume = 0;
			this.native.applyVolume();
		}
		if (this.ownsContext && this.ctx?.close && this.ctx.state !== "closed")
			await this.ctx.close().catch(() => {});
	}
	snapshot() {
		return {
			ready: this.unlocked,
			scene: this.scene,
			paused: this.paused,
			terminated: this.terminated,
			volumes: { ...this.volumes },
			activeSources: this.synth?.nodes.size || 0,
			...this.stats,
		};
	}
}
export const createAudio = (options) => new AudioDirector(options);

/** Real OfflineAudioContext check: same synthesis paths, independently isolated buses. */
export async function verifyAudioSignals(
	OfflineContext = globalThis.OfflineAudioContext ||
		globalThis.webkitOfflineAudioContext,
) {
	if (!OfflineContext) throw new Error("OfflineAudioContext unavailable");
	const results = {};
	for (const bus of ["music", "effects", "voice"]) {
		const context = new OfflineContext(1, 48000 * 3, 48000),
			director = new AudioDirector({ context });
		if (bus === "music") {
			const song = SCORES.combat;
			for (let i = 0; i < 16; i++)
				musicStep(director.synth, song, i, (i * 60) / song.bpm / song.steps);
		} else if (bus === "effects")
			for (let i = 0; i < 4; i++)
				for (const p of SOUNDS[["fire", "intercept-mine", "brake", "hit"][i]])
					director.synth.voice(p, bus, i * 0.6);
		else director.speak("Your seconds belong to me!", "angry");
		const rendered = await context.startRendering(),
			samples = rendered.getChannelData(0);
		let sum = 0,
			peak = 0,
			finite = true;
		for (const n of samples) {
			finite &&= Number.isFinite(n);
			sum += n * n;
			peak = Math.max(peak, Math.abs(n));
		}
		results[bus] = { finite, rms: Math.sqrt(sum / samples.length), peak };
	}
	for (const bus of ["music", "effects", "voice"]) {
		const context = new OfflineContext(1, 48000, 48000),
			director = new AudioDirector({ context });
		director.setVolumes({ [bus]: 0 });
		if (bus === "music") musicStep(director.synth, SCORES.combat, 0, 0.02);
		else if (bus === "effects") director.event("fire");
		else director.speak("Zero volume.", "gloat");
		const samples = (await context.startRendering()).getChannelData(0);
		results[bus + "Muted"] = Math.max(...samples.map(Math.abs));
	}
	const context = new OfflineContext(1, 48000, 48000),
		director = new AudioDirector({ context });
	director.speak("Scheduled syllables.");
	await director.destroy();
	const ended = (await context.startRendering()).getChannelData(0);
	results.terminatedPeak = Math.max(...ended.map(Math.abs));
	results.defaults = { ...AUDIO_DEFAULTS };
	return results;
}
