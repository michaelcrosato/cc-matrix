from playwright.sync_api import sync_playwright
INIT = """(() => { window.__p=[[0,0,0,0],[0,0,0,0]]; window.__b=[{},{}]; const mk=i=>({id:'pad'+i,index:i,connected:true,mapping:'standard',timestamp:performance.now(),buttons:Array.from({length:17},(_,k)=>({pressed:!!window.__b[i][k],value:window.__b[i][k]?1:0})),axes:window.__p[i].slice()}); navigator.getGamepads=()=>[mk(0),mk(1),null,null]; })()"""
with sync_playwright() as pw:
    b=pw.chromium.launch(); p=b.new_page(viewport={'width':1280,'height':720}); errs=[]
    p.on('pageerror',lambda e:errs.append(str(e)[:250])); p.add_init_script(INIT); p.goto('file:///tmp/s55/w.html'); p.wait_for_timeout(3000)
    p.evaluate("My3D2dge.current.go('field',{mission:'vs2',seconds:30})"); p.wait_for_timeout(1500); p.keyboard.press('Enter'); p.wait_for_timeout(500)
    S="(()=>{const F=My3D2dge.current.debug.Field;return [Math.round(F.dana.x),Math.round(F.dana.y),Math.round(F.p2.x),Math.round(F.p2.y)]})()"
    print(p.evaluate(S)); p.evaluate("window.__p[0]=[1,0,0,0];window.__p[1]=[0,1,0,0]"); p.wait_for_timeout(1200); p.evaluate("window.__p[0]=[0,0,0,0];window.__p[1]=[0,0,0,0]"); print(p.evaluate(S)); print(errs); b.close()
