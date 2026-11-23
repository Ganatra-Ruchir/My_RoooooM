// Rule-based NPC companions for Ruchir's room.
// Perception + memory + utility priorities + finite state machine. No network, no AI claims.
import * as THREE from 'three';
import { collide } from './player.js';

const PEOPLE = [
  {
    name: 'Maya', role: 'Creative collaborator',
    seed: 17, skin: 0xc78d68, hair: 0x201815, jacket: 0x715747, shirt: 0xe8cbb7, pants: 0x282833,
    waypoints: [[2.75, -2.8], [3.45, -0.8], [3.65, 1.25], [2.5, 3.6]],
    lines: [
      'The best ideas start when you explore, not when you scroll.',
      'That project shelf is full of experiments. Take a closer look.',
      'Ruchir loves turning confusing data into something people can use.',
      'Look around the room — even the small objects have stories.',
    ],
  },
  {
    name: 'Dev', role: 'Developer & friend',
    seed: 53, skin: 0xb67c55, hair: 0x171a1e, jacket: 0x384d5b, shirt: 0xddd9ce, pants: 0x24252b,
    waypoints: [[-2.9, 1.2], [-1.9, 2.25], [-3.1, 3.55], [-3.6, 2.0]],
    lines: [
      'Every object here has an interaction. Try the E key.',
      'The certificates are on the green wall to your left.',
      'Great interfaces should feel alive, but still work on a phone.',
      'The record player and the cat are worth finding.',
    ],
  },
];
const clamp = THREE.MathUtils.clamp;
const distance2 = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function rand(a) { a.seed = (1664525 * a.seed + 1013904223) >>> 0; return a.seed / 4294967296; }
function makeNPC(spec, index) {
  const root = new THREE.Group();
  root.name = 'npc-' + spec.name.toLowerCase();
  root.position.set(...[spec.waypoints[0][0], 0, spec.waypoints[0][1]]);
  const mat = (c, p = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.76, ...p });
  const M = {
    skin: mat(spec.skin, { roughness: 0.68 }),
    hair: mat(spec.hair, { roughness: 0.83 }),
    jacket: mat(spec.jacket, { roughness: 0.93 }),
    shirt: mat(spec.shirt, { roughness: 0.82 }),
    pants: mat(spec.pants, { roughness: 0.93 }),
    shoe: mat(0x141518, { roughness: 0.35 }),
    eyes: mat(0x181718, { roughness: 0.27 }),
    metal: mat(0xb9aa93, { metalness: 0.72, roughness: 0.26 }),
  };
  function add(parent, geometry, material, x = 0, y = 0, z = 0) {
    const o = new THREE.Mesh(geometry, material);
    o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true;
    // Never block the first-person centre-ray used for portfolio object interactions.
    o.raycast = () => {};
    parent.add(o);
    return o;
  }
  const body = new THREE.Group(); root.add(body);
  const legs = [], arms = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(side * 0.16, 1.3, 0); body.add(leg);
    add(leg, new THREE.CapsuleGeometry(0.135, 0.91, 5, 12), M.pants, 0, -0.57, 0);
    add(leg, new THREE.BoxGeometry(0.24, 0.15, 0.4), M.shoe, 0, -1.25, 0.07);
    legs.push(leg);
  }
  const spine = new THREE.Group(); spine.position.y = 1.32; body.add(spine);
  add(spine, new THREE.CapsuleGeometry(0.34, 0.55, 7, 18), M.jacket, 0, 0.50, 0);
  add(spine, new THREE.BoxGeometry(0.24, 0.67, 0.052), M.shirt, 0, 0.49, 0.323);
  // Jacket seam and pockets give readable detail under low light.
  for (const side of [-1, 1]) {
    add(spine, new THREE.BoxGeometry(0.12, 0.018, 0.02), M.metal, side * 0.21, 0.35, 0.315);
    const shoulder = new THREE.Group(); shoulder.position.set(side * 0.39, 0.81, 0); spine.add(shoulder);
    add(shoulder, new THREE.CapsuleGeometry(0.105, 0.64, 5, 12), M.jacket, 0, -0.42, 0);
    add(shoulder, new THREE.SphereGeometry(0.09, 12, 8), M.skin, 0, -0.84, 0);
    arms.push(shoulder);
  }
  const neck = add(spine, new THREE.CylinderGeometry(0.105, 0.12, 0.2, 12), M.skin, 0, 1.03, 0);
  neck.rotation.x = 0.04;
  const head = new THREE.Group(); head.position.set(0, 1.12, 0.01); spine.add(head);
  add(head, new THREE.SphereGeometry(0.285, 28, 20), M.skin, 0, 0.24, 0).scale.set(0.94, 1.07, 0.94);
  add(head, new THREE.SphereGeometry(0.25, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.54), M.hair, 0, 0.33, -0.035).scale.set(1.16, 0.9, 1.11);
  for (let n = 0; n < 9; n++) {
    const a = (n / 9) * Math.PI * 2;
    const curl = add(head, new THREE.SphereGeometry(0.072 + n % 3 * 0.01, 10, 9), M.hair, Math.cos(a) * 0.2, 0.43 + (n % 3) * 0.035, Math.sin(a) * 0.18);
    curl.scale.set(1.2, 0.58, 0.9);
  }
  for (const side of [-1, 1]) {
    add(head, new THREE.SphereGeometry(0.037, 12, 10), M.eyes, side * 0.108, 0.255, 0.264);
    add(head, new THREE.SphereGeometry(0.014, 8, 6), M.shirt, side * 0.119, 0.266, 0.296).castShadow = false;
  }
  add(head, new THREE.SphereGeometry(0.045, 10, 8), M.skin, 0, 0.17, 0.272).scale.set(0.8, 1.3, 0.85);
  const mouth = add(head, new THREE.TorusGeometry(0.062, 0.009, 7, 18, Math.PI), M.hair, 0, 0.097, 0.253);
  mouth.rotation.z = Math.PI;
  // Dev has low-profile frames, Maya wears a small earring.
  if (index === 1) {
    for (const side of [-1, 1]) {
      add(head, new THREE.TorusGeometry(0.086, 0.007, 5, 4), M.metal, side * 0.108, 0.26, 0.287).rotation.z = Math.PI / 4;
    }
    add(head, new THREE.BoxGeometry(0.052, 0.016, 0.015), M.metal, 0, 0.268, 0.29);
  } else {
    add(head, new THREE.TorusGeometry(0.032, 0.007, 6, 16), M.metal, -0.269, 0.15, 0.025);
  }
  const blob = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: 0x0b0a08, transparent: true, opacity: 0.17, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = 0.015; blob.raycast = () => {};
  root.add(blob);
  return { root, body, head, legs, arms };
}
// A furniture-height occlusion approximation for close-range social perception.
const OCCLUDERS = [[-2.45, 0.9, -3.5, -0.95], [1.2, 4.8, -5, -4.15], [-5, -4.2, 1.45, 3.2]];
function canSee(a, b) {
  for (const [x0, x1, z0, z1] of OCCLUDERS) {
    for (let s = 1; s < 9; s++) {
      const k = s / 9, x = a.x + (b.x - a.x) * k, z = a.z + (b.z - a.z) * k;
      if (x > x0 && x < x1 && z > z0 && z < z1) return false;
    }
  }
  return true;
}
export function createNPCSystem({ scene, onGreet = () => {}, reducedMotion = false }) {
  const agents = PEOPLE.map((spec, index) => ({
    ...makeNPC(spec, index), spec, index, seed: spec.seed,
    state: 'idle', stateUntil: 2 + index, waypoint: 0, cooldown: 0,
    animation: 0, moveMix: 0, greeted: false, line: 0, blocked: 0, targetYaw: index ? 0.4 : -0.9,
  }));
  agents.forEach(a => scene.add(a.root));
  function setState(a, state, until) { if (a.state !== state) a.state = state; a.stateUntil = until; }
  function update(time, dt, player, playerSpeed = 0) {
    for (const a of agents) {
      const p = a.root.position, d = distance2(p, player);
      let walking = 0;
      if (a.guideTarget) {
        // Authored guide overrides autonomous roaming during the uninterruptible first-person intro.
        const dx = a.guideTarget.x - p.x, dz = a.guideTarget.z - p.z;
        const distance = Math.hypot(dx, dz);
        if (distance > 0.09) {
          const step = Math.min(distance, dt * 2.2);
          const ox = p.x, oz = p.z;
          p.x += dx / distance * step; p.z += dz / distance * step;
          collide(p);
          walking = Math.min(1, Math.hypot(p.x - ox, p.z - oz) / Math.max(step, 0.001));
          a.targetYaw = Math.atan2(dx, dz);
          a.state = 'roam';
        } else {
          a.state = 'observe';
          a.targetYaw = Math.atan2(player.x - p.x, player.z - p.z);
        }
      } else {
      const visible = d < 4.2 && canSee(p, player);
      const sight = visible && (Math.cos(Math.atan2(player.x - p.x, player.z - p.z) - a.root.rotation.y) > -0.45 || d < 2);
      // Memory-based social reaction: one greeting per approach, then cooldown.
      if (!visible && d > 4.6) a.greeted = false;
      if (sight && d < 2.6 && !a.greeted && time > a.cooldown && a.state !== 'converse') {
        a.greeted = true; a.cooldown = time + 24;
        setState(a, 'greet', time + 2.8);
        onGreet(a.index, a.spec.name + ': Hey! Come say hi.');
      }
      // Utility priorities: conversation > greeting > social attention > routine.
      if (a.state === 'converse' && time < a.stateUntil) {
        a.targetYaw = Math.atan2(player.x - p.x, player.z - p.z);
      } else if (a.state === 'greet' && time < a.stateUntil) {
        a.targetYaw = Math.atan2(player.x - p.x, player.z - p.z);
      } else if (sight && d < 2.0 && playerSpeed < 1.2) {
        setState(a, 'observe', time + 1.25);
        a.targetYaw = Math.atan2(player.x - p.x, player.z - p.z);
      } else if (time >= a.stateUntil) {
        if (a.state === 'roam') {
          a.waypoint = (a.waypoint + 1) % a.spec.waypoints.length;
          setState(a, 'idle', time + 2 + rand(a) * 3);
        } else if (a.state === 'idle' && rand(a) < 0.24) {
          setState(a, 'observe', time + 1.2 + rand(a) * 1.4);
          a.targetYaw += (rand(a) - 0.5) * 1.2;
        } else {
          setState(a, 'roam', time + 12);
        }
      }
      if (a.state === 'roam') {
        const wp = a.spec.waypoints[a.waypoint], dx = wp[0] - p.x, dz = wp[1] - p.z;
        const len = Math.hypot(dx, dz);
        if (len < 0.2) {
          setState(a, 'idle', time + 2.5 + rand(a) * 3);
          a.waypoint = (a.waypoint + 1) % a.spec.waypoints.length;
        } else {
          a.targetYaw = Math.atan2(dx, dz);
          const speed = reducedMotion ? 0.4 : 0.72;
          const oldX = p.x, oldZ = p.z;
          p.x += dx / len * speed * dt; p.z += dz / len * speed * dt;
          collide(p);
          const gained = Math.hypot(p.x - oldX, p.z - oldZ);
          walking = clamp(gained / Math.max(dt, 0.001) / speed, 0, 1);
          a.blocked = gained < speed * dt * 0.2 ? a.blocked + dt : 0;
          if (a.blocked > 0.9) {
            a.waypoint = (a.waypoint + 1) % a.spec.waypoints.length;
            setState(a, 'idle', time + 2.6);
            a.blocked = 0;
          }
        }
      }
      }
      let diff = Math.atan2(Math.sin(a.targetYaw - a.root.rotation.y), Math.cos(a.targetYaw - a.root.rotation.y));
      a.root.rotation.y += diff * Math.min(1, dt * 4);
      a.moveMix = THREE.MathUtils.damp(a.moveMix, walking, 5, dt);
      a.animation += dt * (4.8 + a.moveMix * 2.4);
      const swing = Math.sin(a.animation) * 0.62 * a.moveMix;
      a.legs[0].rotation.x = swing; a.legs[1].rotation.x = -swing;
      a.arms[0].rotation.x = -swing * 0.7; a.arms[1].rotation.x = swing * 0.7;
      if (a.state === 'greet') a.arms[1].rotation.x = -1.2 + Math.sin(time * 8) * 0.24;
      if (a.state === 'converse') a.arms[1].rotation.x = -0.4 + Math.sin(time * 5) * 0.16;
      a.body.position.y = Math.abs(Math.sin(a.animation)) * 0.055 * a.moveMix + Math.sin(time * 1.7 + a.index) * 0.009;
      a.head.rotation.y = a.state === 'observe' ? Math.sin(time * 0.4 + a.index) * 0.11 : 0;
      a.head.rotation.x = Math.sin(time * 1.7 + a.index) * 0.015;
    }
  }
  function interact(index, time) {
    const a = agents[index];
    if (!a) return null;
    a.greeted = true; a.cooldown = time + 16;
    setState(a, 'converse', time + 5);
    const line = a.spec.lines[a.line++ % a.spec.lines.length];
    return { name: a.spec.name, role: a.spec.role, text: line, index };
  }
  return {
    update, interact,
    setTourGuide(index, x, z, snap = false) {
      const a = agents[index]; if (!a) return;
      if (!a.guideTarget) a.guideTarget = new THREE.Vector3();
      a.guideTarget.set(x, 0, z);
      if (snap) { a.root.position.set(x, 0, z); a.blocked = 0; }
    },
    releaseTourGuide(index) {
      const a = agents[index]; if (!a) return;
      a.guideTarget = null;
      a.state = 'idle'; a.stateUntil = 0;
      a.greeted = true; a.cooldown = 20;
    },
    attachVisual(index, model) {
      const a = agents[index];
      if (!a || !model) return;
      a.body.visible = false;
      a.root.add(model);
      model.position.set(0, 0, 0);
      model.rotation.set(0, 0, 0);
    },
    getState(index) { return agents[index]?.state || null; },
    anchors() { return agents.map(a => a.root.position.clone().setY(2.9)); },
    targets: agents.map((a, index) => ({
      kind: 'npc', index, label: 'Talk to ' + a.spec.name,
      r: 1.55, prio: 0.65, fw: 0.2, y: 2.7, pos: out => out.copy(a.root.position),
    })),
  };
}
