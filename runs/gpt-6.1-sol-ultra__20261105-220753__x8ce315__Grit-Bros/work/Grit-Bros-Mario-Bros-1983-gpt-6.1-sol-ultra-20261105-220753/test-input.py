from pathlib import Path

from playwright.sync_api import sync_playwright

checks = 0
failures = []


def check(condition, message):
    global checks
    checks += 1
    if not condition:
        failures.append(message)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
    context = browser.new_context(
        has_touch=True, is_mobile=True, viewport={"width": 900, "height": 600}
    )
    page = context.new_page()
    page.set_content(
        '<meta name="viewport" content="width=device-width,initial-scale=1"><div id="touch-controls"><button id="touch-menu">Menu</button><button id="touch-thump">Thump</button></div><input id="range" type="range" min="0" max="1" step="0.1" value="0.5"><input id="text" type="text">'
    )
    page.evaluate(
        """() => { window.padList=[]; Object.defineProperty(navigator,'getGamepads',{value:()=>window.padList}); window.activity=[]; window.menu=[]; window.pauses=0; window.joins=0; }"""
    )
    source = (
        Path(__file__)
        .with_name("input.js")
        .read_text()
        .replace("export class Input", "class Input")
    )
    page.add_script_tag(
        content=source
        + "\nwindow.input = new Input({onActivity:t=>activity.push(t),onMenu:a=>menu.push(a),onPause:()=>pauses++,onJoin:()=>joins++});"
    )
    page.evaluate('() => input.setMode("play")')
    page.keyboard.down("d")
    page.keyboard.down("Space")
    page.keyboard.down("e")
    state = page.evaluate("() => { input.update(); return input.getPlayers(); }")
    check(
        state[0]["x"] == 1 and state[0]["jump"] and state[0]["action"],
        "P1 keyboard movement/jump/action failed",
    )
    check(
        state[0]["jumpPressed"] and state[0]["actionPressed"],
        "Keyboard press edges failed",
    )
    state = page.evaluate("() => { input.update(); return input.getPlayers(); }")
    check(
        not state[0]["jumpPressed"] and not state[0]["actionPressed"],
        "Held keyboard incorrectly repeats press edges",
    )
    page.keyboard.up("d")
    page.keyboard.up("Space")
    page.keyboard.up("e")
    check(
        page.evaluate("() => { input.update(); return input.getPlayers()[0].x; }") == 0,
        "Keyboard release did not clear movement",
    )
    page.evaluate("() => input.setLocalCoop(true)")
    page.keyboard.down("j")
    page.keyboard.down("i")
    page.keyboard.down("o")
    state = page.evaluate("() => { input.update(); return input.getPlayers()[1]; }")
    check(
        state["x"] == -1 and state["jump"] and state["action"],
        "P2 keyboard controls failed",
    )
    page.keyboard.up("j")
    page.keyboard.up("i")
    page.keyboard.up("o")
    page.keyboard.press("Escape")
    check(page.evaluate("() => pauses") == 1, "Keyboard pause failed")
    page.evaluate('() => { input.setMode("menu"); menu.length=0; }')
    page.keyboard.press("ArrowDown")
    page.keyboard.press("Enter")
    page.keyboard.press("Escape")
    check(
        page.evaluate("() => menu") == ["down", "confirm", "back"],
        "Keyboard menu controls failed",
    )
    page.evaluate('() => { menu.length=0; document.getElementById("range").focus(); }')
    page.keyboard.press("ArrowDown")
    page.keyboard.press("ArrowUp")
    page.keyboard.press("ArrowRight")
    check(
        page.evaluate("() => menu") == ["down", "up", "right"],
        "Focused range slider trapped keyboard navigation",
    )
    check(
        page.locator("#range").input_value() == "0.5",
        "Slider received duplicate native arrow adjustment",
    )
    page.locator("#text").focus()
    page.keyboard.type("room")
    check(
        page.locator("#text").input_value() == "room",
        "Text inputs lost native keyboard typing",
    )
    page.locator("#text").evaluate("(el)=>el.blur()")
    page.evaluate(
        """() => { window.makePad=(index=0)=>({index,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))}); padList=[makePad()]; input.setMode('play'); input.update(); padList[0].axes[0]=0.8; padList[0].buttons[0]={pressed:true,value:1}; padList[0].buttons[2]={pressed:true,value:1}; input.update(); }"""
    )
    state = page.evaluate("() => input.getPlayers()[0]")
    check(
        state["x"] > 0.7 and state["jump"] and state["action"],
        "Standard gamepad controls failed",
    )
    check(
        page.evaluate("() => input.lastType") == "gamepad",
        "Gamepad did not change prompts on input",
    )
    page.evaluate('() => input._activity("mouse")')
    page.evaluate("() => input.update()")
    check(
        page.evaluate("() => input.lastType") == "mouse",
        "Held gamepad stole mouse prompts",
    )
    page.evaluate('() => { input.setGlyphStyle("xbox"); input.lastType="gamepad"; }')
    check(
        page.evaluate('() => input.getPrompt("jump")') == "A",
        "Xbox glyph option failed",
    )
    page.evaluate('() => input.setGlyphStyle("ps")')
    check(
        page.evaluate('() => input.getPrompt("action")') == "□",
        "PlayStation glyph option failed",
    )
    page.evaluate(
        "() => { padList[0].buttons[9]={pressed:true,value:1}; input.update(); input.update(); }"
    )
    check(
        page.evaluate("() => pauses") == 2, "Gamepad pause did not respect press edges"
    )
    page.evaluate(
        "() => { input.setLocalCoop(false); padList.push(makePad(1)); input.update(); padList[1].buttons[0]={pressed:true,value:1}; input.update(); input.update(); }"
    )
    check(
        page.evaluate("() => joins") == 1,
        "Second gamepad join did not respect press edges",
    )
    page.evaluate(
        '() => { input.setMode("menu"); menu.length=0; padList=[makePad()]; input.update(); padList[0].buttons[13]={pressed:true,value:1}; input.update(); for(let i=0;i<15;i++)input.update(); }'
    )
    check(
        page.evaluate("() => menu") == ["down"],
        "Held gamepad menu navigation repeated too quickly",
    )
    page.evaluate(
        """() => { padList=[]; input.clear(); input.setMode('play'); window.touch=(type,id,x,y,target=document.body)=>target.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true})); touch('pointerdown',1,100,400); touch('pointermove',1,170,400); touch('pointerdown',2,750,400); input.update(); }"""
    )
    state = page.evaluate("() => input.getPlayers()[0]")
    check(state["x"] == 1 and state["jump"], "Multitouch movement and jump failed")
    check(
        page.evaluate("() => input.lastType") == "touch", "Touch did not change prompts"
    )
    page.evaluate(
        '() => { touch("pointerup",1,170,400); touch("pointerup",2,750,400); touch("pointerdown",3,30,20,document.getElementById("touch-thump")); input.update(); }'
    )
    state = page.evaluate("() => input.getPlayers()[0]")
    check(
        state["action"] and not state["jump"] and state["x"] == 0,
        "Contextual touch thump or touch release failed",
    )
    page.evaluate(
        '() => { touch("pointerup",3,30,20); input.clear(); input.update(); }'
    )
    check(
        page.evaluate("() => input.getPlayers().every(p=>!p.x&&!p.jump&&!p.action)")
        == True,
        "Clearing input left a held control",
    )
    page.evaluate(
        """() => { touch('pointerdown',4,30,20,document.getElementById('touch-thump')); touch('pointerup',4,30,20); touch('pointerdown',5,750,400); touch('pointerup',5,750,400); input.update(); }"""
    )
    check(
        page.evaluate(
            "() => input.getPlayers()[0].action && input.getPlayers()[0].jump"
        ),
        "Fast touch taps were lost between input samples",
    )
    check(
        page.evaluate(
            "() => { input.update(); return !input.getPlayers()[0].action && !input.getPlayers()[0].jump; }"
        ),
        "Fast touch tap latch persisted after one sample",
    )
    page.keyboard.press("Space")
    page.keyboard.press("e")
    check(
        page.evaluate(
            "() => { input.update(); return input.getPlayers()[0].action && input.getPlayers()[0].jump; }"
        ),
        "Fast keyboard presses were lost between input samples",
    )
    page.evaluate("() => input.dispose()")
    context.close()
    browser.close()

for failure in failures:
    print("FAIL: " + failure)
print(f"{checks} input checks, {len(failures)} failures")
raise SystemExit(bool(failures))
