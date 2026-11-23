// Original user-supplied VRM avatar adapter for Mira.
// Does NOT change the GLB/VRM asset, face, proportions, hair or clothing.
// Requires @pixiv/three-vrm 2.x in the page import map.
// The supplied VRM0 has humanoid bones and vowel/blink blendshapes, but NO
// authored animation clips; these procedural motions are intentionally subtle.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const VRM_PATH = 'assets/characters/meera.vrm';
const clamp = THREE.MathUtils.clamp;
const BODY_PARTS = [
  'hips','spine','chest','upperChest','neck','head',
  'leftShoulder','rightShoulder','leftUpperArm','rightUpperArm',
  'leftLowerArm','rightLowerArm','leftUpperLeg','rightUpperLeg',
  'leftLowerLeg','rightLowerLeg','leftFoot','rightFoot',
];
const Z_AXIS = new THREE.Vector3(0,0,1);
const X_AXIS = new THREE.Vector3(1,0,0);
const Y_AXIS = new THREE.Vector3(0,1,0);
const scratchQuat = new THREE.Quaternion();

export async function loadMeeraVRM({ x, z, scale = 1.52, onProgress } = {}) {
  // Import lazily so a temporary CDN failure doesn't break Ruchir, the room,
  // certificates or fallback text version.
  const { VRMLoaderPlugin, VRMUtils } = await import('@pixiv/three-vrm');
  const loader = new GLTFLoader();
  loader.register(parser => new VRMLoaderPlugin(parser));
  loader.crossOrigin = 'anonymous';
  const gltf = await new Promise((resolve, reject) => {
    loader.load(VRM_PATH, resolve, evt => {
      if (evt.total && onProgress) onProgress(evt.loaded / evt.total);
    }, reject);
  });
  const vrm = gltf.userData.vrm;
  if (!vrm || !vrm.humanoid) throw new Error('Meera file has no compatible VRM humanoid');
  // VRM0 and VRM1 use different forward axes. This is the documented helper
  // for the user's VRM0 (UniGLTF-1.28) asset; do not double-rotate by hand.
  if (gltf.parser.json.extensions?.VRM) VRMUtils.rotateVRM0(vrm);
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.removeUnnecessaryJoints(gltf.scene);
  vrm.scene.traverse(o => {
    if (!o.isMesh) return;
    o.frustumCulled = false; // skirts, hair and dynamic body need stable bounds
    o.castShadow = true; o.receiveShadow = true;
    o.raycast = () => {}; // walk-up interactions use NPC target, not GLB triangle rays
  });
  const root = new THREE.Group();
  root.name = 'meera-vrm-guide';
  root.position.set(x || 0, 0, z || 0);
  root.add(vrm.scene);
  vrm.scene.scale.setScalar(scale);

  // Store the actual bone rest poses. Never overwrite textures or bind poses.
  const bones = new Map();
  for(const name of BODY_PARTS) {
    const node = vrm.humanoid.getNormalizedBoneNode(name);
    if(node) bones.set(name, {node, rest:node.quaternion.clone()});
  }
  const head = vrm.humanoid.getRawBoneNode('head') ||
    vrm.humanoid.getNormalizedBoneNode('head');
  if(!head) throw new Error('Meera VRM has no head joint');
  const expressions = vrm.expressionManager;
  const keys = new Set(expressions?.expressions?.map(x => x.expressionName) || []);
  const voiceKeys = ['aa','ih','ou','ee','oh']; // VRM0 A/I/U/E/O -> normalized VRM names
  let seed=241, nextBlink=2.9, state='Idle', breath=0;
  let gesture=0, talkPulse=0;
  let lastNow=0, lastPlayer=null;
  function setExpr(name, value) {
    if (!expressions) return;
    // expressionManager#setValue handles VRM0 normalized presets.
    try { expressions.setValue(name, clamp(value,0,1)); } catch {}
  }
  function bend(name, axis, angle) {
    const bone = bones.get(name); if (!bone) return;
    scratchQuat.setFromAxisAngle(axis,angle);
    bone.node.quaternion.copy(bone.rest).multiply(scratchQuat);
  }
  function resetSkeleton() {
    for (const bone of bones.values()) bone.node.quaternion.copy(bone.rest);
  }
  const rig = {
    id:'maya', vrm, root, model:vrm.scene, head, active:'Idle',
    // Original VRM has no included animation clips: mark the animation type accurately.
    animationSource:'runtime-humanoid-pose',
    play(next){ state=next || 'Idle'; rig.active=state; },
    update(now, dt, requested='Idle', playerTarget=null) {
      dt=clamp(dt||0,0,0.07);
      const locomotion=requested==='Walk';
      const greeting=requested==='Wave';
      const speaking=requested==='Talk' || greeting;
      const attention=requested==='Think';
      if(requested!==state)rig.play(requested);
      lastNow=now;
      resetSkeleton();
      breath += dt*1.55;
      const move = locomotion ? 1 : 0;
      const stride = Math.sin(now*6.1), opp = Math.sin(now*6.1 + Math.PI);
      const relax = Math.sin(breath)*0.015;
      bend('leftUpperLeg', X_AXIS, stride*0.44*move);
      bend('rightUpperLeg', X_AXIS, opp*0.44*move);
      bend('leftLowerLeg', X_AXIS, Math.max(0,-stride)*0.36*move);
      bend('rightLowerLeg', X_AXIS, Math.max(0,-opp)*0.36*move);
      bend('leftUpperArm', X_AXIS, -stride*0.30*move -0.035);
      bend('rightUpperArm', X_AXIS, -opp*0.30*move -0.035);
      bend('leftLowerArm', X_AXIS, -0.08 - Math.max(0, stride)*0.1*move);
      bend('rightLowerArm', X_AXIS, -0.08 - Math.max(0, opp)*0.1*move);
      bend('chest', X_AXIS, relax);
      bend('spine', Z_AXIS, Math.sin(now*1.12)*0.013);
      if(greeting){
        bend('rightUpperArm', Z_AXIS, -0.94);
        bend('rightUpperArm', X_AXIS, -0.35);
        bend('rightLowerArm', Z_AXIS, -0.32 - 0.12*Math.sin(now*7));
      } else if(speaking){
        bend('rightUpperArm', Z_AXIS, -0.26 - 0.12*Math.sin(now*2.7));
        bend('rightLowerArm', X_AXIS, -0.36 - 0.11*Math.sin(now*3.7));
      } else if(attention){
        bend('rightLowerArm', X_AXIS, -0.36);
      }
      // Subtle head attention relative to NPC root. Avoid twists beyond VRM neck limits.
      let gaze=0;
      if(playerTarget && !locomotion) {
        const dx=playerTarget.x-root.parent?.position.x, dz=playerTarget.z-root.parent?.position.z;
        if(Number.isFinite(dx) && Number.isFinite(dz)){
          const wanted=Math.atan2(dx,dz)-(root.parent?.rotation.y||0);
          gaze=clamp(Math.atan2(Math.sin(wanted),Math.cos(wanted)),-0.18,0.18);
        }
      }
      bend('head',Y_AXIS,gaze + Math.sin(now*0.59)*0.027);
      bend('head',X_AXIS,0.027 + Math.sin(now*1.6)*0.012);

      // The VRM0 source embeds Blink and A/I/U/E/O blendshape groups.
      if(now>=nextBlink) nextBlink=now+2.4+((now*7.7)%2);
      const timeToBlink=nextBlink-now;
      const blink = timeToBlink > 0 && timeToBlink < 0.14
        ? Math.sin((0.14-timeToBlink)/0.14*Math.PI)*0.95 : 0;
      setExpr('blink',blink);
      talkPulse += dt*9.6;
      const mouth = speaking ? 0.13 + 0.36*Math.pow(Math.max(0,Math.sin(talkPulse)),1.5) : 0;
      setExpr('aa',mouth);
      setExpr('ih',speaking ? mouth*0.12 : 0);
      setExpr('ou',speaking ? mouth*0.16 : 0);
      setExpr('ee',0); setExpr('oh',0);
      vrm.update(dt);
    },
    headWorld(out){
      root.updateWorldMatrix(true,true);
      return head.getWorldPosition(out);
    },
    dispose(){
      for(const bone of bones.values()) bone.node.quaternion.copy(bone.rest);
      root.remove(vrm.scene);
    },
  };
  rig.update(0,0,'Idle');
  return rig;
}
