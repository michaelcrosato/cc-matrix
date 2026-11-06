import hashlib
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
config = json.loads((root / "build-config.json").read_text())
release = root.parent / (config["slug"] + ".html")
count = 0
failures = []
results = {}


def check(name, ok, detail=""):
    global count
    count += 1
    if not ok:
        failures.append(name + ": " + str(detail))


with sync_playwright() as p:
    for kind in ["webgpu", "webkit", "firefox"]:
        browser = None
        try:
            engine = p.chromium if kind == "webgpu" else getattr(p, kind)
            args = (
                [
                    "--enable-unsafe-webgpu",
                    "--enable-features=Vulkan",
                    "--use-webgpu-adapter=swiftshader",
                    "--disable-dev-shm-usage",
                ]
                if kind == "webgpu"
                else []
            )
            browser = engine.launch(headless=True, args=args)
            page = browser.new_page(viewport={"width": 960, "height": 600})
            errors = []
            page.on("pageerror", lambda e, errors=errors: errors.append(str(e)))
            page.goto(
                release.as_uri()
                + "?test=1"
                + ("" if kind == "webgpu" else "&backend=webgl")
            )
            page.wait_for_function(
                "document.body.dataset.ready==='true'||document.body.dataset.error",
                timeout=60000,
            )
            data = page.evaluate(
                "({ready:document.body.dataset.ready,error:document.body.dataset.error,backend:globalThis.My3D2dge?.World3D?.backend??'none',screen:window.__gameTest?.screen})"
            )
            results[kind] = data
            if kind == "firefox":
                check(
                    "Firefox without WebGL gets helpful unsupported-renderer message",
                    bool(data.get("error"))
                    and "WebGL 2 or WebGPU" in page.locator("body").inner_text(),
                    data,
                )
            else:
                check(kind + " native renderer boot", data.get("ready") == "true", data)
                if data.get("ready") == "true":
                    model = page.evaluate(
                        "(()=>{__gameTest.start();__gameTest.command({type:'move',dx:1,dy:0});return {x:__gameTest.state.players.solo.x,encounter:!!__gameTest.state.encounter,errors:game.errors};})()"
                    )
                    check(
                        kind + " state advances through production rules",
                        model["x"] == 2 and model["encounter"] and not model["errors"],
                        model,
                    )
                    check(kind + " has no page exceptions", not errors, errors)
        except Exception as e:  # noqa: BLE001 - report all browser failures
            check(kind + " browser verification", False, str(e))
            results[kind] = {"error": str(e)}
        finally:
            if browser:
                browser.close()
(root / "evidence/cross-browser-report.json").write_text(
    json.dumps(
        {
            "count": count,
            "failures": failures,
            "results": results,
            "sha256": hashlib.sha256(release.read_bytes()).hexdigest(),
        },
        indent=2,
    )
)
for f in failures:
    print("FAIL Compatibility:", f)
print(f"{count - len(failures)}/{count} compatibility checks passed")
sys.exit(1 if failures else 0)
