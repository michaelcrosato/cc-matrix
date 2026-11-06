"""Exercise an isolated copy of the exact root delivery after its final build."""

import json
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def run():
    identity = json.loads((ROOT / "identity.json").read_text())
    delivery = ROOT.parent / (identity["slug"] + ".html")
    isolated = ROOT / "artifacts/standalone/game.html"
    isolated.parent.mkdir(exist_ok=True)
    isolated.write_bytes(delivery.read_bytes())
    passed = 0
    failures = []

    def check(ok, name):
        nonlocal passed
        if ok:
            passed += 1
        else:
            failures.append(name)

    interview = json.loads((ROOT.parent / "exit-interview.json").read_text())
    check(
        interview == json.loads((ROOT / "src/data/interview.json").read_text()),
        "Interview and bundled About data agree",
    )
    check(
        [
            len(interview[k])
            for k in ["testingFeedback", "engineFeedback", "promptFeedback"]
        ]
        == [4, 6, 4],
        "Interview feedback question counts",
    )
    check(
        interview["sourceInformation"]["usage"] == "added on import",
        "Usage exact import sentinel",
    )
    check(
        all(isinstance(v, str) and v for v in interview["sourceInformation"].values()),
        "All source information values filled",
    )
    check(
        delivery.read_bytes() == (ROOT / "build/game.html").read_bytes(),
        "Final delivery byte-identical to tested build",
    )
    check(
        not any(
            s in delivery.read_text()
            for s in ["Verification in progress; final findings", "TODO", "FIXME"]
        ),
        "Final build has no unfinished game markers",
    )
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        errors = []
        requests = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("request", lambda r: requests.append(r.url))
        page.goto(isolated.as_uri())
        page.wait_for_function("document.body.dataset.ready==='true'")
        check(
            page.title() == identity["title"],
            "Isolated exported HTML boots with correct identity",
        )
        page.screenshot(path=str(ROOT / "artifacts/title-final.png"))
        page.get_by_role("button", name="About / Credits", exact=True).click()
        observed = []
        for section, key in enumerate(
            ["sourceInformation", "testingFeedback", "engineFeedback", "promptFeedback"]
        ):
            values = (
                list(interview[key].values())
                if isinstance(interview[key], dict)
                else interview[key]
            )
            content = ""
            for _ in range((len(values) + 1) // 2):
                content += page.locator("#orbit-ui").inner_text()
                check(
                    page.evaluate(
                        "(() => {const el=document.querySelector('.esh-mod');return el.scrollHeight<=el.clientHeight+2})()"
                    ),
                    "Credits page fits TV viewport without inaccessible controller scroll",
                )
                page.get_by_role("button", name="More details", exact=True).click()
            check(
                all(value in content for value in values),
                "Every final " + key + " value is accessible through details pages",
            )
            observed.append(content)
            page.get_by_role("button", name="Next page", exact=True).click()
        page.screenshot(path=str(ROOT / "artifacts/credits-final.png"))
        page.evaluate("__orbit.toTitle()")
        page.wait_for_function("__game.sceneName==='title'")
        page.get_by_role("button", name="Start Mission", exact=True).click()
        page.wait_for_function("__game.sceneName==='play'&&__orbit.world.time>1")
        check(
            page.evaluate("__orbit.present.titlePose.lift===1"),
            "Native launch tween completes",
        )
        page.evaluate("__orbit.audio.say('CONFIDENCE AT MAXIMUM!')")
        page.wait_for_function("__orbit.present.subtitle==='CONFIDENCE AT MAXIMUM!'")
        check(
            page.evaluate("__orbit.present.subtitle===__orbit.audio.subtitle"),
            "Dispatcher voice has matching native HUD subtitle",
        )
        page.keyboard.down("d")
        page.wait_for_timeout(150)
        page.keyboard.up("d")
        page.mouse.move(1190, 380)
        page.mouse.down()
        page.wait_for_timeout(350)
        page.mouse.up()
        check(
            page.evaluate(
                "__orbit.world.stats.shots>0&&__orbit.world.players[0].shield>0"
            ),
            "Exported artifact accepts movement/aim/fire and spends shield",
        )
        page.evaluate("__game.stop();__game.advance(3,{draw:true})")
        page.screenshot(path=str(ROOT / "artifacts/mission-final.png"))
        check(
            not page.evaluate("__game.errors") and not errors,
            "Final native/browser drawing has no errors",
        )
        check(
            all(url.startswith("file:") for url in requests) and len(requests) == 1,
            "Isolated copy needs no siblings, external requests or server",
        )
        browser.close()
    result = {"passed": passed, "failed": len(failures), "failures": failures}
    (ROOT / "artifacts/final-artifact-report.json").write_text(
        json.dumps(result, indent=2)
    )
    return result


if __name__ == "__main__":
    try:
        result = run()
    except Exception as exc:  # noqa: BLE001
        result = {"passed": 0, "failed": 1, "failures": ["Final artifact: " + str(exc)]}
    print(json.dumps(result))
    raise SystemExit(1 if result["failed"] else 0)
