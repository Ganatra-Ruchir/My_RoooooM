// Boot: load fonts, build the room (if WebGL works), wire it to the UI.
import * as data from './data.js';
import { createUI } from './ui.js';
import { createControls } from './controls.js';
import { readLocalAvatar, wireLocalAvatar } from './local-avatar.js';
wireLocalAvatar();

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

  // Never silently discard an existing local avatar merely because IndexedDB
  // is slow to open on a mobile device. readLocalAvatar handles storage errors.
  const localAvatar = await readLocalAvatar();
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
      localAvatar,
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
  const night = true; // Reference-inspired evening lighting; window toggle still offers daylight.
  ui.setNight(night);
  room.setNight(night, true);

  async function start() {
    if (started || !room || !ui) return;
    started = true;
    clearInterval(ticker);
    if (msg) msg.textContent = "Loading Meera's 3D character";
    // Do not begin camera narration before the real guide exists. The tour
    // cannot silently swap a 2D portrait for a different-looking 3D person.
    const guide = await Promise.race([
      room.whenGuideReady(),
      new Promise(resolve => setTimeout(() => resolve(null), 22000)),
    ]).catch(() => null);
    bar.style.width = '100%';
    room.start();
    if (guide) {
      ui.beginGuidedTour();
      room.startGuidedTour();
    } else {
      console.warn("Meera's 3D file was unavailable; no fake substitute will be shown.");
      ui.showStart();
      const retry=document.getElementById('guideRetry');if(retry)retry.hidden=false;
    }
    setTimeout(hideLoader, 250);
  }
  setTimeout(start, 10000); // never leave visitors stuck behind the loader
}

boot();
