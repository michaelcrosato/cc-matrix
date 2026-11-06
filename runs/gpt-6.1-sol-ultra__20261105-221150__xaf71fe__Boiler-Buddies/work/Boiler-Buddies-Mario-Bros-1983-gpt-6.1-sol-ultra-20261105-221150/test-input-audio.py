"""GPU-free module checks. Import run() or execute this file directly."""

from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent


def run():
    """Return (number of assertions, list of failure descriptions)."""
    failures = []
    count = 0

    def check(label, condition, detail=None):
        nonlocal count
        count += 1
        if not condition:
            failures.append(
                f"FAIL {label}" + (f": {detail}" if detail is not None else "")
            )

    def signal_good(value):
        return (
            value.get("finite") is True
            and 0.005 < value.get("peak", 0) < 1
            and 0.0003 < value.get("rms", 0) < 0.3
        )

    try:
        audio_source = (
            (ROOT / "audio.js")
            .read_text()
            .replace("export class AudioEngine", "class AudioEngine")
        )
        input_source = (
            (ROOT / "input.js")
            .read_text()
            .replace("export class InputManager", "class InputManager")
        )
        source = audio_source + input_source
        source += "\nwindow.AudioEngine=AudioEngine;window.InputManager=InputManager;"
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True)
            try:
                page = browser.new_page(
                    viewport={"width": 1000, "height": 700}, has_touch=True
                )
                page.set_content(
                    '<canvas width="1000" height="600" style="touch-action:none"></canvas>'
                    "<button data-ui>UI</button>"
                )
                page.add_script_tag(content=source)
                audio = page.evaluate(
                    """async () => {
                        const lazy = new AudioEngine();
                        const standard = await lazy.renderTest(2);
                        const effects = {};
                        const names = ['jump','bump','flip','kick','coin','hurt','pow',
                            'clear','win','lose','ui','freeze','spawn'];
                        const stats = (buffer) => {
                            let peak=0,energy=0,finite=true;
                            for (const value of buffer.getChannelData(0)) {
                                peak=Math.max(peak,Math.abs(value));
                                energy+=value*value;
                                finite=finite&&Number.isFinite(value);
                            }
                            return {peak,rms:Math.sqrt(energy/buffer.length),finite};
                        };
                        for (const name of names) {
                            const context=new OfflineAudioContext(2,44100*2,44100);
                            const engine=new AudioEngine({context,autoSchedule:false});
                            engine.play(name,.02);
                            effects[name]=stats(await context.startRendering());
                        }
                        const context=new OfflineAudioContext(2,44100,44100);
                        const engine=new AudioEngine({context,autoSchedule:false});
                        engine.voice(1983,.02);
                        const voice=stats(await context.startRendering());
                        return {lazy:lazy.context===null,defaultVolume:lazy.musicVolume,
                            standard,effects,voice};
                    }"""
                )
                check("audio context waits for gesture", audio["lazy"])
                check("music defaults to ten percent", audio["defaultVolume"] == 0.1)
                check(
                    "offline original score produces finite unclipped sound",
                    audio["standard"]["supported"]
                    and audio["standard"]["samples"] == 88200
                    and signal_good(audio["standard"]),
                    audio["standard"],
                )
                check(
                    "gibberish voice produces sound",
                    signal_good(audio["voice"]),
                    audio["voice"],
                )
                for name, waveform in audio["effects"].items():
                    check(
                        f"sound {name} finite audible unclipped",
                        signal_good(waveform),
                        waveform,
                    )

                page.evaluate(
                    """() => {
                        window.actions=[];window.activity=[];window.pauses=0;window.pad=null;
                        Object.defineProperty(navigator,'getGamepads',{value:()=>[window.pad]});
                        window.i=new InputManager({onActivity:type=>activity.push(type),
                            onMenu:a=>actions.push(a),onPause:()=>pauses++});
                        i.poll(0,false);
                    }"""
                )
                for key in ["a", "Space", "x", "Shift"]:
                    page.keyboard.down(key)
                values = page.evaluate("i.poll(.016,false)")
                check(
                    "player one keyboard movement and actions",
                    values[0]
                    == {
                        "x": -1,
                        "jump": True,
                        "kick": True,
                        "drop": False,
                        "pulse": True,
                    },
                    values[0],
                )
                check(
                    "held keyboard actions remain active across polls",
                    page.evaluate("i.poll(.016,false)[0]") == values[0],
                )
                for key in ["a", "Space", "x", "Shift"]:
                    page.keyboard.up(key)
                for key in ["h", "t", "r", "y", "g"]:
                    page.keyboard.down(key)
                values = page.evaluate("i.poll(.016,false)")
                check(
                    "player two keyboard movement and actions",
                    values[1]
                    == {
                        "x": 1,
                        "jump": True,
                        "kick": True,
                        "drop": True,
                        "pulse": True,
                    },
                    values[1],
                )
                check(
                    "player two controls do not activate player one",
                    values[0]
                    == {
                        "x": 0,
                        "jump": False,
                        "kick": False,
                        "drop": False,
                        "pulse": False,
                    },
                    values[0],
                )
                for key in ["h", "t", "r", "y", "g"]:
                    page.keyboard.up(key)
                rapid = page.evaluate(
                    """() => {
                        i.clear();i.poll(0,false);
                        const tap=code=>{
                            dispatchEvent(new KeyboardEvent('keydown',{code,bubbles:true}));
                            dispatchEvent(new KeyboardEvent('keyup',{code,bubbles:true}));
                        };
                        ['Space','KeyX','ShiftLeft','ArrowDown','KeyT','KeyR','KeyY','KeyG'].forEach(tap);
                        return {first:i.poll(.016,false),second:i.poll(.016,false)};
                    }"""
                )
                for seat in [0, 1]:
                    check(
                        f"player {seat + 1} rapid action taps survive between frames",
                        rapid["first"][seat]
                        == {
                            "x": 0,
                            "jump": True,
                            "kick": True,
                            "drop": True,
                            "pulse": True,
                        },
                        rapid["first"][seat],
                    )
                    check(
                        f"player {seat + 1} rapid action taps are consumed exactly once",
                        rapid["second"][seat]
                        == {
                            "x": 0,
                            "jump": False,
                            "kick": False,
                            "drop": False,
                            "pulse": False,
                        },
                        rapid["second"][seat],
                    )
                cleared = page.evaluate(
                    """() => {
                        dispatchEvent(new KeyboardEvent('keydown',{code:'ShiftLeft',bubbles:true}));
                        dispatchEvent(new KeyboardEvent('keyup',{code:'ShiftLeft',bubbles:true}));
                        i.clear();return i.poll(.016,false)[0].pulse;
                    }"""
                )
                check("clearing input discards pending keyboard actions", not cleared)
                menu_confirm = page.evaluate(
                    """() => {
                        i.clear();i.poll(.016,true);
                        dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}));
                        const held=i.poll(.016,false)[0].jump;
                        dispatchEvent(new KeyboardEvent('keyup',{code:'Space',bubbles:true}));
                        dispatchEvent(new KeyboardEvent('keydown',{code:'Space',bubbles:true}));
                        const fresh=i.poll(.016,false)[0].jump;
                        dispatchEvent(new KeyboardEvent('keyup',{code:'Space',bubbles:true}));
                        actions=[];
                        return {held,fresh};
                    }"""
                )
                check(
                    "Space menu confirmation does not leak into jumping",
                    not menu_confirm["held"],
                )
                check(
                    "a fresh Space press after menu confirmation jumps",
                    menu_confirm["fresh"],
                )
                page.evaluate("i.clear()")
                page.keyboard.press("Escape")
                check("Escape pauses gameplay once", page.evaluate("pauses") == 1)
                page.evaluate("i.poll(.016,true)")
                for key in ["ArrowDown", "Enter", "Escape"]:
                    page.keyboard.press(key)
                check(
                    "keyboard menu navigation confirmation and back",
                    page.evaluate("actions") == ["down", "confirm", "back"],
                    page.evaluate("actions"),
                )
                page.evaluate(
                    """() => {
                        pad={index:0,connected:true,axes:[.8,0],
                            buttons:Array.from({length:17},(_,j)=>({
                                pressed:j===0||j===2,value:j===0||j===2?1:0}))};
                        i.clear();activity=[];i.poll(.016,false);
                    }"""
                )
                values = page.evaluate("i.poll(.016,false)")
                check(
                    "standard gamepad axes jump and kick",
                    values[0]["x"] > 0.7 and values[0]["jump"] and values[0]["kick"],
                    values[0],
                )
                check(
                    "gamepad input updates device",
                    page.evaluate("activity") == ["gamepad"],
                )
                page.evaluate("i.poll(.1,false);i.poll(.1,false);i.poll(.1,false)")
                check(
                    "held gamepad emits one device transition",
                    page.evaluate("activity") == ["gamepad"],
                )
                check("held controls keep menus active", page.evaluate("i.active"))
                page.evaluate(
                    "pad.axes=[.1,0];pad.buttons.forEach(x=>{x.pressed=false;x.value=0});i.poll(.016,false)"
                )
                check(
                    "gamepad deadzone removes drift",
                    page.evaluate("i.poll(.016,false)[0].x") == 0,
                )
                check(
                    "released controls allow idle attract", page.evaluate("!i.active")
                )
                page.evaluate("activity=[];pad.axes=[0,0,.8,0];i.poll(.016,true)")
                check(
                    "right stick counts as any input",
                    page.evaluate("i.active && activity.includes('gamepad')"),
                )
                page.evaluate("pad.axes=[0,0,0,0];i.poll(.016,true)")
                page.evaluate(
                    """() => {
                        actions=[];pad.axes=[0,0];pad.buttons[13].pressed=true;
                        pad.buttons[13].value=1;i.poll(.016,true);
                        i.poll(.1,true);i.poll(.1,true);i.poll(.1,true);i.poll(.1,true);
                    }"""
                )
                check(
                    "controller menu direction repeats with delay",
                    page.evaluate("actions") == ["down", "down"],
                    page.evaluate("actions"),
                )
                page.evaluate(
                    """() => {
                        pad=null;i.clear();i.poll(.016,false);
                        const c=document.querySelector('canvas');
                        c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,
                            pointerType:'touch',pointerId:1,clientX:100,clientY:300}));
                        c.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,
                            pointerType:'touch',pointerId:1,clientX:165,clientY:300}));
                    }"""
                )
                check(
                    "invisible touch stick moves",
                    page.evaluate("i.poll(.016,false)[0].x") == 1,
                )
                page.evaluate(
                    """() => {
                        const c=document.querySelector('canvas');
                        c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,
                            pointerType:'touch',pointerId:1,clientX:165,clientY:300}));
                        c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,
                            pointerType:'touch',pointerId:2,clientX:800,clientY:300}));
                        c.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,
                            pointerType:'touch',pointerId:2,clientX:800,clientY:300}));
                    }"""
                )
                values = page.evaluate("i.poll(.016,false)")
                check(
                    "touch release stops movement and right tap jumps",
                    values[0]["jump"] and values[0]["x"] == 0,
                    values[0],
                )
                page.evaluate(
                    """() => {
                        const c=document.querySelector('canvas');
                        c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,
                            pointerType:'touch',pointerId:3,clientX:800,clientY:300}));
                        c.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,
                            pointerType:'touch',pointerId:4,clientX:850,clientY:300}));
                    }"""
                )
                check(
                    "two-finger touch activates pulse",
                    page.evaluate("i.poll(.016,false)[0].pulse"),
                )
                page.evaluate(
                    """() => {
                        i.clear();const b=document.querySelector('button');
                        b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,
                            pointerType:'touch',pointerId:5,clientX:100,clientY:620}));
                    }"""
                )
                check(
                    "UI taps do not create game movement",
                    page.evaluate("i.leftTouch===null&&i.rightTouches.size===0"),
                )
                page.evaluate("i.dispose()")
                check(
                    "disposing input removes transient touch marker",
                    page.evaluate(
                        'document.querySelectorAll("[aria-hidden=true]").length'
                    )
                    == 0,
                )
            finally:
                browser.close()
    except Exception as error:  # noqa: BLE001 - aggregate module test failures
        check(
            "module test harness completes", False, f"{type(error).__name__}: {error}"
        )
    return count, failures


if __name__ == "__main__":
    test_count, test_failures = run()
    for failure in test_failures:
        print(failure)
    print(f"{test_count} checks, {len(test_failures)} failures")
    raise SystemExit(bool(test_failures))
