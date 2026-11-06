((M) => {
	class SaveStore {
		constructor(storage) {
			this.storage = storage;
			this.key = "auto-motley-motor-v1";
			this.warning = "";
			this.data = {
				version: 1,
				passport: [],
				records: {},
				devRecords: {},
				tour: 0,
				drag: null,
			};
			this.load();
		}
		load() {
			try {
				const s = JSON.parse(this.storage?.getItem(this.key) || "null");
				if (
					s &&
					s.version === 1 &&
					Array.isArray(s.passport) &&
					s.records &&
					typeof s.records === "object"
				) {
					this.data = {
						...this.data,
						...s,
						passport: [
							...new Set(
								s.passport.filter(
									(v) =>
										v === "airfield" || M.COURSE_DATA.some((c) => c.id === v),
								),
							),
						],
						devRecords:
							s.devRecords && typeof s.devRecords === "object"
								? s.devRecords
								: {},
					};
				}
			} catch {
				this.warning = "Storage unavailable or damaged. You can still drive.";
			}
		}
		save() {
			try {
				this.storage?.setItem(this.key, JSON.stringify(this.data));
			} catch {
				this.warning =
					"Records are kept for this visit. Storage is unavailable.";
			}
		}
		passport(id) {
			if (!this.data.passport.includes(id)) {
				this.data.passport.push(id);
				this.save();
			}
		}
		recordKey(sim, settings = {}) {
			return [
				M.PHYSICS,
				sim.course.id,
				sim.course.version,
				sim.drivers[0].spec.id,
				sim.config.laps,
				settings.throttle || "auto",
				settings.steering || "relative",
				settings.assist || 0,
			].join(":");
		}
		best(sim, settings) {
			const r = this.data.records[this.recordKey(sim, settings)];
			if (
				!r ||
				r.physics !== M.PHYSICS ||
				!Number.isFinite(r.time) ||
				r.time <= 0
			)
				return null;
			const valid =
				Array.isArray(r.ghost) &&
				r.ghost.length <= 30000 &&
				r.ghost.every(
					(p, i, a) =>
						Array.isArray(p) &&
						p.length === 4 &&
						p.every(Number.isFinite) &&
						(i === 0 || p[0] >= a[i - 1][0]),
				);
			return { ...r, ghost: valid ? r.ghost : [] };
		}
		finish(sim, settings) {
			if (
				sim.config.mode !== "trial" ||
				sim.phase !== "finished" ||
				sim.drivers[0].progress.laps < sim.config.laps
			)
				return false;
			const key = this.recordKey(sim, settings),
				bucket = sim.unranked ? this.data.devRecords : this.data.records,
				time = sim.time + sim.drivers[0].penalty;
			if (!bucket[key] || time < bucket[key].time) {
				bucket[key] = {
					time,
					penalties: sim.drivers[0].penalty,
					physics: M.PHYSICS,
					courseVersion: sim.course.version,
					car: sim.drivers[0].spec.id,
					preset: sim.config.laps,
					assists: settings,
					ghost: sim.record.slice(0, 30000),
				};
				this.save();
				return true;
			}
			return false;
		}
	}
	M.SaveStore = SaveStore;
})(MM);
