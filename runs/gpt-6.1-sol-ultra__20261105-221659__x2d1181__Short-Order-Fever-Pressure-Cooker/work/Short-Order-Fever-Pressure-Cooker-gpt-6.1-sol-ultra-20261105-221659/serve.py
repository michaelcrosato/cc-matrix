"""Quiet OS-assigned loopback server used only by this game's test command."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
os.chdir(Path(__file__).resolve().parent.parent)
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
print('port '+str(server.server_port),flush=True)
try:server.serve_forever()
except KeyboardInterrupt:pass
finally:server.server_close()
