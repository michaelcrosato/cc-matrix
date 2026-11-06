#!/bin/bash
# The game itself in Firefox: WebGPU forced on, a virtual display, and a private null-sink PulseAudio because Firefox has no sound output here.
# TCP on a port the OS picks, on 127.0.0.1: this folder's path is too long for a Unix socket. Stopped by PID.
cd "$(dirname "$0")/../.."; mkdir -p dist; X=$(mktemp -d "$PWD/dist/pa.XXXX"); chmod 700 "$X"; PORT=$(python3 -c "import socket;s=socket.socket();s.bind(('127.0.0.1',0));print(s.getsockname()[1]);s.close()")
XDG_RUNTIME_DIR=$X HOME=$X pulseaudio -n --daemonize=no --exit-idle-time=-1 --disable-shm=yes -L "module-null-sink sink_name=n" -L "module-native-protocol-tcp port=$PORT listen=127.0.0.1 auth-anonymous=1" >/dev/null 2>&1 & PA=$!
sleep 2; PULSE_SERVER=tcp:127.0.0.1:$PORT PE_BROWSER=firefox xvfb-run -a python3 tests/browser/browser.py ${@:-boot pad keys menu solo party rtc phone} 2>&1; R=$?
if [ -z "$1" ]; then PE_BROWSER=firefox xvfb-run -a python3 tests/browser/hub.py 2>&1; [ $? -ne 0 ] && R=1; fi; kill $PA 2>/dev/null; wait $PA 2>/dev/null; rm -rf "$X"; exit $R
