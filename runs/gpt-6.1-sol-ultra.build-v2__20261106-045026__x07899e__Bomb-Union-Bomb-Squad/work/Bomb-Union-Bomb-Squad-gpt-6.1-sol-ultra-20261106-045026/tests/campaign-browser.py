#!/usr/bin/env python3
"""Ordinary mouse/keyboard acceptance, reading only public snapshots and target locations."""

import hashlib
import json
import pathlib
import re
import sys
import traceback

from playwright.sync_api import sync_playwright

BASE = pathlib.Path(__file__).resolve().parents[1]
PROJECT = json.loads((BASE / "project.json").read_text())
ARTIFACT = BASE.parent / (PROJECT["slug"] + ".html")
EVIDENCE = BASE / "evidence"
EVIDENCE.mkdir(exist_ok=True)
checks = 0
failures = []
actions = []
ARTIFACT_SHA256 = hashlib.sha256(ARTIFACT.read_bytes()).hexdigest()


def check(condition, message):
    global checks
    checks += 1
    if not condition:
        raise AssertionError(message)


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1920, "height": 1080})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(ARTIFACT.as_uri(), wait_until="load")
        page.wait_for_function(
            'globalThis.BU?.app?.state === null && BU.app.screen === "title"'
        )
        check(
            page.title().startswith("Bomb Union"),
            "Actual shipped page identity matches game.",
        )

        def state():
            return page.evaluate("BU.app.game.debug.snapshot()")

        def wait_for(expression, timeout=5000):
            try:
                page.wait_for_function(expression, timeout=timeout)
            except Exception:
                (EVIDENCE / "campaign-failure-state.json").write_text(
                    json.dumps(
                        {
                            "snapshot": state(),
                            "buttons": page.get_by_role("button").all_text_contents(),
                            "expression": expression,
                        },
                        indent=2,
                    )
                )
                page.screenshot(path=str(EVIDENCE / "campaign-failure.png"))
                raise

        def click_button(name):
            button = page.get_by_role("button", name=name, exact=True)
            button.wait_for(state="visible")
            button.click()
            actions.append({"action": "button", "name": name})

        def coordinates(target_id):
            info = page.evaluate(
                """id => {
              const a=BU.app, target=a.game.debug.targets().find(t=>t.id===id),rect=document.querySelector('#screen').getBoundingClientRect();
              if(!target)return null;
              return {id:target.id,x:rect.left+target.x/a.game.W*rect.width,y:rect.top+target.y/a.game.H*rect.height};
            }""",
                target_id,
            )
            check(info is not None, f"Visible native target {target_id} exists.")
            return info["x"], info["y"]

        def select_tool(name):
            keys = {"cut": "1", "grip": "2", "solder": "3", "extinguish": "4"}
            page.keyboard.press(keys[name])
            wait_for("BU.app.tool === " + json.dumps(name))

        def click_target(target_id):
            x, y = coordinates(target_id)
            page.mouse.move(x, y)
            page.mouse.click(x, y)
            page.wait_for_timeout(65)
            actions.append({"action": "target", "id": target_id})

        def held_action(target_id, tool):
            select_tool(tool)
            x, y = coordinates(target_id)
            page.mouse.move(x, y)
            page.mouse.down()
            wait_for("BU.app.state.boards.find(b=>b.id===BU.app.boardId)?.hold != null")
            wait_for(
                """(() => {const a=BU.app,b=a.state.boards.find(b=>b.id===a.boardId);return b?.hold && b.hold.duration >= (b.hold.tool==='solder'?a.state.tuning.solderMin+.12:a.state.tuning.extinguishTime+.08);})()"""
            )
            page.mouse.up()
            wait_for("BU.app.state.boards.every(b=>!b.hold)")
            actions.append({"action": "hold-release", "id": target_id, "tool": tool})

        def current_board():
            snapshot = state()
            return next(
                b for b in snapshot["state"]["boards"] if b["id"] == snapshot["boardId"]
            )

        def next_case_start(case_id, first=False):
            if first:
                click_button("Start your shift")
                click_button("TRAINING · First day, last wire")
            else:
                click_button(
                    "Begin first dispatch"
                    if case_id == "waterfront"
                    else "Next dispatch"
                )
            click_button("Open the device")
            wait_for(
                "BU.app.state?.caseId === "
                + json.dumps(case_id)
                + ' && BU.app.screen === "evidence"'
            )
            check(
                state()["state"]["caseId"] == case_id,
                f"{case_id} reached through campaign UI.",
            )

        def repair(board_id, wrong_cut=False, wrong_part=False):
            page.locator('[data-board="' + board_id + '"]').click()
            wait_for(
                'BU.app.screen === "work" && BU.app.boardId === ' + json.dumps(board_id)
            )
            b = current_board()
            check(b["claim"] == 0, "Solo board claim belongs to the local seat.")
            if board_id == "B1":
                page.screenshot(
                    path=str(
                        EVIDENCE
                        / ("campaign-" + state()["state"]["caseId"] + "-work.png")
                    )
                )
            if wrong_cut:
                decoy = next(c for c in b["components"] if c["id"] not in b["order"])
                select_tool("cut")
                click_target(decoy["id"] + ":0")
                check(
                    current_board()["recovery"] is not None,
                    "Ordinary wrong cut starts visible recovery.",
                )
                held_action(decoy["id"] + ":0", "solder")
                check(
                    current_board()["recovery"] is None,
                    "Ordinary solder hold restores recovery joint.",
                )
            if b["fire"]:
                held_action("fire", "extinguish")
                check(
                    not current_board()["fire"],
                    "Ordinary extinguisher clears controlled fire lesson.",
                )
            initial = b
            for component_id in initial["order"]:
                b = current_board()
                c = next(c for c in b["components"] if c["id"] == component_id)
                select_tool("cut")
                click_target(component_id + ":0")
                click_target(component_id + ":1")
                check(
                    all(
                        next(
                            c
                            for c in current_board()["components"]
                            if c["id"] == component_id
                        )["cuts"]
                    ),
                    "Both terminal cuts register on actual target.",
                )
                select_tool("grip")
                click_target(component_id + ":body")
                check(
                    next(
                        c
                        for c in current_board()["components"]
                        if c["id"] == component_id
                    )["removed"],
                    "Actual pliers action lifts cut component.",
                )
                b = current_board()
                if c["kind"] == "jumper":
                    match = next(
                        p for p in b["spares"] if p["available"] and p["jumper"]
                    )
                else:
                    ex = b["example"]
                    rule = (
                        "shape"
                        if ex["source"]["shape"] == ex["replacement"]["shape"]
                        else "color"
                    )
                    match = next(
                        p for p in b["spares"] if p["available"] and p[rule] == c[rule]
                    )
                    # Inspect the actual proposed spare, then read a PASS event. No hidden rule read.
                    x, y = coordinates("spare:" + match["id"])
                    page.mouse.move(x, y)
                    page.wait_for_timeout(60)
                    page.keyboard.press("e")
                    wait_for(
                        "BU.app.state.boards.find(b=>b.id===BU.app.boardId).ruleKnown"
                    )
                    check(
                        any(
                            e["type"] == "test" and e.get("pass") is True
                            for e in state()["state"]["events"]
                        ),
                        "Actual test socket reports passing diagnostic information.",
                    )
                    if wrong_part:
                        wrong = next(
                            p
                            for p in b["spares"]
                            if p["available"] and p[rule] != c[rule]
                        )
                        click_target("spare:" + wrong["id"])
                        click_target(component_id + ":body")
                        check(
                            any(
                                e["type"] == "wrong-part"
                                for e in state()["state"]["events"]
                            ),
                            "Wrong spare produces failed continuity through ordinary controls.",
                        )
                        click_target(component_id + ":body")
                        check(
                            next(
                                p
                                for p in current_board()["spares"]
                                if p["id"] == wrong["id"]
                            )["available"],
                            "Wrong spare returns to usable tray stock.",
                        )
                        wrong_part = False
                select_tool("grip")
                click_target("spare:" + match["id"])
                click_target(component_id + ":body")
                check(
                    next(
                        c
                        for c in current_board()["components"]
                        if c["id"] == component_id
                    )["part"]
                    == match["id"],
                    "Spare seats in the ordered socket.",
                )
                held_action(component_id + ":0", "solder")
                held_action(component_id + ":1", "solder")
            wait_for('BU.app.screen === "evidence"')
            s = state()["state"]
            check(
                next(b for b in s["boards"] if b["id"] == board_id)["complete"],
                "Completed repair publishes sector evidence.",
            )
            check(
                s["status"] == "active",
                "Ordinary repair leaves case live for inference.",
            )

        def submit():
            snap = state()["state"]
            glyphs = page.evaluate("BU.GLYPHS")
            inferred = []
            for cells in snap["evidence"]:
                options = [
                    d
                    for d, glyph in enumerate(glyphs)
                    if all(v == -1 or glyph[i] == v for i, v in enumerate(cells))
                ]
                check(
                    len(options) == 1,
                    "Player-visible lit and dark evidence uniquely identifies digit.",
                )
                inferred.append(options[0])
            click_button("Enter disarm code")
            for i, digit in enumerate(inferred):
                selector = '[data-digit="' + str(i) + '"]'
                current = int(page.locator(selector).inner_text())
                for _ in range((digit - current) % 10):
                    page.locator(selector).click()
            click_button("Review this code")
            check(
                state()["state"]["status"] == "active",
                "Digit selection alone never submits the code.",
            )
            click_button("CONFIRM · SUBMIT " + "".join(map(str, inferred)))
            wait_for('BU.app.screen === "results"')
            end = state()["state"]
            check(
                end["status"] == "won" and not end["modified"],
                "Ordinary campaign case disposes successfully without developer changes.",
            )
            check(
                end["result"]["score"] > 2000,
                "Scored result explains successful disposal.",
            )

        next_case_start("training", True)
        if "--smoke" in sys.argv:
            repair("B1")
            submit()
        else:
            for case_id in ["training", "waterfront", "relay", "central"]:
                if case_id != "training":
                    next_case_start(case_id)
                snap = state()["state"]
                for i, b in enumerate(snap["boards"]):
                    repair(
                        b["id"],
                        wrong_cut=case_id == "waterfront" and i == 0,
                        wrong_part=case_id == "relay" and i == 0,
                    )
                    if i == 0:
                        page.screenshot(
                            path=str(
                                EVIDENCE / ("campaign-" + case_id + "-evidence.png")
                            )
                        )
                submit()
                page.screenshot(
                    path=str(EVIDENCE / ("campaign-" + case_id + "-result.png"))
                )
            click_button("About & acknowledgments")
            check(
                page.get_by_role(
                    "heading", name=re.compile("^Source Information")
                ).is_visible(),
                "Campaign ending reaches complete credits.",
            )
        check(not errors, "Browser emitted no uncaught runtime errors: " + repr(errors))
        check(not state()["errors"], "Engine captured no draw/update errors.")
        browser.close()


try:
    run()
except Exception as error:  # noqa: BLE001 - test runner records failed acceptance evidence
    failures.append(str(error))
    failures.append(traceback.format_exc())
result = {
    "group": "campaign-browser",
    "checks": checks,
    "failures": failures,
    "actions": len(actions),
    "artifact": ARTIFACT.name,
    "sha256": ARTIFACT_SHA256,
}
(EVIDENCE / "campaign-browser.json").write_text(json.dumps(result, indent=2))
print(json.dumps(result))
sys.exit(1 if failures else 0)
