// First-person viewmodel: white rolled sleeves, natural skin, wristwatch and ring.
// Drawn in camera coordinates, separate from the world character. Never blocks raycasts.
import * as THREE from 'three';
export function createFirstPersonArms() {
  const root = new THREE.Group();
  root.name = 'ruchir-first-person-arms';
  const mat = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...options });
  const shirt = mat(0xf3efe9, { roughness: 0.91, side: THREE.DoubleSide });
  const folds = mat(0xd7d0c6, { roughness: 0.94 });
  const skin = mat(0xbe8869, { roughness: 0.67 });
  const metal = mat(0xadb5bf, { metalness: 0.83, roughness: 0.22 });
  const face = mat(0x29323b, { metalness: 0.68, roughness: 0.23 });
  const ring = mat(0x24252a, { metalness: 0.7, roughness: 0.24 });
  const hands = [];
  function add(parent, geo, material, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.raycast = () => {}; // interaction remains focused on real room objects
    mesh.castShadow = false; mesh.receiveShadow = false;
    parent.add(mesh); return mesh;
  }
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.57, -0.49, -0.87);
    arm.rotation.set(-0.18, side * -0.18, side * 0.2);
    root.add(arm);
    const sleeve = add(arm, new THREE.CylinderGeometry(0.16, 0.2, 0.68, 14, 1), shirt, -side * 0.03, -0.32, 0.09);
    sleeve.rotation.x = -0.56;
    add(arm, new THREE.CylinderGeometry(0.158, 0.158, 0.09, 14), folds, 0, -0.04, 0.015).rotation.x = -0.49;
    add(arm, new THREE.CapsuleGeometry(0.103, 0.28, 6, 14), skin, 0, 0.16, -0.15).rotation.x = -0.42;
    const palm = add(arm, new THREE.SphereGeometry(0.12, 18, 14), skin, 0, 0.3, -0.26);
    palm.scale.set(1.04, 0.65, 1.33);
    // A watch on the left wrist, and a subtle dark metal ring on the right hand.
    if (side === -1) {
      add(arm, new THREE.TorusGeometry(0.108, 0.022, 8, 22), metal, 0, 0.10, -0.12).rotation.x = 0.42;
      const dial = add(arm, new THREE.CylinderGeometry(0.07, 0.07, 0.024, 22), face, 0, 0.16, -0.015);
      dial.rotation.x = Math.PI / 2 - 0.35;
      add(arm, new THREE.TorusGeometry(0.072, 0.007, 8, 24), metal, 0, 0.16, 0).rotation.x = Math.PI / 2 - 0.35;
    } else {
      const band = add(arm, new THREE.TorusGeometry(0.04, 0.009, 8, 16), ring, -0.082, 0.34, -0.31);
      band.rotation.x = Math.PI / 2;
    }
    hands.push(arm);
  }
  // Camera-space lighting avoids blacked-out hands in darker corners.
  const rim = new THREE.PointLight(0xffe9d1, 0.6, 3, 2);
  rim.position.set(0, 0.45, -0.35);
  root.add(rim);
  let step = 0, moveMix = 0, focusMix = 0;
  function update(t, dt, speed, talking = false, reduced = false) {
    const target = THREE.MathUtils.clamp(speed / 2.6, 0, 1);
    moveMix = THREE.MathUtils.damp(moveMix, talking ? 0 : target, 7, dt);
    focusMix = THREE.MathUtils.damp(focusMix, talking ? 1 : 0, 6, dt);
    step += dt * (4.4 + target * 4);
    const amp = (reduced ? 0.3 : 1) * moveMix;
    hands.forEach((arm, i) => {
      const side = i === 0 ? -1 : 1;
      arm.position.y = -0.56 + Math.sin(step * 1.9 + i * Math.PI) * 0.07 * amp
        + Math.sin(t * 1.8 + i) * 0.007;
      arm.position.x = side * (0.57 + Math.cos(step + i * Math.PI) * 0.02 * amp);
      arm.rotation.x = -0.18 + Math.sin(step + i * Math.PI) * 0.1 * amp + focusMix * 0.08;
      arm.rotation.z = side * (0.2 + focusMix * 0.09);
    });
    root.position.y = Math.sin(t * 1.4) * 0.008;
  }
  return { root, update };
}
