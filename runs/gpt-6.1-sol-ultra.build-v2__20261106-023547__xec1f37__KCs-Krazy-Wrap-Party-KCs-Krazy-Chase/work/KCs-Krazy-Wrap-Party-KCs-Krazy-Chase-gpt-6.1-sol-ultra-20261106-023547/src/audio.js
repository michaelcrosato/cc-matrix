/* Original synthesized score, effects and nonsense garden chatter; no recorded assets. */
(() => {
	"use strict";
	const NOTE = [
		"C",
		"C#",
		"D",
		"D#",
		"E",
		"F",
		"F#",
		"G",
		"G#",
		"A",
		"A#",
		"B",
	];
	function note(m) {
		return NOTE[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
	}
	function tokens(seq, shift = 0) {
		return seq
			.map((m) => (m === null ? "." : m === "-" ? "-" : note(m + shift)))
			.join(" ");
	}
	const tune = [
		72,
		null,
		76,
		79,
		null,
		76,
		74,
		null,
		72,
		67,
		null,
		69,
		71,
		null,
		67,
		null,
		74,
		null,
		77,
		81,
		null,
		77,
		76,
		null,
		74,
		71,
		null,
		72,
		76,
		null,
		72,
		null,
		79,
		null,
		76,
		72,
		null,
		74,
		76,
		null,
		77,
		76,
		74,
		null,
		72,
		null,
		67,
		null,
		69,
		null,
		72,
		76,
		null,
		74,
		71,
		null,
		72,
		null,
		67,
		null,
		72,
		"-",
		null,
		null,
	];
	const bass = [
		48,
		null,
		null,
		55,
		null,
		null,
		48,
		null,
		53,
		null,
		null,
		60,
		null,
		null,
		53,
		null,
		50,
		null,
		null,
		57,
		null,
		null,
		50,
		null,
		55,
		null,
		null,
		62,
		null,
		null,
		55,
		null,
	];
	function score(garden = 0, kind = "play") {
		const shifts = [0, 2, -2, 5, 0],
			shift = shifts[garden % 5],
			bpm = kind === "title" ? 106 : [112, 118, 110, 122, 126][garden % 5];
		const melody =
			kind === "title" ? tune.map((m, i) => (i % 4 === 3 ? null : m)) : tune;
		return {
			bpm,
			steps: 2,
			loop: true,
			tracks: [
				{
					name: "melody",
					wave: garden === 2 ? "triangle" : "pulse",
					vol: 0.11,
					notes: tokens(melody, shift),
				},
				{
					name: "bass",
					wave: "triangle",
					vol: 0.16,
					notes: tokens([...bass, ...bass], shift),
				},
				{
					name: "bells",
					wave: "sine",
					vol: 0.075,
					notes: tokens(
						tune.map((m, i) =>
							typeof m === "number" && i % 4 === 0 ? m + 12 : null,
						),
						shift,
					),
				},
				{
					name: "rhythm",
					wave: "drums",
					vol: 0.045,
					notes:
						kind === "title"
							? "k . . h . . h . k . . h . . h ."
							: "k . h . s . h . k h . h s . h .",
				},
				{
					name: "fright",
					wave: "triangle",
					vol: 0.1,
					on: false,
					notes: tokens(
						[
							84,
							null,
							83,
							null,
							81,
							null,
							79,
							null,
							77,
							null,
							76,
							null,
							74,
							null,
							72,
							null,
						],
						shift,
					),
				},
			],
		};
	}
	const STINGS = {
		clear: {
			bpm: 148,
			steps: 3,
			loop: false,
			tracks: [
				{ wave: "pulse", vol: 0.1, notes: "C5 E5 G5 C6 - . G5 C6 - - - ." },
				{ wave: "triangle", vol: 0.14, notes: "C3 . G3 C4 - . G3 C4 - - - ." },
			],
		},
		defeat: {
			bpm: 90,
			steps: 2,
			loop: false,
			tracks: [
				{ wave: "triangle", vol: 0.15, notes: "G4 F4 E4 D4 C4 - . . C3 - - -" },
				{ wave: "sine", vol: 0.1, notes: "E4 D4 C4 B3 G3 - . . C2 - - -" },
			],
		},
		victory: {
			bpm: 130,
			steps: 2,
			loop: false,
			tracks: [
				{
					wave: "pulse",
					vol: 0.11,
					notes: "C5 E5 G5 C6 G5 E5 F5 A5 C6 F6 E6 D6 C6 - - -",
				},
				{
					wave: "triangle",
					vol: 0.15,
					notes: "C3 . G3 . C4 . F3 . C4 . G3 . C3 - - -",
				},
				{
					wave: "sine",
					vol: 0.07,
					notes: "E6 . G6 . C7 . A6 . F6 . D6 . E6 - - -",
				},
			],
		},
	};
	const FX = {
		bite: {
			wave: "square",
			freq: 460,
			to: 110,
			dur: 0.13,
			vol: 0.2,
			arp: [0, 7, -3],
			step: 0.035,
		},
		catch: {
			wave: "triangle",
			freq: 600,
			to: 1300,
			dur: 0.22,
			vol: 0.19,
			arp: [0, 4, 7, 12],
			step: 0.04,
		},
		tree: { wave: "sine", freq: 950, to: 1200, dur: 0.085, vol: 0.13 },
		pickup: { wave: "sine", freq: 950, to: 1200, dur: 0.085, vol: 0.13 },
		wrap: {
			wave: "sine",
			freq: 280,
			to: 980,
			dur: 0.19,
			vol: 0.16,
			vib: [18, 0.04],
		},
		plant: {
			wave: "triangle",
			freq: 230,
			to: 650,
			dur: 0.19,
			vol: 0.17,
			arp: [0, 7, 12],
			step: 0.05,
		},
		invalid: { wave: "triangle", freq: 190, to: 140, dur: 0.1, vol: 0.14 },
		reject: { wave: "triangle", freq: 190, to: 140, dur: 0.1, vol: 0.14 },
		hit: {
			wave: "saw",
			freq: 190,
			to: 65,
			dur: 0.28,
			vol: 0.17,
			vib: [25, 0.06],
		},
		pursue: {
			wave: "pulse",
			freq: 200,
			to: 370,
			dur: 0.24,
			vol: 0.15,
			arp: [0, 0, 7],
			step: 0.075,
		},
		fright: { wave: "triangle", freq: 700, to: 1400, dur: 0.18, vol: 0.13 },
		recover: { wave: "triangle", freq: 240, to: 500, dur: 0.12, vol: 0.11 },
		chew: { wave: "noise", freq: 210, to: 100, dur: 0.09, vol: 0.045 },
		menu: { wave: "sine", freq: 520, to: 670, dur: 0.05, vol: 0.11 },
		confirm: { wave: "triangle", freq: 600, to: 900, dur: 0.1, vol: 0.14 },
		respawn: {
			wave: "sine",
			freq: 300,
			to: 780,
			dur: 0.3,
			vol: 0.13,
			arp: [0, 4, 7, 12],
			step: 0.06,
		},
	};
	const SYLLABLES = {
		bite: [
			[430, 0.065],
			[650, 0.09],
			[510, 0.07],
		],
		catch: [
			[690, 0.06],
			[800, 0.08],
			[540, 0.11],
		],
		hit: [
			[360, 0.09],
			[220, 0.16],
		],
		pursue: [
			[270, 0.08],
			[350, 0.08],
			[290, 0.14],
		],
		clear: [
			[510, 0.09],
			[700, 0.08],
			[810, 0.13],
		],
		victory: [
			[600, 0.08],
			[740, 0.08],
			[920, 0.12],
			[780, 0.16],
		],
		plant: [
			[500, 0.06],
			[620, 0.08],
		],
	};
	function scheduleVoice(
		ctx,
		bus,
		syllables,
		start,
		volume = 0.085,
		register = () => {},
	) {
		let at = start;
		for (let i = 0; i < syllables.length; i++) {
			const [frequency, dur] = syllables[i];
			const env = ctx.createGain(),
				filter = ctx.createBiquadFilter(),
				osc = ctx.createOscillator(),
				formant = ctx.createOscillator(),
				blend = ctx.createGain();
			filter.type = "bandpass";
			filter.frequency.value = 1100 + (i % 3) * 370;
			filter.Q.value = 2.8;
			env.gain.setValueAtTime(0, at);
			env.gain.linearRampToValueAtTime(volume, at + 0.008);
			env.gain.exponentialRampToValueAtTime(0.0001, at + dur);
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(frequency, at);
			osc.frequency.linearRampToValueAtTime(
				frequency * (i % 2 ? 0.84 : 1.15),
				at + dur,
			);
			formant.type = "sine";
			formant.frequency.value = frequency * 2.04;
			blend.gain.value = 0.32;
			osc.connect(filter);
			formant.connect(blend);
			blend.connect(filter);
			filter.connect(env);
			env.connect(bus);
			osc.start(at);
			formant.start(at);
			osc.stop(at + dur + 0.01);
			formant.stop(at + dur + 0.01);
			register(osc);
			register(formant);
			at += dur + 0.022;
		}
		return at - start;
	}
	function create(game, initial = {}) {
		const A = game.audio,
			tracks = Array.from({ length: 5 }, (_, i) => score(i)),
			title = score(0, "title");
		let opts = { music: 0.1, sfx: 0.55, voice: 0.4, muted: false, ...initial },
			unlocked = false,
			paused = false,
			stopped = false,
			current = null,
			currentGarden = 0,
			requested = null,
			lastFright = false,
			voiceCooldown = 0,
			voiceCount = 0,
			eventCount = 0,
			musicStarts = 0;
		const active = new Set();
		function apply(settings = {}) {
			opts = { ...opts, ...settings };
			const finite = (v, d) =>
				Number.isFinite(Number(v)) ? Math.max(0, Math.min(1, Number(v))) : d;
			A.musicVolume = finite(opts.music, 0.1);
			A.sfxVolume = finite(opts.sfx, 0.55);
			A.voiceVolume = finite(opts.voice, 0.4);
			A.muted = paused || stopped || !!opts.muted;
			A.applyVolume();
		}
		function unlock() {
			const already = unlocked && !stopped;
			unlocked = true;
			stopped = false;
			const bus = A.bus("sfx");
			if (A.ctx && A.ctx.state === "suspended") A.ctx.resume().catch(() => {});
			apply();
			if (requested && !already) scene(requested[0], requested[1], true);
			return !!bus;
		}
		function scene(kind = "play", garden = 0, force = false) {
			requested = [kind, garden];
			if (stopped || !unlocked) return;
			const id = kind + ":" + garden;
			if (current === id && !force) return;
			current = id;
			currentGarden = garden;
			lastFright = false;
			if (kind === "clear" || kind === "defeat" || kind === "victory") {
				A.music(STINGS[kind], { loop: false, sync: true });
				musicStarts++;
				utter(kind);
			} else if (kind === "silent" || kind === "end") {
				A.music(null);
				current = null;
			} else {
				A.music(kind === "title" ? title : tracks[garden % 5], { sync: true });
				musicStarts++;
			}
		}
		function utter(kind) {
			if (!unlocked || paused || stopped || voiceCooldown > (game.real || 0))
				return;
			const seq = SYLLABLES[kind];
			if (!seq) return;
			const bus = A.bus("voice"),
				ctx = A.ctx;
			if (!ctx || !bus) return;
			voiceCooldown = (game.real || 0) + 0.65;
			voiceCount++;
			scheduleVoice(ctx, bus, seq, ctx.currentTime + 0.01, 0.09, (node) => {
				active.add(node);
				node.onended = () => active.delete(node);
			});
		}
		function events(events, s) {
			if (stopped || paused) return;
			for (const ev of events || []) {
				eventCount++;
				if (!unlocked) continue;
				const kind = ev.type === "warning" ? "pursue" : ev.type;
				const fx = FX[kind];
				if (fx)
					A.sfx(fx, {
						pan:
							Number.isFinite(ev.x) && s && s.level
								? (ev.x / s.level.w - 0.5) * 0.8
								: 0,
					});
				if (SYLLABLES[kind]) utter(kind);
				if (kind === "clear" || kind === "defeat" || kind === "victory")
					scene(kind, s ? s.garden : currentGarden);
			}
			if (
				s &&
				unlocked &&
				A.song &&
				!["clear", "defeat", "victory"].some((k) =>
					(current || "").startsWith(k + ":"),
				)
			) {
				const fright = (s.sentries || []).some(
					(x) => x.fright > 0 || x.mode === "frightened" || x.mode === "flee",
				);
				if (fright !== lastFright) {
					A.layer("fright", fright ? 1 : 0, 0.2);
					lastFright = fright;
				}
			}
		}
		function pause(on = true) {
			paused = !!on;
			apply();
		}
		function stop() {
			stopped = true;
			paused = false;
			requested = null;
			current = null;
			A.music(null);
			for (const n of active) {
				try {
					n.stop();
				} catch (_) {}
			}
			active.clear();
			apply();
		}
		function sfx(kind = "menu") {
			if (unlocked && !paused && !stopped) A.sfx(FX[kind] || FX.menu);
		}
		function debug() {
			return {
				unlocked,
				paused,
				stopped,
				current,
				musicStarts,
				activeVoices: active.size,
				voiceCount,
				eventCount,
				musicVolume: A.musicVolume,
				sfxVolume: A.sfxVolume,
				voiceVolume: A.voiceVolume,
				muted: A.muted,
				contextState: A.ctx ? A.ctx.state : "locked",
				songPlaying: A.pos.playing,
			};
		}
		apply();
		return { unlock, scene, events, pause, stop, apply, debug, sfx };
	}
	// Standalone acoustic smoke test: rendered by OfflineAudioContext, never fetched or recorded.
	function renderOffline(ctx) {
		const master = ctx.createGain();
		master.gain.value = 0.28;
		master.connect(ctx.destination);
		const mus = ctx.createGain();
		mus.gain.value = 0.1;
		mus.connect(master);
		const fx = ctx.createGain();
		fx.gain.value = 0.55;
		fx.connect(master);
		const voice = ctx.createGain();
		voice.gain.value = 0.4;
		voice.connect(master);
		for (let i = 0; i < 8; i++) {
			const o = ctx.createOscillator(),
				g = ctx.createGain(),
				at = 0.02 + i * 0.12;
			o.type = "triangle";
			o.frequency.value = 440 * Math.pow(2, [0, 4, 7, 12, 7, 4, 2, 0][i] / 12);
			g.gain.setValueAtTime(0, at);
			g.gain.linearRampToValueAtTime(0.2, at + 0.006);
			g.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
			o.connect(g);
			g.connect(mus);
			o.start(at);
			o.stop(at + 0.11);
		}
		const o = ctx.createOscillator(),
			g = ctx.createGain();
		o.type = "square";
		o.frequency.setValueAtTime(460, 0.3);
		o.frequency.exponentialRampToValueAtTime(110, 0.43);
		g.gain.setValueAtTime(0, 0.3);
		g.gain.linearRampToValueAtTime(0.12, 0.305);
		g.gain.exponentialRampToValueAtTime(0.0001, 0.44);
		o.connect(g);
		g.connect(fx);
		o.start(0.3);
		o.stop(0.45);
		scheduleVoice(ctx, voice, SYLLABLES.bite, 0.6, 0.09);
		return { duration: 1.2, music: 0.1, sfx: 0.55, voice: 0.4 };
	}
	globalThis.GardenAudio = { create, renderOffline, score, effects: FX };
})();
