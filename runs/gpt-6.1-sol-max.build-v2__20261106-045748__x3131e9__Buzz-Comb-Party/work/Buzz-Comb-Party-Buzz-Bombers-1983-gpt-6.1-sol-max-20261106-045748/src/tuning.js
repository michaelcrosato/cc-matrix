(function (B) {
	"use strict";
	B.ARENA = Object.freeze({
		w: 640,
		h: 360,
		left: 28,
		right: 612,
		rail: 306,
		canR: 10,
		tiers: [80, 111, 142, 173, 204, 235, 264],
	});
	B.TUNE = {
		beeSpeed: [48, 20, 110, 1, "Worker speed", "px/s"],
		fastMultiplier: [1.85, 1.1, 3, 0.05, "Express speed", "×"],
		spawnInterval: [1, 0.5, 2, 0.05, "Entry timing", "×"],
		fireCadence: [0.16, 0.08, 0.5, 0.01, "Spray interval", "s"],
		capacity: [56, 12, 120, 1, "Can capacity", "pulses"],
		flowerGrowth: [2.2, 0.5, 6, 0.1, "Flower warning", "s"],
		trapDelay: [1.05, 0.4, 4, 0.05, "Hive construction", "s"],
		birdSpeed: [130, 50, 240, 5, "Bird flight", "px/s"],
		birdFeed: [1.5, 0.4, 4, 0.1, "Bird feeding", "s"],
		irritationRecovery: [7, 2, 16, 0.5, "Bird retreat", "s"],
		callCooldown: [8, 1, 20, 0.5, "Bird call", "s"],
		bonusScale: [1, 0.25, 3, 0.05, "Extra can thresholds", "×"],
		pulseSpeed: [460, 250, 800, 10, "Spray speed", "px/s"],
		moveSpeed: [205, 100, 340, 5, "Can travel", "px/s"],
		penetration: [2, 1, 4, 1, "Bee hits per pulse", "hits"],
	};
	B.defaults = () =>
		Object.fromEntries(Object.entries(B.TUNE).map(([k, v]) => [k, v[0]]));
	B.validateTuning = function (obj) {
		if (!obj || typeof obj !== "object" || Array.isArray(obj))
			throw Error("Tuning must be an object.");
		const out = B.defaults();
		for (const [k, v] of Object.entries(obj)) {
			const def = B.TUNE[k];
			if (
				!def ||
				typeof v !== "number" ||
				!Number.isFinite(v) ||
				v < def[1] ||
				v > def[2]
			)
				throw Error("Invalid tuning: " + k);
			if (["capacity", "penetration"].includes(k) && !Number.isInteger(v))
				throw Error(k + " must be a whole number.");
			out[k] = v;
		}
		return out;
	};
})((globalThis.BCP = globalThis.BCP || {}));
