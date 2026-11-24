// The 3D room: walls, furniture, certificates, project shelf, desk + avatar.
// Exposes a small API so the UI can focus the camera and react to clicks.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as TX from './textures.js';
import { createAvatar } from './avatar.js';
import { buildExtras } from './extras.js';
import { createVisitor, collide, addObstacle } from './player.js';
import { createNPCSystem } from './npc.js';
import { createFirstPersonArms } from './first-person.js';
import { createRealCharacters } from './real-characters.js';
import { guidedTourPlan } from './guided-tour.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const AVATAR_POS = new THREE.Vector3(-0.8, 0, -2.75);
const STANDEE_POS = new THREE.Vector3(-3.15, 0, -2.5);
const SPAWN = new THREE.Vector3(3.9, 0, 2.95);
const GROUND_DAY = new THREE.Color(0xe6d5bf), GROUND_NIGHT = new THREE.Color(0x262a45);

export function createRoom({ canvas, data, hooks = {}, reducedMotion = false }) {
  // ---------- Renderer / scene ----------
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  const lowPower = matchMedia('(pointer: coarse)').matches || (navigator.deviceMemory && navigator.deviceMemory < 4);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.1 : 1.65));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.AgXToneMapping || THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  // Image-based reflections from a soft indoor light rig. A PMREM map is
  // inexpensive during gameplay and makes wood varnish, metal and glass respond.
  try {
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = new RoomEnvironment();
    const result = pmrem.fromScene(env, .04);
    scene.environment = result.texture;
    env.dispose(); pmrem.dispose();
  } catch (err) { console.warn('Indoor reflection environment unavailable',err); }
  const camera = new THREE.PerspectiveCamera(32, 1, 0.065, 200);
  // Restrained bloom lifts neon, watch highlights and warm practical lights.
  // Skip post FX on touch / low-memory devices to protect frame rate.
  const cinematic = !lowPower && !reducedMotion;
  const composer = cinematic ? new EffectComposer(renderer) : null;
  if (composer) {
    composer.addPass(new RenderPass(scene, camera));
    // Screen-space ambient occlusion puts realistic contact shadows between
    // furniture, floor, body and wall. Only use it on reasonably capable GPUs.
    if (renderer.capabilities.isWebGL2) {
      const ao = new GTAOPass(scene, camera, 512, 288);
      ao.updateGtaoMaterial({
        radius: 0.19, distanceExponent: 1.45, thickness: 1.05,
        scale: 1.14, samples: 10,
      });
      composer.addPass(ao);
    }
    // Subtle lens bloom; very bright halos made the previous room look cartoonish.
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.11, 0.35, 1.18);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  }
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.enableZoom = false; // never let the mouse wheel unexpectedly zoom first-person
  controls.minDistance = 4;
  controls.maxDistance = 36;
  controls.minPolarAngle = 0.45;
  controls.maxPolarAngle = 1.53;
  controls.minAzimuthAngle = -0.08;
  controls.maxAzimuthAngle = 1.62;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.8;

  const manager = new THREE.LoadingManager();
  manager.onProgress = (_u, loaded, total) => hooks.onProgress?.(loaded / total);
  manager.onLoad = () => hooks.onReady?.();
  const loader = new THREE.TextureLoader(manager);
  const loadTex = (url, onLoad) => loader.load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; onLoad?.(t); });

  // ---------- Helpers ----------
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
  // Tiny repeatable micro-grain gives close-up walls and upholstery a non-plastic
  // surface response. Generated locally; no stock image or unstable network dependency.
  function microGrain(kind, repeatX = 4, repeatY = 4) {
    const size = 256, c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d', { willReadFrequently: true });
    if (!g) return null;
    const img = g.createImageData(size, size);
    let seed = kind === 'fabric' ? 97109 : 60817;
    const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n = (rand() - 0.5) * (kind === 'fabric' ? 44 : 22);
      const weave = kind === 'fabric' ? ((x % 4 === 0 ? -9 : 1) + (y % 5 === 0 ? -8 : 2)) : 0;
      const base = 239 + n + weave;
      img.data[i] = img.data[i+1] = img.data[i+2] = Math.max(0, Math.min(255, base));
      img.data[i+3] = 255;
    }
    g.putImageData(img, 0, 0);
    const texture = new THREE.CanvasTexture(c);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    return texture;
  }
  const plasterGrain = microGrain('plaster', 6, 4);
  const fabricGrain = microGrain('fabric', 4, 3);
  // CC0 photographic material maps, loaded lazily with existing local
  // surfaces as fallback. Normal and roughness data are linear, not sRGB.
  const pbrLoader=new THREE.TextureLoader();
  const pbrCache=new Map();
  function pbrMap(id,kind,rx,ry){
    const key=[id,kind,rx,ry].join(':');
    if(!pbrCache.has(key)){
      const url='https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/'+id+'/'+id+'_'+kind+'_1k.jpg';
      pbrCache.set(key,new Promise(resolve=>{
        pbrLoader.load(url,t=>{
          t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);
          t.colorSpace=kind==='diff'?THREE.SRGBColorSpace:THREE.NoColorSpace;
          t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
          resolve(t);
        },undefined,()=>resolve(null));
      }));
    }
    return pbrCache.get(key);
  }
  function photograph(material,id,rx,ry,{color=true,normal=.45,rough=true}={}){
    const maps=[['normalMap','nor_gl'],...(color?[['map','diff']]:[]),...(rough?[['roughnessMap','rough']]:[])];
    for(const [prop,kind] of maps)pbrMap(id,kind,rx,ry).then(t=>{
      if(!t)return;
      material[prop]=t;
      if(prop==='normalMap')material.normalScale.set(normal,normal);
      material.needsUpdate=true;
    });
    return material;
  }
  function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene, { cast = true, receive = true } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast; m.receiveShadow = receive;
    parent.add(m);
    return m;
  }
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const rbox = (w, h, d, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) * 0.99);
  const UP = new THREE.Vector3(0, 1, 0);
  function rod(from, to, r, mat, parent = scene) {
    const dir = new THREE.Vector3().subVectors(to, from);
    const m = mesh(new THREE.CylinderGeometry(r, r, dir.length(), 10), mat, 0, 0, 0, parent);
    m.position.copy(from).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(UP, dir.normalize());
    return m;
  }

  // Interactive objects register here.
  const interactive = [];
  function register(root, hit, { dir = new THREE.Vector3(0, 0, 1), selectOffset = 0.3, hoverOffset = 0.05 } = {}) {
    root.userData.hit = hit;
    root.userData.base = root.position.clone();
    root.userData.dir = dir;
    root.userData.selectOffset = selectOffset;
    root.userData.hoverOffset = hoverOffset;
    root.userData.offset = 0;
    root.userData.glow = 0;
    refreshMats(root);
    interactive.push(root);
    return root;
  }
  // Materials that get the warm hover glow (skips ones that already glow, like bulbs and cat eyes).
  function refreshMats(root) {
    root.userData.mats = [];
    root.traverse((o) => {
      if (o.isMesh) {
        const ms = Array.isArray(o.material) ? o.material : [o.material];
        ms.forEach((m) => { if (m.emissive && m.emissive.getHex() === 0 && !root.userData.mats.includes(m)) root.userData.mats.push(m); });
      }
    });
  }

  // ---------- Room shell ----------
  const T = 0.3;
  const cream = std(0xb6c2cf, { roughness: 0.97, map: plasterGrain });
  const green = std(0x344452, { roughness: 0.95, map: plasterGrain });
  const cut = std(0x9ba9b7, { roughness: 0.97, map: plasterGrain });
  const floorTex = TX.floorTexture();
  const floorEdge = std(0x6e4c36);
  const floorMat = photograph(std(0xffffff, { map: floorTex, roughness: 0.68 }), 'wood_floor', 5, 5, {normal:.65});
  photograph(cream,'painted_plaster_wall',3,2,{color:false,normal:.25,rough:false});
  photograph(green,'painted_plaster_wall',3,2,{color:false,normal:.25,rough:false});
  mesh(box(10 + T, 0.5, 10 + T), [floorEdge, floorEdge, floorMat, floorEdge, floorEdge, floorEdge], -T / 2, -0.25, -T / 2, scene, { cast: false });
  // soft ground the room sits on; it fades into the page background so the room never floats in a void
  const groundMat = new THREE.MeshStandardMaterial({ color: 0xe6d5bf, map: TX.groundTexture(), transparent: true, depthWrite: false, roughness: 1 });
  const ground = mesh(new THREE.CircleGeometry(38, 64), groundMat, 0, -0.5, 0, scene, { cast: false });
  ground.rotation.x = -Math.PI / 2;
  ground.raycast = () => {};

  const wallMats = (inner) => [cut, cut, cut, cut, inner, cut]; // +z face is the inside of the back wall
  const W_IN = { x0: -3.4, x1: -1.2, y0: 2.0, y1: 4.6 };
  const backSeg = (x0, x1, y0, y1) => mesh(box(x1 - x0, y1 - y0, T), wallMats(cream), (x0 + x1) / 2, (y0 + y1) / 2, -5 - T / 2, scene, { cast: false });
  backSeg(-5 - T, W_IN.x0, 0, 6);
  backSeg(W_IN.x1, 5, 0, 6);
  backSeg(W_IN.x0, W_IN.x1, 0, W_IN.y0);
  backSeg(W_IN.x0, W_IN.x1, W_IN.y1, 6);
  mesh(box(T, 6, 10 + T), [green, cut, cut, cut, cut, cut], -5 - T / 2, 3, -T / 2, scene, { cast: false });

  // wainscoting, rails and baseboards
  const sage = std(0x899ba2, { roughness: 0.94, map: plasterGrain });
  const deepGreen = std(0x293744, { roughness: 0.93, map: plasterGrain });
  const trim = std(0xe4e0d9, { roughness: 0.62 });
  mesh(box(10, 1.4, 0.03), sage, 0, 0.7, -4.985, scene, { cast: false });
  mesh(box(0.03, 1.4, 10), deepGreen, -4.985, 0.7, 0, scene, { cast: false });
  for (let i = 0; i < 16; i++) {
    mesh(box(0.05, 1.3, 0.03), sage, -4.7 + i * 0.63, 0.7, -4.96, scene, { cast: false });
    mesh(box(0.03, 1.3, 0.05), deepGreen, -4.96, 0.7, -4.7 + i * 0.63, scene, { cast: false });
  }
  mesh(box(10, 0.07, 0.08), trim, 0, 1.42, -4.96, scene, { cast: false });
  mesh(box(0.08, 0.07, 10), trim, -4.96, 1.42, 0, scene, { cast: false });
  mesh(box(10, 0.14, 0.05), trim, 0, 0.07, -4.97, scene, { cast: false });
  mesh(box(0.05, 0.14, 10), trim, -4.97, 0.07, 0, scene, { cast: false });

  // ---------- The two walls that close the room (hidden whenever the camera is outside them) ----------
  const rightWall = new THREE.Group(); scene.add(rightWall);
  const frontWall = new THREE.Group(); scene.add(frontWall);
  const flat = { cast: false };
  const DOOR = { z0: 2.0, z1: 3.9, h: 4.3 };
  const rMats = [cut, cream, cut, cut, cut, cut]; // -x face is the inside
  mesh(box(T, 6, DOOR.z0 + 5 + T), rMats, 5 + T / 2, 3, (DOOR.z0 - 5 - T) / 2, rightWall, flat);
  mesh(box(T, 6, 5 + T - DOOR.z1), rMats, 5 + T / 2, 3, (DOOR.z1 + 5 + T) / 2, rightWall, flat);
  mesh(box(T, 6 - DOOR.h, DOOR.z1 - DOOR.z0), rMats, 5 + T / 2, (6 + DOOR.h) / 2, (DOOR.z0 + DOOR.z1) / 2, rightWall, flat);
  for (const [z0, z1] of [[-5, DOOR.z0], [DOOR.z1, 5]]) {
    const zc = (z0 + z1) / 2, zl = z1 - z0;
    mesh(box(0.03, 1.4, zl), sage, 4.985, 0.7, zc, rightWall, flat);
    mesh(box(0.08, 0.07, zl), trim, 4.96, 1.42, zc, rightWall, flat);
    mesh(box(0.05, 0.14, zl), trim, 4.97, 0.07, zc, rightWall, flat);
    for (let z = z0 + 0.3; z < z1 - 0.1; z += 0.63) mesh(box(0.03, 1.3, 0.05), sage, 4.96, 0.7, z, rightWall, flat);
  }
  // door: frame, leaf, panels, knob and a welcome mat
  const doorWood = std(0x6b4430, { roughness: 0.6 });
  mesh(box(0.36, DOOR.h + 0.1, 0.1), trim, 5.05, (DOOR.h + 0.1) / 2, DOOR.z0 - 0.05, rightWall, flat);
  mesh(box(0.36, DOOR.h + 0.1, 0.1), trim, 5.05, (DOOR.h + 0.1) / 2, DOOR.z1 + 0.05, rightWall, flat);
  mesh(box(0.36, 0.12, DOOR.z1 - DOOR.z0 + 0.2), trim, 5.05, DOOR.h + 0.06, (DOOR.z0 + DOOR.z1) / 2, rightWall, flat);
  mesh(box(0.07, DOOR.h - 0.05, DOOR.z1 - DOOR.z0 - 0.04), doorWood, 5.1, DOOR.h / 2, (DOOR.z0 + DOOR.z1) / 2, rightWall, flat);
  for (const y of [1.2, 3.1]) mesh(box(0.03, 1.4, 1.3), std(0x7a5038, { roughness: 0.55 }), 5.055, y, (DOOR.z0 + DOOR.z1) / 2, rightWall, flat);
  mesh(new THREE.SphereGeometry(0.07, 14, 10), std(0xc9a24d, { metalness: 0.8, roughness: 0.3 }), 5.03, 2.05, DOOR.z0 + 0.28, rightWall, flat);
  const doormat = mesh(new THREE.PlaneGeometry(1.0, 1.6), new THREE.MeshStandardMaterial({ map: TX.doormatTexture(), roughness: 1 }), 4.35, 0.014, (DOOR.z0 + DOOR.z1) / 2, scene, flat);
  doormat.rotation.set(-Math.PI / 2, 0, Math.PI / 2);

  const fMats = [cut, cut, cut, cut, cut, cream]; // -z face is the inside
  mesh(box(10 + 2 * T, 6, T), fMats, 0, 3, 5 + T / 2, frontWall, flat);
  mesh(box(10, 1.4, 0.03), sage, 0, 0.7, 4.985, frontWall, flat);
  mesh(box(10, 0.07, 0.08), trim, 0, 1.42, 4.96, frontWall, flat);
  mesh(box(10, 0.14, 0.05), trim, 0, 0.07, 4.97, frontWall, flat);
  for (let i = 0; i < 16; i++) mesh(box(0.05, 1.3, 0.03), sage, -4.7 + i * 0.63, 0.7, 4.96, frontWall, flat);
  // whiteboard with the toolkit (opens About)
  const board = new THREE.Group(); board.position.set(1.4, 3.15, 4.95); board.rotation.y = Math.PI; frontWall.add(board);
  mesh(rbox(3.2, 1.9, 0.06, 0.03), std(0xc7cbd1, { metalness: 0.5, roughness: 0.4 }), 0, 0, 0.03, board, flat);
  mesh(new THREE.PlaneGeometry(3.06, 1.76), new THREE.MeshStandardMaterial({ map: TX.whiteboardTexture(data.profile.skills), roughness: 0.35 }), 0, 0, 0.065, board, flat);
  mesh(box(1.2, 0.05, 0.12), std(0xc7cbd1, { metalness: 0.5 }), 0.6, -0.98, 0.1, board, flat);
  ['#c2562f', '#2f5d8a', '#2e5b52'].forEach((c, i) => mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.22, 8), std(c), 0.35 + i * 0.2, -0.94, 0.12, board, flat).rotation.z = Math.PI / 2);
  register(board, { kind: 'skills', index: 0, label: 'Toolkit whiteboard — skills' }, { dir: new THREE.Vector3(0, 0, 0), selectOffset: 0, hoverOffset: 0 });
  // ceiling with beams and a light (only shown while you're inside the room)
  const ceiling = new THREE.Group(); scene.add(ceiling);
  mesh(box(10.6, 0.2, 10.6), std(0xf3ece1, { roughness: 1 }), 0, 6.1, 0, ceiling, flat);
  for (const z of [-3.3, 0, 3.3]) mesh(box(10, 0.26, 0.32), std(0x8a5a3b, { roughness: 0.7 }), 0, 5.87, z, ceiling, flat);
  const fixtureMat = new THREE.MeshStandardMaterial({ color: 0xfff6e6, emissive: 0xffe2b0, emissiveIntensity: 0.2 });
  mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.1, 32), fixtureMat, 0.6, 5.95, 1.65, ceiling, flat);
  const ceilingLight = new THREE.PointLight(0xffe2b8, 0, 16, 1.6);
  ceilingLight.position.set(0.6, 5.5, 1.65);
  scene.add(ceilingLight);
  // tagline poster
  const poster = new THREE.Group(); poster.position.set(-2.7, 3.3, 4.95); poster.rotation.y = Math.PI; frontWall.add(poster);
  mesh(box(1.5, 1.95, 0.05), std(0x2a211b, { roughness: 0.5 }), 0, 0, 0.025, poster, flat);
  mesh(new THREE.PlaneGeometry(1.36, 1.8), new THREE.MeshStandardMaterial({ map: TX.posterTexture(data.profile.tagline), roughness: 0.8 }), 0, 0, 0.052, poster, flat);

  // ---------- Window with day / night sky ----------
  const winCx = (W_IN.x0 + W_IN.x1) / 2, winCy = (W_IN.y0 + W_IN.y1) / 2;
  const winW = W_IN.x1 - W_IN.x0, winH = W_IN.y1 - W_IN.y0;
  const skyDay = new THREE.MeshBasicMaterial({ map: TX.skyTexture(false), toneMapped: false });
  const skyNight = new THREE.MeshBasicMaterial({ map: TX.skyTexture(true), toneMapped: false, transparent: true, opacity: 0 });
  mesh(new THREE.PlaneGeometry(winW + 1.4, winH + 1.2), skyDay, winCx, winCy, -5.9, scene, { cast: false, receive: false });
  mesh(new THREE.PlaneGeometry(winW + 1.4, winH + 1.2), skyNight, winCx, winCy, -5.89, scene, { cast: false, receive: false });
  const frameMat = std(0xf6f1e8, { roughness: 0.5 });
  mesh(box(winW + 0.24, 0.12, 0.12), frameMat, winCx, W_IN.y1 + 0.06, -4.97);
  mesh(box(winW + 0.4, 0.08, 0.36), frameMat, winCx, W_IN.y0 - 0.02, -4.88);
  mesh(box(0.12, winH, 0.12), frameMat, W_IN.x0 - 0.06, winCy, -4.97);
  mesh(box(0.12, winH, 0.12), frameMat, W_IN.x1 + 0.06, winCy, -4.97);
  mesh(box(0.05, winH, 0.06), frameMat, winCx, winCy, -5.15);
  mesh(box(winW, 0.05, 0.06), frameMat, winCx, winCy + 0.2, -5.15);
  const glass = new THREE.MeshStandardMaterial({ color: 0xcfe3ff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.1 });
  const glassPane = mesh(new THREE.PlaneGeometry(winW, winH), glass, winCx, winCy, -5.16, scene, { cast: false, receive: false });
  glassPane.raycast = () => {};
  // curtains
  const curtainMat = photograph(std(0xc46e4f, { side: THREE.DoubleSide, roughness: .92 }), 'rough_linen', 2, 5, {color:false,normal:.5,rough:false});
  for (const s of [-1, 1]) {
    const geo = new THREE.PlaneGeometry(0.75, 3.4, 16, 1);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin(pos.getX(i) * 18) * 0.05);
    geo.computeVertexNormals();
    mesh(geo, curtainMat, winCx + s * (winW / 2 + 0.3), 3.15, -4.86);
  }
  rod(new THREE.Vector3(W_IN.x0 - 0.8, 4.92, -4.84), new THREE.Vector3(W_IN.x1 + 0.8, 4.92, -4.84), 0.025, std(0x3a3a3a, { metalness: 0.6, roughness: 0.4 }));
  // tiny plant on the sill
  mesh(new THREE.CylinderGeometry(0.12, 0.09, 0.2, 14), std(0xe9e2d6), winCx + 0.6, 2.06, -4.85);
  for (let i = 0; i < 6; i++) {
    const leaf = mesh(new THREE.SphereGeometry(0.07, 8, 6), std(0x5a9a5f), winCx + 0.6 + Math.cos(i) * 0.05, 2.24 + (i % 3) * 0.04, -4.85 + Math.sin(i) * 0.05);
    leaf.scale.set(0.6, 1.4, 0.6); leaf.rotation.z = (i - 3) * 0.3;
  }

  // ---------- Clock (shows India Standard Time) ----------
  const clock = new THREE.Group();
  clock.position.set(winCx, 5.38, -4.97);
  scene.add(clock);
  mesh(new THREE.CircleGeometry(0.36, 40), new THREE.MeshStandardMaterial({ map: TX.clockFaceTexture(), roughness: 0.6 }), 0, 0, 0.03, clock, { cast: false });
  mesh(new THREE.TorusGeometry(0.37, 0.035, 10, 40), std(0x2a211b, { roughness: 0.4 }), 0, 0, 0.03, clock);
  const handMat = std(0x2a211b);
  const mkHand = (len, w) => { const g = box(w, len, 0.015); g.translate(0, len / 2 - 0.03, 0); return mesh(g, handMat, 0, 0, 0.05, clock, { cast: false }); };
  const hourHand = mkHand(0.2, 0.035), minHand = mkHand(0.29, 0.025), secHand = mkHand(0.31, 0.008);
  secHand.material = std(0xc2562f);

  // ---------- Neon "say hello" sign (contact) ----------
  const neon = new THREE.Group();
  neon.position.set(0.15, 3.85, -4.95);
  scene.add(neon);
  const plate = mesh(rbox(2.1, 0.78, 0.04, 0.05), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, roughness: 0.1, emissive: 0x000000 }), 0, 0, 0.02, neon, { cast: false });
  const neonMat = new THREE.MeshBasicMaterial({ map: TX.neonTexture('say hello'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const neonText = mesh(new THREE.PlaneGeometry(2.0, 0.7), neonMat, 0, 0, 0.05, neon, { cast: false, receive: false });
  neonText.raycast = () => {};
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8), std(0xbbbbbb, { metalness: 0.8 }), s * 0.9, 0.28, 0.02, neon).rotation.x = Math.PI / 2;
  register(neon, { kind: 'contact', index: 0, label: 'Say hello — contact' }, { dir: new THREE.Vector3(0, 0, 1), selectOffset: 0.08, hoverOffset: 0.04 });
  const neonLight = new THREE.PointLight(0xff4f9a, 0, 5, 2);
  neonLight.position.set(0.15, 3.85, -4.4);
  scene.add(neonLight);

  // ---------- Certificate wall (left wall) ----------
  const certRoots = [];
  data.certificates.forEach((c, i) => {
    const root = new THREE.Group();
    const row = Math.floor(i / 5), col = i % 5;
    root.position.set(-4.93, row === 0 ? 4.48 : 2.8, 3.4 - col * 1.7);
    root.rotation.y = Math.PI / 2;
    scene.add(root);
    const frameMatC = std(i % 2 ? 0x3b2a1e : 0xc9a24d, { roughness: 0.45, metalness: i % 2 ? 0 : 0.55 });
    const matMat = std(0xf8f4ec, { roughness: 0.9 });
    const build = (aspect) => {
      const maxW = 1.15, maxH = 1.18;
      let pw = maxW, ph = maxW / aspect;
      if (ph > maxH) { ph = maxH; pw = maxH * aspect; }
      const m = 0.07, f = 0.06;
      mesh(box(pw + 2 * (m + f), ph + 2 * (m + f), 0.06), frameMatC, 0, 0, 0.03, root);
      mesh(box(pw + 2 * m, ph + 2 * m, 0.02), matMat, 0, 0, 0.065, root, { cast: false });
      root.userData.picture = mesh(new THREE.PlaneGeometry(pw, ph), root.userData.picMat, 0, 0, 0.077, root, { cast: false });
      // hanging wire + nail
      rod(new THREE.Vector3(-pw * 0.3, ph / 2 + m + f, 0.01), new THREE.Vector3(0, ph / 2 + m + f + 0.18, 0.01), 0.006, std(0x888888), root);
      rod(new THREE.Vector3(pw * 0.3, ph / 2 + m + f, 0.01), new THREE.Vector3(0, ph / 2 + m + f + 0.18, 0.01), 0.006, std(0x888888), root);
      refreshMats(root);
    };
    root.userData.picMat = new THREE.MeshBasicMaterial({ color: 0xeeeeee, toneMapped: false });
    loadTex(c.preview, (t) => {
      root.userData.picMat.map = t; root.userData.picMat.color.set(0xffffff); root.userData.picMat.needsUpdate = true;
      build(t.image.width / t.image.height);
    });
    register(root, { kind: 'cert', index: i, label: c.title + ' · ' + c.issuer }, { dir: new THREE.Vector3(1, 0, 0), selectOffset: 0.18, hoverOffset: 0.06 });
    certRoots.push(root);
  });
  // gallery picture lights
  const brass = std(0xc9a24d, { metalness: 0.7, roughness: 0.35 });
  const bulbMats = [];
  for (const y of [5.38, 3.68]) {
    for (let col = 0; col < 5; col++) {
      const z = 3.4 - col * 1.7;
      rod(new THREE.Vector3(-4.95, y, z), new THREE.Vector3(-4.75, y + 0.04, z), 0.02, brass);
      const bar = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 12), brass, -4.72, y + 0.05, z);
      bar.rotation.x = Math.PI / 2;
      const bm = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc970, emissiveIntensity: 0 });
      bulbMats.push(bm);
      const glow = mesh(new THREE.BoxGeometry(0.03, 0.02, 0.44), bm, -4.7, y + 0.005, z, scene, { cast: false });
      glow.raycast = () => {};
    }
  }

  // ---------- Bookshelf with projects (back wall, right) ----------
  const shelf = new THREE.Group();
  shelf.position.set(3.0, 0, -4.62);
  scene.add(shelf);
  const wood = photograph(std(0xb4a18b, { roughness: 0.7 }), 'wood_table', 1, 2, {normal:.42});
  const SW = 3.4, SD = 0.7, SH = 4.4, st = 0.08;
  mesh(box(st, SH, SD), wood, -SW / 2 + st / 2, SH / 2, 0, shelf);
  mesh(box(st, SH, SD), wood, SW / 2 - st / 2, SH / 2, 0, shelf);
  mesh(box(SW, SH, 0.04), std(0x5e3b26), 0, SH / 2, -SD / 2 + 0.02, shelf);
  const levels = [0.06, 1.12, 2.18, 3.24, 4.36];
  levels.forEach((y) => mesh(box(SW, st, SD), wood, 0, y, 0, shelf));
  const levelTop = (k) => levels[k] + st / 2;

  // featured projects: boxed like collector editions
  const projectRoots = [];
  const slots = [[-1.08, 3], [0, 3], [1.08, 3], [-1.08, 2], [0, 2]];
  data.projects.forEach((p, i) => {
    const [x, lv] = slots[i];
    const w = 0.94, h = 0.86, d = 0.46;
    const side = std(new THREE.Color(p.color).multiplyScalar(0.7), { roughness: 0.6 });
    const front = new THREE.MeshStandardMaterial({ map: TX.projectBoxTexture(p, i), roughness: 0.55 });
    const top = std(new THREE.Color(p.color).multiplyScalar(0.85), { roughness: 0.6 });
    const root = new THREE.Group();
    root.position.set(x, levelTop(lv) + h / 2 + 0.001, SD / 2 - d / 2 - 0.06);
    shelf.add(root);
    mesh(box(w, h, d), [side, side, top, side, front, side], 0, 0, 0, root);
    register(root, { kind: 'project', index: i, label: p.title + ' — ' + p.hook }, { dir: new THREE.Vector3(0, 0, 1), selectOffset: 0.42, hoverOffset: 0.08 });
    projectRoots.push(root);
  });
  // workbench builds: binders with spines
  const binderColors = ['#2f5d8a', '#c2562f', '#2e5b52', '#d7a04a', '#6b4c9a', '#9a3f52', '#3f6fd8', '#5f7f64', '#b5762f', '#20665a'];
  const heights = [0.84, 0.8, 0.88, 0.78, 0.86, 0.82, 0.9, 0.8, 0.85, 0.83];
  const buildRoots = [];
  data.workbench.forEach((b, i) => {
    const w = 0.25, h = heights[i % heights.length], d = 0.52;
    const col = binderColors[i % binderColors.length];
    const sideM = std(new THREE.Color(col).multiplyScalar(0.8));
    const spineM = new THREE.MeshStandardMaterial({ map: TX.spineTexture({ title: b.title, color: col, number: String(i + 1).padStart(2, '0'), light: col === '#d7a04a' }), roughness: 0.7 });
    const pages = std(0xf3ead8);
    const root = new THREE.Group();
    root.position.set(-1.35 + i * 0.3, levelTop(1) + h / 2 + 0.001, SD / 2 - d / 2 - 0.05);
    shelf.add(root);
    const m = mesh(box(w, h, d), [sideM, sideM, pages, pages, spineM, sideM], 0, 0, 0, root);
    m.rotation.z = (i === 9 ? -0.04 : 0);
    register(root, { kind: 'build', index: i, label: b.title }, { dir: new THREE.Vector3(0, 0, 1), selectOffset: 0.38, hoverOffset: 0.08 });
    buildRoots.push(root);
  });
  // bottom shelf: woven baskets and a stack of books
  const basket = std(0xc59a62, { roughness: 1 });
  for (const x of [-1.05, -0.05]) {
    mesh(rbox(0.9, 0.62, 0.56, 0.05), basket, x, levelTop(0) + 0.31, 0.02, shelf);
    for (let k = 0; k < 4; k++) mesh(box(0.92, 0.03, 0.58), std(0xa77d4a), x, levelTop(0) + 0.1 + k * 0.14, 0.02, shelf, { cast: false });
  }
  ['#2e5b52', '#efe2cc', '#c2562f', '#2f5d8a'].forEach((c, k) => {
    const bk = mesh(box(0.7 - k * 0.04, 0.1, 0.5), std(c), 1.05, levelTop(0) + 0.05 + k * 0.1, 0.03, shelf);
    bk.rotation.y = (k % 2 ? 0.08 : -0.06);
  });
  // second shelf decor: camera (photography hobby) + framed photo
  const camBody = std(0x1f1f22, { roughness: 0.4 });
  const camG = new THREE.Group(); camG.position.set(0.86, levelTop(2), 0.08); camG.rotation.y = -0.35; shelf.add(camG);
  mesh(rbox(0.36, 0.24, 0.16, 0.03), camBody, 0, 0.12, 0, camG);
  mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.14, 18), camBody, 0, 0.12, 0.13, camG).rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 18), std(0x4a6fa5, { metalness: 0.5, roughness: 0.1 }), 0, 0.12, 0.205, camG).rotation.x = Math.PI / 2;
  mesh(box(0.1, 0.06, 0.08), camBody, -0.1, 0.26, 0, camG);
  const photoG = new THREE.Group(); photoG.position.set(1.32, levelTop(2), 0.0); photoG.rotation.set(-0.12, -0.5, 0); shelf.add(photoG);
  mesh(box(0.42, 0.52, 0.04), std(0xf2eadc, { roughness: 0.5 }), 0, 0.27, 0, photoG);
  const photoMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  loadTex(data.profile.photo, (t) => { photoMat.map = t; photoMat.needsUpdate = true; });
  mesh(new THREE.PlaneGeometry(0.34, 0.42), photoMat, 0, 0.27, 0.021, photoG, { cast: false });
  register(photoG, { kind: 'avatar', index: 0, label: 'Ruchir — about me' }, { dir: new THREE.Vector3(0, 0.3, 1).normalize(), selectOffset: 0.05, hoverOffset: 0.05 });
  // small trophy-like cactus on top of the shelf
  mesh(new THREE.CylinderGeometry(0.16, 0.12, 0.26, 16), std(0xd88c5a), -1.1, levelTop(4) + 0.13, 0.0, shelf);
  for (let k = 0; k < 3; k++) {
    const cc = mesh(new THREE.CapsuleGeometry(0.06, 0.18 + k * 0.05, 4, 8), std(0x5b8f5a), -1.1 + (k - 1) * 0.07, levelTop(4) + 0.38 + k * 0.03, 0.0, shelf);
    cc.rotation.z = (k - 1) * 0.35;
  }
  for (let k = 0; k < 5; k++) mesh(box(0.12, 0.42 - k * 0.03, 0.34), std(['#efe2cc', '#2f5d8a', '#c2562f', '#d7a04a', '#2e5b52'][k]), 0.3 + k * 0.14, levelTop(4) + 0.21 - k * 0.015, 0.0, shelf);

  // ---------- Desk ----------
  const DESK = { x: -0.8, y: 1.45, z: -1.65, w: 2.9, d: 1.3 };
  const oak = photograph(std(0xe3c9aa, { roughness: 0.55 }), 'wood_table', 2, 1, {normal:.38});
  const black = std(0x222326, { roughness: 0.5, metalness: 0.3 });
  mesh(rbox(DESK.w, 0.08, DESK.d, 0.025), oak, DESK.x, DESK.y, DESK.z);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mesh(box(0.06, DESK.y - 0.04, 0.06), black, DESK.x + sx * (DESK.w / 2 - 0.1), (DESK.y - 0.04) / 2, DESK.z + sz * (DESK.d / 2 - 0.1));
  mesh(box(DESK.w - 0.2, 0.05, 0.04), black, DESK.x, 0.35, DESK.z + DESK.d / 2 - 0.1);
  // drawer unit
  const drawerM = std(0xc99566, { roughness: 0.6 });
  mesh(box(0.6, 1.05, 1.1), drawerM, 0.25, 0.86, DESK.z);
  for (let k = 0; k < 3; k++) {
    mesh(box(0.56, 0.3, 0.02), std(0xd5a374, { roughness: 0.5 }), 0.25, 0.53 + k * 0.33, DESK.z + 0.56);
    mesh(box(0.18, 0.03, 0.04), black, 0.25, 0.6 + k * 0.33, DESK.z + 0.58);
  }
  const deskTop = DESK.y + 0.04;

  // laptop
  const silver = std(0xc5c9d0, { metalness: 0.6, roughness: 0.35 });
  const lap = new THREE.Group(); lap.position.set(DESK.x, deskTop, -1.95); scene.add(lap);
  mesh(rbox(0.8, 0.035, 0.52, 0.015), silver, 0, 0.018, 0, lap);
  mesh(box(0.7, 0.004, 0.24), std(0x1d1f24), 0, 0.037, 0.06, lap, { cast: false });
  const lid = new THREE.Group(); lid.position.set(0, 0.035, 0.26); lid.rotation.x = 0.28; lap.add(lid);
  mesh(rbox(0.8, 0.52, 0.025, 0.012), silver, 0, 0.26, 0, lid);
  const screen = TX.createScreen();
  const screenMat = new THREE.MeshBasicMaterial({ map: screen.texture, toneMapped: false });
  const scr = mesh(new THREE.PlaneGeometry(0.72, 0.45), screenMat, 0, 0.27, -0.014, lid, { cast: false });
  scr.rotation.y = Math.PI;
  mesh(new THREE.CircleGeometry(0.08, 32), new THREE.MeshStandardMaterial({ map: TX.stickerTexture(), roughness: 0.5 }), 0, 0.28, 0.0135, lid, { cast: false });
  mesh(new THREE.CircleGeometry(0.05, 6), std(0x7fd1b9), 0.24, 0.42, 0.0135, lid, { cast: false });
  mesh(new THREE.PlaneGeometry(0.12, 0.07), std(0xffd166), -0.25, 0.12, 0.0135, lid, { cast: false }).rotation.z = 0.2;
  const screenLight = new THREE.PointLight(0x9fb4ff, 0.3, 3, 2);
  screenLight.position.set(DESK.x, deskTop + 0.35, -2.1);
  scene.add(screenLight);

  // article journals in a desk organizer
  const articleRoots = [];
  data.articles.forEach((a, i) => {
    const w = 0.1, h = 0.64 - (i % 3) * 0.03, d = 0.46;
    const col = a.color;
    const cover = new THREE.MeshStandardMaterial({ map: TX.journalCoverTexture(a, i), roughness: 0.7 });
    const spine = new THREE.MeshStandardMaterial({ map: TX.spineTexture({ title: a.spine, color: col, w: 96, h: 512 }), roughness: 0.7 });
    const pages = std(0xf6eedf);
    const back = std(new THREE.Color(col).multiplyScalar(0.8));
    const root = new THREE.Group();
    root.position.set(-0.02 + i * 0.112, deskTop + h / 2 + 0.001, -2.0);
    scene.add(root);
    mesh(box(w, h, d), [cover, back, pages, pages, spine, back], 0, 0, 0, root);
    register(root, { kind: 'article', index: i, label: a.title }, { dir: new THREE.Vector3(0, 1, 0), selectOffset: 0.32, hoverOffset: 0.06 });
    articleRoots.push(root);
  });
  mesh(box(0.03, 0.36, 0.34), black, 0.66, deskTop + 0.18, -2.0);
  mesh(box(0.14, 0.012, 0.34), black, 0.6, deskTop + 0.006, -2.0);

  // desk lamp
  const lampG = new THREE.Group(); lampG.position.set(-1.98, deskTop, -1.42); scene.add(lampG);
  const lampMat = std(0x2e5b52, { roughness: 0.4, metalness: 0.2 });
  mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.05, 20), lampMat, 0, 0.025, 0, lampG);
  const j1 = new THREE.Vector3(0, 0.05, 0), j2 = new THREE.Vector3(0.0, 0.66, -0.2), j3 = new THREE.Vector3(0.36, 0.74, -0.32);
  rod(j1, j2, 0.018, lampMat, lampG); rod(j2, j3, 0.018, lampMat, lampG);
  mesh(new THREE.SphereGeometry(0.035, 10, 8), lampMat, j2.x, j2.y, j2.z, lampG);
  const shade = mesh(new THREE.ConeGeometry(0.16, 0.24, 24, 1, true), std(0x2e5b52, { side: THREE.DoubleSide, roughness: 0.4 }), j3.x + 0.05, j3.y - 0.06, j3.z, lampG);
  shade.rotation.z = 0.5;
  const bulbMat = new THREE.MeshStandardMaterial({ color: 0xfff3d6, emissive: 0xffc46b, emissiveIntensity: 0.4 });
  mesh(new THREE.SphereGeometry(0.06, 12, 10), bulbMat, j3.x + 0.07, j3.y - 0.14, j3.z, lampG, { cast: false });
  const lampLight = new THREE.PointLight(0xffb46b, 1, 7, 2);
  lampLight.position.set(-1.98 + j3.x + 0.07, deskTop + j3.y - 0.2, -1.42 + j3.z);
  scene.add(lampLight);

  // mug + steam ("coffee-powered late-night build sessions")
  const mugG = new THREE.Group(); mugG.position.set(-0.2, deskTop, -1.22); scene.add(mugG);
  mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.2, 20), std(0xc2562f, { roughness: 0.45 }), 0, 0.1, 0, mugG);
  mesh(new THREE.CircleGeometry(0.08, 20), std(0x3b2416, { roughness: 0.2 }), 0, 0.185, 0, mugG).rotation.x = -Math.PI / 2;
  const handle = mesh(new THREE.TorusGeometry(0.055, 0.016, 8, 16, Math.PI), std(0xc2562f), 0.09, 0.1, 0, mugG);
  handle.rotation.z = -Math.PI / 2;
  const steamTex = TX.softDotTexture();
  const steam = [];
  for (let k = 0; k < 4; k++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, opacity: 0, depthWrite: false }));
    sp.raycast = () => {};
    sp.userData.phase = k / 4;
    mugG.add(sp);
    steam.push(sp);
  }

  // open notebook + pen (where the drafts start)
  const nb = mesh(new THREE.PlaneGeometry(0.72, 0.48), new THREE.MeshStandardMaterial({ map: TX.notebookTexture(), roughness: 0.9 }), -1.45, deskTop + 0.006, -1.28, scene, { cast: false });
  nb.rotation.set(-Math.PI / 2, 0, 0.18);
  const pen = rod(new THREE.Vector3(-1.2, deskTop + 0.015, -1.15), new THREE.Vector3(-1.0, deskTop + 0.015, -1.38), 0.012, std(0x2b3a67));
  pen.castShadow = true;
  // small desk plant
  mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.16, 14), std(0xefe2cc), -2.05, deskTop + 0.08, -2.05);
  for (let k = 0; k < 7; k++) {
    const lf = mesh(new THREE.SphereGeometry(0.06, 8, 6), std(0x4f8f57), -2.05 + Math.cos(k * 0.9) * 0.06, deskTop + 0.2 + (k % 3) * 0.03, -2.05 + Math.sin(k * 0.9) * 0.06);
    lf.scale.set(0.6, 1.5, 0.6); lf.rotation.set(Math.sin(k) * 0.5, 0, Math.cos(k) * 0.5);
  }

  // ---------- Ruchir: 3D avatar typing at the desk ----------
  const avatar = createAvatar();
  avatar.root.position.copy(AVATAR_POS);
  scene.add(avatar.root);
  register(avatar.person, { kind: 'talk', index: 0, label: "Ruchir — say hi 👋" }, { dir: new THREE.Vector3(0, 0, 0), selectOffset: 0, hoverOffset: 0 });
  avatar.person.userData.mats = []; // the avatar handles its own highlight
  const ruchir = { pos: AVATAR_POS.clone(), standee: null };

  // ...or his character art as a life-size standee beside the desk (set profile.character in data.js)
  const charUrl = new URLSearchParams(location.search).get('character') || data.profile.character;
  // Keep the sculpted placeholder completely out of sight while the real skinned mesh loads.
  // A failed fetch restores it, rather than leaving a broken room.
  if (!charUrl) avatar.person.visible = false;
  if (charUrl) {
    const root = new THREE.Group(); root.position.copy(STANDEE_POS); scene.add(root);
    const picMat = new THREE.MeshBasicMaterial({ alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false });
    const card = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 0.01), picMat);
    card.castShadow = true;
    root.add(card);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 28), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.016; shadow.scale.set(1, 0.6, 1); shadow.raycast = () => {};
    root.add(shadow);
    loadTex(charUrl, (t) => {
      const h = 3.55, w = (h * t.image.width) / t.image.height;
      card.geometry.dispose();
      card.geometry = new THREE.PlaneGeometry(w, h);
      card.geometry.translate(0, h / 2, 0);
      picMat.map = t; picMat.needsUpdate = true;
      card.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: t, alphaTest: 0.5 });
      // Ruchir now stands beside the desk; the chair is pulled out as if he just got up
      avatar.person.visible = false;
      avatar.person.traverse((o) => { if (o.isMesh) o.raycast = () => {}; });
      const i = interactive.indexOf(avatar.person); if (i >= 0) interactive.splice(i, 1);
      avatar.chair.position.set(0.15, 0, -0.25); avatar.chair.rotation.y = 0.5;
      ruchir.standee = { root, card, mat: picMat, height: h };
      ruchir.pos.copy(STANDEE_POS);
      addObstacle([STANDEE_POS.x, STANDEE_POS.z, 0.45]);
    });
    register(root, { kind: 'talk', index: 0, label: "Ruchir — say hi 👋" }, { dir: new THREE.Vector3(0, 0, 0), selectOffset: 0, hoverOffset: 0 });
  }
  const ruchirHead = (out) => {
    if (ruchir.real) return ruchir.real.headWorld(out);
    if (ruchir.standee) return out.copy(ruchir.standee.root.position).setY(ruchir.standee.height * 0.9);
    return avatar.head.getWorldPosition(out).add(new THREE.Vector3(0, 0.3, 0));
  };

  // ---------- The visitor (you) ----------
  const visitor = createVisitor();
  visitor.root.position.copy(SPAWN);
  visitor.root.rotation.y = -Math.PI / 2;
  scene.add(visitor.root);
  const player = { pos: visitor.root.position, yaw: -Math.PI / 2, vel: new THREE.Vector3(), target: null, stuck: 0, speed: 0 };
  const firstPersonArms = createFirstPersonArms();
  scene.add(firstPersonArms.root);
  const npcSystem = createNPCSystem({
    scene, reducedMotion,
    onGreet: (index, line) => hooks.onNpcGreet?.(index, line),
  });
  // Replace primitive people with genuine 3D human meshes, skinned skeletons,
  // real fabric/skin maps and bundled motion-capture animations.
  // Hide the procedural mannequin immediately: never present it as Meera
  // during VRM streaming or when her original asset cannot be loaded.
  npcSystem.hidePlaceholder(0);
  const realCharacters = createRealCharacters({
    scene,
    onLoaded(id, rig) {
      if (id === 'ruchir') {
        if (charUrl) { scene.remove(rig.root); return; } // query-string standee remains an explicit override
        ruchir.real = rig;
        ruchir.pos.copy(STANDEE_POS);
        avatar.person.visible = false;
        avatar.person.traverse(o => { if (o.isMesh) o.raycast = () => {}; });
        const index = interactive.indexOf(avatar.person);
        if (index >= 0) interactive.splice(index, 1);
        avatar.chair.position.set(0.15, 0, -0.25);
        avatar.chair.rotation.y = 0.5;
        register(rig.root, { kind: 'talk', index: 0, label: 'Talk to Ruchir' },
          { dir: new THREE.Vector3(), selectOffset: 0, hoverOffset: 0 });
        addObstacle([STANDEE_POS.x, STANDEE_POS.z, 0.44]);
      } else if (id === 'maya') {
        const index = 0;
        npcSystem.attachVisual(index, rig.root);
        register(rig.root, { kind: 'npc', index, label: 'Talk to Meera' },
          { dir: new THREE.Vector3(), selectOffset: 0, hoverOffset: 0 });
      }
    },
    onError(id, error) {
      console.error(id === 'maya'
        ? 'Meera VRM could not be loaded; guide remains hidden (no impostor avatar).'
        : 'Realistic character could not load, using fallback:', id, error);
      if (id === 'ruchir' && !charUrl) avatar.person.visible = true;
    },
  });
  if (!charUrl) realCharacters.load('ruchir', [STANDEE_POS.x, STANDEE_POS.z], { outfit: 'shirt', scale: 1.56 });
  // Meera is the entire introduction. Load her model immediately and expose the
  // promise so the opening scene never shows an empty avatar or a substituted 2D still.
  const guideReady = realCharacters.load('maya', [2.75, -2.8], {
    outfit: 'tee', scale: 1.55, tint: '#b4c9a4',
  });
  const walkRing = mesh(new THREE.RingGeometry(0.16, 0.26, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }), 0, 0.03, 0, scene, { cast: false, receive: false });
  walkRing.rotation.x = -Math.PI / 2;
  walkRing.raycast = () => {};

  // ---------- Decor ----------
  const rug = mesh(new THREE.CircleGeometry(2.2, 64), new THREE.MeshStandardMaterial({ map: TX.rugTexture(), roughness: 1 }), 1.5, 0.012, 1.6, scene, { cast: false });
  rug.rotation.x = -Math.PI / 2;
  const loungeFabric = photograph(new THREE.MeshPhysicalMaterial({
    color: 0xc1c5c0, roughness: 0.95, sheen: 0.48, sheenRoughness: 0.89, map: fabricGrain,
  }), 'rough_linen', 5, 5, {color:false,normal:.6,rough:false});
  const bean = mesh(new THREE.SphereGeometry(0.72, 48, 32), loungeFabric, 2.7, 0.4, 2.4);
  bean.scale.set(1, 0.6, 1);
  mesh(new THREE.SphereGeometry(0.4, 32, 24), loungeFabric, 2.45, 0.68, 2.15).scale.set(1, 0.55, 1);
  // low coffee table on the rug with a stack of webtoon comics and a sketch pad
  const tableG = new THREE.Group(); tableG.position.set(0.7, 0, 1.0); tableG.rotation.y = 0.25; scene.add(tableG);
  mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.07, 36), oak, 0, 0.5, 0, tableG);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const leg = mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.5, 8), black, Math.cos(a) * 0.42, 0.25, Math.sin(a) * 0.42, tableG);
    leg.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12);
  }
  ['#f2c14e', '#e85d75', '#4ea5d9', '#2a211b'].forEach((c, k) => {
    const comic = mesh(box(0.36, 0.035, 0.5), std(c, { roughness: 0.6 }), -0.18, 0.555 + k * 0.036, 0.05, tableG);
    comic.rotation.y = (k - 1.5) * 0.12;
  });
  const cupG = new THREE.Group(); cupG.position.set(0.25, 0.535, -0.15); tableG.add(cupG);
  mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.15, 16), std(0xf2eadc, { roughness: 0.4 }), 0, 0.075, 0, cupG);
  mesh(new THREE.CircleGeometry(0.06, 16), std(0x3b2416, { roughness: 0.2 }), 0, 0.14, 0, cupG).rotation.x = -Math.PI / 2;
  // helmet by the beanbag (Ahmedabad, usually via Rapido)
  const helmet = mesh(new THREE.SphereGeometry(0.27, 24, 16, 0, Math.PI * 2, 0, Math.PI / 1.8), std(0xf2b233, { roughness: 0.35 }), 4.45, 0.02, 1.25);
  helmet.rotation.set(-0.25, 0.6, 0.1);
  mesh(new THREE.BoxGeometry(0.34, 0.08, 0.04), std(0x222326, { roughness: 0.1, metalness: 0.4 }), 4.52, 0.17, 1.47).rotation.set(-0.3, 0.6, 0);
  // ---------- Floating particles (hearts, notes, z's, drops) ----------
  const FLOAT_TEX = {};
  ['heart', 'note', 'z', 'drop', 'spark'].forEach((k) => (FLOAT_TEX[k] = TX.glyphTexture(k)));
  const floaters = [];
  function spawn(kind, pos, { rise = 0.8, life = 1.6, size = 0.18, drift = [0, 0] } = {}) {
    if (floaters.length > 60) return;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: FLOAT_TEX[kind], transparent: true, depthWrite: false, opacity: 0 }));
    sp.raycast = () => {};
    sp.position.copy(pos);
    sp.scale.setScalar(size);
    scene.add(sp);
    floaters.push({ sp, t: 0, life, rise, from: pos.clone(), drift, size, sway: Math.random() * 6 });
  }
  function updateFloaters(dt) {
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.t += dt;
      const k = f.t / f.life;
      if (k >= 1) { scene.remove(f.sp); f.sp.material.dispose(); floaters.splice(i, 1); continue; }
      f.sp.position.set(f.from.x + f.drift[0] * k + Math.sin(f.sway + f.t * 3) * 0.04, f.from.y + f.rise * k, f.from.z + f.drift[1] * k);
      f.sp.material.opacity = Math.sin(Math.min(1, k * 1.4) * Math.PI * 0.5) * (1 - Math.max(0, k - 0.6) / 0.4);
      f.sp.scale.setScalar(f.size * (0.7 + 0.5 * k));
    }
  }

  // ---------- Extras: cat, record player, phone, résumé, lanyards, duck, plant ----------
  const extras = buildExtras({ scene, mesh, std, box, rbox, rod, register, spawn, deskTop, profile: data.profile });

  // window toggles day / night, desk lamp toggles itself
  const winHit = mesh(new THREE.PlaneGeometry(winW, winH), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), winCx, winCy, -4.95, scene, { cast: false, receive: false });
  const windowRoot = new THREE.Group(); scene.add(windowRoot); windowRoot.add(winHit);
  register(windowRoot, { kind: 'window', index: 0, label: 'Window — switch day / night' }, { dir: new THREE.Vector3(0, 0, 0), selectOffset: 0, hoverOffset: 0 });
  mesh(new THREE.BoxGeometry(0.62, 0.9, 0.55), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }), 0.2, 0.45, -0.15, lampG, { cast: false, receive: false });
  register(lampG, { kind: 'lamp', index: 0, label: 'Desk lamp — on / off' }, { dir: new THREE.Vector3(0, 0, 0), selectOffset: 0, hoverOffset: 0 });
  let lampOn = 1, lampAmt = 1;

  // ---------- Lights ----------
  const hemi = new THREE.HemisphereLight(0xdde8f6, 0x57636f, 1.13);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xe6efff, 2.2);
  sun.position.set(-4.7, 8.5, -9.2);
  sun.target.position.set(0, 0, -1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xffe2c4, 0.5);
  fill.position.set(-2, 6, 10);
  scene.add(fill);

  const cornerBounce = new THREE.PointLight(0xf9bd87, 0.6, 9, 2);
  cornerBounce.position.set(3.85, 3.35, 2.9); scene.add(cornerBounce);
  // Sparse airborne dust catches warm light without expensive volumetrics.
  const dustPositions = new Float32Array(90 * 3);
  for (let i = 0; i < 90; i++) {
    dustPositions[3 * i] = Math.sin(i * 13.91) * 4.15;
    dustPositions[3 * i + 1] = 1.1 + (Math.sin(i * 8.43) * 0.5 + 0.5) * 3.7;
    dustPositions[3 * i + 2] = Math.cos(i * 16.73) * 4.12;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xffd6a8, size: 0.035, transparent: true, opacity: 0.16,
    depthWrite: false, map: TX.softDotTexture(), sizeAttenuation: true,
  }));
  dust.raycast = () => {}; scene.add(dust);

  const DAY = { hemi: 0.78, hemiSky: new THREE.Color(0xdde8f6), hemiGround: new THREE.Color(0x57636f), sun: 2.2, sunCol: new THREE.Color(0xe6efff), fill: 0.75, lamp: 1.05, neon: 0.34, screen: 0.32, bulb: 0.28, gallery: 0, exposure: 1.04, pic: 1 };
  const NIGHT = { hemi: 0.38, hemiSky: new THREE.Color(0x6a74b8), hemiGround: new THREE.Color(0x2a2030), sun: 0.55, sunCol: new THREE.Color(0x9fb4ff), fill: 0.12, lamp: 9, neon: 4, screen: 2.2, bulb: 3, gallery: 2.5, exposure: 1.1, pic: 0.92 };
  let nightTarget = 0, night = 0;
  function applyNight(n) {
    const L = (a, b) => a + (b - a) * n;
    hemi.intensity = L(DAY.hemi, NIGHT.hemi);
    hemi.color.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, n);
    hemi.groundColor.copy(DAY.hemiGround).lerp(NIGHT.hemiGround, n);
    sun.intensity = L(DAY.sun, NIGHT.sun);
    sun.color.copy(DAY.sunCol).lerp(NIGHT.sunCol, n);
    fill.intensity = L(DAY.fill, NIGHT.fill);
    cornerBounce.intensity = L(0.45, 1.7);
    lampLight.intensity = L(DAY.lamp, NIGHT.lamp) * lampAmt;
    neonLight.intensity = L(DAY.neon, NIGHT.neon);
    neonMat.opacity = L(0.75, 1);
    screenLight.intensity = L(DAY.screen, NIGHT.screen);
    bulbMat.emissiveIntensity = L(DAY.bulb, NIGHT.bulb) * lampAmt;
    bulbMats.forEach((m) => (m.emissiveIntensity = L(DAY.gallery, NIGHT.gallery)));
    skyNight.opacity = n;
    groundMat.color.copy(GROUND_DAY).lerp(GROUND_NIGHT, n);
    // the ceiling light only matters when you're inside, walking around at night
    const inside = ceiling.visible ? 1 : 0;
    ceilingLight.intensity = L(0, 7) * inside;
    fixtureMat.emissiveIntensity = L(0.2, 1.6);
    renderer.toneMappingExposure = L(DAY.exposure, NIGHT.exposure);
    sun.shadow.radius=lowPower?1:3;
    const pic = L(DAY.pic, NIGHT.pic);
    certRoots.forEach((r) => r.userData.picMat.color.setScalar(r.userData.picMat.map ? pic : 0.93));
  }

  // ---------- Camera views ----------
  const VIEWS = {
    certs: { target: [-4.9, 3.6, 0.1], offset: [15.0, 1.0, 2.6] },
    shelf: { target: [3.0, 2.3, -4.6], offset: [0.7, 1.0, 9.4] },
    desk: { target: [-0.5, 2.0, -1.9], offset: [4.6, 3.1, 5.8] },
    avatar: { target: [-0.95, 2.3, -2.5], offset: [1.1, 1.5, 5.6] },
    contact: { target: [0.15, 3.7, -4.9], offset: [2.4, 0.9, 8.2] },
  };
  // Focus views were tuned for a 32° lens on a wide screen; scale them for other lenses/shapes.
  function narrowFactor() {
    const lens = Math.tan(THREE.MathUtils.degToRad(16)) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    return lens * Math.max(1, Math.pow(1.5 / camera.aspect, 0.85));
  }
  // Overview: fit the whole room block on screen, centred in the space between the top bar and the dock.
  const ROOM_CORNERS = [];
  for (const x of [-5.3, 5]) for (const y of [-0.5, 6]) for (const z of [-5.3, 5]) ROOM_CORNERS.push(new THREE.Vector3(x, y, z));
  const fitCam = new THREE.PerspectiveCamera();
  const fitV = new THREE.Vector3();
  const OV_DIR = new THREE.Vector3(1, 0.82, 1).normalize();
  function overview() {
    fitCam.fov = camera.fov; fitCam.aspect = camera.aspect; fitCam.near = 0.1; fitCam.far = 1000;
    fitCam.updateProjectionMatrix();
    const compact = W < 720;
    const top = 1 - ((compact ? 70 : 84) / H) * 2, bottom = -1 + ((compact ? 74 : 92) / H) * 2;
    const side = 1 - ((compact ? 14 : 40) / W) * 2;
    const target = new THREE.Vector3(-0.15, 2.4, -0.15);
    let dist = 30;
    const bounds = () => {
      fitCam.position.copy(target).addScaledVector(OV_DIR, dist);
      fitCam.lookAt(target); fitCam.updateMatrixWorld();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const c of ROOM_CORNERS) { fitV.copy(c).project(fitCam); x0 = Math.min(x0, fitV.x); x1 = Math.max(x1, fitV.x); y0 = Math.min(y0, fitV.y); y1 = Math.max(y1, fitV.y); }
      return { x0, x1, y0, y1 };
    };
    for (let pass = 0; pass < 3; pass++) {
      let lo = 4, hi = 400;
      for (let i = 0; i < 32; i++) {
        dist = (lo + hi) / 2;
        const b = bounds();
        if (b.x0 >= -side && b.x1 <= side && b.y0 >= bottom && b.y1 <= top) hi = dist; else lo = dist;
      }
      dist = hi;
      // re-centre the block inside the padded area
      const b = bounds();
      const dx = (b.x0 + b.x1) / 2, dy = (b.y0 + b.y1) / 2 - (top + bottom) / 2;
      const halfH = dist * Math.tan(THREE.MathUtils.degToRad(fitCam.fov / 2)), halfW = halfH * fitCam.aspect;
      const right = new THREE.Vector3().setFromMatrixColumn(fitCam.matrixWorld, 0);
      const up = new THREE.Vector3().setFromMatrixColumn(fitCam.matrixWorld, 1);
      target.addScaledVector(right, dx * halfW).addScaledVector(up, dy * halfH);
    }
    controls.maxDistance = Math.max(36, dist * 1.25);
    return { pos: target.clone().addScaledVector(OV_DIR, dist), target };
  }
  function viewFor(name) {
    if (name === 'overview' || !VIEWS[name]) return overview();
    const v = VIEWS[name], f = narrowFactor();
    const target = new THREE.Vector3(...v.target);
    return { pos: target.clone().add(new THREE.Vector3(...v.offset).multiplyScalar(f)), target };
  }
  let tween = null;
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const viewFov = () => (camera.aspect < 0.8 ? 38 : 26);
  const fpFov = () => (camera.aspect < 0.8 ? 79 : 80);
  function flyTo(view, dur = 1.2) {
    const { pos, target } = view;
    if (reducedMotion || dur === 0) {
      camera.position.copy(pos); controls.target.copy(target); camera.lookAt(target); controls.update();
      camera.fov = viewFov(); camera.updateProjectionMatrix();
      return;
    }
    tween = { from: camera.position.clone(), fromT: controls.target.clone(), to: pos, toT: target, start: performance.now(), dur, fromFov: camera.fov };
  }
  let currentView = 'overview';

  // ---------- Modes: 'follow' (first person, walking around), 'map' (whole room), 'focus' (a panel is open) ----------
  let mode = 'map';
  let homeMode = 'follow';
  let talking = false, movementLocked = false;
  const EYE = 2.75;
  const cam = { yaw: 0.93, pitch: -0.06 };
  let lookSensitivity = 1.0, invertLookY = false;
  function applyMouseLook(dx, dy) {
    if (mode !== 'follow' || talking || guided.active) return;
    lookGoal = null;
    const f = 0.00185 * lookSensitivity;
    cam.yaw -= THREE.MathUtils.clamp(dx, -140, 140) * f;
    cam.pitch = THREE.MathUtils.clamp(cam.pitch -
      THREE.MathUtils.clamp(dy, -140, 140) * f * (invertLookY ? -1 : 1), -1.15, 1.05);
  }

  // Auto-play guided first-person tour. Tour updates the visitor's position,
  // orientation and guide NPC; no orbit or third-person camera is used.
  const tourPlan = guidedTourPlan(data);
  const tourLength = tourPlan.reduce((total, stop) => total + stop.seconds, 0);
  const guided = {
    active: false, finished: false, index: 0, elapsed: 0, total: 0,
    beat: 'speaker', fov: 80,
    focus: new THREE.Vector3(), face: new THREE.Vector3(),
    from: new THREE.Vector2(SPAWN.x, SPAWN.z), last: new THREE.Vector2(SPAWN.x, SPAWN.z),
  };
  function announceTourStop(index, beat = 'speaker') {
    const item = tourPlan[index];
    if (!item) return;
    const speaker = beat === 'speaker';
    const text = speaker ? item.speakerSay : item.exhibitSay;
    if (!text) return;
    const seconds = speaker ? item.speakerSeconds : item.exhibitSeconds;
    hooks.onTourStep?.({
      index, total: tourPlan.length,
      title: item.title, category: item.category, tags: item.tags,
      image: item.image, beat, text, seconds, id: item.id,
    });
  }
  function beginGuidedTour() {
    if (guided.active || guided.finished || !tourPlan.length) return false;
    if (mode !== 'follow') setMode('follow');
    guided.active = true;
    guided.index = 0; guided.elapsed = 0; guided.total = 0;
    guided.beat = 'travel'; guided.fov = 80;
    fp.blend = 1; // absolutely no old overview-camera interpolation during the tour
    guided.from.set(player.pos.x, player.pos.z);
    guided.last.copy(guided.from);
    player.target = null; player.vel.set(0, 0, 0); player.speed = 0;
    movementLocked = true; talking = false; lookGoal = null;
    inset.x = inset.y = inset.tx = inset.ty = 0;
    camera.clearViewOffset();
    camera.fov = fpFov();
    camera.near = 0.065;
    camera.updateProjectionMatrix();
    const start = tourPlan[0];
    npcSystem.setTourGuide(0, start.guide[0], start.guide[1], true);
    return true;
  }
  function finishGuidedTour() {
    guided.active = false;
    guided.finished = true;
    movementLocked = false;
    player.target = null; player.vel.set(0, 0, 0);
    npcSystem.releaseTourGuide(0);
    hooks.onTourFinished?.();
  }
  const shortestAngle = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
  // Camera grammar: travel → close-up on speaking Meera → optical zoom
  // onto the real 3D item/wall. Both shots come from the visitor's eyes.
  function updateGuidedTour(dt) {
    if (!guided.active) return;
    guided.total += dt;
    guided.elapsed += dt;
    let stop = tourPlan[guided.index];
    // Advance by elapsed scene-time, even if the browser briefly throttles.
    while (stop && guided.elapsed >= stop.seconds) {
      guided.elapsed -= stop.seconds;
      guided.index += 1;
      if (guided.index >= tourPlan.length) { finishGuidedTour(); return; }
      stop = tourPlan[guided.index];
      guided.from.set(player.pos.x, player.pos.z);
      guided.beat = 'travel';
    }
    const t = Math.max(0, Math.min(1, guided.elapsed / stop.seconds));
    const travelK = ease(Math.min(1, guided.elapsed / stop.travelSeconds));
    player.pos.x = THREE.MathUtils.lerp(guided.from.x, stop.pos[0], travelK);
    player.pos.z = THREE.MathUtils.lerp(guided.from.y, stop.pos[1], travelK);
    collide(player.pos);
    player.speed = Math.min(2.2, guided.last.distanceTo(new THREE.Vector2(player.pos.x, player.pos.z)) / Math.max(dt, 0.001));
    guided.last.set(player.pos.x, player.pos.z);

    // The real guide must face the viewer, with no cut to a mismatched still image.
    npcSystem.setTourGuide(0, stop.guide[0], stop.guide[1]);
    const rig = realCharacters.get('maya');
    const anchor = npcSystem.anchors()[0];
    guided.face.set(anchor.x, 2.85, anchor.z);
    if (rig) {
      rig.headWorld(guided.face);
      // Safe bounds for head bones across GLB rigs and initial animation poses.
      if (!Number.isFinite(guided.face.y) ||
          guided.face.y < 1.25 || guided.face.y > 4.8) {
        guided.face.set(anchor.x, 2.85, anchor.z);
      }
    }
    // Frame head AND shoulders; don't move the camera inside the head mesh.
    guided.face.y -= 0.13;
    const target = new THREE.Vector3(stop.look[0], stop.look[1], stop.look[2]);
    const hasExhibit = !!stop.exhibitSay;
    if (guided.beat === 'travel' && guided.elapsed >= stop.speakerStart) {
      guided.beat = 'speaker';
      announceTourStop(guided.index, 'speaker');
    }
    if (hasExhibit && guided.beat === 'speaker' && guided.elapsed >= stop.revealStart) {
      guided.beat = 'reveal';
    }
    if (hasExhibit && guided.beat === 'reveal' && guided.elapsed >= stop.exhibitStart) {
      guided.beat = 'exhibit';
      announceTourStop(guided.index, 'exhibit');
    }
    // Finish the motivated pan BEFORE the line identifying the exhibit begins.
    const revealBlend = hasExhibit
      ? ease(Math.max(0, Math.min(1, (guided.elapsed - stop.revealStart) / 1.05)))
      : 0;
    guided.focus.lerpVectors(guided.face, target, revealBlend);
    const dx = guided.focus.x - player.pos.x;
    const dz = guided.focus.z - player.pos.z;
    const dist = Math.max(0.5, Math.hypot(dx, dz));
    const wantYaw = Math.atan2(-dx, -dz);
    const wantPitch = THREE.MathUtils.clamp(
      Math.atan2(guided.focus.y - EYE, dist), -0.86, 0.82);
    cam.yaw += shortestAngle(cam.yaw, wantYaw) * Math.min(1, dt * 4.2);
    cam.pitch += (wantPitch - cam.pitch) * Math.min(1, dt * 4.2);

    const faceDistance = Math.max(1.5, Math.hypot(
      guided.face.x - player.pos.x, guided.face.z - player.pos.z));
    // Calibrated per shot distance: a close head-and-shoulders portrait,
    // not a giant distorted face covering the whole screen.
    const faceFov = THREE.MathUtils.clamp(
      THREE.MathUtils.radToDeg(2 * Math.atan(1.72 / (2 * faceDistance))), 34, 58);
    const exhibitDistance = Math.hypot(target.x - player.pos.x, target.z - player.pos.z);
    const exhibitFov = THREE.MathUtils.clamp(68 - Math.max(0, exhibitDistance - 2.4) * 4.2, 42, 66);
    const zoomIn = ease(Math.max(0, Math.min(1,
      (guided.elapsed - stop.travelSeconds * 0.45) / (stop.travelSeconds * 0.55))));
    const faceShotFov = THREE.MathUtils.lerp(78, faceFov, zoomIn);
    const desiredFov = THREE.MathUtils.lerp(faceShotFov, exhibitFov, revealBlend);
    guided.fov = THREE.MathUtils.damp(guided.fov, desiredFov, 3.6, dt);
  }

  const fp = { blend: 1, fromPos: new THREE.Vector3(), fromQuat: new THREE.Quaternion(), fromFov: 26, bob: 0 };
  const fpQuat = new THREE.Quaternion(), fpEuler = new THREE.Euler(0, 0, 0, 'YXZ'), fpPos = new THREE.Vector3(), headTmp = new THREE.Vector3();
  function setMode(m) {
    const was = mode;
    mode = m;
    const prevFov = camera.fov;
    if (m === 'follow') {
      tween = null; controls.enabled = false; currentView = 'follow';
      fp.blend = reducedMotion ? 1 : 0;
      fp.fromPos.copy(camera.position); fp.fromQuat.copy(camera.quaternion); fp.fromFov = prevFov;
    } else controls.enabled = true;
    if ((m === 'follow') !== (was === 'follow')) { resize(); camera.fov = prevFov; camera.updateProjectionMatrix(); }
    visitor.root.visible = m !== 'follow'; // you don't see yourself in first person
    if (m === 'map') { currentView = 'overview'; flyTo(overview()); }
    hooks.onMode?.(m);
  }
  function goHome() { setMode(homeMode === 'follow' ? 'follow' : 'map'); }
  let lookGoal = null;
  function lookToward(p) {
    const ex = player.pos.x, ez = player.pos.z;
    const dx = p.x - ex, dz = p.z - ez;
    lookGoal = { yaw: Math.atan2(-dx, -dz), pitch: THREE.MathUtils.clamp(Math.atan2(p.y - EYE, Math.hypot(dx, dz)), -1.0, 0.9) };
  }
  function updateFirstPerson(dt) {
    if (talking) {
      // turn to face Ruchir while you talk
      const dx = ruchir.pos.x - player.pos.x, dz = ruchir.pos.z - player.pos.z;
      let d = Math.atan2(-dx, -dz) - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      cam.yaw += d * Math.min(1, dt * 4);
      ruchirHead(headTmp);
      const wantPitch = Math.atan2(headTmp.y - 0.35 - EYE, Math.hypot(dx, dz));
      cam.pitch += (wantPitch - cam.pitch) * Math.min(1, dt * 4);
    } else if (lookGoal) {
      // smoothly turn your head toward something (opening a section, "Show" in the secrets list)
      let d = lookGoal.yaw - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      cam.yaw += d * Math.min(1, dt * 5);
      cam.pitch += (lookGoal.pitch - cam.pitch) * Math.min(1, dt * 5);
      if (Math.abs(d) < 0.01 && Math.abs(lookGoal.pitch - cam.pitch) < 0.01) lookGoal = null;
    }
    if (!talking && canWalk() && input.turn) { cam.yaw += input.turn * 2.1 * dt; lookGoal = null; }
    cam.pitch = THREE.MathUtils.clamp(cam.pitch, -1.15, 1.05);
    fp.bob += dt * player.speed * 2.6;
    const bobY = Math.sin(fp.bob * 2) * 0.04 * Math.min(1, player.speed / 2.6);
    fpPos.set(player.pos.x, EYE + bobY, player.pos.z);
    fpEuler.set(cam.pitch, cam.yaw, 0);
    fpQuat.setFromEuler(fpEuler);
    if (fp.blend < 1) {
      fp.blend = Math.min(1, fp.blend + dt / 1.4);
      const k = ease(fp.blend);
      camera.position.lerpVectors(fp.fromPos, fpPos, k);
      camera.quaternion.slerpQuaternions(fp.fromQuat, fpQuat, k);
      camera.fov = THREE.MathUtils.lerp(fp.fromFov, guided.active ? guided.fov : fpFov(), k);
      camera.updateProjectionMatrix();
    } else {
      camera.position.copy(fpPos);
      camera.quaternion.copy(fpQuat);
      // Critical fix: starting in first person used to leave the camera at
      // the 26-degree overview lens, giving an unusable ultra-zoomed view.
      const immersiveFov = guided.active ? guided.fov : fpFov();
      if (Math.abs(camera.fov - immersiveFov) > 0.01) {
        camera.fov = immersiveFov;
        camera.updateProjectionMatrix();
      }
    }
    // keep the orbit target in front of you, so leaving first person starts from a sensible place
    controls.target.set(fpPos.x - Math.sin(cam.yaw) * 3, EYE, fpPos.z - Math.cos(cam.yaw) * 3);
    player.yaw = cam.yaw + Math.PI;
    visitor.root.rotation.y = player.yaw;
  }

  // ---------- Panel inset (keeps the focus visible beside the drawer) ----------
  const inset = { x: 0, y: 0, tx: 0, ty: 0 };
  let W = 1, H = 1;
  function applyViewOffset() {
    // Inset offsets are only for interactive side drawers, never for a tour.
    if (guided.active || (Math.abs(inset.x) < 0.5 && Math.abs(inset.y) < 0.5)) camera.clearViewOffset();
    else camera.setViewOffset(W, H, inset.x, inset.y, W, H);
  }
  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    if (composer) composer.setSize(W, H);
    camera.aspect = W / H;
    camera.fov = mode === 'follow' ? fpFov() : viewFov();
    camera.updateProjectionMatrix();
    applyViewOffset();
  }
  window.addEventListener('resize', () => { resize(); if (mode !== 'follow' && !tween) flyTo(viewFor(currentView), 0.6); });
  resize();

  // ---------- Interaction ----------
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = null, selected = null, glowTarget = null;
  const shown = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  function castAt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(scene.children, true).filter((h) => shown(h.object));
  }
  function pickHit(hits) {
    const h = hits[0];
    if (!h) return { o: null, hit: null };
    let o = h.object;
    while (o && !o.userData.hit) o = o.parent;
    return { o: o || null, hit: h }; // first thing under the cursor wins (blocks what is behind)
  }
  const pick = (x, y) => pickHit(castAt(x, y)).o;
  function setHovered(o, e) {
    if (o !== hovered) {
      hovered = o;
      canvas.style.cursor = o ? 'pointer' : 'grab';
    }
    hooks.onHover?.(o ? o.userData.hit : null, e);
  }
  let down = null, pinchD = 0;
  let lastFreePointer = null;
  const pointers = new Map();
  canvas.addEventListener('pointerdown', (e) => {
    if (guided.active) return;
    down = { x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now() };
    lastFreePointer = { x: e.clientX, y: e.clientY };
    if (e.pointerType !== 'mouse' && canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch { /* pointer may be cancelled */ }
    }
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    pinchD = 0;
  });
  canvas.addEventListener('pointermove', (e) => {
    if (guided.active) return;
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (document.pointerLockElement === canvas) return; // mouse look is handled by look()
    if (mode === 'follow' && down && (e.buttons || e.pointerType !== 'mouse') && pointers.size === 1 && !talking) {
      lookGoal = null;
      // One-to-one horizontal and vertical swipe, including on touchscreens.
      // Drag left = look left, drag up = look up. No mouse wheel required.
      applyMouseLook(e.clientX - down.lx, e.clientY - down.ly);
      if (e.pointerType === 'touch' && e.cancelable) e.preventDefault();
      down.lx = e.clientX; down.ly = e.clientY;
      setHovered(null, e);
      return;
    }
    // Browser denied pointer lock? Looking around still works from a normal
    // mouse swipe over the 3D canvas, without holding a button or scrolling.
    if (mode === 'follow' && e.pointerType === 'mouse' && !down &&
        !document.pointerLockElement && document.body.classList.contains('at-game') &&
        !talking) {
      if (lastFreePointer) {
        applyMouseLook(e.clientX - lastFreePointer.x, e.clientY - lastFreePointer.y);
      }
      lastFreePointer = { x: e.clientX, y: e.clientY };
      setHovered(null, e);
      return;
    }
    if (e.pointerType !== 'mouse' || tween) return;
    if (e.buttons) { setHovered(null, e); return; }
    setHovered(pick(e.clientX, e.clientY), e);
  });
  canvas.addEventListener('pointerleave', () => { setHovered(null); lastFreePointer = null; });
  canvas.addEventListener('pointerenter', () => { lastFreePointer = null; });
  canvas.addEventListener('wheel', (e) => {
    // GTA-like 3D camera: wheel never controls vertical gaze or zoom.
    if (mode === 'follow' && e.cancelable) e.preventDefault();
  }, { passive: false });
  const endPointer = (e) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinchD = 0; };
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerup', (e) => {
    if (guided.active) return;
    endPointer(e);
    lastFreePointer = { x: e.clientX, y: e.clientY };
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 600;
    down = null;
    if (moved > 6 || !quick) return;
    // mouse locked (playing): a click uses whatever the crosshair points at
    if (document.pointerLockElement === canvas) { if (prompt && canWalk()) hooks.onSelect?.(prompt.kind, prompt.index); return; }
    const { o, hit } = pickHit(castAt(e.clientX, e.clientY));
    if (o) { hooks.onSelect?.(o.userData.hit.kind, o.userData.hit.index); return; }
    hooks.onEmptyClick?.();
    // click the floor to walk there
    if (hit && hit.point.y < 0.05 && canWalk()) { player.target = hit.point.clone().setY(0); player.stuck = 0; }
  });
  controls.addEventListener('start', () => { tween = null; });

  // ---------- The visitor walking around ----------
  const input = { x: 0, y: 0, run: false, turn: 0 };
  const before = new THREE.Vector3(), tryPos = new THREE.Vector3();
  function canWalk() { return !talking && !movementLocked && mode !== 'focus'; }
  function viewYaw() { return mode === 'follow' ? cam.yaw : Math.atan2(camera.position.x - controls.target.x, camera.position.z - controls.target.z); }
  function updatePlayer(t, dt) {
    let mx = 0, mz = 0;
    // ←/→ turn you in first person; on the map they sidestep instead
    const strafe = THREE.MathUtils.clamp(input.x - (mode === 'follow' ? 0 : input.turn), -1, 1);
    if (canWalk()) {
      if (strafe || input.y) {
        player.target = null;
        const yaw = viewYaw();
        mx = -Math.sin(yaw) * input.y + Math.cos(yaw) * strafe;
        mz = -Math.cos(yaw) * input.y - Math.sin(yaw) * strafe;
        const m = Math.hypot(mx, mz); if (m > 1) { mx /= m; mz /= m; }
      } else if (player.target) {
        const dx = player.target.x - player.pos.x, dz = player.target.z - player.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.12) player.target = null;
        else { const s = Math.min(1, d / 0.5); mx = (dx / d) * s; mz = (dz / d) * s; }
      }
    } else player.target = null;
    const maxSpeed = input.run ? 3.25 : 1.85;
    player.vel.x = THREE.MathUtils.damp(player.vel.x, mx * maxSpeed, 18, dt);
    player.vel.z = THREE.MathUtils.damp(player.vel.z, mz * maxSpeed, 18, dt);
    before.copy(player.pos);
    const sx = player.vel.x * dt, sz = player.vel.z * dt, want = Math.hypot(sx, sz);
    player.pos.x += sx; player.pos.z += sz;
    collide(player.pos);
    // walking straight into something round: try sliding around it to the left or right
    if (want > 1e-4 && before.distanceTo(player.pos) < want * 0.35) {
      let bestX = player.pos.x, bestZ = player.pos.z, bestD = before.distanceTo(player.pos);
      for (const a of [0.8, -0.8, 1.3, -1.3]) {
        const c = Math.cos(a), s = Math.sin(a);
        tryPos.set(before.x + sx * c - sz * s, 0, before.z + sx * s + sz * c);
        collide(tryPos);
        const d = before.distanceTo(tryPos);
        if (d > bestD + 1e-4) { bestD = d; bestX = tryPos.x; bestZ = tryPos.z; }
      }
      player.pos.x = bestX; player.pos.z = bestZ;
    }
    const speed = before.distanceTo(player.pos) / Math.max(dt, 1e-4);
    if (player.target) { player.stuck = speed < 0.3 ? player.stuck + dt : 0; if (player.stuck > 0.5) player.target = null; }
    if (Math.hypot(mx, mz) > 0.05) player.yawGoal = Math.atan2(mx, mz);
    if (talking) player.yawGoal = Math.atan2(ruchir.pos.x - player.pos.x, ruchir.pos.z - player.pos.z);
    if (mode !== 'follow' && player.yawGoal !== undefined) {
      let d = player.yawGoal - player.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
      player.yaw += d * Math.min(1, dt * 12);
      visitor.root.rotation.y = player.yaw;
    }
    player.speed = speed;
    visitor.update(t, dt, speed / 2.6);
    walkRing.material.opacity = THREE.MathUtils.damp(walkRing.material.opacity, player.target ? 0.85 : 0, 10, dt);
    if (player.target) { walkRing.position.set(player.target.x, 0.03, player.target.z); walkRing.scale.setScalar(1 + Math.sin(t * 6) * 0.12); }
  }

  // ---------- "Press E" prompts when you walk up to things ----------
  const v3 = (x, y, z) => (o) => o.set(x, y, z);
  const TARGETS = [
    ...npcSystem.targets,
    { kind: 'talk', index: 0, label: 'Talk to Ruchir', r: 2.7, prio: 2.0, fw: 0.2, y: 3.7, pos: (o) => o.copy(ruchir.pos) },
    ...data.certificates.slice(0, 5).map((c, col) => ({ kind: 'cert', index: col, label: 'View certificate · ' + c.short, r: 1.35, y: 3.7, pos: v3(-4.35, 0, 3.4 - col * 1.7) })),
    { kind: 'projects', index: 0, label: 'Browse the project shelf', r: 1.7, y: 4.7, pos: v3(3.0, 0, -3.85) },
    { kind: 'articles', index: 0, label: 'Read my articles', r: 1.25, y: 2.6, pos: v3(0.95, 0, -1.9) },
    { kind: 'contact', index: 0, label: 'Say hello · contact', r: 1.1, y: 4.6, pos: v3(-0.45, 0, -4.25) },
    { kind: 'resume', index: 0, label: 'Grab my résumé', r: 1.0, y: 3.2, pos: v3(0.4, 0, -4.25) },
    { kind: 'window', index: 0, label: 'Open the window · day / night', r: 1.1, y: 3.6, pos: v3(-2.3, 0, -4.25) },
    { kind: 'plant', index: 0, label: 'Water the plant', r: 1.15, y: 2.7, pos: v3(-3.65, 0, -3.65) },
    { kind: 'lamp', index: 0, label: 'Switch the desk lamp', r: 0.95, y: 2.6, pos: v3(-2.6, 0, -1.45) },
    { kind: 'duck', index: 0, label: 'Squeeze the rubber duck', r: 0.85, y: 2.2, pos: v3(-1.6, 0, -0.6) },
    { kind: 'phone', index: 0, label: 'Check the phone', r: 0.85, y: 2.2, pos: v3(-0.62, 0, -0.6) },
    { kind: 'music', index: 0, label: 'Play the record player', r: 1.3, y: 2.0, pos: v3(-3.85, 0, 2.3) },
    { kind: 'lanyard', index: 0, label: 'Look at the event passes', r: 1.0, y: 3.5, pos: v3(-4.2, 0, 4.4) },
    { kind: 'skills', index: 0, label: 'Read the toolkit whiteboard', r: 1.6, y: 4.3, pos: v3(1.4, 0, 4.1) },
    { kind: 'cat', index: 0, label: 'Pet Commit the cat', r: 1.25, prio: 0.4, y: 1.4, pos: (o) => o.copy(extras.catPos).setY(0) },
  ];
  let prompt = null, promptT = 0;
  let lookPrompt = {};
  const CENTER = new THREE.Vector2(0, 0);
  const pv = new THREE.Vector3();
  function rootForPrompt(p) {
    if (!p) return null;
    if (p.root) return p.root;
    if (p.kind === 'cert') return certRoots[p.index];
    if (p.kind === 'talk') return ruchir.real?.root || (ruchir.standee ? ruchir.standee.root : avatar.person);
    if (p.kind === 'npc') return p.index === 0 ? (realCharacters.get('maya')?.root || null) : null;
    if (p.kind === 'contact') return neon;
    return interactive.find((o) => o.userData.hit.kind === p.kind) || null;
  }
  function updatePrompt(dt) {
    promptT -= dt;
    if (promptT > 0) return;
    promptT = 0.1;
    let best = null, bestScore = Infinity;
    // first person: whatever the crosshair points at (within reach) wins
    if (canWalk() && mode === 'follow' && fp.blend >= 1) {
      raycaster.setFromCamera(CENTER, camera);
      const h = raycaster.intersectObjects(scene.children, true).find((x) => shown(x.object));
      if (h && h.distance < 4.5) {
        let o = h.object;
        while (o && !o.userData.hit) o = o.parent;
        if (o && o.userData.hit.kind === 'talk' && h.distance > 3.6) o = null; // walk up to him to talk
        if (o) {
          const hit = o.userData.hit;
          const label = hit.kind === 'talk' ? 'Talk to Ruchir' : hit.label;
          best = lookPrompt.kind === hit.kind && lookPrompt.index === hit.index && lookPrompt.label === label ? lookPrompt : (lookPrompt = { kind: hit.kind, index: hit.index, label, root: o, y: h.point.y + 0.5, pos: (out) => out.copy(h.point) });
        }
      }
    }
    if (!best && canWalk()) {
      const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
      for (const tg of TARGETS) {
        tg.pos(pv);
        const dx = pv.x - player.pos.x, dz = pv.z - player.pos.z, d = Math.hypot(dx, dz);
        if (d > tg.r) continue;
        const facing = d > 0.01 ? (dx * fx + dz * fz) / d : 1;
        const score = d - (tg.prio || 0) + (1 - facing) * (tg.fw ?? 0.5);
        if (score < bestScore) { bestScore = score; best = tg; }
      }
    }
    if (best !== prompt) {
      prompt = best;
      glowTarget = rootForPrompt(prompt);
      hooks.onPrompt?.(prompt ? { kind: prompt.kind, index: prompt.index, label: prompt.label } : null);
    }
  }

  // ---------- Loop ----------
  const clockT = new THREE.Clock();
  let wIndex = 0, wChars = 0, wPause = 0, lastDraw = -1;
  function updateWriting(t, dt) {
    const a = data.articles[wIndex];
    const full = a.hook + '. ' + a.desc;
    if (wPause > 0) {
      wPause -= dt;
      if (wPause <= 0) { wIndex = (wIndex + 1) % data.articles.length; wChars = 0; hooks.onWriting?.(data.articles[wIndex], wIndex); }
    } else {
      wChars += dt * 30;
      if (wChars >= full.length) { wChars = full.length; wPause = 2.5; }
    }
    if (t - lastDraw > 0.07) { lastDraw = t; screen.draw(a.title, full.slice(0, wChars | 0), Math.floor(t * 2.2) % 2 === 0); }
  }
  function updateClock() {
    const now = new Date();
    const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
    const s = ist.getSeconds() + ist.getMilliseconds() / 1000, m = ist.getMinutes() + s / 60, h = (ist.getHours() % 12) + m / 60;
    secHand.rotation.z = -(s / 60) * Math.PI * 2;
    minHand.rotation.z = -(m / 60) * Math.PI * 2;
    hourHand.rotation.z = -(h / 12) * Math.PI * 2;
  }

  let running = false;
  let wasNear = false, greetUntil = 0;
  const visitorHead = new THREE.Vector3();
  let simT = 0;
  function frame() {
    if (!running) return;
    requestAnimationFrame(frame);
    tick(Math.min(clockT.getDelta(), 0.05), true);
  }
  function tick(dt, draw) {
    const t = (simT += dt);

    updatePlayer(t, dt);
    updateGuidedTour(dt);
    npcSystem.update(t, dt, player.pos, player.speed);
    if (mode === 'follow') updateFirstPerson(dt);
    else if (tween) {
      const k = ease(Math.min(1, (performance.now() - tween.start) / 1000 / tween.dur));
      camera.position.lerpVectors(tween.from, tween.to, k);
      controls.target.lerpVectors(tween.fromT, tween.toT, k);
      camera.lookAt(controls.target);
      if (Math.abs(camera.fov - viewFov()) > 0.01) { camera.fov = THREE.MathUtils.lerp(tween.fromFov, viewFov(), k); camera.updateProjectionMatrix(); }
      if (k >= 1) { tween = null; controls.update(); }
    } else controls.update();
    // the walls nearest the camera hide themselves when it's outside the room
    rightWall.visible = camera.position.x < 5.02;
    frontWall.visible = camera.position.z < 5.02;
    ceiling.visible = camera.position.y < 6 && Math.abs(camera.position.x) < 5.1 && Math.abs(camera.position.z) < 5.1;
    updatePrompt(dt);

    inset.x = THREE.MathUtils.damp(inset.x, inset.tx, 7, dt);
    inset.y = THREE.MathUtils.damp(inset.y, inset.ty, 7, dt);
    applyViewOffset();

    night = THREE.MathUtils.damp(night, nightTarget, 3, dt);
    lampAmt = THREE.MathUtils.damp(lampAmt, lampOn, 8, dt);
    applyNight(night);

    for (const o of interactive) {
      const u = o.userData;
      const goal = o === selected ? u.selectOffset : o === hovered ? u.hoverOffset : 0;
      u.offset = THREE.MathUtils.damp(u.offset, goal, 8, dt);
      if (u.dir.lengthSq() > 0) o.position.copy(u.base).addScaledVector(u.dir, u.offset);
      const glowGoal = o === hovered || o === selected || o === glowTarget ? 1 : 0;
      u.glow = THREE.MathUtils.damp(u.glow, glowGoal, 8, dt);
      for (const m of u.mats) { m.emissive.setRGB(1, 0.78, 0.55); m.emissiveIntensity = u.glow * 0.16; }
    }
    // Ruchir notices you when you come close, waves once, and looks at you while you talk
    const near = Math.hypot(player.pos.x - ruchir.pos.x, player.pos.z - ruchir.pos.z) < 3.3;
    if (near && !wasNear) greetUntil = t + 1.8;
    wasNear = near;
    if (mode === 'follow') visitorHead.copy(camera.position); else visitor.head.getWorldPosition(visitorHead);
    const npcMove = (state) => state === 'roam' ? 'Walk' : state === 'greet' ? 'Wave' : state === 'converse' ? 'Talk' : state === 'observe' ? 'Think' : 'Idle';
    realCharacters.update(t, dt, {
      ruchir: talking ? 'Talk' : t < greetUntil ? 'Wave' : 'Idle',
      maya: guided.active ? (npcSystem.getState(0) === 'roam' ? 'Walk' :
        (guided.beat === 'speaker' || guided.beat === 'exhibit') ? 'Talk' : 'Idle') : npcMove(npcSystem.getState(0)),
    }, visitorHead);
    const avatarHot = !!hovered && ['avatar', 'talk'].includes(hovered.userData.hit.kind);
    if (avatar.person.visible) {
      avatar.update(t, dt, {
        hovered: (avatarHot || t < greetUntil) && !talking,
        attentive: talking || near || selected === avatar.root,
        camera, reduced: reducedMotion, talking,
        lookAt: talking || near ? visitorHead : null,
      });
      avatar.setHighlight(hovered === avatar.person || glowTarget === avatar.person ? 1 : 0);
    }
    if (ruchir.standee) {
      const s = ruchir.standee;
      s.root.rotation.y = Math.atan2(camera.position.x - s.root.position.x, camera.position.z - s.root.position.z);
      s.card.scale.y = 1 + Math.sin(t * 1.6) * 0.006;
      s.card.position.y = talking ? Math.abs(Math.sin(t * 8)) * 0.05 : t < greetUntil ? Math.abs(Math.sin(t * 6)) * 0.08 : 0;
      const hot = hovered === s.root || glowTarget === s.root;
      s.mat.color.setScalar((1 - night * 0.18) * (hot ? 1.1 : 1));
    }

    steam.forEach((sp) => {
      const k = (t * 0.35 + sp.userData.phase) % 1;
      sp.position.set(Math.sin((k + sp.userData.phase) * 7) * 0.04, 0.22 + k * 0.5, 0);
      sp.material.opacity = Math.sin(k * Math.PI) * 0.35;
      sp.scale.setScalar(0.08 + k * 0.16);
    });
    extras.update(t, dt, { camera });
    firstPersonArms.root.visible = false; // cinematic first-person camera: no low-poly arms floating across the screen
    if (firstPersonArms.root.visible) {
      firstPersonArms.root.position.copy(camera.position);
      firstPersonArms.root.quaternion.copy(camera.quaternion);
      firstPersonArms.update(t, dt, player.speed, talking, reducedMotion);
    }
    dust.rotation.y = Math.sin(t * 0.07) * 0.008;
    updateFloaters(dt);
    updateWriting(t, dt);
    updateClock();
    if (!draw) return;
    if (composer) composer.render(); else renderer.render(scene, camera);
    hooks.onFrame?.();
  }

  // ---------- Public API ----------
  const hotspots = [
    { id: 'about', label: 'About me', pos: new THREE.Vector3(-0.8, 3.35, -2.75) },
    { id: 'certs', label: 'Certificates', pos: new THREE.Vector3(-4.85, 5.75, 0) },
    { id: 'projects', label: 'Projects', pos: new THREE.Vector3(3.0, 4.95, -4.6) },
    { id: 'articles', label: 'Articles', pos: new THREE.Vector3(0.27, 2.45, -2.0) },
    { id: 'contact', label: 'Contact', pos: new THREE.Vector3(0.15, 4.5, -4.9) },
  ];
  const tmpV = new THREE.Vector3();
  function toScreen(v) {
    tmpV.copy(v).project(camera);
    const r = canvas.getBoundingClientRect();
    return { x: (tmpV.x * 0.5 + 0.5) * r.width + r.left, y: (-tmpV.y * 0.5 + 0.5) * r.height + r.top, visible: tmpV.z < 1 };
  }
  const rootsByKind = { cert: certRoots, project: projectRoots, build: buildRoots, article: articleRoots, avatar: [avatar.root], contact: [neon] };
  const viewByKind = { cert: 'certs', project: 'shelf', build: 'shelf', article: 'desk', avatar: 'avatar', contact: 'contact' };

  return {
    start() {
      // straight into first person, standing at the door
      running = true;
      clockT.start();
      setMode('follow');
      fp.blend = 1;
      camera.fov = fpFov(); // never start with the overview camera's telephoto lens
      camera.near = 0.065;
      camera.updateProjectionMatrix();
      frame();
    },
    // Always first person: opening a section turns your head toward it instead of moving the camera.
    focus(name) {
      if (guided.active || name === 'overview') return;
      const v = VIEWS[name];
      if (v) lookToward(new THREE.Vector3(...v.target));
    },
    select(kind, index = 0) {
      if (guided.active) return;
      selected = rootsByKind[kind]?.[index] || interactive.find((o) => o.userData.hit.kind === kind) || null;
      if (selected && kind !== 'talk') lookToward(selected.getWorldPosition(new THREE.Vector3()));
    },
    look(dx, dy) { applyMouseLook(dx, dy); },
    setLookSettings({ sensitivity, invertY } = {}) {
      if (sensitivity !== undefined && Number.isFinite(sensitivity))
        lookSensitivity = THREE.MathUtils.clamp(sensitivity, 0.35, 2.5);
      if (invertY !== undefined) invertLookY = !!invertY;
    },
    // game controls
    whenGuideReady() { return guideReady; },
    startGuidedTour: beginGuidedTour,
    get isTouring() { return guided.active; },
    get tourFinished() { return guided.finished; },
    get tourProgress() { return guided.active ? Math.min(1, guided.total / tourLength) : Number(guided.finished); },
    setInput(v) {
      if (guided.active) { Object.assign(input, { x: 0, y: 0, turn: 0, run: false }); return; }
      Object.assign(input, v);
    },
    interact() {
      if (!prompt || !canWalk()) return false;
      hooks.onSelect?.(prompt.kind, prompt.index);
      return true;
    },
    promptAnchor() { if (!prompt) return null; prompt.pos(pv); return pv.clone().setY(prompt.kind === 'cat' ? 1.4 : prompt.y); },
    setTalking(on) { talking = on; if (on) player.target = null; },
    lockMovement(on) { movementLocked = on; },
    toggleMap() { if (mode !== 'follow') setMode('follow'); return 'follow'; },
    get mode() { return mode; },
    get playerPos() { return player.pos.clone(); },
    get playerYaw() { return cam.yaw; },
    npcPositions() { return npcSystem.anchors(); },
    // dev helper: fast-forward the room (used with ?debug when the tab is throttled)
    simulate(seconds, fps = 60) { const n = Math.round(seconds * fps); for (let i = 0; i < n; i++) tick(1 / fps, i === n - 1); },
    ruchirHead() { return ruchirHead(new THREE.Vector3()); },
    clearSelection() { selected = null; },
    setNight(on, instant = false) { nightTarget = on ? 1 : 0; if (instant) { night = nightTarget; applyNight(night); } },
    pause() { running = false; },
    resume() { if (running) return; running = true; clockT.getDelta(); frame(); },
    setInset(px, axis = 'x') { inset.tx = axis === 'x' ? px / 2 : 0; inset.ty = axis === 'y' ? px / 2 : 0; },
    // playful extras
    act(kind, action) {
      if (kind === 'npc') return npcSystem.interact(Number(action), simT);
      if (kind === 'lamp') { lampOn = lampOn ? 0 : 1; return !!lampOn; }
      return extras.act(kind, action);
    },
    anchorOf(kind) {
      if (kind === 'window') return new THREE.Vector3(winCx, W_IN.y1 + 0.2, -4.9);
      if (kind === 'lamp') return lampG.position.clone().add(new THREE.Vector3(0.3, 1.0, 0));
      return extras.anchorOf(kind);
    },
    get plantGrowth() { return extras.plantGrowth; },
    npcAnchor(index) { return npcSystem.anchors()[index] || null; },
    npcState(index) { return npcSystem.getState(index); },
    // turn to look at one of the extras (used by "Show" in the secrets list)
    focusOn(kind) {
      const a = this.anchorOf(kind);
      if (a) lookToward(a.add(new THREE.Vector3(0, -0.4, 0)));
    },
    hotspots,
    toScreen,
    get view() { return currentView; },
  };
}
