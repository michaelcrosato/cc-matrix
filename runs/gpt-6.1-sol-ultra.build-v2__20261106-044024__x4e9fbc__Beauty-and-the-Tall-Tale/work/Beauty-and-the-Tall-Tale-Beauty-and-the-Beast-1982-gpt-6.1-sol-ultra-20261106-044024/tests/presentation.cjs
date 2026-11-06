"use strict";
const assert = require("node:assert/strict");
require("../vendor/engine-repo/dist/handoff/my-3d2dge.js");
require("../content/tower.js");
require("../src/simulation.js");
require("../src/presentation.js");
require("../src/audio.js");
const E = globalThis.My3D2dge,
	T = globalThis.TallTale;
module.exports = async function () {
	const out = [];
	const test = (name, fn) => {
		try {
			fn();
			out.push({ name, pass: true });
		} catch (e) {
			out.push({ name, pass: false, detail: e.stack });
		}
	};
	test("Renderer pixels per unit agree with projection at six zooms", () => {
		const g = new E.Game({
			headless: true,
			draw: true,
			view: "side",
			res: [640, 480],
			menu: false,
		});
		g.start({ update() {}, draw() {} });
		for (const z of [0.5, 0.65, 0.8, 1, 1.5, 2]) {
			g.setZoom(z);
			g.advance(1 / 120, { draw: true });
			const unit = Math.abs(g.r.w(1, 0, 0)[0] - g.r.w(0, 0, 0)[0]);
			assert.ok(Math.abs(unit - g.r.ppu) < 1e-8, `${z}: ${unit} vs ${g.r.ppu}`);
		}
		g.dispose();
	});
	test("Every facade, overview and departure draws through native renderer", () => {
		const g = new E.Game({
			headless: true,
			draw: true,
			view: "side",
			res: [640, 480],
			menu: false,
		});
		const s = new T.Simulation(E, { players: [1, 2] }),
			p = new T.Presentation(E, g);
		g.start({
			update(dt) {
				g.focus(160, 0, 128);
				p.update(dt, s);
			},
			draw(r) {
				p.draw(r, s);
			},
		});
		for (let i = 0; i < 4; i++) {
			s.warpSection(i);
			for (const z of [0.75, 1]) {
				g.setZoom(z);
				g.advance(0.1, { draw: true });
			}
		}
		s.phase = "transition";
		g.advance(0.1, { draw: true });
		s.phase = "departure";
		s.rescued = true;
		for (const t of [0, 2, 4.1, 7]) {
			s.departureTime = t;
			g.advance(0.1, { draw: true });
		}
		assert.deepEqual(g.errors, []);
		p.dispose();
		g.dispose();
	});
	test("Native rig updates and repeated drawing never mutate authoritative simulation", () => {
		const g = new E.Game({
				headless: true,
				draw: true,
				view: "side",
				res: [640, 480],
				menu: false,
			}),
			s = new T.Simulation(E, { players: [1, 2] }),
			p = new T.Presentation(E, g);
		g.start({
			update(dt) {
				g.focus(160, 0, 128);
				p.update(dt, s);
			},
			draw(r) {
				p.draw(r, s);
			},
		});
		const before = JSON.stringify(s.snapshot());
		g.advance(1, { draw: true });
		assert.equal(JSON.stringify(s.snapshot()), before);
		p.dispose();
		g.dispose();
	});
	test("Remote interpolation draws replicas while preserving authoritative bodies", () => {
		const g = new E.Game({
				headless: true,
				draw: true,
				view: "side",
				menu: false,
			}),
			s = new T.Simulation(E),
			p = new T.Presentation(E, g);
		p.update(1 / 120, s);
		const before = JSON.stringify(s.snapshot()),
			xs = [];
		p.networkPlayers = [{ id: 1, x: 140, z: 64 }];
		const r = {
			view: g.view,
			actor(x, y, z, fn, opts) {
				xs.push([x, z]);
			},
		};
		p.drawActor(r, s.actors[0], s, {});
		assert.ok(xs.length >= 2);
		assert.ok(xs.every(([x, z]) => x === 140 && z === 64));
		assert.equal(JSON.stringify(s.snapshot()), before);
		p.dispose();
		g.dispose();
	});
	const fake = () => ({
		musicVolume: 0.1,
		voiceVolume: 1,
		ready: false,
		volume: 0.7,
		muted: false,
		music() {
			this.mus = (this.mus || 0) + 1;
		},
		sfx() {
			this.fx = (this.fx || 0) + 1;
			return { stop() {} };
		},
		stopMusic() {},
		applyVolume() {
			this.applies = (this.applies || 0) + 1;
		},
	});
	test("Audio events are idempotent and voice control applies to native bus", () => {
		const a = fake(),
			g = { headless: true, audio: a, settings: { voice: 0.4 } },
			sound = new T.Audio(E, g);
		sound.activated = true;
		const s = {
			actors: [],
			section: 0,
			events: [
				{ id: 1, type: "heart" },
				{ id: 2, type: "hit" },
			],
		};
		sound.update(1 / 120, s);
		sound.update(1 / 120, s);
		assert.equal(a.fx, 2);
		assert.equal(a.mus, 1);
		assert.equal(a.voiceVolume, 0.4);
		assert.equal(a.applies, 1);
		sound.dispose();
	});
	test("Unresolved Hub handshake and non-playing server cannot activate audio", () => {
		const prev = globalThis.AIHub;
		try {
			const a = fake(),
				g = { headless: true, audio: a, settings: {} },
				sound = new T.Audio(E, g);
			globalThis.AIHub = { active: true, me: null };
			assert.equal(sound.activate(), false);
			globalThis.AIHub = { active: true, server: true, me: "server" };
			assert.equal(sound.activate(), false);
			sound.activated = true;
			sound.update(1 / 120, {
				actors: [],
				section: 0,
				events: [{ id: 1, type: "heart" }],
			});
			assert.equal(a.fx, undefined);
			assert.equal(a.mus, undefined);
			sound.dispose();
		} finally {
			if (prev === undefined) delete globalThis.AIHub;
			else globalThis.AIHub = prev;
		}
	});

	test("Hub labels use supplied color and render supplied names as literal text", () => {
		const g = new E.Game({
				headless: true,
				draw: true,
				view: "side",
				menu: false,
			}),
			world = new T.Simulation(E),
			p = new T.Presentation(E, g);
		p.update(1 / 120, world);
		p.playerInfo = [{ id: 1, color: "#aabbcc", name: "<b>Scout</b>" }];
		const calls = [],
			original = E.font.text;
		try {
			E.font.text = (canvas, text, x, y, color, opts) => {
				calls.push({ text, color });
				return original.call(E.font, canvas, text, x, y, color, opts);
			};
			const r = {
				view: g.view,
				actor(x, y, z, fn) {
					fn(g.screen.ctx, 100, 150);
				},
			};
			p.drawActor(r, world.actors[0], world, {});
			assert.ok(
				calls.some((c) => c.text === "<b>Scout</b>" && c.color === "#aabbcc"),
			);
			assert.ok(calls.some((c) => c.text === "1" && c.color === "#aabbcc"));
		} finally {
			E.font.text = original;
			p.dispose();
			g.dispose();
		}
	});
	test("Native Reduce motion freezes decorative time and removes powered afterimages", () => {
		const g = new E.Game({
				headless: true,
				draw: true,
				view: "side",
				menu: false,
			}),
			world = new T.Simulation(E),
			p = new T.Presentation(E, g);
		world.actors[0].power = 6;
		p.update(0.1, world);
		const before = p.time;
		g.settings.set("motion", true);
		p.update(0.1, world);
		assert.equal(p.time, before);
		const opts = [],
			r = {
				view: g.view,
				actor(x, y, z, fn, o) {
					opts.push(o);
				},
			};
		p.drawActor(r, world.actors[0], world, {});
		assert.ok(opts.every((o) => !o.ghost));
		g.settings.set("motion", false);
		p.update(0.1, world);
		assert.ok(p.time > before);
		opts.length = 0;
		p.drawActor(r, world.actors[0], world, {});
		assert.ok(opts.some((o) => o.ghost));
		p.dispose();
		g.dispose();
	});

	test("Long plane banners render fully inside their projected fabric at varied zooms", () => {
		const g = new E.Game({
				headless: true,
				draw: true,
				view: "side",
				res: [640, 480],
				menu: false,
			}),
			p = new T.Presentation(E, g),
			label = "NEXT STOP: SOMEWHERE SHORTER.";
		const originalText = E.font.text,
			originalRect = E.px.rect,
			calls = [],
			panels = [];
		try {
			E.font.text = function (canvas, text, x, y, color, opts) {
				if (text === label)
					calls.push({
						canvas,
						text,
						x,
						y,
						w: E.font.width(text, opts),
						h: E.font.height(1, opts),
					});
				return originalText.call(this, canvas, text, x, y, color, opts);
			};
			E.px.rect = function (canvas, x, y, w, h, color) {
				if (color === "#e9d6ae") panels.push({ canvas, x, y, w, h });
				return originalRect(canvas, x, y, w, h, color);
			};
			g.start({
				update() {
					g.focus(160, 0, 128);
				},
				draw(r) {
					p.drawPlane(r, 260, 225, 1.5, label);
				},
			});
			for (const z of [0.75, 1, 1.5]) {
				calls.length = panels.length = 0;
				g.setZoom(z);
				g.advance(1 / 120, { draw: true });
				const text = calls.find((c) => c.canvas === g.screen.ctx),
					fabric = panels.find((c) => c.canvas === g.screen.ctx);
				assert.ok(
					text && fabric,
					"Full banner must be painted on the native frame, outside the actor scratch image",
				);
				assert.ok(
					text.x - text.w / 2 >= fabric.x &&
						text.x + text.w / 2 <= fabric.x + fabric.w,
					"All glyphs fit horizontally",
				);
				assert.ok(
					text.y >= fabric.y && text.y + text.h <= fabric.y + fabric.h,
					"All glyphs fit vertically",
				);
			}
			assert.deepEqual(g.errors, []);
		} finally {
			E.font.text = originalText;
			E.px.rect = originalRect;
			p.dispose();
			g.dispose();
		}
	});
	return out;
};
if (require.main === module)
	module.exports().then((out) => {
		for (const r of out) if (!r.pass) console.error(r.name + "\n" + r.detail);
		console.log(
			`${out.filter((r) => r.pass).length}/${out.length} presentation/audio checks passed`,
		);
		process.exitCode = out.some((r) => !r.pass) ? 1 : 0;
	});
