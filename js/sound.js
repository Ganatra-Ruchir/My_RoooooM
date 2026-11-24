// Tiny synthesized sounds: no audio files. Everything starts only after a click.
let ctx = null, master = null, noiseBuf = null;

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume().catch(()=>{});
  return ctx;
}
function noise(dest, t, dur) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf; s.loop = true;
  s.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur);
  return s;
}
function env(g, t, peak, a, d) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}

export function squeak() {
  if (!audio()) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(900, t);
  o.frequency.exponentialRampToValueAtTime(1700, t + 0.07);
  o.frequency.exponentialRampToValueAtTime(650, t + 0.28);
  env(g, t, 0.22, 0.015, 0.3);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + 0.35);
}

export function purr(seconds = 2.6) {
  if (!audio()) return;
  const t = ctx.currentTime;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
  const g = ctx.createGain(); g.gain.value = 0;
  const am = ctx.createGain(); am.gain.value = 0.5;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 24;
  const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.5;
  lfo.connect(lfoGain).connect(am.gain);
  noise(lp, t, seconds + 0.2);
  lp.connect(am).connect(g).connect(master);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.5, t + 0.3);
  g.gain.setValueAtTime(0.5, t + seconds - 0.5);
  g.gain.exponentialRampToValueAtTime(0.0001, t + seconds);
  lfo.start(t); lfo.stop(t + seconds + 0.2);
}

export function splash() {
  if (!audio()) return;
  for (let i = 0; i < 4; i++) {
    const t = ctx.currentTime + i * 0.09 + Math.random() * 0.04;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1400 + Math.random() * 1600; bp.Q.value = 3;
    const g = ctx.createGain(); env(g, t, 0.18, 0.005, 0.12);
    noise(bp, t, 0.2); bp.connect(g).connect(master);
  }
}

// ---------- Lo-fi loop ----------
const CHORDS = [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]]; // Fmaj7 Em7 Dm7 Cmaj7
const SCALE = [60, 62, 64, 67, 69, 72, 74];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
let loop = null;

function startLofi() {
  if (!audio() || loop) return;
  const bus = ctx.createGain(); bus.gain.value = 0.0001;
  const warm = ctx.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 2600;
  bus.connect(warm).connect(master);
  bus.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 1.2);

  // vinyl crackle
  const crackle = ctx.createBufferSource();
  const cb = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
  const cd = cb.getChannelData(0);
  for (let i = 0; i < cd.length; i++) cd[i] = Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 0.8 : (Math.random() * 2 - 1) * 0.012;
  crackle.buffer = cb; crackle.loop = true;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1500;
  const cg = ctx.createGain(); cg.gain.value = 0.35;
  crackle.connect(hp).connect(cg).connect(bus); crackle.start();

  const bpm = 74, step = 60 / bpm / 4; // 16th notes
  let next = ctx.currentTime + 0.1, n = 0;
  const pad = (midi, t, dur) => {
    for (const det of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = hz(midi); o.detune.value = det;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.028, t + 0.35);
      g.gain.setValueAtTime(0.028, t + dur - 0.4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(f).connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
    }
  };
  const bass = (midi, t) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(midi - 12);
    const g = ctx.createGain(); env(g, t, 0.22, 0.02, 0.5);
    o.connect(g).connect(bus); o.start(t); o.stop(t + 0.6);
  };
  const kick = (t) => {
    const o = ctx.createOscillator(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    const g = ctx.createGain(); env(g, t, 0.55, 0.004, 0.28);
    o.connect(g).connect(bus); o.start(t); o.stop(t + 0.32);
  };
  const snare = (t) => {
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.8;
    const g = ctx.createGain(); env(g, t, 0.16, 0.003, 0.18);
    noise(f, t, 0.22); f.connect(g).connect(bus);
  };
  const hat = (t, v) => {
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain(); env(g, t, v, 0.002, 0.04);
    noise(f, t, 0.06); f.connect(g).connect(bus);
  };
  const lead = (midi, t) => {
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = hz(midi);
    const g = ctx.createGain(); env(g, t, 0.05, 0.05, 0.9);
    o.connect(g).connect(bus); o.start(t); o.stop(t + 1);
  };

  function schedule() {
    while (next < ctx.currentTime + 0.15) {
      const bar = Math.floor(n / 16) % CHORDS.length, s = n % 16;
      const swing = s % 2 ? step * 0.18 : 0;
      const t = next + swing;
      if (s === 0) { CHORDS[bar].forEach((m) => pad(m, t, step * 16)); bass(CHORDS[bar][0], t); }
      if (s === 10) bass(CHORDS[bar][0] + 7, t);
      if (s === 0 || s === 7 || s === 10) kick(t);
      if (s === 4 || s === 12) snare(t);
      if (s % 2 === 0) hat(t, s % 4 === 0 ? 0.05 : 0.025);
      if ((s === 6 || s === 14) && Math.random() < 0.45) lead(SCALE[Math.floor(Math.random() * SCALE.length)], t);
      next += step; n++;
    }
  }
  const timer = setInterval(schedule, 25);
  schedule();
  loop = { bus, crackle, timer };
}

function stopLofi() {
  if (!loop) return;
  const { bus, crackle, timer } = loop;
  loop = null;
  clearInterval(timer);
  const t = ctx.currentTime;
  bus.gain.cancelScheduledValues(t);
  bus.gain.setValueAtTime(Math.max(bus.gain.value, 0.0001), t);
  bus.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  setTimeout(() => { try { crackle.stop(); bus.disconnect(); } catch { /* already stopped */ } }, 1000);
}

export const lofi = {
  toggle() { if (loop) stopLofi(); else startLofi(); return !!loop; },
  stop: stopLofi,
  get playing() { return !!loop; },
};

/* Quiet procedural sound cues. Recorded Foley can replace these later. */
export function unlock(){audio();}
function filteredNoise(freq,peak,duration,type='bandpass'){
  if(!ctx||ctx.state!=='running')return;
  const t=ctx.currentTime,b=ctx.createBiquadFilter(),g=ctx.createGain();
  b.type=type;b.frequency.value=freq;b.Q.value=.8;
  env(g,t,peak,.009,duration);noise(b,t,duration+.03);b.connect(g).connect(master);
}
export function footstep(){filteredNoise(420+Math.random()*140,.12,.13,'lowpass');}
export function pageTurn(){if(audio())filteredNoise(1900,.12,.24);}
export function sip(){filteredNoise(760,.055,.22);}
export function ceramicTap(){if(!ctx||ctx.state!=='running')return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=910;env(g,t,.038,.004,.12);o.connect(g).connect(master);o.start(t);o.stop(t+.15);}
export function meow(){
  if(!audio())return;const t=ctx.currentTime,o=ctx.createOscillator(),g=ctx.createGain(),b=ctx.createBiquadFilter();
  o.type='triangle';o.frequency.setValueAtTime(540,t);o.frequency.linearRampToValueAtTime(720,t+.14);o.frequency.exponentialRampToValueAtTime(350,t+.46);
  b.type='bandpass';b.frequency.value=940;b.Q.value=1.3;env(g,t,.11,.06,.46);o.connect(b).connect(g).connect(master);o.start(t);o.stop(t+.55);
}
