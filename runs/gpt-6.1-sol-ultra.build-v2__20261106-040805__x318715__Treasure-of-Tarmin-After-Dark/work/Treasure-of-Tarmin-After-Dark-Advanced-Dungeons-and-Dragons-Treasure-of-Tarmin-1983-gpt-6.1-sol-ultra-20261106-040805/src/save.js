import { snapshot, restore } from "./core.js";
const KEY = "tarmin-after-dark.solo.v1";
export class SoloSave {
	constructor() {
		this.memory = null;
		this.durable = false;
		this.error = "";
		try {
			const probe = KEY + ".probe";
			localStorage.setItem(probe, "ok");
			this.durable = localStorage.getItem(probe) === "ok";
			localStorage.removeItem(probe);
		} catch {
			this.error = "Storage is unavailable. Export your expedition to keep it.";
		}
	}
	write(state) {
		if (state.mode && state.mode !== "solo") return false;
		if (state.attract) return false;
		this.memory = snapshot(state);
		if (!this.durable) return false;
		try {
			const value = JSON.stringify(this.memory);
			localStorage.setItem(KEY, value);
			if (localStorage.getItem(KEY) !== value)
				throw Error("Save could not be confirmed");
			return true;
		} catch {
			this.durable = false;
			this.error = "Storage could not confirm the save. Export is available.";
			return false;
		}
	}
	read() {
		let text;
		try {
			text = this.durable ? localStorage.getItem(KEY) : null;
		} catch {}
		if (text) {
			try {
				return restore(JSON.parse(text));
			} catch {
				this.error =
					"The saved expedition is damaged. Start anew or import a backup.";
				return null;
			}
		}
		if (this.memory) {
			try {
				return restore(this.memory);
			} catch {}
		}
		return null;
	}
	export(state) {
		return JSON.stringify(snapshot(state), null, 2);
	}
	import(text) {
		if (text.length > 1500000) throw Error("That save is too large.");
		let state = restore(JSON.parse(text));
		if (state.mode && state.mode !== "solo")
			throw Error("Only solo expeditions can be continued here.");
		if (state.attract) throw Error("Demonstration runs cannot be imported.");
		return state;
	}
}
export function download(name, text, type = "application/json") {
	const blob = new Blob([text], { type });
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = name;
	a.click();
	setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
