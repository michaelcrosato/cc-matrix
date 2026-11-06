import { execFileSync, spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import R from "@dimforge/rapier3d-compat";
import { chromium, devices } from "playwright";
import { Shift } from "./core.mjs";

const failures = [],
	report = { checks: [], issuesCaught: [] };
let count = 0,
	browser;
const assert = (condition, message) => {
	count++;
	report.checks.push({ name: message, pass: !!condition });
	if (!condition) failures.push(message);
};
const test = async (name, fn) => {
	await writeFile(
		"test-artifacts/progress.json",
		JSON.stringify({ running: name }),
	);
	try {
		await fn();
	} catch (e) {
		assert(false, `${name}: ${e.message}`);
	}
};
const quietInit = console.warn;
console.warn = () => {};
await R.init();
console.warn = quietInit;
await mkdir("test-artifacts", { recursive: true });
execFileSync(process.execPath, ["build.mjs"], { stdio: "pipe" });
await test("Complete deterministic shift", () => {
	const events = [];
	const s = new Shift(R, {
		config: { autoPlay: true },
		emit: (e) => events.push(e),
	});
	for (let i = 0; i < 60 * 160 && s.state === "playing"; i++) s.update(1 / 60);
	assert(s.state === "won", "Autopilot completes all eight rounds");
	assert(
		s.misses === 0 && s.caught === 172,
		"All 172 bombs are catchable without losing a bucket",
	);
	assert(
		events.filter((e) => e.type === "wave").length === 8,
		"Every round is entered",
	);
	assert(
		events.some((e) => e.kind === "return") &&
			events.some((e) => e.kind === "gold"),
		"Campaign introduces return and gold bombs",
	);
	assert(
		s.score > 10000 && s.bestCombo > 100,
		"Campaign builds score and multiplier streaks",
	);
	s.dispose();
});
await test("Catch safety, damage and refill", () => {
	const s = new Shift(R);
	s.countdown = 0;
	s.spawnTimer = 999;
	s.players[0].x = 3;
	s.spawn({ x: 3, y: -3.15, speed: 4 });
	s.update(0.1);
	assert(
		s.caught === 1,
		"A lower bucket can save a bomb missed at the top rim",
	);
	s.players[0].x = -7;
	s.spawn({ x: 7, y: -4.8, speed: 4 });
	s.update(0.1);
	assert(
		s.lives === 2 && s.bombs.length === 0,
		"A miss removes one bucket and clears the chain",
	);
	s.damageTimer = 0;
	s.breakTimer = 0;
	s.score = 990;
	s.players[0].x = 0;
	s.spawn({ x: 0, y: -2.5, speed: 3 });
	s.update(0.1);
	assert(
		s.lives === 3 && s.score >= 1000,
		"Crossing a thousand points restores a bucket",
	);
	s.dispose();
});
await test("Splashback and return trajectories", () => {
	const s = new Shift(R);
	s.countdown = 0;
	s.spawnTimer = 999;
	s.spawn({ x: 1, y: 0 });
	s.spawn({ x: 6, y: 1 });
	assert(s.splash(0), "A full meter fires splashback");
	assert(
		s.caught === 1 && s.bombs.length === 1 && s.slowTimer > 0,
		"Splashback catches nearby low bombs and slows survivors",
	);
	assert(!s.splash(0), "An empty meter cannot fire repeatedly");
	s.clear();
	s.players[0].charge = 0;
	s.spawn({ x: 0, y: -2.5, speed: 4, kind: "gold" });
	s.update(0.1);
	assert(
		s.players[0].charge >= 0.5,
		"Gold catch restores at least half a splash meter",
	);
	s.clear();
	const b = s.spawn({ x: 0, y: 4, kind: "return" });
	const positions = [];
	for (let i = 0; i < 100; i++) {
		s.update(1 / 60);
		if (s.bombs.includes(b)) positions.push(b.x);
	}
	assert(
		Math.max(...positions) > 1 &&
			positions.at(-1) < Math.max(...positions) - 0.3,
		"Returning bombs visibly reverse horizontal direction",
	);
	s.dispose();
});

const root = resolve(".."),
	filename = "Kaboomerang-Kaboom-gpt-6.1-sol-max-20261105-191415.html";
const server = createServer(async (req, res) => {
	try {
		const path = resolve(
			root,
			`.${decodeURIComponent(new URL(req.url, "http://localhost").pathname)}`,
		);
		if (!path.startsWith(`${root}/`)) {
			res.writeHead(403).end();
			return;
		}
		const body = await readFile(path);
		res.setHeader(
			"Content-Type",
			{
				".html": "text/html",
				".js": "text/javascript",
				".mjs": "text/javascript",
				".json": "application/json",
			}[extname(path)] ?? "application/octet-stream",
		);
		res.end(body);
	} catch {
		res.writeHead(404).end("Not found");
	}
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`,
	url = `${origin}/${filename}`;
const broker = spawn(
	process.execPath,
	[
		"--input-type=module",
		"-e",
		"import {PeerServer} from 'peer'; PeerServer({port:0,host:'127.0.0.1',path:'/kaboom'},s=>process.stdout.write(String(s.address().port)+'\\n'));",
	],
	{ stdio: ["ignore", "pipe", "pipe"] },
);
const brokerPort = await new Promise((resolve, reject) => {
	broker.stdout.once("data", (b) => resolve(parseInt(b.toString(), 10)));
	broker.once("error", reject);
});
const errors = [];
const launch = () =>
	chromium.launch({
		headless: true,
		args: [
			"--enable-unsafe-webgpu",
			"--enable-features=Vulkan",
			"--use-webgpu-adapter=swiftshader",
			"--disable-dev-shm-usage",
			"--no-sandbox",
			"--disable-background-timer-throttling",
			"--disable-renderer-backgrounding",
			"--disable-backgrounding-occluded-windows",
		],
	});
try {
	browser = await chromium.launch({
		headless: true,
		args: [
			"--enable-unsafe-webgpu",
			"--enable-features=Vulkan",
			"--use-webgpu-adapter=swiftshader",
			"--disable-dev-shm-usage",
			"--no-sandbox",
			"--disable-background-timer-throttling",
			"--disable-renderer-backgrounding",
			"--disable-backgrounding-occluded-windows",
		],
	});
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});
	const page = await context.newPage();
	page.on("pageerror", (e) => errors.push(e.message));
	await page.addInitScript(() => {
		window.__testPad = null;
		navigator.getGamepads = () => (window.__testPad ? [window.__testPad] : []);
	});
	await test("Single-file boot", async () => {
		await page.goto(url);
		await page.waitForFunction(
			() => window.__kaboom?.ready || window.__kaboom?.error,
			null,
			{ timeout: 45000 },
		);
		const status = await page.evaluate(() => ({
			ready: __kaboom.ready,
			error: __kaboom.error,
			title: document.title,
			state: __kaboom.state,
		}));
		assert(status.ready && !status.error, "Single-file game initializes");
		assert(
			status.title.startsWith("Kaboomerang"),
			"Served page is the intended game",
		);
		assert(
			status.state.backend === "WebGPU",
			"Three.js uses WebGPU in headless Chromium",
		);
		assert(
			status.state.render.drawCalls > 100 &&
				status.state.render.triangles > 1000,
			"WebGPU submits the illustrated 3D scene",
		);
		await page.screenshot({ path: "test-artifacts/title.png" });
	});
	await test("Menus, keyboard, pointer and pause", async () => {
		await page.getByRole("button", { name: "START THE SHIFT" }).click();
		await page.waitForTimeout(100);
		assert(
			(await page.evaluate(() => __kaboom.state.screen)) === "",
			"Start button enters the shift",
		);
		await page.keyboard.down("KeyD");
		await page.waitForTimeout(180);
		await page.keyboard.up("KeyD");
		assert(
			(await page.evaluate(() => __kaboom.state.players[0].x)) > 1,
			"Keyboard moves the bucket stack",
		);
		await page.mouse.move(450, 650);
		await page.waitForTimeout(240);
		assert(
			(await page.evaluate(() => __kaboom.state.players[0].x)) < 0,
			"Mouse positions the bucket stack",
		);
		await page.keyboard.press("Escape");
		const before = await page.evaluate(() => __kaboom.state.time);
		await page.waitForTimeout(300);
		assert(
			await page.evaluate((t) => __kaboom.state.time === t, before),
			"Solo pause freezes simulation",
		);
		await page.getByRole("button", { name: "DEVELOPER TOOLS" }).click();
		await page.locator("#dev-bucketWidth").fill("2.4");
		assert(
			(await page.evaluate(() => __kaboom.state.config.bucketWidth)) === 2.4,
			"Live developer slider updates catch width",
		);
		await page.getByRole("button", { name: "STEP 1 SECOND" }).click();
		assert(
			Math.abs((await page.evaluate(() => __kaboom.state.time)) - before - 1) <
				0.001,
			"Developer step advances exactly one second",
		);
		await page.getByRole("button", { name: "RESET DEFAULTS" }).click();
		assert(
			(await page.evaluate(() => __kaboom.state.config.bucketWidth)) === 1.85,
			"Reset restores default balance",
		);
		await page.getByRole("button", { name: "RESUME", exact: true }).click();
		await page.evaluate(() => {
			__kaboom.step(3);
			__kaboom.setPlayer(0, { charge: 1 });
		});
		await page.keyboard.press("Space");
		await page.waitForTimeout(180);
		assert(
			(await page.evaluate(() => __kaboom.state.splashes)) === 1,
			"Space activates splashback",
		);
		await page.screenshot({ path: "test-artifacts/gameplay.png" });
	});
	await test("Controller and prompt switching", async () => {
		await page.evaluate(
			() =>
				(window.__testPad = {
					index: 0,
					id: "Emulated Standard Pad",
					mapping: "standard",
					connected: true,
					axes: [-0.8, 0, 0, 0],
					buttons: Array.from({ length: 17 }, () => ({
						pressed: false,
						value: 0,
						touched: false,
					})),
				}),
		);
		await page.waitForTimeout(160);
		assert(
			(await page.evaluate(() => __kaboom.state.lastInput)) === "gamepad",
			"Standard Gamepad API switches prompts",
		);
		assert(
			(await page.locator("#ability-glyph").textContent()) === "×",
			"PlayStation Cross is shown for the action",
		);
		await page.evaluate(() => {
			__testPad.axes[0] = 0;
			__testPad.buttons[9].pressed = true;
		});
		await page.waitForFunction(() => __kaboom.state.screen === "pause", null, {
			timeout: 10000,
		});
		await page.evaluate(() => (__testPad.buttons[9].pressed = false));
		assert(
			(await page.evaluate(() => __kaboom.state.screen)) === "pause",
			"Controller Options opens pause",
		);
		await page.getByRole("button", { name: "SETTINGS", exact: true }).click();
		await page.getByRole("button", { name: "PLAYSTATION × ○ □ △" }).click();
		await page.evaluate(() => (__testPad.axes[0] = 0.2));
		await page.waitForTimeout(80);
		await page.evaluate(() => (__testPad.axes[0] = 0));
		assert(
			await page.evaluate(() => __kaboom.settings.glyphs === "xbox"),
			"Xbox glyph setting persists",
		);
		await page.evaluate(() => (window.__testPad = null));
		await page.keyboard.press("Escape");
		await page.keyboard.press("Escape");
	});
	await test("Audio synthesis", async () => {
		const audit = await page.evaluate(() => __kaboom.audioAudit());
		for (const [k, v] of Object.entries(audit))
			assert(
				v.finite && v.rms > 0.001 && v.peak < 1,
				`${k} synthesizes finite, non-silent audio without clipping`,
			);
		const status = await page.evaluate(() => __kaboom.state.audio);
		assert(status.music === 0.1, "Music defaults to ten percent");
		assert(
			status.state === "running" && status.scheduled > 0,
			"User gesture unlocks and schedules procedural music",
		);
	});
	await test("Complete in-browser playthrough and overtime", async () => {
		await page.evaluate(() => {
			__kaboom.start();
			__kaboom.config({ autoPlay: true });
			__kaboom.advance(130);
		});
		await page.waitForTimeout(1450);
		assert(
			(await page.evaluate(() => __kaboom.state.state)) === "won",
			"Browser playthrough completes the full campaign",
		);
		assert(
			await page.getByRole("heading", { name: "Well bucketed!" }).isVisible(),
			"Victory summary appears",
		);
		await page.getByRole("button", { name: "OVERTIME · ENDLESS" }).click();
		assert(
			await page.evaluate(
				() => __kaboom.state.state === "playing" && __kaboom.state.wave === 7,
			),
			"Overtime resumes with the finale rules",
		);
		await page.keyboard.press("Escape");
		await page.getByRole("button", { name: "END SHIFT" }).click();
	});
	await test("Attract and credits", async () => {
		await page.evaluate(() => __kaboom.resetIdle());
		await page.waitForFunction(() => __kaboom.state.attract, null, {
			timeout: 10000,
		});
		assert(
			await page.evaluate(() => __kaboom.state.attract),
			"Ten seconds of title inactivity starts attract mode",
		);
		await page.keyboard.press("KeyQ");
		assert(
			await page.evaluate(
				() => !__kaboom.state.attract && __kaboom.state.screen === "title",
			),
			"Any input exits attract mode into the title",
		);
		await page.getByRole("button", { name: "ABOUT & CREDITS" }).click();
		await page.keyboard.press("ArrowDown");
		assert(
			await page.locator("#ui .panel").evaluate((e) => e.scrollTop > 0),
			"Controller-style navigation scrolls long credits",
		);
		for (const text of [
			"Source Information",
			"Testing Feedback",
			"Engine Feedback",
			"Prompt Feedback",
			"added on import",
		])
			assert(
				await page.getByText(text, { exact: true }).isVisible(),
				`Credits contain ${text}`,
			);
		await page.keyboard.press("Escape");
	});
	await test("Local two-player", async () => {
		await page.getByRole("button", { name: "BUCKET BUDDIES" }).click();
		await page.getByRole("button", { name: "LOCAL · TWO BUCKETEERS" }).click();
		const x = await page.evaluate(() => __kaboom.state.players[1].x);
		await page.keyboard.down("KeyL");
		await page.waitForFunction((x) => __kaboom.state.players[1].x > x + 1, x, {
			timeout: 10000,
		});
		await page.keyboard.up("KeyL");
		assert(
			await page.evaluate(
				(x) =>
					__kaboom.state.players.length === 2 &&
					__kaboom.state.players[1].x > x,
				x,
			),
			"Second local player moves independently",
		);
	});
	await context.close();

	await test("Touch-only device", async () => {
		const c = await browser.newContext({ ...devices["Pixel 7"] });
		const p = await c.newPage();
		p.on("pageerror", (e) => errors.push(e.message));
		await p.goto(url);
		await p.waitForFunction(() => window.__kaboom?.ready, null, {
			timeout: 45000,
		});
		await p.evaluate(() => __kaboom.resetIdle(-60000));
		await p.getByRole("button", { name: "START THE SHIFT" }).tap();
		assert(
			await p.evaluate(() => __kaboom.state.lastInput === "touch"),
			"Touch menu activation keeps touch prompts",
		);
		await p.dispatchEvent("#stage", "pointerdown", {
			pointerType: "touch",
			pointerId: 7,
			clientX: 100,
			clientY: 500,
		});
		await p.dispatchEvent("#stage", "pointermove", {
			pointerType: "touch",
			pointerId: 7,
			clientX: 180,
			clientY: 500,
		});
		await p.dispatchEvent("#stage", "pointerup", {
			pointerType: "touch",
			pointerId: 7,
			clientX: 180,
			clientY: 500,
		});
		await p.waitForTimeout(120);
		assert(
			await p.evaluate(
				() =>
					__kaboom.state.lastInput === "touch" &&
					__kaboom.state.players[0].x > 1,
			),
			"Touch drag moves through the same game",
		);
		assert(
			await p.locator("#touch-pop").isVisible(),
			"Touch shows only the compact splash action",
		);
		await p.evaluate(() => __kaboom.step(3));
		await p.locator("#touch-pop").tap();
		await p.waitForTimeout(150);
		assert(
			(await p.evaluate(() => __kaboom.state.splashes)) === 1,
			"Touch splash button activates the ability",
		);
		await p.screenshot({ path: "test-artifacts/touch.png" });
		await p.goto(`${url}?webgl=1`);
		await p.waitForFunction(() => window.__kaboom?.ready, null, {
			timeout: 45000,
		});
		await p.evaluate(() => __kaboom.resetIdle(-60000));
		await p.getByRole("button", { name: "START THE SHIFT" }).tap();
		await p.evaluate(() => {
			__kaboom.config({ autoPlay: true });
			__kaboom.advance(26);
		});
		await p.waitForTimeout(3100);
		await p.screenshot({ path: "test-artifacts/touch-visual.png" });
		await c.close();
	});

	await test("Standalone room co-op", async () => {
		const c = await browser.newContext({
				viewport: { width: 1000, height: 700 },
			}),
			a = await c.newPage(),
			b = await c.newPage();
		for (const p of [a, b]) {
			p.on("pageerror", (e) => errors.push(e.message));
			await p.goto(url);
			await p.waitForFunction(() => window.__kaboom?.ready, null, {
				timeout: 45000,
			});
		}
		await a.evaluate(() => __kaboom.action("host"));
		const code = await a.evaluate(() => __kaboom.link.code);
		await b.evaluate((code) => __kaboom.link.join(code), code);
		await a.waitForFunction(() => __kaboom.state.network.members.length === 2);
		await a.getByRole("button", { name: "START TOGETHER" }).click();
		await b.waitForFunction(
			() => __kaboom.state.players.length === 2 && __kaboom.state.screen === "",
		);
		await b.keyboard.down("KeyD");
		await a.waitForFunction(() => __kaboom.state.players[1].x > 3, null, {
			timeout: 10000,
		});
		await b.keyboard.up("KeyD");
		await a.waitForTimeout(220);
		const sa = await a.evaluate(() => __kaboom.state),
			sb = await b.evaluate(() => __kaboom.state);
		assert(
			sa.network.sent > 0 &&
				sa.network.received > 0 &&
				sb.network.sent > 0 &&
				sb.network.received > 0,
			"Standalone co-op carries authoritative state and guest inputs both ways",
		);
		assert(
			Math.abs(sa.players[1].x - sb.players[1].x) < 1 && sa.players[1].x > 2,
			"Guest movement is replicated consistently",
		);
		await c.close();
	});

	await test("Standalone WebRTC data channel", async () => {
		await browser.close();
		browser = await launch();
		const ca = await browser.newContext({
				viewport: { width: 1000, height: 700 },
			}),
			cb = await browser.newContext({ viewport: { width: 1000, height: 700 } });
		try {
			const a = await ca.newPage(),
				b = await cb.newPage();
			const rtcUrl =
				url +
				"?headless=1&peer-server=" +
				encodeURIComponent(`http://127.0.0.1:${brokerPort}/kaboom`);
			for (const p of [a, b]) {
				p.on("pageerror", (e) => errors.push(e.message));
				await p.goto(rtcUrl);
				await p.waitForFunction(() => window.__kaboom?.ready, null, {
					timeout: 45000,
				});
			}
			await a.evaluate(() => __kaboom.action("host"));
			await a.waitForFunction(() => __kaboom.link.peer?.open, null, {
				timeout: 10000,
			});
			const code = await a.evaluate(() => __kaboom.link.code);
			await b.evaluate((code) => __kaboom.link.join(code), code);
			await a.waitForFunction(() => __kaboom.link.members.length === 2, null, {
				timeout: 20000,
			});
			await a.evaluate(() => __kaboom.action("room-start"));
			await b.waitForFunction(
				() =>
					__kaboom.state.screen === "" && __kaboom.state.players.length === 2,
			);
			await b.keyboard.down("KeyD");
			await a.waitForFunction(() => __kaboom.state.players[1].x > 3, null, {
				timeout: 10000,
			});
			await b.keyboard.up("KeyD");
			await a.waitForTimeout(250);
			assert(
				await b.evaluate(
					() => !__kaboom.link.local && __kaboom.link.connection.open,
				),
				"Isolated clients connect over a real WebRTC data channel",
			);
			assert(
				await a.evaluate(
					() =>
						__kaboom.state.players[1].x > 2 &&
						__kaboom.state.network.received > 0,
				),
				"WebRTC transports guest input into the authoritative world",
			);
		} finally {
			await ca.close();
			await cb.close();
		}
	});

	await test("Illustrated stage visual inspection", async () => {
		const c = await browser.newContext({
				viewport: { width: 1920, height: 1080 },
			}),
			p = await c.newPage();
		p.on("pageerror", (e) => errors.push(e.message));
		await p.goto(`${url}?webgl=1`);
		await p.waitForFunction(
			() => window.__kaboom?.ready || window.__kaboom?.error,
			null,
			{ timeout: 45000 },
		);
		assert(
			await p.evaluate(
				() => __kaboom.ready && __kaboom.state.backend === "WebGL 2 fallback",
			),
			"Fallback renderer initializes for visual inspection",
		);
		await p.waitForTimeout(300);
		await p.screenshot({ path: "test-artifacts/title-visual.png" });
		await p.evaluate(() => {
			__kaboom.start();
			__kaboom.config({ autoPlay: true });
			__kaboom.advance(33);
		});
		await p.waitForTimeout(3100);
		await p.screenshot({ path: "test-artifacts/gameplay-visual.png" });
		await c.close();
	});

	for (const scenario of [
		{ players: 2 },
		{ players: 4, latency: 150, jitter: 50, loss: 5 },
		{ players: 4, latency: 150, jitter: 50, loss: 5, scenario: "host-leave" },
		{ players: 2, scenario: "server" },
	])
		await test(`AI Hub ${JSON.stringify(scenario)}`, async () => {
			await browser.close();
			browser = await launch();
			const c = await browser.newContext({
					viewport: { width: 1600, height: 1000 },
				}),
				p = await c.newPage();
			p.on("pageerror", (e) => errors.push(e.message));
			const q = new URLSearchParams({
				game: `/${filename}?headless=1`,
				auto: "1",
				play: "1800",
				...Object.fromEntries(
					Object.entries(scenario).map(([k, v]) => [k, String(v)]),
				),
			});
			await p.goto(
				origin +
					"/Kaboomerang-Kaboom-gpt-6.1-sol-max-20261105-191415/hub/harness.html?" +
					q,
			);
			await p.waitForFunction(() => window.__hubCheck?.done, null, {
				timeout: 90000,
			});
			const result = await p.evaluate(() => ({
				...__hubCheck,
				renderers: [...document.querySelectorAll("iframe")].map((f) => ({
					probe: f.contentWindow.__rendererProbe,
					error: f.contentWindow.__kaboom?.error,
					backend: f.contentWindow.__kaboom?.ready
						? f.contentWindow.__kaboom.state.backend
						: null,
				})),
			}));
			await writeFile(
				"test-artifacts/hub-" +
					(scenario.scenario ?? scenario.players) +
					"-report.json",
				JSON.stringify(result, null, 2),
			);
			for (const check of result.checks)
				assert(
					check.pass,
					`Hub ${scenario.scenario ?? scenario.players}: ${check.name}${check.pass ? "" : `: ${check.detail}`}`,
				);
			await c.close();
		});

	await test("Direct file deployment", async () => {
		await browser.close();
		browser = await launch();
		const c = await browser.newContext(),
			p = await c.newPage();
		await p.goto(`file://${resolve("..", filename)}`);
		await p.waitForFunction(
			() => window.__kaboom?.ready || window.__kaboom?.error,
			null,
			{ timeout: 45000 },
		);
		assert(
			await p.evaluate(() => __kaboom.ready && !__kaboom.error),
			"The single HTML boots directly from file://",
		);
		await c.close();
	});
	assert(
		errors.length === 0,
		"No uncaught browser errors" +
			(errors.length ? `: ${[...new Set(errors)].join("; ")}` : ""),
	);
} catch (e) {
	assert(false, `Browser suite: ${e.message}`);
} finally {
	await browser?.close();
	broker.kill("SIGTERM");
	await new Promise((r) => server.close(r));
}
report.total = count;
report.failures = failures;
await writeFile("test-artifacts/report.json", JSON.stringify(report, null, 2));
for (const f of failures) console.log(`FAIL: ${f}`);
console.log(
	`${count - failures.length}/${count} checks passed; ${failures.length} failures.`,
);
process.exitCode = failures.length ? 1 : 0;
