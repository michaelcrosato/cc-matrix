/* Original procedural score, machinery, weapons and radio babble.
 * Adapter: const sound = new BomberAudio(E, game); apply persisted audio levels
 * after construction; call sound.unlock() in a deliberate input handler,
 * sound.update(dt, simState, {active,paused}) after fixed simulation steps,
 * and sound.event(event, simState) for newly accepted authoritative events.
 * update also consumes state.events, deduplicated by id. stop() ends a sortie;
 * update on a fresh nonterminal state restarts cleanly. dispose() ends ownership.
 * All custom nodes use native audio buses. No files, TTS or gameplay RNG.
 */

const clamp = (v, a, b) => Math.min(b, Math.max(a, Number(v) || 0));
const TERMINAL = new Set([
	"debrief",
	"failed",
	"failure",
	"ended",
	"results",
	"complete",
]);

export const BOMBER_SCORES = Object.freeze({
	prepare: {
		bpm: 76,
		steps: 2,
		tracks: [
			{
				name: "air",
				wave: "triangle",
				vol: 0.15,
				notes:
					"D4 - . A4 F4 - E4 - | D4 - . F4 G4 - A4 - | Bb4 - A4 - F4 - E4 - | D4 - A3 - D4 - . .",
			},
			{
				name: "ground",
				wave: "sine",
				vol: 0.17,
				notes:
					"D2 - - - A2 - - - | Bb2 - - - F2 - - - | G2 - - - A2 - - - | D2 - - - D3 - - -",
			},
		],
	},
	approach: {
		bpm: 104,
		steps: 2,
		tracks: [
			{
				name: "pulse",
				wave: "triangle",
				vol: 0.1,
				notes:
					"D3 . A3 . D4 . A3 . | C3 . G3 . C4 . G3 . | Bb2 . F3 . Bb3 . F3 . | A2 . E3 . A3 . E3 .",
			},
			{
				name: "signal",
				wave: "sine",
				vol: 0.14,
				notes:
					"D5 - . . F5 - E5 - | D5 - . . C5 - A4 - | Bb4 - . . F5 - E5 - | A4 - - - . . . .",
			},
			{
				name: "march",
				wave: "drums",
				vol: 0.13,
				notes: "k . h . . . h . k . h . s . h .",
			},
		],
	},
	home: {
		bpm: 80,
		steps: 2,
		tracks: [
			{
				name: "home",
				wave: "triangle",
				vol: 0.17,
				notes:
					"F4 - A4 - C5 - A4 - | Bb4 - G4 - F4 - D4 - | F4 - A4 - G4 - E4 - | F4 - - - . . . .",
			},
			{
				name: "field",
				wave: "sine",
				vol: 0.16,
				notes:
					"F2 - - - C3 - - - | Bb2 - - - D3 - - - | F2 - - - C3 - - - | F2 - - - F3 - - -",
			},
		],
	},
});

function random(seed = 0x71e25a9) {
	let x = seed >>> 0 || 1;
	return () => {
		x ^= x << 13;
		x ^= x >>> 17;
		x ^= x << 5;
		return (x >>> 0) / 4294967296;
	};
}

/** Shared by real-time sound and OfflineAudioContext verification. */
export function synthNoiseBuffer(ctx, seconds = 1, seed = 0x71e25a9) {
	const buffer = ctx.createBuffer(
		1,
		Math.max(1, Math.floor(ctx.sampleRate * seconds)),
		ctx.sampleRate,
	);
	const samples = buffer.getChannelData(0),
		next = random(seed);
	let smooth = 0;
	for (let i = 0; i < samples.length; i++) {
		const white = next() * 2 - 1;
		smooth = 0.985 * smooth + 0.015 * white;
		samples[i] = white * 0.7 + smooth * 0.3;
	}
	return buffer;
}

/** Schedule one bounded sound. Handles include every source for hard cleanup. */
export function scheduleBomberSound(ctx, destination, kind, options = {}) {
	const at = Math.max(ctx.currentTime || 0, Number(options.at) || 0);
	const level = clamp(options.gain === undefined ? 1 : options.gain, 0, 1.5);
	const pitch = clamp(options.pitch === undefined ? 1 : options.pitch, 0.35, 3);
	const sources = [],
		nodes = [],
		randomValue = random(options.seed || 74191);
	const output = ctx.createGain();
	output.gain.value = level;
	output.connect(destination);
	nodes.push(output);
	let duration = 0;
	const voice = ({
		start = 0,
		dur = 0.1,
		freq = 220,
		to = freq,
		vol = 0.1,
		wave = "sine",
		filter,
		q = 0.8,
		attack = 0.005,
	}) => {
		const t = at + start,
			end = t + dur,
			envelope = ctx.createGain();
		envelope.gain.setValueAtTime(0, t);
		envelope.gain.linearRampToValueAtTime(
			vol,
			t + Math.min(attack, dur * 0.25),
		);
		envelope.gain.exponentialRampToValueAtTime(0.00001, end);
		envelope.gain.setValueAtTime(0, end + 0.002);
		let source;
		if (wave === "noise") {
			source = ctx.createBufferSource();
			source.buffer = synthNoiseBuffer(
				ctx,
				Math.max(0.5, dur + 0.05),
				(options.seed || 74191) + sources.length * 17,
			);
			source.loop = true;
			const band = ctx.createBiquadFilter();
			band.type = filter || "bandpass";
			band.Q.value = q;
			band.frequency.setValueAtTime(Math.max(30, freq * pitch), t);
			band.frequency.exponentialRampToValueAtTime(
				Math.max(30, to * pitch),
				end,
			);
			source.connect(band);
			band.connect(envelope);
			nodes.push(band);
		} else {
			source = ctx.createOscillator();
			source.type = wave;
			source.frequency.setValueAtTime(Math.max(20, freq * pitch), t);
			source.frequency.exponentialRampToValueAtTime(
				Math.max(20, to * pitch),
				end,
			);
			if (filter) {
				const band = ctx.createBiquadFilter();
				band.type = "bandpass";
				band.frequency.value = filter;
				band.Q.value = q;
				source.connect(band);
				band.connect(envelope);
				nodes.push(band);
			} else source.connect(envelope);
		}
		envelope.connect(output);
		source.start(t);
		source.stop(end + 0.012);
		sources.push(source);
		nodes.push(envelope);
		duration = Math.max(duration, start + dur + 0.02);
	};
	switch (kind) {
		case "gun":
			voice({
				wave: "noise",
				freq: 2100,
				to: 380,
				dur: 0.085,
				vol: 0.26,
				filter: "lowpass",
				attack: 0.001,
			});
			voice({
				wave: "sine",
				freq: 130,
				to: 48,
				dur: 0.11,
				vol: 0.18,
				attack: 0.001,
			});
			voice({
				wave: "triangle",
				start: 0.025,
				freq: 620,
				to: 190,
				dur: 0.055,
				vol: 0.035,
			});
			break;
		case "flak":
			voice({
				wave: "noise",
				freq: 1500,
				to: 95,
				dur: 0.8,
				vol: 0.34,
				filter: "lowpass",
				attack: 0.003,
			});
			voice({ freq: 82, to: 29, dur: 0.65, vol: 0.27, attack: 0.002 });
			break;
		case "impact":
			voice({
				wave: "noise",
				freq: 2600,
				to: 110,
				dur: 1.05,
				vol: 0.32,
				filter: "lowpass",
				attack: 0.001,
			});
			voice({ freq: 96, to: 24, dur: 0.95, vol: 0.24, attack: 0.001 });
			voice({
				wave: "triangle",
				start: 0.06,
				freq: 235,
				to: 47,
				dur: 0.45,
				vol: 0.08,
			});
			break;
		case "bomb":
			voice({ wave: "noise", freq: 1600, to: 500, dur: 0.1, vol: 0.11 });
			voice({ wave: "triangle", freq: 290, to: 90, dur: 0.16, vol: 0.08 });
			voice({
				wave: "sine",
				start: 0.1,
				freq: 900,
				to: 1700,
				dur: 0.75,
				vol: 0.045,
				attack: 0.12,
			});
			break;
		case "hit":
			voice({
				wave: "noise",
				freq: 3200,
				to: 500,
				dur: 0.24,
				vol: 0.24,
				filter: "highpass",
				attack: 0.001,
			});
			voice({ wave: "triangle", freq: 440, to: 80, dur: 0.22, vol: 0.14 });
			break;
		case "landing":
			voice({
				wave: "noise",
				freq: 1100,
				to: 180,
				dur: 0.8,
				vol: 0.19,
				filter: "lowpass",
				attack: 0.02,
			});
			voice({ freq: 105, to: 42, dur: 0.34, vol: 0.16 });
			voice({
				wave: "triangle",
				start: 0.16,
				freq: 170,
				to: 80,
				dur: 0.26,
				vol: 0.05,
			});
			break;
		case "radio":
			voice({
				wave: "noise",
				freq: 2600,
				to: 1500,
				dur: 0.045,
				vol: 0.065,
				filter: "bandpass",
				attack: 0.001,
			});
			break;
		case "warning":
			for (let i = 0; i < 3; i++)
				voice({
					wave: "triangle",
					start: i * 0.19,
					freq: i % 2 ? 760 : 570,
					dur: 0.12,
					vol: 0.08,
				});
			break;
		case "extinguish":
			voice({
				wave: "noise",
				freq: 3500,
				to: 650,
				dur: 0.85,
				vol: 0.14,
				filter: "highpass",
				attack: 0.035,
			});
			break;
		case "jettison":
			voice({
				wave: "noise",
				freq: 600,
				to: 160,
				dur: 0.42,
				vol: 0.12,
				filter: "lowpass",
			});
			voice({ wave: "triangle", freq: 210, to: 55, dur: 0.3, vol: 0.1 });
			break;
		case "doors":
			voice({
				wave: "noise",
				freq: 950,
				to: 400,
				dur: 0.65,
				vol: 0.045,
				filter: "bandpass",
				attack: 0.025,
			});
			voice({
				wave: "triangle",
				freq: 85,
				to: 72,
				dur: 0.55,
				vol: 0.035,
				attack: 0.03,
			});
			voice({
				wave: "noise",
				start: 0.55,
				freq: 1400,
				to: 300,
				dur: 0.07,
				vol: 0.07,
				filter: "lowpass",
			});
			break;
		case "voice": {
			const role = String(options.role || "navigator").toLowerCase();
			const base = /bomb|reed/.test(role)
				? 132
				: /gun|pip/.test(role)
					? 248
					: /pilot|captain|mercer/.test(role)
						? 174
						: 207;
			const syllables = options.urgent ? 8 : 6;
			for (let i = 0; i < syllables; i++) {
				const start = 0.045 + i * (options.urgent ? 0.065 : 0.092);
				const f =
					base *
					[1, 1.25, 0.89, 1.12, 0.94, 1.33, 1.06, 0.84][i % 8] *
					(0.98 + randomValue() * 0.04);
				voice({
					wave: "sawtooth",
					start,
					freq: f,
					to: f * (i % 2 ? 0.92 : 1.13),
					dur: 0.052 + randomValue() * 0.018,
					vol: 0.085,
					filter: 850 + (i % 3) * 560,
					q: 1.6,
					attack: 0.009,
				});
				voice({
					wave: "noise",
					start,
					freq: 2700,
					to: 1400,
					dur: 0.018,
					vol: 0.025,
					filter: "bandpass",
				});
			}
			break;
		}
		default:
			break;
	}
	const handle = {
		sources,
		output,
		duration,
		at,
		end: at + duration,
		stopped: false,
		stop() {
			if (handle.stopped) return;
			handle.stopped = true;
			try {
				output.gain.cancelScheduledValues(ctx.currentTime);
				output.gain.setValueAtTime(0, ctx.currentTime);
			} catch {}
			for (const source of sources)
				try {
					source.stop();
				} catch {}
			for (const node of nodes)
				try {
					node.disconnect();
				} catch {}
		},
	};
	if (!sources.length) handle.stop();
	return handle;
}

export class BomberAudio {
	constructor(E, game) {
		this.E = E;
		this.game = game;
		this.audio = game.audio;
		this.unlocked = false;
		this.disposed = false;
		this.paused = false;
		this.running = false;
		this.lastEvent = 0;
		this.seen = new Set();
		this.handles = new Set();
		this.drones = [];
		this.mountShots = {};
		this.heardGunStations = new Set();
		this.motif = null;
		this.lastCaption = "";
		this.nextVoiceAt = 0;
		this.lastTime = 0;
		this.pendingCaption = null;
		// Construct once before applying persisted settings. Never reset this in update or replay.
		if (this.audio && !this.audio._bomberVolumeInitialized) {
			this.audio.musicVolume = 0.1;
			this.audio._bomberVolumeInitialized = true;
			this.audio.applyVolume();
		}
		this._pagehide = () => this.stop();
		if (typeof addEventListener === "function")
			addEventListener("pagehide", this._pagehide);
	}

	async unlock() {
		if (this.disposed || !this.audio || this.game.headless) return false;
		try {
			if (!this.audio.bus("sfx")) return false;
			const ctx = this.audio.ctx;
			if (ctx.state !== "running") await ctx.resume();
			this.unlocked = ctx.state === "running";
			if (this.unlocked && !this.analyser && ctx.createAnalyser) {
				this.analyser = ctx.createAnalyser();
				this.analyser.fftSize = 512;
				this.audio.bus("master").connect(this.analyser);
				this.samples = new Float32Array(512);
			}
			return this.unlocked;
		} catch {
			return false;
		}
	}

	_play(type, options = {}, bus = "sfx") {
		if (
			!this.unlocked ||
			this.paused ||
			this.disposed ||
			!this.audio?.ctx ||
			this.audio.ctx.state !== "running"
		)
			return null;
		try {
			const handle = scheduleBomberSound(
				this.audio.ctx,
				this.audio.bus(bus),
				type,
				options,
			);
			handle.kind = type;
			this.handles.add(handle);
			return handle;
		} catch {
			return null;
		}
	}

	_droneStart() {
		const ctx = this.audio.ctx,
			bus = this.audio.bus("sfx");
		if (!ctx || !bus || this.drones.length) return;
		for (let i = 0; i < 4; i++) {
			const gain = ctx.createGain(),
				oscillator = ctx.createOscillator(),
				overtone = ctx.createOscillator(),
				higher = ctx.createGain();
			oscillator.type = "sawtooth";
			oscillator.frequency.value = 35 + i * 0.37;
			overtone.type = "sine";
			overtone.frequency.value = 70 + i * 0.73;
			higher.gain.value = 0.18;
			const filter = ctx.createBiquadFilter();
			filter.type = "lowpass";
			filter.frequency.value = 360;
			filter.Q.value = 0.6;
			gain.gain.value = 0;
			oscillator.connect(filter);
			overtone.connect(higher);
			higher.connect(filter);
			filter.connect(gain);
			gain.connect(bus);
			oscillator.start();
			overtone.start();
			this.drones.push({ oscillator, overtone, gain, filter, higher });
		}
		const noise = ctx.createBufferSource(),
			filter = ctx.createBiquadFilter(),
			gain = ctx.createGain();
		noise.buffer = synthNoiseBuffer(ctx, 2, 0x14b277);
		noise.loop = true;
		filter.type = "lowpass";
		filter.frequency.value = 1100;
		gain.gain.value = 0;
		noise.connect(filter);
		filter.connect(gain);
		gain.connect(bus);
		noise.start();
		this.wind = { noise, filter, gain };
	}

	_droneStop() {
		for (const drone of this.drones) {
			try {
				drone.gain.gain.cancelScheduledValues(this.audio.ctx.currentTime);
				drone.gain.gain.value = 0;
			} catch {}
			for (const node of [drone.oscillator, drone.overtone])
				try {
					node.stop();
				} catch {}
			for (const node of Object.values(drone))
				try {
					node.disconnect();
				} catch {}
		}
		this.drones.length = 0;
		if (this.wind) {
			try {
				this.wind.gain.gain.value = 0;
				this.wind.noise.stop();
			} catch {}
			for (const node of Object.values(this.wind))
				try {
					node.disconnect();
				} catch {}
			this.wind = null;
		}
	}

	_speak(caption) {
		if (!caption?.text || !this.unlocked || this.paused) return;
		const ctx = this.audio.ctx,
			now = ctx.currentTime;
		if (caption.urgent) {
			for (const handle of this.handles)
				if (handle.voice) {
					handle.stop();
					this.handles.delete(handle);
				}
			this.nextVoiceAt = now;
			this.pendingCaption = null;
		}
		if (now < this.nextVoiceAt) {
			this.pendingCaption = caption;
			return;
		}
		this._play("radio", {}, "voice");
		const handle = this._play(
			"voice",
			{
				role: caption.role,
				urgent: !!caption.urgent,
				seed:
					(caption.id || this.lastEvent || 1) +
					String(caption.text).length * 173,
			},
			"voice",
		);
		if (handle) {
			handle.voice = true;
			this.nextVoiceAt = handle.end + 0.22;
			this.duckUntil = handle.end + 0.2;
			this.audio.duck(true);
		}
	}

	event(ev, state) {
		if (!ev || this.disposed) return;
		const id = ev.id;
		if (id !== undefined) {
			if (this.seen.has(id)) return;
			this.seen.add(id);
			this.lastEvent = Math.max(this.lastEvent, Number(id) || 0);
			if (this.seen.size > 768)
				this.seen.delete(this.seen.values().next().value);
		}
		if (!this.running || this.paused) return;
		const kind = String(ev.type || "").toLowerCase(),
			options = { seed: (Number(id) || 0) + 71 };
		if (/^(shot|gun|ai-gun|gunfire|gun-shot|fire)$/.test(kind)) {
			this._play("gun", {
				...options,
				gain: ev.ai || kind === "ai-gun" ? 0.32 : 0.8,
			});
			if (ev.station) this.heardGunStations.add(ev.station);
		} else if (/^(release|bomb|bomb-release|bombs-away)$/.test(kind))
			this._play("bomb", options);
		else if (/^(impact|bomb-impact|kill|fighter-kill)$/.test(kind))
			this._play("impact", {
				...options,
				gain: kind.includes("fighter") || kind === "kill" ? 0.65 : 1,
			});
		else if (/^(flak|flak-burst)$/.test(kind)) this._play("flak", options);
		else if (/^(hit|damage|aircraft-hit|engine-fire)$/.test(kind)) {
			this._play("hit", options);
			if (kind === "engine-fire") this._play("warning", options);
		} else if (/^(landing|touchdown|recovery|recovered)$/.test(kind))
			this._play("landing", options);
		else if (/^(warning|stall|fuel-low|flak-warning)$/.test(kind))
			this._play("warning", options);
		else if (/^(extinguish|extinguished)$/.test(kind))
			this._play("extinguish", options);
		else if (/^(jettison|payload-jettison)$/.test(kind))
			this._play("jettison", options);
		else if (kind === "doors") this._play("doors", options);
		else if (/^(caption|radio|crew)$/.test(kind)) {
			const caption = ev.text ? ev : state?.caption;
			if (caption) {
				this.lastCaption = `${caption.id || ""}:${caption.role}:${caption.text}`;
				this._speak(caption);
			}
		}
	}

	update(_dt, state, { active = true, paused = false } = {}) {
		if (this.disposed || !this.audio) return;
		if (paused !== this.paused) this.pause(paused);
		if (!state || !active || TERMINAL.has(state.phase)) {
			if (this.running) this.stop();
			return;
		}
		const t = Number(state.t) || 0;
		if (t + 0.1 < this.lastTime) {
			this.stop();
			this.seen.clear();
			this.lastEvent = 0;
			this.lastCaption = "";
			this.mountShots = {};
		}
		this.lastTime = t;
		if (this.paused || !this.unlocked) return;
		this.running = true;
		const ctx = this.audio.ctx,
			now = ctx.currentTime;
		for (const handle of this.handles)
			if (handle.end < now || handle.stopped) {
				handle.stop();
				this.handles.delete(handle);
			}
		this._droneStart();
		const aircraft = state.aircraft || {},
			throttle = clamp(
				aircraft.throttle === undefined ? 0.7 : aircraft.throttle,
				0,
				1,
			);
		const fuel = Number(aircraft.fuel === undefined ? 1 : aircraft.fuel),
			speed = Math.max(0, Number(aircraft.speed) || 0);
		const engines = Array.isArray(aircraft.engines)
			? aircraft.engines
			: [1, 1, 1, 1];
		this.drones.forEach((drone, index) => {
			const raw =
				typeof engines[index] === "object"
					? engines[index].health
					: engines[index];
			const condition = clamp(
				raw === undefined ? 1 : raw > 1 ? raw / 100 : raw,
				0,
				1,
			);
			const firing = (
				Array.isArray(aircraft.fire)
					? aircraft.fire[index]
					: aircraft.fire
			)
				? 0.88 + 0.12 * Math.sin(t * 37 + index)
				: 1;
			const rate =
				(30 + throttle * 26 + index * 0.37) *
				(0.55 + condition * 0.45) *
				firing;
			drone.oscillator.frequency.setTargetAtTime(rate, now, 0.12);
			drone.overtone.frequency.setTargetAtTime(rate * 2.01, now, 0.12);
			drone.gain.gain.setTargetAtTime(
				fuel > 0 ? (0.008 + throttle * 0.014) * condition : 0,
				now,
				0.08,
			);
			drone.filter.frequency.setTargetAtTime(190 + throttle * 480, now, 0.15);
		});
		this.wind?.gain.gain.setTargetAtTime(
			Math.min(0.045, speed / (16 * 3000)),
			now,
			0.2,
		);
		const motif = /return|landing/.test(state.phase)
			? "home"
			: /coast|strike/.test(state.phase) || state.enemies?.length
				? "approach"
				: "prepare";
		if (this.motif !== motif) {
			this.motif = motif;
			this.audio.music(BOMBER_SCORES[motif], { sync: true, fade: 0.6 });
		}
		this.heardGunStations.clear();
		for (const ev of state.events || []) this.event(ev, state);
		// Hub omits high-rate gun events from snapshots. Authoritative mount counters
		// still travel: sound one bounded burst when they increase, unless a newly
		// accepted event already sounded it locally. This never changes simulation.
		for (const [station, mount] of Object.entries(state.mounts || {})) {
			const shots = Math.max(0, Number(mount.shots) || 0),
				previous = this.mountShots[station] ?? 0;
			if (shots > previous && !this.heardGunStations.has(station))
				this._play("gun", { gain: 0.8, seed: shots * 37 + 71 });
			this.mountShots[station] = shots;
		}
		const caption = state.caption;
		if (caption?.text) {
			const signature = `${caption.id || ""}:${caption.role}:${caption.text}`;
			if (signature !== this.lastCaption) {
				this.lastCaption = signature;
				this._speak(caption);
			}
		}
		if (this.pendingCaption && now >= this.nextVoiceAt) {
			const next = this.pendingCaption;
			this.pendingCaption = null;
			this._speak(next);
		}
		if (this.duckUntil && now > this.duckUntil) {
			this.audio.duck(false);
			this.duckUntil = 0;
		}
	}

	pause(on) {
		this.paused = !!on;
		if (this.paused) {
			this._droneStop();
			for (const handle of this.handles) handle.stop();
			this.handles.clear();
			this.pendingCaption = null;
			this.nextVoiceAt = 0;
			this._stopMusic();
			this.audio?.duck(false);
			this.motif = null;
		}
	}

	_stopMusic() {
		if (!this.audio) return;
		// Native stopMusic defaults to a fade. Zero its song bus first for a quiet pause/end.
		const bus = this.audio.song?.bus,
			ctx = this.audio.ctx;
		if (bus && ctx)
			try {
				bus.gain.cancelScheduledValues(ctx.currentTime);
				bus.gain.setValueAtTime(0, ctx.currentTime);
			} catch {}
		this.audio.stopMusic(0);
	}

	stop() {
		this.running = false;
		this._droneStop();
		for (const handle of this.handles) handle.stop();
		this.handles.clear();
		this.pendingCaption = null;
		this.nextVoiceAt = 0;
		this.duckUntil = 0;
		this._stopMusic();
		this.audio?.duck(false);
		this.motif = null;
	}

	inspect() {
		let rms = 0,
			peak = 0;
		if (this.analyser && this.samples) {
			this.analyser.getFloatTimeDomainData(this.samples);
			for (const sample of this.samples) {
				rms += sample * sample;
				peak = Math.max(peak, Math.abs(sample));
			}
			rms = Math.sqrt(rms / this.samples.length);
		}
		return {
			unlocked: this.unlocked,
			running: this.running,
			paused: this.paused,
			disposed: this.disposed,
			context: this.audio?.ctx?.state || "locked",
			activeSources:
				this.drones.length * 2 +
				(this.wind ? 1 : 0) +
				[...this.handles]
					.filter(
						(h) => !h.stopped && h.end > (this.audio?.ctx?.currentTime || 0),
					)
					.reduce((n, h) => n + h.sources.length, 0),
			musicVolume: this.audio?.musicVolume ?? 0.1,
			sfxVolume: this.audio?.sfxVolume ?? 1,
			voiceVolume: this.audio?.voiceVolume ?? 1,
			musicPlaying: !!this.audio?.song,
			motif: this.motif,
			rms,
			peak,
			lastEvent: this.lastEvent,
		};
	}

	dispose() {
		this.stop();
		this.disposed = true;
		if (this.analyser) {
			try {
				this.audio?.bus("master")?.disconnect(this.analyser);
			} catch {}
			this.analyser.disconnect();
			this.analyser = null;
		}
		if (typeof removeEventListener === "function")
			removeEventListener("pagehide", this._pagehide);
	}
}
