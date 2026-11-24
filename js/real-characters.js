// Realistic, skinned human characters for the portfolio room.
// Source models: Avatar Studio / Microsoft Rocketbox (MIT). See assets/THIRD_PARTY_CHARACTER_NOTICES.md.
// Assets are pinned to an immutable upstream commit and loaded with CORS through jsDelivr.
// The room still works when the network or WebGL texture decoder refuses a model.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const SOURCE = 'https://cdn.jsdelivr.net/gh/memoriesrohit/avatar-studio@2fd9ec82fbe1613d40ae38aadcca3f410725f740/models/';
const CATALOG = Object.freeze({
  ruchir: 'arjun_smart.glb', // realistic South Asian-featured model, placeholder for a custom likeness
  // maya is loaded exclusively by js/vrm-meera.js from the exact user-uploaded VRM.
});
const NAMED_PARTS = new Set([
  'Outfit_original', 'Skin_original', 'Outfit_formal', 'Skin_formal',
  'Top_shirt', 'Skin_shirt', 'Top_tee', 'Skin_tee', 'Trousers', 'Shoes',
]);
const meshLabel = (o) => (o.name && !/^mesh_\d|_\d+$/.test(o.name) ? o.name : o.parent?.name ?? o.name);
const clamp = THREE.MathUtils.clamp;

function prepareModel(model, outfit, tint = null) {
  const showing = outfit === 'shirt'
    ? new Set(['Top_shirt', 'Skin_shirt', 'Trousers', 'Shoes'])
    : outfit === 'formal'
      ? new Set(['Outfit_formal', 'Skin_formal'])
      : new Set(['Outfit_original', 'Skin_original']);
  let hasShirt = false, hasTee = false, hasOriginal = false;
  model.traverse(o => {
    if (!o.isMesh) return;
    const label = meshLabel(o);
    if (label === 'Top_shirt') hasShirt = true;
    if (label === 'Top_tee') hasTee = true;
    if (label === 'Outfit_original') hasOriginal = true;
  });
  model.traverse(o => {
    if (!o.isMesh) return;
    const label = meshLabel(o);
    o.castShadow = true; o.receiveShadow = true;
    o.frustumCulled = false; // animated bones can move outside rest-pose bounds
    // Preserve the model's baked skin/hair/fabric normal and roughness textures.
    if (o.material) {
      // The upstream MakeHuman/Rocketbox GLBs can tag skin and clothing as
      // alpha-blended. Leaving that untouched causes semi-transparent faces,
      // sorting artifacts and a distinctly cartoon-like appearance.
      const src = o.material;
      const m = new THREE.MeshPhysicalMaterial({
        name: src.name, map: src.map, normalMap: src.normalMap,
        normalScale: src.normalScale, roughnessMap: src.roughnessMap,
        aoMap: src.aoMap, aoMapIntensity: 1,
        color: src.color, roughness: src.roughness, metalness: 0,
        transparent: false, opacity: 1, depthWrite: true,
        side: THREE.FrontSide,
      });
      if (/^Hair/.test(label)) {
        Object.assign(m, {
          side: THREE.DoubleSide, alphaTest: 0.48,
          alphaToCoverage: true, roughness: 0.79,
          sheen: 0.18, sheenRoughness: 0.75,
          specularIntensity: 0.28,
        });
        m.sheenColor.set('#694a3c');
      } else if (/^(Eyebrows|Eyelashes)/.test(label)) {
        Object.assign(m, {
          transparent: true, depthWrite: false, alphaTest: 0.01,
          roughness: 0.91, specularIntensity: 0,
          side: THREE.DoubleSide,
        });
        o.renderOrder = 2;
      } else if (/^(Eyes)/.test(label)) {
        Object.assign(m, {
          alphaTest: 0.42, roughness: 0.095,
          clearcoat: 1, clearcoatRoughness: 0.04,
        });
      } else if (/^(Skin|Body)/.test(label)) {
        Object.assign(m, {
          roughness: src.normalMap && src.roughnessMap ? 0.88 : 0.53,
          sheen: src.normalMap ? 0.06 : 0.21,
          sheenRoughness: 0.76,
          specularIntensity: 0.42,
        });
        m.sheenColor.set('#ffb99e');
      } else if (/shoe|boot/i.test(label)) {
        Object.assign(m, {
          roughness: 0.43, clearcoat: 0.28,
          clearcoatRoughness: 0.36,
        });
      } else {
        Object.assign(m, {
          roughness: src.normalMap ? (src.roughness || 0.88) : 0.84,
          sheen: 0.32, sheenRoughness: 0.88,
          specularIntensity: 0.32,
        });
        m.sheenColor.set('#f2e9d9');
      }
      // Preserve facial UVs and the true geometry; only adjust surface physics.
      if (label === 'Trousers' && outfit === 'shirt') m.color.multiply(new THREE.Color('#39383d'));
      if (label === 'Top_shirt') m.color.multiply(new THREE.Color('#f6f4ee'));
      if (label === 'Top_tee' && tint) m.color.multiply(new THREE.Color(tint));
      if (label === 'Hair' && tint && outfit === 'tee') {
        // The reference has natural brunette hair. Do not change head shape.
        m.color.multiply(new THREE.Color('#865e4a'));
      }
      m.needsUpdate = true;
      o.material = m;
    }
    if (NAMED_PARTS.has(label)) {
      const selected = (outfit === 'shirt' && !hasShirt) || (outfit === 'tee' && !hasTee) ? 'original' : outfit;
      const enabled = selected === 'shirt'
        ? new Set(['Top_shirt', 'Skin_shirt', 'Trousers', 'Shoes'])
        : selected === 'tee'
          ? new Set(['Top_tee', 'Skin_tee', 'Trousers', 'Shoes'])
        : selected === 'formal'
          ? new Set(['Outfit_formal', 'Skin_formal'])
          : new Set(['Outfit_original', 'Skin_original']);
      o.visible = enabled.has(label);
    }
  });
  // In some editions the formal model has no original garment (or vice versa).
  if (!hasOriginal && outfit === 'original') {
    model.traverse(o => {
      if (!o.isMesh) return;
      const l = meshLabel(o);
      if (l === 'Outfit_formal' || l === 'Skin_formal') o.visible = true;
    });
  }
}

function noRootMotion(clip) {
  const copy = clip.clone();
  for (const track of copy.tracks) {
    if (!(track instanceof THREE.VectorKeyframeTrack) || !/hips\.position/i.test(track.name)) continue;
    // Keep hip height variations but remove drifting x/z translation from walking-in-place loops.
    const x = track.values[0], z = track.values[2];
    for (let i = 0; i < track.values.length; i += 3) {
      track.values[i] = x; track.values[i + 2] = z;
    }
  }
  return copy;
}

function createRig(gltf, id, mode, { x, z, scale, tint }) {
  const root = new THREE.Group();
  root.name = 'real-' + id;
  root.position.set(x, 0, z);
  const model = gltf.scene;
  model.scale.setScalar(scale);
  root.add(model);
  prepareModel(model, mode, tint);
  const mixer = new THREE.AnimationMixer(model);
  const actions = {};
  for (const clip of gltf.animations) actions[clip.name] = mixer.clipAction(noRootMotion(clip));
  const faceMeshes = [];
  model.traverse(o => {
    if (o.isSkinnedMesh && o.morphTargetDictionary) faceMeshes.push(o);
  });
  const head = model.getObjectByName('mixamorigHead');
  const rig = {
    id, root, model, mixer, actions, active: null, faceMeshes, head, clock: 0, blinkAt: 2.7,
    moving: 'Idle',
    play(name) {
      const chosen = actions[name] ? name : 'Idle';
      if (chosen === rig.active) return;
      const prev = rig.active ? actions[rig.active] : null;
      const next = actions[chosen];
      if (!next) return;
      // Stop all other actions after fades so a long tour doesn't accumulate active tracks.
      for (const [k, a] of Object.entries(actions)) if (k !== rig.active && k !== chosen) a.stop();
      next.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).play();
      if (prev && prev !== next) next.crossFadeFrom(prev, 0.42, false);
      rig.active = chosen;
    },
    update(t, dt, requestedMove, lookTarget = null) {
      rig.play(requestedMove || 'Idle');
      mixer.update(dt);
      rig.clock = t;
      if (head && lookTarget && requestedMove !== 'Walk') {
        // Subtle eye contact, never the exaggerated full-body snapping of the old avatar.
        const dx = lookTarget.x - root.position.x, dz = lookTarget.z - root.position.z;
        const a = Math.atan2(dx, dz) - root.rotation.y;
        const desired = clamp(Math.atan2(Math.sin(a), Math.cos(a)), -0.35, 0.35);
        head.rotation.y += desired * Math.min(1, dt * 0.65);
      }
      if (t > rig.blinkAt) rig.blinkAt = t + 2.5 + ((t * 11.3 + id.length) % 2);
      const rem = rig.blinkAt - t;
      const blink = rem > 0.05 && rem < 0.18 ? 0.92 : 0;
      for (const m of faceMeshes) {
        const d = m.morphTargetDictionary;
        for (const key of ['eyeBlinkLeft', 'eyeBlinkRight']) {
          if (d[key] != null) m.morphTargetInfluences[d[key]] = blink;
        }
        for (const key of ['mouthSmileLeft', 'mouthSmileRight']) {
          if (d[key] != null) m.morphTargetInfluences[d[key]] = requestedMove === 'Wave' ? 0.32 : 0.07;
        }
      }
    },
    headWorld(out) {
      if (head) return head.getWorldPosition(out);
      return root.getWorldPosition(out).add(new THREE.Vector3(0, 2.5, 0));
    },
  };
  rig.play('Idle');
  mixer.update(0);
  return rig;
}

export function createRealCharacters({ scene, onLoaded = () => {}, onError = () => {} }) {
  const loader = new GLTFLoader();
  // No server-side AI or retraining: this is real rigged geometry + authored motion clips.
  const rigs = new Map();
  const loading = new Map();
  function load(id, position, options = {}) {
    if (loading.has(id)) return loading.get(id);
    if (id === 'maya') {
      // The user-supplied 21 MB VRM is the only Mira. Do not substitute Emma,
      // show a 2D card, or change facial/clothing geometry when loading.
      const task = import('./vrm-meera.js')
        .then(({ loadMeeraVRM }) => loadMeeraVRM({
          x: position[0], z: position[1], scale: options.scale || 1.55,
        }))
        .then(rig => {
          rigs.set(id, rig); scene.add(rig.root); onLoaded(id, rig); return rig;
        })
        .catch(err => { onError(id, err); return null; });
      loading.set(id, task);
      return task;
    }
    if (!CATALOG[id]) return Promise.reject(new Error('Unknown realistic character ' + id));
    const task = loader.loadAsync(SOURCE + CATALOG[id])
      .then(gltf => {
        if (!gltf.scene || !gltf.scene.children.length) throw new Error(id + ' GLB has no scene');
        const rig = createRig(gltf, id, options.outfit || 'original', {
          x: position[0], z: position[1], scale: options.scale || 1.56,
          tint: options.tint || null,
        });
        rigs.set(id, rig);
        scene.add(rig.root);
        onLoaded(id, rig);
        return rig;
      })
      .catch(err => { onError(id, err); return null; });
    loading.set(id, task);
    return task;
  }
  return {
    load,
    get(id) { return rigs.get(id); },
    update(t, dt, moves = {}, target = null) {
      for (const [id, rig] of rigs) rig.update(t, dt, moves[id] || 'Idle',
        (id === 'ruchir' || id === 'maya') ? target : null);
    },
    // Models are not synthesized from user portraits; the Ruchir likeness is a future custom asset.
    source: SOURCE,
  };
}
