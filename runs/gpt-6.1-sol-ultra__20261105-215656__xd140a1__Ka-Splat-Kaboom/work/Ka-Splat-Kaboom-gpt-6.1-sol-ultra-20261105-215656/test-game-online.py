"""Run the shipped Ka-Splat HTML through the official AI Hub harness."""

import json
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
NAME = ROOT.name


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def main():
    server = ThreadingHTTPServer(
        ("127.0.0.1", 0), partial(QuietHandler, directory=str(ROOT.parent))
    )
    server.daemon_threads = True
    Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{server.server_port}"
    failures = []
    checks = 0
    reports = []

    def check(condition, label):
        nonlocal checks
        checks += 1
        if not condition:
            failures.append(label)
            print("FAIL:", label)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=[
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-angle=swiftshader", "--disable-vulkan-surface",
                ],
            )
            context = browser.new_context(viewport={"width": 1280, "height": 720})
            page = context.new_page()
            for label, suffix in [
                ("standard", ""),
                ("impaired", "&latency=150&jitter=50&loss=5"),
                ("server", "&scenario=server"),
                ("host leave", "&scenario=host-leave"),
            ]:
                page.goto(
                    origin
                    + f"/{NAME}/hub/harness.html?game=../../{NAME}.html&players=2&auto=1&play=5000"
                    + suffix
                )
                page.wait_for_function(
                    """()=>{
                    const frames=[...document.querySelectorAll('iframe')];
                    return frames.length>=2 && frames.every(f=>f.contentWindow.__game);
                    }""",
                    timeout=60000,
                )
                check(
                    page.evaluate(
                        "[...document.querySelectorAll('iframe')].every(f=>f.contentDocument.title.includes('Ka-Splat'))"
                    ),
                    f"{label}: actual Ka-Splat game loaded",
                )
                page.evaluate(
                    """()=>{for(const f of document.querySelectorAll('iframe')){
                    const g=f.contentWindow.__game;
                    if(g.online.isHost)g.model.setConfig({invincible:true});
                    }}"""
                )
                page.wait_for_function(
                    "document.body.dataset.complete==='true'", timeout=60000
                )
                report = page.evaluate("window.__hubCheck")
                for item in report.get("checks", []):
                    check(
                        item["pass"],
                        f"Hub {label}: {item['name']} {item.get('detail', '')}",
                    )
                if not report.get("checks"):
                    check(False, f"Hub {label}: no checks")
                states = page.evaluate(
                    """()=>[...document.querySelectorAll('iframe')].filter(f=>f.contentWindow.__game).map(f=>{
                    const g=f.contentWindow.__game;
                    return {host:g.online.isHost,server:g.online.server,ended:g.online.ended,
                    me:g.online.localId,players:g.online.players,screen:g.state.screen,
                    phase:g.state.snapshot.phase,time:g.state.snapshot.time,modelTime:g.model.time,
                    buckets:g.state.snapshot.players,score:g.state.snapshot.score,backend:g.state.backend};
                    })"""
                )
                guests = [s for s in states if not s["host"]]
                check(
                    all(s["time"] > 0 for s in guests),
                    f"{label}: guests render host world",
                )
                check(
                    all(s["modelTime"] == 0 for s in guests),
                    f"{label}: guests do not run independent simulation",
                )
                check(
                    all(s["ended"] for s in states),
                    f"{label}: remaining game copies stop at Hub end",
                )
                if label == "server":
                    servers = [s for s in states if s["server"]]
                    check(
                        len(servers) == 1
                        and servers[0]["me"] is None
                        and len(servers[0]["buckets"]) == 2,
                        "server: no extra bucket for server copy",
                    )
                reports.append({"scenario": label, "report": report, "states": states})
            page.close()
            context.close()
            browser.close()
    except Exception as error:  # noqa: BLE001 — Keep setup failures in the single test summary.
        check(False, f"test execution: {error}")
    finally:
        server.shutdown()
        server.server_close()
    (ROOT / "actual-network-results.json").write_text(
        json.dumps(
            {"checks": checks, "failures": failures, "reports": reports}, indent=2
        )
    )
    print(
        f"{checks - len(failures)}/{checks} actual-game network checks passed; {len(failures)} failures"
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
