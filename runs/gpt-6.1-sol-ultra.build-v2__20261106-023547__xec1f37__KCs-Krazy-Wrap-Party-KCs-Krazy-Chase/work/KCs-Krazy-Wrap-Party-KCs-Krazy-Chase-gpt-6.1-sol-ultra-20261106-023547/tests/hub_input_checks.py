"""Focused real main-input checks inside a live, unmodified Hub round."""

import json
import urllib.parse


def run(browser, base, check, artifacts):
    context = browser.new_context(viewport={"width": 1280, "height": 860})
    context.add_init_script("""(() => {
      window.__padConnected=true;
      const originalAdd=window.addEventListener.bind(window);
      window.addEventListener=function(type,fn,options){
        if(type==='message' && /[?&]aihub=/.test(location.search)) {
          return originalAdd(type,function(event){
            if(event.data?.aihub===1 && event.data.type==='welcome') {
              setTimeout(()=>{window.__beforeWelcome=window.__garden?.debug.snapshot();fn.call(this,event)},800);
            } else fn.call(this,event);
          },options);
        }
        return originalAdd(type,fn,options);
      };

      navigator.getGamepads=()=>window.__padConnected?[{id:'Standard controller stand-in',index:0,connected:true,mapping:'standard',axes:[0,0,0,0],buttons:Array.from({length:17},()=>({pressed:false,touched:false,value:0})),timestamp:performance.now()}]:[];
    })();""")
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    query = urllib.parse.urlencode(
        {
            "game": "/game.html",
            "players": 2,
            "auto": 0,
            "latency": 0,
            "jitter": 0,
            "loss": 0,
            "limit": 60,
        }
    )
    page.goto(base + "/lib/hub/harness.html?" + query)
    page.wait_for_function(
        "Array.from(document.querySelectorAll('iframe')).length===2 && Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.GardenNet?.state)",
        timeout=30000,
    )
    page.locator("#release").click()
    page.wait_for_function(
        "Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.GardenNet?.started && f.contentWindow.AIHub.time()>=0)",
        timeout=15000,
    )
    frames = [f for f in page.frames if f.parent_frame]
    host = next(f for f in frames if f.evaluate("GardenNet.authority"))
    client = next(f for f in frames if not f.evaluate("GardenNet.authority"))
    initial = [f.evaluate("window.__beforeWelcome || null") for f in frames]
    check(
        "Hub initial delayed-welcome state never constructs a standalone menu",
        all(
            x is not None and x.get("menu") is None and x.get("shell") is None
            for x in initial
        ),
        json.dumps(initial),
    )
    before = host.evaluate("GardenNet.state.players.find(p=>p.id===2).x")
    layout = client.evaluate("window.__garden.debug.view()")
    box = client.locator("canvas").first.bounding_box()
    target = [5, 7]
    screen = client.evaluate(
        "({dpr:__garden.game.screen.dpr,OX:__garden.game.screen.OX,OY:__garden.game.screen.OY,S:__garden.game.screen.S})"
    )
    x = (
        box["x"]
        + (
            (layout["x"] + (target[0] + 0.5) * layout["cell"]) * screen["S"]
            + screen["OX"]
        )
        / screen["dpr"]
    )
    y = (
        box["y"]
        + (
            (layout["y"] + (target[1] + 0.5) * layout["cell"]) * screen["S"]
            + screen["OY"]
        )
        / screen["dpr"]
    )
    page.mouse.click(x, y)
    host.wait_for_function(
        "before => {const p=GardenNet.state.players.find(p=>p.id===2);return p.x>before && p.clickTarget?.[0]===5 && p.clickTarget?.[1]===7}",
        arg=before,
        timeout=5000,
    )
    pointer = host.evaluate(
        "(() => {const p=GardenNet.state.players.find(p=>p.id===2);return {x:p.x,target:p.clickTarget}})()"
    )
    check(
        "Hub real pointer click sets authoritative navigation target and moves the correct actor",
        pointer["x"] > before and pointer.get("target") == target,
        json.dumps(pointer),
    )
    client.evaluate("""() => {
      window.__directionObserved=false;
      window.__originalNetUpdate=GardenNet.update;
      GardenNet.update=(dt,command)=>{if(command?.dir?.[0]===-1)window.__directionObserved=true;return window.__originalNetUpdate(dt,command)};
      dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowLeft',code:'ArrowLeft',bubbles:true}));
    }""")
    client.wait_for_function("window.__directionObserved", timeout=5000)
    client.evaluate(
        "dispatchEvent(new KeyboardEvent('keyup',{key:'ArrowLeft',code:'ArrowLeft',bubbles:true}))"
    )
    host.wait_for_function(
        "GardenNet.state.players.find(p=>p.id===2).clickTarget === null", timeout=5000
    )
    client.evaluate("GardenNet.update=window.__originalNetUpdate")
    check(
        "Hub directional input cancels pointer navigation",
        host.evaluate("GardenNet.state.players.find(p=>p.id===2).clickTarget === null"),
    )
    tick = host.evaluate("GardenNet.state.tick")
    host.evaluate("""() => {
      dispatchEvent(new Event('blur'));
      Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});
      document.dispatchEvent(new Event('visibilitychange'));
      window.__padConnected=false;
      const event=new Event('gamepaddisconnected');Object.defineProperty(event,'gamepad',{value:{index:0,id:'Standard controller stand-in',connected:false}});dispatchEvent(event);
    }""")
    page.wait_for_timeout(650)
    focused = host.evaluate(
        "({tick:GardenNet.state.tick,paused:__garden.game.paused,active:GardenNet.active})"
    )
    check(
        "Hub authority keeps ticking through blur/visibility/controller-loss stand-ins",
        focused["tick"] > tick + 10 and not focused["paused"] and focused["active"],
        json.dumps(focused),
    )
    host.evaluate(
        "delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));dispatchEvent(new Event('focus'))"
    )
    tick = host.evaluate("GardenNet.state.tick")
    host.evaluate(
        "dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}))"
    )
    page.wait_for_timeout(60)
    host.evaluate(
        "dispatchEvent(new KeyboardEvent('keyup',{key:'Escape',code:'Escape',bubbles:true}))"
    )
    page.wait_for_timeout(500)
    settings = host.evaluate(
        "({tick:GardenNet.state.tick,paused:__garden.game.paused,shell:__garden.game.shell?.screen})"
    )
    check(
        "Hub local Settings opens without pausing authority",
        settings["tick"] > tick + 10
        and not settings["paused"]
        and settings["shell"] == "settings",
        json.dumps(settings),
    )
    host.evaluate(
        "dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}))"
    )
    page.wait_for_timeout(70)
    host.evaluate(
        "dispatchEvent(new KeyboardEvent('keyup',{key:'Escape',code:'Escape',bubbles:true}))"
    )
    page.locator("#timeup").click()
    page.wait_for_function(
        "Array.from(document.querySelectorAll('iframe')).every(f=>f.contentWindow.GardenNet?.ended)",
        timeout=5000,
    )
    check(
        "focused Hub input round ends through Hub ownership",
        all(f.evaluate("GardenNet.ended") for f in frames),
    )
    ended_before = [
        f.evaluate("({tick:GardenNet.state.tick,sent:GardenNet.stats.sent})")
        for f in frames
    ]
    for frame in frames:
        frame.evaluate("""() => {
          for(const [key,code] of [[' ','Space'],['Escape','Escape']]) {
            dispatchEvent(new KeyboardEvent('keydown',{key,code,bubbles:true}));
            dispatchEvent(new KeyboardEvent('keyup',{key,code,bubbles:true}));
          }
          const canvas=__garden.game.screen.canvas,rc=canvas.getBoundingClientRect();
          const options={bubbles:true,pointerType:'mouse',pointerId:7,button:0,clientX:rc.left+rc.width/2,clientY:rc.top+rc.height/2};
          canvas.dispatchEvent(new PointerEvent('pointerdown',options));
          dispatchEvent(new PointerEvent('pointerup',options));
          dispatchEvent(new Event('touchstart',{bubbles:true}));
        }""")
    page.wait_for_timeout(300)
    ended_after = [
        f.evaluate(
            "({tick:GardenNet.state.tick,sent:GardenNet.stats.sent,audio:__garden.audio.debug(),shell:__garden.game.shell?.screen})"
        )
        for f in frames
    ]
    check(
        "Hub physical input after end cannot restart simulation or sends",
        all(
            before["tick"] == after["tick"] and before["sent"] == after["sent"]
            for before, after in zip(ended_before, ended_after, strict=True)
        ),
        json.dumps(ended_after),
    )
    check(
        "Hub physical input after end leaves every audio bus stopped/muted and song silent",
        all(
            x["audio"]["stopped"]
            and x["audio"]["muted"]
            and not x["audio"]["songPlaying"]
            for x in ended_after
        ),
        json.dumps(ended_after),
    )
    check(
        "Hub physical input after end cannot reopen local menus",
        all(x["shell"] is None for x in ended_after),
        json.dumps(ended_after),
    )
    check("focused Hub input round has no page errors", not errors, "\n".join(errors))
    (artifacts / "hub-input-evidence.json").write_text(
        json.dumps(
            {
                "initialBeforeWelcome": initial,
                "afterEndInput": ended_after,
                "pointer": pointer,
                "focus": focused,
                "settings": settings,
                "errors": errors,
            },
            indent=2,
        )
    )
    context.close()
