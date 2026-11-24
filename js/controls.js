// Keyboard (W/S or ↑/↓ walk, A/D sidestep, ←/→ turn, Shift run, E, M, F, H)
// and the on-screen joystick for touch screens.
const MOVE = { w: [0, 1], arrowup: [0, 1], s: [0, -1], arrowdown: [0, -1], a: [-1, 0], d: [1, 0] };
const TURN = { arrowleft: 1, arrowright: -1 };

export function createControls({ room, ui }) {
  const keys = new Set();
  const joy = { x: 0, y: 0 };
  const typing = () => {
    const a = document.activeElement;
    return !!a && (/^(input|textarea|select)$/i.test(a.tagName) || a.isContentEditable);
  };
  function sync() {
    let x = 0, y = 0, turn = 0;
    for (const k of keys) {
      if (MOVE[k]) { x += MOVE[k][0]; y += MOVE[k][1]; }
      if (TURN[k]) turn += TURN[k];
    }
    room.setInput({ x: Math.max(-1, Math.min(1, x + joy.x)), y: Math.max(-1, Math.min(1, y + joy.y)), turn: Math.max(-1, Math.min(1, turn)), run: keys.has('shift') });
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || typing() || ui.blocksGameKeys()) return;
    const k = e.key.toLowerCase();
    if (MOVE[k] || TURN[k] || k === 'shift') {
      keys.add(k); sync();
      if (k.startsWith('arrow')) e.preventDefault();
      ui.hideHelpSoon();
      return;
    }
    if (e.repeat) return;
    if ((k === ' ' || k === 'enter') && document.activeElement?.closest?.('button, a, [role="button"]')) return;
    if (k === 'e' || k === ' ' || k === 'enter') { if (room.interact()) e.preventDefault(); return; }
    if (k === 'f') ui.toggleFullscreen();
    if (k === 'h' || k === '?') ui.toggleHelp();
  });
  document.addEventListener('keyup', (e) => { keys.delete(e.key.toLowerCase()); if (e.key === 'Shift') keys.delete('shift'); sync(); });
  window.addEventListener('blur', () => { keys.clear(); sync(); });
  // mouse look while the pointer is locked (after "Click to play")
  document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement && document.pointerLockElement.id === 'room') room.look(e.movementX || 0, e.movementY || 0);
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { keys.clear(); sync(); } });

  // ---------- Joystick ----------
  const base = document.getElementById('joy');
  const knob = document.getElementById('joyKnob');
  const R = 38;
  let active = null;
  function move(e) {
    const r = base.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const norm=Math.min(1,Math.hypot(dx,dy)/R);
    const strength=norm<.12?0:Math.pow((norm-.12)/.88,1.15);
    const k=norm>0?strength/(norm*R):0;
    joy.x=dx*k;joy.y=-dy*k;
    sync();
  }
  base?.addEventListener('pointerdown', (e) => { if(active!==null)return; e.preventDefault(); active = e.pointerId; base.setPointerCapture(e.pointerId); base.classList.add('on'); move(e); ui.hideHelpSoon(); });
  base?.addEventListener('pointermove', (e) => { if (e.pointerId === active) move(e); });
  const end = (e) => {
    if (e.pointerId !== active) return;
    active = null; joy.x = 0; joy.y = 0;
    knob.style.transform = '';
    base.classList.remove('on');
    sync();
  };
  base?.addEventListener('pointerup', end);
  base?.addEventListener('pointercancel', end);
  base?.addEventListener('lostpointercapture',end);
  window.addEventListener('blur',()=>{if(active!==null)end({pointerId:active});});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&active!==null)end({pointerId:active});});

  document.getElementById('actBtn')?.addEventListener('click', () => room.interact());

  return { reset() { keys.clear(); joy.x = joy.y = 0; sync(); } };
}
