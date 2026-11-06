'use strict';

const canvas = document.getElementById('world');
const context = canvas.getContext('2d');
let artWidth = 0;
let artHeight = 0;
const motionLibrary = Mocap.load(window.MOCAP.FITCLIPS);
const motionClips = { standing: 'Idle_Subtle', yoga: '111_38_part1', squat: '111_39_part1', pushup: 'Pushup', lunge: '111_41_part3', walk: 'Walk_Loop', run: 'Run_Loop' };

function resizeArt() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  artWidth = window.innerWidth;
  artHeight = window.innerHeight;
  canvas.width = Math.round(artWidth * ratio);
  canvas.height = Math.round(artHeight * ratio);
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
}
window.addEventListener('resize', resizeArt);
resizeArt();

function ellipse(x, y, rx, ry, color) {
  context.fillStyle = color;
  context.beginPath();
  context.ellipse(x, y, Math.max(.1, rx), Math.max(.1, ry), 0, 0, Math.PI * 2);
  context.fill();
}
function line(x1, y1, x2, y2, width, color) {
  context.strokeStyle = color;
  context.lineWidth = width;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}
function rounded(x, y, width, height, radius, color) {
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fill();
}
function drawCloud(x, y, size) {
  ellipse(x, y, size * 1.4, size * .26, 'rgba(255,255,255,.48)');
  ellipse(x - size * .45, y - size * .15, size * .55, size * .3, 'rgba(255,255,255,.48)');
  ellipse(x + size * .25, y - size * .2, size * .65, size * .34, 'rgba(255,255,255,.48)');
}
function drawTree(x, y, size) {
  line(x, y, x + size * .03, y - size * .8, size * .11, '#ac8066');
  ellipse(x, y - size * .79, size * .37, size * .42, '#8ebaa1');
  ellipse(x - size * .16, y - size * .87, size * .25, size * .3, '#a6ccae');
}
function drawTare(x, y, size, mood) {
  ellipse(x, y + size * .12, size * .58, size * .13, 'rgba(50,90,80,.13)');
  rounded(x - size * .47, y - size * .37, size * .94, size * .48, size * .13, '#e4ede8');
  rounded(x - size * .47, y - size * .43, size * .94, size * .48, size * .13, '#fffefa');
  rounded(x - size * .22, y - size * .31, size * .44, size * .2, size * .05, '#d9efdf');
  ellipse(x - size * .08, y - size * .23, size * .025, size * .027, '#416b60');
  ellipse(x + size * .08, y - size * .23, size * .025, size * .027, '#416b60');
  context.strokeStyle = '#416b60'; context.lineWidth = Math.max(1, size * .015); context.beginPath();
  context.arc(x, y - size * .2, size * .045, .2, Math.PI - .2); context.stroke();
  if (mood) { context.fillStyle = '#e6ad65'; context.font = `bold ${size * .2}px sans-serif`; context.fillText('✦', x + size * .57, y - size * .46); }
}
function drawPerson(x, ground, size, options = {}) {
  const sway = (options.lean || 0) * size * .13 + Math.sin((options.time || 0) * 1.3) * size * .008;
  const movement = options.movement || 0;
  const skin = options.skin || '#e8b69b';
  const shirt = options.shirt || '#f1c86c';
  const trousers = options.trousers || '#527d75';
  ellipse(x, ground + size * .035, size * .39, size * .065, 'rgba(56,95,80,.13)');
  line(x - size * .1, ground - size * .31, x - size * (.16 + movement * .08), ground - size * .03, size * .105, trousers);
  line(x + size * .1, ground - size * .31, x + size * (.16 - movement * .08), ground - size * .03, size * .105, trousers);
  line(x - size * (.16 + movement * .08), ground - size * .03, x - size * (.23 + movement * .08), ground - size * .03, size * .07, '#f9f8e9');
  line(x + size * (.16 - movement * .08), ground - size * .03, x + size * (.23 - movement * .08), ground - size * .03, size * .07, '#f9f8e9');
  const clip = motionLibrary.clip(motionClips[options.motion]);
  if (clip) {
    const pose = motionLibrary.sample(clip, (options.motionTime || 0) % clip.dur);
    for (const [side, offset] of [['L', -.13], ['R', .13]]) {
      const shoulder = motionLibrary.pt(pose, `sh${side}`);
      const elbow = motionLibrary.pt(pose, `elbow${side}`);
      const wrist = motionLibrary.pt(pose, `wrist${side}`);
      const startX = x + size * offset + sway, startY = ground - size * .6;
      const joint = point => [startX + (point[1] - shoulder[1]) * size / 1600, startY - (point[2] - shoulder[2]) * size / 1600];
      const [elbowX, elbowY] = joint(elbow), [wristX, wristY] = joint(wrist);
      line(startX, startY, elbowX, elbowY, size * .08, skin);
      line(elbowX, elbowY, wristX, wristY, size * .075, skin);
    }
  } else {
    line(x - size * .13 + sway, ground - size * .6, x - size * .35 + sway, ground - size * (.49 + Math.abs(movement) * .12), size * .08, skin);
    line(x + size * .13 + sway, ground - size * .6, x + size * .35 + sway, ground - size * (.49 - Math.abs(movement) * .12), size * .08, skin);
  }
  rounded(x - size * .19 + sway, ground - size * .68, size * .38, size * .4, size * .12, shirt);
  line(x + sway, ground - size * .71, x + sway, ground - size * .65, size * .105, skin);
  ellipse(x + sway, ground - size * .85, size * .19, size * .22, skin);
  ellipse(x + sway, ground - size * .99, size * .19, size * .105, '#52655a');
  ellipse(x - size * .065 + sway, ground - size * .85, size * .013, size * .016, '#496156');
  ellipse(x + size * .065 + sway, ground - size * .85, size * .013, size * .016, '#496156');
  context.strokeStyle = '#a56d61'; context.lineWidth = Math.max(1, size * .012); context.beginPath();
  context.arc(x + sway, ground - size * .81, size * .045, .1, Math.PI - .1); context.stroke();
}
function drawScenery(time) {
  const width = artWidth, height = artHeight;
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, '#e3f4ef'); sky.addColorStop(.55, '#eff8e9'); sky.addColorStop(1, '#bfe3d3');
  context.fillStyle = sky; context.fillRect(0, 0, width, height);
  ellipse(width * .77, height * .19, Math.min(width, height) * .11, Math.min(width, height) * .11, '#fae9b5');
  drawCloud(width * .67 + Math.sin(time * .08) * 9, height * .15, width * .08);
  drawCloud(width * .92, height * .27, width * .05);
  context.fillStyle = '#c9e7d7'; context.beginPath(); context.moveTo(0, height * .64); context.quadraticCurveTo(width * .24, height * .31, width * .45, height * .61); context.quadraticCurveTo(width * .67, height * .36, width, height * .63); context.lineTo(width, height); context.lineTo(0, height); context.fill();
  context.fillStyle = '#aedbc9'; context.beginPath(); context.moveTo(0, height * .69); context.quadraticCurveTo(width * .21, height * .51, width * .44, height * .68); context.quadraticCurveTo(width * .72, height * .46, width, height * .65); context.lineTo(width, height); context.lineTo(0, height); context.fill();
  context.fillStyle = '#cdebe0'; context.fillRect(0, height * .7, width, height * .3);
  for (let index = 0; index < 11; index++) {
    const rippleX = ((index * 191 + time * 5) % (width + 100)) - 50;
    line(rippleX, height * (.74 + (index % 4) * .045), rippleX + 42 + index * 3, height * (.74 + (index % 4) * .045), 2, 'rgba(255,255,255,.35)');
  }
}
function drawWorld(state) {
  const width = artWidth, height = artHeight, time = state.clock || 0;
  context.clearRect(0, 0, width, height);
  drawScenery(time);
  const compact = width < 700;
  const active = state.screen === 'play' || state.screen === 'check';
  const cx = compact ? width * .52 : active ? width * .5 : width * .73;
  const cy = active ? height * .76 : compact ? height * .46 : height * .68;
  const size = Math.min(width * (compact ? .63 : .30), height * .52);
  ellipse(cx, cy + size * .19, size * 1.05, size * .28, '#a9cfb5');
  ellipse(cx, cy + size * .13, size, size * .26, '#d5e7c4');
  ellipse(cx, cy + size * .07, size * .91, size * .2, '#e9efd4');
  drawTree(cx - size * .7, cy - size * .1, size * .42);
  drawTree(cx + size * .72, cy - size * .08, size * .3);
  if (!active) {
    rounded(cx - size * .37, cy - size * .39, size * .53, size * .32, size * .025, '#fff9e9');
    context.fillStyle = '#dfaa88'; context.beginPath(); context.moveTo(cx - size * .43, cy - size * .39); context.lineTo(cx - size * .11, cy - size * .58); context.lineTo(cx + size * .21, cy - size * .39); context.closePath(); context.fill();
    rounded(cx - size * .12, cy - size * .29, size * .11, size * .2, size * .012, '#9ec6b2');
    rounded(cx - size * .31, cy - size * .29, size * .12, size * .1, size * .01, '#b4ddd2');
    ellipse(cx + size * .28, cy + size * .02, size * .31, size * .09, '#a4cfc1');
    drawPerson(cx + size * .27, cy, size * .6, { time, movement: Math.sin(time * 1.2) * .2 });
    drawTare(cx + size * .58, cy + size * .08, size * .24, true);
    for (let index = 0; index < 5; index++) ellipse(cx - size * .6 + index * size * .07, cy + size * .12, 3, 3, index % 2 ? '#f6c888' : '#fff8e5');
  } else {
    const activity = state.activity;
    const lean = activity ? activity.px : 0;
    const movement = activity ? Math.sin(activity.elapsed * (activity.kind === 'jog' ? 5 : 2)) * .6 : 0;
    ellipse(cx, cy + size * .05, size * .55, size * .12, '#a5d2bf');
    drawPerson(cx, cy, size * .95, { time, lean, movement, shirt: state.shirt, motion: activity?.clip || 'standing', motionTime: activity?.elapsed || time });
    drawTare(cx + size * .55, cy + size * .06, size * .22, false);
    if (activity && activity.kind === 'candle') {
      rounded(cx - size * .65, cy - size * .14, size * .11, size * .16, 4, '#fffaf0');
      ellipse(cx - size * .595, cy - size * .16, size * .035, size * (.055 + activity.flame * .06), '#f7c05b');
    }
    if (activity && activity.kind === 'hoop') {
      context.strokeStyle = '#f5ae80'; context.lineWidth = size * .035; context.beginPath(); context.ellipse(cx, cy - size * .35, size * .36, size * .09, -.08, 0, Math.PI * 2); context.stroke();
    }
    if (activity && activity.kind === 'tray') {
      line(cx - size * .38, cy - size * .49, cx + size * .38, cy - size * .49 + lean * size * .1, size * .045, '#bb8b6d');
      ellipse(cx, cy - size * .52, size * .06, size * .035, '#849e67');
    }
  }
}
