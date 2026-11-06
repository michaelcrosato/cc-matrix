export const NAMESPACE = "smithereen-royal-rumble.v1";
export const SETTING_DEFAULTS = {
	music: 0.1,
	effects: 0.7,
	voice: 0.45,
	mute: false,
	glyphs: "PlayStation",
	tension: 1.4,
	prediction: false,
	reducedMotion: false,
	uiScale: 1,
	fire1: "Space",
	fire2: "ShiftRight",
	seat1: "keyboard",
	seat2: "keyboard",
	prev1: "KeyQ",
	next1: "KeyE",
	prev2: "KeyU",
	next2: "KeyO",
	touchAssist: 0,
};
export function readStorage(storage) {
	try {
		storage ??= globalThis.localStorage;
		return JSON.parse(storage.getItem(NAMESPACE) || "null");
	} catch {
		return null;
	}
}
export function load(storage) {
	const raw = readStorage(storage);
	const settings = { ...SETTING_DEFAULTS };
	if (raw?.version === 1 && raw.settings && typeof raw.settings === "object") {
		for (const key of ["music", "effects", "voice"])
			if (Number.isFinite(raw.settings[key]))
				settings[key] = Math.max(0, Math.min(1, raw.settings[key]));
		for (const key of ["mute", "prediction", "reducedMotion"])
			if (typeof raw.settings[key] === "boolean")
				settings[key] = raw.settings[key];
		if (["PlayStation", "Xbox"].includes(raw.settings.glyphs))
			settings.glyphs = raw.settings.glyphs;
		if ([1.4, 1, 0.7].includes(raw.settings.tension))
			settings.tension = raw.settings.tension;
		if (
			Number.isFinite(raw.settings.uiScale) &&
			raw.settings.uiScale >= 0.85 &&
			raw.settings.uiScale <= 1.3
		)
			settings.uiScale = raw.settings.uiScale;
		if (Number.isFinite(raw.settings.touchAssist))
			settings.touchAssist = Math.max(0, Math.min(1, raw.settings.touchAssist));
		for (const key of ["fire1", "fire2", "prev1", "next1", "prev2", "next2"])
			if (
				typeof raw.settings[key] === "string" &&
				/^(Space|ShiftRight|ShiftLeft|Key[A-Z]|Digit[0-9]|Numpad[0-9]|ControlLeft|ControlRight)$/.test(
					raw.settings[key],
				)
			)
				settings[key] = raw.settings[key];
		const used = new Set(["KeyC"]);
		for (const key of ["fire1", "fire2", "prev1", "next1", "prev2", "next2"]) {
			if (used.has(settings[key]))
				settings[key] = [
					SETTING_DEFAULTS[key],
					"Space",
					"ShiftRight",
					"KeyF",
					"KeyG",
					"KeyH",
					"KeyJ",
					"KeyK",
					"KeyL",
				].find((code) => !used.has(code));
			used.add(settings[key]);
		}
		for (const key of ["seat1", "seat2"])
			if (["keyboard", "pad0", "pad1"].includes(raw.settings[key]))
				settings[key] = raw.settings[key];
	}
	const t = raw?.tour;
	const tour =
		raw?.version === 1 &&
		t &&
		Number.isInteger(t.next) &&
		t.next >= 1 &&
		t.next <= 10 &&
		Number.isInteger(t.seed) &&
		Array.isArray(t.totals) &&
		t.totals.length === 2 &&
		t.totals.every((n) => Number.isFinite(n) && n >= 0)
			? { next: t.next, seed: t.seed, totals: t.totals, cheated: !!t.cheated }
			: null;
	return { settings, tour };
}
export function save(settings, tour, storage) {
	try {
		storage ??= globalThis.localStorage;
		storage.setItem(NAMESPACE, JSON.stringify({ version: 1, settings, tour }));
		return true;
	} catch {
		return false;
	}
}
