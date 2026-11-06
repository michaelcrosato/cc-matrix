(() => {
	const N = globalThis.NM;
	const checksum = (text) => {
		let value = 2166136261;
		for (let i = 0; i < text.length; i++) {
			value ^= text.charCodeAt(i);
			value = Math.imul(value, 16777619);
		}
		return (value >>> 0).toString(16);
	};
	class Save {
		constructor(storage) {
			this.memory = null;
			this.key = "near-misses.campaign.v1";
			try {
				this.storage =
					storage === undefined ? globalThis.localStorage : storage;
				this.available = !!this.storage;
			} catch {
				this.storage = null;
				this.available = false;
			}
		}
		encode(data) {
			const json = JSON.stringify(data);
			return JSON.stringify({
				schema: 1,
				version: N.VERSION,
				checksum: checksum(json),
				data: json,
			});
		}
		validState(s) {
			return (
				!!s &&
				s.version === N.VERSION &&
				["map", "cave", "victory", "defeat"].includes(s.mode) &&
				Array.isArray(s.players) &&
				s.players.length <= 2 &&
				s.players.every(
					(p) =>
						[p.x, p.y, p.hp, p.angle].every(Number.isFinite) &&
						p.hp >= 0 &&
						p.hp <= 3 &&
						Number.isInteger(p.seat) &&
						p.seat >= 1 &&
						p.seat <= 2,
				) &&
				Array.isArray(s.enemies) &&
				s.enemies.every((e) => [e.x, e.y, e.hp].every(Number.isFinite)) &&
				Array.isArray(s.pickups) &&
				s.pickups.every((p) => [p.x, p.y, p.amount].every(Number.isFinite)) &&
				s.party &&
				Number.isFinite(s.party.ammo) &&
				s.party.ammo >= 0 &&
				Number.isFinite(s.party.reserves) &&
				Array.isArray(s.party.tools) &&
				Array.isArray(s.party.halves) &&
				Number.isInteger(s.caveIndex) &&
				s.caveIndex >= 0 &&
				s.caveIndex < N.Content.caves.length
			);
		}
		decode(text) {
			try {
				const e = JSON.parse(text);
				if (
					e.schema !== 1 ||
					e.version !== N.VERSION ||
					checksum(e.data) !== e.checksum
				)
					return null;
				const value = JSON.parse(e.data);
				if (
					!this.validState(value.state) ||
					(value.restart && !this.validState(value.restart))
				)
					return null;
				return value;
			} catch {
				return null;
			}
		}
		read() {
			try {
				const saved = this.storage?.getItem(this.key);
				if (saved) {
					const value = this.decode(saved);
					if (value) return value;
				}
			} catch {
				this.available = false;
			}
			return this.memory;
		}
		write(value) {
			const packed = this.encode(value);
			this.memory = N.clone(value);
			try {
				if (!this.storage) throw Error("Memory storage");
				this.storage.setItem(`${this.key}.pending`, packed);
				this.storage.setItem(this.key, packed);
				this.storage.removeItem(`${this.key}.pending`);
			} catch {
				this.available = false;
			}
			return true;
		}
		clear() {
			this.memory = null;
			try {
				this.storage?.removeItem(this.key);
				this.storage?.removeItem(`${this.key}.pending`);
			} catch {
				this.available = false;
			}
		}
	}
	N.Save = Save;
	N.checksum = checksum;
})();
