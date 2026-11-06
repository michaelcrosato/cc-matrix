export function createRecords(storage) {
	let saved = true,
		data = {
			v: 1,
			name: "PILOT ",
			mission: { score: 0, name: "------" },
			score: { score: 0, name: "------" },
		};
	try {
		const raw = JSON.parse(
			storage?.getItem("ufoh-chain-gang:records") || "null",
		);
		if (raw?.v === 1) {
			if (typeof raw.name === "string") data.name = cleanName(raw.name);
			for (const m of ["mission", "score"])
				if (Number.isFinite(raw[m]?.score) && raw[m].score >= 0)
					data[m] = {
						score: Math.floor(raw[m].score),
						name: raw[m].score === 0 ? "------" : cleanName(raw[m].name),
					};
		}
	} catch {
		saved = false;
	}
	const persist = () => {
		try {
			storage?.setItem("ufoh-chain-gang:records", JSON.stringify(data));
			saved = !!storage;
		} catch {
			saved = false;
		}
	};
	return {
		get saved() {
			return saved;
		},
		get() {
			return structuredClone(data);
		},
		qualifies(mode, score) {
			return score > data[mode].score;
		},
		commit(
			mode,
			score,
			name,
			{ debug = false, attract = false, session = false } = {},
		) {
			if (
				debug ||
				attract ||
				session ||
				!["mission", "score"].includes(mode) ||
				!Number.isFinite(score) ||
				score <= data[mode].score
			)
				return false;
			data.name = cleanName(name);
			data[mode] = { score: Math.floor(score), name: data.name };
			persist();
			return true;
		},
	};
}
export function cleanName(name) {
	return String(name || "PILOT")
		.toUpperCase()
		.replace(/[^A-Z0-9 ]/g, "")
		.slice(0, 6)
		.padEnd(6, " ");
}
