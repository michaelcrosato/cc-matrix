"""Two-player acceptance through the exported game's visible host/join and repair UI."""

import functools
import http.server
import json
import pathlib
import threading

from playwright.sync_api import Error, sync_playwright

BASE = pathlib.Path(__file__).resolve().parent.parent
PROJECT = json.loads((BASE / "project.json").read_text())


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run():
    checks = []
    errors = []
    browser = None

    def check(name, passed, detail=""):
        checks.append({"name": name, "pass": bool(passed), "detail": detail})

    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(BASE.parent))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()

    def action(page, board):
        # The helper observes the public repair state; every operation is a real
        # tool selection and click/hold on the shipped native workspace.
        a = page.evaluate("(id)=>BU.Sim.nextAction(BU.app.state,id)", board)
        if not a:
            return False
        tool = (
            "Digit1"
            if a["type"] == "cut"
            else "Digit3"
            if a["type"] == "begin"
            else "Digit2"
        )
        page.keyboard.press(tool)
        target = (
            "spare:" + a["spare"]
            if a["type"] == "pick"
            else a["component"] + ":" + str(a.get("terminal", "body"))
        )
        point = page.evaluate(
            """(id)=>{const a=BU.app,t=a.game.debug.targets().find(t=>t.id===id),r=document.querySelector('#screen').getBoundingClientRect();if(!t)return null;return {x:r.left+t.x/a.game.W*r.width,y:r.top+t.y/a.game.H*r.height};}""",
            target,
        )
        if not point:
            raise AssertionError("visible target missing " + target)
        before = page.evaluate(
            "(id)=>BU.app.state.boards.find(b=>b.id===id).revision", board
        )
        if a["type"] == "begin":
            page.mouse.move(point["x"], point["y"])
            page.mouse.down()
            page.wait_for_function(
                "(id)=>!!BU.app.state.boards.find(b=>b.id===id).hold",
                arg=board,
                timeout=5000,
            )
            page.wait_for_timeout(650)
            page.mouse.up()
        else:
            page.mouse.click(point["x"], point["y"])
        page.wait_for_function(
            "([id,rev])=>BU.app.state.boards.find(b=>b.id===id).revision>rev",
            arg=[board, before],
            timeout=5000,
        )
        page.wait_for_timeout(180)
        return True

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1920, "height": 1080})
            host = context.new_page()
            guest = context.new_page()
            for page in [host, guest]:
                page.on("pageerror", lambda e: errors.append(str(e)))
                page.goto(
                    f"http://127.0.0.1:{server.server_port}/{PROJECT['slug']}.html"
                )
                page.wait_for_function(
                    'window.BU?.app?.screen==="title" && document.querySelector("#bu-loading").hidden'
                )
                check("exported game identity", page.title().startswith("Bomb Union"))
                page.get_by_role(
                    "button", name="Cooperative dispatch", exact=True
                ).click()
            host.get_by_role("button", name="Host a dispatch", exact=True).click()
            host.wait_for_function(
                'BU.app.net.connected && BU.app.screen==="lobby"', timeout=25000
            )
            code = host.evaluate("BU.app.net.code")
            guest.get_by_role("button", name="Join a crew", exact=True).click()
            guest.get_by_role("textbox", name="Paste room code", exact=True).fill(code)
            guest.get_by_role("button", name="Connect to room", exact=True).click()
            guest.wait_for_function(
                'BU.app.net.connected && BU.app.screen==="lobby"', timeout=25000
            )
            check(
                "shipped host and join controls connect",
                guest.evaluate("BU.app.net.seat") == 1,
            )
            host.get_by_role("button", name="Dispatch · waterfront", exact=True).click()
            for page in [host, guest]:
                page.wait_for_function(
                    'BU.app.screen==="evidence" && BU.app.state?.caseId==="waterfront"'
                )
            for index in range(4):
                page = host if index % 2 == 0 else guest
                board = f"B{index + 1}"
                page.locator(f'[data-board="{board}"]').click()
                page.wait_for_function(
                    "(id)=>BU.app.state.boards.find(b=>b.id===id).claim===BU.app.net.seat",
                    arg=board,
                )
                page.wait_for_timeout(200)
                check(
                    f"{board} owned workspace is interactive",
                    not page.evaluate("BU.app.observing"),
                )
                if index == 0:
                    page.keyboard.press("Escape")
                    page.get_by_role(
                        "button", name="Developer workbench", exact=True
                    ).click()
                    check(
                        "online host scratch authoring cannot replace the shared world",
                        page.get_by_role(
                            "button", name="Board / case authoring", exact=True
                        ).is_disabled(),
                    )
                    check(
                        "online host checkpoint and step tools are solo only",
                        page.get_by_role(
                            "button", name="Checkpoint current device", exact=True
                        ).is_disabled()
                        and page.get_by_role(
                            "button", name="Step one second", exact=True
                        ).is_disabled(),
                    )
                    check(
                        "online host retains authoritative live balance tools",
                        page.get_by_role(
                            "button", name="Live balance sliders", exact=True
                        ).is_enabled(),
                    )
                    page.get_by_role("button", name="Return", exact=True).click()
                    page.get_by_role("button", name="Resume", exact=True).click()
                for _ in range(35):
                    if page.evaluate(
                        "(id)=>BU.app.state.boards.find(b=>b.id===id).complete", board
                    ):
                        break
                    action(page, board)
                page.wait_for_function(
                    "(id)=>BU.app.state.boards.find(b=>b.id===id).complete", arg=board
                )
                page.wait_for_function('BU.app.screen==="evidence"')
                if index >= 1 and page.evaluate(
                    "BU.Sim.candidates(BU.app.state.evidence[0]).length===1"
                ):
                    break
            guest.wait_for_function(
                "BU.app.state.boards.filter(b=>b.complete).length>=2"
            )
            host.wait_for_function(
                "BU.Sim.candidates(BU.app.state.evidence[0]).length===1"
            )
            check(
                "both players repair through native mouse/tool UI",
                host.evaluate("BU.app.state.boards[0].complete")
                and guest.evaluate("BU.app.state.boards[1].complete"),
            )
            digit = host.evaluate("BU.Sim.candidates(BU.app.state.evidence[0])[0]")
            host.get_by_role("button", name="Enter disarm code", exact=True).click()
            for _ in range(digit):
                host.locator('[data-digit="0"]').click()
            host.get_by_role("button", name="Review this code", exact=True).click()
            host.get_by_role(
                "button", name=f"CONFIRM · SUBMIT {digit}", exact=True
            ).click()
            guest.wait_for_function('BU.app.screen==="vote"')
            guest.get_by_role("button", name="Accept code", exact=True).click()
            for page in [host, guest]:
                page.wait_for_function(
                    'BU.app.state.status==="won" && BU.app.screen==="results"'
                )
            check("shared UI vote resolves to both result screens", True)
            check(
                "ordinary network run stays unmodified",
                not host.evaluate("BU.app.state.modified")
                and not guest.evaluate("BU.app.state.modified"),
            )
            check(
                "exported online UI has no runtime errors",
                not errors,
                "; ".join(errors),
            )
            for page in [host, guest]:
                page.evaluate("BU.app.net.leave()")
            context.close()
            browser.close()
            browser = None
    except Exception as error:  # noqa: BLE001 - acceptance runner records the failure
        check("shipped UI co-op acceptance", False, str(error))
        if browser:
            for index, page in enumerate(browser.contexts[0].pages):
                try:
                    page.screenshot(
                        path=str(BASE / "evidence" / f"network-ui-failure-{index}.png")
                    )
                    (BASE / "evidence" / f"network-ui-failure-{index}.json").write_text(
                        json.dumps(
                            page.evaluate(
                                "({screen:BU.app.screen,net:BU.app.net.status,boardId:BU.app.boardId,tool:BU.app.tool,focus:BU.app.focusTarget,state:BU.app.state,body:document.body.innerText})"
                            ),
                            indent=2,
                        )
                    )
                except Exception:  # noqa: BLE001, S110 - best effort diagnostics only
                    pass
    finally:
        if browser:
            try:
                browser.close()
            except Error:
                pass  # Playwright context already stopped after a failed assertion.
        server.shutdown()
        server.server_close()
    (BASE / "evidence" / "net-bundle.json").write_text(
        json.dumps({"checks": checks, "errors": errors}, indent=2)
    )
    for c in checks:
        if not c["pass"]:
            print("FAIL:", c["name"], c["detail"])
    print(
        json.dumps(
            {"checks": checks, "failures": [c["name"] for c in checks if not c["pass"]]}
        )
    )
    return int(any(not c["pass"] for c in checks))


if __name__ == "__main__":
    raise SystemExit(run())
