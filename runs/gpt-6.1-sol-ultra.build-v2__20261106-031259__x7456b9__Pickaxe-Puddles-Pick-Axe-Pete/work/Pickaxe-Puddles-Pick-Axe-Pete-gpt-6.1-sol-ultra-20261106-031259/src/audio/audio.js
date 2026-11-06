/* Original code-only score, mine Foley and syllabic prospector voice.
   Custom instruments connect to the native engine's music/SFX/voice buses. */
(() => {
	window.PP ||= {};
	const PP = window.PP;
	const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
	const midi = (n) => 440 * 2 ** ((n - 69) / 12);
	const THEMES = [
		[64, 67, 69, 67, 64, 62, 60, null, 60, 64, 67, 72, 71, 67, 64, null],
		[64, 67, 71, 69, 66, null, 62, 66, 69, 74, 73, 69, 66, 62, 64, null],
		[57, 60, 64, 69, 67, 64, 62, null, 57, 60, 64, 72, 71, 67, 64, 62],
	];
	const EVENTS = {
		jump: ["triangle", 210, 480, 0.12, 0.13],
		land: ["noise", 240, 100, 0.075, 0.09],
		step: ["noise", 380, 180, 0.035, 0.035],
		climb: ["sine", 470, 400, 0.055, 0.07],
		chop: ["noise", 1600, 380, 0.1, 0.13],
		swing: ["noise", 1800, 450, 0.11, 0.13],
		redirect: ["triangle", 260, 1040, 0.16, 0.2],
		rockHit: ["triangle", 510, 180, 0.12, 0.2],
		strike: ["triangle", 820, 330, 0.1, 0.18],
		shatter: ["noise", 1700, 240, 0.24, 0.2],
		rockBreak: ["noise", 1700, 240, 0.24, 0.2],
		collision: ["noise", 1250, 160, 0.29, 0.23],
		chain: ["triangle", 660, 1320, 0.23, 0.15],
		toolWear: ["sine", 1550, 1140, 0.08, 0.11],
		wear: ["sine", 1550, 1140, 0.08, 0.11],
		toolBreak: ["noise", 2100, 110, 0.34, 0.22],
		break: ["noise", 2100, 110, 0.34, 0.22],
		pick: ["triangle", 523, 1047, 0.2, 0.19],
		pickCollect: ["triangle", 523, 1047, 0.2, 0.19],
		pickup: ["triangle", 880, 1760, 0.14, 0.14],
		key: ["sine", 784, 1568, 0.32, 0.22],
		keyCollect: ["sine", 784, 1568, 0.32, 0.22],
		keySpawn: ["triangle", 659, 1319, 0.3, 0.15],
		pickSpawn: ["triangle", 587, 294, 0.26, 0.14],
		supply: ["triangle", 587, 294, 0.26, 0.14],
		gold: ["sine", 1174, 1760, 0.14, 0.15],
		evade: ["triangle", 880, 1109, 0.065, 0.07],
		hurt: ["sawtooth", 290, 85, 0.25, 0.16],
		down: ["triangle", 392, 98, 0.5, 0.2],
		knockout: ["triangle", 392, 98, 0.5, 0.2],
		revive: ["sine", 392, 784, 0.38, 0.18],
		rescue: ["sine", 392, 784, 0.38, 0.18],
		door: ["noise", 480, 120, 0.45, 0.22],
		unlock: ["noise", 480, 120, 0.45, 0.22],
		jam: ["triangle", 190, 95, 0.2, 0.23],
		warning: ["square", 420, 420, 0.13, 0.08],
		doorWarning: ["square", 420, 420, 0.13, 0.08],
		ladderWarning: ["sine", 1000, 800, 0.14, 0.1],
		ladder: ["sine", 500, 660, 0.12, 0.06],
		ladderForm: ["sine", 500, 660, 0.12, 0.06],
		expire: ["triangle", 740, 185, 0.22, 0.12],
		focus: ["sine", 660, 700, 0.035, 0.07],
		accept: ["triangle", 660, 990, 0.095, 0.11],
		pause: ["triangle", 440, 220, 0.11, 0.1],
		wave: ["square", 160, 320, 0.45, 0.12],
		heavy: ["sine", 90, 52, 0.38, 0.21],
		bounce: ["triangle", 680, 240, 0.19, 0.13],
		normal: ["noise", 650, 230, 0.14, 0.12],
	};
	const SPEAK = {
		toolBreak: ["Ba-donk! PICK BROKE!", [280, 220, 340, 165]],
		break: ["Ba-donk! PICK BROKE!", [280, 220, 340, 165]],
		keyCollect: ["Yip-yip! KEY CAUGHT!", [340, 440, 370, 550]],
		key: ["Yip-yip! KEY CAUGHT!", [340, 440, 370, 550]],
		pickCollect: ["Dabba-doo! FRESH PICK!", [270, 380, 330]],
		pick: ["Dabba-doo! FRESH PICK!", [270, 380, 330]],
		hurt: ["Oof-a-loo!", [300, 210, 155]],
		jam: ["Er-bur! NEED A KEY!", [200, 240, 170]],
		rescue: ["Bim-bam! BACK TO WORK!", [280, 350, 410]],
		revive: ["Bim-bam! BACK TO WORK!", [280, 350, 410]],
		victory: ["Yabba-gold! PAYDAY!", [330, 440, 550, 660]],
		win: ["Yabba-gold! PAYDAY!", [330, 440, 550, 660]],
		defeat: ["Wubba… NEXT TIME!", [330, 270, 220, 165]],
		lose: ["Wubba… NEXT TIME!", [330, 270, 220, 165]],
	};
	function createNoise(c) {
		const buffer = c.createBuffer(
			1,
			Math.ceil(c.sampleRate * 0.75),
			c.sampleRate,
		);
		const data = buffer.getChannelData(0);
		let state = 0x7a731;
		for (let i = 0; i < data.length; i++) {
			state ^= state << 13;
			state ^= state >>> 17;
			state ^= state << 5;
			data[i] = ((state >>> 0) / 4294967296) * 2 - 1;
		}
		return buffer;
	}
	function voice(c, bus, at, spec, noise, tracking) {
		const [wave, frequency, to, duration, volume] = spec;
		const gain = c.createGain();
		gain.gain.setValueAtTime(0.00001, at);
		gain.gain.linearRampToValueAtTime(Math.max(0.00001, volume), at + 0.004);
		gain.gain.exponentialRampToValueAtTime(
			0.00001,
			at + Math.max(0.012, duration),
		);
		let source;
		if (wave === "noise") {
			source = c.createBufferSource();
			source.buffer = noise;
			source.loop = true;
			const filter = c.createBiquadFilter();
			filter.type = "bandpass";
			filter.Q.value = 0.75;
			filter.frequency.setValueAtTime(frequency, at);
			filter.frequency.exponentialRampToValueAtTime(
				Math.max(30, to || frequency),
				at + duration,
			);
			source.connect(filter);
			filter.connect(gain);
		} else {
			source = c.createOscillator();
			source.type = wave;
			source.frequency.setValueAtTime(Math.max(25, frequency), at);
			if (to && to !== frequency)
				source.frequency.exponentialRampToValueAtTime(
					Math.max(25, to),
					at + duration,
				);
			source.connect(gain);
		}
		gain.connect(bus);
		source.start(at);
		source.stop(at + duration + 0.015);
		const entry = { source, gain, end: at + duration + 0.02 };
		tracking?.add(entry);
		source.onended = () => {
			tracking?.delete(entry);
			try {
				source.disconnect();
				gain.disconnect();
			} catch {}
		};
		return entry;
	}
	function syllable(c, bus, at, frequency, duration, noise, tracking) {
		const carrier = c.createOscillator(),
			formant = c.createBiquadFilter(),
			envelope = c.createGain();
		carrier.type = "sawtooth";
		carrier.frequency.setValueAtTime(frequency, at);
		carrier.frequency.exponentialRampToValueAtTime(
			frequency * 1.13,
			at + duration * 0.5,
		);
		carrier.frequency.exponentialRampToValueAtTime(
			frequency * 0.86,
			at + duration,
		);
		formant.type = "bandpass";
		formant.frequency.setValueAtTime(900 + frequency * 2, at);
		formant.Q.value = 3;
		formant.frequency.exponentialRampToValueAtTime(
			550 + frequency,
			at + duration,
		);
		envelope.gain.setValueAtTime(0.00001, at);
		envelope.gain.linearRampToValueAtTime(0.23, at + 0.012);
		envelope.gain.exponentialRampToValueAtTime(0.00001, at + duration);
		carrier.connect(formant);
		formant.connect(envelope);
		envelope.connect(bus);
		carrier.start(at);
		carrier.stop(at + duration + 0.01);
		const entry = {
			source: carrier,
			gain: envelope,
			end: at + duration + 0.02,
		};
		tracking?.add(entry);
		carrier.onended = () => {
			tracking?.delete(entry);
			try {
				carrier.disconnect();
				formant.disconnect();
				envelope.disconnect();
			} catch {}
		};
		voice(
			c,
			bus,
			at + 0.003,
			["noise", 2400, 800, 0.025, 0.035],
			noise,
			tracking,
		);
	}
	PP.Audio = class {
		constructor(settings = {}, game = null) {
			this.game = game;
			this.settings = {
				music: 0.1,
				sfx: 0.8,
				voice: 0.65,
				mute: false,
				...settings,
			};
			this.ctx = null;
			this.buses = null;
			this.master = null;
			this.disposed = false;
			this.paused = false;
			this.unlocked = false;
			this.nodes = new Set();
			this.handles = new Set();
			this.seen = new Set();
			this.seenQueue = [];
			this.noteIndex = 0;
			this.nextNote = 0;
			this.chamber = 0;
			this.counts = { music: 0, sfx: 0, voice: 0 };
			this._eventTimes = new Map();
			this.caption = null;
			this._lastStep = -1;
			this._lastClimb = -1;
			this._finished = false;
			this._settingsVersion = "";
			this.set(this.settings);
		}
		async unlock() {
			if (this.disposed) return false;
			if (!this.ctx) {
				const native = this.game?.audio;
				if (native) {
					native.musicVolume = this._volume("music", 0.1);
					native.sfxVolume = this._volume("sfx", 0.8);
					native.voiceVolume = this._volume("voice", 0.65);
					this.master = native.bus("master");
					this.ctx = native.ctx;
					if (!this.ctx) return false;
					this.buses = {
						music: native.bus("music"),
						sfx: native.bus("sfx"),
						voice: native.bus("voice"),
					};
					this.native = native;
					native.define("puddles-chop", {
						wave: "noise",
						freq: 1600,
						to: 380,
						dur: 0.1,
						vol: 0.13,
					});
					native.define("puddles-redirect", {
						wave: "triangle",
						freq: 260,
						to: 1040,
						dur: 0.16,
						vol: 0.2,
					});
					native.instrument(
						"puddles-mallet",
						(ctx, bus, time, freq, dur, vol) =>
							voice(
								ctx,
								bus,
								time,
								["triangle", freq, freq * 0.995, dur, vol],
								this.noise,
								this.nodes,
							),
					);
				} else {
					const AudioContext = window.AudioContext || window.webkitAudioContext;
					if (!AudioContext) return false;
					try {
						this.ctx = new AudioContext();
					} catch {
						return false;
					}
					this._ownsContext = true;
					this.master = this.ctx.createGain();
					this.master.connect(this.ctx.destination);
					this.buses = {};
					for (const name of ["music", "sfx", "voice"]) {
						this.buses[name] = this.ctx.createGain();
						this.buses[name].connect(this.master);
					}
				}
				this.noise = createNoise(this.ctx);
				this.analyser = this.ctx.createAnalyser();
				this.analyser.fftSize = 1024;
				this.master.connect(this.analyser);
				this.nextNote = this.ctx.currentTime + 0.02;
				this._apply();
			}
			try {
				if (this.ctx.state === "suspended") await this.ctx.resume();
			} catch {
				return false;
			}
			this.unlocked = this.ctx.state === "running";
			return this.unlocked;
		}
		_volume(name, fallback) {
			let value = this.settings[name + "Volume"] ?? this.settings[name];
			if (value == null) value = fallback;
			value = Number(value);
			return clamp(
				Number.isFinite(value) ? (value > 1 ? value / 100 : value) : fallback,
			);
		}
		set(settings = {}) {
			Object.assign(this.settings, settings);
			this._apply();
		}
		_apply() {
			if (!this.ctx || !this.buses) return;
			const mute = !!(this.settings.mute || this.settings.muted);
			if (this.native) {
				this.native.volume = 0.7;
				this.native.musicVolume = this._volume("music", 0.1);
				this.native.sfxVolume = this._volume("sfx", 0.8);
				this.native.voiceVolume = this._volume("voice", 0.65);
				this.native.muted = mute || this.disposed;
				this.native.duck(this.paused);
				this.native.applyVolume();
			} else {
				this.master.gain.value = mute || this.disposed ? 0 : 0.7;
				this.buses.music.gain.value =
					this._volume("music", 0.1) * (this.paused ? 0.35 : 1);
				this.buses.sfx.gain.value = this._volume("sfx", 0.8);
				this.buses.voice.gain.value = this._volume("voice", 0.65);
			}
		}
		_play(bus, spec, at = this.ctx?.currentTime + 0.005) {
			if (
				!this.ctx ||
				!this.buses ||
				this.disposed ||
				this.ctx.state !== "running"
			)
				return;
			voice(this.ctx, this.buses[bus], at, spec, this.noise, this.nodes);
			this.counts[bus]++;
		}
		event(evt) {
			if (this.disposed || !evt) return;
			const rawType = typeof evt === "string" ? evt : evt.type;
			const aliases = {
				keyRise: "keySpawn",
				pickFall: "pickSpawn",
				goldCollect: "gold",
				keyExpired: "expire",
				supplyWarning: "warning",
				redirectSwing: "swing",
				chopHit: "rockHit",
				heavyCrack: "heavy",
				heavyClang: "heavy",
				doorRescue: "rescue",
				recovery: "revive",
			};
			const type = rawType === "rock" ? evt.kind : aliases[rawType] || rawType;
			const id = typeof evt === "object" ? evt.id : null;
			if (id != null) {
				if (this.seen.has(id)) return;
				this.seen.add(id);
				this.seenQueue.push(id);
				if (this.seenQueue.length > 2048)
					this.seen.delete(this.seenQueue.shift());
			}
			if (type === "victory" || type === "win") this._sting(true);
			else if (type === "defeat" || type === "lose" || type === "wipe")
				this._sting(false);
			const spec = EVENTS[type];
			if (spec && this.ctx) {
				const last = this._eventTimes.get(type) ?? -99;
				if (this.ctx.currentTime - last > 0.035) {
					this._eventTimes.set(type, this.ctx.currentTime);
					this._play("sfx", spec);
					if (
						type === "collision" ||
						type === "shatter" ||
						type === "rockBreak"
					)
						this._play("sfx", ["sine", 130, 42, 0.19, 0.15]);
					if (type === "heavy")
						this._play("sfx", ["noise", 220, 80, 0.22, 0.1]);
				}
			}
			const speech = SPEAK[type];
			if (speech) this.say(speech[0], speech[1]);
		}
		say(text, pitches = [270, 360, 300]) {
			this.caption = { text, until: (this.ctx?.currentTime || 0) + 2.2 };
			if (
				!this.ctx ||
				this.disposed ||
				this.paused ||
				this.ctx.state !== "running" ||
				this._volume("voice", 0.65) <= 0
			)
				return;
			const now = this.ctx.currentTime;
			if (now < (this._nextSpeech || 0)) return;
			this._nextSpeech = now + 0.65;
			for (const [i, frequency] of pitches.entries()) {
				syllable(
					this.ctx,
					this.buses.voice,
					now + 0.008 + i * 0.085,
					frequency,
					0.065 + (i % 2) * 0.025,
					this.noise,
					this.nodes,
				);
			}
			this.counts.voice += pitches.length;
		}
		_sting(won) {
			if (!this.ctx || this.disposed) return;
			const notes = won ? [60, 64, 67, 72, 76, 79, 84] : [64, 62, 59, 55, 48];
			const now = this.ctx.currentTime + 0.01;
			for (const [i, note] of notes.entries()) {
				this._play(
					"sfx",
					["triangle", midi(note), midi(note), won ? 0.27 : 0.4, 0.19],
					now + i * (won ? 0.09 : 0.14),
				);
			}
			this.nextNote = now + 1.35;
		}
		update(dt, sim) {
			if (this.disposed) return;
			if (sim?.events) for (const evt of sim.events) this.event(evt);
			if (sim?.room)
				this.chamber = clamp(Number(sim.room.index ?? sim.chamber) || 0, 0, 2);
			if (sim?.completed && !this._finished) {
				this._finished = true;
				const type = sim.completed.won ? "victory" : "defeat";
				if (!sim.events?.some((e) => e.type === type)) this.event(type);
			} else if (!sim?.completed) this._finished = false;
			if (!this.ctx || !this.unlocked || this.ctx.state !== "running") return;
			if (this.caption && this.ctx.currentTime > this.caption.until)
				this.caption = null;
			const miner = sim?.miners?.find((m) => !m.downed),
				hero = miner?.hero;
			const tick = Math.floor((sim?.time || 0) * 5);
			if (
				!this.paused &&
				hero &&
				tick !== this._lastStep &&
				hero.onGround &&
				Math.abs(hero.vx || 0) > 5
			) {
				this._lastStep = tick;
				this.event("step");
			}
			const climbTick = Math.floor((sim?.time || 0) * 4);
			if (
				!this.paused &&
				hero &&
				climbTick !== this._lastClimb &&
				(hero.climbing || hero.onLadder) &&
				Math.abs(hero.vz || 0) > 2
			) {
				this._lastClimb = climbTick;
				this.event("climb");
			}
			if (this.paused || sim?.completed) {
				this.nextNote = this.ctx.currentTime + 0.05;
				return;
			}
			const pressure = clamp(
				Number(sim?.pressure ?? sim?.director?.pressure ?? 0),
			);
			const finale =
				this.chamber === 2 &&
				(sim?.wave > 0 ||
					sim?.director?.wave > 0 ||
					(sim?.chamberTime || 0) > 30);
			const bpm = (finale ? 126 : 104 + this.chamber * 7) + pressure * 9;
			const step = 60 / bpm / 2;
			if (this.nextNote < this.ctx.currentTime - 0.2)
				this.nextNote = this.ctx.currentTime + 0.01;
			let count = 0;
			while (this.nextNote < this.ctx.currentTime + 0.14 && count++ < 6) {
				const i = this.noteIndex++ % 32,
					theme = THEMES[this.chamber];
				const n = theme[i % theme.length];
				const at = this.nextNote;
				if (n != null) {
					this._play(
						"music",
						[
							"triangle",
							midi(n + (i > 15 ? 12 : 0)),
							midi(n + (i > 15 ? 12 : 0)) * 0.998,
							step * 0.84,
							0.26,
						],
						at,
					);
					this._play(
						"music",
						["sine", midi(n + 12), midi(n + 12), step * 0.55, 0.065],
						at + 0.012,
					);
				}
				if (i % 4 === 0) {
					const bass = [48, 48, 43, 45, 48, 48, 43, 43][Math.floor(i / 4)];
					this._play(
						"music",
						[
							"triangle",
							midi(bass - this.chamber * 2),
							midi(bass - this.chamber * 2),
							step * 1.8,
							0.21,
						],
						at,
					);
					this._play("music", ["sine", 95, 42, 0.1, 0.16], at);
				}
				if (i % 4 === 2)
					this._play("music", ["noise", 2300, 900, 0.06, 0.05], at);
				if (pressure > 0.3 || finale)
					this._play(
						"music",
						["noise", 6100, 4200, 0.025, 0.025 + pressure * 0.02],
						at,
					);
				if (finale && i % 8 === 0)
					this._play(
						"music",
						["square", midi(57), midi(57), step * 2.5, 0.035],
						at,
					);
				this.nextNote += step;
			}
		}
		reset() {
			this.seen.clear();
			this.seenQueue.length = 0;
			this._eventTimes.clear();
			this.noteIndex = 0;
			this._finished = false;
			this._nextSpeech = 0;
			this.caption = null;
			this._lastStep = this._lastClimb = -1;
			if (this.ctx) {
				for (const node of this.nodes) {
					try {
						node.source.stop();
						node.gain.disconnect();
					} catch {}
				}
				this.nodes.clear();
				this.nextNote = this.ctx.currentTime + 0.03;
			}
		}
		pause(on = true) {
			this.paused = !!on;
			this._apply();
			if (on) {
				for (const node of this.nodes) {
					try {
						node.gain.gain.cancelScheduledValues(this.ctx.currentTime);
						node.gain.gain.setTargetAtTime(0.00001, this.ctx.currentTime, 0.02);
						node.source.stop(this.ctx.currentTime + 0.08);
					} catch {}
				}
			}
			if (this.ctx) this.nextNote = this.ctx.currentTime + 0.04;
		}
		diagnostics() {
			let energy = 0;
			if (this.analyser) {
				const samples = new Float32Array(this.analyser.fftSize);
				this.analyser.getFloatTimeDomainData(samples);
				energy = samples.reduce((sum, x) => sum + x * x, 0) / samples.length;
			}
			return {
				unlocked: this.unlocked,
				disposed: this.disposed,
				state: this.ctx?.state || "locked",
				gains: {
					music: this.buses?.music?.gain.value ?? this._volume("music", 0.1),
					sfx: this.buses?.sfx?.gain.value ?? this._volume("sfx", 0.8),
					voice: this.buses?.voice?.gain.value ?? this._volume("voice", 0.65),
					master: this.master?.gain.value ?? 0,
				},
				counts: { ...this.counts },
				nodes: this.nodes.size,
				energy,
				caption: this.caption?.text || null,
				native: !!this.native,
			};
		}
		dispose() {
			if (this.disposed) return;
			this.disposed = true;
			this.unlocked = false;
			this.native?.stopMusic(0);
			this.native?.mute(true);
			for (const node of this.nodes) {
				try {
					node.source.stop();
					node.source.disconnect();
					node.gain.disconnect();
				} catch {}
			}
			this.nodes.clear();
			for (const handle of this.handles) handle.stop?.(0);
			this.handles.clear();
			if (this.master) this.master.gain.value = 0;
			this.analyser?.disconnect();
			if (this._ownsContext) this.ctx?.close().catch(() => {});
			this.caption = null;
		}
		static async offlineProbe({
			mute = false,
			music = 0.1,
			sfx = 0.8,
			voice: voiceVolume = 0.65,
		} = {}) {
			const Offline =
				window.OfflineAudioContext || window.webkitOfflineAudioContext;
			if (!Offline) return { supported: false };
			const c = new Offline(1, 44100 * 2, 44100),
				noise = createNoise(c);
			const master = c.createGain();
			master.gain.value = mute ? 0 : 0.7;
			master.connect(c.destination);
			const buses = {};
			for (const [name, level] of [
				["music", music],
				["sfx", sfx],
				["voice", voiceVolume],
			]) {
				buses[name] = c.createGain();
				buses[name].gain.value = level;
				buses[name].connect(master);
			}
			for (const [i, n] of [60, 64, 67, 72].entries()) {
				voice(
					c,
					buses.music,
					0.01 + i * 0.12,
					["triangle", midi(n), midi(n), 0.18, 0.24],
					noise,
				);
			}
			voice(c, buses.sfx, 0.65, EVENTS.collision, noise);
			voice(c, buses.sfx, 0.9, EVENTS.keyCollect, noise);
			for (const [i, f] of [280, 380, 330].entries()) {
				syllable(c, buses.voice, 1.35 + i * 0.09, f, 0.075, noise);
			}
			const rendered = await c.startRendering(),
				samples = rendered.getChannelData(0);
			const measure = (start, end) => {
				const slice = samples.subarray(
					Math.floor(start * c.sampleRate),
					Math.floor(end * c.sampleRate),
				);
				let sum = 0,
					peak = 0;
				for (const x of slice) {
					sum += x * x;
					peak = Math.max(peak, Math.abs(x));
				}
				return { energy: sum / slice.length, peak };
			};
			return {
				supported: true,
				gain: { music, sfx, voice: voiceVolume },
				music: measure(0, 0.6),
				sfx: measure(0.65, 1.15),
				voice: measure(1.3, 1.8),
				total: measure(0, 2),
				samples: samples.length,
			};
		}
	};
})();
