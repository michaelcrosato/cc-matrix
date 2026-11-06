const KEY = "ufoh-orbit:records:v1";
export class Records {
	constructor(storage) {
		this.storage = storage;
		this.data = { v: 1, mission: [], score: [], name: "PILOT " };
		this.available = true;
		try {
			const s = storage ?? globalThis.localStorage;
			this.storage = s;
			const raw = JSON.parse(s?.getItem(KEY) || "null");
			if (raw?.v === 1) {
				for (const m of ["mission", "score"])
					this.data[m] = (Array.isArray(raw[m]) ? raw[m] : [])
						.filter(
							(r) =>
								r &&
								Number.isFinite(r.score) &&
								r.score >= 0 &&
								typeof r.name === "string",
						)
						.slice(0, 5);
				this.data.name =
					typeof raw.name === "string"
						? raw.name.slice(0, 6).padEnd(6, " ")
						: "PILOT ";
			}
		} catch {
			this.available = false;
		}
	}
	best(mode) {
		return this.data[mode === "mission" ? "mission" : "score"][0]?.score || 0;
	}
	add(mode, name, score, { debug = false, attract = false } = {}) {
		if (debug || attract || !Number.isFinite(score)) return false;
		const m = mode === "mission" ? "mission" : "score",
			entry = {
				name: String(name)
					.toUpperCase()
					.replace(/[^A-Z0-9 ]/g, "")
					.slice(0, 6)
					.padEnd(6, " "),
				score: Math.max(0, Math.round(score)),
			};
		this.data.name = entry.name;
		this.data[m].push(entry);
		this.data[m].sort((a, b) => b.score - a.score);
		this.data[m] = this.data[m].slice(0, 5);
		try {
			this.storage?.setItem(KEY, JSON.stringify(this.data));
		} catch {
			this.available = false;
		}
		return true;
	}
}
