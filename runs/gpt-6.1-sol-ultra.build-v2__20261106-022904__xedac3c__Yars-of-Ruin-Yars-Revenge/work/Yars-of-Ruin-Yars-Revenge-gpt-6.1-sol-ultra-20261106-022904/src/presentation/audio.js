/* Original code-only score, impacts and formant chatter. No recorded audio. */
(() => {
	"use strict";
	const root = typeof window !== "undefined" ? window : globalThis;
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	function createSynth(ctx, buses) {
		const active = new Set();
		let stopped = false,
			created = 0;
		let z = 0x61f73019;
		const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate),
			d = noise.getChannelData(0);
		for (let i = 0; i < d.length; i++) {
			z ^= z << 13;
			z ^= z >>> 17;
			z ^= z << 5;
			d[i] = ((z >>> 0) / 4294967296) * 2 - 1;
		}
		function note(
			type,
			freq,
			to,
			dur,
			vol,
			bus = "sfx",
			delay = 0,
			filter = null,
		) {
			if (stopped || !Number.isFinite(freq) || !Number.isFinite(vol)) return;
			const at = ctx.currentTime + Math.max(0, delay),
				end = at + Math.max(0.025, dur),
				gain = ctx.createGain();
			gain.gain.setValueAtTime(0, at);
			gain.gain.linearRampToValueAtTime(clamp(vol, 0, 0.28), at + 0.008);
			gain.gain.exponentialRampToValueAtTime(0.00001, end - 0.008);
			gain.gain.linearRampToValueAtTime(0, end);
			let source;
			if (type === "noise") {
				source = ctx.createBufferSource();
				source.buffer = noise;
				source.loop = true;
				source.playbackRate.setValueAtTime(clamp(freq / 1600, 0.1, 4), at);
			} else {
				source = ctx.createOscillator();
				source.type = type;
				source.frequency.setValueAtTime(clamp(freq, 20, 12000), at);
				if (to)
					source.frequency.exponentialRampToValueAtTime(
						clamp(to, 20, 12000),
						end,
					);
			}
			const nodes = [source, gain];
			source.connect(gain);
			let tail = gain;
			if (filter) {
				const f = ctx.createBiquadFilter();
				f.type = filter.type || "lowpass";
				f.frequency.value = filter.freq || 1200;
				f.Q.value = filter.q || 0.7;
				tail.connect(f);
				tail = f;
				nodes.push(f);
			}
			tail.connect(buses[bus] || buses.sfx);
			active.add(source);
			created++;
			source.onended = () => {
				active.delete(source);
				for (const n of nodes)
					try {
						n.disconnect();
					} catch {}
			};
			source.start(at);
			source.stop(end + 0.012);
			return source;
		}
		function chatter(fortress = false, delay = 0) {
			const syllables = fortress
				? [102, 153, 94, 132, 87]
				: [288, 376, 260, 408, 330];
			syllables.forEach((f, i) => {
				const t = delay + i * 0.085;
				note(
					"sawtooth",
					f,
					f * (i % 2 ? 1.18 : 0.84),
					0.066,
					0.022,
					"voice",
					t,
					{
						type: "bandpass",
						freq: fortress ? 640 + i * 120 : 1000 + i * 170,
						q: 4,
					},
				);
				note("sine", f * 2, f * 1.8, 0.062, 0.012, "voice", t);
			});
		}
		function stop() {
			stopped = true;
			for (const s of active) {
				try {
					s.stop();
				} catch {}
				try {
					s.disconnect();
				} catch {}
			}
			active.clear();
		}
		return {
			note,
			chatter,
			stop,
			active,
			stats: () => ({ active: active.size, created, stopped }),
		};
	}
	function create(game) {
		const A = game.audio;
		let enabled = false,
			disposed = false,
			synth = null,
			gates = null,
			sequence = 0,
			beatTime = 0,
			sector = -1,
			prevState = "",
			silent = true;
		let beat = 0;
		const played = new Set();
		function unlock() {
			if (disposed || game.headless) return false;
			enabled = true;
			const bus = A.bus("sfx");
			if (!bus || !A.ctx) return false;
			if (A.ctx.state === "suspended") A.ctx.resume().catch(() => {});
			if (!synth) {
				gates = {};
				for (const name of ["sfx", "music", "voice"]) {
					const g = A.ctx.createGain();
					g.gain.value = 0;
					g.connect(A.bus(name));
					gates[name] = g;
				}
				synth = createSynth(A.ctx, gates);
			}
			return true;
		}
		function setSilence(on) {
			if (!gates || silent === on) return;
			silent = on;
			const t = A.ctx.currentTime;
			for (const g of Object.values(gates)) {
				g.gain.cancelScheduledValues(t);
				g.gain.setTargetAtTime(on ? 0 : 1, t, 0.015);
			}
		}
		function update(dt, w, opts = {}) {
			if (disposed) return;
			if (!enabled && A.ready) unlock();
			if (!synth) return;
			setSilence(!!(opts.paused || opts.silent));
			if (silent) return;
			beatTime -= Math.max(0, dt);
			if (w.sector !== sector) {
				sector = w.sector;
				beat = 0;
				beatTime = 0;
			}
			const N = synth.note;
			if (beatTime <= 0) {
				beatTime += sector === 2 ? 0.19 : sector === 1 ? 0.23 : 0.27;
				const roots = [55, 61.735, 65.406],
					base = roots[sector] || 55;
				const motif = [0, 7, 12, 3, 0, 10, 7, 3, 0, 7, 15, 12, 10, 3, 7, -2],
					st = motif[beat % motif.length];
				if (beat % 4 === 0) {
					N("triangle", base, base, 0.93, 0.095, "music");
					N("sawtooth", base * 1.005, base * 0.998, 0.85, 0.028, "music", 0, {
						freq: 330,
					});
				}
				N("sine", base * 4 * Math.pow(2, st / 12), 0, 0.35, 0.047, "music", 0, {
					freq: 1800,
				});
				if (beat % 2 === 0)
					N("noise", 4500, 0, 0.024, 0.011, "music", 0, {
						type: "highpass",
						freq: 4200,
					});
				if (sector > 0 && beat % 4 === 2)
					N("sine", 90, 43, 0.14, 0.06, "music");
				if (w.core && (w.core.state === "windup" || w.core.state === "flight"))
					N(
						"triangle",
						base * 8 * Math.pow(2, [0, 1, 7, 6][beat % 4] / 12),
						0,
						0.12,
						0.018,
						"music",
					);
				if (
					w.players?.some(
						(p) => p.ready || p.charge >= (w.tuning?.chargeThreshold || 5),
					)
				)
					N("sine", base * 16, 0, 0.12, 0.011, "music", 0.09);
				beat++;
				sequence++;
			}
			prevState = w.core?.state || prevState;
		}
		function event(ev, w) {
			if (disposed || !synth || silent) return;
			const key =
				ev.id === undefined ? `${w.tick}:${ev.type}:${ev.player ?? ""}` : ev.id;
			if (played.has(key)) return;
			played.add(key);
			if (played.size > 1024) played.delete(played.values().next().value);
			const N = synth.note;
			switch (ev.type) {
				case "primary":
					N("triangle", 970, 410, 0.055, 0.018);
					break;
				case "needles":
					N("sawtooth", 580, 210, 0.14, 0.027, "sfx", 0, { freq: 1700 });
					break;
				case "sector-start":
					synth.chatter(w.sector === 2);
					break;
				case "defeat":
					N("triangle", 196, 37, 0.9, 0.06);
					break;
				case "chip":
					N("noise", 2200, 0, 0.045, 0.045, "sfx", 0, {
						type: "highpass",
						freq: 1300,
					});
					N("sine", 700, 360, 0.04, 0.025);
					break;
				case "bite":
					N("noise", 650, 0, 0.065, 0.07, "sfx", 0, {
						type: "bandpass",
						freq: 820,
						q: 1.6,
					});
					N("triangle", 270, 530, 0.06, 0.025);
					break;
				case "charge":
					for (let i = 0; i < 5; i++)
						N(
							"sine",
							392 * Math.pow(2, [0, 3, 7, 12, 19][i] / 12),
							0,
							0.22,
							0.035,
							"sfx",
							i * 0.055,
						);
					synth.chatter();
					break;
				case "cannon-warn":
					N("square", 210, 440, 0.19, 0.032);
					N("sine", 840, 1050, 0.19, 0.03);
					break;
				case "cannon-fire":
					N("noise", 1100, 0, 0.37, 0.13, "sfx", 0, { freq: 1700 });
					N("sine", 165, 37, 0.5, 0.14);
					N("sawtooth", 520, 90, 0.25, 0.045);
					break;
				case "reflection":
					for (let i = 0; i < 3; i++)
						N(
							"square",
							1800 - i * 280,
							720 - i * 100,
							0.085,
							0.032,
							"sfx",
							i * 0.085,
						);
					N("noise", 2800, 0, 0.27, 0.04, "sfx", 0, {
						type: "highpass",
						freq: 1800,
					});
					break;
				case "swirl-warn":
					N("sawtooth", 95, 480, 0.9, 0.055, "sfx", 0, {
						type: "bandpass",
						freq: 1300,
						q: 3,
					});
					for (let i = 0; i < 4; i++)
						N("sine", 580 + i * 130, 0, 0.11, 0.027, "sfx", i * 0.2);
					synth.chatter(true);
					break;
				case "swirl-launch":
					N("noise", 720, 0, 0.6, 0.09, "sfx", 0, {
						type: "bandpass",
						freq: 600,
					});
					N("sawtooth", 320, 65, 0.5, 0.045);
					break;
				case "core-hit":
					N("noise", 900, 0, 1.1, 0.18, "sfx", 0, { freq: 1200 });
					N("sine", 80, 25, 1.4, 0.16);
					N("noise", 3400, 0, 0.28, 0.06, "sfx", 0.08, {
						type: "highpass",
						freq: 2000,
					});
					break;
				case "sector-clear":
					for (let i = 0; i < 5; i++)
						N(
							"triangle",
							261.63 * Math.pow(2, [0, 3, 7, 12, 15][i] / 12),
							0,
							0.5,
							0.05,
							"sfx",
							i * 0.11,
						);
					synth.chatter();
					break;
				case "death":
					N("square", 430, 47, 0.43, 0.06);
					N("noise", 1300, 0, 0.28, 0.07, "sfx", 0, { freq: 1500 });
					break;
				case "respawn":
					for (let i = 0; i < 3; i++)
						N("sine", 330 + i * 220, 0, 0.14, 0.028, "sfx", i * 0.08);
					break;
				case "refill":
					N("triangle", 220, 880, 0.31, 0.05);
					break;
				case "victory":
					for (let i = 0; i < 9; i++)
						N(
							"triangle",
							261.63 * Math.pow(2, [0, 7, 12, 15, 19, 24, 19, 15, 12][i] / 12),
							0,
							0.7,
							0.045,
							"sfx",
							i * 0.13,
						);
					synth.chatter();
					break;
				case "refuge-warning":
				case "refuge-outage":
					N("triangle", 330, 164, 0.6, 0.05);
					N("noise", 900, 0, 0.25, 0.035, "sfx", 0, {
						type: "bandpass",
						freq: 1600,
					});
					break;
				case "static-block":
					N("noise", 3000, 0, 0.04, 0.025, "sfx", 0, {
						type: "highpass",
						freq: 2600,
					});
					break;
				case "immune":
					N("sine", 980, 430, 0.06, 0.025);
					break;
			}
		}
		function dispose() {
			if (disposed) return;
			disposed = true;
			if (synth) synth.stop();
			if (gates)
				for (const g of Object.values(gates))
					try {
						g.disconnect();
					} catch {}
			played.clear();
		}
		function suspend() {
			setSilence(true);
		}
		return {
			unlock,
			update,
			event,
			dispose,
			suspend,
			debug: () => ({
				enabled,
				disposed,
				silent,
				sequence,
				sector,
				...(synth ? synth.stats() : { active: 0, created: 0, stopped: false }),
				musicVolume: A.musicVolume,
				sfxVolume: A.sfxVolume,
				voiceVolume: A.voiceVolume,
				muted: A.muted,
			}),
		};
	}
	async function offlineProof() {
		const Offline = root.OfflineAudioContext || root.webkitOfflineAudioContext;
		if (!Offline) return { available: false };
		const ctx = new Offline(1, 48000 * 2, 48000),
			bus = ctx.createGain();
		bus.gain.value = 0.7;
		bus.connect(ctx.destination);
		const synth = createSynth(ctx, { sfx: bus, music: bus, voice: bus });
		synth.note("noise", 1000, 0, 0.3, 0.12, "sfx", 0, { freq: 1500 });
		synth.note("sine", 180, 45, 0.5, 0.13);
		synth.note("triangle", 220, 440, 0.33, 0.07, "music", 0.36);
		synth.chatter(false, 0.8);
		synth.chatter(true, 1.25);
		const result = await ctx.startRendering(),
			d = result.getChannelData(0);
		let peak = 0,
			sum = 0,
			tail = 0,
			finite = true;
		for (let i = 0; i < d.length; i++) {
			const x = d[i];
			if (!Number.isFinite(x)) finite = false;
			peak = Math.max(peak, Math.abs(x));
			sum += x * x;
			if (i > d.length - 2000) tail += x * x;
		}
		return {
			available: true,
			finite,
			peak,
			rms: Math.sqrt(sum / d.length),
			tailRms: Math.sqrt(tail / 2000),
			samples: d.length,
		};
	}
	root.RuinAudio = { create, offlineProof };
})();
