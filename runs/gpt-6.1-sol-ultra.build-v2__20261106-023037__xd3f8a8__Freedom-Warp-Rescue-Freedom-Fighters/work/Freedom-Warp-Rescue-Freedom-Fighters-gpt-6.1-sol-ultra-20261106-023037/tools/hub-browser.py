"""Actual AI Hub harness checks. Uses only a private OS-assigned loopback server."""

from __future__ import annotations

import argparse
import functools
import http.server
import json
import threading
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

DEV = Path(__file__).resolve().parents[1]
ROOT = DEV.parent
BUILD = "FWR-20261106-023037"


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, _format, *args):
        pass


def coop_round(browser, harness_url, game_url, artifact_dir):
    """Two actual Hub frames complete the mission through their own seat inputs."""
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    page = context.new_page()
    page.set_default_timeout(240_000)
    errors = []
    warnings = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on(
        "console",
        lambda message: (
            warnings.append(message.text)
            if message.text.startswith("[AIHub]")
            else None
        ),
    )
    report = None
    try:
        params = {
            "game": game_url,
            "players": 2,
            "seed": 1982,
            "latency": 0,
            "jitter": 0,
            "loss": 0,
            "limit": 1200,
        }
        page.goto(harness_url + "?" + urlencode(params), wait_until="domcontentloaded")
        page.wait_for_function("""() => {
          const frames=[...document.querySelectorAll('iframe')];
          return frames.length===2 && frames.every(f=>f.contentWindow.FWR?.debug?.identity==='FWR-20261106-023037');
        }""")
        page.locator("#release").click()
        page.wait_for_function(
            """() => [...document.querySelectorAll('iframe')].every(f=>f.contentWindow.FWR?.debug?.net?.started)"""
        )
        report = page.evaluate("""async () => {
          const copies=[...document.querySelectorAll('iframe')].map(f=>f.contentWindow);
          const host=copies.find(w=>w.FWR.debug.net.isHost), remote=copies.find(w=>!w.FWR.debug.net.isHost);
          for(const w of copies) w.FWR.debug.externalClock=true;
          const milestones=[],start=performance.now();
          let iterations=0,lastSector=-1;
          while(!host.FWR.debug.net.world.outcome && host.FWR.debug.net.world.time<1200 && performance.now()-start<210000) {
            const hd=host.FWR.debug,rd=remote.FWR.debug;
            const p=host.FWR.botIntent(hd.net.world),n=remote.FWR.botIntent(rd.net.world);
            // Each copy supplies exactly its own local seat. Authority resolves
            // pilot movement and remote navigator aim/hyperspace in the usual way.
            hd.inject('local-1',{...p,ax:0,ay:0,burst:false});
            rd.inject('local-1',n);
            rd.advance(.1);
            hd.advance(.1);
            if(hd.net.world.sector!==lastSector) {
              lastSector=hd.net.world.sector;
              milestones.push({sector:lastSector,time:hd.net.world.time,hull:hd.net.world.ship.hull,rescued:hd.net.world.rescued.length});
            }
            iterations++;
            await new Promise(resolve=>setTimeout(resolve,10));
          }
          host.FWR.debug.release();remote.FWR.debug.release();
          // Continue transport ticks after the latched outcome, allowing the
          // final snapshot and single finish to reach the other actual frame.
          for(let i=0;i<65;i++) {
            host.FWR.debug.advance(1/120);remote.FWR.debug.advance(1/120);
            await new Promise(resolve=>setTimeout(resolve,10));
          }
          return {identity:copies.map(w=>w.FWR.BUILD),host:host.FWR.debug.world(),remote:remote.FWR.debug.world(),
            diagnostics:copies.map(w=>w.FWR.debug.snapshot()),milestones,iterations,elapsedMs:performance.now()-start};
        }""")
        host = report["host"]
        remote = report["remote"]
        problems = []
        if report["identity"] != [BUILD, BUILD]:
            problems.append("wrong game identity")
        if not (host.get("outcome") or {}).get("won"):
            problems.append(
                "normal-action co-op driver did not win: "
                + json.dumps(
                    {
                        "outcome": host.get("outcome"),
                        "sector": host.get("sector"),
                        "objective": host.get("objective"),
                        "ship": host.get("ship"),
                    }
                )
            )
        for key in ("outcome", "rescued", "lost", "score"):
            if host.get(key) != remote.get(key):
                problems.append("authoritative/client mismatch: " + key)
        if (
            host.get("debugModified")
            or host.get("dev", {}).get("invulnerable")
            or host.get("attract")
        ):
            problems.append("playthrough used a gameplay cheat")
        if set(host.get("seenTypes", [])) < {
            "layer",
            "guard",
            "interceptor",
            "organ",
            "core",
        }:
            problems.append("not all enemy roles encountered")
        if not all(
            phase in host.get("seenPhases", [])
            for phase in ("3:organs", "3:prisoners", "3:core")
        ):
            problems.append("not all carrier phases encountered")
        for diagnostic in report["diagnostics"]:
            if diagnostic.get("errors"):
                problems.append("game errors: " + json.dumps(diagnostic["errors"]))
            if (
                diagnostic["net"]["maxBytes"] > 16000
                or diagnostic["net"]["peakPerSecond"] > 18
            ):
                problems.append("protocol send budget exceeded")
        host_diag = next(d["net"] for d in report["diagnostics"] if d["net"]["isHost"])
        if host_diag["finishCalls"] != 1:
            problems.append("host did not finish exactly once")
        if errors or warnings:
            problems.append(json.dumps({"errors": errors, "warnings": warnings}))
        result = {
            "name": "Hub real two-frame operation: shared rescue ledger and ending",
            "pass": not problems,
            "detail": "; ".join(problems),
        }
    except (PlaywrightError, ValueError, RuntimeError, KeyError, TypeError) as error:
        result = {
            "name": "Hub real two-frame operation: shared rescue ledger and ending",
            "pass": False,
            "detail": str(error),
        }
    finally:
        (artifact_dir / "hub-real-coop.json").write_text(
            json.dumps(
                {"report": report, "errors": errors, "warnings": warnings}, indent=2
            )
            + "\n"
        )
        context.close()
    return result


def run_checks(game_path: str | Path, browser=None, *, harness=True, coop=True):
    """Return structured checks; success produces no output until the caller reports."""
    game_path = Path(game_path).resolve()
    artifact_dir = DEV / "artifacts"
    artifact_dir.mkdir(exist_ok=True)
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_address[1]}"
    game_url = "/" + game_path.relative_to(ROOT).as_posix()
    harness_url = f"{base}/{DEV.name}/vendor/hub-repo/lib/hub/harness.html"
    results = []
    own_browser = browser is None
    playwright = None
    try:
        if own_browser:
            playwright = sync_playwright().start()
            browser = playwright.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
            )
        cases = [
            ("two teammates", {"players": 2}),
            (
                "impaired network",
                {"players": 2, "latency": 150, "jitter": 50, "loss": 5},
            ),
            ("host departure", {"players": 2, "scenario": "host-leave"}),
            ("server-only authority", {"players": 2, "scenario": "server"}),
            ("solo teammate", {"players": 1}),
        ]
        for name, query in cases if harness else []:
            context = browser.new_context(viewport={"width": 1280, "height": 900})
            page = context.new_page()
            warnings = []
            errors = []
            page.on("pageerror", lambda error, sink=errors: sink.append(str(error)))
            page.on(
                "console",
                lambda message, sink=warnings: (
                    sink.append(message.text)
                    if message.text.startswith("[AIHub]")
                    else None
                ),
            )
            report = None
            identity = False
            try:
                params = {
                    "game": game_url,
                    "auto": 1,
                    "play": 1600,
                    "seed": 1982,
                    **query,
                }
                page.goto(
                    harness_url + "?" + urlencode(params), wait_until="domcontentloaded"
                )
                page.wait_for_function(
                    "document.body.dataset.complete === 'true'", timeout=100_000
                )
                report = page.evaluate("window.__hubCheck")
                frames = [frame for frame in page.frames if "aihub=" in frame.url]
                identity = bool(frames) and all(
                    frame.evaluate("globalThis.FWR?.BUILD") == BUILD for frame in frames
                )
                passed = bool(
                    report
                    and report.get("pass")
                    and identity
                    and not errors
                    and not warnings
                )
                detail = ""
                if not passed:
                    failed = [
                        check
                        for check in (report or {}).get("checks", [])
                        if not check.get("pass")
                    ]
                    detail = json.dumps(
                        {
                            "failed": failed,
                            "identity": identity,
                            "errors": errors,
                            "warnings": warnings,
                        }
                    )
                results.append(
                    {"name": "Hub harness: " + name, "pass": passed, "detail": detail}
                )
            except (PlaywrightError, ValueError, RuntimeError) as error:
                results.append(
                    {
                        "name": "Hub harness: " + name,
                        "pass": False,
                        "detail": str(error),
                    }
                )
                try:
                    report = page.evaluate("window.__hubCheck")
                except PlaywrightError:
                    report = None
            finally:
                evidence = {
                    "case": name,
                    "report": report,
                    "identity": identity,
                    "errors": errors,
                    "warnings": warnings,
                }
                (artifact_dir / ("hub-" + name.replace(" ", "-") + ".json")).write_text(
                    json.dumps(evidence, indent=2) + "\n"
                )
                context.close()
        if coop:
            results.append(coop_round(browser, harness_url, game_url, artifact_dir))
    finally:
        if own_browser and browser is not None:
            browser.close()
        if playwright is not None:
            playwright.stop()
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("game")
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--only-coop", action="store_true")
    parser.add_argument("--only-harness", action="store_true")
    args = parser.parse_args()
    checks = run_checks(
        args.game, harness=not args.only_coop, coop=not args.only_harness
    )
    if args.json:
        print(json.dumps(checks))
    else:
        for check in checks:
            if not check["pass"]:
                print(f"FAIL {check['name']}: {check['detail']}")
        print(
            f"{sum(bool(check['pass']) for check in checks)}/{len(checks)} Hub browser checks passed"
        )
    raise SystemExit(0 if all(check["pass"] for check in checks) else 1)
