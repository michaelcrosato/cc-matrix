"""Standalone WebRTC integration test. Run with the installed Playwright Python."""
from pathlib import Path
from playwright.sync_api import sync_playwright


def main():
    checks = []
    source = (Path(__file__).parent / "hub.js").read_text()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            context = browser.new_context()
            host = context.new_page()
            guest = context.new_page()
            for page in (host, guest):
                page.set_content("<!doctype html><title>Understory networking test</title>")
                page.add_script_tag(content=source)
            offer = host.evaluate("CavernNet.makeOffer()")
            answer = guest.evaluate("code => CavernNet.answerOffer(code)", offer)
            host.evaluate("code => CavernNet.acceptAnswer(code)", answer)
            host.wait_for_function("CavernNet.status().connected", timeout=15000)
            guest.wait_for_function("CavernNet.status().connected", timeout=15000)
            checks.append(("WebRTC manual offer and answer connects both peers", True))
            host.evaluate("() => { CavernNet.onInput((v,id)=>window.receivedInput={v,id}); }")
            guest.evaluate("() => { CavernNet.onState(v=>window.receivedState=v); }")
            guest.evaluate("CavernNet.sendInput({move:1,jump:true})")
            host.evaluate("CavernNet.sendState({player:{x:21,y:-8},score:100})")
            host.wait_for_function("window.receivedInput?.v.jump===true")
            guest.wait_for_function("window.receivedState?.score===100")
            checks.append(("WebRTC guest input reaches host", host.evaluate("receivedInput.id===1")))
            checks.append(("WebRTC authoritative snapshot reaches guest", guest.evaluate("receivedState.player.x===21")))
            checks.append(("WebRTC guest cannot send authoritative state", guest.evaluate("CavernNet.sendState({score:900})===false")))
            guest.evaluate("() => { CavernNet.onFinish(v=>window.receivedFinish=v); }")
            host.evaluate("CavernNet.finish({won:true,score:200})")
            guest.wait_for_function("window.receivedFinish?.won===true")
            checks.append(("WebRTC team result reaches companion", True))
            guest.evaluate("CavernNet.solo()")
            guest.wait_for_timeout(100)
            checks.append(("WebRTC teardown preserves resumed solo state", guest.evaluate("CavernNet.status().transport==='solo' && !CavernNet.status().waiting && CavernNet.status().isHost")))
            for page in (host, guest):
                page.evaluate("CavernNet.destroy()")
        except Exception as error:
            checks.append(("WebRTC integration", False))
            print(f"FAIL WebRTC integration: {error}")
        finally:
            browser.close()
    for name, passed in checks:
        if not passed:
            print(f"FAIL {name}")
    print(f"{sum(passed for _, passed in checks)}/{len(checks)} WebRTC checks passed")
    return 0 if all(passed for _, passed in checks) else 1


if __name__ == "__main__":
    raise SystemExit(main())
