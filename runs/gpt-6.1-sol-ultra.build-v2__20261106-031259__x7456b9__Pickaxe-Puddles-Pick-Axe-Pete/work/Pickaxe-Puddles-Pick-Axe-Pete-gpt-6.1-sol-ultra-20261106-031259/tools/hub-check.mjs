import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { findClients } from "../vendor/hub/scripts/lib/hub-client.mjs";
import { staticHandler } from "../vendor/hub/scripts/lib/serve.mjs";

const exec = promisify(execFile);
const DEV = fileURLToPath(new URL("../", import.meta.url));
const WORK = path.dirname(DEV);

async function testModulePath() {
	try {
		const { createRequire } = await import("node:module");
		createRequire(import.meta.url).resolve("playwright");
		return process.env.NODE_PATH || "";
	} catch {
		/* Reuse the installed Python Playwright driver's identical JS package. */
	}
	const python =
		process.env.PLAYWRIGHT_PYTHON ||
		"/home/micha/.local/share/pipx/venvs/playwright/bin/python";
	const { stdout } = await exec(python, [
		"-c",
		'import pathlib, playwright; print(pathlib.Path(playwright.__file__).parent / "driver" / "package")',
	]);
	const nodePath = path.join(DEV, ".cache", "test-node");
	await mkdir(nodePath, { recursive: true });
	await symlink(stdout.trim(), path.join(nodePath, "playwright"), "dir").catch(
		(error) => {
			if (error.code !== "EEXIST") throw error;
		},
	);
	return nodePath;
}

export async function runHubChecks() {
	const config = JSON.parse(
		await readFile(path.join(WORK, "build-config.json"), "utf8"),
	);
	const htmlName = `${config.stem}.html`;
	const html = await readFile(path.join(WORK, htmlName), "utf8");
	const clients = findClients(html);
	const charsetEnd = html.match(/<meta\s+charset=[^>]+>/i)?.index;
	const firstScript = html.indexOf("<script>");
	const headBeforeScript =
		charsetEnd == null ? null : html.slice(charsetEnd, firstScript);
	const staticChecks = [
		{
			name: "one pristine released Hub client",
			pass: clients.length === 1 && clients[0].pristine,
		},
		{
			name: "client is first script directly after charset",
			pass:
				firstScript >= 0 &&
				!!headBeforeScript?.match(/^<meta\s+charset=[^>]+>\s*$/i) &&
				html.slice(firstScript + 8, clients[0]?.start).trim() === "",
		},
		{
			name: "15-minute session and how-to metadata use the contract names",
			pass:
				/<meta name="hub:session-minutes" content="15">/.test(html) &&
				/<meta name="hub:session-howto" content="[^"]+">/.test(html),
		},
	];
	const badStatic = staticChecks.filter((check) => !check.pass);
	if (badStatic.length)
		throw new Error(
			`Hub packaging: ${badStatic.map((check) => check.name).join("; ")}`,
		);
	const serve = staticHandler(WORK);
	const server = createServer((request, response) => {
		if (request.url.startsWith("/lib/hub/"))
			request.url = `/${path.basename(DEV)}/vendor/hub${request.url}`;
		serve(request, response);
	});
	await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
	const base = `http://127.0.0.1:${server.address().port}`;
	try {
		const identity = await (await fetch(`${base}/${htmlName}`)).text();
		if (identity !== html || !identity.includes(`<title>${config.title}`))
			throw new Error("Owned Hub origin did not serve the expected game");
		const nodePath = await testModulePath();
		const checker = path.join(DEV, "vendor", "hub", "scripts", "hub-check.mjs");
		const report = await new Promise((resolve, reject) => {
			const child = spawn(
				process.execPath,
				[
					checker,
					`/${htmlName}`,
					"--base",
					base,
					"--players",
					"1,2",
					"--json",
					"--no-solo",
				],
				{
					cwd: DEV,
					env: { ...process.env, NODE_PATH: nodePath },
					stdio: ["ignore", "pipe", "pipe"],
				},
			);
			let stdout = "",
				stderr = "";
			child.stdout.on("data", (data) => {
				stdout += data;
			});
			child.stderr.on("data", (data) => {
				stderr += data;
			});
			child.once("error", reject);
			child.once("close", (code) => {
				let result;
				try {
					result = JSON.parse(stdout);
				} catch {
					return reject(
						new Error(
							`Official Hub checker returned invalid output (${code}): ${stderr || stdout}`,
						),
					);
				}
				result.stderr = stderr;
				if (!result.pass)
					return reject(
						new Error(
							`Official Hub conformance failed:\n${JSON.stringify(result, null, 2)}`,
						),
					);
				resolve(result);
			});
		});
		// The unchanged checker waits for body[data-complete=true] and asserts __hubCheck.pass.
		if ((await readFile(path.join(WORK, htmlName), "utf8")) !== html)
			throw new Error(
				"Game HTML changed during official Hub checks; rerun against the stable final bundle",
			);
		const checks =
			staticChecks.length +
			report.runs.reduce((total, run) => total + run.checks.length, 0);
		await mkdir(path.join(DEV, "evidence"), { recursive: true });
		await writeFile(
			path.join(DEV, "evidence", "hub-report.json"),
			JSON.stringify(
				{
					generated: new Date().toISOString(),
					htmlSha256: createHash("sha256").update(html).digest("hex"),
					checks,
					staticChecks,
					...report,
				},
				null,
				2,
			),
		);
		return checks;
	} finally {
		await new Promise((resolve) => server.close(resolve));
	}
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
	try {
		console.log(`${await runHubChecks()} official Hub checks passed`);
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
