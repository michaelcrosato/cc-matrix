// All sounds are synthesized here. No audio assets, samples, or speech services.
const clamp = (x, a, b) => Math.min(b, Math.max(a, Number(x) || 0));
const midi = (n) => 440 * 2 ** ((n - 69) / 12);
const MUSIC_DEFAULT = 0.1;

function makeGraph(
	context,
	destination,
	initialMusic = MUSIC_DEFAULT,
	initialSfx = 0.68,
) {
	const master = context.createGain();
	master.gain.value = 0.8;
	const music = context.createGain();
	music.gain.value = initialMusic;
	const fx = context.createGain();
	fx.gain.value = initialSfx;
	const ambient = context.createGain();
	ambient.gain.value = 0.13;
	const compressor = context.createDynamicsCompressor();
	compressor.threshold.value = -13;
	compressor.knee.value = 12;
	compressor.ratio.value = 6;
	compressor.attack.value = 0.003;
	compressor.release.value = 0.16;
	const analyser = context.createAnalyser();
	analyser.fftSize = 1024;
	music.connect(master);
	fx.connect(master);
	ambient.connect(master);
	master.connect(compressor);
	compressor.connect(analyser);
	analyser.connect(destination);
	let seed = 271828183,
		active = 0,
		notes = 0;
	const random = () => {
		seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
		return seed / 4294967296;
	};
	const noiseBuffer = context.createBuffer(
		1,
		context.sampleRate * 2,
		context.sampleRate,
	);
	const noiseData = noiseBuffer.getChannelData(0);
	let brown = 0;
	for (let i = 0; i < noiseData.length; i++) {
		brown = (brown + (random() * 2 - 1) * 0.045) / 1.045;
		noiseData[i] = (random() * 2 - 1) * 0.64 + brown * 1.9;
	}
	function disposeAtEnd(source, nodes) {
		active++;
		source.onended = () => {
			active--;
			for (const node of nodes) {
				try {
					node.disconnect();
				} catch {}
			}
		};
	}
	function tone({
		frequency = 440,
		end = frequency,
		duration = 0.2,
		gain = 0.2,
		type = "sine",
		bus = fx,
		at = context.currentTime,
		attack = 0.005,
		detune = 0,
		filter = 0,
	}) {
		at = Math.max(context.currentTime, at);
		const oscillator = context.createOscillator();
		oscillator.type = type;
		const envelope = context.createGain();
		oscillator.frequency.setValueAtTime(Math.max(12, frequency), at);
		oscillator.frequency.exponentialRampToValueAtTime(
			Math.max(12, end),
			at + duration,
		);
		oscillator.detune.value = detune;
		envelope.gain.setValueAtTime(0.0001, at);
		envelope.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, gain),
			at + Math.min(attack, duration * 0.35),
		);
		envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
		const chain = [oscillator, envelope];
		if (filter) {
			const lowpass = context.createBiquadFilter();
			lowpass.type = "lowpass";
			lowpass.frequency.setValueAtTime(filter, at);
			lowpass.Q.value = 0.6;
			oscillator.connect(lowpass);
			lowpass.connect(envelope);
			chain.push(lowpass);
		} else oscillator.connect(envelope);
		envelope.connect(bus);
		disposeAtEnd(oscillator, chain);
		oscillator.start(at);
		oscillator.stop(at + duration + 0.015);
		notes++;
	}
	function noise({
		duration = 0.2,
		gain = 0.15,
		frequency = 1800,
		end = frequency,
		type = "bandpass",
		bus = fx,
		at = context.currentTime,
		attack = 0.003,
		q = 0.7,
	}) {
		at = Math.max(context.currentTime, at);
		const source = context.createBufferSource();
		source.buffer = noiseBuffer;
		const filter = context.createBiquadFilter();
		filter.type = type;
		filter.Q.value = q;
		filter.frequency.setValueAtTime(frequency, at);
		filter.frequency.exponentialRampToValueAtTime(
			Math.max(20, end),
			at + duration,
		);
		const envelope = context.createGain();
		envelope.gain.setValueAtTime(0.0001, at);
		envelope.gain.exponentialRampToValueAtTime(
			gain,
			at + Math.min(attack, duration * 0.3),
		);
		envelope.gain.exponentialRampToValueAtTime(0.0001, at + duration);
		source.connect(filter);
		filter.connect(envelope);
		envelope.connect(bus);
		disposeAtEnd(source, [source, filter, envelope]);
		source.start(at, random());
		source.stop(at + duration + 0.015);
	}
	function brass(note, at, duration = 0.32, accent = 1) {
		const frequency = midi(note);
		tone({
			frequency,
			duration,
			gain: 0.19 * accent,
			type: "sawtooth",
			filter: 1350,
			attack: 0.035,
			bus: music,
			at,
		});
		tone({
			frequency: frequency * 1.004,
			duration: duration * 0.95,
			gain: 0.07 * accent,
			type: "triangle",
			attack: 0.04,
			bus: music,
			at,
		});
	}
	function pluck(note, at, accent = 1) {
		tone({
			frequency: midi(note),
			duration: 0.27,
			gain: 0.13 * accent,
			type: "triangle",
			bus: music,
			at,
		});
		tone({
			frequency: midi(note) * 3,
			duration: 0.065,
			gain: 0.025 * accent,
			type: "sine",
			bus: music,
			at,
		});
	}
	const melody = [
		62, 0, 65, 67, 69, 0, 67, 65, 62, 0, 57, 0, 60, 62, 65, 0, 67, 0, 69, 72,
		74, 0, 72, 69, 67, 65, 62, 0, 60, 0, 57, 0,
	];
	const triumphant = [62, 0, 65, 69, 74, 0, 72, 69, 70, 0, 67, 0, 69, 0, 74, 0];
	const roots = [38, 34, 41, 36];
	function musicStep(step, at, phase = "explore") {
		const urgent = phase === "escape" || phase === "combat";
		const index = step % 32,
			root = roots[Math.floor(index / 8)];
		if (step % 4 === 0) {
			tone({
				frequency: midi(root),
				duration: 0.42,
				gain: 0.23,
				type: "triangle",
				bus: music,
				at,
			});
			noise({
				duration: 0.07,
				gain: 0.12,
				frequency: 130,
				end: 60,
				type: "lowpass",
				bus: music,
				at,
			});
		}
		if (step % 4 === 2)
			noise({
				duration: 0.1,
				gain: 0.08,
				frequency: 1400,
				end: 600,
				bus: music,
				at,
			});
		noise({
			duration: 0.025,
			gain: urgent ? 0.045 : 0.026,
			frequency: 5300,
			type: "highpass",
			bus: music,
			at,
		});
		const chord = [0, 7, 12, 15];
		pluck(root + 24 + chord[step % 4], at, urgent ? 1.1 : 0.7);
		const tune = phase === "victory" ? triumphant[index % 16] : melody[index];
		if (tune && (urgent || phase === "victory" || step % 2 === 0))
			brass(tune, at, urgent ? 0.22 : 0.37, urgent ? 0.8 : 0.72);
		if (phase === "escape" && step % 2 === 0)
			tone({
				frequency: midi(root + 12),
				duration: 0.12,
				gain: 0.1,
				type: "sawtooth",
				filter: 700,
				bus: music,
				at,
			});
	}
	function sound(name, at = context.currentTime) {
		switch (name) {
			case "whip":
				noise({ duration: 0.18, gain: 0.4, frequency: 500, end: 5200, at });
				noise({
					duration: 0.055,
					gain: 0.5,
					frequency: 4200,
					end: 1600,
					at: at + 0.115,
				});
				tone({
					frequency: 730,
					end: 90,
					duration: 0.09,
					gain: 0.17,
					type: "sawtooth",
					at: at + 0.11,
				});
				break;
			case "hit":
				noise({ duration: 0.14, gain: 0.36, frequency: 1200, end: 160, at });
				tone({
					frequency: 125,
					end: 45,
					duration: 0.19,
					gain: 0.25,
					type: "triangle",
					at,
				});
				break;
			case "jump":
				tone({
					frequency: 210,
					end: 530,
					duration: 0.17,
					gain: 0.14,
					type: "triangle",
					at,
				});
				noise({ duration: 0.1, gain: 0.05, frequency: 1000, end: 2700, at });
				break;
			case "land":
				tone({
					frequency: 100,
					end: 35,
					duration: 0.14,
					gain: 0.18,
					type: "sine",
					at,
				});
				noise({ duration: 0.15, gain: 0.15, frequency: 600, end: 100, at });
				break;
			case "coin":
				tone({ frequency: 1175, duration: 0.09, gain: 0.18, type: "sine", at });
				tone({
					frequency: 1568,
					duration: 0.28,
					gain: 0.16,
					type: "triangle",
					at: at + 0.07,
				});
				break;
			case "puzzle":
				[62, 65, 69].forEach((n, i) =>
					tone({
						frequency: midi(n + 12),
						duration: 0.38,
						gain: 0.15,
						type: "triangle",
						at: at + i * 0.085,
					}),
				);
				noise({ duration: 0.38, gain: 0.11, frequency: 230, end: 70, at });
				break;
			case "gate":
				noise({
					duration: 1.35,
					gain: 0.24,
					frequency: 250,
					end: 90,
					type: "lowpass",
					at,
					attack: 0.08,
				});
				[0, 0.22, 0.45, 0.69].forEach((d) =>
					tone({
						frequency: 75,
						end: 45,
						duration: 0.2,
						gain: 0.16,
						type: "sawtooth",
						filter: 200,
						at: at + d,
					}),
				);
				break;
			case "relic":
				[62, 69, 74, 77, 81].forEach((n, i) =>
					tone({
						frequency: midi(n),
						duration: 1.25,
						gain: 0.11,
						type: "sine",
						attack: 0.04,
						at: at + i * 0.12,
					}),
				);
				noise({
					duration: 1.6,
					gain: 0.06,
					frequency: 3800,
					end: 7000,
					type: "highpass",
					at,
					attack: 0.15,
				});
				break;
			case "damage":
				tone({
					frequency: 225,
					end: 65,
					duration: 0.35,
					gain: 0.22,
					type: "sawtooth",
					filter: 1100,
					at,
				});
				noise({ duration: 0.22, gain: 0.2, frequency: 1200, end: 250, at });
				break;
			case "roll":
				noise({ duration: 0.32, gain: 0.2, frequency: 800, end: 250, at });
				tone({
					frequency: 160,
					end: 75,
					duration: 0.25,
					gain: 0.06,
					type: "triangle",
					at,
				});
				break;
			case "win":
				[62, 65, 69, 74, 77, 81, 86].forEach((n, i) => {
					tone({
						frequency: midi(n),
						duration: 0.7,
						gain: 0.14,
						type: "triangle",
						at: at + i * 0.13,
					});
					tone({
						frequency: midi(n) * 1.003,
						duration: 0.7,
						gain: 0.055,
						type: "sawtooth",
						filter: 1600,
						attack: 0.025,
						at: at + i * 0.13,
					});
				});
				break;
			case "click":
				tone({
					frequency: 740,
					end: 980,
					duration: 0.06,
					gain: 0.08,
					type: "sine",
					at,
				});
				break;
			case "step":
				noise({ duration: 0.055, gain: 0.055, frequency: 550, end: 260, at });
				break;
			case "rumble":
				noise({
					duration: 1.5,
					gain: 0.2,
					frequency: 85,
					end: 48,
					type: "lowpass",
					at,
					attack: 0.12,
				});
				break;
			default:
				tone({
					frequency: 440,
					duration: 0.08,
					gain: 0.06,
					type: "triangle",
					at,
				});
		}
	}
	function voice(text = "Tala numa", at = context.currentTime) {
		// Vowel-colored tonal syllables. Text controls cadence, never intelligible speech.
		const count = clamp(String(text).replace(/\s/g, "").length / 3, 3, 13);
		const vowels = [620, 1050, 800, 450, 1250];
		for (let i = 0; i < count; i++) {
			const pitch = 130 + (i % 3) * 29 + random() * 25;
			tone({
				frequency: pitch,
				end: pitch * (i % 2 ? 0.88 : 1.2),
				duration: 0.105 + random() * 0.05,
				gain: 0.1,
				type: "sawtooth",
				filter: vowels[i % 5],
				at: at + i * 0.12,
			});
			tone({
				frequency: pitch * 2,
				duration: 0.09,
				gain: 0.035,
				type: "sine",
				at: at + i * 0.12,
			});
		}
	}
	let ambience = [];
	function startAmbience() {
		if (ambience.length) return;
		const source = context.createBufferSource();
		source.buffer = noiseBuffer;
		source.loop = true;
		const wind = context.createBiquadFilter();
		wind.type = "lowpass";
		wind.frequency.value = 150;
		const windGain = context.createGain();
		windGain.gain.value = 0.13;
		source.connect(wind);
		wind.connect(windGain);
		windGain.connect(ambient);
		const flame = context.createBiquadFilter();
		flame.type = "bandpass";
		flame.frequency.value = 1900;
		flame.Q.value = 0.3;
		const flameGain = context.createGain();
		flameGain.gain.value = 0.025;
		source.connect(flame);
		flame.connect(flameGain);
		flameGain.connect(ambient);
		source.start();
		ambience = [source, wind, windGain, flame, flameGain];
	}
	function stopAmbience() {
		if (ambience.length) {
			try {
				ambience[0].stop();
			} catch {}
			for (const node of ambience) node.disconnect();
			ambience = [];
		}
	}
	return {
		master,
		music,
		fx,
		analyser,
		musicStep,
		sound,
		voice,
		startAmbience,
		stopAmbience,
		get active() {
			return active;
		},
		get notes() {
			return notes;
		},
	};
}

export function createAudio() {
	let context = null,
		graph = null,
		volume = MUSIC_DEFAULT,
		sfxVolume = 0.68,
		muted = false;
	let nextStep = 0,
		step = 0,
		phase = "explore",
		suspended = false;
	async function unlock() {
		const AudioContext =
			globalThis.AudioContext || globalThis.webkitAudioContext;
		if (!AudioContext) return false;
		if (!context) {
			context = new AudioContext();
			graph = makeGraph(context, context.destination, volume, sfxVolume);
			graph.master.gain.value = muted ? 0 : 0.8;
			graph.startAmbience();
			nextStep = context.currentTime + 0.035;
		}
		if (context.state === "suspended") await context.resume();
		suspended = false;
		return context.state === "running";
	}
	const ramp = (param, value) => {
		if (!context) return;
		param.cancelScheduledValues(context.currentTime);
		param.setTargetAtTime(value, context.currentTime, 0.035);
	};
	return {
		unlock,
		update(_dt, nextPhase = "explore") {
			phase = nextPhase;
			if (!context || context.state !== "running" || suspended) return;
			if (nextStep < context.currentTime - 0.25)
				nextStep = context.currentTime + 0.02;
			const eighth =
				60 / (phase === "escape" ? 142 : phase === "combat" ? 128 : 108) / 2;
			while (nextStep < context.currentTime + 0.13) {
				graph.musicStep(step++, nextStep, phase);
				nextStep += eighth;
			}
		},
		sfx(name) {
			if (context?.state === "running" && !suspended) graph.sound(name);
		},
		say(text) {
			if (context?.state === "running" && !suspended) graph.voice(text);
		},
		setMusic(value) {
			volume = clamp(value, 0, 1);
			if (graph) ramp(graph.music.gain, volume);
		},
		setSfx(value) {
			sfxVolume = clamp(value, 0, 1);
			if (graph) ramp(graph.fx.gain, sfxVolume);
		},
		setMuted(value) {
			muted = !!value;
			if (graph) ramp(graph.master.gain, muted ? 0 : 0.8);
		},
		async suspend() {
			suspended = true;
			if (context?.state === "running") await context.suspend();
		},
		async resume() {
			return unlock();
		},
		async dispose() {
			if (graph) graph.stopAmbience();
			if (context && context.state !== "closed") await context.close();
		},
		debug() {
			return {
				state: context?.state || "locked",
				music: volume,
				sfx: sfxVolume,
				muted,
				phase,
				scheduledNotes: graph?.notes || 0,
				activeSources: graph?.active || 0,
			};
		},
		get music() {
			return volume;
		},
		get sfxVolume() {
			return sfxVolume;
		},
		get context() {
			return context;
		},
		get analyser() {
			return graph?.analyser || null;
		},
	};
}

export async function renderAudioTest() {
	const Offline =
		globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
	if (!Offline)
		return { supported: false, reason: "OfflineAudioContext unavailable" };
	const context = new Offline(2, 44100 * 4, 44100);
	const graph = makeGraph(context, context.destination);
	for (let i = 0; i < 12; i++) graph.musicStep(i, 0.05 + i * 0.25, "escape");
	graph.sound("whip", 0.3);
	graph.sound("coin", 0.8);
	graph.sound("puzzle", 1.2);
	graph.sound("relic", 1.8);
	graph.voice("Numa tala!", 2.2);
	const buffer = await context.startRendering();
	let sum = 0,
		peak = 0,
		finite = true;
	for (let c = 0; c < buffer.numberOfChannels; c++)
		for (const value of buffer.getChannelData(c)) {
			sum += value * value;
			peak = Math.max(peak, Math.abs(value));
			if (!Number.isFinite(value)) finite = false;
		}
	return {
		supported: true,
		finite,
		rms: Math.sqrt(sum / (buffer.length * buffer.numberOfChannels)),
		peak,
		seconds: buffer.duration,
		musicDefault: MUSIC_DEFAULT,
	};
}
