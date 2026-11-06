const $ = (id) => document.getElementById(id);
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const lerp = (a, b, t) => a + (b - a) * t;
let THREE, RAPIER;
try {
	[THREE, RAPIER] = await Promise.all([import("three"), import("rapier")]);
	await RAPIER.init();
} catch (e) {
	$("load-msg").textContent =
		"The engine could not load. Connect to the internet, then reload. " +
		e.message;
	throw e;
}
const preferences = {
	music: 0.1,
	sound: 0.65,
	shake: 0.65,
	glyphs: "ps",
	assist: true,
};
try {
	Object.assign(
		preferences,
		JSON.parse(localStorage.getItem("flipbros-settings") || "{}"),
	);
} catch {}
function savePrefs() {
	try {
		localStorage.setItem("flipbros-settings", JSON.stringify(preferences));
	} catch {}
}
class AudioEngine {
	constructor(ctx = null) {
		this.ctx = ctx;
		this.musicVolume = preferences.music;
		this.soundVolume = preferences.sound;
		this.next = 0;
		this.beat = 0;
		this.playing = false;
		this.events = 0;
		this.ended = false;
		if (ctx) this.setup();
	}
	setup() {
		const c = this.ctx;
		this.master = c.createGain();
		this.master.gain.value = 0.75;
		this.master.connect(c.destination);
		this.music = c.createGain();
		this.music.gain.value = this.musicVolume;
		this.music.connect(this.master);
		this.effects = c.createGain();
		this.effects.gain.value = this.soundVolume;
		this.effects.connect(this.master);
		this.analyser = c.createAnalyser();
		this.analyser.fftSize = 256;
		this.master.connect(this.analyser);
		this.noise = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
		const b = this.noise.getChannelData(0);
		let n = 1;
		for (let i = 0; i < b.length; i++) {
			n = (n * 16807) % 2147483647;
			b[i] = n / 1073741824 - 1;
		}
	}
	async unlock() {
		if (this.ended) return;
		if (!this.ctx) {
			this.ctx = new (window.AudioContext || window.webkitAudioContext)();
			this.setup();
			this.next = this.ctx.currentTime + 0.05;
		}
		if (this.ctx.state === "suspended") await this.ctx.resume();
	}
	volumes() {
		if (!this.ctx) return;
		this.music.gain.setTargetAtTime(
			preferences.music,
			this.ctx.currentTime,
			0.04,
		);
		this.effects.gain.setTargetAtTime(
			preferences.sound,
			this.ctx.currentTime,
			0.04,
		);
	}
	note(
		freq,
		t,
		dur = 0.15,
		type = "square",
		vol = 0.1,
		dest = this.effects,
		slide = 0,
	) {
		if (!this.ctx || this.ended) return;
		const c = this.ctx,
			o = c.createOscillator(),
			g = c.createGain();
		o.type = type;
		o.frequency.setValueAtTime(Math.max(25, freq), t);
		if (slide)
			o.frequency.exponentialRampToValueAtTime(Math.max(25, slide), t + dur);
		g.gain.setValueAtTime(0, t);
		g.gain.linearRampToValueAtTime(vol, t + 0.006);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		o.connect(g);
		g.connect(dest);
		o.start(t);
		o.stop(t + dur + 0.02);
		this.events++;
	}
	drum(t, vol = 0.1, dur = 0.06) {
		if (!this.ctx || this.ended) return;
		const s = this.ctx.createBufferSource(),
			g = this.ctx.createGain(),
			f = this.ctx.createBiquadFilter();
		s.buffer = this.noise;
		f.type = "highpass";
		f.frequency.value = 5500;
		g.gain.setValueAtTime(vol, t);
		g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
		s.connect(f);
		f.connect(g);
		g.connect(this.music);
		s.start(t);
		s.stop(t + dur);
	}
	voice(mood = "hello", when = 0) {
		if (!this.ctx || this.ended) return;
		const now = this.ctx.currentTime + when,
			syllables = mood === "win" ? 6 : 3;
		for (let i = 0; i < syllables; i++) {
			const t = now + i * 0.075,
				o = this.ctx.createOscillator(),
				f = this.ctx.createBiquadFilter(),
				g = this.ctx.createGain();
			o.type = "sawtooth";
			o.frequency.setValueAtTime(
				220 + (i % 3) * 65 + (mood === "win" ? 100 : 0),
				t,
			);
			o.frequency.linearRampToValueAtTime(170 + (i % 2) * 160, t + 0.07);
			f.type = "bandpass";
			f.frequency.value = [900, 1500, 700, 2100][i % 4];
			f.Q.value = 3;
			g.gain.setValueAtTime(0.0001, t);
			g.gain.exponentialRampToValueAtTime(0.15, t + 0.015);
			g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
			o.connect(f);
			f.connect(g);
			g.connect(this.effects);
			o.start(t);
			o.stop(t + 0.08);
			this.events++;
		}
	}
	sfx(type) {
		if (!this.ctx || this.ended) return;
		const t = this.ctx.currentTime;
		const n = (f, dt, d, ty, v, s) =>
			this.note(f, t + dt, d, ty, v, this.effects, s);
		switch (type) {
			case "jump":
				n(230, 0, 0.15, "square", 0.1, 630);
				break;
			case "bump":
				n(95, 0, 0.13, "triangle", 0.45, 48);
				n(320, 0.025, 0.08, "square", 0.07);
				break;
			case "flip":
				n(350, 0, 0.12, "triangle", 0.28, 700);
				n(530, 0.06, 0.13, "square", 0.07, 1000);
				break;
			case "kick":
				n(100, 0, 0.15, "sawtooth", 0.16, 35);
				n(800, 0.02, 0.15, "triangle", 0.2, 140);
				break;
			case "coin":
				[660, 880, 1320].forEach((f, i) => n(f, i * 0.045, 0.11, "sine", 0.18));
				break;
			case "hurt":
				n(340, 0, 0.22, "sawtooth", 0.15, 65);
				n(120, 0.15, 0.22, "triangle", 0.25, 35);
				break;
			case "dash":
				n(180, 0, 0.14, "sawtooth", 0.07, 900);
				break;
			case "bell":
				[440, 660, 880, 1100].forEach((f, i) =>
					n(f, 0, 0.65, "sine", 0.13 / (i + 1)),
				);
				break;
			case "clear":
				[60, 64, 67, 72, 76, 79].forEach((f, i) =>
					n(440 * 2 ** ((f - 69) / 12), i * 0.09, 0.25, "square", 0.09),
				);
				this.voice("win", 0.55);
				break;
			case "lose":
				[67, 63, 60, 55].forEach((f, i) =>
					n(440 * 2 ** ((f - 69) / 12), i * 0.17, 0.3, "triangle", 0.2),
				);
				break;
			case "menu":
				n(500, 0, 0.05, "triangle", 0.13);
				break;
		}
	}
	tick(active, phase) {
		if (!this.ctx || this.ended) return;
		this.volumes();
		if (!active) {
			this.next = this.ctx.currentTime + 0.08;
			return;
		}
		const c = this.ctx;
		let count = 0;
		while (this.next < c.currentTime + 0.17 && count++ < 12) {
			const i = this.beat % 32,
				t = this.next,
				root = [48, 48, 53, 55][Math.floor(i / 8)];
			const melody = [
				0, 7, 12, 7, 3, 7, 10, 7, 0, 7, 12, 15, 12, 7, 3, 7, 5, 12, 17, 12, 8,
				12, 15, 12, 7, 14, 19, 17, 14, 10, 7, 3,
			];
			if (i % 2 === 0)
				this.note(
					440 * 2 ** ((root - 12 - 69) / 12),
					t,
					0.18,
					"triangle",
					0.35,
					this.music,
				);
			if (i % 4 !== 3) {
				const m = root + melody[i] + (phase === 4 ? 0 : 12);
				this.note(
					440 * 2 ** ((m - 69) / 12),
					t,
					0.105,
					"square",
					0.105,
					this.music,
				);
			}
			this.drum(t, i % 4 === 2 ? 0.17 : 0.07, i % 4 === 2 ? 0.085 : 0.035);
			if (i % 8 === 0) this.note(95, t, 0.12, "sine", 0.35, this.music, 35);
			this.next += 60 / (phase === 4 ? 144 : 128) / 2;
			this.beat++;
		}
	}
	stop() {
		this.ended = true;
		if (this.master) this.master.gain.value = 0;
	}
}
const audio = new AudioEngine();
