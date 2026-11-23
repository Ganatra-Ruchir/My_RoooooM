// Ruchir's 3D avatar, styled after his character art: wavy black hair, thin
// silver glasses, short beard, white shirt with rolled sleeves, black
// high-waisted trousers, black loafers and a silver watch.
// Arms use a tiny two-bone IK so the hands can type, then wave on hover.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const COLORS = {
  skin: 0xb9825d, shirt: 0xf2eee7, shirtDark: 0xd8d2c6, pants: 0x1b1b1f,
  hair: 0x16120f, frame: 0xc9ccd2, shoe: 0x0f0f10, watch: 0xc9ccd2, chair: 0x343844, metal: 0x8b8f99,
};

const UP_NEG = new THREE.Vector3(0, -1, 0);
const L1 = 0.5, L2 = 0.48; // upper arm, forearm

export function createAvatar() {
  const root = new THREE.Group();
  root.name = 'avatar';
  const materials = [];
  const mat = (color, opts = {}) => {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...opts });
    materials.push(m);
    return m;
  };
  const M = {
    skin: mat(COLORS.skin, { roughness: 0.55 }),
    shirt: mat(COLORS.shirt, { roughness: 0.95 }),
    shirtDark: mat(COLORS.shirtDark, { roughness: 0.95 }),
    pants: mat(COLORS.pants, { roughness: 0.9 }),
    hair: mat(COLORS.hair, { roughness: 0.6, flatShading: true }),
    frame: mat(COLORS.frame, { roughness: 0.3, metalness: 0.8 }),
    shoe: mat(COLORS.shoe, { roughness: 0.25 }),
    watch: mat(COLORS.watch, { roughness: 0.25, metalness: 0.85 }),
    eye: mat(0x1a1410, { roughness: 0.3 }),
    chair: mat(COLORS.chair, { roughness: 0.9 }),
    metal: mat(COLORS.metal, { roughness: 0.35, metalness: 0.7 }),
  };
  const add = (parent, geo, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const rbox = (w, h, d, r = 0.06) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.99);

  // ---------- Chair ----------
  const chair = new THREE.Group();
  add(chair, rbox(0.86, 0.14, 0.8, 0.06), M.chair, 0, 0.9, 0.02);
  const back = add(chair, rbox(0.84, 1.0, 0.13, 0.06), M.chair, 0, 1.55, -0.4);
  back.rotation.x = -0.1;
  add(chair, new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), M.metal, 0, 1.1, -0.36).rotation.x = -0.1;
  add(chair, new THREE.CylinderGeometry(0.05, 0.05, 0.72, 10), M.metal, 0, 0.47, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spoke = add(chair, new THREE.BoxGeometry(0.06, 0.05, 0.42), M.metal, Math.sin(a) * 0.21, 0.12, Math.cos(a) * 0.21);
    spoke.rotation.y = a;
    add(chair, new THREE.SphereGeometry(0.05, 8, 6), M.chair, Math.sin(a) * 0.42, 0.05, Math.cos(a) * 0.42);
  }
  root.add(chair);
  const person = new THREE.Group(); // everything but the chair
  root.add(person);

  // ---------- Legs (seated) ----------
  add(person, rbox(0.68, 0.28, 0.5, 0.1), M.pants, 0, 1.1, -0.02);
  // high waistband with side buckles
  add(person, rbox(0.74, 0.12, 0.5, 0.04), M.pants, 0, 1.27, -0.02);
  for (const s of [-1, 1]) add(person, new THREE.BoxGeometry(0.06, 0.06, 0.02), M.watch, s * 0.3, 1.28, 0.23);
  for (const s of [-1, 1]) {
    add(person, rbox(0.27, 0.25, 0.72, 0.1), M.pants, s * 0.17, 1.08, 0.3);
    add(person, rbox(0.23, 0.86, 0.25, 0.09), M.pants, s * 0.19, 0.6, 0.63);
    add(person, rbox(0.26, 0.15, 0.42, 0.06), M.shoe, s * 0.19, 0.09, 0.72);
  }

  // ---------- Torso ----------
  const torso = new THREE.Group();
  torso.position.set(0, 1.18, -0.03);
  person.add(torso);
  add(torso, rbox(0.8, 0.88, 0.46, 0.15), M.shirt, 0, 0.44, 0);
  // placket, buttons, collar, pocket
  add(torso, new THREE.BoxGeometry(0.07, 0.7, 0.02), M.shirtDark, 0, 0.42, 0.235);
  for (let i = 0; i < 4; i++) add(torso, new THREE.SphereGeometry(0.018, 8, 6), M.shirtDark, 0, 0.2 + i * 0.15, 0.25);
  for (const s of [-1, 1]) {
    const col = add(torso, new THREE.BoxGeometry(0.2, 0.06, 0.16), M.shirtDark, s * 0.1, 0.87, 0.14);
    col.rotation.set(0.5, 0, s * -0.45);
  }
  add(torso, new THREE.BoxGeometry(0.17, 0.16, 0.02), M.shirtDark, -0.2, 0.62, 0.236);
  add(torso, new THREE.CylinderGeometry(0.105, 0.115, 0.16, 12), M.skin, 0, 0.94, 0.01);
  // V of skin at the open collar
  const vee = add(torso, new THREE.CylinderGeometry(0.0, 0.08, 0.16, 3), M.skin, 0, 0.8, 0.2);
  vee.rotation.set(Math.PI, 0, 0);

  const shoulders = [new THREE.Object3D(), new THREE.Object3D()];
  shoulders[0].position.set(-0.45, 0.76, 0.0);
  shoulders[1].position.set(0.45, 0.76, 0.0);
  shoulders.forEach((s) => torso.add(s));
  for (const s of [-1, 1]) add(torso, new THREE.SphereGeometry(0.15, 14, 10), M.shirt, s * 0.4, 0.75, 0);

  // ---------- Head ----------
  const head = new THREE.Group();
  head.position.set(0, 1.0, 0.01);
  torso.add(head);
  const skull = add(head, new THREE.SphereGeometry(0.3, 28, 20), M.skin, 0, 0.3, 0);
  skull.scale.set(0.94, 1.08, 1);
  add(head, new THREE.SphereGeometry(0.2, 18, 12), M.skin, 0, 0.16, 0.06).scale.set(1.05, 0.9, 1.05); // jaw
  for (const s of [-1, 1]) add(head, new THREE.SphereGeometry(0.06, 10, 8), M.skin, s * 0.285, 0.3, -0.01).scale.set(0.5, 1, 0.8);
  const nose = add(head, new THREE.SphereGeometry(0.045, 10, 8), M.skin, 0, 0.26, 0.29);
  nose.scale.set(0.9, 1.2, 1);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = add(head, new THREE.SphereGeometry(0.032, 10, 8), M.eye, s * 0.105, 0.335, 0.265);
    eyes.push(e);
    const brow = add(head, new THREE.BoxGeometry(0.11, 0.025, 0.03), M.hair, s * 0.11, 0.405, 0.27);
    brow.rotation.z = s * -0.12;
  }
  // mustache + goatee
  for (const s of [-1, 1]) {
    const m = add(head, new THREE.BoxGeometry(0.1, 0.025, 0.03), M.hair, s * 0.05, 0.19, 0.275);
    m.rotation.z = s * 0.28;
  }
  add(head, new THREE.BoxGeometry(0.08, 0.06, 0.04), M.hair, 0, 0.065, 0.225);
  // short beard along the jaw
  const beard = add(head, new THREE.SphereGeometry(0.207, 20, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
    mat(COLORS.hair, { transparent: true, opacity: 0.55, roughness: 1 }), 0, 0.165, 0.06);
  beard.scale.set(1.05, 0.9, 1.05);
  beard.castShadow = false;
  add(head, new THREE.BoxGeometry(0.07, 0.012, 0.02), mat(0x6d3b2b), 0, 0.15, 0.27); // mouth

  // glasses: thick black rectangular frames
  const glasses = new THREE.Group();
  glasses.position.set(0, 0.335, 0.305);
  head.add(glasses);
  for (const s of [-1, 1]) {
    const rim = add(glasses, new THREE.TorusGeometry(0.08, 0.008, 6, 4), M.frame, s * 0.108, 0, 0);
    rim.rotation.z = Math.PI / 4;
    rim.scale.set(1.3, 0.95, 1);
    const lens = add(glasses, new THREE.PlaneGeometry(0.16, 0.11), new THREE.MeshStandardMaterial({ color: 0xbfd6ff, transparent: true, opacity: 0.18, roughness: 0.05 }), s * 0.108, 0, -0.004);
    lens.castShadow = false;
    const arm = add(glasses, new THREE.BoxGeometry(0.018, 0.022, 0.3), M.frame, s * 0.2, 0.01, -0.15);
    arm.rotation.y = s * -0.12;
  }
  add(glasses, new THREE.BoxGeometry(0.06, 0.018, 0.02), M.frame, 0, 0.02, 0);

  // hair: a cap plus flat-shaded tufts and a fringe sweeping to one side
  const hair = new THREE.Group();
  head.add(hair);
  add(hair, new THREE.SphereGeometry(0.315, 18, 14), M.hair, 0, 0.405, -0.04).scale.set(1.06, 0.8, 1.04);
  add(hair, new THREE.SphereGeometry(0.3, 16, 12), M.hair, 0, 0.3, -0.09).scale.set(1.04, 0.95, 0.92);
  const tuft = (x, y, z, s, rx, ry, rz, sx = 1, sy = 1, sz = 1) => {
    const t = add(hair, new THREE.IcosahedronGeometry(s, 0), M.hair, x, y, z);
    t.rotation.set(rx, ry, rz); t.scale.set(sx, sy, sz);
  };
  tuft(-0.12, 0.6, 0.02, 0.14, 0.3, 0.2, 0.4, 1.2, 0.7, 1);
  tuft(0.1, 0.62, -0.02, 0.15, -0.2, 0.5, -0.3, 1.2, 0.7, 1);
  tuft(0.0, 0.66, 0.08, 0.13, 0.6, 0.1, 0.1, 1.1, 0.6, 1.1);
  tuft(-0.2, 0.55, -0.12, 0.13, 0.2, 0.8, 0.5);
  tuft(0.2, 0.55, -0.12, 0.13, -0.4, 0.3, -0.6);
  tuft(0.0, 0.58, -0.2, 0.15, 0.1, 0.4, 0.2, 1.2, 0.8, 1);
  // fringe over the forehead, swept to his right
  tuft(-0.1, 0.5, 0.22, 0.1, 1.0, 0.2, 0.5, 1.3, 0.55, 0.9);
  tuft(0.04, 0.49, 0.25, 0.1, 1.1, -0.2, -0.4, 1.4, 0.5, 0.9);
  tuft(0.16, 0.47, 0.21, 0.09, 1.0, 0.3, -0.7, 1.2, 0.55, 0.9);
  tuft(-0.21, 0.45, 0.16, 0.08, 0.8, 0.5, 0.9, 1.0, 0.7, 0.9);
  for (const s of [-1, 1]) add(hair, new THREE.BoxGeometry(0.05, 0.14, 0.08), M.hair, s * 0.27, 0.33, 0.06);

  // ---------- Arms (IK driven) ----------
  function buildArm(side) {
    const upper = new THREE.Group();
    add(upper, new THREE.CapsuleGeometry(0.105, L1 - 0.14, 4, 10), M.shirt, 0, -L1 / 2, 0);
    const fore = new THREE.Group();
    add(fore, new THREE.CylinderGeometry(0.11, 0.1, 0.14, 12), M.shirtDark, 0, -0.06, 0); // rolled sleeve
    add(fore, new THREE.CapsuleGeometry(0.07, L2 - 0.1, 4, 10), M.skin, 0, -L2 / 2 - 0.02, 0);
    const hand = add(fore, rbox(0.13, 0.15, 0.07, 0.03), M.skin, 0, -L2 - 0.05, 0);
    if (side < 0) {
      const w = add(fore, new THREE.TorusGeometry(0.08, 0.022, 8, 16), M.watch, 0, -L2 + 0.06, 0);
      w.rotation.x = Math.PI / 2;
      add(fore, new THREE.BoxGeometry(0.06, 0.03, 0.07), M.watch, 0.07, -L2 + 0.06, 0);
    }
    person.add(upper, fore);
    return { upper, fore, hand, side };
  }
  const arms = [buildArm(-1), buildArm(1)];

  root.traverse((o) => { if (o.isMesh) o.userData.avatar = true; });

  // ---------- Animation ----------
  const tmp = { S: new THREE.Vector3(), H: new THREE.Vector3(), E: new THREE.Vector3(), d: new THREE.Vector3(), p: new THREE.Vector3(), v: new THREE.Vector3() };
  function solveArm(arm, shoulderObj, target, pole) {
    shoulderObj.getWorldPosition(tmp.S); root.worldToLocal(tmp.S);
    tmp.d.copy(target).sub(tmp.S);
    let dist = tmp.d.length();
    dist = Math.min(dist, (L1 + L2) * 0.995);
    tmp.d.normalize();
    const a = (L1 * L1 - L2 * L2 + dist * dist) / (2 * dist);
    const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    tmp.p.copy(pole).addScaledVector(tmp.d, -pole.dot(tmp.d)).normalize();
    tmp.E.copy(tmp.S).addScaledVector(tmp.d, a).addScaledVector(tmp.p, h);
    tmp.H.copy(tmp.S).addScaledVector(tmp.d, dist);
    arm.upper.position.copy(tmp.S);
    arm.upper.quaternion.setFromUnitVectors(UP_NEG, tmp.v.copy(tmp.E).sub(tmp.S).normalize());
    arm.fore.position.copy(tmp.E);
    arm.fore.quaternion.setFromUnitVectors(UP_NEG, tmp.v.copy(tmp.H).sub(tmp.E).normalize());
  }

  const state = { wave: 0, look: 0, nextGlance: 6, glanceUntil: 0, nextBlink: 2 };
  const targets = [new THREE.Vector3(), new THREE.Vector3()];
  const poles = [new THREE.Vector3(-0.8, -1, -0.4), new THREE.Vector3(0.8, -1, -0.4)];
  const camLocal = new THREE.Vector3();

  function update(t, dt, { hovered, attentive = false, camera, reduced, lookAt = null, talking = false }) {
    const speed = reduced ? 0.3 : 1;
    // breathing + slight forward lean toward the laptop
    torso.rotation.x = 0.1 + Math.sin(t * 1.5) * 0.012;
    torso.scale.y = 1 + Math.sin(t * 1.5) * 0.008;

    state.wave = THREE.MathUtils.damp(state.wave, hovered ? 1 : 0, 6, dt);
    if (t > state.nextGlance) { state.glanceUntil = t + 2.2; state.nextGlance = t + 7 + Math.random() * 6; }
    const glancing = hovered || attentive || t < state.glanceUntil;
    state.look = THREE.MathUtils.damp(state.look, glancing ? 1 : 0, 4, dt);

    // head: down at the screen, or toward the visitor
    camLocal.copy(lookAt || camera.position); root.worldToLocal(camLocal);
    const yaw = THREE.MathUtils.clamp(Math.atan2(camLocal.x - 0, camLocal.z - 0), -0.75, 0.75);
    head.rotation.y = THREE.MathUtils.lerp(Math.sin(t * 0.4) * 0.05, yaw, state.look);
    head.rotation.x = THREE.MathUtils.lerp(0.28 + Math.sin(t * 2.1) * 0.015, -0.12, state.look) + (talking ? Math.sin(t * 9) * 0.03 : 0);
    head.rotation.z = THREE.MathUtils.lerp(0, -0.08, state.wave);

    // blink
    if (t > state.nextBlink) { state.nextBlink = t + 2.5 + Math.random() * 3; state.blinkUntil = t + 0.12; }
    const sy = t < (state.blinkUntil || 0) ? 0.15 : 1;
    eyes.forEach((e) => (e.scale.y = sy));

    // hands: typing on the laptop keyboard
    for (let i = 0; i < 2; i++) {
      const s = i === 0 ? -1 : 1;
      const ph = i * 1.7;
      const tap = talking ? 0 : Math.max(0, Math.sin(t * 16 * speed + ph)) * 0.035 * speed;
      targets[i].set(s * 0.17 + Math.sin(t * 2.3 + ph) * 0.035, 1.55 + tap, 0.8 + Math.sin(t * 1.3 + ph) * 0.02);
    }
    // right hand waves when hovered
    if (state.wave > 0.001) {
      const waveT = new THREE.Vector3(0.62 + Math.sin(t * 9) * 0.12, 2.45, 0.35);
      targets[1].lerp(waveT, state.wave);
      poles[1].set(THREE.MathUtils.lerp(0.8, 1, state.wave), THREE.MathUtils.lerp(-1, -0.4, state.wave), THREE.MathUtils.lerp(-0.4, 0.2, state.wave));
    } else poles[1].set(0.8, -1, -0.4);
    root.updateMatrixWorld(true);
    solveArm(arms[0], shoulders[0], targets[0], poles[0]);
    solveArm(arms[1], shoulders[1], targets[1], poles[1]);
    // hands lie flat when typing, palm forward when waving
    arms[1].hand.rotation.y = state.wave * 1.2;
  }

  function setHighlight(amount) {
    materials.forEach((m) => { m.emissive.setRGB(1, 0.75, 0.5); m.emissiveIntensity = amount * 0.12; });
  }

  return { root, person, chair, update, setHighlight, head };
}
