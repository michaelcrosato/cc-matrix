import { GameAudio } from "./audio.js";

// Returns structured results for the main browser runner; never opens a device.
export async function testAudio() {
	const failures = [];
	let checks = 0;
	const check = (condition, label) => {
		checks++;
		if (!condition) failures.push(`Audio: ${label}`);
	};
	const context = new OfflineAudioContext(1, 48000 * 5, 48000);
	const audio = new GameAudio({ context });
	check(audio.inspect().musicVolume === 0.1, "music starts at ten percent");
	check(
		audio.inspect().sfxVolume === 0.65,
		"effects start at configured volume",
	);
	audio.sfx("catch");
	audio.gibberish();
	check(
		audio.inspect().notes === 0 && audio.inspect().syllables === 0,
		"audio stays silent before unlock",
	);
	await audio.unlock();
	check(audio.inspect().unlocked, "offline audio unlocks");
	audio.update(0.016, { active: true, wave: 5, combo: 20 });
	const scheduledBeat = audio.nextBeat;
	await audio.unlock();
	check(
		audio.nextBeat === scheduledBeat,
		"repeated input unlock preserves the music clock",
	);
	const suspended = [];
	for (let i = 1; i < 39; i++) {
		suspended.push(
			context.suspend(i * 0.125).then(async () => {
				audio.update(0.125, { active: i < 35, wave: 5, combo: 20 });
				if (i % 3 === 0)
					audio.sfx(audio.effects[(i / 3 - 1) % audio.effects.length]);
				if (i === 7 || i === 23) audio.gibberish(i === 7 ? "happy" : "sad");
				await context.resume();
			}),
		);
	}
	const rendered = await context.startRendering();
	await Promise.all(suspended);
	const samples = rendered.getChannelData(0);
	let finite = true;
	let energy = 0;
	let peak = 0;
	for (const sample of samples) {
		finite = finite && Number.isFinite(sample);
		peak = Math.max(peak, Math.abs(sample));
		energy += sample * sample;
	}
	const rms = Math.sqrt(energy / samples.length);
	check(finite, "render contains finite samples");
	check(rms > 0.005, "soundtrack and cues render audible energy");
	check(peak < 1, "soundtrack and cues stay below clipping");
	check(
		audio.inspect().musicSteps >= 30,
		"music scheduler advances across the whole render",
	);
	check(
		audio.inspect().effects === audio.effects.length,
		"every effect was rendered",
	);
	check(
		audio.inspect().syllables === 7,
		"happy and sad gibberish voices were synthesized",
	);
	check(
		audio.inspect().activeNodes === 0,
		"all scheduled audio nodes are released",
	);
	audio.setVolumes(-1, 4);
	check(
		audio.musicVolume === 0 && audio.sfxVolume === 1,
		"volume controls clamp their inputs",
	);
	return {
		checks,
		failures,
		metrics: { peak, rms, musicSteps: audio.stats.musicSteps },
	};
}
