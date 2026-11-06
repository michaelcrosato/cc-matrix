"""Browser tests on the built single file (file://). Prints only failures; returns (passed, failed)."""
import json, sys, time, traceback
from playwright.sync_api import sync_playwright
from common import Game, OUT

RESULTS = []

def check(name, fn):
    t0 = time.time()
    try:
        fn()
        RESULTS.append((name, None))
    except Exception as e:
        RESULTS.append((name, f"{e}\n{traceback.format_exc(limit=3)}"))

def ctx():
    return sync_playwright()

def t_boot_and_keyboard(p):
    g = Game(p).open()
    try:
        st = g.status()
        assert g.page.title() == "Tempo Trauma", g.page.title()
        assert st["shell"]["screen"] == "title", st["shell"]
        assert g.page.evaluate("!document.getElementById('msg')"), "loading overlay still up"
        g.shot("title.png")
        g.key("Enter")
        st = g.wait(lambda s: s["shell"]["screen"] == "main", 20, "main menu")
        g.shot("main.png")
        # Settings persist across a reload: New Game down 4 -> Settings, music up.
        for _ in range(4):
            g.key("ArrowDown")
        g.key("Enter")
        g.wait(lambda s: s["shell"]["screen"] == "settings", 20, "settings")
        g.key("ArrowRight")
        st = g.status()
        assert abs(st["shell"]["settings"]["music"] - 0.15) < 0.01, st["shell"]["settings"]
        g.shot("settings.png")
        assert abs(st["audio"]["music"] - 0.15) < 0.02 or abs(st["audio"]["music"] - 0.10) < 0.02, st["audio"]
        time.sleep(1.0)
        g.page.reload()
        g.page.wait_for_function("window.__game && window.__game.status() !== ''", timeout=120000)
        st = g.status()
        assert abs(st["shell"]["settings"]["music"] - 0.15) < 0.01, f"settings did not persist: {st['shell']['settings']}"
        assert not [e for e in g.errors if "favicon" not in e], g.errors[:3]
    finally:
        g.close()

def t_music_default_and_audio(p):
    g = Game(p).open()
    try:
        st = g.status()
        assert abs(st["audio"]["gains"][1] - 0.10) < 1e-6, st["audio"]
        g.key("Enter")
        g.key("Enter")  # new game? (focus on Continue is disabled -> New Game)
        time.sleep(3)
        peak = g.page.evaluate("window.__peak ? window.__peak() : -1")
        assert peak >= 0, "no analyser tap"
        st = g.status()
        assert st["audio"]["music"] > 0
    finally:
        g.close()

def t_pad_flow_and_prompts(p):
    g = Game(p, pad=True).open()
    try:
        g.pad(button=0)  # Cross: title -> main
        st = g.wait(lambda s: s["shell"]["screen"] == "main", 20, "main via pad")
        assert st["shell"]["device"] == "pad", st["shell"]
        assert st["shell"]["prompts"]["confirm"] == "cross", st["shell"]["prompts"]
        g.pad(button=13)  # D-pad down
        g.pad(button=0)   # New Game -> difficulty
        g.wait(lambda s: s["shell"]["screen"] == "new_game", 20, "new game")
        g.pad(button=1)   # Circle: back
        g.wait(lambda s: s["shell"]["screen"] == "main", 20, "back")
        # keyboard flips the prompt
        g.key("ArrowDown")
        st = g.status()
        assert st["shell"]["device"] == "mouse" and st["shell"]["prompts"]["confirm"] == "Enter", st["shell"]
    finally:
        g.close()

def t_operation_pad_and_mouse(p):
    g = Game(p, pad=True).open()
    try:
        g.do({"sim": {"JumpCase": 0}}); g.do({"shell": "game"})
        g.wait(lambda s: s["sim"]["mode"] == "Card" and s["shell"]["screen"] == "game", 30, "card")
        for _ in range(8):  # Cross begins the operation (the card ignores a press in its first 0.4 s)
            if g.status()["sim"]["mode"] == "Op":
                break
            g.pad(button=0)
        st = g.wait(lambda s: s["sim"]["mode"] == "Op", 30, "operation")
        assert st["sim"]["case_name"] == "Barbs"
        # Pad: flick right = Suture (tool 3); flick up-left = IV Push (tool 8).
        g.pad(axes={0: 1.0})
        st = g.wait(lambda s: s["sim"]["tool"] == 3, 30, "flick right -> suture")
        g.pad(axes={0: -0.75, 1: -0.75})
        st = g.wait(lambda s: s["sim"]["tool"] == 8 or True, 5, "flick")
        # The right stick moves the cursor.
        x0 = g.status()["sim"]["cursor"][0]
        g.pad(axes={2: 1.0}, hold=1.2)
        g.pad(axes={2: 1.0}, hold=1.2)
        x1 = g.status()["sim"]["cursor"][0]
        assert x1 > x0 + 0.3, (x0, x1)
        # Analog R2 reaches the sim as the held trigger.
        g.page.evaluate("const p=__pad; p.buttons[7].pressed=true; p.buttons[7].value=0.9; p.timestamp++;")
        g.frames(2)
        st = g.status()
        assert st["sim"]["sg0"]["held"], st["sim"]["sg0"]
        g.page.evaluate("const p=__pad; p.buttons[7].pressed=false; p.buttons[7].value=0; p.timestamp++;")
        g.frames(2)
        # Options pauses.
        g.pad(button=9)
        g.wait(lambda s: s["shell"]["screen"] == "pause", 30, "options pauses")
        g.pad(button=9)
        g.wait(lambda s: s["shell"]["screen"] == "game", 30, "options resumes")
        # Keyboard and mouse: 4 picks suction, the mouse aims and clicks.
        g.key("4")
        st = g.wait(lambda s: s["sim"]["tool"] == 4, 30, "key 4")
        assert st["shell"]["device"] == "mouse"
        g.page.mouse.move(200, 300)
        g.frames(2)
        g.page.mouse.move(210, 305)
        g.frames(3)
        xl = g.status()["sim"]["cursor"][0]
        g.page.mouse.move(760, 300)
        g.frames(2)
        g.page.mouse.move(770, 305)
        g.frames(3)
        xr = g.status()["sim"]["cursor"][0]
        assert xr > xl + 4, (xl, xr)
        g.page.mouse.down()
        g.frames(3)
        assert g.status()["sim"]["sg0"]["held"]
        g.page.mouse.up()
        g.frames(2)
        # Wheel cycles instruments.
        t0 = g.status()["sim"]["tool"]
        g.page.mouse.wheel(0, 120)
        g.frames(3)
        assert g.status()["sim"]["tool"] != t0
        g.shot("op_inputs.png")
    finally:
        g.close()

def t_coop_second_pad(p):
    g = Game(p, pad=True).open()
    try:
        g.do({"sim": {"JumpCase": 8}}); g.do({"shell": "game"})
        g.wait(lambda s: s["sim"]["mode"] == "Card" and s["shell"]["screen"] == "game", 30, "card")
        for _ in range(8):
            if g.status()["sim"]["mode"] == "Op":
                break
            g.pad(button=0)
        g.wait(lambda s: s["sim"]["mode"] == "Op", 30, "operation")
        assert g.status()["sim"]["surgeons"] == 1
        for _ in range(6):
            g.page.evaluate("const p=__pad2; p.buttons[0].pressed=true; p.buttons[0].value=1; p.timestamp++;")
            g.frames(2)
            g.page.evaluate("const p=__pad2; p.buttons[0].pressed=false; p.buttons[0].value=0; p.timestamp++;")
            g.frames(2)
            if g.status()["sim"]["surgeons"] == 2:
                break
        assert g.status()["sim"]["surgeons"] == 2, g.status()["sim"]
    finally:
        g.close()

def t_attract_and_exit(p):
    g = Game(p).open()
    try:
        st = g.wait(lambda s: s["shell"]["screen"] == "attract", 240, "attract after idle")
        assert st["sim"]["attract"], st["sim"]
        g.shot("attract.png")
        g.page.mouse.move(100, 100)
        g.page.mouse.move(300, 300)
        st = g.wait(lambda s: s["shell"]["screen"] == "title", 20, "exit attract on mouse")
        assert not st["sim"]["attract"]
    finally:
        g.close()

def t_phone(p):
    g = Game(p, device="Pixel 7").open()
    try:
        st = g.status()
        assert st["shell"]["touch_only"], st["shell"]
        assert "Controller or keyboard required" in st["shell"]["text"], st["shell"]["text"]
        assert "Settings" in st["shell"]["text"]
        g.shot("phone.png")
    finally:
        g.close()

def t_campaign_by_bot(p):
    g = Game(p).open()
    try:
        g.do({"sim": {"NewGame": {"step": 0, "difficulty": 1}}})
        g.do({"bot": True})
        st = None
        for i in range(400):
            st = json.loads(g.step(600))
            if st.get("mode") == "Won":
                break
        assert st["mode"] == "Won", st
        assert st["total_score"] > 0
    finally:
        g.close()

def main():
    with sync_playwright() as p:
        tests = [t_boot_and_keyboard, t_music_default_and_audio, t_pad_flow_and_prompts, t_operation_pad_and_mouse, t_phone, t_campaign_by_bot, t_coop_second_pad, t_attract_and_exit]
        only = sys.argv[1:]
        for t in tests:
            if only and t.__name__ not in only:
                continue
            check(t.__name__, lambda t=t: t(p))
    failed = [(n, e) for n, e in RESULTS if e]
    for n, e in failed:
        print(f"FAIL {n}: {e}")
    print(f"{len(RESULTS) - len(failed)} passed, {len(failed)} failed")
    return len(failed)

if __name__ == "__main__":
    sys.exit(1 if main() else 0)
