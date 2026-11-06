"""Official Hub conformance plus real authoritative/replicated-game assertions.

Run with the installed Playwright Python interpreter. The only HTTP server is
an in-process, loopback-only server using an OS-assigned port, stopped in finally.
"""

import argparse
import functools
import http.server
import json
import threading
from pathlib import Path
from urllib.parse import urlencode

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright

WATCH = """(() => {
  if (!/[?&]aihub=/.test(location.search)) return;
  window.__hubViolations=[];
  for(const name of ['alert','confirm','prompt','open']) window[name]=()=>window.__hubViolations.push(name+'() called');
  for(const name of ['WebSocket','RTCPeerConnection','EventSource']) {
    const Original=window[name]; if(!Original)continue;
    window[name]=function(...args){window.__hubViolations.push(name+' opened');return new Original(...args);};
  }
  addEventListener('error',e=>window.__hubViolations.push('error: '+e.message));
  addEventListener('unhandledrejection',e=>window.__hubViolations.push('rejection: '+(e.reason?.message||e.reason)));
})();"""


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run(artifact, report_path, quick=False):
    artifact = Path(artifact).resolve()
    project = Path(__file__).resolve().parents[1]
    scope = project.parent
    if artifact.parent != scope:
        raise ValueError("Artifact must be in the assigned workspace root")
    reports = []
    failures = []
    handler = functools.partial(QuietHandler, directory=str(scope))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    base = f"http://127.0.0.1:{server.server_address[1]}"
    harness = f"/{project.name}/tests/hub/harness.html"
    plans = (
        [(2, "standard"), (2, "server")]
        if quick
        else [
            (1, "standard"),
            (2, "standard"),
            (3, "standard"),
            (4, "standard"),
            (3, "host-leave"),
            (2, "server"),
        ]
    )
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
            try:
                for count, scenario in plans:
                    context = browser.new_context(
                        viewport={"width": 1280, "height": 860}
                    )
                    context.add_init_script(WATCH)
                    page = context.new_page()
                    errors, warnings = [], []
                    page.on(
                        "pageerror", lambda e, failures=errors: failures.append(str(e))
                    )
                    page.on(
                        "console",
                        lambda m, issues=warnings: (
                            issues.append(m.text)
                            if m.text.startswith("[AIHub]")
                            else None
                        ),
                    )
                    query = urlencode(
                        {
                            "game": "/" + artifact.name,
                            "players": count,
                            "latency": 150,
                            "jitter": 50,
                            "loss": 5,
                            "auto": 1,
                            "scenario": scenario,
                            "play": 8000,
                        }
                    )
                    try:
                        page.goto(base + harness + "?" + query)
                        page.wait_for_selector(
                            'body[data-complete="true"]', timeout=90000
                        )
                        report = page.evaluate("window.__hubCheck")
                        extra = [
                            {
                                "name": "no client warnings",
                                "pass": not warnings,
                                "detail": "; ".join(dict.fromkeys(warnings)),
                            },
                            {
                                "name": "no harness browser errors",
                                "pass": not errors,
                                "detail": "; ".join(errors),
                            },
                        ]
                        for frame in page.frames[1:]:
                            state = frame.evaluate("""() => {
                              const a=window.__siege;if(!a)return null;
                              return {tick:a.world.s.tick,ended:a.ended,online:a.online?.diagnostics(),audio:a.audio.diagnostics(),errors:a.game.errors};
                            }""")
                            if state:
                                extra.append(
                                    {
                                        "name": "actual world ticks and cleans up after end",
                                        "pass": state["tick"] > 0
                                        and state["ended"]
                                        and state["online"]["ended"]
                                        and not state["errors"],
                                        "detail": state,
                                    }
                                )
                        report["checks"].extend(extra)
                        report["pass"] = report["pass"] and all(
                            c["pass"] for c in extra
                        )
                        reports.append(report)
                        for check in report["checks"]:
                            if not check["pass"]:
                                failures.append(
                                    f"Hub {count}p {scenario}: {check['name']}: {check.get('detail', '')}"
                                )
                    except (PlaywrightError, ValueError, KeyError) as e:
                        failures.append(f"Hub {count}p {scenario}: {e}")
                        reports.append(
                            {
                                "pass": False,
                                "players": count,
                                "scenario": scenario,
                                "error": str(e),
                            }
                        )
                    finally:
                        context.close()
            finally:
                browser.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=3)
    report = {"pass": not failures, "runs": reports, "failures": failures}
    Path(report_path).write_text(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("artifact")
    parser.add_argument(
        "--report",
        default=str(Path(__file__).resolve().parents[1] / "docs/hub-evidence.json"),
    )
    parser.add_argument("--quick", action="store_true")
    args = parser.parse_args()
    result = run(args.artifact, args.report, args.quick)
    for failure in result["failures"]:
        print("FAIL " + failure)
    passed = sum(1 for r in result["runs"] if r["pass"])
    print(f"{passed} Hub scenarios passed, {len(result['runs']) - passed} failed")
    raise SystemExit(0 if result["pass"] else 1)
