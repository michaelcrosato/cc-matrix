(() => {
	const C = ChompContent;
	class ChompWorkshop {
		constructor(app) {
			this.app = app;
			this.board = C.clone(C.templates?.[0] || C.stages[2]);
			this.board.name = "My Midnight Maze";
			this.x = 1;
			this.y = 1;
			this.tool = "wall";
			this.tools = [
				"wall",
				"erase",
				"hero 1",
				"hero 2",
				"snack",
				"bright",
				"tunnels",
				"gate",
			];
			this.history = [];
			this.future = [];
			this.foodIndex = 0;
			this.message = "Make a maze. Make it munchable.";
			this.error = false;
			this.repeatAt = 0;
			this.slot = 0;
			this.lastPaint = "";
			this.makeBar();
		}
		makeBar() {
			const bar = document.getElementById("editorbar");
			bar.replaceChildren();
			for (const tool of this.tools) {
				const b = document.createElement("button");
				b.textContent = tool;
				b.onclick = () => {
					this.tool = tool;
					this.paintBar();
				};
				b.dataset.tool = tool;
				bar.appendChild(b);
			}
			const more = document.createElement("button");
			more.textContent = "Save / Play";
			more.onclick = () => this.menu();
			bar.appendChild(more);
			this.paintBar();
		}
		paintBar() {
			for (const b of document.querySelectorAll("#editorbar [data-tool]"))
				b.classList.toggle("active", b.dataset.tool === this.tool);
		}
		show() {
			this.app.mode = "editor";
			this.app.ui.hide();
			this.app.game.resume();
			this.app.game.scene.pausable = false;
			document.getElementById("editorbar").hidden = false;
			this.app.view.reveal = true;
			this.app.clearInput();
		}
		hide() {
			document.getElementById("editorbar").hidden = true;
			this.app.view.reveal = false;
		}
		remember() {
			this.history.push(C.clone(this.board));
			if (this.history.length > 60) this.history.shift();
			this.future = [];
		}
		undo() {
			if (!this.history.length) return;
			this.future.push(C.clone(this.board));
			this.board = this.history.pop();
			this.message = "Undone.";
		}
		redo() {
			if (!this.future.length) return;
			this.history.push(C.clone(this.board));
			this.board = this.future.pop();
			this.message = "Redone.";
		}
		setCell(x, y, v) {
			const r = this.board.rows[y];
			this.board.rows[y] = r.slice(0, x) + v + r.slice(x + 1);
		}
		apply() {
			const x = this.x,
				y = this.y,
				b = this.board;
			this.error = false;
			if (this.tool === "tunnels") {
				this.remember();
				b.tunnels = !b.tunnels;
				b.tunnelRow = 7;
				this.setCell(0, 7, b.tunnels ? "." : "#");
				this.setCell(18, 7, b.tunnels ? "." : "#");
				this.setCell(1, 7, ".");
				this.setCell(17, 7, ".");
				this.message = b.tunnels
					? "Paired side doors opened."
					: "Side doors closed.";
				return;
			}
			if (this.tool === "gate") {
				this.remember();
				b.gate = !b.gate;
				this.message = b.gate
					? "Rotating pen enabled."
					: "Pen set to open floor.";
				return;
			}
			if (
				x < 1 ||
				y < 1 ||
				x > 17 ||
				y > 13 ||
				(Math.abs(x - 9) <= 1 && Math.abs(y - 7) <= 1)
			) {
				this.message = "Keep the frame and permanent pen intact.";
				this.error = true;
				return;
			}
			this.remember();
			if (this.tool === "wall" || this.tool === "erase") {
				const occupied = [...b.spawn, ...b.foods, ...b.enemySpawns].some(
					(p) => p.x === x && p.y === y,
				);
				if (occupied && this.tool === "wall") {
					this.history.pop();
					this.message = "Move the creature or snack first.";
					this.error = true;
					return;
				}
				this.setCell(
					x,
					y,
					this.tool === "erase" ? "." : b.rows[y][x] === "#" ? "." : "#",
				);
			} else {
				this.setCell(x, y, ".");
				if (this.tool.startsWith("hero"))
					b.spawn[this.tool === "hero 1" ? 0 : 1] = { x, y };
				else {
					const choices = b.foods.filter(
						(f) => f.power === (this.tool === "bright"),
					);
					const f = choices[this.foodIndex % choices.length];
					if (f) {
						f.x = x;
						f.y = y;
						this.foodIndex++;
						this.message = `Moved ${f.power ? "bright" : "ordinary"} snack ${(this.foodIndex % choices.length) + 1}. Next edit moves the next one.`;
					}
				}
			}
			this.check(false);
		}
		check(notify = true) {
			const result = C.validate(this.board);
			this.error = !result.ok;
			if (!result.ok) {
				this.message = result.errors[0].message;
				const c = result.errors[0].cells?.[0];
				if (c) {
					this.x = c.x;
					this.y = c.y;
				}
			} else
				this.message = `Connected and crunchy! ${result.stats.loops || 0} interception loops.`;
			if (notify)
				this.app.ui.toast(
					result.ok ? "Maze is ready" : "One little fix",
					this.message,
				);
			return result.ok;
		}
		cycle(n) {
			this.tool =
				this.tools[
					(this.tools.indexOf(this.tool) + n + this.tools.length) %
						this.tools.length
				];
			this.paintBar();
		}
		update(_dt) {
			const I = this.app.game.input,
				now = this.app.game.real;
			const dir = this.app.cardinal(I.move(), "editor");
			if (dir !== null && now > this.repeatAt) {
				const D = [
					[0, -1],
					[1, 0],
					[0, 1],
					[-1, 0],
				][dir];
				this.x = Math.max(1, Math.min(17, this.x + D[0]));
				this.y = Math.max(1, Math.min(13, this.y + D[1]));
				this.repeatAt = now + 0.12;
			}
			if (I.pressed("chirp") || I.pressed("confirm")) this.apply();
			if (I.pressed("toolNext")) this.cycle(1);
			if (I.pressed("toolPrev")) this.cycle(-1);
			if (I.pressed("pause") || I.pressed("cancel")) this.menu();
		}
		pointer(e) {
			const p = this.app.game.input.screenPoint(e.clientX, e.clientY),
				f = this.app.view.frame;
			if (!f) return;
			const x = Math.floor((p[0] - f.x) / f.tile),
				y = Math.floor((p[1] - f.y) / f.tile);
			if (x < 0 || x > 18 || y < 0 || y > 14) return;
			this.x = x;
			this.y = y;
			const k = `${x},${y}`;
			if (this.lastPaint === k && e.type === "pointermove") return;
			this.lastPaint = k;
			this.apply();
		}
		menu() {
			const ui = this.app.ui;
			ui.show("workshop", {
				kicker: "MAZE WORKSHOP",
				title: this.board.name,
				text: this.message,
				actions: [
					[
						"Keep building",
						() => {
							ui.hide();
							this.app.clearInput();
						},
					],
					[
						"Playtest maze",
						() => {
							if (this.check()) {
								this.hide();
								this.app.start("custom", 1, this.board, true);
							}
						},
					],
					["Validate maze", () => this.check()],
					["Save / load / name", () => this.storageMenu()],
					["Import / export", () => this.dataMenu()],
					[
						"Undo",
						() => {
							this.undo();
							this.menu();
						},
					],
					[
						"Redo",
						() => {
							this.redo();
							this.menu();
						},
					],
					["Templates / reset", () => this.templatesMenu()],
					[
						"Return to title",
						() => {
							this.hide();
							this.app.title();
						},
					],
				],
				back: () => {
					ui.hide();
					this.app.clearInput();
				},
			});
		}
		storageMenu() {
			const ui = this.app.ui,
				save = this.app.save;
			ui.show("workshopSlots", {
				title: "Your maze shelf",
				text: "Three local slots. Rename this maze below.",
				actions: [
					...Array.from({ length: 3 }, (_, i) => [
						`Save to slot ${i + 1}`,
						() => {
							if (!this.check()) return;
							const name = document
								.querySelector(".workshop-name")
								?.value.trim()
								.slice(0, 40);
							if (name) this.board.name = name;
							save.boards[i] = C.clone(this.board);
							this.app.persist();
							ui.toast("Maze tucked away", `Slot ${i + 1}: ${this.board.name}`);
						},
					]),
					...Array.from({ length: 3 }, (_, i) => ({
						label: `Load ${i + 1}: ${save.boards[i]?.name || "empty"}`,
						disabled: !save.boards[i],
						fn: () => {
							const v = C.validate(save.boards[i]);
							if (v.ok) {
								this.remember();
								this.board = C.clone(save.boards[i]);
								ui.hide();
								this.show();
							} else ui.toast("Could not load", v.errors[0].message);
						},
					})),
					["Back", () => ui.back()],
				],
			});
			const input = document.createElement("input");
			input.className = "workshop-name";
			input.value = this.board.name;
			input.maxLength = 40;
			input.setAttribute("aria-label", "Maze name");
			ui._els.scr.querySelector(".esh-mod").append(input);
		}
		dataMenu() {
			const ui = this.app.ui;
			let area;
			ui.show("workshopData", {
				title: "Pack a pocket maze",
				text: "Copy this text to share. To import, paste a maze here, then choose Import. Invalid text keeps your current maze safe.",
				actions: [
					[
						"Import text",
						() => {
							try {
								const parsed = C.importBoard(area.value);
								const board = parsed.board || parsed;
								if (parsed.ok === false)
									throw Error(
										parsed.errors?.[0]?.message ||
											parsed.error ||
											"Invalid maze",
									);
								const result = C.validate(board);
								if (!result.ok) throw Error(result.errors[0].message);
								this.remember();
								this.board = C.clone(board);
								ui.hide();
								this.show();
								this.check();
							} catch (e) {
								ui.toast("Maze could not be unpacked", e.message);
							}
						},
					],
					[
						"Select all text",
						() => {
							area.focus();
							area.select();
						},
					],
					["Back", () => ui.back()],
				],
			});
			area = document.createElement("textarea");
			area.className = "workshop-data";
			area.setAttribute("aria-label", "Maze import and export JSON");
			area.value = C.exportBoard(this.board);
			ui._els.scr.querySelector(".esh-mod").append(area);
		}
		templatesMenu() {
			this.app.ui.show("templates", {
				title: "Fresh starts",
				text: "A template replaces this board. Undo brings it back.",
				actions: [
					...(C.templates || C.stages.slice(0, 3)).map((b) => [
						b.name,
						() => {
							this.remember();
							this.board = C.clone(b);
							this.app.ui.hide();
							this.show();
						},
					]),
					[
						"Clear interior…",
						() =>
							this.app.ui.show("clearMaze", {
								title: "Clear the walls?",
								text: "Creatures, snacks, the pen and the frame stay in place.",
								actions: [
									["Keep this maze", () => this.app.ui.back()],
									[
										"Clear walls",
										() => {
											this.remember();
											for (let y = 1; y < 14; y++)
												for (let x = 1; x < 18; x++) this.setCell(x, y, ".");
											this.app.ui.hide();
											this.show();
											this.check();
										},
									],
								],
							}),
					],
					["Back", () => this.app.ui.back()],
				],
			});
		}
	}
	globalThis.ChompWorkshop = ChompWorkshop;
})();
