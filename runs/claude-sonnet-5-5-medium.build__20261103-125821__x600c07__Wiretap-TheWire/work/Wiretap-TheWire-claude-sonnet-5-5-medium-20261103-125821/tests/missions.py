from playwright.sync_api import sync_playwright
PAD = """(() => { window.__ax=[0,0,0,0]; const mk=()=>({id:'054c-0ce6 DualSense',index:0,connected:true,mapping:'standard',timestamp:performance.now(),buttons:Array.from({length:17},()=>({pressed:false,value:0})),axes:window.__ax.slice()}); navigator.getGamepads=()=>[mk()]; })()"""
with sync_playwright() as pw:
    b = pw.chromium.launch(); p = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
    p.on('pageerror', lambda e: errs.append(str(e)[:300])); p.on('console', lambda m: errs.append(m.text[:200]) if m.type == 'error' else None)
    p.add_init_script(PAD)
    p.goto('file:///tmp/s55/w.html'); p.wait_for_timeout(3000)
    for m in ['ep1','ep2','ep3','ep4','tee1','tee2','vs']:
        p.evaluate("m => { const g=My3D2dge.current; g.go('field',{mission:m,attract:true,seconds:20}); }", m); p.wait_for_timeout(9000)
        print(m, p.evaluate("(()=>{const F=My3D2dge.current.debug.Field;return [F.over,F.tailPhase,F.tee&&F.tee.cash,F.sim.people.length,Math.round(F.dana.x),Math.round(F.dana.y),F.vs&&F.vs.score]})()"))
        p.screenshot(path='/tmp/s55/shots/m_%s.png' % m)
    # gamepad: inversion
    p.evaluate("My3D2dge.current.go('title')"); p.wait_for_timeout(1500)
    p.evaluate("window.__ax=[0,.9,0,0]"); p.wait_for_timeout(300)
    a=p.evaluate("navigator.getGamepads()[0].axes[1]"); p.evaluate("My3D2dge.current.settings.set('stickInvY', true)"); p.wait_for_timeout(100)
    print('axis y normal/inverted', a, p.evaluate("navigator.getGamepads()[0].axes[1]"), 'move', p.evaluate("My3D2dge.current.input.move()"), 'label', p.evaluate("My3D2dge.current.input.label('interact')"))
    p.evaluate("My3D2dge.current.settings.set('padSymbols','xbox')"); p.wait_for_timeout(300); print('xbox label', p.evaluate("My3D2dge.current.input.label('interact')"))
    print('settings keys', p.evaluate("Object.keys(My3D2dge.current.settings.specs||{}).filter(k=>/stick|pad|diff/.test(k))"))
    print(errs); b.close()
    # touch-only
    c = pw.chromium.launch(); ctx = c.new_context(has_touch=True, is_mobile=True, viewport={'width': 800, 'height': 400}); q = ctx.new_page(); q.goto('file:///tmp/s55/w.html'); q.wait_for_timeout(3500); print(q.inner_text('#ui')[:120].replace('\n',' | ')); q.screenshot(path='/tmp/s55/shots/touch.png'); c.close()
