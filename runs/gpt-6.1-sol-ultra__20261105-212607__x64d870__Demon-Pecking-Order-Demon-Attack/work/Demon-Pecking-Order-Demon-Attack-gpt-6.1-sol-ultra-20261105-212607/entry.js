import * as THREE from 'three/webgpu';
import RAPIER from '@dimforge/rapier3d-compat';
window.GAME_INFO={"sourceInformation":{"date":"2026-11-05 21:26:07","source":"Demon Attack (1982), Imagic; Rob Fulop. Original interpretation; no source assets.","plan":"none","genre":"Arcade fixed-screen shooter","perspective":"Front-facing orthographic 2.5D arena","tech":"Three.js r180 WebGPURenderer (WebGPU, WebGL compatibility fallback); Rapier 0.19.3; Web Audio; Gamepad API; AI Hub session client 1.4.0; optional PeerJS 1.5.5; bundled with esbuild 0.28.2","artDirection":"Procedural cel-shaded / ink illustration: faceted paper-wing demons, heavy outlines, icy crags and an eclipsed moon","animation":"Three.js AnimationMixer, AnimationClip and NumberKeyframeTrack wing and thruster cycles; procedural movement, recoil and impact animation","audio":"Code-only Web Audio music, percussion, laser and impact effects, and formant-based gibberish voices; music defaults to 10%","online":"1–2 player shared-world AI Hub co-op; standalone PeerJS WebRTC room codes; local simultaneous co-op","testing":"Headless Chromium153 software WebGPU; full six-wave AI patrol; two full attract loops; keyboard, emulated standard gamepad, touch profile, live sliders, OfflineAudioContext; 2-page co-op and official AI Hub harness at150ms latency/50ms jitter/5% loss; render-free Rapier stress and WebGL visual checks. No physical controller or listener.","research":"Original Atari 2600 manual and AtariAge audiovisual notes; MobyGames mechanics and port descriptions; AI Hub protocol/client/harness; official Three.js and Rapier documentation","environment":"Codex CLI (headless); Linux","model":"OpenAI, gpt-6.1-sol, reasoning effort ultra","usage":"added on import"},"testingFeedback":["5 gameplay issues fixed; networking review identified 5 additional integration issues. Test-only expectation mistakes are excluded.","2 critical issues: an initial mouse click could be lost, and collider churn could crash the physics simulation.","The complete scripted six-wave patrol exposed the Rapier crash; repeated full attract loops verified the fix and replay behavior.","Headless software WebGPU screenshots were blank. State checks and WebGL compatibility screenshots supplied the useful evidence."],"engineFeedback":["Three.js native AnimationMixer clips and the scene graph made procedural winged characters and a layered ink illustration straightforward.","Rapier 0.19.3 reproduced an upstream collider-churn crash. Disabling CCD did not fix it; persistent physics-body pools did.","The combat rules, host-authoritative shared world, controller focus, procedural art and synthesized audio.","Diagnosing the Rapier broadphase failure and coordinating collision lifetimes with wave progression and network results.","none; application-level collider pooling avoids the version-specific issue without modifying engine source.","A first-party cel material with consistent WebGPU and WebGL behavior, plus clearer diagnostics for native physics failures."],"promptFeedback":["The specific source, controller-first direction and complete-demo requirement gave the design a clear identity.","The word Online supplied a library URL rather than defining whether standalone internet rooms were required; both were implemented.","Finishing and verifying standalone and AI Hub co-op within a single self-contained HTML artifact.","Define the minimum standalone network transport and clarify whether WebGL fallback is welcome on browsers without WebGPU."]};
/* All sound is synthesized here; no samples, speech services, or audio files. */
class SynthAudio {
	constructor() {
		this.ctx = null;
		this.musicVolume = 0.1;
		this.sfxVolume = 0.7;
		this.muted = false;
		this.paused = false;
		this.intensity = 1;
		this.playing = false;
		this.nextStep = 0;
		this.step = 0;
		this.bpm = 110;
		this.nodes = new Set();
		this.lastSounds = new Map();
		this.metrics = {
			unlocked: false,
			events: 0,
			musicSteps: 0,
			voices: 0,
			rms: 0,
		};
	}

	_attach(ctx) {
		this.ctx = ctx;
		this.musicBus = ctx.createGain();
		this.sfxBus = ctx.createGain();
		this.master = ctx.createGain();
		this.compressor = ctx.createDynamicsCompressor();
		this.compressor.threshold.value = -12;
		this.compressor.knee.value = 12;
		this.compressor.ratio.value = 5;
		this.compressor.attack.value = 0.003;
		this.compressor.release.value = 0.12;
		this.analyser = ctx.createAnalyser();
		this.analyser.fftSize = 512;
		this.levelData = new Float32Array(this.analyser.fftSize);
		this.musicBus.connect(this.master);
		this.sfxBus.connect(this.master);
		this.master.connect(this.compressor);
		this.compressor.connect(this.analyser);
		this.analyser.connect(ctx.destination);
		this.musicBus.gain.value = this.musicVolume;
		this.sfxBus.gain.value = this.sfxVolume;
		this.master.gain.value = this.muted || this.paused ? 0 : 0.75;
		this.noiseBuffer = ctx.createBuffer(
			1,
			Math.ceil(ctx.sampleRate),
			ctx.sampleRate,
		);
		const noise = this.noiseBuffer.getChannelData(0);
		let seed = 65537;
		for (let i = 0; i < noise.length; i++) {
			seed = (seed * 16807) % 2147483647;
			noise[i] = (seed / 2147483647) * 2 - 1;
		}
		this.nextStep = ctx.currentTime + 0.035;
	}

	async unlock() {
		try {
			if (!this.ctx) {
				const Context =
					globalThis.AudioContext || globalThis.webkitAudioContext;
				if (!Context) return false;
				this._attach(new Context());
			}
			if (this.ctx.state === "suspended") await this.ctx.resume();
			this.metrics.unlocked = this.ctx.state === "running";
			this.nextStep = this.ctx.currentTime + 0.035;
			return this.metrics.unlocked;
		} catch (error) {
			this.metrics.error = String(error);
			return false;
		}
	}

	_gain(node, value) {
		if (!node || !this.ctx) return;
		node.gain.cancelScheduledValues(this.ctx.currentTime);
		node.gain.setTargetAtTime(value, this.ctx.currentTime, 0.015);
	}

	setMusic(volume) {
		this.musicVolume = Math.max(0, Math.min(1, Number(volume) || 0));
		this._gain(this.musicBus, this.musicVolume);
	}

	setSfx(volume) {
		this.sfxVolume = Math.max(0, Math.min(1, Number(volume) || 0));
		this._gain(this.sfxBus, this.sfxVolume);
	}

	setMuted(value) {
		this.muted = !!value;
		this._gain(this.master, this.muted || this.paused ? 0 : 0.75);
	}

	setPaused(value) {
		const next = !!value;
		if (next === this.paused) return;
		this.paused = next;
		if (this.ctx) {
			this._gain(this.master, this.muted || next ? 0 : 0.75);
			if (next) this._stopAll();
			this.nextStep = this.ctx.currentTime + 0.04;
		}
	}

	setIntensity(wave) {
		this.intensity = Math.max(1, Math.min(12, Number(wave) || 1));
	}

	_stopAll() {
		for (const source of this.nodes) {
			try {
				source.stop();
			} catch (_) {
				/* A source may have finished this frame. */
			}
		}
		this.nodes.clear();
	}

	_remember(source, end) {
		this.nodes.add(source);
		source.onended = () => {
			this.nodes.delete(source);
			source.disconnect();
		};
		source.stop(end);
	}

	_tone(freq, duration, type, volume, time, bus, endFreq, pan = 0) {
		const ctx = this.ctx;
		if (!ctx || !Number.isFinite(freq)) return;
		const oscillator = ctx.createOscillator();
		const envelope = ctx.createGain();
		const stereo = ctx.createStereoPanner();
		const start = Math.max(ctx.currentTime, time);
		oscillator.type = type;
		oscillator.frequency.setValueAtTime(Math.max(20, freq), start);
		if (endFreq)
			oscillator.frequency.exponentialRampToValueAtTime(
				Math.max(20, endFreq),
				start + duration,
			);
		envelope.gain.setValueAtTime(0.0001, start);
		envelope.gain.exponentialRampToValueAtTime(
			Math.max(0.0002, volume),
			start + Math.min(0.008, duration * 0.12),
		);
		envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
		stereo.pan.value = Math.max(-1, Math.min(1, pan));
		oscillator.connect(envelope);
		envelope.connect(stereo);
		stereo.connect(bus || this.sfxBus);
		oscillator.start(start);
		this._remember(oscillator, start + duration + 0.02);
		oscillator.addEventListener(
			"ended",
			() => {
				envelope.disconnect();
				stereo.disconnect();
			},
			{ once: true },
		);
	}

	_noise(
		duration,
		volume,
		time,
		frequency = 1400,
		bus = this.sfxBus,
		highpass = false,
	) {
		const ctx = this.ctx;
		const source = ctx.createBufferSource();
		const filter = ctx.createBiquadFilter();
		const envelope = ctx.createGain();
		const start = Math.max(ctx.currentTime, time);
		source.buffer = this.noiseBuffer;
		filter.type = highpass ? "highpass" : "lowpass";
		filter.frequency.setValueAtTime(frequency, start);
		filter.frequency.exponentialRampToValueAtTime(
			highpass ? Math.max(400, frequency * 0.5) : 90,
			start + duration,
		);
		filter.Q.value = 0.6;
		envelope.gain.setValueAtTime(Math.max(0.0002, volume), start);
		envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
		source.connect(filter);
		filter.connect(envelope);
		envelope.connect(bus);
		source.start(start);
		this._remember(source, start + duration + 0.02);
		source.addEventListener(
			"ended",
			() => {
				filter.disconnect();
				envelope.disconnect();
			},
			{ once: true },
		);
	}

	_voice(time, mood = "wave") {
		const ctx = this.ctx;
		const patterns = {
			wave: [
				[0, 260, 0],
				[0.1, 370, 2],
				[0.21, 310, 1],
				[0.34, 460, 3],
			],
			boss: [
				[0, 130, 3],
				[0.15, 170, 0],
				[0.29, 145, 2],
				[0.43, 105, 1],
			],
			win: [
				[0, 330, 1],
				[0.1, 440, 0],
				[0.21, 550, 3],
				[0.35, 660, 2],
				[0.49, 440, 0],
			],
		};
		const vowels = [
			[750, 1150],
			[380, 2100],
			[320, 850],
			[550, 1550],
		];
		for (const [delay, base, vowel] of patterns[mood] || patterns.wave) {
			const start = Math.max(ctx.currentTime, time + delay);
			const source = ctx.createOscillator();
			source.type = "sawtooth";
			source.frequency.setValueAtTime(base, start);
			source.frequency.exponentialRampToValueAtTime(base * 1.16, start + 0.055);
			source.frequency.exponentialRampToValueAtTime(base * 0.86, start + 0.11);
			const envelope = ctx.createGain();
			envelope.gain.setValueAtTime(0.0001, start);
			envelope.gain.exponentialRampToValueAtTime(0.1, start + 0.012);
			envelope.gain.exponentialRampToValueAtTime(0.0001, start + 0.12);
			const filters = vowels[vowel].map((frequency) => {
				const filter = ctx.createBiquadFilter();
				filter.type = "bandpass";
				filter.frequency.value = frequency;
				filter.Q.value = 5;
				source.connect(filter);
				filter.connect(envelope);
				return filter;
			});
			envelope.connect(this.sfxBus);
			source.start(start);
			this._remember(source, start + 0.14);
			source.addEventListener(
				"ended",
				() => {
					filters.forEach((filter) => filter.disconnect());
					envelope.disconnect();
				},
				{ once: true },
			);
		}
		this.metrics.voices++;
	}

	_sound(name, time, pitch = 1) {
		const p = Math.max(0.25, Math.min(4, Number(pitch) || 1));
		const tone = (f, d, type, v, offset = 0, end, pan = 0) =>
			this._tone(
				f * p,
				d,
				type,
				v,
				time + offset,
				this.sfxBus,
				end ? end * p : undefined,
				pan,
			);
		switch (name) {
			case "shoot":
				tone(1250, 0.085, "square", 0.065, 0, 430);
				tone(2100, 0.035, "sine", 0.055, 0, 850);
				break;
			case "hit":
				tone(560, 0.07, "triangle", 0.19, 0, 150);
				this._noise(0.055, 0.11, time, 2600);
				break;
			case "explode":
				this._noise(0.33, 0.24, time, 3800);
				tone(150, 0.3, "sawtooth", 0.15, 0, 28);
				tone(390, 0.13, "square", 0.08, 0.02, 70);
				break;
			case "split":
				tone(320, 0.15, "square", 0.12, 0, 900, -0.6);
				tone(480, 0.18, "square", 0.1, 0.04, 1300, 0.6);
				this._noise(0.1, 0.11, time, 2700);
				break;
			case "dive":
				tone(1100, 0.42, "sawtooth", 0.1, 0, 90);
				tone(1150, 0.37, "triangle", 0.1, 0.025, 70);
				break;
			case "hurt":
				this._noise(0.26, 0.27, time, 1900);
				tone(220, 0.3, "sawtooth", 0.18, 0, 45);
				tone(185, 0.3, "square", 0.09, 0.03, 38);
				break;
			case "shield":
				tone(130, 0.36, "triangle", 0.16, 0, 900);
				[0, 0.055, 0.11, 0.165].forEach((d, i) =>
					tone(
						390 + i * 150,
						0.2,
						"sine",
						0.12,
						d,
						1100 + i * 100,
						i % 2 ? 0.5 : -0.5,
					),
				);
				this._noise(0.2, 0.15, time, 4200, this.sfxBus, true);
				break;
			case "wave":
				[0, 3, 7, 12].forEach((n, i) =>
					tone(220 * 2 ** (n / 12), 0.19, "triangle", 0.13, i * 0.075),
				);
				this._voice(time + 0.3, "wave");
				break;
			case "boss":
				[0, 0.13, 0.26].forEach((d, i) => {
					tone(98 - i * 8, 0.32, "sawtooth", 0.16, d, 48);
					this._noise(0.18, 0.16, time + d, 1000);
				});
				this._voice(time + 0.43, "boss");
				break;
			case "win":
				[0, 4, 7, 12, 7, 12, 16, 19].forEach((n, i) =>
					tone(
						330 * 2 ** (n / 12),
						0.3,
						"triangle",
						0.13,
						i * 0.11,
						undefined,
						i % 2 ? 0.3 : -0.3,
					),
				);
				this._voice(time + 0.8, "win");
				break;
			case "pickup":
				[0, 7, 12].forEach((n, i) =>
					tone(660 * 2 ** (n / 12), 0.16, "sine", 0.15, i * 0.065),
				);
				break;
			case "menu":
				tone(620, 0.045, "triangle", 0.12, 0, 810);
				break;
			default:
				tone(440, 0.09, "triangle", 0.08);
		}
		this.metrics.events++;
	}

	sfx(name, pitch = 1) {
		if (!this.ctx || this.ctx.state !== "running" || this.muted || this.paused)
			return;
		const now = this.ctx.currentTime;
		const interval =
			name === "shoot"
				? 0.045
				: name === "hit"
					? 0.025
					: name === "menu"
						? 0.05
						: 0.01;
		if (now - (this.lastSounds.get(name) ?? -Infinity) < interval) return;
		this.lastSounds.set(name, now);
		this._sound(name, now + 0.002, pitch);
	}

	_scheduleStep(step, time) {
		const sixteenth = 60 / this.bpm / 4;
		const beat = step % 16;
		const bar = Math.floor(step / 16) % 8;
		const roots = [45, 45, 41, 41, 50, 50, 40, 40];
		const root = roots[bar];
		const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);
		const bus = this.musicBus;
		// A springy ostinato and a tiny music-box answer keep the menace playful.
		if (beat % 2 === 0) {
			const bass =
				root + (beat === 6 || beat === 14 ? 12 : beat === 10 ? 7 : 0);
			this._tone(
				hz(bass),
				sixteenth * 1.5,
				"triangle",
				0.38,
				time,
				bus,
				hz(bass) * 0.985,
			);
			this._tone(hz(bass) / 2, sixteenth * 1.3, "sine", 0.25, time, bus);
		}
		const chord = bar === 6 || bar === 7 ? [0, 4, 7, 11] : [0, 3, 7, 10];
		const sequence = [0, 2, 1, 3, 2, 1, 3, 2, 0, 2, 1, 2, 3, 1, 2, 3];
		if (beat % 2 === 1 || this.intensity >= 4) {
			const note = root + 24 + chord[sequence[beat]];
			this._tone(
				hz(note),
				sixteenth * 1.35,
				"triangle",
				0.16,
				time,
				bus,
				undefined,
				((beat % 4) - 1.5) * 0.32,
			);
			this._tone(hz(note) * 2.002, sixteenth * 0.6, "sine", 0.055, time, bus);
			// A single quiet echo creates space without a sample or convolution file.
			this._tone(
				hz(note),
				sixteenth * 1.4,
				"triangle",
				0.045,
				time + sixteenth * 3,
				bus,
				undefined,
				(1.5 - (beat % 4)) * 0.32,
			);
		}
		if (beat === 0 || beat === 8 || (this.intensity >= 5 && beat === 11)) {
			this._tone(135, 0.15, "sine", 0.65, time, bus, 38);
			this._noise(0.025, 0.11, time, 1300, bus);
		}
		if (beat === 4 || beat === 12) {
			this._noise(0.13, 0.3, time, 3200, bus, true);
			this._tone(185, 0.07, "triangle", 0.19, time, bus, 110);
		}
		if (beat % 2 === 0 || this.intensity >= 3)
			this._noise(
				beat === 14 ? 0.1 : 0.035,
				beat % 4 === 0 ? 0.11 : 0.065,
				time,
				6000,
				bus,
				true,
			);
		if (bar % 2 === 1 && [10, 12, 14].includes(beat)) {
			const note = hz(root + 36 + [7, 3, 0][(beat - 10) / 2]);
			this._tone(note, 0.21, "sine", 0.14, time, bus, undefined, 0.35);
		}
		this.metrics.musicSteps++;
	}

	tick(dt, playing = true) {
		if (!this.ctx || this.ctx.state !== "running") return;
		if (this.playing !== !!playing) {
			this.playing = !!playing;
			this._gain(this.musicBus, playing ? this.musicVolume : 0);
			this.nextStep = this.ctx.currentTime + 0.035;
		}
		if (this.paused || this.muted || !playing) {
			this.nextStep = this.ctx.currentTime + 0.035;
			this.metrics.rms = 0;
			return;
		}
		const now = this.ctx.currentTime;
		if (this.nextStep < now - 0.1) this.nextStep = now + 0.025;
		while (this.nextStep < now + 0.12) {
			this._scheduleStep(this.step++, this.nextStep);
			this.nextStep += 60 / this.bpm / 4;
		}
		this.analyser.getFloatTimeDomainData(this.levelData);
		let square = 0;
		for (const value of this.levelData) square += value * value;
		this.metrics.rms = Math.sqrt(square / this.levelData.length);
	}

	close() {
		this._stopAll();
		if (this.ctx && typeof this.ctx.close === "function") this.ctx.close();
		this.ctx = null;
		this.metrics.unlocked = false;
	}

	static async renderTest(sampleRate = 22050) {
		const Offline =
			globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
		if (!Offline) return { supported: false, rms: 0, peak: 0 };
		const duration = 3;
		const ctx = new Offline(2, sampleRate * duration, sampleRate);
		const synth = new SynthAudio();
		synth._attach(ctx);
		synth.setIntensity(5);
		for (let step = 0; step < 20; step++)
			synth._scheduleStep(step, 0.01 + (step * 60) / 110 / 4);
		[
			"shoot",
			"hit",
			"explode",
			"split",
			"dive",
			"shield",
			"pickup",
			"wave",
		].forEach((name, index) => synth._sound(name, 0.05 + index * 0.3));
		const buffer = await ctx.startRendering();
		let squares = 0;
		let peak = 0;
		let nonzero = 0;
		for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
			for (const value of buffer.getChannelData(channel)) {
				squares += value * value;
				peak = Math.max(peak, Math.abs(value));
				if (Math.abs(value) > 0.00001) nonzero++;
			}
		}
		return {
			supported: true,
			rms: Math.sqrt(squares / (buffer.length * buffer.numberOfChannels)),
			peak,
			nonzero,
			duration,
			musicSteps: synth.metrics.musicSteps,
			voices: synth.metrics.voices,
			events: synth.metrics.events,
		};
	}
}

/* Procedural ink-and-cel stage and actors. All assets are made from geometry. */
class GameVisuals {
	constructor(scene) {
		this.scene = scene;
		this.mixers = [];
		this.effects = [];
		this.starObjects = [];
		this.stage = new THREE.Group();
		this.stage.name = "KryborInkStage";
		this.scene.add(this.stage);
		this.seed = 1982;
		this.ink = 0x080c21;
		this.palette = [0xfa5589, 0xffb34f, 0x64e9e2, 0xc791ff];
		this.materials = new Map();
	}
	random() {
		this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
		return this.seed / 4294967296;
	}
	material(color, lit = true, emissive = 0) {
		const key = `${color}:${lit}:${emissive}`;
		if (!this.materials.has(key))
			this.materials.set(
				key,
				lit
					? new THREE.MeshStandardMaterial({
							color,
							roughness: 0.94,
							metalness: 0,
							flatShading: true,
							emissive: color,
							emissiveIntensity: emissive,
						})
					: new THREE.MeshBasicMaterial({ color }),
			);
		return this.materials.get(key);
	}
	shape(points, depth = 0.14) {
		const shape = new THREE.Shape();
		points.forEach((p, i) =>
			i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1]),
		);
		shape.closePath();
		const g = new THREE.ExtrudeGeometry(shape, {
			depth,
			bevelEnabled: true,
			bevelSegments: 1,
			steps: 1,
			bevelSize: 0.025,
			bevelThickness: 0.025,
		});
		g.translate(0, 0, -depth / 2);
		return g;
	}
	mesh(geometry, color, ink = true, lit = true, emissive = 0) {
		const root = new THREE.Group();
		if (ink) {
			const outline = new THREE.Mesh(
				geometry,
				new THREE.MeshBasicMaterial({ color: this.ink, side: THREE.BackSide }),
			);
			outline.scale.setScalar(1.09);
			root.add(outline);
		}
		const mesh = new THREE.Mesh(geometry, this.material(color, lit, emissive));
		root.add(mesh);
		root.userData.face = mesh;
		return root;
	}
	polygon(points, color, depth = 0.14, ink = true, lit = true) {
		return this.mesh(this.shape(points, depth), color, ink, lit);
	}
	part(parent, object, x = 0, y = 0, z = 0, scale = 1) {
		object.position.set(x, y, z);
		object.scale.setScalar(scale);
		parent.add(object);
		return object;
	}
	disc(radius, color, segments = 48) {
		return new THREE.Mesh(
			new THREE.CircleGeometry(radius, segments),
			this.material(color, false),
		);
	}
	line(points, color = 0x5d8399, opacity = 1) {
		return new THREE.Line(
			new THREE.BufferGeometry().setFromPoints(
				points.map((p) => new THREE.Vector3(...p)),
			),
			new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }),
		);
	}
	buildStage() {
		this.scene.background = new THREE.Color(0x0c122b);
		this.scene.add(new THREE.HemisphereLight(0xb6e5ff, 0x382044, 2.2));
		const key = new THREE.DirectionalLight(0xffebbd, 3.2);
		key.position.set(-10, 20, 30);
		this.scene.add(key);
		const rim = new THREE.DirectionalLight(0x61bcf7, 1.8);
		rim.position.set(12, 2, 5);
		this.scene.add(rim);

		const backdrop = this.polygon(
			[
				[-75, -20],
				[75, -20],
				[75, 45],
				[-75, 45],
			],
			0x0c122b,
			0.05,
			false,
			false,
		);
		backdrop.position.z = -38;
		this.stage.add(backdrop);
		// A quiet field of hand-cut stars, with the large stars shaped like inked diamonds.
		const positions = [],
			colors = [];
		for (let i = 0; i < 290; i++) {
			const x = (this.random() - 0.5) * 91;
			const y = this.random() * 44 - 5;
			positions.push(x, y, -34 + this.random());
			const c = new THREE.Color(i % 4 ? 0x7188b1 : 0xffdda8);
			colors.push(c.r, c.g, c.b);
		}
		const sg = new THREE.BufferGeometry();
		sg.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
		sg.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
		this.stage.add(
			new THREE.Points(
				sg,
				new THREE.PointsMaterial({
					size: 0.075,
					vertexColors: true,
					sizeAttenuation: true,
				}),
			),
		);
		for (let i = 0; i < 21; i++) {
			const star = this.polygon(
				[
					[0, 0.11],
					[0.035, 0.025],
					[0.11, 0],
					[0.035, -0.025],
					[0, -0.11],
					[-0.035, -0.025],
					[-0.11, 0],
					[-0.035, 0.025],
				],
				i % 3 ? 0x8fa7c9 : 0xffd695,
				0.012,
				false,
				false,
			);
			star.position.set(
				(this.random() - 0.5) * 67,
				5 + this.random() * 25,
				-32,
			);
			this.stage.add(star);
			this.starObjects.push(star);
		}

		const moon = new THREE.Group();
		moon.position.set(9.5, 16.5, -27);
		this.part(moon, this.disc(6.95, 0x2c2943), 0, 0, -0.2);
		this.part(moon, this.disc(6.65, 0xf0a66a), 0, 0, 0);
		this.part(moon, this.disc(6.49, 0xffd6a0), 0, 0, 0.015);
		// Long angular bands make the moon read as a printed illustration.
		for (let i = 0; i < 22; i++) {
			const y = -5.9 + i * 0.55;
			const half = Math.sqrt(Math.max(0, 6.4 * 6.4 - y * y));
			const band = this.polygon(
				[
					[-half, y - 0.018],
					[half, y - 0.018],
					[half, y + 0.018],
					[-half, y + 0.018],
				],
				0xe6ae7a,
				0.01,
				false,
				false,
			);
			band.position.z = 0.035;
			moon.add(band);
		}
		for (let i = 0; i < 20; i++) {
			const x = (this.random() - 0.5) * 10,
				y = (this.random() - 0.5) * 10,
				r = 0.13 + this.random() * 0.65;
			if (Math.hypot(x, y) + r > 6.2) continue;
			this.part(moon, this.disc(r, 0xe7b480, 22), x, y, 0.05);
			this.part(
				moon,
				this.disc(r * 0.65, 0xf7c38c, 20),
				x + 0.07,
				y - 0.05,
				0.06,
			);
		}
		this.part(moon, this.disc(5.63, 0x171c37), -2.55, 1.6, 0.11);
		this.part(moon, this.disc(5.4, 0x141a34), -2.55, 1.6, 0.12);
		const orbit = new THREE.Mesh(
			new THREE.TorusGeometry(7.38, 0.024, 3, 120),
			this.material(0x796681, false),
		);
		orbit.rotation.z = 0.18;
		moon.add(orbit);
		this.stage.add(moon);
		this.moon = moon;

		// Distant black-lilac ranges and blue ice are always behind the play plane.
		const layers = [
			{ z: -20, base: -1.4, amp: 5.3, color: 0x171c39, step: 3.1 },
			{ z: -15, base: -2.3, amp: 6.4, color: 0x222c4b, step: 2.8 },
			{ z: -10, base: -3.1, amp: 5.5, color: 0x30465e, step: 2.2 },
			{ z: -6, base: -3.4, amp: 3.9, color: 0x3e6678, step: 2.9 },
		];
		for (const l of layers) {
			const pts = [[-48, -10]];
			for (let x = -48; x <= 48; x += l.step)
				pts.push([x, l.base + this.random() * l.amp]);
			pts.push([48, -10]);
			const range = this.polygon(pts, l.color, 0.12, false, false);
			range.position.z = l.z;
			this.stage.add(range);
			for (let i = 1; i < pts.length - 2; i++) {
				const a = pts[i],
					b = pts[i + 1];
				if (a[1] > b[1] + 0.5) {
					const facet = this.polygon(
						[
							[a[0], a[1]],
							[b[0], b[1]],
							[a[0] + 0.7, -5],
						],
						l.z === -6 ? 0x517c8b : 0x35445e,
						0.02,
						false,
						false,
					);
					facet.position.z = l.z + 0.1;
					this.stage.add(facet);
				}
			}
		}
		const ground = this.polygon(
			[
				[-55, 0.12],
				[55, 0.12],
				[55, -15],
				[-55, -15],
			],
			0x142334,
			0.18,
			false,
			false,
		);
		ground.position.z = -0.6;
		this.stage.add(ground);
		this.stage.add(
			this.line(
				[
					[-40, 0.2, -0.25],
					[40, 0.2, -0.25],
				],
				0x80d4da,
			),
		);
		this.stage.add(
			this.line(
				[
					[-40, 0.08, -0.21],
					[40, 0.08, -0.21],
				],
				0x0a1220,
			),
		);
		for (let i = 0; i < 44; i++) {
			const x = (this.random() - 0.5) * 74,
				y = -0.3 - this.random() * 6;
			const len = 0.2 + this.random() * 1.6;
			this.stage.add(
				this.line(
					[
						[x, y, -0.15],
						[x + len, y + 0.035, -0.15],
					],
					i % 3 ? 0x294858 : 0x4b6e76,
					0.7,
				),
			);
		}
		// Rail sleepers help ground the cannon without making an apparent movement lane.
		for (let x = -35; x < 36; x += 1.45) {
			const tile = this.polygon(
				[
					[-0.4, -0.06],
					[0.42, -0.06],
					[0.5, 0.02],
					[-0.3, 0.02],
				],
				0x467881,
				0.04,
				false,
				false,
			);
			tile.position.set(x, -0.17, 0.05);
			this.stage.add(tile);
		}
		// Tall icy side crags frame the combat area; centre stays clear.
		for (const side of [-1, 1])
			for (let i = 0; i < 11; i++) {
				const x = side * (14.7 + this.random() * 15),
					h = 1 + this.random() * 4.9,
					w = 0.6 + this.random() * 2;
				const ice = this.polygon(
					[
						[-w, -1.5],
						[w, -1.5],
						[w * 0.55, h * 0.4],
						[0, h],
						[-w * 0.32, h * 0.6],
					],
					i % 2 ? 0x49879b : 0x294b63,
					0.4,
					true,
					true,
				);
				ice.position.set(x, -0.2, 1.2 + this.random());
				ice.rotation.z = side * 0.13;
				this.stage.add(ice);
				const facet = this.polygon(
					[
						[0, h],
						[w * 0.55, h * 0.4],
						[w, -1.5],
						[0, -1.5],
					],
					0x6babb1,
					0.03,
					false,
					false,
				);
				facet.position.z = 0.25;
				ice.add(facet);
			}
		// A thin orbit trail / falling star, animated slowly by update().
		this.comet = this.line(
			[
				[-1, 0, 0],
				[0, 0, 0],
			],
			0x7ca4c7,
			0.5,
		);
		this.comet.position.set(-20, 25, -30);
		this.comet.rotation.z = 0.2;
		this.stage.add(this.comet);
		return this.stage;
	}
	animateWings(root, speed = 1, amplitude = 0.32) {
		const clip = new THREE.AnimationClip("paper-wingbeat", 0.72 / speed, [
			new THREE.NumberKeyframeTrack(
				"wingL.rotation[z]",
				[0, 0.18 / speed, 0.36 / speed, 0.54 / speed, 0.72 / speed],
				[-amplitude, 0.14, amplitude, 0.06, -amplitude],
			),
			new THREE.NumberKeyframeTrack(
				"wingR.rotation[z]",
				[0, 0.18 / speed, 0.36 / speed, 0.54 / speed, 0.72 / speed],
				[amplitude, -0.14, -amplitude, -0.06, amplitude],
			),
			new THREE.NumberKeyframeTrack(
				"wingL.rotation[y]",
				[0, 0.36 / speed, 0.72 / speed],
				[-0.35, 0.18, -0.35],
			),
			new THREE.NumberKeyframeTrack(
				"wingR.rotation[y]",
				[0, 0.36 / speed, 0.72 / speed],
				[0.35, -0.18, 0.35],
			),
		]);
		const mixer = new THREE.AnimationMixer(root);
		mixer.clipAction(clip).play();
		mixer.update(this.random() * 0.6);
		root.userData.mixer = mixer;
		this.mixers.push({ root, mixer });
	}
	createShip(index = 0) {
		const g = new THREE.Group();
		g.name = `Cannon${index + 1}`;
		const color = index ? 0x69e7de : 0xffc24c,
			highlight = index ? 0xc2fff1 : 0xffe9ac;
		const outrigger = this.polygon(
			[
				[-0.9, -0.42],
				[-0.75, 0.14],
				[-0.43, 0.27],
				[-0.3, -0.39],
			],
			color,
			0.3,
		);
		g.add(outrigger);
		const right = outrigger.clone();
		right.scale.x = -1;
		g.add(right);
		this.part(
			g,
			this.polygon(
				[
					[-0.55, -0.5],
					[0.55, -0.5],
					[0.62, -0.1],
					[0.36, 0.42],
					[-0.36, 0.42],
					[-0.62, -0.1],
				],
				color,
				0.42,
			),
			0,
			0,
			0.08,
		);
		this.part(
			g,
			this.polygon(
				[
					[-0.42, -0.37],
					[0.4, -0.37],
					[0.43, -0.08],
					[0.26, 0.19],
					[-0.25, 0.19],
					[-0.43, -0.08],
				],
				highlight,
				0.05,
			),
			0,
			0.04,
			0.34,
		);
		this.part(
			g,
			this.polygon(
				[
					[-0.28, -0.07],
					[0.28, -0.07],
					[0.2, 0.2],
					[-0.2, 0.2],
				],
				0x132c43,
				0.05,
			),
			0,
			0.02,
			0.4,
		);
		// Cockpit split into two gleaming eye-like panes.
		this.part(
			g,
			this.polygon(
				[
					[-0.23, 0],
					[-0.035, 0],
					[-0.035, 0.12],
					[-0.17, 0.12],
				],
				0x5ce2dc,
				0.02,
				false,
				false,
			),
			0,
			0.03,
			0.45,
		);
		this.part(
			g,
			this.polygon(
				[
					[0.035, 0],
					[0.23, 0],
					[0.17, 0.12],
					[0.035, 0.12],
				],
				0x5ce2dc,
				0.02,
				false,
				false,
			),
			0,
			0.03,
			0.45,
		);
		this.part(
			g,
			this.mesh(new THREE.BoxGeometry(0.24, 0.61, 0.2), 0x22354e),
			0,
			0.55,
			0.09,
		);
		this.part(
			g,
			this.mesh(new THREE.BoxGeometry(0.3, 0.15, 0.25), highlight),
			0,
			0.83,
			0.1,
		);
		this.part(
			g,
			this.mesh(
				new THREE.BoxGeometry(0.085, 0.18, 0.04),
				0x8ffff2,
				false,
				false,
			),
			0,
			0.87,
			0.26,
		);
		for (const side of [-1, 1]) {
			this.part(
				g,
				this.mesh(new THREE.BoxGeometry(0.2, 0.15, 0.1), 0x17243b),
				side * 0.66,
				-0.27,
				0.23,
			);
			this.part(
				g,
				this.mesh(
					new THREE.BoxGeometry(0.065, 0.18, 0.04),
					highlight,
					false,
					false,
				),
				side * 0.62,
				0.09,
				0.29,
			);
		}
		const flame = this.polygon(
			[
				[-0.21, -0.01],
				[0, -0.52],
				[0.21, -0.01],
			],
			0x64f5ed,
			0.025,
			false,
			false,
		);
		flame.name = "thruster";
		flame.position.set(0, -0.52, -0.05);
		g.add(flame);
		const inner = this.polygon(
			[
				[-0.1, 0],
				[0, -0.3],
				[0.1, 0],
			],
			0xffffff,
			0.02,
			false,
			false,
		);
		inner.position.z = 0.04;
		flame.add(inner);
		const mixer = new THREE.AnimationMixer(g);
		const clip = new THREE.AnimationClip("plasma-idle", 0.22, [
			new THREE.NumberKeyframeTrack(
				"thruster.scale[y]",
				[0, 0.09, 0.15, 0.22],
				[0.65, 1.1, 0.8, 0.65],
			),
		]);
		mixer.clipAction(clip).play();
		g.userData.mixer = mixer;
		this.mixers.push({ root: g, mixer });
		g.userData.color = color;
		return g;
	}
	createEnemy(type = "grunt", paletteIndex = 0) {
		const g = new THREE.Group();
		g.name = `Demon_${type}`;
		const color =
			type === "splitter"
				? 0xc791ff
				: type === "phantom"
					? 0x76e1dc
					: type === "shard"
						? 0xff9dcb
						: 0xffac52;
		const light =
			type === "splitter" ? 0xe8caff : type === "phantom" ? 0xb2fff0 : 0xffb4cb;
		const dark =
			type === "splitter" ? 0x623b88 : type === "phantom" ? 0x2c7e9e : 0x972c68;
		for (const side of [-1, 1]) {
			const w = new THREE.Group();
			w.name = side < 0 ? "wingL" : "wingR";
			w.position.set(side * 0.22, 0.11, 0);
			const wing = this.polygon(
				[
					[0, 0.12],
					[side * 0.62, 0.63],
					[side * 1.35, 0.55],
					[side * 0.95, 0.22],
					[side * 0.73, -0.25],
					[side * 0.53, -0.03],
					[side * 0.3, -0.32],
					[0, -0.13],
				],
				color,
				0.12,
			);
			w.add(wing);
			const facet = this.polygon(
				[
					[0, 0.1],
					[side * 0.62, 0.57],
					[side * 1.15, 0.51],
					[side * 0.62, 0.15],
					[side * 0.48, -0.1],
				],
				light,
				0.025,
				false,
				false,
			);
			facet.position.z = 0.13;
			w.add(facet);
			w.add(
				this.line(
					[
						[0, 0.11, 0.17],
						[side * 0.62, 0.2, 0.17],
						[side * 1.24, 0.54, 0.17],
					],
					this.ink,
				),
			);
			w.add(
				this.line(
					[
						[side * 0.62, 0.2, 0.17],
						[side * 0.73, -0.22, 0.17],
					],
					this.ink,
				),
			);
			g.add(w);
		}
		this.part(
			g,
			this.polygon(
				[
					[-0.28, 0.4],
					[0, 0.59],
					[0.28, 0.4],
					[0.36, 0.02],
					[0.15, -0.39],
					[0, -0.53],
					[-0.15, -0.39],
					[-0.36, 0.02],
				],
				dark,
				0.32,
			),
			0,
			0,
			0.12,
		);
		this.part(
			g,
			this.polygon(
				[
					[-0.28, 0.28],
					[0, 0.47],
					[0.28, 0.28],
					[0.22, -0.09],
					[0, -0.22],
					[-0.22, -0.09],
				],
				color,
				0.07,
			),
			0,
			0,
			0.33,
		);
		// Horns, luminous angry eyes and a pale hooked beak are high contrast at TV distance.
		for (const side of [-1, 1]) {
			this.part(
				g,
				this.polygon(
					[
						[0, 0],
						[side * 0.17, 0.44],
						[side * 0.24, -0.07],
					],
					light,
					0.1,
				),
				side * 0.18,
				0.34,
				0.15,
			);
			this.part(
				g,
				this.polygon(
					[
						[-0.13, 0.055],
						[0.11, -0.01],
						[0.055, -0.105],
						[-0.1, -0.08],
					],
					0x0a1026,
					0.035,
					false,
					false,
				),
				side * 0.14,
				0.13,
				0.43,
			);
			this.part(
				g,
				this.mesh(
					new THREE.SphereGeometry(0.047, 6, 4),
					0xfff5d3,
					false,
					false,
				),
				side * 0.135,
				0.075,
				0.47,
			);
		}
		this.part(
			g,
			this.polygon(
				[
					[-0.12, -0.05],
					[0.1, -0.05],
					[0, -0.32],
				],
				0xffdda4,
				0.06,
			),
			0,
			-0.1,
			0.42,
		);
		this.part(
			g,
			this.polygon(
				[
					[-0.07, 0],
					[0, -0.35],
					[0.07, 0],
				],
				color,
				0.07,
			),
			0,
			-0.37,
			0.04,
		);
		if (type === "splitter") {
			this.part(
				g,
				this.polygon(
					[
						[-0.06, 0.17],
						[0.04, 0.06],
						[-0.035, -0.04],
						[0.065, -0.16],
						[0.005, -0.26],
					],
					0x331d42,
					0.025,
					false,
					false,
				),
				0,
				-0.03,
				0.5,
			);
			const sigil = this.mesh(
				new THREE.OctahedronGeometry(0.11, 0),
				0xffeabb,
				true,
				false,
			);
			sigil.position.set(0, 0.33, 0.5);
			g.add(sigil);
		}
		if (type === "phantom") {
			const ring = new THREE.Mesh(
				new THREE.TorusGeometry(0.62, 0.018, 3, 32),
				this.material(0x83f6df, false),
			);
			ring.position.z = -0.15;
			g.add(ring);
		}
		if (type === "shard") g.scale.setScalar(0.57);
		this.animateWings(g, type === "shard" ? 1.8 : 1, 0.3);
		g.userData.color = color;
		return g;
	}
	createBoss() {
		const g = new THREE.Group();
		g.name = "TheGrandPecker";
		for (const side of [-1, 1]) {
			const wing = new THREE.Group();
			wing.name = side < 0 ? "wingL" : "wingR";
			wing.position.set(side * 0.48, 0.2, -0.02);
			wing.add(
				this.polygon(
					[
						[0, 0.3],
						[side * 1.0, 1.2],
						[side * 2.9, 0.8],
						[side * 2.5, 0.35],
						[side * 2.1, 0.4],
						[side * 1.5, -0.65],
						[side * 1.3, -0.1],
						[side * 0.8, -0.8],
						[side * 0.4, -0.24],
						[0, -0.35],
					],
					0x8b488f,
					0.28,
				),
			);
			const top = this.polygon(
				[
					[0, 0.28],
					[side * 1.05, 1.12],
					[side * 2.7, 0.78],
					[side * 1.3, 0.39],
					[side * 0.8, -0.13],
				],
				0xe879a0,
				0.06,
				false,
				false,
			);
			top.position.z = 0.2;
			wing.add(top);
			for (let j = 0; j < 3; j++)
				wing.add(
					this.line(
						[
							[side * 0.1, 0.15, 0.3],
							[side * (0.9 + j * 0.6), 0.45, 0.3],
							[side * (0.8 + j * 0.65), -0.4 + j * 0.25, 0.3],
						],
						0x14142b,
					),
				);
			this.part(
				wing,
				this.mesh(new THREE.OctahedronGeometry(0.2), 0xffd572),
				side * 1.3,
				0.45,
				0.3,
			);
			g.add(wing);
		}
		this.part(
			g,
			this.polygon(
				[
					[-0.75, 0.75],
					[0, 1.24],
					[0.75, 0.75],
					[0.9, 0.02],
					[0.55, -0.98],
					[0, -1.4],
					[-0.55, -0.98],
					[-0.9, 0.02],
				],
				0x9e486e,
				0.5,
			),
			0,
			0,
			0.1,
		);
		this.part(
			g,
			this.polygon(
				[
					[-0.58, 0.6],
					[0, 1.02],
					[0.58, 0.6],
					[0.5, -0.25],
					[0, -0.68],
					[-0.5, -0.25],
				],
				0xf1a368,
				0.12,
			),
			0,
			0.03,
			0.44,
		);
		this.part(
			g,
			this.polygon(
				[
					[-0.35, 0.76],
					[-0.28, 1.65],
					[0, 1.3],
					[0.28, 1.65],
					[0.35, 0.76],
				],
				0xffd974,
				0.19,
			),
			0,
			0.25,
			0.24,
		);
		for (const side of [-1, 1]) {
			this.part(
				g,
				this.polygon(
					[
						[-0.31, 0.08],
						[0.25, -0.04],
						[0.17, -0.25],
						[-0.24, -0.19],
					],
					0x12192b,
					0.06,
				),
				side * 0.36,
				0.27,
				0.6,
			);
			this.part(
				g,
				this.mesh(new THREE.OctahedronGeometry(0.115), 0x8ffff0, false, false),
				side * 0.35,
				0.11,
				0.69,
			);
			this.part(
				g,
				this.polygon(
					[
						[0, 0.2],
						[side * 0.65, 0.7],
						[side * 0.55, -0.12],
					],
					0xffd979,
					0.2,
				),
				side * 0.56,
				0.52,
				0.19,
			);
		}
		this.part(
			g,
			this.polygon(
				[
					[-0.27, 0.13],
					[0.27, 0.13],
					[0.18, -0.3],
					[0, -0.58],
					[-0.18, -0.3],
				],
				0xffebba,
				0.18,
			),
			0,
			-0.25,
			0.65,
		);
		const core = this.mesh(
			new THREE.IcosahedronGeometry(0.31, 0),
			0x63efdb,
			true,
			false,
		);
		core.position.set(0, -0.91, 0.5);
		core.name = "bossCore";
		g.add(core);
		const mixer = new THREE.AnimationMixer(core);
		mixer
			.clipAction(
				new THREE.AnimationClip("heart-pulse", 0.8, [
					new THREE.NumberKeyframeTrack(
						".scale[x]",
						[0, 0.4, 0.8],
						[1, 1.16, 1],
					),
					new THREE.NumberKeyframeTrack(
						".scale[y]",
						[0, 0.4, 0.8],
						[1, 1.16, 1],
					),
				]),
			)
			.play();
		this.mixers.push({ root: g, mixer });
		this.animateWings(g, 0.65, 0.14);
		const armorHalo = new THREE.Group();
		armorHalo.name = "armorHalo";
		armorHalo.position.set(0, 0, 0.82);
		const arc = new THREE.Mesh(
			new THREE.RingGeometry(1.4, 1.45, 42, 1, 0, Math.PI * 1.66),
			this.material(0xffb565, false),
		);
		armorHalo.add(arc);
		const innerArc = new THREE.Mesh(
			new THREE.RingGeometry(1.3, 1.32, 36, 1, Math.PI, Math.PI * 1.25),
			this.material(0x9c6471, false),
		);
		armorHalo.add(innerArc);
		for (let i = 0; i < 4; i++) {
			const a = i * Math.PI * 0.5;
			const lock = this.mesh(
				new THREE.OctahedronGeometry(0.11, 0),
				0xffd797,
				true,
				false,
			);
			lock.position.set(Math.cos(a) * 1.425, Math.sin(a) * 1.425, 0.03);
			armorHalo.add(lock);
		}
		g.add(armorHalo);
		const coreGlow = new THREE.Group();
		coreGlow.position.copy(core.position);
		coreGlow.position.z = 0.81;
		const glowRing = new THREE.Mesh(
			new THREE.RingGeometry(0.42, 0.45, 32),
			this.material(0x7fffea, false),
		);
		coreGlow.add(glowRing);
		for (const side of [-1, 1])
			for (const axis of [0, 1]) {
				const a = axis * Math.PI * 0.5;
				coreGlow.add(
					this.line(
						[
							[Math.cos(a) * side * 0.56, Math.sin(a) * side * 0.56, 0],
							[Math.cos(a) * side * 0.74, Math.sin(a) * side * 0.74, 0],
						],
						0x7fffea,
					),
				);
			}
		g.add(coreGlow);
		armorHalo.visible = false;
		g.userData.core = core;
		g.userData.armorHalo = armorHalo;
		g.userData.coreGlow = coreGlow;
		g.userData.color = 0xffb565;
		return g;
	}
	createShot(enemy = false) {
		const g = new THREE.Group();
		if (enemy) {
			g.add(
				this.mesh(new THREE.OctahedronGeometry(0.22, 0), 0xff8b79, true, false),
			);
			this.part(
				g,
				this.mesh(new THREE.OctahedronGeometry(0.1, 0), 0xfff0b3, false, false),
				0,
				0,
				0.22,
			);
			const tail = this.polygon(
				[
					[-0.12, 0],
					[0, 0.72],
					[0.12, 0],
				],
				0xcc5472,
				0.02,
				false,
				false,
			);
			tail.position.z = -0.04;
			g.add(tail);
		} else {
			this.part(
				g,
				this.mesh(
					new THREE.BoxGeometry(0.13, 0.72, 0.1),
					0x83fff0,
					true,
					false,
				),
				0,
				0,
				0,
			);
			this.part(
				g,
				this.mesh(
					new THREE.BoxGeometry(0.045, 0.47, 0.04),
					0xffffff,
					false,
					false,
				),
				0,
				0.04,
				0.09,
			);
			this.part(
				g,
				this.mesh(
					new THREE.BoxGeometry(0.035, 0.22, 0.03),
					0x4b9aab,
					false,
					false,
				),
				0,
				-0.52,
				0,
			);
		}
		return g;
	}
	burst(x, y, color = 0xffc275, count = 16) {
		const ring = new THREE.Mesh(
			new THREE.RingGeometry(0.38, 0.48, 10),
			new THREE.MeshBasicMaterial({
				color,
				transparent: true,
				opacity: 0.95,
				side: THREE.DoubleSide,
			}),
		);
		ring.position.set(x, y, 1);
		this.scene.add(ring);
		this.effects.push({
			object: ring,
			life: 0.38,
			max: 0.38,
			vx: 0,
			vy: 0,
			ring: true,
		});
		for (let i = 0; i < count; i++) {
			const angle = this.random() * Math.PI * 2,
				speed = 1.8 + this.random() * 7;
			const shard = this.mesh(
				new THREE.TetrahedronGeometry(0.07 + this.random() * 0.13, 0),
				i % 4 === 0 ? 0xfff4cb : color,
				false,
				false,
			);
			shard.position.set(x, y, 0.2 + this.random() * 0.8);
			this.scene.add(shard);
			const life = 0.35 + this.random() * 0.48;
			this.effects.push({
				object: shard,
				life,
				max: life,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				spin: (this.random() - 0.5) * 15,
				ring: false,
			});
		}
	}
	remove(group) {
		if (!group) return;
		this.mixers = this.mixers.filter(({ root, mixer }) => {
			if (root !== group) return true;
			mixer.stopAllAction();
			mixer.uncacheRoot(mixer.getRoot());
			return false;
		});
		group.removeFromParent();
		const geometries = new Set(),
			materials = new Set();
		group.traverse((o) => {
			if (o.geometry) geometries.add(o.geometry);
			if (o.material && ![...this.materials.values()].includes(o.material))
				materials.add(o.material);
		});
		geometries.forEach((g) => g.dispose());
		materials.forEach((m) => m.dispose());
	}
	resetEffects() {
		for (const e of this.effects) {
			this.scene.remove(e.object);
			this.disposeEffect(e);
		}
		this.effects.length = 0;
	}
	disposeEffect(e) {
		e.object.traverse((o) => {
			if (o.geometry) o.geometry.dispose();
			if (e.ring && o.material) o.material.dispose();
		});
	}
	update(dt, time) {
		// Removed actor mixers are released so replaying does not accumulate animations.
		this.mixers = this.mixers.filter(({ root, mixer }) => {
			if (!root.parent && root.userData.hasBeenAttached) {
				mixer.stopAllAction();
				mixer.uncacheRoot(mixer.getRoot());
				return false;
			}
			if (root.parent) root.userData.hasBeenAttached = true;
			mixer.update(dt);
			if (root.userData.core) {
				const open = root.userData.open !== false;
				root.userData.core.visible = open;
				root.rotation.y = open ? 0 : Math.sin(time * 7) * 0.04;
				if (root.userData.armorHalo) {
					root.userData.armorHalo.visible = !open;
					root.userData.armorHalo.rotation.z = time * 0.8;
					root.userData.armorHalo.scale.setScalar(
						1 + Math.sin(time * 6) * 0.025,
					);
				}
				if (root.userData.coreGlow) {
					root.userData.coreGlow.visible = open;
					root.userData.coreGlow.scale.setScalar(1 + Math.sin(time * 8) * 0.12);
					root.userData.coreGlow.rotation.z = Math.sin(time * 2) * 0.12;
				}
			}
			return true;
		});
		for (let i = this.effects.length - 1; i >= 0; i--) {
			const e = this.effects[i];
			e.life -= dt;
			if (e.life <= 0) {
				this.scene.remove(e.object);
				this.disposeEffect(e);
				this.effects.splice(i, 1);
				continue;
			}
			if (e.ring) {
				e.object.scale.setScalar(1 + (1 - e.life / e.max) * 4.5);
				e.object.material.opacity = e.life / e.max;
			} else {
				e.vy -= 6 * dt;
				e.object.position.x += e.vx * dt;
				e.object.position.y += e.vy * dt;
				e.object.rotation.z += e.spin * dt;
				e.object.scale.setScalar(Math.max(0.02, e.life / e.max));
			}
		}
		for (let i = 0; i < this.starObjects.length; i++)
			this.starObjects[i].scale.setScalar(
				0.7 + 0.25 * Math.sin(time * 0.8 + i * 2.3),
			);
		if (this.comet)
			this.comet.position.set(
				((time * 0.45 + 20) % 75) - 37,
				24 + Math.sin(time * 0.01) * 2,
				-30,
			);
	}
}

/* Demon Pecking Order networking. AI Hub Session Protocol v1 plus standalone WebRTC. */
class HubLink {
	constructor(callbacks = {}) {
		this.cb = callbacks;
		this.hubActive = !!globalThis.AIHub?.active;
		this.role = "solo";
		this.localId = 0;
		this.id = 0;
		this.hostId = 0;
		this.isHost = true;
		this.server = false;
		this.connected = false;
		this.started = false;
		this.ended = false;
		this.finished = false;
		this.score = 0;
		this.players = [{ id: 0, name: "Cannon One", color: "#70ece0" }];
		this.status = "";
		this._lastInput = -Infinity;
		this._lastState = -Infinity;
		this._inputSeq = 0;
		this._stateSeq = 0;
		this._receivedState = -1;
		this._inputSequences = new Map();
		this._offs = [];
	}

	_emit(name, ...args) {
		this.cb[name]?.(...args);
	}
	get panel() {
		return this._panel;
	}
	_status(message) {
		this.status = message;
		if (this._panelStatus) this._panelStatus.textContent = message;
		this._emit("onStatus", message);
	}
	_info() {
		return {
			players: this.players.map((p) => ({ ...p })),
			me: this.localId,
			localId: this.localId,
			isHost: this.isHost,
			host: this.hostId,
			server: this.server,
			hub: this.hubActive,
			role: this.role,
		};
	}

	async init() {
		if (!this.hubActive) return null;
		const hub = globalThis.AIHub;
		this._offs.push(
			hub.on("message", (data, from) => this._receive(data, from)),
		);
		this._offs.push(
			hub.on("start", () => {
				const begin = () => {
					if (this.ended) return;
					if (hub.time() < 0) {
						this._startTimer = setTimeout(begin, Math.min(50, -hub.time()));
						return;
					}
					this.started = true;
					this._status("AI Hub co-op round");
					this._emit("onStart", this._info());
				};
				begin();
			}),
		);
		this._offs.push(
			hub.on("leave", (detail) => {
				this.players = this.players.filter((p) => p.id !== detail.id);
				if (this._pendingFinish) {
					this._pendingFinish.ids.delete(detail.id);
					if (!this._pendingFinish.ids.size) this._finishNow();
				}
				this._emit("onLeave", detail);
			}),
		);
		this._offs.push(
			hub.on("time-up", (detail) => {
				this._emit("onTimeUp", detail);
				if (this.isHost && !this.finished) this.finish(this.score, false);
			}),
		);
		this._offs.push(
			hub.on("end", (detail) => {
				this.ended = true;
				this.started = false;
				clearTimeout(this._startTimer);
				clearTimeout(this._finishTimer);
				this._emit("onEnd", detail);
			}),
		);
		const info = await hub.connect({ mode: "shared-world", seats: [1, 2] });
		if (!info) {
			this.hubActive = false;
			return null;
		}
		this.localId = this.id = info.me;
		this.hostId = info.host;
		this.isHost = !!info.isHost;
		this.server = !!info.server;
		this.players = info.players.map((p) => ({ ...p }));
		this.connected = true;
		this.role = this.isHost ? "host" : "client";
		this._status("Waiting for the AI Hub round");
		this._emit("onJoin", this._info());
		hub.ready();
		return info;
	}

	sendInput(input) {
		if (this.ended || !this.connected || this.isHost || !this.started)
			return false;
		const now = performance.now();
		if (now - this._lastInput < 70) return false;
		this._lastInput = now;
		return this._send(
			{ kind: "input", seq: ++this._inputSeq, input },
			this.hostId,
			false,
		);
	}

	sendState(state) {
		if (this.ended || !this.connected || !this.isHost || !this.started)
			return false;
		const now = performance.now();
		if (now - this._lastState < 100) return false;
		this._lastState = now;
		return this._send(
			{ kind: "state", seq: ++this._stateSeq, state },
			undefined,
			true,
		);
	}

	updateScore(score) {
		if (Number.isFinite(score)) this.score = score;
	}

	finish(score = this.score, won = true, terminalState = null) {
		if (this.finished || this.ended || !this.isHost) return false;
		this.finished = true;
		this.updateScore(score);
		const ids = new Set(
			this.players.filter((p) => p.id !== this.localId).map((p) => p.id),
		);
		this._pendingFinish = {
			score: this.score,
			won: !!won,
			ids,
			seq: ++this._stateSeq,
		};
		if (terminalState && this.connected && ids.size) {
			// A session's end can outrun its final world snapshot. Make clients apply
			// the terminal world before finishing the round on the hub's clock.
			this._finishTimer = setTimeout(() => this._finishNow(), 1200);
			this._send(
				{
					kind: "terminal",
					seq: this._pendingFinish.seq,
					state: terminalState,
				},
				undefined,
				true,
			);
		} else this._finishNow();
		return true;
	}

	_finishNow() {
		const pending = this._pendingFinish;
		if (!pending || this.ended) return;
		this._pendingFinish = null;
		clearTimeout(this._finishTimer);
		const ids = this.players.map((p) => p.id);
		const scores = Object.fromEntries(ids.map((id) => [id, pending.score]));
		if (this.hubActive) {
			globalThis.AIHub.finish({ standings: [ids], scores, won: pending.won });
		} else if (this.connected) {
			this._send(
				{ kind: "finished", score: pending.score, won: pending.won },
				undefined,
				true,
			);
		}
	}

	_send(data, to, reliable = true) {
		if (this.ended) return false;
		// Leave room for protocol fields inside AI Hub's 16 KB per-message limit.
		if (JSON.stringify(data).length > 15500) {
			this._status("World snapshot exceeds the network limit");
			return false;
		}
		if (this.hubActive) return globalThis.AIHub.send(data, { to, reliable });
		if (this._channel) {
			this._channel.postMessage({ sender: this.localId, data });
			return true;
		}
		if (this._connection?.open) {
			this._connection.send(data);
			return true;
		}
		return false;
	}

	_receive(data, from) {
		if (this.ended || !data || typeof data !== "object") return;
		if (
			data.kind === "input" &&
			this.isHost &&
			this.players.some((p) => p.id === from)
		) {
			if (
				!Number.isFinite(data.seq) ||
				data.seq <= (this._inputSequences.get(from) ?? -1)
			)
				return;
			this._inputSequences.set(from, data.seq);
			this._emit("onInput", data.input, from);
		} else if (
			(data.kind === "state" || data.kind === "terminal") &&
			!this.isHost &&
			from === this.hostId
		) {
			if (!Number.isFinite(data.seq) || data.seq <= this._receivedState) return;
			this._receivedState = data.seq;
			this._emit("onState", data.state);
			if (data.kind === "terminal")
				this._send({ kind: "terminalAck", seq: data.seq }, this.hostId, true);
		} else if (
			data.kind === "terminalAck" &&
			this.isHost &&
			this._pendingFinish &&
			data.seq === this._pendingFinish.seq
		) {
			this._pendingFinish.ids.delete(from);
			if (!this._pendingFinish.ids.size) this._finishNow();
		} else if (
			data.kind === "start" &&
			!this.hubActive &&
			!this.isHost &&
			from === 0
		) {
			this.players = data.players;
			this.started = true;
			this.connected = true;
			this._emit("onJoin", this._info());
			this.hidePanel();
			this._emit("onStart", this._info());
		} else if (
			data.kind === "finished" &&
			!this.hubActive &&
			!this.isHost &&
			from === 0
		) {
			this._emit("onFinish", { score: data.score, won: data.won });
		} else if (data.kind === "bye" && !this.hubActive) {
			this._disconnected();
		}
	}

	static _code() {
		const bytes = new Uint8Array(6);
		crypto.getRandomValues(bytes);
		const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
		return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
	}

	async _loadPeer() {
		if (this.hubActive) throw new Error("AI Hub supplies the session network.");
		if (globalThis.Peer) return globalThis.Peer;
		HubLink._peerPromise ||= new Promise((resolve, reject) => {
			const script = document.createElement("script");
			script.src =
				"https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js";
			script.onload = () =>
				globalThis.Peer
					? resolve(globalThis.Peer)
					: reject(new Error("Online library did not load."));
			script.onerror = () =>
				reject(
					new Error(
						"Cannot load online co-op. Check your internet connection.",
					),
				);
			document.head.appendChild(script);
		}).catch((error) => {
			HubLink._peerPromise = null;
			throw error;
		});
		return HubLink._peerPromise;
	}

	_resetStandalone() {
		if (this.hubActive) throw new Error("The AI Hub controls this round.");
		this.close();
		this.ended = false;
		this.finished = false;
		this.started = false;
		this._inputSeq = this._stateSeq = 0;
		this._receivedState = -1;
		this._lastInput = this._lastState = -Infinity;
		this._inputSequences.clear();
	}

	async hostRoom(options = {}) {
		this._resetStandalone();
		this.role = "host";
		this.localId = this.id = this.hostId = 0;
		this.isHost = true;
		this.server = false;
		this.room = options.code || HubLink._code();
		this.players = [{ id: 0, name: "Cannon One", color: "#70ece0" }];
		this._status("Opening a co-op room…");
		if (options.local) {
			this.room = "LOCAL-" + this.room.replace(/^LOCAL-/, "");
			this._channel = new BroadcastChannel("dpo-" + this.room);
			this._channel.onmessage = (event) => {
				const message = event.data;
				if (message.sender === 0) return;
				if (message.data?.kind === "hello") this._startStandalone();
				else this._receive(message.data, 1);
			};
			this._status("Room " + this.room + " · waiting for Cannon Two");
			return this.room;
		}
		const Peer = await this._loadPeer();
		await this._openPeer(Peer, "dpo-" + this.room);
		this._peer.on("connection", (connection) => {
			if (this.connected || this._connection) {
				connection.on("open", () => {
					connection.send({ kind: "full" });
					setTimeout(() => connection.close(), 100);
				});
				return;
			}
			this._attachConnection(connection, true);
		});
		this._status("Room " + this.room + " · waiting for Cannon Two");
		return this.room;
	}

	async joinRoom(code) {
		code = String(code || "")
			.trim()
			.toUpperCase();
		if (!/^(LOCAL-)?[A-Z2-9]{6}$/.test(code))
			throw new Error("Enter the six-character room code.");
		this._resetStandalone();
		this.role = "client";
		this.isHost = false;
		this.localId = this.id = 1;
		this.hostId = 0;
		this.server = false;
		this.room = code;
		this._status("Joining room " + code + "…");
		if (code.startsWith("LOCAL-")) {
			this._channel = new BroadcastChannel("dpo-" + code);
			this._channel.onmessage = (event) => {
				if (event.data.sender === 0) this._receive(event.data.data, 0);
			};
			this._send({ kind: "hello" });
			this._joinTimer = setInterval(() => {
				if (this.started) {
					clearInterval(this._joinTimer);
					return;
				}
				this._send({ kind: "hello" });
			}, 500);
			return code;
		}
		const Peer = await this._loadPeer();
		await this._openPeer(Peer);
		const connection = this._peer.connect("dpo-" + code, {
			reliable: true,
			serialization: "json",
			metadata: { game: "dpo", version: 1 },
		});
		this._attachConnection(connection, false);
		return code;
	}

	_openPeer(Peer, id) {
		return new Promise((resolve, reject) => {
			const peer = id ? new Peer(id, { debug: 0 }) : new Peer({ debug: 0 });
			this._peer = peer;
			const timeout = setTimeout(() => {
				peer.destroy();
				reject(new Error("The room service did not answer. Try again."));
			}, 18000);
			peer.on("open", () => {
				clearTimeout(timeout);
				resolve(peer);
			});
			peer.on("error", (error) => {
				clearTimeout(timeout);
				const friendly =
					error.type === "peer-unavailable"
						? "That room is unavailable. Check the code and try again."
						: error.type === "unavailable-id"
							? "That room already exists. Create a new room."
							: "The co-op connection could not be made. Try another network.";
				this._status(friendly);
				reject(new Error(friendly));
			});
			peer.on("disconnected", () => {
				if (!this.connected)
					this._status(
						"Room service disconnected. Create or join a room again.",
					);
			});
		});
	}

	_attachConnection(connection, host) {
		this._connection = connection;
		const timeout = setTimeout(() => {
			if (!this.connected) {
				connection.close();
				this._connection = null;
				this._status(
					"Cannon Two could not connect. Check the room code or try another network.",
				);
			}
		}, 20000);
		connection.on("open", () => {
			clearTimeout(timeout);
			this.connected = true;
			if (host) this._startStandalone();
		});
		connection.on("data", (data) => {
			if (data?.kind === "full") {
				this._status("That room already has two cannons.");
				connection.close();
				return;
			}
			this._receive(data, host ? 1 : 0);
		});
		connection.on("close", () => {
			clearTimeout(timeout);
			this._disconnected();
		});
		connection.on("error", () => {
			clearTimeout(timeout);
			this._disconnected();
		});
	}

	_startStandalone() {
		if (this.started) return;
		this.players = [
			{ id: 0, name: "Cannon One", color: "#70ece0" },
			{ id: 1, name: "Cannon Two", color: "#ffb965" },
		];
		this.connected = this.started = true;
		this._send({ kind: "start", players: this.players }, undefined, true);
		this._status("Two cannons. One sky. Co-op connected.");
		this._emit("onJoin", this._info());
		this.hidePanel();
		this._emit("onStart", this._info());
	}

	_disconnected() {
		if (this._closing || this.ended || !this.connected) return;
		this.connected = false;
		this._status(
			this.isHost
				? "Cannon Two disconnected. Your patrol continues solo."
				: "Cannon One disconnected. Return to the title to reconnect.",
		);
		this._emit("onLeave", { id: this.isHost ? 1 : 0, reason: "disconnected" });
		if (!this.isHost) {
			this.started = false;
			this._emit("onEnd", { reason: "host-left" });
		} else this.players = this.players.filter((p) => p.id === 0);
	}

	close() {
		if (this.hubActive) return;
		this._closing = true;
		if (this.connected) this._send({ kind: "bye" });
		clearTimeout(this._startTimer);
		clearTimeout(this._finishTimer);
		this._pendingFinish = null;
		clearInterval(this._joinTimer);
		this._channel?.close();
		this._channel = null;
		this._connection?.close();
		this._connection = null;
		this._peer?.destroy();
		this._peer = null;
		this.connected = this.started = false;
		this.isHost = true;
		this.server = false;
		this.localId = this.id = this.hostId = 0;
		this.role = "solo";
		this.players = [{ id: 0, name: "Cannon One", color: "#70ece0" }];
		this._closing = false;
	}

	openPanel() {
		if (this.hubActive) return;
		if (this._panel) {
			this._panel.querySelector("button")?.focus();
			return;
		}
		const overlay = document.createElement("div");
		overlay.id = "dpo-online-panel";
		overlay.setAttribute("role", "dialog");
		overlay.setAttribute("aria-modal", "true");
		overlay.setAttribute("aria-labelledby", "dpo-online-title");
		overlay.innerHTML = `<style>
      #dpo-online-panel{position:fixed;inset:0;z-index:10000;background:#091326f2;color:#f3ead9;display:grid;place-items:center;font-family:inherit;padding:4vw;box-sizing:border-box}
      #dpo-online-panel .online-card{width:min(820px,90vw);padding:clamp(22px,3vw,50px);background:#15263a;border:2px solid #617b8d;box-shadow:12px 12px 0 #030913;box-sizing:border-box}
      #dpo-online-panel h2{font-size:clamp(30px,4vw,58px);margin:0 0 12px;text-transform:uppercase;letter-spacing:-.04em}
      #dpo-online-panel p{font-size:clamp(18px,1.8vw,26px);line-height:1.5;margin:12px 0 22px}
      #dpo-online-panel .online-row{display:flex;gap:14px;margin:16px 0;flex-wrap:wrap}
      #dpo-online-panel button,#dpo-online-panel input{font:inherit;font-size:clamp(18px,1.7vw,25px);padding:15px 22px;border:2px solid #75989f;border-radius:0;color:#f3ead9;background:#203c50;box-sizing:border-box;min-height:60px}
      #dpo-online-panel button{cursor:pointer;font-weight:800;text-transform:uppercase}
      #dpo-online-panel button:focus,#dpo-online-panel button:hover,#dpo-online-panel input:focus{outline:3px solid #f9b861;outline-offset:3px;background:#34566a}
      #dpo-online-panel input{width:230px;flex:1;text-transform:uppercase;letter-spacing:.16em;min-width:180px}
      #dpo-online-panel .room-code{font-size:clamp(32px,4vw,58px);font-weight:900;color:#74eadb;letter-spacing:.15em;min-height:1.2em;margin:16px 0}
      #dpo-online-panel .online-status{min-height:3em;color:#b7d0d8}
      #dpo-online-panel .online-small{font-size:clamp(14px,1.2vw,19px);color:#a2b9c2}
    </style><section class="online-card"><h2 id="dpo-online-title">Two cannons. One sky.</h2>
      <p>Create a room and share its code, or join your wingmate. Both players defend the same outpost.</p>
      <div class="online-row"><button type="button" data-online="host">Create room</button><button type="button" data-online="back">Back</button></div>
      <div class="room-code" aria-live="polite"></div>
      <div class="online-row"><input aria-label="Room code" placeholder="Room code" maxlength="12" autocomplete="off" spellcheck="false"><button type="button" data-online="join">Join room</button></div>
      <p class="online-status" role="status">Internet co-op uses a direct WebRTC connection.</p>
      <p class="online-small">The host runs the patrol. Play starts when Cannon Two joins.</p>
    </section>`;
		this._panel = overlay;
		this._panelStatus = overlay.querySelector(".online-status");
		this._previousFocus = document.activeElement;
		const codeElement = overlay.querySelector(".room-code");
		const input = overlay.querySelector("input");
		const hostButton = overlay.querySelector('[data-online="host"]');
		const joinButton = overlay.querySelector('[data-online="join"]');
		hostButton.onclick = async () => {
			hostButton.disabled = true;
			try {
				codeElement.textContent = await this.hostRoom();
			} catch (error) {
				this._status(error.message);
			} finally {
				hostButton.disabled = false;
			}
		};
		const join = async () => {
			joinButton.disabled = true;
			try {
				await this.joinRoom(input.value);
			} catch (error) {
				this._status(error.message);
			} finally {
				joinButton.disabled = false;
			}
		};
		joinButton.onclick = join;
		input.onkeydown = (event) => {
			if (event.key === "Enter") {
				event.stopPropagation();
				join();
			}
		};
		overlay.querySelector('[data-online="back"]').onclick = () => {
			this.close();
			this.hidePanel();
		};
		overlay.addEventListener("keydown", (event) => {
			event.stopPropagation();
			if (event.key === "Escape") {
				this.close();
				this.hidePanel();
			}
			if (event.key === "Tab") {
				const items = [
					...overlay.querySelectorAll("button:not(:disabled),input"),
				];
				const at = items.indexOf(document.activeElement);
				event.preventDefault();
				items[
					(at + (event.shiftKey ? -1 : 1) + items.length) % items.length
				].focus();
			}
		});
		overlay
			.querySelectorAll("button")
			.forEach((button) =>
				button.addEventListener("pointerenter", () => button.focus()),
			);
		document.body.appendChild(overlay);
		hostButton.focus();
	}

	hidePanel() {
		this._panel?.remove();
		this._panel = this._panelStatus = null;
		if (!this.started) this._previousFocus?.focus?.();
		this._emit("onPanelClose", this.started);
	}
}

globalThis.HubLink = HubLink;

const $ = (s) => document.querySelector(s),
	clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TITLE = "Demon Pecking Order";
const defaults = {
	speed: 14,
	fireRate: 5.5,
	enemySpeed: 1,
	enemyFire: 1,
	bulletSpeed: 7.8,
	pulseRecharge: 1,
	difficulty: 1,
};
const balance = { ...defaults };
const settings = {
	music: 0.1,
	sfx: 0.7,
	glyphs: "PlayStation",
	shake: true,
	tracer: true,
	assist: false,
};
try {
	Object.assign(
		settings,
		JSON.parse(localStorage.getItem("dpo-settings") || "{}"),
	);
} catch {}
settings.music = clamp(Number(settings.music) || 0, 0, 1);
settings.sfx = clamp(Number(settings.sfx) || 0, 0, 1);
const saveSettings = () => {
	try {
		localStorage.setItem("dpo-settings", JSON.stringify(settings));
	} catch {}
};
const audio = new SynthAudio();
audio.setMusic(settings.music);
audio.setSfx(settings.sfx);
let renderer,
	scene,
	camera,
	visuals,
	world,
	events,
	link,
	ready = false,
	accum = 0,
	last = 0,
	renderFrames = 0;
let screen = "loading",
	returnScreen = "title",
	lastDevice = "keyboard",
	idle = 0,
	menuIndex = 0,
	menuRepeat = 0,
	attract = false;
let time = 0,
	runTime = 0,
	score = 0,
	best = 0,
	wave = 0,
	reserves = 4,
	combo = 0,
	comboTime = 0,
	power = 1,
	waveHits = 0,
	kills = 0,
	totalShots = 0,
	shotsHit = 0;
let spawnLeft = 0,
	spawnTimer = 0,
	clearTimer = -1,
	introTimer = 0,
	bannerTimer = 0,
	toastTimer = 0,
	shake = 0,
	flash = 0,
	uid = 0,
	coop = false,
	endless = false,
	won = false;
let physicsPools = new Map();
let entities = [],
	players = [],
	handles = new Map(),
	remoteInputs = new Map(),
	snapshotTime = 0,
	networkState = null,
	pendingPulse = false,
	pendingDash = false;
let keys = new Set(),
	mouse = { active: false, x: 0, down: false },
	touch = { active: false, id: null, startX: 0, startPlayer: 0, x: 0 },
	gamepads = [],
	padPrevious = new Map(),
	padMenuPrevious = false;
let god = false,
	autoplay = false,
	slow = false,
	muted = false,
	devUsed = false,
	onlineStarting = false,
	terminalReported = false;
const stats = {
	collisions: 0,
	enemyKills: 0,
	splits: 0,
	dives: 0,
	phantoms: 0,
	enemyShots: 0,
	dashes: 0,
	pulses: 0,
	damage: 0,
	wavesCleared: 0,
	spawnedTypes: new Set(),
	bossHits: 0,
};
const waves = [
	{
		name: "FIRST CONTACT",
		sub: "They have wings. You have unlimited ammunition.",
		count: 8,
		types: ["grunt"],
		fire: 0.9,
	},
	{
		name: "SPLIT DECISION",
		sub: "Break a pair. The survivor dives. Keep moving!",
		count: 8,
		types: ["splitter", "grunt", "splitter"],
		fire: 1,
	},
	{
		name: "GHOST SHIFT",
		sub: "Phantoms blink. Their shadows give them away.",
		count: 9,
		types: ["phantom", "splitter", "grunt"],
		fire: 1.1,
	},
	{
		name: "BAD MIGRATION",
		sub: "Guided fire is coming. Dash through the gaps.",
		count: 10,
		types: ["splitter", "phantom", "grunt"],
		fire: 1.3,
	},
	{
		name: "FOWL WEATHER",
		sub: "The whole flock. Save your pulse for the storm.",
		count: 12,
		types: ["splitter", "phantom", "splitter"],
		fire: 1.5,
	},
	{
		name: "THE BIG PECK",
		sub: "Shoot the open eye. Dash the fan. End the invasion.",
		count: 1,
		types: ["boss"],
		fire: 1.5,
	},
];
const activeRun = () => screen === "playing";
const authoritative = () => !link?.connected || link.isHost;
const online = () => !!link?.connected;
const safe = (s) =>
	String(s).replace(
		/[&<>"']/g,
		(c) =>
			({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
				c
			],
	);
try {
	best = Number(localStorage.getItem("dpo-best") || 0);
} catch {}
function setDevice(d) {
	if (lastDevice !== d) {
		lastDevice = d;
		updatePrompts();
	}
}
function glyph(action) {
	if (lastDevice === "pad") {
		const ps = settings.glyphs === "PlayStation";
		return {
			fire: ps ? "×" : "A",
			dash: ps ? "○" : "B",
			pulse: ps ? "□" : "X",
			menu: ps ? "OPTIONS" : "MENU",
			accept: ps ? "×" : "A",
			back: ps ? "○" : "B",
			move: "L",
		}[action];
	}
	if (lastDevice === "touch")
		return {
			fire: "AUTO",
			dash: "DOUBLE TAP",
			pulse: "TAP",
			menu: "Ⅱ",
			accept: "TAP",
			back: "BACK",
			move: "DRAG",
		}[action];
	return {
		fire: "SPACE / CLICK",
		dash: "SHIFT",
		pulse: "Q",
		menu: "ESC",
		accept: "ENTER",
		back: "ESC",
		move: "A D / ← →",
	}[action];
}
function updatePrompts() {
	if (!$("#prompts")) return;
	$("#prompts").innerHTML =
		`<span><b class="glyph">${glyph("move")}</b> Move</span><span><b class="glyph">${glyph("fire")}</b> Fire</span><span><b class="glyph">${glyph("dash")}</b> Dash</span><span><b class="glyph">${glyph("menu")}</b> Pause</span>`;
	$("#power-key").textContent = glyph("pulse");
	const titleGlyph = $('[data-action="start"] .glyph');
	if (titleGlyph) titleGlyph.textContent = glyph("accept");
}
function announce(big, sub = "", duration = 3) {
	$("#banner .big").textContent = big;
	$("#banner .sub").textContent = sub;
	$("#banner").classList.add("show");
	bannerTimer = duration;
}
function toast(text, duration = 3) {
	$("#toast").textContent = text;
	$("#toast").classList.add("show");
	toastTimer = duration;
}
function setScreen(name) {
	screen = name;
	menuIndex = 0;
	$("#hud").style.display = ["playing", "pause", "dev"].includes(name)
		? "block"
		: "none";
	$("#touch-pulse").style.display =
		lastDevice === "touch" && name === "playing" && power >= 0.99
			? "block"
			: "none";
	if (name !== "playing") {
		$("#touch-ring").style.display = "none";
		mouse.down = false;
		keys.clear();
		touch.active = false;
	}
	audio.setPaused(name !== "playing" && name !== "result");
	if (name === "playing") {
		$("#screen").innerHTML = "";
		audio.setPaused(false);
	}
	menuFocus();
}
function button(label, id, cls = "secondary", extra = "") {
	return `<button class="${cls}" data-action="${id}" ${extra}>${label}</button>`;
}
function wire() {
	document.querySelectorAll("[data-action]").forEach((b) => {
		b.addEventListener("click", () => act(b.dataset.action));
		b.addEventListener("pointerenter", () => {
			let list = menuItems();
			menuIndex = list.indexOf(b);
			menuFocus();
		});
	});
	menuFocus();
}
function menuItems() {
	return [
		...($("#dpo-online-panel") || $("#screen")).querySelectorAll(
			"button:not([disabled]),input,textarea,a",
		),
	].filter((b) => b.offsetParent !== null);
}
function menuFocus() {
	const b = menuItems();
	b.forEach((e, i) => e.classList.toggle("focus", i === menuIndex));
}
function menuMove(dir) {
	const b = menuItems();
	if (!b.length) return;
	menuIndex = (menuIndex + dir + b.length) % b.length;
	menuFocus();
	b[menuIndex].focus({ preventScroll: true });
	b[menuIndex].scrollIntoView({ block: "nearest" });
	audio.sfx("menu");
}
function menuAccept() {
	const b = menuItems()[menuIndex];
	if (b?.tagName === "BUTTON") b.click();
}
function menuAdjust(dir) {
	let b = menuItems()[menuIndex];
	if (b?.type === "range") {
		b.value = clamp(
			Number(b.value) + Number(b.step || 1) * dir,
			Number(b.min),
			Number(b.max),
		);
		b.dispatchEvent(new Event("input"));
	} else menuMove(dir);
}
function renderTitle(reset = true) {
	if (reset) {
		setScreen("title");
		idle = 0;
		attract = false;
		$("#demo-label").style.display = "none";
		$("#banner").classList.remove("show");
		titleDecor();
	}
	$("#screen").innerHTML =
		`<div class="title-layout"><div class="mast"><div class="mark"><span>✦</span></div><span class="eyebrow">Moon patrol / Night shift</span><span class="edition">VOL. 01 &nbsp; / &nbsp; AN INK-SPACE ARCADE</span></div><div class="hero"><div class="eyebrow">They came. They saw. They pecked.</div><h1><span class="warm">DEMON</span><span>PECKING</span><span class="small">ORDER</span></h1><p>Little cannon. Very big birds.<br>Hold the moon. Send the flock packing.</p><div class="main-actions">${button(`<span class="glyph">${glyph("accept")}</span>&nbsp; Start patrol`, "start", "primary")}${button("Two pilots", "coop")}${button("Online co-op ↗", "online")}</div><div class="title-links">${button("How to play", "help", "textbtn")}${button("Settings", "settings", "textbtn")}${button("About / credits", "about", "textbtn")}</div></div><div class="stamp">Full moon.<br>Zero peace.</div><div class="title-bottom"><div class="statline"><div><strong>06</strong><small>Waves + one big bird</small></div><div><strong>1—2</strong><small>Pilots · local / online</small></div><div><strong>${String(best).padStart(6, "0")}</strong><small>Personal best</small></div></div><div class="signal"><b>●</b> MOON SIGNAL: STRONG<br><br><span id="idle-caption">Autopilot demonstration in 10s</span></div></div></div>`;
	wire();
}
function modal(kicker, title, body, buttons = "", cls = "") {
	return `<div class="modal-wrap"><section class="panel ${cls}" aria-label="${title}"><div class="eyebrow">${kicker}</div><h2>${title}</h2>${body}<div class="buttons">${buttons}</div></section></div>`;
}
function renderPause() {
	setScreen("pause");
	$("#screen").innerHTML = modal(
		"The moon can wait",
		"Patrol paused",
		`<div class="menu-stack">${button("Resume patrol <span>↵</span>", "resume", "primary")}${button("Settings", "settings")}${button("How to play", "help")}${button("Developer tools", "dev")}${link?.hubActive ? "" : button("Return to title", "quit")}</div>`,
	);
	wire();
}
function renderHelp() {
	const old = screen;
	if (!["help", "settings", "about"].includes(old)) returnScreen = old;
	setScreen("help");
	$("#screen").innerHTML = modal(
		"Field manual",
		"Make every feather count",
		`<div class="control-grid"><div class="control-card"><strong>Move & fire</strong><p>${safe(glyph("move"))} to move. Hold ${safe(glyph("fire"))} to fire. Mouse follows your cannon; click to fire. Tracer shots bend as you move.</p></div><div class="control-card"><strong>Dash & pulse</strong><p>${safe(glyph("dash"))} dashes with brief protection. ${safe(glyph("pulse"))} blasts the flock and clears bullets. Kills recharge it faster.</p></div><div class="control-card"><strong>Read the flock</strong><p>Orange birds hover. Violet birds split; the surviving half dives. Mint phantoms fade, but can still be shot.</p></div><div class="control-card"><strong>Keep your bunkers</strong><p>Four reserves, one shared patrol. Clear a wave without a hit to earn another. Your last bunker keeps you alive. Six waves to victory.</p></div></div><p>Local co-op: Pilot 1 uses A/D, Space, Shift, Q. Pilot 2 uses ←/→, Enter, Right Shift, /. Any two standard gamepads also work. Touch: drag anywhere to move; auto-fire is on. Double-tap to dash and tap the ready Pulse button.</p>`,
		button("Back", "back", "primary"),
	);
	wire();
}
function renderSettings() {
	const old = screen;
	if (!["settings", "help", "about"].includes(old)) returnScreen = old;
	setScreen("settings");
	$("#screen").innerHTML = modal(
		"Set your orbit",
		"Settings",
		`<label class="row"><span>Music <small>Procedural lunar radio</small></span><input aria-label="Music volume" data-setting="music" type="range" min="0" max="1" step=".01" value="${settings.music}"><output>${Math.round(settings.music * 100)}%</output></label><label class="row"><span>Sound effects & voices</span><input aria-label="Sound effects volume" data-setting="sfx" type="range" min="0" max="1" step=".01" value="${settings.sfx}"><output>${Math.round(settings.sfx * 100)}%</output></label><div class="row"><span>Controller glyphs</span>${button(settings.glyphs, "glyphs")}</div><div class="row"><span>Screen shake</span>${button(settings.shake ? "On" : "Off", "shake")}</div><div class="row"><span>Tracer shots <small>Bend your shots by moving</small></span>${button(settings.tracer ? "On" : "Off", "tracer")}</div><div class="row"><span>Auto-fire <small>Always enabled with touch controls</small></span>${button(settings.assist ? "On" : "Off", "assist")}</div><p style="font-size:14px">Progress and preferences save on this device. <span id="backend">${renderer?.backend?.isWebGPUBackend ? "WebGPU" : "WebGL compatibility"} · Three.js r180 · Rapier 0.19.3</span></p>`,
		button("Back", "back", "primary") + button("Fullscreen", "fullscreen"),
	);
	wire();
	document.querySelectorAll("[data-setting]").forEach(
		(e) =>
			(e.oninput = () => {
				settings[e.dataset.setting] = Number(e.value);
				e.nextElementSibling.textContent = Math.round(e.value * 100) + "%";
				audio.setMusic(settings.music);
				audio.setSfx(settings.sfx);
				saveSettings();
			}),
	);
}
const devLabels = {
	speed: ["Cannon speed", 5, 25, 0.5],
	fireRate: ["Shots per second", 2, 14, 0.5],
	enemySpeed: ["Enemy flight speed", 0.25, 2.5, 0.05],
	enemyFire: ["Enemy fire rate", 0.2, 2.5, 0.05],
	bulletSpeed: ["Enemy bullet speed", 3, 15, 0.25],
	pulseRecharge: ["Pulse recharge", 0.2, 4, 0.1],
	difficulty: ["Damage pressure", 0.5, 2, 0.1],
};
function renderDev() {
	devUsed = true;
	setScreen("dev");
	$("#screen").innerHTML = modal(
		"Flight laboratory",
		"Developer tools",
		`<p class="dev-note">Live values apply immediately. This patrol will not set a personal best.</p><div class="row"><span>Invulnerability</span>${button(god ? "On" : "Off", "god")}</div><div class="row"><span>Autopilot</span>${button(autoplay ? "On" : "Off", "autoplay")}</div><div class="row"><span>Half-speed simulation</span>${button(slow ? "On" : "Off", "slow")}</div>${Object.entries(
			devLabels,
		)
			.map(
				([k, [label, min, max, step]]) =>
					`<label class="row"><span>${label}</span><input type="range" aria-label="${label}" data-balance="${k}" min="${min}" max="${max}" step="${step}" value="${balance[k]}"><output>${balance[k].toFixed(2)}</output></label>`,
			)
			.join(
				"",
			)}<div class="buttons">${button("Next wave", "nextwave")}${button("Refill bunkers + pulse", "refill")}${button("Clear projectiles", "clearshots")}${link?.hubActive ? "" : button("Restart patrol", "restart")}${button("Reset defaults", "resetdev")}</div>`,
		button("Resume patrol", "resume", "primary") +
			button("Back to pause", "pause"),
	);
	wire();
	document.querySelectorAll("[data-balance]").forEach(
		(e) =>
			(e.oninput = () => {
				balance[e.dataset.balance] = Number(e.value);
				e.nextElementSibling.textContent = Number(e.value).toFixed(2);
			}),
	);
}
function renderAbout() {
	const old = screen;
	if (!["settings", "help", "about"].includes(old)) returnScreen = old;
	setScreen("about");
	const d = window.GAME_INFO;
	$("#screen").innerHTML = modal(
		"A small cannon with a long memory",
		"About / credits",
		`<p>An original lunar arcade game inspired by Imagic’s <em>Demon Attack</em> (1982), by Rob Fulop. Built for one screen, a good controller, and a sky full of trouble.</p><h3>Source Information</h3><dl>${Object.entries(
			d.sourceInformation,
		)
			.map(([k, v]) => `<dt>${safe(k)}</dt><dd>${safe(v)}</dd>`)
			.join(
				"",
			)}</dl><h3>Research</h3><p><a target="_blank" rel="noreferrer" href="https://atariage.com/manual_html_page.php?SoftwareLabelID=135">Original game manual</a> · <a target="_blank" rel="noreferrer" href="https://www.atariage.com/software_page.php?SoftwareLabelID=135">AtariAge game profile / sound notes</a> · <a target="_blank" rel="noreferrer" href="https://www.mobygames.com/game/9448/demon-attack/">Mechanics and ports</a> · <a target="_blank" rel="noreferrer" href="https://github.com/michaelcrosato/ai-hub/tree/main/lib/hub">AI Hub protocol</a>. Three-at-a-time hovering foes, split-and-dive behavior, steerable shots, escalating fire and perfect-wave bunkers informed this game. The Big Peck is an original boss, inspired by the flagship encounters in later ports.</p><h3>Testing Feedback</h3><ul>${d.testingFeedback.map((v) => `<li>${safe(v)}</li>`).join("")}</ul><h3>Engine Feedback</h3><ul>${d.engineFeedback.map((v) => `<li>${safe(v)}</li>`).join("")}</ul><h3>Prompt Feedback</h3><ul>${d.promptFeedback.map((v) => `<li>${safe(v)}</li>`).join("")}</ul><h3>Built with</h3><p>Three.js r180 (MIT), Rapier 0.19.3 (Apache-2.0), AI Hub session client 1.4.0. Optional PeerJS signaling for standalone internet rooms. Fonts: Barlow Condensed and DM Sans (Google Fonts, SIL OFL; system fallbacks included). All geometry, animation, music, effects and gibberish voices are generated in code. No source artwork, recordings or ROM data are included.</p>`,
		button("Back", "back", "primary"),
		"about",
	);
	wire();
}
function renderResult() {
	setScreen("result");
	$("#hud").style.display = "none";
	$("#bossbar").style.display = "none";
	$("#banner").classList.remove("show");
	$("#demo-label").style.display = "none";
	$("#screen").innerHTML = modal(
		won ? "Moon secure. Flock dismissed." : "Cannon down. Courage intact.",
		won ? "Order restored" : "Pecked to pieces",
		`<div class="hud-label">${devUsed ? "Laboratory score" : online() ? "Shared patrol score" : "Patrol score"}</div><div class="result-score">${String(score).padStart(6, "0")}</div><div class="result-stats"><span><strong>${kills}</strong> birds</span><span><strong>${Math.floor(runTime / 60)}:${String(Math.floor(runTime % 60)).padStart(2, "0")}</strong> patrol</span><span><strong>${totalShots ? Math.round((shotsHit / totalShots) * 100) : 0}%</strong> accuracy</span></div><p>${won ? "The moon is quiet. Enjoy it while it lasts." : "Those wings will be back. So will you."}</p>`,
		link?.hubActive
			? "<p>Results sent to AI Hub.</p>"
			: (online() && !link.isHost
					? "<p>Your host can launch the next shared patrol.</p>"
					: button("Fly again", "restart", "primary") +
						(won ? button("Overtime ∞", "endless") : "")) +
					button("Title screen", "quit"),
	);
	wire();
}
function act(id) {
	if (
		online() &&
		!link.isHost &&
		[
			"restart",
			"endless",
			"nextwave",
			"refill",
			"clearshots",
			"resetdev",
		].includes(id)
	)
		return;
	const previousScreen = screen,
		previousIndex = menuIndex;
	audio.unlock();
	audio.sfx("menu");
	idle = 0;
	switch (id) {
		case "start":
			startRun(false);
			break;
		case "coop":
			startRun(true);
			toast("Pilot 2: arrows + Enter, or connect a second gamepad.", 5);
			break;
		case "online":
			link.openPanel();
			break;
		case "resume":
			setScreen("playing");
			break;
		case "pause":
			renderPause();
			break;
		case "settings":
			renderSettings();
			break;
		case "help":
			renderHelp();
			break;
		case "about":
			renderAbout();
			break;
		case "dev":
			if (online() && !link.isHost) {
				toast("Only the host can change the simulation.");
				return;
			}
			renderDev();
			break;
		case "back":
			returnScreen === "pause" || returnScreen === "dev"
				? renderPause()
				: renderTitle();
			break;
		case "quit":
			link?.close();
			resetWorld();
			renderTitle();
			break;
		case "restart":
			if (link?.hubActive) return;
			startRun(coop);
			break;
		case "endless":
			endless = true;
			startRun(coop, true);
			break;
		case "glyphs":
			settings.glyphs =
				settings.glyphs === "PlayStation" ? "Xbox" : "PlayStation";
			renderSettings();
			break;
		case "shake":
			settings.shake = !settings.shake;
			renderSettings();
			break;
		case "tracer":
			settings.tracer = !settings.tracer;
			renderSettings();
			break;
		case "assist":
			settings.assist = !settings.assist;
			renderSettings();
			break;
		case "fullscreen":
			document.fullscreenElement
				? document.exitFullscreen()
				: document.documentElement
						.requestFullscreen()
						.catch(() => toast("Fullscreen is unavailable in this browser."));
			break;
		case "god":
			god = !god;
			renderDev();
			break;
		case "autoplay":
			autoplay = !autoplay;
			renderDev();
			break;
		case "slow":
			slow = !slow;
			renderDev();
			break;
		case "nextwave":
			clearCombat();
			beginWave(wave + 1);
			setScreen("playing");
			break;
		case "refill":
			reserves = 6;
			power = 1;
			toast("Bunkers and pulse restored.");
			break;
		case "clearshots":
			entities.filter((e) => e.kind === "shot").forEach(removeEntity);
			toast("Sky clear.");
			break;
		case "resetdev":
			Object.assign(balance, defaults);
			god = autoplay = slow = false;
			renderDev();
			break;
	}
	saveSettings();
	updatePrompts();
	if (screen === previousScreen) {
		menuIndex = previousIndex;
		menuFocus();
	}
}

function resetWorld() {
	for (const e of entities) {
		scene?.remove(e.mesh);
		visuals?.remove?.(e.mesh);
	}
	entities = [];
	players = [];
	handles.clear();
	remoteInputs.clear();
	if (world) world.free();
	world = new RAPIER.World({ x: 0, y: 0, z: 0 });
	world.timestep = 1 / 60;
	events?.free();
	events = new RAPIER.EventQueue(true);
	physicsPools = new Map();
	initPhysicsPools();
	accum = 0;
	visuals?.resetEffects();
}
function clearCombat() {
	entities.filter((e) => e.kind !== "player").forEach(removeEntity);
	spawnLeft = 0;
	clearTimer = -1;
}
// Rapier 0.19.3 has an upstream broadphase failure with rapid collider churn
// (dimforge/rapier.js#363). Keep stable bodies for a whole patrol; retire by
// parking and filtering them, then reuse their handles without deletion.
function poolKey(hx, hy, dynamic) {
	return `${hx}:${hy}:${dynamic}`;
}
function newPhysicsSlot(hx, hy, dynamic) {
	const desc = (
		dynamic
			? RAPIER.RigidBodyDesc.dynamic()
			: RAPIER.RigidBodyDesc.kinematicPositionBased()
	)
		.setTranslation(0, -1000, 0)
		.lockRotations()
		.setCanSleep(false);
	const body = world.createRigidBody(desc);
	if (dynamic) {
		body.setEnabledTranslations(true, true, false, true);
	}
	const collider = world.createCollider(
		RAPIER.ColliderDesc.cuboid(hx, hy, 0.6)
			.setSensor(true)
			.setCollisionGroups(0)
			.setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS)
			.setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL),
		body,
	);
	return {
		body,
		collider,
		available: true,
		dynamic,
		key: poolKey(hx, hy, dynamic),
	};
}
function initPhysicsPools() {
	for (const [hx, hy, dynamic, count] of [
		[0.48, 0.55, false, 2],
		[0.86, 0.56, false, 32],
		[0.43, 0.37, false, 32],
		[2.7, 1.5, false, 4],
		[0.12, 0.42, true, 96],
		[0.18, 0.27, true, 256],
	]) {
		const list = [];
		for (let i = 0; i < count; i++) list.push(newPhysicsSlot(hx, hy, dynamic));
		physicsPools.set(poolKey(hx, hy, dynamic), list);
	}
	world.step(events);
	events.clear();
}
function bodyEntity(
	kind,
	type,
	x,
	y,
	mesh,
	hx,
	hy,
	member,
	filter,
	dynamic = false,
) {
	const key = poolKey(hx, hy, dynamic);
	let pool = physicsPools.get(key);
	if (!pool) {
		pool = [];
		physicsPools.set(key, pool);
	}
	let slot = pool.find((s) => s.available);
	if (!slot) {
		slot = newPhysicsSlot(hx, hy, dynamic);
		pool.push(slot);
	}
	slot.available = false;
	const { body: b, collider: c } = slot;
	b.setTranslation({ x, y, z: 0 }, true);
	if (dynamic) b.setLinvel({ x: 0, y: 0, z: 0 }, true);
	else b.setNextKinematicTranslation({ x, y, z: 0 });
	c.setCollisionGroups((member << 16) | filter);
	const e = {
		id: ++uid,
		kind,
		type,
		x,
		y,
		mesh,
		body: b,
		collider: c,
		slot,
		dead: false,
		age: 0,
	};
	mesh.position.set(x, y, 0);
	scene.add(mesh);
	entities.push(e);
	handles.set(c.handle, e);
	return e;
}
function removeEntity(e) {
	if (!e || e.dead) return;
	e.dead = true;
	handles.delete(e.collider?.handle);
	if (e.slot) {
		e.collider.setCollisionGroups(0);
		e.body.setTranslation({ x: 0, y: -1000, z: 0 }, true);
		if (e.slot.dynamic) e.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
		else e.body.setNextKinematicTranslation({ x: 0, y: -1000, z: 0 });
		e.slot.available = true;
	}
	scene.remove(e.mesh);
	visuals.remove?.(e.mesh);
}
function createPlayer(id, index) {
	let x = index === 0 ? (coop ? -3 : 0) : 3;
	let e = bodyEntity(
		"player",
		"cannon",
		x,
		1.6,
		visuals.createShip(index),
		0.48,
		0.55,
		8,
		6,
	);
	Object.assign(e, {
		playerId: id,
		index,
		cooldown: 0,
		invul: 2,
		dash: 0,
		dashCooldown: 0,
		dir: 1,
		axis: 0,
		shotCount: 0,
		previousPulse: false,
		previousDash: false,
	});
	players.push(e);
	return e;
}
function startRun(two = false, overtime = false, netInfo = null) {
	if (!ready) return;
	const wasAttract = attract;
	resetWorld();
	coop = two;
	attract = false;
	endless = overtime;
	score = 0;
	wave = 0;
	reserves = 4;
	combo = 0;
	comboTime = 0;
	power = 1;
	kills = 0;
	runTime = 0;
	waveHits = 0;
	totalShots = shotsHit = 0;
	terminalReported = false;
	won = false;
	devUsed = false;
	uid = 0;
	for (let k of Object.keys(stats)) if (k !== "spawnedTypes") stats[k] = 0;
	stats.spawnedTypes.clear();
	if (!wasAttract) {
		god = false;
		autoplay = false;
		slow = false;
		Object.assign(balance, defaults);
	}
	if (online() && !link.hubActive) {
		link.finished = false;
		link.ended = false;
	}
	const roster =
		netInfo?.players ||
		(online() ? link.players : [{ id: 0 }, { id: 1 }].slice(0, two ? 2 : 1));
	roster.forEach((p, i) => createPlayer(p.id, i));
	setScreen("playing");
	$("#demo-label").style.display = "none";
	beginWave(1);
	audio.unlock();
	audio.setIntensity(1);
}
function beginWave(n) {
	if (n > 6 && !endless) {
		finishRun(true);
		return;
	}
	wave = n;
	clearTimer = -1;
	spawnTimer = 1.3;
	introTimer = 2.8;
	waveHits = 0;
	const w = waves[(n - 1) % 6];
	spawnLeft = w.count;
	audio.setIntensity(Math.min(n, 6));
	audio.sfx(w.types[0] === "boss" ? "boss" : "wave");
	announce(`${String(n).padStart(2, "0")} / ${w.name}`, w.sub, 3.3);
	players.forEach((p) => (p.invul = Math.max(p.invul, 2)));
	updateHUD();
}
function spawnEnemy(type, x = null, y = null, opts = {}) {
	const boss = type === "boss",
		shard = type === "shard";
	const lane = opts.lane ?? (uid + 1) % 3;
	const ex = x ?? Math.random() * 22 - 11,
		ey = y ?? (boss ? 15.2 : 10.5 + lane * 2.8);
	const mesh = boss
		? visuals.createBoss()
		: visuals.createEnemy(type, wave % 3);
	const e = bodyEntity(
		"enemy",
		type,
		ex,
		ey,
		mesh,
		boss ? 2.7 : shard ? 0.43 : 0.86,
		boss ? 1.5 : shard ? 0.37 : 0.56,
		2,
		9,
	);
	Object.assign(e, {
		baseX: ex,
		baseY: ey,
		phase: Math.random() * 6.28,
		fire: 1.5 + Math.random() * 2,
		lane,
		hp: boss ? 48 : 1,
		maxHp: boss ? 48 : 1,
		diving: false,
		pair: opts.pair || null,
		flash: 0,
		open: true,
		diveDelay: 0,
		appear: 0,
	});
	stats.spawnedTypes.add(type);
	if (type === "phantom") stats.phantoms++;
	if (boss) {
		e.baseX = 0;
		e.x = 0;
		e.y = 15.2;
		e.body.setTranslation({ x: 0, y: 15.2, z: 0 }, true);
		toast("The eye opens after each volley. Fire into the glow.", 5);
	}
	return e;
}
function shoot(p) {
	if (p.cooldown > 0) return;
	p.cooldown = 1 / balance.fireRate;
	const e = bodyEntity(
		"shot",
		"friendly",
		p.x,
		p.y + 1.1,
		visuals.createShot(false),
		0.12,
		0.42,
		1,
		2,
		true,
	);
	Object.assign(e, {
		owner: p.playerId,
		vx: settings.tracer ? p.axis * 3 : 0,
		vy: 31,
		life: 1.5,
	});
	e.body.setLinvel({ x: e.vx, y: e.vy, z: 0 }, true);
	totalShots++;
	p.shotCount++;
	p.mesh.scale.y = 1.09;
	audio.sfx("shoot", 1 + p.index * 0.15);
}
function enemyShot(e, angle = 0, guided = false) {
	const target = players[Math.floor(Math.random() * players.length)] || {
		x: 0,
		y: 1.6,
	};
	let dx = guided
		? clamp((target.x - e.x) * 0.28, -3, 3)
		: Math.sin(angle) * balance.bulletSpeed;
	let dy = -Math.cos(angle) * balance.bulletSpeed;
	const s = bodyEntity(
		"shot",
		"hostile",
		e.x,
		e.y - 1,
		visuals.createShot(true),
		0.18,
		0.27,
		4,
		8,
		true,
	);
	Object.assign(s, {
		vx: dx,
		vy: dy,
		life: 5,
		guided,
		owner: e.id,
		target: target.playerId,
	});
	s.body.setLinvel({ x: dx, y: dy, z: 0 }, true);
	stats.enemyShots++;
}
function damageEnemy(e, damage = 1) {
	if (e.dead) return;
	if (e.type === "boss" && !e.open) {
		visuals.burst(e.x, e.y - 1, 0x8ce6e0, 3);
		audio.sfx("hit", 0.6);
		return;
	}
	e.hp -= damage;
	e.flash = 0.1;
	shotsHit++;
	if (e.type === "boss") {
		stats.bossHits++;
		audio.sfx("hit", 0.7);
		visuals.burst(e.x + (Math.random() - 0.5) * 2, e.y - 1, 0xffcc86, 5);
		shake = Math.max(shake, 0.08);
	}
	if (e.hp > 0) return;
	killEnemy(e);
}
function killEnemy(e) {
	if (e.dead) return;
	const type = e.type,
		x = e.x,
		y = e.y;
	const paired = e.pair;
	removeEntity(e);
	const color =
		type === "splitter" ? 0xc795ef : type === "phantom" ? 0x8ce6e0 : 0xffae6d;
	visuals.burst(x, y, color, type === "boss" ? 80 : 18);
	audio.sfx(
		type === "splitter" ? "split" : "explode",
		type === "shard" ? 1.4 : 1,
	);
	shake = Math.max(shake, type === "boss" ? 0.5 : 0.09);
	if (type === "splitter") {
		const pair = uid + 100000;
		spawnEnemy("shard", x - 0.55, y, { pair });
		spawnEnemy("shard", x + 0.55, y, { pair });
		stats.splits++;
		return;
	}
	if (type === "shard" && paired) {
		const sibling = entities.find(
			(s) => !s.dead && s.pair === paired && s.id !== e.id,
		);
		if (sibling) {
			sibling.diving = true;
			sibling.diveDelay = 0.5;
			sibling.targetX = players.reduce(
				(p, c) =>
					Math.abs(c.x - sibling.x) < Math.abs(p.x - sibling.x) ? c : p,
				players[0],
			).x;
			audio.sfx("dive");
			stats.dives++;
		}
	}
	combo = Math.min(combo + 1, 20);
	comboTime = 3.3;
	const mult = 1 + Math.floor(combo / 5);
	score += Math.round(
		(type === "boss"
			? 3000
			: type === "shard"
				? 160
				: type === "phantom"
					? 180
					: 100) * mult,
	);
	kills++;
	stats.enemyKills++;
	power = clamp(power + 0.065, 0, 1);
	link?.updateScore(score);
}
function hurtPlayer(p) {
	if (p.dead || p.invul > 0 || p.dash > 0 || god || attract) return;
	p.invul = 2.2;
	reserves--;
	waveHits++;
	stats.damage++;
	combo = 0;
	shake = 0.45;
	flash = 0.3;
	audio.sfx("hurt");
	visuals.burst(p.x, p.y, 0xff9a62, 28);
	if (reserves <= 0) finishRun(false);
	else
		toast(
			`${reserves} bunker${reserves === 1 ? "" : "s"} left. Keep the cannon moving.`,
			2,
		);
}
function dashPlayer(p) {
	if (p.dashCooldown > 0) return;
	p.dash = 0.23;
	p.dashCooldown = 2.6;
	p.invul = Math.max(p.invul, 0.38);
	stats.dashes++;
	audio.sfx("shield");
	visuals.burst(p.x, p.y, 0x8ce6e0, 13);
}
function pulse() {
	if (power < 0.99) {
		toast(`Pulse charging · ${Math.floor(power * 100)}%`, 1);
		return;
	}
	power = 0;
	stats.pulses++;
	audio.sfx("shield");
	shake = 0.24;
	flash = 0.12;
	players.forEach((p) => visuals.burst(p.x, p.y + 1, 0x8ce6e0, 45));
	entities
		.filter((e) => e.kind === "shot" && e.type === "hostile")
		.forEach((e) => {
			visuals.burst(e.x, e.y, 0x8ce6e0, 3);
			removeEntity(e);
		});
	[...entities]
		.filter((e) => e.kind === "enemy")
		.forEach((e) => damageEnemy(e, e.type === "boss" ? 6 : 1));
	toast("SCATTER PULSE · Sky clear", 1.4);
}
function finishRun(victory) {
	if (screen === "result" || terminalReported) return;
	won = victory;
	terminalReported = true;
	if (!attract && !devUsed && score > best) {
		best = score;
		try {
			localStorage.setItem("dpo-best", best);
		} catch {}
	}
	if (attract) {
		clearCombat();
		wave = 0;
		score = 0;
		runTime = 0;
		terminalReported = false;
		beginWave(1);
		return;
	}
	audio.sfx(victory ? "win" : "hurt");
	renderResult();
	link?.finish(score, victory, captureState());
}

function localInput(index = 0) {
	const primary = index === 0;
	let axis = 0,
		fire = false,
		dash = false,
		pulseInput = false;
	const pad = gamepads[index];
	if (pad) {
		axis = Math.abs(pad.axes?.[0] || 0) > 0.15 ? pad.axes[0] : 0;
		axis +=
			(pad.buttons?.[15]?.pressed ? 1 : 0) -
			(pad.buttons?.[14]?.pressed ? 1 : 0);
		fire = !!(pad.buttons?.[0]?.pressed || pad.buttons?.[7]?.pressed);
		dash = !!(pad.buttons?.[1]?.pressed || pad.buttons?.[5]?.pressed);
		pulseInput = !!(pad.buttons?.[2]?.pressed || pad.buttons?.[4]?.pressed);
	}
	if (primary) {
		axis += (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
		if (!coop)
			axis +=
				(keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
		fire ||=
			keys.has("Space") ||
			mouse.down ||
			settings.assist ||
			lastDevice === "touch";
		dash ||=
			keys.has("ShiftLeft") || (!coop && keys.has("ShiftRight")) || pendingDash;
		pulseInput ||= keys.has("KeyQ") || pendingPulse;
	} else {
		axis += (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
		fire ||= keys.has("Enter");
		dash ||= keys.has("ShiftRight");
		pulseInput ||= keys.has("Slash");
	}
	let target = null;
	if (primary && mouse.active && lastDevice === "mouse") target = mouse.x;
	if (primary && touch.active) target = touch.x;
	return { axis: clamp(axis, -1, 1), fire, dash, pulse: pulseInput, target };
}
function aiInput(p) {
	const targets = entities.filter((e) => e.kind === "enemy" && !e.dead);
	targets.sort((a, b) => a.y - b.y);
	const target =
		targets.find((e) => e.type !== "phantom" || e.open) || targets[0];
	let tx = target ? target.x : Math.sin(time) * 8;
	if (target?.type === "boss") tx = target.x;
	const threat = entities
		.filter(
			(e) =>
				e.type === "hostile" && !e.dead && e.y < 6 && Math.abs(e.x - p.x) < 1.6,
		)
		.sort((a, b) => a.y - b.y)[0];
	if (threat) tx = p.x + (p.x > threat.x ? 4 : -4);
	return {
		axis: clamp((tx - p.x) * 2, -1, 1),
		fire: true,
		dash: !!threat,
		pulse:
			power >= 1 && entities.filter((e) => e.type === "hostile").length > 10,
		target: null,
	};
}
function updatePlayer(p, dt) {
	p.cooldown = Math.max(0, p.cooldown - dt);
	p.invul = Math.max(0, p.invul - dt);
	p.dashCooldown = Math.max(0, p.dashCooldown - dt);
	p.dash = Math.max(0, p.dash - dt);
	let input;
	if (attract || autoplay) input = aiInput(p);
	else if (online()) {
		input =
			p.playerId === link.localId
				? localInput(0)
				: remoteInputs.get(p.playerId) || { axis: 0 };
	} else input = localInput(p.index);
	let axis = Number(input.axis) || 0;
	if (input.target != null) axis = clamp((input.target - p.x) * 6, -1, 1);
	p.axis = axis;
	if (Math.abs(axis) > 0.1) p.dir = Math.sign(axis);
	if (input.dash && !p.previousDash) dashPlayer(p);
	if (input.pulse && !p.previousPulse) pulse();
	p.previousDash = !!input.dash;
	p.previousPulse = !!input.pulse;
	p.x = clamp(
		p.x + (p.dash > 0 ? p.dir * 32 : axis * balance.speed) * dt,
		-13.2,
		13.2,
	);
	p.y = 1.6 + Math.sin(time * 6 + p.index) * 0.04;
	p.body.setNextKinematicTranslation({ x: p.x, y: p.y, z: 0 });
	p.mesh.position.set(p.x, p.y, 0);
	p.mesh.rotation.z = THREE.MathUtils.lerp(
		p.mesh.rotation.z,
		-axis * 0.12,
		0.18,
	);
	p.mesh.scale.y = THREE.MathUtils.lerp(p.mesh.scale.y, 1, 0.2);
	p.mesh.visible = p.invul <= 0 || Math.floor(p.invul * 15) % 2 === 0;
	p.mesh.userData.dash = p.dash > 0;
	if (input.fire && introTimer < 1.5) shoot(p);
}
function updateEnemy(e, dt) {
	e.age += dt;
	e.appear = Math.min(1, e.appear + dt * 3);
	let level =
		balance.enemySpeed * (1 + (wave > 6 ? 0.15 * Math.floor(wave / 6) : 0));
	if (e.type === "boss") {
		e.x = Math.sin(e.age * 0.57) * 7;
		e.y = 15 + Math.sin(e.age * 0.93) * 1.2;
		e.open = e.age % 7 > 2.7;
		e.mesh.userData.open = e.open;
		e.mesh.rotation.z = Math.sin(e.age) * 0.05;
		e.fire -= dt * balance.enemyFire;
		if (e.fire <= 0) {
			e.fire = e.open ? 1.3 : 0.7;
			for (let i = -3; i <= 3; i++) enemyShot(e, i * 0.19, wave > 6);
			if (
				e.age > 10 &&
				Math.random() < 0.23 &&
				entities.filter((a) => a.kind === "enemy").length < 4
			)
				spawnEnemy("splitter", e.x, 12);
		}
	} else if (e.diving) {
		e.diveDelay = Math.max(0, e.diveDelay - dt);
		if (e.diveDelay <= 0) {
			e.x += clamp((e.targetX - e.x) * 0.7, -5, 5) * dt * level;
			e.y -= 8.4 * dt * level;
			e.mesh.rotation.z = Math.atan2(e.targetX - e.x, 6) * -0.4;
		}
		if (e.y < 0.2) {
			visuals.burst(e.x, 0.2, 0xff9a62, 12);
			removeEntity(e);
			return;
		}
	} else {
		e.x = clamp(
			Math.sin(e.age * (0.72 + e.lane * 0.13) * level + e.phase) *
				(e.type === "shard" ? 10 : 11.4),
			-12,
			12,
		);
		e.y = e.baseY + Math.sin(e.age * 1.7 + e.phase) * 0.55;
		if (e.type === "phantom") {
			e.open = e.age % 4.2 < 2.7;
			e.mesh.scale.setScalar(e.appear * (e.open ? 1 : 0.25));
		} else e.mesh.scale.setScalar(e.appear * (e.type === "shard" ? 0.57 : 1));
		e.fire -= dt * balance.enemyFire;
		if (e.fire <= 0 && introTimer <= 0) {
			const lower = entities
				.filter((a) => a.kind === "enemy" && !a.dead)
				.reduce((a, b) => (a.y < b.y ? a : b), e);
			if (lower === e || wave >= 4) {
				enemyShot(e, 0, wave >= 4);
				if (wave >= 5) {
					enemyShot(e, -0.25);
					enemyShot(e, 0.25);
				}
			}
			e.fire =
				(2.5 + Math.random() * 1.4) /
				(waves[(wave - 1) % 6].fire * balance.difficulty);
		}
	}
	e.body.setNextKinematicTranslation({ x: e.x, y: e.y, z: 0 });
	e.mesh.position.set(e.x, e.y, 0);
	if (e.flash > 0) {
		e.flash -= dt;
		e.mesh.scale.multiplyScalar(1.06);
	}
}
function simulation(dt) {
	if (!activeRun() || !authoritative()) return;
	time += dt;
	runTime += dt;
	introTimer = Math.max(0, introTimer - dt);
	if (comboTime > 0) {
		comboTime -= dt;
		if (comboTime <= 0) combo = 0;
	}
	power = clamp(power + dt * 0.022 * balance.pulseRecharge, 0, 1);
	if (spawnLeft > 0 && introTimer <= 0.8) {
		spawnTimer -= dt;
		if (
			spawnTimer <= 0 &&
			entities.filter(
				(e) => e.kind === "enemy" && !e.dead && e.type !== "shard",
			).length < 3
		) {
			const w = waves[(wave - 1) % 6];
			spawnEnemy(w.types[(w.count - spawnLeft) % w.types.length]);
			spawnLeft--;
			spawnTimer = 0.75;
		}
	}
	for (const p of players) updatePlayer(p, dt);
	pendingDash = pendingPulse = false;
	for (const e of [...entities]) {
		if (e.dead) continue;
		if (e.kind === "enemy") updateEnemy(e, dt);
		if (e.kind === "shot") {
			e.age += dt;
			e.life -= dt;
			if (
				e.life <= 0 ||
				Math.abs(e.body.translation().x) > 17 ||
				e.body.translation().y > 23 ||
				e.body.translation().y < -0.5
			) {
				removeEntity(e);
				continue;
			}
			if (e.guided) {
				const p = players.find((p) => p.playerId === e.target) || players[0];
				if (p && e.body.translation().y > 4) {
					e.vx = THREE.MathUtils.lerp(
						e.vx,
						clamp((p.x - e.body.translation().x) * 0.85, -4, 4),
						dt * 1.3,
					);
					e.body.setLinvel({ x: e.vx, y: e.vy, z: 0 }, true);
				}
			}
			if (e.type === "friendly" && settings.tracer) {
				const p = players.find((p) => p.playerId === e.owner);
				if (p) {
					e.vx = THREE.MathUtils.lerp(e.vx, p.axis * 6, dt * 6);
					e.body.setLinvel({ x: e.vx, y: e.vy, z: 0 }, true);
				}
			}
		}
	}
	world.step(events);
	const contacts = [];
	events.drainCollisionEvents((h1, h2, started) =>
		contacts.push([h1, h2, started]),
	);
	for (const [h1, h2, started] of contacts) {
		if (!started) continue;
		const a = handles.get(h1),
			b = handles.get(h2);
		if (!a || !b || a.dead || b.dead) continue;
		stats.collisions++;
		const shot = a.kind === "shot" ? a : b.kind === "shot" ? b : null;
		const enemy = a.kind === "enemy" ? a : b.kind === "enemy" ? b : null;
		const p = a.kind === "player" ? a : b.kind === "player" ? b : null;
		if (shot && enemy && shot.type === "friendly") {
			removeEntity(shot);
			damageEnemy(enemy);
		}
		if (p && (enemy || shot?.type === "hostile")) {
			hurtPlayer(p);
			if (shot) removeEntity(shot);
			if (enemy?.type === "shard") killEnemy(enemy);
		}
	}
	for (const e of entities)
		if (!e.dead && e.kind === "shot") {
			const t = e.body.translation();
			e.x = t.x;
			e.y = t.y;
			e.mesh.position.set(t.x, t.y, 0.1);
			e.mesh.rotation.z = -Math.atan2(e.vx, Math.abs(e.vy));
		}
	entities = entities.filter((e) => !e.dead);
	if (
		!spawnLeft &&
		!entities.some((e) => e.kind === "enemy") &&
		introTimer <= 0
	) {
		if (clearTimer < 0) {
			clearTimer = 2.5;
			entities.filter((e) => e.kind === "shot").forEach(removeEntity);
			stats.wavesCleared++;
			if (waveHits === 0) {
				reserves = Math.min(6, reserves + 1);
				score += 500;
				announce("CLEAN SWEEP", "+1 reserve bunker · +500 points", 2);
			} else
				announce("WAVE CLEAR", "Recalibrating cannon. Reloading courage.", 2);
			audio.sfx("pickup");
		} else {
			clearTimer -= dt;
			if (clearTimer <= 0) beginWave(wave + 1);
		}
	}
	updateHUD();
}
function updateHUD() {
	const w = waves[(Math.max(1, wave) - 1) % 6];
	$("#score").textContent = String(score).padStart(6, "0");
	$("#wave-label").textContent =
		`${endless ? "Overtime" : "Wave"} ${String(wave).padStart(2, "0")} / ${endless ? "∞" : "06"}`;
	$("#wave-name").textContent = w.name;
	$("#wave-dots").innerHTML = waves
		.map((_, i) => `<i class="${i < ((wave - 1) % 6) + 1 ? "on" : ""}"></i>`)
		.join("");
	$("#reserves").textContent =
		"◆ ".repeat(Math.max(0, reserves)) + "◇ ".repeat(Math.max(0, 6 - reserves));
	$("#combo").textContent =
		combo >= 5 ? `×${1 + Math.floor(combo / 5)} FLOCK STREAK` : "";
	$("#power-meter").style.width = power * 100 + "%";
	$("#power-key").textContent =
		power >= 0.99 ? glyph("pulse") : Math.floor(power * 100) + "%";
	const b = entities.find((e) => e.type === "boss" && !e.dead);
	$("#bossbar").style.display = b ? "block" : "none";
	if (b) {
		$("#bosshp").style.width = (100 * b.hp) / b.maxHp + "%";
		$("#bossbar").firstChild.textContent = b.open
			? "THE BIG PECK · EYE OPEN"
			: "THE BIG PECK · ARMORED";
	}
	$("#touch-pulse").style.display =
		lastDevice === "touch" && screen === "playing" && power >= 0.99
			? "block"
			: "none";
	$("#network-label").textContent = attract
		? "AUTOPILOT"
		: online()
			? (link.hubActive ? "AI HUB · " : "ONLINE · ") +
				(link.isHost ? "HOST" : "WINGMATE")
			: coop
				? "TWO PILOTS · SHARED BUNKERS"
				: "SOLO PATROL";
}

function titleDecor() {
	if (!ready) return;
	resetWorld();
	const s = visuals.createShip(0);
	s.position.set(5, 1.6, 0);
	scene.add(s);
	entities.push({ id: ++uid, kind: "decor", mesh: s, dead: false });
	for (let i = 0; i < 3; i++) {
		const e = visuals.createEnemy(["grunt", "splitter", "phantom"][i], i);
		e.position.set(4 + i * 3, 10 + i * 2, 0);
		e.scale.setScalar(i === 1 ? 1.2 : 1);
		scene.add(e);
		entities.push({ id: ++uid, kind: "decor", mesh: e, dead: false, phase: i });
	}
}
function startAttract() {
	startRun(false);
	attract = true;
	god = true;
	$("#demo-label").style.display = "block";
	introTimer = 0.5;
	announce(
		"NIGHT SHIFT · LIVE DEMO",
		"Any input returns to the title screen",
		3,
	);
}
function interruptAttract() {
	if (!attract) return false;
	attract = false;
	god = false;
	resetWorld();
	renderTitle();
	return true;
}
function captureState() {
	return {
		v: 1,
		time,
		runTime,
		score,
		wave,
		reserves,
		combo,
		power,
		kills,
		totalShots,
		shotsHit,
		screen,
		won,
		spawnLeft,
		introTimer,
		entities: entities
			.filter((e) => !e.dead && e.kind !== "decor")
			.map((e) => ({
				id: e.id,
				k: e.kind,
				t: e.type,
				x: Math.round(e.x * 100) / 100,
				y: Math.round(e.y * 100) / 100,
				h: e.hp,
				m: e.maxHp,
				p: e.playerId,
				i: e.index,
				o: e.open,
				d: e.diving,
				iv: e.invul,
			})),
	};
}
function receiveState(s) {
	if (!s || s.v !== 1 || link.isHost) return;
	networkState = s;
	time = s.time;
	runTime = s.runTime;
	score = s.score;
	wave = s.wave;
	reserves = s.reserves;
	combo = s.combo;
	power = s.power;
	kills = s.kills;
	won = s.won;
	totalShots = s.totalShots;
	shotsHit = s.shotsHit;
	const ids = new Set(s.entities.map((e) => e.id));
	entities
		.filter((e) => !ids.has(e.id))
		.forEach((e) => {
			scene.remove(e.mesh);
			visuals.remove?.(e.mesh);
			e.dead = true;
		});
	entities = entities.filter((e) => !e.dead);
	for (const d of s.entities) {
		let e = entities.find((e) => e.id === d.id);
		if (!e) {
			let mesh =
				d.k === "player"
					? visuals.createShip(d.i)
					: d.k === "enemy"
						? d.t === "boss"
							? visuals.createBoss()
							: visuals.createEnemy(d.t, wave % 3)
						: visuals.createShot(d.t === "hostile");
			e = { id: d.id, kind: d.k, type: d.t, mesh, x: d.x, y: d.y, dead: false };
			scene.add(mesh);
			entities.push(e);
		}
		Object.assign(e, {
			targetX: d.x,
			targetY: d.y,
			hp: d.h,
			maxHp: d.m,
			playerId: d.p,
			index: d.i,
			open: d.o,
			diving: d.d,
			invul: d.iv,
		});
		e.mesh.userData.open = d.o;
	}
	players = entities.filter((e) => e.kind === "player");
	if (s.screen === "result" && screen !== "result") {
		won = s.won;
		renderResult();
	} else if (
		["pause", "dev", "settings", "help", "about"].includes(s.screen) &&
		screen === "playing"
	) {
		setScreen("network-pause");
		$("#hud").style.display = "block";
		$("#screen").innerHTML = modal(
			"Shared patrol",
			"Host is paused",
			"<p>Your wingmate is checking the flight deck. The patrol resumes together.</p>",
		);
	} else if (s.screen === "playing" && screen !== "playing") {
		setScreen("playing");
	}
	updateHUD();
}
function pollGamepads(dt) {
	gamepads = [...(navigator.getGamepads?.() || [])].filter(Boolean);
	let any = false;
	for (const pad of gamepads) {
		const prev = padPrevious.get(pad.index) || [];
		const buttons = pad.buttons.map((b) => b.pressed);
		const axis = pad.axes?.[0] || 0;
		const ay = pad.axes?.[1] || 0;
		const pressed = buttons.some((v, i) => v && !prev[i]);
		if (pressed || Math.abs(axis) > 0.2 || Math.abs(ay) > 0.2) {
			setDevice("pad");
			idle = 0;
			any = true;
			if (interruptAttract()) {
				padPrevious.set(pad.index, buttons);
				return;
			}
		}
		if (buttons[9] && !prev[9] && !buttons[8]) {
			audio.unlock();
			if (screen === "playing" && (!online() || link.isHost)) renderPause();
			else if (screen === "pause") setScreen("playing");
		}
		if (
			screen !== "playing" &&
			(!link?.hubActive ||
				["pause", "settings", "help", "about", "dev"].includes(screen))
		) {
			menuRepeat -= dt;
			let direction =
				(buttons[13] ? 1 : 0) -
				(buttons[12] ? 1 : 0) +
				(Math.abs(ay) > 0.55 ? Math.sign(ay) : 0);
			if (direction && menuRepeat <= 0) {
				menuMove(Math.sign(direction));
				menuRepeat = 0.2;
			}
			if (buttons[0] && !prev[0]) menuAccept();
			if (buttons[1] && !prev[1]) {
				if (link?.panel) {
					link.close();
					link.hidePanel();
				} else if (screen === "pause") setScreen("playing");
				else if (["settings", "help", "about"].includes(screen)) act("back");
				else if (screen === "dev") renderPause();
			}
			if (menuRepeat <= 0 && Math.abs(axis) > 0.6) {
				menuAdjust(Math.sign(axis));
				menuRepeat = 0.15;
			}
		}
		padPrevious.set(pad.index, buttons);
	}
	return any;
}
function inputOccurred(device) {
	setDevice(device);
	idle = 0;
	return interruptAttract();
}
window.addEventListener("keydown", (e) => {
	if (
		["INPUT", "TEXTAREA"].includes(e.target.tagName) &&
		(e.target.type !== "range" ||
			!["Escape", "Enter", "ArrowUp", "ArrowDown"].includes(e.code))
	)
		return;
	if (
		[
			"Space",
			"ArrowUp",
			"ArrowDown",
			"ArrowLeft",
			"ArrowRight",
			"Enter",
			"Slash",
		].includes(e.code)
	)
		e.preventDefault();
	if (inputOccurred("keyboard")) return;
	audio.unlock();
	keys.add(e.code);
	if (e.repeat) return;
	if (e.code === "Escape" || e.code === "KeyP") {
		if (screen === "playing") {
			if (!online() || link.isHost) renderPause();
		} else if (screen === "pause") setScreen("playing");
		else if (["help", "settings", "about"].includes(screen)) act("back");
		else if (screen === "dev") renderPause();
		return;
	}
	if (e.code === "KeyM") {
		muted = !muted;
		audio.setMuted(muted);
		toast(muted ? "Lunar radio muted" : "Lunar radio on", 1);
		return;
	}
	if (screen !== "playing") {
		if (e.code === "ArrowDown" || e.code === "KeyS") menuMove(1);
		else if (e.code === "ArrowUp" || e.code === "KeyW") menuMove(-1);
		else if (e.code === "ArrowLeft") menuAdjust(-1);
		else if (e.code === "ArrowRight") menuAdjust(1);
		else if (e.code === "Enter" || e.code === "Space") menuAccept();
	}
});
window.addEventListener("keyup", (e) => keys.delete(e.code));
$("#world").addEventListener("pointermove", (e) => {
	if (e.pointerType === "touch") return;
	if (Math.abs(e.movementX) + Math.abs(e.movementY) < 1) return;
	if (inputOccurred("mouse")) return;
	mouse.active = true;
	mouse.x = pointerWorldX(e.clientX);
});
window.addEventListener("pointerdown", (e) => {
	if (e.pointerType === "touch") return;
	const interrupted = inputOccurred("mouse");
	audio.unlock();
	if (interrupted) {
		e.preventDefault();
		return;
	}
	if (e.target === $("#world") && screen === "playing") {
		mouse.down = true;
		mouse.active = true;
		mouse.x = pointerWorldX(e.clientX);
	}
});
window.addEventListener("pointerup", () => (mouse.down = false));
window.addEventListener("pointermove", (e) => {
	if (
		e.pointerType !== "touch" &&
		Math.abs(e.movementX) + Math.abs(e.movementY) > 1 &&
		screen !== "playing"
	)
		inputOccurred("mouse");
});
function pointerWorldX(x) {
	const v = new THREE.Vector3((x / innerWidth) * 2 - 1, 0, 0);
	v.unproject(camera);
	return clamp(v.x, -13.2, 13.2);
}
let lastTap = 0;
$("#world").addEventListener(
	"touchstart",
	(e) => {
		e.preventDefault();
		if (inputOccurred("touch")) return;
		audio.unlock();
		if (screen !== "playing") return;
		const t = e.changedTouches[0];
		if (!touch.active) {
			touch.active = true;
			touch.id = t.identifier;
			touch.startX = t.clientX;
			touch.startPlayer =
				(online()
					? players.find((p) => p.playerId === link.localId)
					: players[0]
				)?.x || 0;
			touch.x = touch.startPlayer;
			$("#touch-ring").style.display = "block";
			$("#touch-ring").style.left = t.clientX + "px";
			$("#touch-ring").style.top = t.clientY + "px";
		}
		if (performance.now() - lastTap < 280) pendingDash = true;
		lastTap = performance.now();
	},
	{ passive: false },
);
$("#world").addEventListener(
	"touchmove",
	(e) => {
		e.preventDefault();
		const t = [...e.touches].find((t) => t.identifier === touch.id);
		if (!t) return;
		touch.x = clamp(
			touch.startPlayer + ((t.clientX - touch.startX) / innerWidth) * 40,
			-13.2,
			13.2,
		);
		$("#touch-ring").style.left = t.clientX + "px";
		$("#touch-ring").style.top = t.clientY + "px";
	},
	{ passive: false },
);
const endTouch = (e) => {
	if (![...e.touches].some((t) => t.identifier === touch.id)) {
		touch.active = false;
		$("#touch-ring").style.display = "none";
	}
};
$("#world").addEventListener("touchend", endTouch);
$("#world").addEventListener("touchcancel", endTouch);
$("#touch-pulse").addEventListener("pointerdown", (e) => {
	e.preventDefault();
	e.stopPropagation();
	pendingPulse = true;
	audio.unlock();
});
$("#pause-button").onclick = () => {
	audio.unlock();
	if (!online() || link.isHost) renderPause();
	else toast("The host controls the shared pause.");
};
window.addEventListener("blur", () => {
	keys.clear();
	mouse.down = false;
	touch.active = false;
	if (screen === "playing" && !attract && !online()) renderPause();
});
document.addEventListener("visibilitychange", () => {
	if (document.hidden) {
		audio.setPaused(true);
		keys.clear();
		mouse.down = false;
		if (screen === "playing" && !attract && !online()) renderPause();
	} else if (screen === "playing") audio.setPaused(false);
});
window.addEventListener("resize", () => resize());
function resize() {
	if (!renderer) return;
	renderer.setSize(innerWidth, innerHeight);
	const aspect = innerWidth / innerHeight,
		half = Math.max(12, 16 / aspect);
	camera.left = -half * aspect;
	camera.right = half * aspect;
	camera.top = half;
	camera.bottom = -half;
	camera.updateProjectionMatrix();
}

function frame(now) {
	requestAnimationFrame(frame);
	const dt = Math.min((now - last) / 1000, 0.05) || 0.016;
	last = now;
	renderFrames++;
	pollGamepads(dt);
	if (!ready) return;
	if (screen === "title") {
		idle += dt;
		if ($("#idle-caption"))
			$("#idle-caption").textContent =
				`Autopilot demonstration in ${Math.max(0, Math.ceil(10 - idle))}s`;
		if (idle >= 10 && !link.hubActive && !link.panel) startAttract();
		for (const e of entities)
			if (e.kind === "decor" && e.phase != null) {
				e.mesh.position.y =
					10 + e.phase * 2 + Math.sin(now * 0.001 + e.phase) * 0.5;
				e.mesh.position.x =
					4 + e.phase * 3 + Math.sin(now * 0.0006 + e.phase) * 1.6;
			}
	}
	if (screen === "playing") {
		if (online() && !link.isHost) {
			link.sendInput(localInput(0));
			pendingDash = pendingPulse = false;
			for (const e of entities) {
				e.x = THREE.MathUtils.lerp(e.x, e.targetX ?? e.x, 0.35);
				e.y = THREE.MathUtils.lerp(e.y, e.targetY ?? e.y, 0.35);
				e.mesh.position.set(e.x, e.y, 0);
			}
		} else {
			accum += dt * (slow ? 0.5 : 1);
			let n = 0;
			while (accum >= 1 / 60 && n++ < 5) {
				simulation(1 / 60);
				accum -= 1 / 60;
			}
		}
	}
	if (online() && link.isHost) {
		snapshotTime += dt;
		if (snapshotTime >= 0.1) {
			snapshotTime = 0;
			link.sendState(captureState());
		}
	}
	if (bannerTimer > 0) {
		bannerTimer -= dt;
		if (bannerTimer <= 0) $("#banner").classList.remove("show");
	}
	if (toastTimer > 0) {
		toastTimer -= dt;
		if (toastTimer <= 0) $("#toast").classList.remove("show");
	}
	shake = Math.max(0, shake - dt);
	flash = Math.max(0, flash - dt);
	camera.position.x = settings.shake ? (Math.random() - 0.5) * shake * 0.7 : 0;
	camera.position.y =
		10 + (settings.shake ? (Math.random() - 0.5) * shake * 0.4 : 0);
	$("#flash").style.opacity = flash * 0.25;
	visuals.update(dt, now * 0.001);
	audio.tick(dt, screen === "playing");
	renderer.render(scene, camera);
}

async function init() {
	try {
		await RAPIER.init();
		$("#loading-text").textContent = "Calibrating the cannon…";
		scene = new THREE.Scene();
		scene.background = new THREE.Color(0x10172b);
		camera = new THREE.OrthographicCamera(-20, 20, 22, -2, 0.1, 300);
		camera.position.set(0, 10, 45);
		camera.lookAt(0, 10, 0);
		renderer = new THREE.WebGPURenderer({
			canvas: $("#world"),
			antialias: true,
			alpha: false,
			forceWebGL:
				new URLSearchParams(location.search).get("renderer") === "webgl",
		});
		renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
		await renderer.init();
		renderer.outputColorSpace = THREE.SRGBColorSpace;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1.2;
		visuals = new GameVisuals(scene);
		visuals.buildStage();
		resetWorld();
		resize();
		ready = true;
		window.gameTest = {
			ready: true,
			get state() {
				return {
					screen,
					attract,
					wave,
					score,
					reserves,
					power,
					kills,
					runTime,
					spawnLeft,
					entityCount: entities.length,
					players: players.map((p) => ({
						id: p.playerId,
						x: p.x,
						y: p.y,
						shots: p.shotCount,
						dash: p.dash,
						invul: p.invul,
					})),
					types: [...stats.spawnedTypes],
					stats: { ...stats, spawnedTypes: [...stats.spawnedTypes] },
					balance: { ...balance },
					settings: { ...settings },
					backend: renderer.backend.isWebGPUBackend ? "webgpu" : "webgl",
					version: THREE.REVISION,
					rapier: RAPIER.version(),
					audio: audio.metrics,
					frames: renderFrames,
					hub: link
						? {
								active: link.hubActive,
								host: link.isHost,
								connected: link.connected,
								server: link.server,
								role: link.role,
							}
						: null,
					entities: entities
						.filter((e) => !e.dead)
						.map((e) => ({
							id: e.id,
							kind: e.kind,
							type: e.type,
							x: e.x,
							y: e.y,
							hp: e.hp,
							diving: e.diving,
						})),
				};
			},
			start: (c = false) => startRun(c),
			step: (n) => {
				for (let i = 0; i < n; i++) simulation(1 / 60);
			},
			autoplay: (v) => {
				autoplay = v;
				god = v;
			},
			wave: (n) => {
				clearCombat();
				beginWave(n);
				introTimer = 0;
				spawnTimer = 0;
			},
			input: (v) => {
				keys = new Set(v);
			},
			damage: () => {
				players[0].invul = 0;
				hurtPlayer(players[0]);
			},
			pulse: () => {
				power = 1;
				pulse();
			},
			dash: () => dashPlayer(players[0]),
			spawn: (type, x, y) => spawnEnemy(type, x, y),
			hit: (id) => damageEnemy(entities.find((e) => e.id === id)),
			set: (k, v) => {
				if (k in balance) balance[k] = v;
			},
			pause: renderPause,
			act,
			attract: startAttract,
			snapshot: captureState,
			finish: (v) => finishRun(v),
			audioTest: () => SynthAudio.renderTest(),
			get link() {
				return link;
			},
			get audio() {
				return audio;
			},
		};
		link = new HubLink({
			onInput: (input, id) => {
				if (input && typeof input === "object")
					remoteInputs.set(id, {
						axis: clamp(Number(input.axis) || 0, -1, 1),
						fire: !!input.fire,
						dash: !!input.dash,
						pulse: !!input.pulse,
						target:
							input.target == null
								? null
								: clamp(Number(input.target) || 0, -13.2, 13.2),
					});
			},
			onState: receiveState,
			onStatus: (s) => {
				if (ready) toast(s, 3);
			},
			onStart: (info) => {
				onlineStarting = true;
				startRun((info.players || link.players).length > 1, false, {
					players: info.players || link.players,
				});
				if (!link.isHost) {
					clearCombat();
					players.forEach((p) => removeEntity(p));
					entities = [];
					players = [];
				}
				setScreen("playing");
			},
			onJoin: () => {},
			onEnd: () => {
				if (screen !== "result") {
					renderResult();
				}
				audio.setPaused(true);
			},
			onLeave: (detail) => {
				remoteInputs.delete(detail.id);
				if (link.isHost) {
					players.filter((p) => p.playerId === detail.id).forEach(removeEntity);
					players = players.filter((p) => p.playerId !== detail.id);
					if (screen === "playing")
						toast("Wingmate disconnected. You can finish the patrol.", 4);
				}
			},
			onTimeUp: () => {
				if (authoritative()) finishRun(false);
			},
		});
		$("#loading").remove();
		if (window.AIHub?.active) {
			setScreen("hub-wait");
			$("#screen").innerHTML = modal(
				"AI Hub",
				"Cannon ready",
				"<p>Waiting for the shared launch clock…</p>",
			);
			await link.init();
		} else {
			await link.init();
			renderTitle();
		}
		updatePrompts();
		last = performance.now();
		requestAnimationFrame(frame);
	} catch (err) {
		console.error(err);
		$("#loading strong").textContent = "SIGNAL INTERRUPTED";
		$("#loading-text").textContent =
			`The renderer could not start: ${err.message}. Try a current Chromium browser with GPU acceleration.`;
		window.gameBootError = String(err.stack || err);
	}
}
init();
