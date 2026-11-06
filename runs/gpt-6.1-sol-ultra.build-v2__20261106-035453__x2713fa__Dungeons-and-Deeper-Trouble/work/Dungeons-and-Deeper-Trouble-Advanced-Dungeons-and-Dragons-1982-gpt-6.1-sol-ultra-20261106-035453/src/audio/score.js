/* Original expedition score and analytic Web Audio cues; no recorded media. */
(() => {
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const CUES = {
		shoot: [
			{ wave: "triangle", f: 640, to: 120, d: 0.17, v: 0.19 },
			{ wave: "noise", f: 1800, to: 700, d: 0.055, v: 0.1 },
		],
		bank: [
			{ wave: "sine", f: 1280, to: 1520, d: 0.29, v: 0.15 },
			{ wave: "triangle", f: 2560, to: 1900, d: 0.12, v: 0.035 },
		],
		hit: [
			{ wave: "noise", f: 950, to: 200, d: 0.16, v: 0.19 },
			{ wave: "sine", f: 135, to: 65, d: 0.15, v: 0.13 },
		],
		wound: [
			{ wave: "noise", f: 1100, to: 220, d: 0.2, v: 0.15 },
			{ wave: "triangle", f: 330, to: 160, d: 0.23, v: 0.13 },
		],
		hurt: [
			{ wave: "sawtooth", f: 170, to: 82, d: 0.25, v: 0.1 },
			{ wave: "noise", f: 450, to: 110, d: 0.17, v: 0.1 },
		],
		land: [
			{ wave: "noise", f: 1400, to: 500, d: 0.075, v: 0.09 },
			{ wave: "sine", f: 380, to: 210, d: 0.07, v: 0.08 },
		],
		pickup: [
			{ wave: "sine", f: 660, to: 880, d: 0.16, v: 0.14 },
			{ wave: "sine", f: 990, to: 1320, d: 0.18, v: 0.08, delay: 0.09 },
		],
		dry: [
			{ wave: "noise", f: 800, to: 300, d: 0.045, v: 0.1 },
			{ wave: "triangle", f: 155, to: 90, d: 0.07, v: 0.08 },
		],
		dash: [{ wave: "noise", f: 500, to: 1600, d: 0.18, v: 0.1 }],
		step: [{ wave: "noise", f: 400, to: 220, d: 0.055, v: 0.038 }],
		scratching: [
			{ wave: "noise", f: 1700, to: 1250, d: 0.08, v: 0.08 },
			{ wave: "noise", f: 1300, to: 1800, d: 0.08, v: 0.06, delay: 0.13 },
		],
		hiss: [{ wave: "noise", f: 2600, to: 1900, d: 0.45, v: 0.105 }],
		wings: [
			{ wave: "noise", f: 650, to: 250, d: 0.11, v: 0.1 },
			{ wave: "noise", f: 750, to: 270, d: 0.11, v: 0.09, delay: 0.13 },
			{ wave: "noise", f: 550, to: 180, d: 0.1, v: 0.07, delay: 0.27 },
		],
		skitter: [
			{ wave: "triangle", f: 1650, to: 900, d: 0.035, v: 0.055 },
			{ wave: "noise", f: 1300, to: 950, d: 0.05, v: 0.075, delay: 0.06 },
			{ wave: "triangle", f: 1450, to: 1100, d: 0.035, v: 0.045, delay: 0.13 },
		],
		ooze: [
			{ wave: "sine", f: 120, to: 49, d: 0.44, v: 0.13 },
			{ wave: "sine", f: 230, to: 68, d: 0.27, v: 0.075, delay: 0.08 },
		],
		snore: [
			{ wave: "sawtooth", f: 63, to: 91, d: 0.67, v: 0.055 },
			{ wave: "noise", f: 250, to: 450, d: 0.54, v: 0.075 },
		],
		bronze: [
			{ wave: "sine", f: 164.81, to: 163, d: 1.05, v: 0.15 },
			{ wave: "sine", f: 442, to: 437, d: 0.8, v: 0.07 },
			{ wave: "triangle", f: 647, to: 632, d: 0.64, v: 0.035 },
		],
		glass: [
			{ wave: "sine", f: 622.25, to: 619, d: 0.95, v: 0.12 },
			{ wave: "sine", f: 1046.5, to: 1038, d: 0.83, v: 0.045 },
			{ wave: "sine", f: 1661, to: 1650, d: 0.55, v: 0.025 },
		],
		breath: [
			{ wave: "noise", f: 370, to: 1800, d: 0.72, v: 0.17 },
			{ wave: "sine", f: 71, to: 45, d: 0.65, v: 0.12 },
		],
		gong: [
			{ wave: "sine", f: 220, to: 217, d: 1.2, v: 0.15 },
			{ wave: "sine", f: 577, to: 568, d: 1, v: 0.06 },
			{ wave: "sine", f: 1097, to: 1070, d: 0.6, v: 0.025 },
		],
		tool: [
			{ wave: "triangle", f: 440, to: 440, d: 0.22, v: 0.12 },
			{ wave: "sine", f: 660, to: 660, d: 0.3, v: 0.12, delay: 0.12 },
			{ wave: "sine", f: 880, to: 880, d: 0.5, v: 0.1, delay: 0.24 },
		],
		revive: [
			{ wave: "sine", f: 330, to: 440, d: 0.3, v: 0.1 },
			{ wave: "sine", f: 550, to: 660, d: 0.4, v: 0.1, delay: 0.15 },
		],
		defeat: [
			{ wave: "triangle", f: 220, to: 196, d: 0.5, v: 0.12 },
			{ wave: "triangle", f: 164, to: 146, d: 0.6, v: 0.1, delay: 0.3 },
			{ wave: "sine", f: 110, to: 82, d: 0.9, v: 0.12, delay: 0.6 },
		],
		quiver: [{ wave: "noise", f: 1800, to: 750, d: 0.04, v: 0.065 }],
		select: [{ wave: "sine", f: 480, to: 640, d: 0.065, v: 0.075 }],
		armor: [
			{ wave: "triangle", f: 1800, to: 1000, d: 0.13, v: 0.09 },
			{ wave: "noise", f: 2900, to: 1900, d: 0.065, v: 0.065 },
		],
	};
	const THEMES = {
		title: {
			bpm: 72,
			steps: 2,
			tracks: [
				{
					wave: "dt-lute",
					vol: 0.22,
					notes:
						"D4 . A4 . F4 . E4 . D4 . . . C4 . A3 . | D4 . A4 . C5 . A4 . F4 . E4 . D4 - . .",
				},
				{
					wave: "dt-air",
					vol: 0.13,
					notes:
						"D3 - - - . . A2 - C3 - - - A2 - . . | D3 - - - F3 - - - C3 - - - D3 - - -",
				},
			],
		},
		field: {
			bpm: 80,
			steps: 2,
			tracks: [
				{
					wave: "dt-lute",
					vol: 0.21,
					notes:
						"D4 . F4 . A4 . . . G4 . E4 . D4 . . . | A3 . D4 . F4 . A4 . G4 . E4 . D4 - . .",
				},
				{
					wave: "dt-air",
					vol: 0.12,
					notes:
						"D3 - - - . . A2 - C3 - - - . . A2 - | D3 - - - F3 - - - C3 - - - D3 - - -",
				},
			],
		},
		chalk: {
			bpm: 63,
			steps: 2,
			tracks: [
				{
					wave: "dt-lute",
					vol: 0.18,
					notes:
						"D4 . . . A3 . . . F4 . E4 . . . . . | D4 . A4 . . . . . C4 . . . A3 . . .",
				},
				{
					wave: "dt-air",
					vol: 0.12,
					notes: "D3 - - - . . . . A2 - - - . . . .",
				},
			],
		},
		root: {
			bpm: 68,
			steps: 2,
			tracks: [
				{
					wave: "dt-lute",
					vol: 0.16,
					notes:
						"E4 . . . G4 . . . B3 . . . D4 . . . | E4 . F#4 . . . . . G4 . . . E4 . . .",
				},
				{
					wave: "dt-air",
					vol: 0.1,
					notes: "E3 - - - . . . . B2 - - - . . . .",
				},
			],
		},
		tide: {
			bpm: 58,
			steps: 2,
			tracks: [
				{
					wave: "dt-lute",
					vol: 0.17,
					notes:
						"A3 . . . E4 . . . G4 . . . D4 . . . | C4 . . . A3 . . . E4 . D4 . . . . .",
				},
				{
					wave: "dt-air",
					vol: 0.13,
					notes: "A2 - - - . . . . E3 - - - . . . .",
				},
			],
		},
		guardian: {
			bpm: 92,
			steps: 2,
			tracks: [
				{
					wave: "dt-lute",
					vol: 0.2,
					notes:
						"D3 . A3 . D4 . F4 . E4 . C4 . A3 . . . | D3 . A3 . D4 . G4 . F4 . E4 . D4 . . .",
				},
				{
					wave: "dt-air",
					vol: 0.16,
					notes: "D2 - . . D2 - . . C2 - . . A1 - . .",
				},
				{
					name: "storm",
					on: false,
					wave: "dt-drum",
					vol: 0.19,
					notes: "D2 . . . D2 . . . D2 . . . A1 . . .",
				},
			],
		},
		victory: {
			bpm: 79,
			steps: 2,
			loop: false,
			tracks: [
				{
					wave: "dt-lute",
					vol: 0.24,
					notes:
						"D4 . F4 . A4 . D5 - C5 . A4 . G4 . F4 . | E4 . G4 . A4 . C5 - A4 . F4 . D4 - - -",
				},
				{
					wave: "dt-air",
					vol: 0.17,
					notes:
						"D3 - - - F3 - - - C3 - - - A2 - - - | C3 - - - A2 - - - D3 - - - - - - -",
				},
			],
		},
		defeat: {
			bpm: 57,
			steps: 2,
			loop: false,
			tracks: [
				{
					wave: "dt-lute",
					vol: 0.16,
					notes: "D4 - . . C4 - . . A3 - . . D3 - - -",
				},
				{
					wave: "dt-air",
					vol: 0.1,
					notes: "D2 - - - C2 - - - A1 - - - D2 - - -",
				},
			],
		},
	};
	function random(seed) {
		let a = seed >>> 0;
		return () => {
			a = (Math.imul(a, 1664525) + 1013904223) >>> 0;
			return a / 4294967296;
		};
	}
	function synthCue(
		ctx,
		destination,
		time,
		spec,
		pan = 0,
		seed = 91,
		track = null,
	) {
		const nodes = [],
			rnd = random(seed),
			t0 = Math.max(time, ctx.currentTime || 0);
		for (const p of spec) {
			const d = p.d || 0.2,
				t = t0 + (p.delay || 0),
				v = p.v ?? 0.12,
				gain = ctx.createGain();
			gain.gain.setValueAtTime(0.00001, t);
			gain.gain.linearRampToValueAtTime(v, t + Math.min(0.012, d * 0.12));
			gain.gain.exponentialRampToValueAtTime(0.00001, t + d);
			let source, filter;
			if (p.wave === "noise") {
				source = ctx.createBufferSource();
				const b = ctx.createBuffer(
						1,
						Math.ceil(ctx.sampleRate * d),
						ctx.sampleRate,
					),
					data = b.getChannelData(0);
				for (let i = 0; i < data.length; i++) data[i] = rnd() * 2 - 1;
				source.buffer = b;
				filter = ctx.createBiquadFilter();
				filter.type = "bandpass";
				filter.Q.value = 0.9;
				filter.frequency.setValueAtTime(p.f, t);
				filter.frequency.exponentialRampToValueAtTime(
					Math.max(20, p.to || p.f),
					t + d,
				);
				source.connect(filter);
				filter.connect(gain);
			} else {
				source = ctx.createOscillator();
				source.type = p.wave || "sine";
				source.frequency.setValueAtTime(p.f, t);
				source.frequency.exponentialRampToValueAtTime(
					Math.max(20, p.to || p.f),
					t + d,
				);
				source.connect(gain);
			}
			let tail = gain;
			if (ctx.createStereoPanner) {
				const stereo = ctx.createStereoPanner();
				stereo.pan.value = clamp(pan, -1, 1);
				gain.connect(stereo);
				tail = stereo;
				nodes.push(stereo);
			}
			tail.connect(destination);
			source.start(t);
			source.stop(t + d + 0.015);
			nodes.push(source, gain);
			if (filter) nodes.push(filter);
			if (track) {
				track.add(source);
				source.onended = () => {
					track.delete(source);
					try {
						gain.disconnect();
						if (filter) filter.disconnect();
						tail.disconnect();
					} catch {}
				};
			}
		}
		return nodes;
	}
	class ExpeditionAudio {
		constructor(game) {
			this.game = game;
			this.audio = game.audio;
			this.active = new Set();
			this.seen = new Set();
			this.theme = null;
			this.stopped = false;
			this.focus = false;
			this.eventsPlayed = 0;
			this.lastNotice = "";
			this.audio.instrument("dt-lute", (ctx, bus, t, f, d, v) =>
				synthCue(
					ctx,
					bus,
					t,
					[
						{
							wave: "triangle",
							f,
							to: f * 0.997,
							d: Math.max(0.08, d * 0.8),
							v: v * 0.8,
						},
						{
							wave: "sine",
							f: f * 2,
							to: f * 1.998,
							d: Math.max(0.06, d * 0.46),
							v: v * 0.14,
						},
					],
					0,
					41,
					this.active,
				),
			);
			this.audio.instrument("dt-air", (ctx, bus, t, f, d, v) =>
				synthCue(
					ctx,
					bus,
					t,
					[
						{
							wave: "sine",
							f,
							to: f * 1.002,
							d: Math.max(0.16, d * 0.94),
							v: v * 0.8,
						},
						{
							wave: "sine",
							f: f * 1.5,
							to: f * 1.498,
							d: Math.max(0.15, d * 0.89),
							v: v * 0.12,
						},
					],
					0,
					67,
					this.active,
				),
			);
			this.audio.instrument("dt-drum", (ctx, bus, t, _f, _d, v) =>
				synthCue(
					ctx,
					bus,
					t,
					[
						{ wave: "sine", f: 88, to: 42, d: 0.18, v: v * 0.9 },
						{ wave: "noise", f: 750, to: 110, d: 0.11, v: v * 0.35 },
					],
					0,
					81,
					this.active,
				),
			);
		}
		settings() {
			return {
				music: this.audio.musicVolume,
				effects: this.audio.sfxVolume,
				voice: this.audio.voiceVolume,
				ready: this.audio.ready,
				ducked: this.audio.ducked,
				active: this.active.size,
				eventsPlayed: this.eventsPlayed,
			};
		}
		play(kind, pan = 0, gain = 1) {
			if (this.stopped || !this.audio.ready) return false;
			const aliases = {
				"bow-release": "shoot",
				"arrow-land": "land",
				"dry-fire": "dry",
				"enemy-hit": "hit",
				"enemy-defeat": "wound",
				"player-hit": "hurt",
				"self-hit": "hurt",
				"ooze-shed": "ooze",
				"cave-enter": "tool",
				"tool-pickup": "tool",
				"guardian-wound": "wound",
				attack: "breath",
				ladder: "tool",
				"bank-lesson": "gong",
				fire: "shoot",
				bounce: "bank",
				arrow: "shoot",
				arrowHit: "hit",
				arrowLand: "land",
				arrowPickup: "pickup",
				dryFire: "dry",
				rat: "scratching",
				snake: "hiss",
				bat: "wings",
				spider: "skitter",
				drake: "snore",
				guardian1: "bronze",
				guardian2: "glass",
				death: "defeat",
				half: "tool",
				relic: "tool",
				exit: "tool",
			};
			const k = aliases[kind] || kind,
				spec = CUES[k];
			if (!spec) return false;
			const bus = this.audio.bus("sfx");
			if (!bus) return false;
			synthCue(
				this.audio.ctx,
				bus,
				this.audio.ctx.currentTime + 0.004,
				spec.map((v) => ({ ...v, v: v.v * clamp(gain, 0.05, 1) })),
				pan,
				113 + this.eventsPlayed,
				this.active,
			);
			this.eventsPlayed++;
			return true;
		}
		voice(text = "The road remembers.", pan = 0) {
			if (this.stopped || !this.audio.ready) return false;
			const ctx = this.audio.ctx,
				bus = this.audio.bus("voice");
			if (!ctx || !bus) return false;
			let hash = 7;
			for (const c of text)
				hash = (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0;
			const rnd = random(hash),
				syllables = Math.min(14, Math.max(4, Math.ceil(text.length / 6))),
				spec = [];
			for (let i = 0; i < syllables; i++) {
				const f = 170 + rnd() * 110,
					d = 0.055 + rnd() * 0.045,
					delay = i * 0.1;
				spec.push({
					wave: "triangle",
					f,
					to: f * (0.85 + rnd() * 0.4),
					d,
					v: 0.075,
					delay,
				});
				spec.push({
					wave: "sine",
					f: f * (2.3 + rnd() * 0.8),
					to: f * 2.5,
					d: d * 0.8,
					v: 0.022,
					delay,
				});
			}
			synthCue(ctx, bus, ctx.currentTime + 0.015, spec, pan, hash, this.active);
			return true;
		}
		quiver(count) {
			if (!this.audio.ready || this.stopped) return;
			const ctx = this.audio.ctx,
				bus = this.audio.bus("sfx");
			for (let i = 0; i < Math.min(12, count); i++)
				synthCue(
					ctx,
					bus,
					ctx.currentTime + i * 0.11,
					CUES.quiver,
					0,
					91 + i,
					this.active,
				);
		}
		update(state, _dt, focus = false, options = {}) {
			if (this.stopped || !state) return;
			const phase = state.phase || "map";
			const theme = options.title
				? "title"
				: phase === "victory"
					? "victory"
					: phase === "defeat"
						? "defeat"
						: phase === "cave"
							? ["ember", "rime"].includes(state.cave)
								? "guardian"
								: state.cave
							: "field";
			if (theme !== this.theme) {
				this.theme = theme;
				this.audio.music(THEMES[theme] || THEMES.field, {
					sync: true,
					fade: 0.8,
				});
			}
			this.focus = !!focus;
			this.audio.duck(this.focus);
			if (theme === "guardian") {
				const active = (state.enemies || []).some(
					(e) =>
						/guardian/.test(e.kind) &&
						!["dormant", "defeated"].includes(e.state),
				);
				if (this.stormActive !== active) {
					this.stormActive = active;
					this.audio.layer("storm", active ? 1 : 0, 0.8);
				}
			}
			const p = (state.players || [])[0];
			let voiced = false;
			for (const event of state.events || []) {
				const id = String(event.id);
				if (this.seen.has(id)) continue;
				this.seen.add(id);
				if (this.seen.size > 2048)
					this.seen.delete(this.seen.values().next().value);
				const pan =
					p && Number.isFinite(event.x)
						? clamp((event.x - p.x) / 140, -0.85, 0.85)
						: 0;
				if (event.type === "quiver") this.quiver(event.count || 0);
				else if (event.type === "cue") this.play(event.cue || event.kind, pan);
				else if (event.type === "sound") {
					const cue = event.cue;
					if (
						[
							"scratching",
							"hiss",
							"wings",
							"skitter",
							"ooze",
							"snore",
							"bronze",
							"glass",
						].includes(cue)
					) {
						const distance =
							this.sim && p
								? this.sim.acoustic(p, event, 330)
								: p
									? Math.hypot(event.x - p.x, event.y - p.y)
									: 0;
						if (distance <= 330) {
							const first = this.sim && p ? this.sim.path(p, event)[0] : null;
							const cuePan = first
								? clamp(
										(first.x - p.x) /
											Math.max(16, Math.hypot(first.x - p.x, first.y - p.y)),
										-0.8,
										0.8,
									)
								: pan;
							this.play(cue, cuePan, 1 / (1 + distance / 110));
						}
					} else if (cue === "walk" || cue === "run") this.play("step", pan);
				} else if (event.type === "voice" || event.type === "dialogue") {
					this.voice(event.text || "", pan);
					voiced = true;
				} else this.play(event.type, pan);
			}
			const notice =
				typeof state.notice === "string" ? state.notice : state.notice?.text;
			if (notice && notice !== this.lastNotice) {
				this.lastNotice = notice;
				if (!voiced && /axe|boat|key|crown|morning|road/i.test(notice))
					this.voice(notice);
			}
		}
		stop() {
			this.stopped = true;
			this.audio.stopMusic(0.04);
			this.audio.duck(false);
			for (const src of this.active) {
				try {
					src.stop();
				} catch {}
			}
			this.active.clear();
		}
		resume() {
			this.stopped = false;
			this.theme = null;
			this.stormActive = null;
		}
	}
	ExpeditionAudio.CUES = CUES;
	ExpeditionAudio.THEMES = THEMES;
	ExpeditionAudio.synthCue = synthCue;
	globalThis.DTAudio = ExpeditionAudio;
})();
