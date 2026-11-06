import os, sys, json
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
GAME = os.path.abspath(os.path.join(ROOT, '..', 'ResidentHull4-ResidentEvil4-claude-sonnet-5-5-medium-20261105-162051.html'))
FLAGS = ['--enable-unsafe-webgpu', '--enable-features=Vulkan', '--use-vulkan=swiftshader', '--use-angle=swiftshader', '--use-webgpu-adapter=swiftshader', '--ignore-gpu-blocklist']
class R:
    def __init__(self): self.passed = 0; self.failed = 0
    def check(self, name, cond, detail=''):
        if cond: self.passed += 1
        else: self.failed += 1; print('FAIL ' + name + (' :: ' + str(detail)[:300] if detail != '' else ''))
def launch(p, **kw):
    return p.chromium.launch(args=FLAGS, **kw)
