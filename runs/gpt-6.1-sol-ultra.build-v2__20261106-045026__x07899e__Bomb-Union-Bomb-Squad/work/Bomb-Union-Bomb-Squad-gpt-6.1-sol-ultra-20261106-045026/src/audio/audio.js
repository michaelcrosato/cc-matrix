((root) => {
	root.BU = root.BU || {};
	const B = root.BU;
	const clamp = (n) => Math.min(1, Math.max(0, Number.isFinite(+n) ? +n : 0));
	const FX = {
		cut: [
			{
				wave: "noise",
				freq: 3800,
				to: 1500,
				dur: 0.065,
				vol: 0.13,
				attack: 0.001,
			},
			{
				wave: "square",
				freq: 210,
				to: 80,
				dur: 0.045,
				vol: 0.07,
				attack: 0.001,
			},
		],
		grip: [
			{ wave: "triangle", freq: 900, to: 380, dur: 0.07, vol: 0.14 },
			{ wave: "noise", freq: 2600, dur: 0.035, vol: 0.045, delay: 0.04 },
		],
		pick: [{ wave: "triangle", freq: 500, to: 820, dur: 0.08, vol: 0.1 }],
		place: [
			{ wave: "triangle", freq: 360, to: 140, dur: 0.08, vol: 0.15 },
			{ wave: "sine", freq: 1100, to: 740, dur: 0.13, vol: 0.08, delay: 0.035 },
		],
		solder: [
			{
				wave: "noise",
				freq: 5200,
				to: 1800,
				dur: 0.18,
				vol: 0.08,
				attack: 0.025,
			},
			{ wave: "sine", freq: 1320, to: 1568, dur: 0.12, vol: 0.08, delay: 0.09 },
		],
		"test-pass": [
			{ wave: "sine", freq: 660, dur: 0.09, vol: 0.12 },
			{ wave: "sine", freq: 990, dur: 0.17, vol: 0.12, delay: 0.11 },
		],
		"test-fail": [
			{ wave: "triangle", freq: 235, to: 200, dur: 0.15, vol: 0.15 },
			{ wave: "triangle", freq: 196, dur: 0.19, vol: 0.12, delay: 0.17 },
		],
		foam: [
			{
				wave: "noise",
				freq: 3800,
				to: 800,
				dur: 0.35,
				vol: 0.13,
				attack: 0.035,
			},
		],
		recovery: [
			{ wave: "triangle", freq: 392, dur: 0.14, vol: 0.16 },
			{ wave: "triangle", freq: 311, dur: 0.17, vol: 0.16, delay: 0.15 },
			{ wave: "noise", freq: 1000, dur: 0.06, vol: 0.04 },
		],
		fire: [
			{ wave: "noise", freq: 500, to: 1300, dur: 0.35, vol: 0.13 },
			{ wave: "sine", freq: 880, dur: 0.12, vol: 0.1, delay: 0.05 },
			{ wave: "sine", freq: 660, dur: 0.12, vol: 0.1, delay: 0.22 },
		],
		evidence: [
			{ wave: "sine", freq: 587.33, dur: 0.17, vol: 0.12 },
			{ wave: "sine", freq: 880, dur: 0.18, vol: 0.1, delay: 0.1 },
			{ wave: "sine", freq: 1174.66, dur: 0.24, vol: 0.1, delay: 0.2 },
		],
		disarm: [
			{ wave: "sine", freq: 293.66, dur: 0.45, vol: 0.14 },
			{ wave: "triangle", freq: 440, dur: 0.48, vol: 0.1, delay: 0.1 },
			{ wave: "sine", freq: 587.33, dur: 0.6, vol: 0.14, delay: 0.22 },
			{ wave: "sine", freq: 880, dur: 0.8, vol: 0.09, delay: 0.35 },
		],
		failure: [
			{ wave: "noise", freq: 180, to: 45, dur: 0.7, vol: 0.14, attack: 0.025 },
			{ wave: "sine", freq: 85, to: 30, dur: 0.8, vol: 0.19 },
			{
				wave: "triangle",
				freq: 293.66,
				to: 146.83,
				dur: 0.3,
				vol: 0.1,
				delay: 0.45,
			},
		],
		radio: [
			{ wave: "sine", freq: 1850, dur: 0.025, vol: 0.065 },
			{ wave: "sine", freq: 2350, dur: 0.025, vol: 0.05, delay: 0.045 },
			{ wave: "noise", freq: 3000, dur: 0.04, vol: 0.025, delay: 0.075 },
		],
		tick: [
			{ wave: "sine", freq: 420, to: 140, dur: 0.045, vol: 0.1 },
			{ wave: "noise", freq: 3800, dur: 0.015, vol: 0.025 },
		],
		sirens: [
			{ wave: "sine", freq: 540, to: 720, dur: 0.7, vol: 0.025, attack: 0.25 },
			{
				wave: "sine",
				freq: 720,
				to: 540,
				dur: 0.7,
				vol: 0.025,
				attack: 0.25,
				delay: 0.7,
			},
		],
		select: [{ wave: "sine", freq: 780, to: 1040, dur: 0.045, vol: 0.035 }],
		ambience: [
			{ wave: "noise", freq: 170, to: 240, dur: 1, vol: 0.025, attack: 0.1 },
		],
	};
	const INVESTIGATION = {
		bpm: 72,
		steps: 2,
		sync: true,
		tracks: [
			{
				name: "glass",
				wave: "bu-glass",
				vol: 0.15,
				notes:
					"D5 . . . A4 . . . | C5 . . . E5 . . . | D5 . . . G4 . . . | A4 . . . . . . .",
			},
			{
				name: "bass",
				wave: "triangle",
				vol: 0.14,
				notes:
					"D3 - . . . . A2 . | C3 - . . . . E3 . | Bb2 - . . . . F3 . | A2 - . . . . . .",
			},
			{
				name: "urgent",
				wave: "bu-click",
				vol: 0.1,
				on: false,
				notes:
					"D4 . A4 . D4 . A4 . | C4 . G4 . C4 . G4 . | Bb3 . F4 . Bb3 . F4 . | A3 . E4 . A3 . E4 .",
			},
		],
	};
	const SUCCESS = {
		bpm: 92,
		steps: 2,
		sync: true,
		loop: false,
		tracks: [
			{
				wave: "bu-glass",
				vol: 0.18,
				notes:
					"D5 . F#5 . A5 . . . | G5 . F#5 E5 D5 - - - | A4 . D5 . F#5 . A5 . | D6 - - - . . . .",
			},
			{
				wave: "triangle",
				vol: 0.15,
				notes:
					"D3 . A3 . D4 . . . | G3 . A3 . D3 - . . | D3 . A3 . D4 . . . | D3 - - - . . . .",
			},
		],
	};
	const FAILURE = {
		bpm: 64,
		steps: 2,
		sync: true,
		loop: false,
		tracks: [
			{
				wave: "bu-glass",
				vol: 0.15,
				notes: "D5 - C5 . A4 - . . | G4 . F4 . E4 - - - | D4 - - - . . . .",
			},
			{
				wave: "triangle",
				vol: 0.15,
				notes: "D3 - . . A2 - . . | Bb2 - . . A2 - . . | D2 - - - . . . .",
			},
		],
	};
	function tonal(ctx, bus, at, freq, dur, vol, type = "sine", to = 0) {
		const o = ctx.createOscillator(),
			g = ctx.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, at);
		if (to)
			o.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + dur);
		g.gain.setValueAtTime(0, at);
		g.gain.linearRampToValueAtTime(vol, at + 0.008);
		g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
		o.connect(g);
		g.connect(bus);
		o.start(at);
		o.stop(at + dur + 0.03);
		return o;
	}
	function glass(ctx, bus, at, freq, dur, vol) {
		// Two soft partials and a short filtered transient, all code synthesized.
		const sources = [
			tonal(ctx, bus, at, freq, dur * 0.95, vol * 0.7, "sine"),
			tonal(ctx, bus, at, freq * 2.005, dur * 0.43, vol * 0.14, "sine"),
		];
		return sources;
	}
	function syllable(ctx, bus, at, pitch, dur, level, tick, seed) {
		const source = ctx.createOscillator(),
			gain = ctx.createGain(),
			f1 = ctx.createBiquadFilter(),
			f2 = ctx.createBiquadFilter(),
			mix = ctx.createGain();
		source.type = tick ? "square" : "sawtooth";
		source.frequency.setValueAtTime(pitch, at);
		source.frequency.linearRampToValueAtTime(
			pitch * (tick ? 0.85 : 1.13),
			at + dur * 0.8,
		);
		f1.type = "bandpass";
		f1.frequency.value = (tick ? 490 : 880) + (seed % 5) * 110;
		f1.Q.value = 1.7;
		f2.type = "bandpass";
		f2.frequency.value = (tick ? 1350 : 2100) + (seed % 7) * 95;
		f2.Q.value = 2.1;
		mix.gain.value = 0.55;
		source.connect(f1);
		source.connect(f2);
		f1.connect(mix);
		f2.connect(mix);
		mix.connect(gain);
		gain.connect(bus);
		gain.gain.setValueAtTime(0, at);
		gain.gain.linearRampToValueAtTime(level, at + 0.012);
		gain.gain.setValueAtTime(level * 0.75, at + dur * 0.55);
		gain.gain.linearRampToValueAtTime(0, at + dur);
		source.start(at);
		source.stop(at + dur + 0.015);
		return source;
	}
	class Audio {
		constructor(game) {
			this.game = game;
			this.native = game.audio;
			this.activated = false;
			this.paused = false;
			this.disposed = false;
			this.theme = "investigation";
			this.urgent = false;
			this.handles = [];
			this.sources = new Set();
			this.queue = [];
			this.voiceIds = new Set();
			this.voiceUntil = 0;
			this.voicePriority = 0;
			this.tickTime = 0;
			this.ambientTime = 0;
			this.lastCue = null;
			this.currentState = null;
			this.native.musicVolume = Number.isFinite(game.settings?.music)
				? clamp(game.settings.music)
				: 0.1;
			// Settings are applied before the presentation is constructed. Preserve
			// both authored defaults and persisted independent mute/level choices.
			this.native.sfxVolume = Number.isFinite(game.settings?.effects)
				? clamp(game.settings.effects)
				: this.native.sfxVolume;
			this.native.voiceVolume = Number.isFinite(game.settings?.voice)
				? clamp(game.settings.voice)
				: this.native.voiceVolume;
			this.native.applyVolume();
			this.native.instrument("bu-glass", glass);
			this.native.instrument("bu-click", (ctx, bus, at, freq, _dur, vol) =>
				tonal(ctx, bus, at, freq, 0.06, vol * 0.7, "triangle", freq * 0.9),
			);
			for (const [name, voices] of Object.entries(FX))
				this.native.define(`bu-${name}`, voices);
			// Override the native default as well as the graph, so reset and a new
			// browser profile agree. Existing user choices are loaded by the engine.
			if (game.settings?.define) {
				game.settings.define({
					key: "music",
					label: "Music",
					group: "Sound",
					type: "slider",
					value: 0.1,
					min: 0,
					max: 1,
					step: 0.05,
					apply: (g, value) => {
						g.audio.musicVolume = value;
						g.audio.applyVolume();
					},
				});
				if (!game.settings.spec("voice"))
					game.settings.define({
						key: "voice",
						label: "Voice",
						group: "Sound",
						type: "slider",
						value: 1,
						min: 0,
						max: 1,
						step: 0.05,
						apply: (g, value) => {
							g.audio.voiceVolume = value;
							g.audio.applyVolume();
						},
					});
			}
		}
		async unlock() {
			if (this.disposed) return false;
			this.activated = true;
			const bus = this.native.bus("sfx");
			if (!bus || !this.native.ctx) return false;
			if (this.native.ctx.state === "suspended")
				await this.native.ctx.resume().catch(() => {});
			if (!this.paused && !this.native.song)
				this.music(this.theme, this.urgent);
			return this.native.ready;
		}
		set(values = {}) {
			if (values.music !== undefined)
				this.native.musicVolume = clamp(values.music);
			if (values.effects !== undefined)
				this.native.sfxVolume = clamp(values.effects);
			if (values.voice !== undefined)
				this.native.voiceVolume = clamp(values.voice);
			if (values.volume !== undefined)
				this.native.volume = clamp(values.volume);
			if (values.muted !== undefined) this.native.muted = !!values.muted;
			this.native.applyVolume();
		}
		effect(name) {
			if (this.disposed || this.paused || !this.activated) return null;
			let cue = name;
			if (!FX[cue]) {
				if (/cut/.test(name)) cue = "cut";
				else if (/grip|remov/.test(name)) cue = "grip";
				else if (/pick|claim/.test(name)) cue = "pick";
				else if (/place|insert/.test(name)) cue = "place";
				else if (/solder|joint|restore/.test(name)) cue = "solder";
				else if (/complete|reveal|evidence|board-secured/.test(name))
					cue = "evidence";
				else if (/extinguish|foam/.test(name)) cue = "foam";
				else if (/fire/.test(name)) cue = "fire";
				else if (/wrong|recover|fault|penalty/.test(name)) cue = "recovery";
				else if (/test.*pass|continuity|tested/.test(name)) cue = "test-pass";
				else if (/test.*fail|failed/.test(name)) cue = "test-fail";
				else if (/won|win|disarm/.test(name)) cue = "disarm";
				else if (/lost|loss|expire/.test(name)) cue = "failure";
				else if (/order|repeat|taunt|radio/.test(name)) cue = "radio";
				else return null;
			}
			this.lastCue = cue;
			const h = this.native.sfx(`bu-${cue}`, { vary: 0 });
			this.handles.push(h);
			if (this.handles.length > 72)
				this.handles.splice(0, this.handles.length - 72);
			return h;
		}
		voice(who, text, priority = 1, id) {
			// Accept the early integration's caption-first call as a safe compatibility
			// path; the documented public signature remains speaker first.
			if (
				!["partner", "saboteur", "crew", "pip", "tick"].includes(who) &&
				["partner", "saboteur", "crew", "pip", "tick"].includes(text)
			) {
				const swap = text;
				text = who;
				who = swap;
			}
			if (this.disposed || !text) return;
			if (id !== undefined) {
				if (this.voiceIds.has(id)) return;
				this.voiceIds.add(id);
				if (this.voiceIds.size > 256)
					this.voiceIds.delete(this.voiceIds.values().next().value);
			}
			const item = {
				who: String(who),
				text: String(text),
				priority: +priority || 1,
				id,
			};
			if (this.queue.some((q) => q.text === item.text && q.who === item.who))
				return;
			const now = this.native.ctx?.currentTime || 0;
			if (item.priority > this.voicePriority && now < this.voiceUntil)
				this.stopVoice();
			if (item.priority >= 2)
				this.queue = this.queue.filter((q) => q.priority >= item.priority);
			this.queue.push(item);
			this.queue.sort((a, b) => b.priority - a.priority);
			if (this.queue.length > 4) this.queue.length = 4;
			this.flushVoice();
		}
		flushVoice() {
			const ctx = this.native.ctx;
			if (
				!ctx ||
				!this.activated ||
				this.paused ||
				this.disposed ||
				ctx.state !== "running" ||
				ctx.currentTime < this.voiceUntil ||
				!this.queue.length
			)
				return;
			const item = this.queue.shift(),
				tick = /saboteur|tick/i.test(item.who),
				text = item.text.replace(/\s/g, ""),
				count = Math.max(4, Math.min(15, Math.ceil(text.length / 5))),
				pace = tick ? 0.1 : 0.075;
			const at = ctx.currentTime + 0.02,
				bus = this.native.bus("voice");
			if (!bus) return;
			this.voicePriority = item.priority;
			this.voiceUntil = at + count * pace + 0.12;
			this.effect("radio");
			for (let i = 0; i < count; i++) {
				const seed = text.charCodeAt((i * 3) % text.length) || 65,
					pitch = (tick ? 165 : 365) * 2 ** (((seed % 9) - 4) / 18),
					dur = pace * (0.68 + (seed % 4) * 0.07);
				const src = syllable(
					ctx,
					bus,
					at + i * pace,
					pitch,
					dur,
					tick ? 0.1 : 0.12,
					tick,
					seed,
				);
				this.sources.add(src);
				src.onended = () => this.sources.delete(src);
			}
		}
		stopVoice() {
			const now = this.native.ctx?.currentTime || 0;
			for (const s of this.sources)
				try {
					s.stop(now + 0.01);
				} catch (_e) {}
			this.sources.clear();
			this.voiceUntil = 0;
			this.voicePriority = 0;
		}
		music(theme = "investigation", urgent = false) {
			this.theme = theme;
			this.urgent = !!urgent;
			if (this.disposed || this.paused || !this.activated) return;
			const song =
				theme === "success"
					? SUCCESS
					: theme === "failure"
						? FAILURE
						: INVESTIGATION;
			this.native.music(song, {
				sync: true,
				fade: 0.3,
				loop: theme !== "success" && theme !== "failure",
			});
			if (song === INVESTIGATION) {
				this.native.layer("urgent", urgent ? 1 : 0, 0.6);
				this.native.tempo(urgent ? 86 : 72);
			}
		}
		update(dt, state) {
			this.currentState = state;
			if (this.paused || this.disposed || !this.activated) return;
			this.flushVoice();
			if (state?.status === "active") {
				const urgent = state.remaining < Math.min(60, state.duration * 0.2);
				if (urgent !== this.urgent && this.theme === "investigation")
					this.music("investigation", urgent);
				this.tickTime -= Math.max(0, dt);
				if (this.tickTime <= 0) {
					this.effect("tick");
					this.tickTime = urgent ? 0.45 : 1.05;
				}
				this.ambientTime -= Math.max(0, dt);
				if (this.ambientTime <= 0) {
					this.effect("sirens");
					this.ambientTime = 20;
				}
			} else this.tickTime = 0.6;
		}
		suspend(on = true) {
			this.paused = !!on;
			if (on) {
				this.stopVoice();
				this.queue = [];
				for (const h of this.handles) h.stop?.(0.02);
				this.handles = [];
				this.native.stopMusic(0.03);
			} else if (this.activated) this.music(this.theme, this.urgent);
		}
		resume() {
			this.suspend(false);
		}
		snapshot() {
			const ctx = this.native.ctx;
			return {
				activated: this.activated,
				paused: this.paused,
				context: ctx?.state || "uninitialized",
				music: this.native.musicVolume,
				effects: this.native.sfxVolume,
				voice: this.native.voiceVolume,
				volume: this.native.volume,
				muted: this.native.muted,
				musicGain: this.native._musBus?.gain.value ?? this.native.musicVolume,
				effectsGain: this.native._sfxBus?.gain.value ?? this.native.sfxVolume,
				voiceGain: this.native._voiceBus?.gain.value ?? this.native.voiceVolume,
				pendingVoices: this.queue.length,
				liveVoiceSources: this.sources.size,
				lastCue: this.lastCue,
				theme: this.theme,
				urgent: this.urgent,
			};
		}
		dispose() {
			if (this.disposed) return;
			this.suspend(true);
			this.disposed = true;
			this.voiceIds.clear();
		}
		static renderProbe(ctx) {
			const master = ctx.createGain();
			master.gain.value = 0.7;
			master.connect(ctx.destination);
			const music = ctx.createGain(),
				effects = ctx.createGain(),
				voice = ctx.createGain();
			music.gain.value = 0.1;
			effects.gain.value = 1;
			voice.gain.value = 1;
			music.connect(master);
			effects.connect(master);
			voice.connect(master);
			glass(ctx, music, 0.05, 587.33, 0.6, 0.18);
			glass(ctx, music, 0.28, 880, 0.6, 0.16);
			tonal(ctx, effects, 0.5, 420, 0.08, 0.15, "triangle", 100);
			tonal(ctx, effects, 0.7, 660, 0.09, 0.12);
			tonal(ctx, effects, 0.82, 990, 0.17, 0.12);
			for (let i = 0; i < 6; i++)
				syllable(
					ctx,
					voice,
					1 + i * 0.08,
					365 * 2 ** (((i % 4) - 2) / 12),
					0.066,
					0.12,
					false,
					65 + i,
				);
			for (let i = 0; i < 6; i++)
				syllable(
					ctx,
					voice,
					1.7 + i * 0.1,
					165 * 2 ** (((i % 3) - 1) / 12),
					0.085,
					0.1,
					true,
					70 + i,
				);
			tonal(ctx, effects, 2.5, 293.66, 0.4, 0.14);
			tonal(ctx, effects, 2.65, 587.33, 0.5, 0.12);
			tonal(ctx, effects, 2.8, 880, 0.6, 0.09);
			return {
				music: music.gain.value,
				effects: effects.gain.value,
				voice: voice.gain.value,
			};
		}
	}
	Audio.FX = FX;
	Audio.SONGS = {
		investigation: INVESTIGATION,
		success: SUCCESS,
		failure: FAILURE,
	};
	B.Audio = Audio;
})(globalThis);
