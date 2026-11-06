"""Run the official Hub automatic harness against a game or transport fixture."""

import functools
import http.server
import json
import pathlib
import sys
import threading
from urllib.parse import urlencode

from playwright.sync_api import sync_playwright

BASE = pathlib.Path(__file__).resolve().parent.parent


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run():
    game = sys.argv[1] if len(sys.argv) > 1 else "/tests/net-hub.html"
    directory = BASE.parent if len(sys.argv) > 1 else BASE
    prefix = "/" + BASE.name if directory == BASE.parent else ""
    handler = functools.partial(QuietHandler, directory=str(directory))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    results = []
    browser = None
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context()
            page = context.new_page()
            scenarios = [
                ("standard", {"players": 2}),
                ("lagged", {"players": 4, "latency": 150, "jitter": 50, "loss": 5}),
                ("host-leave", {"players": 2, "scenario": "host-leave"}),
                ("server", {"players": 2, "scenario": "server"}),
            ]
            if len(sys.argv) > 2:
                scenarios = [item for item in scenarios if item[0] == sys.argv[2]]
            for name, args in scenarios:
                query = urlencode({"game": game, "auto": 1, "play": 2500, **args})
                page.goto(
                    f"http://127.0.0.1:{server.server_port}{prefix}/vendor/hub/harness.html?{query}"
                )
                page.wait_for_function(
                    "document.body.dataset.complete==='true'", timeout=55000
                )
                report = page.evaluate("window.__hubCheck")
                if name != "host-leave":
                    states = page.evaluate("""() => Array.from(document.querySelectorAll('iframe')).map(f=>{
                      const n=f.contentWindow.BU?.app?.net || f.contentWindow.net;
                      return n?.state ? n.state : null;
                    }).filter(Boolean)""")
                    same = len(states) >= 2 and all(
                        state == states[0] for state in states[1:]
                    )
                    (BASE / "evidence" / f"net-hub-state-{name}.json").write_text(
                        json.dumps(states, indent=2)
                    )
                    report["checks"].append(
                        {
                            "name": "final authoritative game-state agreement",
                            "pass": same,
                            "detail": f"{len(states)} copies compared",
                        }
                    )
                    report["pass"] = report["pass"] and same
                results.append({**report, "scenario": name})
                if not report["pass"]:
                    for check in report["checks"]:
                        if not check["pass"]:
                            print("FAIL: Hub", name, check["name"], check["detail"])
            context.close()
            browser.close()
            browser = None
    except Exception as error:  # noqa: BLE001 - test runner must persist failures
        results.append({"scenario": "runner", "pass": False, "error": str(error)})
        print("FAIL: Hub runner", str(error))
    finally:
        if browser:
            browser.close()
        server.shutdown()
        server.server_close()
    (BASE / "evidence" / "net-hub.json").write_text(json.dumps(results, indent=2))
    failed = sum(not r["pass"] for r in results)
    checks = [
        {**c, "name": f"Hub {r['scenario']}: {c['name']}"}
        for r in results
        for c in r.get("checks", [])
    ]
    for r in results:
        if "error" in r:
            checks.append({"name": "Hub runner", "pass": False, "detail": r["error"]})
    print(
        json.dumps(
            {"checks": checks, "failures": [c["name"] for c in checks if not c["pass"]]}
        )
    )
    return int(failed > 0)


if __name__ == "__main__":
    raise SystemExit(run())
