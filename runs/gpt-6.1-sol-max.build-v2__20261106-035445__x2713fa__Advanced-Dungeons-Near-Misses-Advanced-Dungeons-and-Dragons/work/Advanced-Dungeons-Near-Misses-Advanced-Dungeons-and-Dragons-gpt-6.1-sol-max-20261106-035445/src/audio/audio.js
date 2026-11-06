/* Original code-only score, creature calls, arrow foley and formant babble. */
(() => {
	globalThis.NM = globalThis.NM || {};
	const NM = globalThis.NM;
	const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
	const CUES = Object.freeze({
		bow: [
			{ wave: "triangle", freq: 270, to: 105, dur: 0.19, vol: 0.25 },
			{ wave: "noise", freq: 1700, to: 550, dur: 0.065, vol: 0.095 },
		],
		pass: { wave: "noise", freq: 2400, to: 550, dur: 0.13, vol: 0.065 },
		draw: { wave: "noise", freq: 780, to: 1300, dur: 0.12, vol: 0.028 },
		bank: [
			{ wave: "sine", freq: 1568, to: 1410, dur: 0.28, vol: 0.2 },
			{ wave: "sine", freq: 2349, to: 2320, dur: 0.15, vol: 0.065 },
			{ wave: "noise", freq: 4200, to: 1600, dur: 0.045, vol: 0.06 },
		],
		armor: [
			{ wave: "triangle", freq: 980, to: 720, dur: 0.22, vol: 0.16 },
			{ wave: "sine", freq: 1960, to: 1440, dur: 0.12, vol: 0.05 },
		],
		hit: [
			{ wave: "noise", freq: 480, to: 110, dur: 0.14, vol: 0.19 },
			{ wave: "triangle", freq: 140, to: 58, dur: 0.12, vol: 0.19 },
		],
		land: { wave: "noise", freq: 920, to: 460, dur: 0.085, vol: 0.09 },
		pickup: [
			{ wave: "sine", freq: 660, to: 880, dur: 0.09, vol: 0.13 },
			{
				wave: "triangle",
				freq: 990,
				to: 1320,
				delay: 0.065,
				dur: 0.13,
				vol: 0.1,
			},
		],
		dry: [
			{ wave: "noise", freq: 1800, to: 1000, dur: 0.035, vol: 0.11 },
			{ wave: "triangle", freq: 95, to: 75, dur: 0.055, vol: 0.11 },
		],
		step: { wave: "noise", freq: 550, to: 330, dur: 0.055, vol: 0.045 },
		run: { wave: "noise", freq: 500, to: 240, dur: 0.075, vol: 0.09 },
		dodge: [
			{ wave: "noise", freq: 1100, to: 400, dur: 0.15, vol: 0.14 },
			{ wave: "triangle", freq: 150, to: 75, dur: 0.12, vol: 0.055 },
		],
		hurt: [
			{ wave: "triangle", freq: 170, to: 60, dur: 0.23, vol: 0.2 },
			{ wave: "noise", freq: 650, to: 200, dur: 0.17, vol: 0.12 },
		],
		heal: [
			{ wave: "sine", freq: 440, to: 660, dur: 0.2, vol: 0.14 },
			{ wave: "sine", freq: 880, to: 1320, delay: 0.12, dur: 0.2, vol: 0.08 },
		],
		revive: [
			{
				wave: "triangle",
				freq: 293.66,
				arp: [0, 5, 9, 12],
				step: 0.07,
				dur: 0.4,
				vol: 0.15,
			},
		],
		down: {
			wave: "triangle",
			freq: 220,
			arp: [0, -3, -7, -12],
			step: 0.08,
			dur: 0.4,
			vol: 0.16,
		},
		ladder: {
			wave: "noise",
			freq: 600,
			to: 270,
			dur: 0.12,
			vol: 0.09,
			arp: [0, 3, 0],
		},
		travel: { wave: "noise", freq: 420, to: 200, dur: 0.2, vol: 0.06 },
		treasure: [
			{ wave: "sine", freq: 880, to: 1760, dur: 0.25, vol: 0.11 },
			{ wave: "triangle", freq: 1174.66, delay: 0.12, dur: 0.23, vol: 0.09 },
		],
		tool: [
			{
				wave: "triangle",
				freq: 293.66,
				arp: [0, 4, 7, 12, 16],
				step: 0.09,
				dur: 0.5,
				vol: 0.17,
			},
			{ wave: "sine", freq: 1174.66, delay: 0.35, dur: 0.4, vol: 0.08 },
		],
		rat: [
			{ wave: "noise", freq: 2200, to: 1100, dur: 0.09, vol: 0.12 },
			{ wave: "sine", freq: 1300, to: 900, delay: 0.08, dur: 0.11, vol: 0.08 },
		],
		snake: [
			{
				wave: "noise",
				freq: 3100,
				to: 1700,
				dur: 0.4,
				vol: 0.13,
				attack: 0.055,
			},
			{ wave: "sine", freq: 165, to: 145, dur: 0.28, vol: 0.025 },
		],
		bat: [
			{ wave: "noise", freq: 1000, to: 460, dur: 0.065, vol: 0.12 },
			{
				wave: "noise",
				freq: 1050,
				to: 480,
				delay: 0.11,
				dur: 0.065,
				vol: 0.12,
			},
			{
				wave: "triangle",
				freq: 1750,
				to: 1300,
				delay: 0.2,
				dur: 0.075,
				vol: 0.055,
			},
		],
		spider: [
			{ wave: "noise", freq: 1650, to: 850, dur: 0.055, vol: 0.085 },
			{
				wave: "noise",
				freq: 1450,
				to: 750,
				delay: 0.085,
				dur: 0.055,
				vol: 0.085,
			},
			{
				wave: "noise",
				freq: 1250,
				to: 700,
				delay: 0.17,
				dur: 0.055,
				vol: 0.085,
			},
		],
		ooze: [
			{ wave: "sine", freq: 135, to: 53, dur: 0.45, vol: 0.16 },
			{ wave: "sine", freq: 210, to: 85, delay: 0.15, dur: 0.33, vol: 0.08 },
		],
		drake: [
			{ wave: "triangle", freq: 83, to: 57, dur: 0.65, vol: 0.16 },
			{ wave: "noise", freq: 210, to: 95, delay: 0.1, dur: 0.55, vol: 0.12 },
		],
		guardian1: [
			{ wave: "triangle", freq: 73.42, to: 55, dur: 0.95, vol: 0.17 },
			{ wave: "sine", freq: 146.83, to: 110, dur: 0.8, vol: 0.1 },
			{ wave: "noise", freq: 320, to: 120, delay: 0.18, dur: 0.55, vol: 0.13 },
		],
		guardian2: [
			{
				wave: "sine",
				freq: 98,
				to: 73.42,
				dur: 1.05,
				vol: 0.16,
				vib: [6, 0.025],
			},
			{
				wave: "triangle",
				freq: 196,
				to: 146.83,
				delay: 0.15,
				dur: 0.9,
				vol: 0.08,
			},
			{ wave: "noise", freq: 1500, to: 380, delay: 0.2, dur: 0.7, vol: 0.1 },
		],
		rush: { wave: "noise", freq: 700, to: 170, dur: 0.32, vol: 0.2 },
		breath: [
			{
				wave: "noise",
				freq: 650,
				to: 1500,
				dur: 0.65,
				vol: 0.18,
				attack: 0.08,
			},
			{ wave: "triangle", freq: 110, to: 65, dur: 0.55, vol: 0.09 },
		],
		tell: {
			wave: "sine",
			freq: 196,
			to: 293.66,
			dur: 0.36,
			vol: 0.075,
			attack: 0.03,
		},
		defeat: [
			{ wave: "noise", freq: 650, to: 80, dur: 0.3, vol: 0.12 },
			{ wave: "triangle", freq: 165, to: 45, dur: 0.35, vol: 0.1 },
		],
		click: { wave: "triangle", freq: 1100, to: 800, dur: 0.045, vol: 0.105 },
		air: {
			wave: "noise",
			freq: 135,
			to: 165,
			dur: 1.8,
			vol: 0.018,
			attack: 0.4,
		},
	});

	function pluck(ctx, bus, time, freq, dur, vol) {
		const main = ctx.createOscillator(),
			overtone = ctx.createOscillator(),
			gain = ctx.createGain(),
			harmonic = ctx.createGain(),
			filter = ctx.createBiquadFilter();
		main.type = "triangle";
		main.frequency.setValueAtTime(freq, time);
		overtone.type = "sine";
		overtone.frequency.setValueAtTime(freq * 2.005, time);
		harmonic.gain.value = 0.18;
		filter.type = "lowpass";
		filter.frequency.setValueAtTime(freq * 5, time);
		filter.frequency.exponentialRampToValueAtTime(
			Math.max(120, freq * 1.2),
			time + Math.max(0.02, dur),
		);
		gain.gain.setValueAtTime(0, time);
		gain.gain.linearRampToValueAtTime(vol * 0.8, time + 0.008);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.03, dur));
		main.connect(filter);
		overtone.connect(harmonic);
		harmonic.connect(filter);
		filter.connect(gain);
		gain.connect(bus);
		main.start(time);
		overtone.start(time);
		main.stop(time + dur + 0.03);
		overtone.stop(time + dur + 0.03);
	}
	function breathFlute(ctx, bus, time, freq, dur, vol) {
		const osc = ctx.createOscillator(),
			gain = ctx.createGain(),
			vib = ctx.createOscillator(),
			amount = ctx.createGain();
		osc.type = "sine";
		osc.frequency.value = freq;
		vib.frequency.value = 4.2;
		amount.gain.value = freq * 0.006;
		vib.connect(amount);
		amount.connect(osc.frequency);
		gain.gain.setValueAtTime(0, time);
		gain.gain.linearRampToValueAtTime(
			vol * 0.7,
			time + Math.min(0.09, dur * 0.2),
		);
		gain.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(0.03, dur));
		osc.connect(gain);
		gain.connect(bus);
		osc.start(time);
		vib.start(time);
		osc.stop(time + dur + 0.03);
		vib.stop(time + dur + 0.03);
	}

	const TRAIL = {
		title: "Three Shafts to Daybreak",
		bpm: 70,
		steps: 4,
		tracks: [
			{
				name: "ash",
				wave: "nm-ash",
				vol: 0.24,
				notes:
					"D4 - . . . . A4 . | F4 - . E4 D4 - . . | A4 - . . C5 . A4 . | G4 - . F4 E4 - . . | D4 - . . A4 . D5 . | C5 - . A4 G4 - . . | F4 - . E4 D4 . A3 . | D4 - - . . . . .",
			},
			{
				name: "hearth",
				wave: "triangle",
				vol: 0.16,
				notes:
					"D2 - - . . . . . | F2 - . . . . . . | C3 - . . . . . . | A2 - . . . . . . | Bb2 - . . . . . . | G2 - . . . . . . | A2 - - . . . . . | D3 - - . . . . .",
			},
			{
				name: "summit",
				wave: "nm-air",
				vol: 0.09,
				on: false,
				notes:
					". . . . A4 - . . | . . . . E5 - . . | . . . . G4 - . . | . . . . A4 - . .",
			},
		],
	};
	const CAVE_MELODIES = [
		"D4 - . . . . . . | A4 - . . . . F4 . | E4 - . . D4 . . . | . . . . A3 - . .",
		"G3 - . . . . D4 . | Bb3 - . . A3 . . . | D4 - . . . . F4 . | Eb4 - . D4 C4 . . .",
		"E4 - . . B3 . . . | F#4 - . . E4 - . . | A3 - . . . . B3 . | D4 - . . E4 . . .",
		"D4 . . . A4 - . . | F4 . . E4 D4 - . . | Bb4 - . A4 G4 - . . | A4 - . . E4 . . .",
		"A3 - . . E4 . . . | C4 - . B3 A3 - . . | F4 - . E4 D4 - . . | E4 - . . B3 . . .",
	];
	function caveScore(index) {
		return {
			title:
				[
					"Chalk Keeps its Counsel",
					"Roots Remember",
					"The Water Beneath Stone",
					"Copper Wing",
					"The Pale Bell",
				][index] || "Stone",
			bpm: index >= 3 ? 82 : 58 + index * 3,
			steps: 4,
			tracks: [
				{
					name: "ash",
					wave: "nm-ash",
					vol: 0.2,
					notes: CAVE_MELODIES[index] || CAVE_MELODIES[0],
				},
				{
					name: "air",
					wave: "nm-air",
					vol: 0.09,
					notes:
						". . . . . . D4 - | . . . . . . A3 - | . . . . . . C4 - | . . . . . . A3 -",
				},
				{
					name: "pulse",
					wave: "triangle",
					vol: 0.2,
					on: false,
					notes:
						index === 4
							? "A1 . A2 . . . E2 . | A1 . A2 . . E2 . ."
							: "D2 . D3 . . . A2 . | D2 . D3 . . A2 . .",
				},
				{
					name: "wing",
					wave: "nm-ash",
					vol: 0.13,
					on: false,
					notes:
						". . . A4 . . G4 . | . . . E4 . F4 . . | . . . C5 . . Bb4 . | . . . A4 G4 . E4 .",
				},
			],
		};
	}
	const SCORES = Object.freeze({
		trail: TRAIL,
		caves: [0, 1, 2, 3, 4].map(caveScore),
		victory: {
			title: "Daylight Finds the Door",
			bpm: 88,
			steps: 3,
			loop: false,
			tracks: [
				{
					wave: "nm-ash",
					vol: 0.26,
					notes:
						"D4 A4 D5 | F5 - E5 | D5 - A4 | C5 - G4 | A4 D5 F5 | A5 - - | F5 E5 D5 | D5 - -",
				},
				{
					wave: "triangle",
					vol: 0.19,
					notes:
						"D3 - A3 | D3 - A3 | G3 - D4 | A2 - E3 | Bb2 - F3 | A2 - E3 | D3 - A3 | D3 - -",
				},
			],
		},
		defeat: {
			title: "Keep a Place by the Fire",
			bpm: 65,
			steps: 2,
			loop: false,
			tracks: [
				{
					wave: "nm-air",
					vol: 0.25,
					notes: "A4 - F4 - | E4 - C4 - | D4 - - - | A3 - - -",
				},
				{
					wave: "triangle",
					vol: 0.18,
					notes: "D3 - - - | A2 - - - | Bb2 - - - | D2 - - -",
				},
			],
		},
	});

	class Sound {
		constructor(game) {
			this.game = game;
			this.audio = game.audio;
			this.ids = new Set();
			this.lastEpoch = null;
			this.lastScene = null;
			this.handles = [];
			this.sources = [];
			this.stopped = false;
			this.unlocked = false;
			this.lastLayer = false;
			this.ambience = null;
			this.stats = {
				events: 0,
				played: 0,
				deduplicated: 0,
				voices: 0,
				unlocked: false,
				musicDefault: 0.1,
				effectiveMusic: 0.1,
				ducked: false,
				score: "none",
				lastCue: null,
				activeSources: 0,
			};
			this.audio.instrument("nm-ash", pluck);
			this.audio.instrument("nm-air", breathFlute);
			for (const [key, value] of Object.entries(CUES))
				this.audio.define(`nm-${key}`, value);
			const settings = game.settings;
			if (settings?.define) {
				settings.define({
					...settings.spec("music"),
					key: "music",
					value: 0.1,
				});
				if (!settings.spec("voices"))
					settings.define({
						key: "voices",
						group: "Sound",
						label: "Gibberish voices",
						type: "slider",
						value: 0.7,
						apply: (g, v) => {
							g.audio.voiceVolume = v;
							g.audio.applyVolume();
						},
					});
				if (!settings.spec("ambience"))
					settings.define({
						key: "ambience",
						group: "Sound",
						label: "Cave ambience",
						type: "slider",
						value: 0.45,
					});
			} else {
				this.audio.musicVolume = 0.1;
				this.audio.applyVolume();
			}
			this.stats.effectiveMusic = this.audio.musicVolume;
			if (!game.headless && typeof addEventListener === "function") {
				this.abort = new AbortController();
				const options = { capture: true, signal: this.abort.signal };
				for (const kind of ["pointerdown", "keydown", "touchstart"])
					addEventListener(kind, () => this.unlock(), options);
			}
		}
		unlock() {
			if (this.stopped || this.game.headless) return false;
			this.audio.bus("sfx");
			const context = this.audio.ctx;
			if (context && context.state !== "running")
				context.resume().catch(() => {});
			this.unlocked = !!context;
			this.stats.unlocked = this.unlocked;
			return this.unlocked;
		}
		resume() {
			this.stopped = false;
			return this.unlock();
		}
		location(sim, event) {
			const s = sim.state || sim,
				players = (s.players || []).filter((p) => !p.downed);
			if (s.mode !== "cave" || !players.length || !sim.level || !NM.Geometry)
				return { pan: 0, volume: 1 };
			let best = null;
			for (const player of players) {
				const path = NM.Geometry.path(
						sim.level,
						player.x,
						player.y,
						event.x,
						event.y,
					),
					same = Math.hypot(player.x - event.x, player.y - event.y) < 16;
				if (!path.length && !same) continue;
				const distance = path.length * 16;
				if (!best || distance < best.distance)
					best = { player, path, distance };
			}
			if (!best) return { pan: 0, volume: 0 };
			const max = (event.loudness || 9) * 16 * (best.player.focus ? 1.4 : 1.1),
				volume = clamp(1 - best.distance / max, 0.0, 1);
			const next = best.path[Math.min(2, best.path.length - 1)] || [
				event.x,
				event.y,
			];
			const screen = this.game.view.p(
				next[0] - best.player.x,
				next[1] - best.player.y,
				0,
			);
			return { pan: clamp(screen[0] / 70, -0.8, 0.8), volume: volume * volume };
		}
		play(kind, options = {}) {
			this.stats.lastCue = kind;
			if (!CUES[kind] || this.stopped || this.game.headless || !this.unlocked)
				return;
			const handle = this.audio.sfx(`nm-${kind}`, {
				vary: 0,
				pan: options.pan || 0,
				vol: options.volume === undefined ? 1 : options.volume,
				pitch: options.pitch || 1,
			});
			if (handle.playing) {
				this.stats.played++;
				this.handles.push({
					handle,
					end: (this.audio.ctx?.currentTime || 0) + 2,
				});
			}
		}
		voice(text) {
			this.stats.voices++;
			if (this.stopped || !this.unlocked || this.game.headless) return;
			const bus = this.audio.bus("voice"),
				c = this.audio.ctx;
			if (!c || !bus || c.state !== "running") return;
			const seed = String(text || "")
					.split("")
					.reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 19),
				count = 3 + (seed % 3);
			for (let i = 0; i < count; i++) {
				const t = c.currentTime + 0.012 + i * 0.115,
					dur = 0.075 + ((seed >> (i * 2)) & 3) * 0.008,
					osc = c.createOscillator(),
					low = c.createBiquadFilter(),
					high = c.createBiquadFilter(),
					gain = c.createGain();
				const vowels = [
						[600, 1450],
						[400, 1900],
						[750, 1100],
						[350, 900],
					],
					form = vowels[(seed + i * 7) % vowels.length],
					freq = 165 + ((seed >> (i * 3)) & 63) + i * 7;
				osc.type = "sawtooth";
				osc.frequency.setValueAtTime(freq, t);
				osc.frequency.exponentialRampToValueAtTime(
					freq * (i % 2 ? 1.17 : 0.89),
					t + dur,
				);
				low.type = "bandpass";
				low.frequency.value = form[0];
				low.Q.value = 3.2;
				high.type = "peaking";
				high.frequency.value = form[1];
				high.Q.value = 2;
				high.gain.value = 7;
				gain.gain.setValueAtTime(0, t);
				gain.gain.linearRampToValueAtTime(0.055, t + 0.01);
				gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
				osc.connect(low);
				low.connect(high);
				high.connect(gain);
				gain.connect(bus);
				osc.start(t);
				osc.stop(t + dur + 0.02);
				this.sources.push({ source: osc, end: t + dur + 0.03 });
			}
		}
		event(sim, event) {
			this.stats.events++;
			let kind = event.kind;
			if (kind === "voice") {
				this.voice(event.text);
				return;
			}
			const options = this.location(sim, event);
			if (options.volume <= 0.001) return;
			if (kind === "quiver") {
				const count = clamp(Math.round(event.count || 0), 0, 24),
					voices = Array.from({ length: count }, (_, i) => ({
						...CUES.click,
						delay: i * 0.095,
					}));
				if (!count) {
					this.play("dry", options);
					return;
				}
				if (this.unlocked && !this.game.headless) {
					const h = this.audio.sfx(voices, {
						vary: 0,
						pan: options.pan,
						vol: options.volume,
					});
					this.handles.push({
						handle: h,
						end: (this.audio.ctx?.currentTime || 0) + count * 0.095 + 0.1,
					});
					this.stats.played++;
				}
				return;
			}
			if (kind.startsWith("creature-") || kind.startsWith("alert-")) {
				const alert = kind.startsWith("alert-");
				kind = kind.replace(/^(creature|alert)-/, "");
				options.pitch = alert ? 1.18 : 1;
				if (
					(sim.state || sim).enemies?.some(
						(e) => e.type === "bat" && e.mask > 0,
					) &&
					kind !== "bat"
				)
					options.volume *= 0.5;
			}
			if (kind === "emerge") kind = "tool";
			if (kind === "quickstep") kind = "dodge";
			if (kind === "recover" || kind === "shaft" || kind === "arrows")
				kind = "pickup";
			if (kind === "win" || kind === "loss" || kind === "victory") return;
			this.play(kind, options);
			if (kind === "bow")
				this.play("pass", { ...options, volume: options.volume * 0.65 });
			if (kind === "tell" && event.type)
				this.play(event.type, {
					...options,
					volume: options.volume * 0.6,
					pitch: 1.2,
				});
		}
		update(sim, _dt) {
			if (this.stopped || this.game.disposed) return;
			const s = sim.state || sim;
			if (!s) return;
			const epoch = `${s.seed}:${s.epoch || 0}`;
			if (epoch !== this.lastEpoch) {
				this.ids.clear();
				this.lastEpoch = epoch;
			}
			for (const event of s.events || []) {
				if (this.ids.has(event.id)) {
					this.stats.deduplicated++;
					continue;
				}
				this.ids.add(event.id);
				this.event(sim, event);
			}
			if (this.ids.size > 2000) {
				const keep = new Set((s.events || []).map((e) => e.id));
				this.ids = keep;
			}
			const focused = (s.players || []).some((p) => p.focus && !p.downed);
			this.audio.duck(focused);
			this.stats.ducked = focused;
			const scene =
				s.mode === "cave"
					? `cave-${s.caveIndex || 0}`
					: s.mode === "victory"
						? "victory"
						: s.mode === "defeat"
							? "defeat"
							: "trail";
			if (scene !== this.lastScene || (!this.audio.song && this.unlocked)) {
				this.lastScene = scene;
				this.stats.score = scene;
				const score = scene.startsWith("cave-")
					? SCORES.caves[clamp(s.caveIndex || 0, 0, 4)]
					: SCORES[scene];
				if (!this.game.headless && this.unlocked)
					this.audio.music(score, {
						sync: true,
						fade: 0.6,
						loop: scene !== "victory" && scene !== "defeat",
					});
				this.lastLayer = null;
			}
			const active = (s.enemies || []).some(
				(e) =>
					(e.type === "guardian1" || e.type === "guardian2") &&
					e.hp > 0 &&
					e.state !== "dormant",
			);
			if (
				scene.startsWith("cave-") &&
				active !== this.lastLayer &&
				this.unlocked &&
				!this.game.headless
			) {
				this.audio.layer("pulse", active ? 1 : 0, 0.5);
				this.audio.layer("wing", active ? 0.7 : 0, 0.7);
				this.lastLayer = active;
			}
			if (this.unlocked && !this.game.headless && s.mode === "cave") {
				if (!this.ambience)
					this.ambience = this.audio.sfx("nm-air", {
						loop: true,
						vary: 0,
						vol: 0.4,
					});
				this.ambience.set({ vol: this.game.settings?.ambience ?? 0.45 });
			} else if (this.ambience) {
				this.ambience.stop(0.2);
				this.ambience = null;
			}
			const now = this.audio.ctx?.currentTime || 0;
			this.handles = this.handles.filter((h) => h.end > now);
			this.sources = this.sources.filter((h) => h.end > now);
			this.stats.activeSources =
				this.handles.length + this.sources.length + (this.ambience ? 1 : 0);
			this.stats.effectiveMusic =
				this.audio.ctx && this.audio._musBus
					? this.audio._musBus.gain.value
					: this.audio.musicVolume * (focused ? 0.35 : 1);
		}
		stop() {
			this.stopped = true;
			if (this.abort) this.abort.abort();
			for (const h of this.handles) h.handle.stop(0);
			for (const h of this.sources)
				try {
					h.source.stop();
				} catch (_) {
					/* already ended */
				}
			if (this.ambience) this.ambience.stop(0);
			this.handles = [];
			this.sources = [];
			this.ambience = null;
			this.audio.stopMusic(0.02);
			this.audio.duck(false);
			this.stats.activeSources = 0;
		}
	}
	Sound.CUES = CUES;
	Sound.SCORES = SCORES;
	Sound.pluck = pluck;
	Sound.breathFlute = breathFlute;
	NM.Sound = Sound;
})();
