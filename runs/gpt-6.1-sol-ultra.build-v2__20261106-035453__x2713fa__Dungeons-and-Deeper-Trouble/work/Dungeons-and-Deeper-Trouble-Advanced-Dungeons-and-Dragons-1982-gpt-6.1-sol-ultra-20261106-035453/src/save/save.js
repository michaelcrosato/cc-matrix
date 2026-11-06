(() => {
	const hash = (text) => {
		let h = 2166136261;
		for (let i = 0; i < text.length; i++)
			h = Math.imul(h ^ text.charCodeAt(i), 16777619);
		return (h >>> 0).toString(16);
	};
	class CampaignStore {
		constructor(storage, key = "deeper-trouble:campaign:1") {
			this.storage = storage;
			this.key = key;
			this.memory = null;
			this.available = true;
			this.sequence = 0;
			this.error = "";
		}
		read() {
			const valid = [];
			try {
				for (const slot of ["a", "b"]) {
					const raw = this.storage?.getItem(this.key + ":" + slot);
					if (!raw) continue;
					try {
						const envelope = JSON.parse(raw);
						if (
							envelope.schema !== 1 ||
							typeof envelope.payload !== "string" ||
							hash(envelope.payload) !== envelope.checksum
						)
							continue;
						const data = JSON.parse(envelope.payload);
						if (
							data.content !== globalThis.DTContent?.version ||
							!data.save?.state ||
							!["map", "cave", "victory", "defeat"].includes(
								data.save.state.phase,
							) ||
							!Number.isFinite(data.save.state.quiver) ||
							!Number.isFinite(data.save.state.reserves)
						)
							continue;
						valid.push({ sequence: envelope.sequence, data });
					} catch {
						this.error = "An unreadable save was ignored.";
					}
				}
			} catch {
				this.available = false;
				this.error = "Storage is unavailable. Progress lasts for this visit.";
			}
			valid.sort((a, b) => b.sequence - a.sequence);
			if (valid.length) {
				this.sequence = valid[0].sequence;
				this.memory = valid[0].data;
			}
			return this.memory;
		}
		write(sim) {
			if (
				!sim ||
				sim.state.assisted ||
				sim.state.stats?.assisted ||
				["hub", "attract", "dev", "guest"].includes(sim.state.mode)
			)
				return false;
			const save = sim.save
				? sim.save()
				: { state: sim.snapshot(), checkpoint: sim.checkpoint };
			this.memory = {
				content: globalThis.DTContent.version,
				savedAt: new Date().toISOString(),
				save,
			};
			const payload = JSON.stringify(this.memory),
				envelope = {
					schema: 1,
					sequence: ++this.sequence,
					payload,
					checksum: hash(payload),
				};
			try {
				this.storage?.setItem(
					this.key + ":" + (this.sequence % 2 ? "a" : "b"),
					JSON.stringify(envelope),
				);
				if (!this.storage) throw Error("memory only");
			} catch {
				this.available = false;
				this.error = "Storage is unavailable. Progress lasts for this visit.";
			}
			return true;
		}
		clear() {
			this.memory = null;
			for (const slot of ["a", "b"])
				try {
					this.storage?.removeItem(this.key + ":" + slot);
				} catch {
					this.available = false;
				}
		}
	}
	globalThis.DTSave = { CampaignStore, hash };
})();
