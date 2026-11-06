(() => {
	"use strict";
	function create(game, ui, api) {
		let content = null,
			status = "Paint a breach. Export it. Fly it.",
			material = "normal";
		const S = game.settings;
		const defs = [
			{
				key: "editX",
				label: "Cell column",
				min: 25,
				max: 46,
				step: 1,
				value: 32,
			},
			{ key: "editY", label: "Cell row", min: 1, max: 25, step: 1, value: 13 },
			{
				key: "editMaterial",
				label: "Material",
				options: ["normal", "reflective"],
				value: "normal",
			},
			{ key: "editPlate", label: "Plate", min: 0, max: 2, step: 1, value: 0 },
			{
				key: "editMotion",
				label: "Plate travel",
				min: 0,
				max: 90,
				step: 5,
				value: 0,
				unit: " px",
			},
			{
				key: "editPeriod",
				label: "Plate period",
				min: 3,
				max: 20,
				step: 0.5,
				value: 7,
				unit: " s",
			},
			{
				key: "editRefugeX",
				label: "Refuge position",
				min: 160,
				max: 520,
				step: 10,
				value: 355,
				unit: " px",
			},
			{
				key: "editRefugeW",
				label: "Refuge width",
				min: 60,
				max: 180,
				step: 10,
				value: 100,
				unit: " px",
			},
		];
		for (const sp of defs) S.define({ ...sp, group: "Controls" });
		function check(c) {
			return RuinSim.validateContent(c);
		}
		function normalized() {
			const c = structuredClone(content);
			c.refuge = { x: S.editRefugeX, w: S.editRefugeW };
			const p =
				c.plates.find((p) => String(p.id) === String(S.editPlate)) ||
				c.plates[S.editPlate];
			if (p) {
				p.amplitude = S.editMotion;
				p.period = S.editPeriod;
			}
			return c;
		}
		function paint(x, y, remove = false) {
			const c = content;
			const p =
				c.plates.find((p) => String(p.id) === String(S.editPlate)) ||
				c.plates[S.editPlate] ||
				c.plates[0];
			const lx = x - (p.x || 0),
				ly = y - (p.y || 0);
			const ix = c.cells.findIndex(
				(cell) =>
					Math.abs(cell.x - lx) < 9 &&
					Math.abs(cell.y - ly) < 9 &&
					String(cell.plate) === String(p.id),
			);
			if (ix >= 0) c.cells.splice(ix, 1);
			if (!remove)
				c.cells.push({ x: lx, y: ly, plate: p.id, material: S.editMaterial });
			status =
				(remove ? "Removed" : "Placed") + " cell at " + x + ", " + y + ".";
			draw();
		}
		function draw() {
			if (typeof document === "undefined") return;
			const cv = document.getElementById("ruin-editor");
			if (!cv || !content) return;
			const g = cv.getContext("2d");
			g.fillStyle = "#07131d";
			g.fillRect(0, 0, 960, 540);
			g.fillStyle = "#1c3b3b";
			g.fillRect(S.editRefugeX, 0, S.editRefugeW, 540);
			g.strokeStyle = "#17303a";
			for (let x = 0; x < 960; x += 20) {
				g.beginPath();
				g.moveTo(x, 0);
				g.lineTo(x, 540);
				g.stroke();
			}
			for (let y = 0; y < 540; y += 20) {
				g.beginPath();
				g.moveTo(0, y);
				g.lineTo(960, y);
				g.stroke();
			}
			for (const cell of content.cells) {
				const p = content.plates.find(
					(p) => String(p.id) === String(cell.plate),
				) || { x: 0, y: 0 };
				g.fillStyle = cell.material === "reflective" ? "#ecc889" : "#7baf9b";
				g.fillRect(cell.x + (p.x || 0) - 9, cell.y + (p.y || 0) - 9, 18, 18);
			}
			g.fillStyle = "#ef977f";
			g.fillRect(content.core.x - 16, content.core.y - 16, 32, 32);
			g.strokeStyle = "#fff9cc";
			g.lineWidth = 3;
			g.strokeRect(S.editX * 20, S.editY * 20, 20, 20);
			const out = document.getElementById("ruin-editor-status");
			if (out) out.textContent = status;
		}
		function attach() {
			if (!ui.root || !content) return;
			const box = ui.root.querySelector(".esh-mod");
			if (!box) return;
			const cv = document.createElement("canvas");
			cv.id = "ruin-editor";
			cv.className = "ruin-editor";
			cv.width = 960;
			cv.height = 540;
			cv.setAttribute(
				"aria-label",
				"Shield layout; click to paint, right click to remove",
			);
			box.insertBefore(cv, box.querySelector(".esh-row"));
			let held = false;
			cv.oncontextmenu = (e) => e.preventDefault();
			const at = (e) => {
				const r = cv.getBoundingClientRect();
				const x = Math.floor(((e.clientX - r.left) / r.width) * 48) * 20 + 10,
					y = Math.floor(((e.clientY - r.top) / r.height) * 27) * 20 + 10;
				paint(x, y, e.button === 2 || e.buttons === 2);
			};
			cv.onpointerdown = (e) => {
				held = true;
				cv.setPointerCapture(e.pointerId);
				at(e);
			};
			cv.onpointermove = (e) => {
				if (held) at(e);
			};
			cv.onpointerup = () => (held = false);
			cv.onpointercancel = () => (held = false);
			const st = document.createElement("p");
			st.id = "ruin-editor-status";
			st.className = "editor-status";
			box.append(st);
			draw();
		}
		function show(reset = false) {
			if (!content || reset) {
				content = RuinSim.exportContent(api.world());
				S.set("editRefugeX", content.refuge.x);
				S.set("editRefugeW", content.refuge.w);
				const p = content.plates[0];
				if (p) {
					S.set("editMotion", p.amplitude || 0);
					S.set("editPeriod", p.period || 7);
				}
			}
			ui.show("editor", {
				kicker: "Designer workbench · practice only",
				title: "Carve another signal",
				text: "Select a cell with the sliders and place or remove it. A pointer paints directly. Changes are validated before flight.",
				rows: defs.map((d) => d.key),
				actions: [
					["Place cell", () => paint(S.editX * 20 + 10, S.editY * 20 + 10)],
					[
						"Remove cell",
						() => paint(S.editX * 20 + 10, S.editY * 20 + 10, true),
					],
					[
						"Preview encounter",
						() => {
							const v = check(normalized());
							if (!v.ok) {
								status = v.errors.join(" ");
								draw();
								return;
							}
							api.load(v.content);
							ui.hide();
							game.resume();
						},
					],
					["JSON import / export", jsonScreen],
					[
						"Save preset",
						() => {
							const c = normalized(),
								v = check(c);
							if (v.ok) {
								My3D2dge.store.set("ruin:encounter", v.content);
								status = "Preset saved on this device.";
							} else status = v.errors.join(" ");
							draw();
						},
					],
					[
						"Load preset",
						() => {
							const c = My3D2dge.store.get("ruin:encounter", null),
								v = check(c);
							if (v.ok) {
								content = v.content;
								status = "Saved preset loaded.";
								show();
							} else {
								status = "No valid saved preset. " + v.errors.join(" ");
								draw();
							}
						},
					],
					["Back", () => ui.back()],
				],
			});
			attach();
		}
		function jsonScreen() {
			let text = JSON.stringify(normalized(), null, 2);
			ui.show("editor-json", {
				kicker: "Encounter data · version 1",
				title: "Carry the signal",
				text: "Export is self contained JSON. Import rejects invalid geometry, missing plate references and unsafe values.",
				actions: [
					[
						"Import text",
						() => {
							const el = ui.root.querySelector("textarea");
							try {
								const v = check(JSON.parse(el.value));
								if (!v.ok) throw new Error(v.errors.join(" "));
								content = v.content;
								status = "Imported encounter is ready to preview.";
								ui.back();
								show();
							} catch (e) {
								const st = ui.root.querySelector(".editor-status");
								if (st) st.textContent = e.message;
							}
						},
					],
					[
						"Download JSON",
						() => {
							const blob = new Blob([ui.root.querySelector("textarea").value], {
									type: "application/json",
								}),
								u = URL.createObjectURL(blob),
								a = document.createElement("a");
							a.href = u;
							a.download = "yars-of-ruin-encounter.json";
							a.click();
							setTimeout(() => URL.revokeObjectURL(u), 1000);
						},
					],
					[
						"Back",
						() => {
							ui.back();
							show();
						},
					],
				],
			});
			if (ui.root) {
				const box = ui.root.querySelector(".esh-mod"),
					ta = document.createElement("textarea");
				ta.className = "ruin-json";
				ta.setAttribute("aria-label", "Encounter JSON");
				ta.value = text;
				box.insertBefore(ta, box.querySelector(".esh-btns"));
				const st = document.createElement("p");
				st.className = "editor-status";
				box.append(st);
			}
		}
		return {
			show,
			draw,
			validate: check,
			get content() {
				return content;
			},
		};
	}
	globalThis.RuinEditor = { create };
})();
