from pathlib import Path
import json,urllib.parse
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parent
info=json.loads((root/'build-info.json').read_text())
with sync_playwright() as p:
    b=p.chromium.launch(headless=True,args=['--enable-unsafe-webgpu','--use-angle=swiftshader','--enable-unsafe-swiftshader','--use-webgpu-adapter=swiftshader'])
    page=b.new_page(viewport={'width':1920,'height':1080})
    page.goto('http://127.0.0.1:40835/'+urllib.parse.quote(info['stem']+'.html'))
    page.wait_for_function('window.__game?.getState().ready',timeout=90000)
    page.evaluate("__game.action('title');__game.setIdle(-100)")
    n=page.evaluate('__game.getState().stats.frames')
    page.wait_for_function(f'__game.getState().stats.frames>{n+6}',timeout=60000)
    page.screenshot(path=str(root/'final-title-1920.png'))
    page.evaluate("__game.action('start');__game.action('dev:god',true);__game.teleport(64,-32)")
    n=page.evaluate('__game.getState().stats.frames')
    page.wait_for_function(f'__game.getState().stats.frames>{n+35}',timeout=60000)
    page.screenshot(path=str(root/'final-river-1920.png'))
    print('Title and river composition captures saved.')
    b.close()
