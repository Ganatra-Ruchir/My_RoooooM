// Boot: load fonts, build the room (if WebGL works), wire it to the UI.
import * as data from './data.js';
import { createUI } from './ui.js';
import { createControls } from './controls.js';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const loader = document.getElementById('loader');
const bar = document.getElementById('loadBar');
const msg = document.getElementById('loadMsg');


function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

function isNightInIndia() {
  const now = new Date();
  const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
  const h = ist.getHours();
  return h < 6 || h >= 19;
}

function fontsReady() {
  if (!document.fonts?.load) return Promise.resolve();
  const wanted = ['600 40px "Fraunces"', '700 40px "Caveat"', '400 20px "Inter"', '600 20px "Inter"', '700 20px "Inter"'];
  return Promise.race([
    Promise.all(wanted.map((f) => document.fonts.load(f).catch(() => {}))),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
}

function hideLoader() {
  loader.classList.add('done');
  setTimeout(() => loader.remove(), 800);
}

const lines = ['Hanging the certificates', 'Dusting the bookshelf', 'Brewing a coffee', 'Opening the laptop'];
let li = 0;
const ticker = setInterval(() => { li = (li + 1) % lines.length; if (msg) msg.textContent = lines[li]; }, 1100);

function textOnly() {
  clearInterval(ticker);
  const ui = createUI({ room: null });
  ui.setNight(isNightInIndia());
  document.body.classList.add('no-room');
  ui.toggleList(true);
  hideLoader();
}

async function boot() {
  if (!hasWebGL()) return textOnly();
  await fontsReady();

  let createRoom;
  try {
    ({ createRoom } = await import('./room.js'));
  } catch (err) {
    console.error('Could not load the 3D room, showing the text version instead.', err);
    return textOnly();
  }

  let ui = null;
  let started = false;
  let room;
  try {
    room = createRoom({
      canvas: document.getElementById('room'),
      data,
      reducedMotion: reduced,
      hooks: {
        onProgress: (p) => { bar.style.width = Math.round(p * 100) + '%'; },
        onReady: () => start(),
        onSelect: (kind, index) => ui?.handleSelect(kind, index),
        onEmptyClick: () => ui?.hidePop(),
        onPrompt: (p) => ui?.setPrompt(p),
        onMode: (m) => ui?.onMode(m),
        onHover: (hit, e) => ui?.onHover(hit, e),
        onFrame: () => ui?.updateMarkers(),
        onWriting: (a) => ui?.setWriting(a),
        onNpcGreet: (index, message) => { if (!room?.isTouring) ui?.showNpcLine(index, message); },
        onTourStep: (step) => ui?.showTourStep(step),
        onTourFinished: () => ui?.completeGuidedTour(),
      },
    });
  } catch (err) {
    console.error('3D room failed to start, showing the text version instead.', err);
    return textOnly();
  }

  ui = createUI({ room });
  ui.onMode(room.mode);
  createControls({ room, ui });
  if (new URLSearchParams(location.search).has('debug')) Object.assign(window, { room, ui }); // dev helper
  const night = isNightInIndia();
  ui.setNight(night);
  room.setNight(night, true);

  function start() {
    if (started) return;
    started = true;
    clearInterval(ticker);
    bar.style.width = '100%';
    room.start();
    ui.beginGuidedTour();
    room.startGuidedTour(); // automatic, first-person, movement locked until NPC finishes
    setTimeout(hideLoader, 250);
  }
  setTimeout(start, 12000); // never leave visitors stuck behind the loader
}

boot();
