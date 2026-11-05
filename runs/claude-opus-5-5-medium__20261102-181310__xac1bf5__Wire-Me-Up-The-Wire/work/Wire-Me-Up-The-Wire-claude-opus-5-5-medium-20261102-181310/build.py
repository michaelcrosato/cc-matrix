#!/usr/bin/env python3
"""Bundle Wire Me Up: game.js (dev) and the single self-contained HTML in the run folder's root."""
import glob, os
HERE = os.path.dirname(os.path.abspath(__file__))
NAME = os.path.basename(HERE)
parts = sorted(glob.glob(os.path.join(HERE, 'src', '*.js')))
body = "\n".join(open(p, encoding='utf-8').read() for p in parts)
game = "(() => {\n'use strict';\n" + body + "\n})();\n"
open(os.path.join(HERE, 'game.js'), 'w', encoding='utf-8').write(game)
head = open(os.path.join(HERE, 'head.html'), encoding='utf-8').read()
session = open(os.path.join(HERE, 'session.js'), encoding='utf-8').read()
engine = open(os.path.join(HERE, 'my-3d2dge.js'), encoding='utf-8').read()
def page(inline):
    h = head.replace('<!--SESSION-->', '<script>\n' + session + '\n</script>')
    if inline:
        scripts = '<script>\n' + engine.replace('</script', '<\\/script') + '\n</script>\n<script>\n' + game.replace('</script', '<\\/script') + '\n</script>'
    else:
        scripts = '<script src="my-3d2dge.js"></script>\n<script src="game.js"></script>'
    return h.replace('<!--SCRIPTS-->', scripts)
open(os.path.join(HERE, 'index.html'), 'w', encoding='utf-8').write(page(False))
out = os.path.join(os.path.dirname(HERE), NAME + '.html')
open(out, 'w', encoding='utf-8').write(page(True))
print('built', out, os.path.getsize(out) // 1024, 'KB')
