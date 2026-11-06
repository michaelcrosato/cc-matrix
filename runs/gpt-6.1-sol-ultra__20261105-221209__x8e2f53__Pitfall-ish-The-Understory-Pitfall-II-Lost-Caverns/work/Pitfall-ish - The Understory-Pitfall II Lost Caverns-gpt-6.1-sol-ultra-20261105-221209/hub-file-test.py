"""Verify local camp co-op between two file:// tabs, without a GPU renderer."""
from pathlib import Path
from uuid import uuid4

from playwright.sync_api import sync_playwright


def main():
    root = Path(__file__).resolve().parent
    fixture = root / "hub-file-fixture.html"
    source = (root / "hub.js").read_text()
    fixture.write_text("<!doctype html><title>Understory file camp test</title><script>" + source + "</script>")
    checks = []
    details = []
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                context = browser.new_context()
                host = context.new_page()
                guest = context.new_page()
                for page in (host, guest):
                    page.goto(fixture.as_uri())
                    page.wait_for_function("window.CavernNet")
                room = "FILE" + uuid4().hex[:12]
                host.evaluate("room => CavernNet.hostLocal(room)", room)
                guest.evaluate("room => CavernNet.joinLocal(room)", room)
                host.wait_for_function("CavernNet.status().connected", timeout=5000)
                guest.wait_for_function("CavernNet.status().connected", timeout=5000)
                checks.append(("file camp handshake connects both tabs", True))
                host.evaluate("() => { CavernNet.onInput((value,id)=>window.remoteInput={value,id}); }")
                guest.evaluate("() => { CavernNet.onState(value=>window.worldState=value); }")
                guest.evaluate("CavernNet.sendInput({right:true})")
                host.evaluate("CavernNet.sendState({players:[{id:0,x:8},{id:1,x:9}],score:25})")
                host.wait_for_function("window.remoteInput?.value.right", timeout=3000)
                guest.wait_for_function("window.worldState?.score===25", timeout=3000)
                checks.append(("file camp guest input reaches authoritative host", host.evaluate("remoteInput.id===1")))
                checks.append(("file camp host state reaches guest", guest.evaluate("worldState.players[1].x===9")))
                details = [host.evaluate("CavernNet.status()"), guest.evaluate("CavernNet.status()")]
                for page in (host, guest):
                    page.evaluate("CavernNet.destroy()")
            except Exception as error:
                checks.append(("file camp integration: " + str(error), False))
            finally:
                browser.close()
    finally:
        fixture.unlink(missing_ok=True)
    import json
    (root / "hub-file-results.json").write_text(json.dumps({"checks": [{"name": name, "pass": passed} for name, passed in checks], "peers": details}, indent=2))
    for name, passed in checks:
        if not passed:
            print("FAIL " + name)
    failures = sum(not passed for _, passed in checks)
    print(f"{len(checks)} file camp checks, {failures} failures")
    return int(bool(failures))


if __name__ == "__main__":
    raise SystemExit(main())
