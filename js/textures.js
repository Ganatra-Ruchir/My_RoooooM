// Canvas-drawn textures: no image files needed for the room's surfaces and labels.
import * as THREE from 'three';

const FONT_DISPLAY = '"Fraunces", Georgia, serif';
const FONT_UI = '"Inter", system-ui, sans-serif';
const FONT_HAND = '"Caveat", "Segoe Print", cursive';

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(c, { repeat, aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

// Small deterministic random so the room looks the same on every visit.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function shade(hex, amt) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l + amt)));
  return '#' + c.getHexString();
}

function wrapLines(ctx, text, maxW) {
  const words = text.split(/\s+/); const lines = []; let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export function floorTexture() {
  const [c, x] = canvas(1024, 1024);
  const r = rng(7);
  const rows = 22, rh = 1024 / rows;
  for (let i = 0; i < rows; i++) {
    let px = -r() * 400;
    while (px < 1024) {
      const len = 260 + r() * 360;
      const l = 0.27 + r() * 0.09;
      x.fillStyle = `hsl(${26 + r() * 6}, ${38 + r() * 10}%, ${l * 100}%)`;
      x.fillRect(px, i * rh, len, rh);
      // grain
      x.globalAlpha = 0.08;
      for (let g = 0; g < 34; g++) {
        x.strokeStyle = r() > 0.5 ? '#5a3a22' : '#f3d2a6';
        x.lineWidth = .35 + r()*.8;
        x.beginPath();
        const gy = i * rh + 3 + r() * (rh - 6);
        x.moveTo(px, gy);
        x.bezierCurveTo(px + len * 0.3, gy + (r() - 0.5) * 6, px + len * 0.6, gy + (r() - 0.5) * 6, px + len, gy);
        x.stroke();
      }
      x.globalAlpha = 1;
      x.fillStyle = 'rgba(60,35,20,.55)';
      x.fillRect(px, i * rh, 2, rh);
      px += len;
    }
    x.fillStyle = 'rgba(60,35,20,.5)';
    x.fillRect(0, i * rh, 1024, 2);
  }
  return toTexture(c);
}

export function rugTexture() {
  const [c, x] = canvas(512, 512);
  const cx = 256, rings = ['#b9553a', '#efe2cc', '#2e5b52', '#efe2cc', '#d7a04a', '#efe2cc', '#b9553a'];
  rings.forEach((col, i) => {
    x.fillStyle = col;
    x.beginPath(); x.arc(cx, cx, 256 - i * 34, 0, Math.PI * 2); x.fill();
  });
  // little diamond pattern on the middle ring
  x.fillStyle = '#2e5b52';
  for (let a = 0; a < 24; a++) {
    const ang = (a / 24) * Math.PI * 2, rr = 256 - 3.5 * 34 + 17;
    x.save(); x.translate(cx + Math.cos(ang) * rr * 0.86, cx + Math.sin(ang) * rr * 0.86); x.rotate(ang + Math.PI / 4);
    x.fillRect(-5, -5, 10, 10); x.restore();
  }
  return toTexture(c);
}

export function skyTexture(night) {
  const [c, x] = canvas(512, 512);
  const g = x.createLinearGradient(0, 0, 0, 512);
  if (night) { g.addColorStop(0, '#0d1230'); g.addColorStop(0.6, '#2a2b5c'); g.addColorStop(1, '#5a3d6b'); }
  else { g.addColorStop(0, '#7fb6e8'); g.addColorStop(0.6, '#b9d8ef'); g.addColorStop(1, '#f6d9b8'); }
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  const r = rng(11);
  if (night) {
    for (let i = 0; i < 90; i++) {
      x.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.7})`;
      x.fillRect(r() * 512, r() * 300, r() > 0.9 ? 3 : 2, r() > 0.9 ? 3 : 2);
    }
    x.fillStyle = '#fff6da';
    x.shadowColor = '#fff3c4'; x.shadowBlur = 30;
    x.beginPath(); x.arc(380, 110, 34, 0, Math.PI * 2); x.fill();
    x.shadowBlur = 0;
    x.fillStyle = '#2a2b5c';
    x.beginPath(); x.arc(394, 100, 30, 0, Math.PI * 2); x.fill();
  } else {
    x.fillStyle = 'rgba(255,255,255,.85)';
    [[120, 120, 1], [360, 80, 0.8], [250, 200, 0.6]].forEach(([cx, cy, s]) => {
      for (let k = 0; k < 5; k++) { x.beginPath(); x.ellipse(cx + (k - 2) * 26 * s, cy + (k % 2) * 8, 36 * s, 22 * s, 0, 0, Math.PI * 2); x.fill(); }
    });
    x.fillStyle = '#ffe9a8';
    x.beginPath(); x.arc(420, 60, 26, 0, Math.PI * 2); x.fill();
  }
  // Skyline silhouette with a dome and minarets (a nod to Ahmedabad).
  const base = night ? '#141634' : '#8aa7c4';
  x.fillStyle = base;
  let bx = 0;
  while (bx < 512) {
    const w = 24 + r() * 40, h = 60 + r() * 120;
    x.fillRect(bx, 512 - h, w, h);
    if (night) {
      for (let wy = 512 - h + 10; wy < 500; wy += 14) for (let wx = bx + 5; wx < bx + w - 6; wx += 10)
        if (r() > 0.55) { x.fillStyle = `rgba(255,${200 + r() * 40},120,.85)`; x.fillRect(wx, wy, 4, 6); x.fillStyle = base; }
    }
    bx += w + 4;
  }
  x.fillStyle = night ? '#101230' : '#7895b3';
  x.beginPath(); x.arc(170, 430, 46, Math.PI, 0); x.fill();
  x.fillRect(124, 430, 92, 82);
  x.fillRect(110, 360, 10, 152); x.fillRect(220, 360, 10, 152);
  x.beginPath(); x.arc(115, 360, 7, Math.PI, 0); x.arc(225, 360, 7, Math.PI, 0); x.fill();
  return toTexture(c);
}

export function spineTexture({ title, color, number, w = 128, h = 512, light = false }) {
  const [c, x] = canvas(w, h);
  x.fillStyle = color; x.fillRect(0, 0, w, h);
  fiber(x,w,h,37,.22);
  const g = x.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(0,0,0,.25)'); g.addColorStop(0.15, 'rgba(255,255,255,.08)');
  g.addColorStop(0.85, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  const ink = light ? '#2a211b' : '#ded1b4';
  x.fillStyle = ink; x.globalAlpha = 0.85;
  x.fillRect(0, 26, w, 6); x.fillRect(0, h - 34, w, 6);
  x.globalAlpha = 1;
  x.save();
  x.translate(w / 2, h / 2 + 6); x.rotate(-Math.PI / 2);
  let size = Math.round(w * 0.36);
  x.font = `600 ${size}px ${FONT_DISPLAY}`;
  while (x.measureText(title).width > h - 120 && size > 12) { size -= 2; x.font = `600 ${size}px ${FONT_DISPLAY}`; }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(title, 0, 0);
  x.restore();
  if (number) {
    x.font = `700 ${Math.round(w * 0.2)}px ${FONT_UI}`;
    x.textAlign = 'center'; x.fillText(number, w / 2, h - 52);
  }
  return toTexture(c);
}

export function projectBoxTexture(p, i) {
  const [c, x] = canvas(512, 460);
  const g = x.createLinearGradient(0, 0, 512, 460);
  const muted='#'+new THREE.Color(p.color).lerp(new THREE.Color(0x261f1b),.7).getHexString();
  g.addColorStop(0, shade(muted, 0.015)); g.addColorStop(1, shade(muted, -0.12));
  x.fillStyle = g; x.fillRect(0, 0, 512, 460);
  // Restrained clothbound cover, fine fiber and gold-stamped rules.
  fiber(x,512,460,118,.3);
  x.strokeStyle='rgba(197,166,114,.65)';x.lineWidth=1.5;x.strokeRect(13,13,486,434);
  x.strokeStyle='rgba(197,166,114,.28)';x.strokeRect(19,19,474,422);
  x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, 360, 512, 100);
  x.fillStyle = '#fff8ec';
  x.font = `700 30px ${FONT_UI}`;
  x.fillText('P/' + String(i + 1).padStart(2, '0'), 34, 62);
  const tag = p.tag.toUpperCase();
  x.font = `700 20px ${FONT_UI}`;
  const tw = x.measureText(tag).width + 28;
  x.fillStyle = 'rgba(255,248,236,.92)';
  roundRect(x, 512 - tw - 30, 36, tw, 36, 18); x.fill();
  x.fillStyle = '#362c24'; x.fillText(tag, 512 - tw - 16, 61);
  x.fillStyle = '#fff8ec';
  let size = 64; x.font = `600 ${size}px ${FONT_DISPLAY}`;
  let lines = wrapLines(x, p.title, 440);
  while (lines.length > 2 && size > 36) { size -= 4; x.font = `600 ${size}px ${FONT_DISPLAY}`; lines = wrapLines(x, p.title, 440); }
  lines.forEach((l, k) => x.fillText(l, 34, 170 + k * (size + 6)));
  x.font = `400 22px ${FONT_UI}`; x.globalAlpha = 0.9;
  wrapLines(x, p.hook, 440).slice(0, 2).forEach((l, k) => x.fillText(l, 34, 400 + k * 28));
  x.globalAlpha = 1;
  return toTexture(c);
}

export function journalCoverTexture(a, i) {
  const [c, x] = canvas(256, 360);
  x.fillStyle = a.color; x.fillRect(0, 0, 256, 360);
  x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(0, 0, 20, 360);
  x.fillStyle = '#fdf6ea';
  x.font = `700 16px ${FONT_UI}`; x.fillText('/' + String(i + 1).padStart(2, '0') + '  ' + a.category.toUpperCase(), 34, 44);
  x.font = `600 30px ${FONT_DISPLAY}`;
  wrapLines(x, a.title, 196).slice(0, 4).forEach((l, k) => x.fillText(l, 34, 120 + k * 36));
  x.font = `400 16px ${FONT_UI}`; x.fillText(a.date, 34, 330);
  return toTexture(c);
}

export function neonTexture(text) {
  const [c, x] = canvas(1024, 360);
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `700 190px ${FONT_HAND}`;
  for (const [blur, col] of [[60, '#ff3d8b'], [30, '#ff5fa0'], [12, '#ff9cc4'], [0, '#fff0f6']]) {
    x.shadowColor = col; x.shadowBlur = blur; x.fillStyle = blur ? col : '#fff0f6';
    x.fillText(text, 512, 190);
  }
  return toTexture(c);
}

export function stickerTexture() {
  const [c, x] = canvas(256, 256);
  x.fillStyle = '#f4efe6'; x.beginPath(); x.arc(128, 128, 120, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#c2562f'; x.font = `700 110px ${FONT_DISPLAY}`;
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('RG', 128, 136);
  return toTexture(c);
}

export function clockFaceTexture() {
  const [c, x] = canvas(256, 256);
  x.fillStyle = '#fbf6ee'; x.beginPath(); x.arc(128, 128, 124, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#2a211b';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    x.lineWidth = i % 3 === 0 ? 8 : 4;
    x.beginPath(); x.moveTo(128 + Math.sin(a) * 96, 128 - Math.cos(a) * 96); x.lineTo(128 + Math.sin(a) * 112, 128 - Math.cos(a) * 112); x.stroke();
  }
  x.fillStyle = '#6f6158'; x.font = `600 18px ${FONT_UI}`; x.textAlign = 'center';
  x.fillText('IST', 128, 178);
  return toTexture(c);
}

export function notebookTexture() {
  const [c, x] = canvas(512, 340);
  x.fillStyle = '#fbf7ee'; x.fillRect(0, 0, 512, 340);
  x.strokeStyle = 'rgba(70,110,180,.35)'; x.lineWidth = 2;
  for (let y = 50; y < 340; y += 26) { x.beginPath(); x.moveTo(14, y); x.lineTo(242, y); x.moveTo(270, y); x.lineTo(498, y); x.stroke(); }
  x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(250, 0, 12, 340);
  x.fillStyle = '#2b3a67'; x.font = `600 26px ${FONT_HAND}`;
  const notes = ['draft: honest numbers', 'r ≈ −0.13 → say it', 'semantic layer!', 'charts → questions', 'ship it, then fix it'];
  notes.forEach((n, i) => x.fillText(n, 22, 44 + i * 52));
  x.strokeStyle = '#2b3a67'; x.lineWidth = 3;
  for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(282, 46 + i * 26); x.lineTo(282 + 60 + ((i * 53) % 150), 46 + i * 26); x.stroke(); }
  return toTexture(c);
}

// Live laptop screen: types out the article currently being "written".
export function createScreen() {
  const [c, x] = canvas(512, 320);
  const tex = toTexture(c);
  function draw(title, body, cursorOn) {
    x.fillStyle = '#16192a'; x.fillRect(0, 0, 512, 320);
    x.fillStyle = '#22263b'; x.fillRect(0, 0, 512, 34);
    ['#ff6b6b', '#ffd166', '#06d6a0'].forEach((col, i) => { x.fillStyle = col; x.beginPath(); x.arc(22 + i * 22, 17, 7, 0, Math.PI * 2); x.fill(); });
    x.fillStyle = '#9aa3c7'; x.font = `500 15px ${FONT_UI}`; x.fillText('draft.md — Medium', 96, 22);
    x.fillStyle = '#f5f1ea'; x.font = `600 26px ${FONT_DISPLAY}`;
    const tl = wrapLines(x, title, 460).slice(0, 2);
    tl.forEach((l, i) => x.fillText(l, 26, 80 + i * 32));
    x.fillStyle = '#c9cde0'; x.font = `400 17px ${FONT_UI}`;
    const bl = wrapLines(x, body, 460).slice(-6);
    let y = 80 + tl.length * 32 + 14;
    bl.forEach((l) => { x.fillText(l, 26, y); y += 24; });
    if (cursorOn) {
      const last = bl[bl.length - 1] || '';
      x.fillStyle = '#ff8f6b';
      x.fillRect(26 + x.measureText(last).width + 3, y - 24 - 16, 10, 20);
    }
    tex.needsUpdate = true;
  }
  return { texture: tex, draw };
}

export function softDotTexture() {
  const [c, x] = canvas(64, 64);
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return toTexture(c);
}

// Little floating particles: hearts (petting), notes (music), z (sleep), drops (watering).
export function glyphTexture(kind) {
  const [c, x] = canvas(128, 128);
  x.translate(64, 64);
  if (kind === 'heart') {
    x.fillStyle = '#ff5d8f'; x.shadowColor = 'rgba(255,93,143,.6)'; x.shadowBlur = 10;
    x.beginPath(); x.moveTo(0, 38);
    x.bezierCurveTo(-60, -4, -34, -54, 0, -22);
    x.bezierCurveTo(34, -54, 60, -4, 0, 38); x.fill();
  } else if (kind === 'note') {
    x.fillStyle = '#ffd166'; x.strokeStyle = '#ffd166'; x.lineWidth = 9; x.lineCap = 'round';
    x.beginPath(); x.ellipse(-18, 30, 20, 15, -0.4, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.moveTo(0, 26); x.lineTo(0, -44); x.quadraticCurveTo(30, -36, 34, -8); x.stroke();
  } else if (kind === 'z') {
    x.fillStyle = '#b8c1ff'; x.font = `700 92px ${FONT_DISPLAY}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText('z', 0, 0);
  } else if (kind === 'drop') {
    x.fillStyle = '#5ab0ff';
    x.beginPath(); x.moveTo(0, -46); x.bezierCurveTo(30, -6, 34, 40, 0, 44); x.bezierCurveTo(-34, 40, -30, -6, 0, -46); x.fill();
    x.fillStyle = 'rgba(255,255,255,.6)'; x.beginPath(); x.ellipse(-10, 14, 6, 12, 0.3, 0, Math.PI * 2); x.fill();
  } else if (kind === 'spark') {
    x.fillStyle = '#ffe08a';
    x.beginPath();
    for (let i = 0; i < 8; i++) { const r = i % 2 ? 14 : 50, a = (i / 8) * Math.PI * 2; x.lineTo(Math.sin(a) * r, -Math.cos(a) * r); }
    x.closePath(); x.fill();
  }
  return toTexture(c);
}

export function createPhoneScreen() {
  const [c, x] = canvas(180, 360);
  const tex = toTexture(c);
  function draw(lit, time) {
    if (!lit) {
      x.fillStyle = '#0c0d12'; x.fillRect(0, 0, 180, 360);
      const g = x.createLinearGradient(0, 0, 180, 360);
      g.addColorStop(0, 'rgba(255,255,255,.08)'); g.addColorStop(0.5, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 180, 360);
    } else {
      const g = x.createLinearGradient(0, 0, 0, 360);
      g.addColorStop(0, '#2a3f7a'); g.addColorStop(1, '#c2562f');
      x.fillStyle = g; x.fillRect(0, 0, 180, 360);
      x.fillStyle = '#fff'; x.textAlign = 'center';
      x.font = `600 44px ${FONT_UI}`; x.fillText(time, 90, 92);
      x.font = `500 13px ${FONT_UI}`; x.fillText('Ahmedabad · IST', 90, 116);
      x.fillStyle = 'rgba(255,255,255,.92)'; roundRect(x, 12, 160, 156, 92, 14); x.fill();
      x.textAlign = 'left'; x.fillStyle = '#0a66c2'; x.font = `700 12px ${FONT_UI}`; x.fillText('MESSAGE · now', 24, 182);
      x.fillStyle = '#1b1c20'; x.font = `600 15px ${FONT_UI}`; x.fillText('Let’s connect?', 24, 206);
      x.fillStyle = '#555'; x.font = `400 12px ${FONT_UI}`; x.fillText('Tap to open LinkedIn', 24, 228);
    }
    tex.needsUpdate = true;
  }
  return { texture: tex, draw };
}

export function resumeTexture(profile) {
  const [c, x] = canvas(384, 512);
  x.fillStyle = '#fbf8f1'; x.fillRect(0, 0, 384, 512);
  x.fillStyle = '#c2562f'; x.fillRect(0, 0, 384, 10);
  x.fillStyle = '#2a211b'; x.font = `600 34px ${FONT_DISPLAY}`; x.fillText(profile.name, 28, 72);
  x.fillStyle = '#6f6158'; x.font = `500 15px ${FONT_UI}`; x.fillText(profile.role + ' · Ahmedabad', 28, 98);
  x.fillStyle = '#c2562f'; x.font = `700 13px ${FONT_UI}`; x.fillText('RÉSUMÉ', 28, 136);
  const sec = (title, y, n) => {
    x.fillStyle = '#2a211b'; x.font = `700 14px ${FONT_UI}`; x.fillText(title, 28, y);
    x.fillStyle = 'rgba(42,33,27,.25)';
    for (let i = 0; i < n; i++) x.fillRect(28, y + 14 + i * 16, 330 - ((i * 47) % 120), 7);
  };
  sec('Experience', 176, 5); sec('Projects', 290, 4); sec('Education', 388, 3);
  x.fillStyle = '#2b3a67'; x.font = `600 22px ${FONT_HAND}`; x.fillText('open me →', 250, 490);
  return toTexture(c);
}

export function badgeTexture(event, color) {
  const [c, x] = canvas(192, 256);
  x.fillStyle = '#fbf8f1'; x.fillRect(0, 0, 192, 256);
  x.fillStyle = color; x.fillRect(0, 0, 192, 86);
  x.fillStyle = '#fff8ec'; x.font = `700 17px ${FONT_UI}`; x.textAlign = 'center';
  wrapLines(x, event.toUpperCase(), 170).slice(0, 3).forEach((l, i) => x.fillText(l, 96, 30 + i * 21));
  x.fillStyle = '#2a211b'; x.font = `600 26px ${FONT_DISPLAY}`; x.fillText('Ruchir G.', 96, 140);
  x.fillStyle = color; roundRect(x, 36, 160, 120, 30, 15); x.fill();
  x.fillStyle = '#fff8ec'; x.font = `700 14px ${FONT_UI}`; x.fillText('ORGANISER', 96, 181);
  x.fillStyle = '#2a211b';
  const r = rng(event.length * 7);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if (r() > 0.45) x.fillRect(70 + i * 9, 204 + j * 8, 8, 7);
  return toTexture(c);
}

export function groundTexture() {
  const [c, x] = canvas(512, 512);
  const g = x.createRadialGradient(256, 256, 30, 256, 256, 256);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,.9)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  return toTexture(c);
}

export function doormatTexture() {
  const [c, x] = canvas(256, 400);
  x.fillStyle = '#7a5a3a'; x.fillRect(0, 0, 256, 400);
  x.strokeStyle = '#5c4229'; x.lineWidth = 3;
  for (let i = 0; i < 400; i += 8) { x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
  x.strokeStyle = '#f2e6d0'; x.lineWidth = 6; x.strokeRect(16, 16, 224, 368);
  x.save(); x.translate(128, 200); x.rotate(-Math.PI / 2);
  x.fillStyle = '#f2e6d0'; x.font = `700 46px ${FONT_DISPLAY}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('WELCOME', 0, 0);
  x.restore();
  return toTexture(c);
}

export function whiteboardTexture(skills) {
  const [c, x] = canvas(1024, 590);
  x.fillStyle = '#fbfcfd'; x.fillRect(0, 0, 1024, 590);
  x.fillStyle = '#c2562f'; x.font = `700 58px ${FONT_HAND}`; x.fillText('My toolkit ✎', 40, 72);
  const cols = Object.entries(skills).slice(0, 3);
  const inks = ['#2b3a67', '#2e5b52', '#9a3f52'];
  cols.forEach(([group, list], i) => {
    const cx = 40 + i * 330;
    x.fillStyle = inks[i]; x.font = `700 34px ${FONT_HAND}`; x.fillText(group, cx, 140);
    x.font = `600 30px ${FONT_HAND}`;
    list.slice(0, 6).forEach((s, k) => x.fillText('• ' + s, cx + 6, 190 + k * 52));
  });
  x.strokeStyle = 'rgba(194,86,47,.6)'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(40, 92); x.bezierCurveTo(200, 100, 300, 86, 420, 96); x.stroke();
  x.fillStyle = '#2b3a67'; x.font = `600 28px ${FONT_HAND}`; x.fillText('+ the other half: storytelling, teamwork, empathy', 40, 560);
  return toTexture(c);
}

export function posterTexture(tagline) {
  const [c, x] = canvas(420, 556);
  const g = x.createLinearGradient(0, 0, 420, 556);
  g.addColorStop(0, '#c2562f'); g.addColorStop(1, '#7a2f1a');
  x.fillStyle = g; x.fillRect(0, 0, 420, 556);
  x.strokeStyle = 'rgba(255,248,236,.25)'; x.lineWidth = 2;
  for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(0, 360 + i * 12); for (let k = 0; k <= 420; k += 20) x.lineTo(k, 360 + i * 12 + Math.sin(k / 30 + i) * (12 - i)); x.stroke(); }
  x.strokeStyle = '#fff8ec'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(0, 360); for (let k = 0; k <= 420; k += 6) x.lineTo(k, 360 + Math.sin(k / 18) * 3); x.stroke();
  x.fillStyle = '#fff8ec'; x.font = `600 46px ${FONT_DISPLAY}`;
  wrapLines(x, tagline, 360).forEach((l, i) => x.fillText(l, 30, 90 + i * 54));
  x.font = `700 16px ${FONT_UI}`; x.fillText('RUCHIR GANATRA · AHMEDABAD', 30, 520);
  return toTexture(c);
}

function roundRect(x, l, t, w, h, r) {
  x.beginPath();
  x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r);
  x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath();
}

// Locally generated high-frequency surface fallbacks; photographic maps can supersede them.
function fiber(ctx,w,h,seed,alpha) {
  const r=rng(seed);
  ctx.save();ctx.globalAlpha=alpha;
  for(let y=0;y<h;y+=3){
    ctx.fillStyle=r()>.5?'#c1a78b':'#201a16';ctx.fillRect(0,y,w,1);
  }
  for(let x=0;x<w;x+=3){
    ctx.fillStyle=r()>.5?'#bfb2a0':'#211a15';ctx.fillRect(x,0,1,h);
  }
  ctx.restore();
}
let woodFallback, paperFallback, wovenFallback;
export function fineWoodTexture(){
  if(woodFallback)return woodFallback;
  const [c,x]=canvas(512,512),r=rng(318);
  x.fillStyle='#aa8a70';x.fillRect(0,0,512,512);
  for(let y=0;y<512;y++){
    x.strokeStyle=r()>.44?'rgba(59,32,20,.27)':'rgba(245,218,183,.28)';
    x.lineWidth=.35+r()*.85;x.beginPath();
    x.moveTo(0,y);for(let i=0;i<=512;i+=8)x.lineTo(i,y+Math.sin(i*.021+y*.047)*2.1+Math.sin(i*.008+y*.1)*3.4);
    x.stroke();
  }
  return woodFallback=toTexture(c,{repeat:[1,1]});
}
export function paperEdgesTexture(){
  if(paperFallback)return paperFallback;
  const [c,x]=canvas(128,256),r=rng(55);x.fillStyle='#e3d5bc';x.fillRect(0,0,128,256);
  for(let y=0;y<256;y+=2){x.fillStyle=r()>.5?'#bead91':'#d1c0a4';x.fillRect(0,y,128,1);}
  return paperFallback=toTexture(c);
}
export function wovenTexture(){
  if(wovenFallback)return wovenFallback;
  const [c,x]=canvas(512,512),r=rng(58);x.fillStyle='#b8a58b';x.fillRect(0,0,512,512);
  for(let yy=0;yy<512;yy+=4)for(let xx=0;xx<512;xx+=4){
    const v=145+Math.floor(r()*65);x.fillStyle='rgb('+v+','+(v-11)+','+(v-27)+')';
    x.fillRect(xx,yy,3,3);x.fillStyle='#806d56';x.fillRect(xx,yy+3,3,1);
  }
  return wovenFallback=toTexture(c,{repeat:[4,4]});
}
export function gardenTexture(night){
  const [c,x]=canvas(512,512),r=rng(8151);
  const gradient=x.createLinearGradient(0,0,0,512);
  gradient.addColorStop(0,night?'#30404a':'#9babac');gradient.addColorStop(1,night?'#151f1c':'#485c48');
  x.fillStyle=gradient;x.fillRect(0,0,512,512);
  // Layered, soft foliage beyond the window; a background surface, not a room screenshot.
  for(let layer=0;layer<3;layer++){
    for(let i=0;i<14;i++){
      const bx=r()*512,by=580,top=35+r()*300;
      x.strokeStyle=night?'#30342c':'#555c4c';x.lineWidth=1+layer*1.8;x.beginPath();x.moveTo(bx,by);x.lineTo(bx+(r()-.5)*65,top);x.stroke();
    }
    for(let i=0;i<850;i++){
      const px=r()*512,py=r()*512,sz=1+r()*7;
      const v=(night?25:65)+r()*(night?38:66)+layer*4;
      x.fillStyle='rgba('+Math.round(v*.75)+','+Math.round(v)+','+Math.round(v*.75)+',.72)';
      x.beginPath();x.ellipse(px,py,sz,sz*.45,r()*Math.PI,0,Math.PI*2);x.fill();
    }
  }
  return toTexture(c);
}
