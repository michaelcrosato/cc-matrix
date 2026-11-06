import { random } from "../core/math.js";

export function synthSamples(kind, rate = 24000, duration) {
	const durations = {
		gun: 0.12,
		impact: 1.1,
		flak: 0.8,
		bomb: 0.45,
		click: 0.055,
		warning: 0.4,
		voice: 0.8,
		drone: 2,
		extinguish: 0.8,
	};
	const length = Math.ceil((duration || durations[kind] || 0.2) * rate),
		data = new Float32Array(length),
		rng = random(1717);
	let low = 0,
		phase = 0;
	for (let i = 0; i < length; i++) {
		const t = i / rate,
			u = i / length,
			n = rng() * 2 - 1;
		low += (n - low) * 0.09;
		let sample = 0;
		if (kind === "drone")
			sample =
				(Math.sin(t * Math.PI * 2 * 42) * 0.3 +
					Math.sin(t * Math.PI * 2 * 84) * 0.12 +
					low * 0.2) *
				(0.85 + Math.sin(t * Math.PI * 2 * 8) * 0.15);
		else if (kind === "gun")
			sample =
				(n * 0.6 + Math.sin(t * 720 * Math.PI * 2) * 0.2) * Math.exp(-t * 45);
		else if (kind === "impact" || kind === "flak")
			sample =
				(low * 2 + Math.sin(t * (80 - u * 40) * Math.PI * 2) * 0.23) *
				Math.exp(-u * 5);
		else if (kind === "voice") {
			const syllable = Math.floor(t * 11),
				envelope = Math.sin(((t * 11) % 1) * Math.PI) ** 2;
			phase +=
				((180 + (syllable % 3) * 70 + Math.sin(t * 15) * 22) / rate) *
				Math.PI *
				2;
			sample =
				(Math.sin(phase) + Math.sin(phase * 2.05) * 0.3 + low * 0.2) *
				envelope *
				0.25 *
				Math.sin(u * Math.PI);
		} else if (kind === "bomb")
			sample =
				Math.sin(t * (650 - 400 * u) * Math.PI * 2) *
					0.16 *
					Math.sin(u * Math.PI) +
				low * 0.1;
		else if (kind === "warning")
			sample =
				Math.sin(t * Math.PI * 2 * (u < 0.5 ? 740 : 550)) *
				0.16 *
				Math.sin(u * Math.PI);
		else if (kind === "extinguish") sample = n * 0.18 * Math.sin(u * Math.PI);
		else sample = n * 0.3 * Math.exp(-u * 20);
		data[i] = Math.max(-0.85, Math.min(0.85, sample));
	}
	return data;
}

const MUSIC = {
	calm: {
		bpm: 86,
		steps: 2,
		tracks: [
			{
				wave: "triangle",
				vol: 0.13,
				notes:
					"D4 - A4 - F4 - E4 - | D4 - F4 - A4 - - - | Bb3 - F4 - D4 - C4 - | A3 - E4 - D4 - - -",
			},
			{
				wave: "sine",
				vol: 0.2,
				notes: "D2 - - - A2 - - - | Bb2 - - - F2 - - -",
			},
		],
	},
	tense: {
		bpm: 108,
		steps: 2,
		tracks: [
			{
				wave: "triangle",
				vol: 0.12,
				notes:
					"D4 . F4 . E4 . A4 . | D4 . F4 . C5 . A4 . | Bb4 . A4 . F4 . E4 . | D4 . . . A3 . . .",
			},
			{
				wave: "triangle",
				vol: 0.18,
				notes: "D2 . A2 . D3 . A2 . | Bb2 . F2 . A2 . E2 .",
			},
			{ wave: "drums", vol: 0.07, notes: "k . . h . . s . k . . h . . s ." },
		],
	},
	home: {
		bpm: 82,
		steps: 2,
		tracks: [
			{
				wave: "triangle",
				vol: 0.15,
				notes:
					"D4 - F4 - A4 - D5 - | C5 - A4 - G4 - F4 - | E4 - F4 - A4 - E4 - | D4 - - - - - - -",
			},
			{
				wave: "sine",
				vol: 0.19,
				notes: "D2 - A2 - Bb2 - F2 - | G2 - A2 - D2 - - -",
			},
		],
	},
};

export class Sound {
	constructor(game) {
		this.game = game;
		this.audio = game.audio;
		this.sources = new Set();
		this.engines = [];
		this.buffers = {};
		this.lastEvent = 0;
		this.mood = "";
		this.stopped = true;
		this.analyser = null;
	}
	buffer(kind) {
		const ctx = this.audio.ctx;
		if (!ctx) return null;
		if (!this.buffers[kind]) {
			const data = synthSamples(kind, ctx.sampleRate);
			const b = ctx.createBuffer(1, data.length, ctx.sampleRate);
			b.copyToChannel(data, 0);
			this.buffers[kind] = b;
		}
		return this.buffers[kind];
	}
	unlock() {
		if (!this.audio.bus("sfx")) return false;
		if (!this.analyser) {
			this.analyser = this.audio.ctx.createAnalyser();
			this.analyser.fftSize = 256;
			this.audio.bus("master").connect(this.analyser);
		}
		return true;
	}
	play(kind, bus = "sfx", volume = 0.4, pitch = 1, pan = 0) {
		if (!this.audio.ready || this.stopped) return;
		const ctx = this.audio.ctx,
			src = ctx.createBufferSource(),
			gain = ctx.createGain(),
			stereo = ctx.createStereoPanner();
		src.buffer = this.buffer(kind);
		src.playbackRate.value = pitch;
		gain.gain.value = volume;
		stereo.pan.value = pan;
		src.connect(gain);
		gain.connect(stereo);
		stereo.connect(this.audio.bus(bus));
		src.start();
		this.sources.add(src);
		src.onended = () => {
			this.sources.delete(src);
			src.disconnect();
			gain.disconnect();
			stereo.disconnect();
		};
		return src;
	}
	start() {
		this.stopped = false;
		if (!this.audio.ready || this.engines.length) return;
		const ctx = this.audio.ctx;
		for (let i = 0; i < 4; i++) {
			const src = ctx.createBufferSource(),
				gain = ctx.createGain(),
				pan = ctx.createStereoPanner();
			src.buffer = this.buffer("drone");
			src.loop = true;
			src.playbackRate.value = 0.8 + i * 0.013;
			gain.gain.value = 0.045;
			pan.pan.value = (i - 1.5) * 0.45;
			src.connect(gain);
			gain.connect(pan);
			pan.connect(this.audio.bus("sfx"));
			src.start();
			this.sources.add(src);
			this.engines.push({ src, gain, pan });
		}
	}
	update(sim, active = true) {
		if (!active || sim.ended) {
			this.stop();
			return;
		}
		this.start();
		if (this.audio.ctx) {
			const now = this.audio.ctx.currentTime;
			for (let i = 0; i < this.engines.length; i++) {
				const e = this.engines[i],
					h = sim.aircraft.engines[i];
				e.src.playbackRate.setTargetAtTime(
					(0.65 + sim.aircraft.throttle * 0.7 + i * 0.009) * Math.max(0.12, h),
					now,
					0.15,
				);
				e.gain.gain.setTargetAtTime(
					(0.025 + sim.aircraft.throttle * 0.045) * h,
					now,
					0.15,
				);
			}
		}
		const mood =
			sim.returning || sim.phase === "recovery"
				? "home"
				: sim.enemies.some((e) => e.alive) || sim.phase === "bomb-run"
					? "tense"
					: "calm";
		if (mood !== this.mood) {
			this.audio.music(MUSIC[mood], { sync: true });
			this.mood = mood;
		}
		this.audio.duck(sim.radio.until > sim.time && sim.radio.priority > 1);
		for (const e of sim.events || []) {
			if (e.id <= this.lastEvent) continue;
			if (e.type === "gun")
				this.play(
					"gun",
					"sfx",
					0.5,
					0.9 + (e.id % 4) * 0.025,
					["port"].includes(e.station)
						? -0.5
						: e.station === "starboard"
							? 0.5
							: 0,
				);
			if (e.type === "release") this.play("bomb", "sfx", 0.4);
			if (["impact", "kill", "damage"].includes(e.type))
				this.play("impact", "sfx", e.type === "damage" ? 0.35 : 0.6);
			if (e.type === "flak-burst") this.play("flak", "sfx", 0.6);
			if (e.type === "radio") {
				const pitch =
					e.role === "GUNNER"
						? 1.35
						: e.role === "BOMBARDIER"
							? 0.85
							: e.role === "ENGINEER"
								? 0.7
								: 1;
				this.play("click", "voice", 0.4);
				this.play("voice", "voice", 0.55, pitch);
				if (e.priority > 1) this.play("warning", "sfx", 0.3);
			}
			if (e.type === "extinguish") this.play("extinguish", "sfx", 0.5);
			this.lastEvent = Math.max(this.lastEvent, e.id);
		}
	}
	stop() {
		if (this.stopped && !this.sources.size) return;
		this.stopped = true;
		for (const src of this.sources) {
			try {
				src.stop();
			} catch {}
			src.disconnect();
		}
		this.sources.clear();
		for (const e of this.engines) {
			e.gain.disconnect();
			e.pan.disconnect();
		}
		this.engines = [];
		this.audio.music(null);
		this.mood = "";
	}
	menu() {
		if (this.audio.ready && this.mood !== "menu") {
			this.stop();
			this.stopped = false;
			this.audio.music(MUSIC.calm, { sync: true });
			this.mood = "menu";
		}
	}
	inspect() {
		let peak = 0;
		if (this.analyser) {
			const data = new Float32Array(256);
			this.analyser.getFloatTimeDomainData(data);
			peak = Math.max(...data.map(Math.abs));
		}
		return {
			sources: this.sources.size,
			engines: this.engines.length,
			musicGain: this.audio.musicVolume,
			voiceGain: this.audio.voiceVolume,
			peak,
			stopped: this.stopped,
		};
	}
}
