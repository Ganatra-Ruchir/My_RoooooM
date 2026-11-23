// The visitor: the little explorer you control with WASD / arrow keys.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PLAYER_RADIUS = 0.34;

// Things the visitor can't walk through (floor plan, x/z). Boxes are [x0, x1, z0, z1]; circles [x, z, r].
const BOXES = [
  [-2.3, 0.7, -3.4, -0.95],   // desk + chair + Ruchir
  [1.25, 4.75, -5, -4.22],    // bookshelf
  [-5, -4.25, 1.55, 3.15],    // record player cabinet
  [-5, -4.2, 0.9, 1.75],      // record sleeves
];
const CIRCLES = [
  [-4.25, -4.25, 0.5],        // corner plant
  [0.7, 1.0, 0.66],           // coffee table
  [2.7, 2.4, 0.78],           // beanbag
  [4.45, 1.25, 0.28],         // helmet (by the door)
];
const BOUNDS = 4.62;

export function addObstacle(o) { (o.length === 3 ? CIRCLES : BOXES).push(o); }

// Move a point, sliding along furniture and walls.
export function collide(p) {
  const r = PLAYER_RADIUS;
  for (let iter = 0; iter < 2; iter++) {
    for (const [x0, x1, z0, z1] of BOXES) {
      const cx = Math.max(x0, Math.min(p.x, x1)), cz = Math.max(z0, Math.min(p.z, z1));
      const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + (dx / d) * r; p.z = cz + (dz / d) * r; }
        else {
          // inside the box: push out the shortest way
          const opts = [[p.x - x0 + r, -1, 0], [x1 - p.x + r, 1, 0], [p.z - z0 + r, 0, -1], [z1 - p.z + r, 0, 1]].sort((a, b) => a[0] - b[0]);
          p.x += opts[0][1] * opts[0][0]; p.z += opts[0][2] * opts[0][0];
        }
      }
    }
    for (const [cx, cz, cr] of CIRCLES) {
      const dx = p.x - cx, dz = p.z - cz, d = Math.hypot(dx, dz), min = cr + r;
      if (d < min) { const k = d > 1e-6 ? min / d : 1; p.x = cx + dx * k; p.z = cz + (d > 1e-6 ? dz * k : min); }
    }
    p.x = Math.max(-BOUNDS, Math.min(BOUNDS, p.x));
    p.z = Math.max(-BOUNDS, Math.min(BOUNDS, p.z));
  }
  return p;
}

export function createVisitor() {
  const root = new THREE.Group();
  root.name = 'visitor';
  const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
  const M = {
    hoodie: mat(0x2f8f83, { roughness: 0.95 }),
    hoodieDark: mat(0x247367, { roughness: 0.95 }),
    jeans: mat(0x2c3a5a, { roughness: 0.9 }),
    shoe: mat(0xf4f1ea, { roughness: 0.6 }),
    sole: mat(0xc9c3b8),
    skin: mat(0xe2b08c, { roughness: 0.6 }),
    hair: mat(0x5a3a22, { roughness: 0.7, flatShading: true }),
    eye: mat(0x1d1a18, { roughness: 0.3 }),
    pack: mat(0xe9b44c, { roughness: 0.8 }),
  };
  const add = (parent, geo, m, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true; mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r);

  const body = new THREE.Group(); root.add(body);
  // legs
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.15, 1.38, 0); body.add(hip);
    add(hip, new THREE.CapsuleGeometry(0.13, 1.0, 4, 10), M.jeans, 0, -0.62, 0);
    add(hip, rbox(0.24, 0.16, 0.4, 0.06), M.shoe, 0, -1.3, 0.07);
    add(hip, new THREE.BoxGeometry(0.25, 0.04, 0.41), M.sole, 0, -1.37, 0.07);
    legs.push(hip);
  }
  // torso (hoodie) + hood + pocket + strings
  const torso = new THREE.Group(); torso.position.y = 1.36; body.add(torso);
  add(torso, rbox(0.74, 0.98, 0.46, 0.18), M.hoodie, 0, 0.5, 0);
  add(torso, rbox(0.46, 0.22, 0.04, 0.04), M.hoodieDark, 0, 0.26, 0.23);
  add(torso, new THREE.TorusGeometry(0.2, 0.07, 8, 16, Math.PI), M.hoodieDark, 0, 0.98, -0.12).rotation.x = -0.4;
  for (const s of [-1, 1]) add(torso, new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), M.shoe, s * 0.07, 0.82, 0.235);
  // backpack
  add(torso, rbox(0.56, 0.66, 0.24, 0.08), M.pack, 0, 0.55, -0.32);
  add(torso, rbox(0.4, 0.22, 0.06, 0.04), mat(0xd39c34), 0, 0.42, -0.45);
  // arms
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.44, 0.88, 0); torso.add(sh);
    add(sh, new THREE.CapsuleGeometry(0.11, 0.62, 4, 10), M.hoodie, 0, -0.38, 0);
    add(sh, new THREE.SphereGeometry(0.1, 12, 10), M.skin, 0, -0.82, 0);
    arms.push(sh);
  }
  // head
  const head = new THREE.Group(); head.position.y = 1.12; torso.add(head);
  add(head, new THREE.SphereGeometry(0.33, 24, 18), M.skin, 0, 0.3, 0);
  add(head, new THREE.SphereGeometry(0.345, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), M.hair, 0, 0.33, -0.02).scale.set(1, 0.85, 1.02);
  add(head, new THREE.SphereGeometry(0.33, 18, 12, Math.PI * 0.75, Math.PI * 1.5, 0, Math.PI * 0.8), M.hair, 0, 0.32, -0.03).rotation.y = Math.PI;
  for (let i = 0; i < 4; i++) {
    const t = add(head, new THREE.IcosahedronGeometry(0.1, 0), M.hair, -0.15 + i * 0.1, 0.58, 0.18 - Math.abs(i - 1.5) * 0.03);
    t.rotation.set(0.9, i, 0.3); t.scale.set(1.2, 0.6, 1);
  }
  const eyes = [];
  for (const s of [-1, 1]) {
    eyes.push(add(head, new THREE.SphereGeometry(0.035, 10, 8), M.eye, s * 0.11, 0.32, 0.3));
    add(head, new THREE.SphereGeometry(0.05, 10, 8), mat(0xf2a08a, { transparent: true, opacity: 0.5 }), s * 0.18, 0.22, 0.27).castShadow = false;
  }
  const smile = add(head, new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI), M.eye, 0, 0.21, 0.31);
  smile.rotation.z = Math.PI;

  // ground shadow blob for readability
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.015; root.add(blob);
  blob.raycast = () => {};
  root.traverse((o) => { if (o.isMesh) o.raycast = () => {}; }); // the visitor never blocks clicks

  let phase = 0, moveAmt = 0, blinkAt = 2;
  function update(t, dt, speed) {
    // speed: 0 idle, ~1 walk, ~1.7 run
    moveAmt = THREE.MathUtils.damp(moveAmt, Math.min(1, speed), 10, dt);
    phase += dt * (6 + speed * 3.2) * (speed > 0.05 ? 1 : 0);
    const sw = Math.sin(phase) * 0.6 * moveAmt * Math.min(1.25, 0.6 + speed * 0.4);
    legs[0].rotation.x = sw; legs[1].rotation.x = -sw;
    arms[0].rotation.x = -sw * 0.9; arms[1].rotation.x = sw * 0.9;
    arms[0].rotation.z = -0.08; arms[1].rotation.z = 0.08;
    body.position.y = Math.abs(Math.sin(phase)) * 0.06 * moveAmt + Math.sin(t * 2) * 0.01 * (1 - moveAmt);
    torso.rotation.x = 0.08 * moveAmt * Math.min(1.5, speed);
    head.rotation.x = -0.05 * moveAmt;
    if (t > blinkAt) { blinkAt = t + 2.5 + Math.random() * 3; eyes.forEach((e) => (e.scale.y = 0.15)); setTimeout(() => eyes.forEach((e) => (e.scale.y = 1)), 110); }
  }
  function lookAt(local) { head.rotation.y = local; }

  return { root, update, lookAt, head };
}
