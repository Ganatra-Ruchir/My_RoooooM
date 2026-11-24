// Original user-supplied VRM avatar adapter for Mira.
// Does NOT change the GLB/VRM asset, face, proportions, hair or clothing.
// Requires @pixiv/three-vrm 2.x in the page import map.
// The supplied VRM0 has humanoid bones and vowel/blink blendshapes, but NO
// authored animation clips; these procedural motions are intentionally subtle.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


const PARTS = Array.from({ length: 9 }, (_, i) =>
  `assets/characters/meera.part${String(i).padStart(2, '0')}`);
const ORIGINAL_BYTES = 21144736;
const ORIGINAL_SHA256 = '820d2ce6882f97eb422d4af68b3e9e34b83f21d8734ab84d0eab75c427c86a03';

// The uploaded original cannot be passed as one GitHub binary blob through the
// connector. Nine immutable raw chunks are concatenated in exact byte order.
// Hash verification prevents accidental or partial assets from reaching the
// loader, and the image/VRM metadata remains unmodified.
async function originalVRMBlobURL(onProgress) {
  let received=0;
  const chunks=new Array(PARTS.length);
  let cursor=0;
  async function worker(){
    while(cursor<PARTS.length){
      const i=cursor++;let bytes,lastError;
      for(let attempt=0;attempt<3;attempt++){
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),18000);
        try{
          const response=await fetch(PARTS[i],{cache:attempt?'reload':'force-cache',signal:controller.signal});
          if(!response.ok)throw new Error('Meera part '+i+' HTTP '+response.status);
          bytes=new Uint8Array(await response.arrayBuffer());
          if(bytes.length<1024)throw new Error('Invalid Meera chunk');
          break;
        }catch(err){lastError=err;bytes=null;}
        finally{clearTimeout(timer);}
        if(attempt<2)await new Promise(resolve=>setTimeout(resolve,350*(attempt+1)));
      }
      if(!bytes)throw lastError||new Error('Meera part '+i+' unavailable');
      chunks[i]=bytes;received+=bytes.byteLength;onProgress?.(Math.min(.85,received/ORIGINAL_BYTES*.85));
    }
  }
  await Promise.all(Array.from({length:3},worker));
  if (received !== ORIGINAL_BYTES) throw new Error(
    'Meera VRM transfer incomplete: received ' + received + ' of ' + ORIGINAL_BYTES + ' bytes');
  const binary = new Uint8Array(ORIGINAL_BYTES);
  let offset = 0;
  for (const bytes of chunks) { binary.set(bytes, offset); offset += bytes.byteLength; }
  const view = new DataView(binary.buffer);
  if (view.getUint32(0, true) !== 0x46546C67 || view.getUint32(8, true) !== ORIGINAL_BYTES)
    throw new Error('Meera transfer did not reconstruct a valid GLB/VRM header');
  if (globalThis.crypto?.subtle) {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', binary));
    const hex = Array.from(digest, x => x.toString(16).padStart(2, '0')).join('');
    if (hex !== ORIGINAL_SHA256) throw new Error('Meera original file integrity check failed');
  }
  onProgress?.(0.9);
  return URL.createObjectURL(new Blob([binary], { type: 'model/gltf-binary' }));
}
const clamp = THREE.MathUtils.clamp;
const BODY_PARTS = [
  'hips','spine','chest','upperChest','neck','head',
  'leftShoulder','rightShoulder','leftUpperArm','rightUpperArm',
  'leftLowerArm','rightLowerArm','leftHand','rightHand','leftUpperLeg','rightUpperLeg',
  'leftLowerLeg','rightLowerLeg','leftFoot','rightFoot',
];
const Z_AXIS = new THREE.Vector3(0,0,1);
const X_AXIS = new THREE.Vector3(1,0,0);
const Y_AXIS = new THREE.Vector3(0,1,0);
const scratchQuat = new THREE.Quaternion();

export async function loadMeeraVRM({ x, z, scale = 1.52, onProgress, localFile = null, id = 'maya' } = {}) {
  // Import lazily so a temporary CDN failure doesn't break Ruchir, the room,
  // certificates or fallback text version.
  const { VRMLoaderPlugin, VRMUtils } = await import('@pixiv/three-vrm');
  const loader = new GLTFLoader();
  loader.register(parser => new VRMLoaderPlugin(parser));
  loader.crossOrigin = 'anonymous';
  const assetURL = localFile ? URL.createObjectURL(localFile) : await originalVRMBlobURL(onProgress);
  let gltf;
  try {
    gltf = await loader.loadAsync(assetURL);
    onProgress?.(1);
  } finally {
    URL.revokeObjectURL(assetURL);
  }
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
    o.visible=true; // keep original materials and geometry; do not substitute a different model
    o.castShadow = true; o.receiveShadow = true;
    // Keep original mesh raycasting so direct interaction still works.
  });
  const root = new THREE.Group();
  root.name = id === 'maya' ? 'meera-vrm-guide' : 'ruchir-local-vrm';
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
  // Match the room's adult head-height convention, not raw VRM authoring units.
  {
    root.updateWorldMatrix(true,true);
    const headY=head.getWorldPosition(new THREE.Vector3()).y-root.position.y;
    const targetHeight=id==='maya'?2.64:2.76;
    if(Number.isFinite(headY)&&headY>.5)root.scale.setScalar(THREE.MathUtils.clamp(targetHeight/headY,.65,1.8));
    root.updateWorldMatrix(true,true);
  }
  // Preserve authored textures and spring-bone settings. Tune scene-light
  // response only for the guide, leaving the privately licensed model intact.
  if(id==='maya'){
    const seen=new Set();
    vrm.scene.traverse(o=>{
      if(!o.isMesh)return;
      for(const mat of Array.isArray(o.material)?o.material:[o.material]){
        if(!mat||seen.has(mat))continue;seen.add(mat);
        if(mat.isMeshStandardMaterial){
          mat.envMapIntensity=.24;
          if(/skin|face|body/i.test(mat.name||'')){mat.roughness=Math.max(.58,mat.roughness);mat.metalness=0;}
          if(/cloth|dress|outfit|fabric/i.test(mat.name||'')){mat.roughness=Math.max(.8,mat.roughness);mat.metalness=0;}
        }
        // VRM MToon keeps its authored base and shade colors, avoiding a
        // global color replacement or a destructive conversion to PBR.
        if(mat.isMToonMaterial&&typeof mat.rimLightingMixFactor==='number'){
          mat.rimLightingMixFactor=THREE.MathUtils.clamp(mat.rimLightingMixFactor,.18,.7);
        }
      }
    });
  }
  const expressions = vrm.expressionManager;
  const keys = new Set(expressions?.expressions?.map(x => x.expressionName) || []);
  const voiceKeys = ['aa','ih','ou','ee','oh']; // VRM0 A/I/U/E/O -> normalized VRM names
  let nextBlink=2.9, blinkUntil=0, state='Idle', breath=0;
  let talkPulse=0, walkMix=0, talkMix=0, waveMix=0, gazeSmooth=0;
  // Damped whole-body inertia from actual world motion; no exaggerated
  // isolated anatomy animation. Authored hair/clothing springs remain active.
  const prevWorld=new THREE.Vector3(),motionWorld=new THREE.Vector3(),motionLocal=new THREE.Vector3(),previousVelocity=new THREE.Vector3(),inverseRoot=new THREE.Quaternion();
  let motionInitialized=false,leanX=0,leanZ=0,leanVX=0,leanVZ=0;
  let lastWordAt=-10, spokenWord='', lastVoice=false;
  const faceValues = new Map();
  const targetQ = new THREE.Quaternion(), swingQ = new THREE.Quaternion();
  const restDir = new THREE.Vector3(), targetDir = new THREE.Vector3();
  // Normalized VRM bones have standardized axes. Aim from each actual
  // elbow offset, not from an assumed left/right T-pose rotation sign.
  function aimArm(side, amount, forward) {
    const upper = bones.get(side+'UpperArm'), lower = bones.get(side+'LowerArm');
    if(!upper || !lower) return;
    restDir.copy(lower.node.position).applyQuaternion(upper.rest).normalize();
    if(restDir.lengthSq() < .5) return;
    const lateral = Math.sign(restDir.x) || (side==='left'?1:-1);
    targetDir.set(lateral * (0.12 + 0.42*amount), -0.96+0.32*amount, forward).normalize();
    swingQ.setFromUnitVectors(restDir,targetDir);
    targetQ.copy(upper.rest).premultiply(swingQ);
    upper.node.quaternion.copy(targetQ);
  }
  function expression(name,value,dt,speed=13){
    if(!keys.has(name))return;
    const next=THREE.MathUtils.damp(faceValues.get(name)||0,value,speed,dt);
    faceValues.set(name,next);setExpr(name,next);
  }
  function setExpr(name, value) {
    if (!expressions) return;
    // expressionManager#setValue handles VRM0 normalized presets.
    try { expressions.setValue(name, clamp(value,0,1)); } catch {}
  }
  function bend(name, axis, angle) {
    const bone = bones.get(name); if (!bone) return;
    scratchQuat.setFromAxisAngle(axis,angle);
    bone.node.quaternion.multiply(scratchQuat);
  }
  function resetSkeleton() {
    for (const bone of bones.values()) bone.node.quaternion.copy(bone.rest);
  }
  const rig = {
    id, vrm, root, model:vrm.scene, head, active:'Idle',
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
      resetSkeleton();
      breath += dt*1.55;
      walkMix=THREE.MathUtils.damp(walkMix,locomotion?1:0,7,dt);
      talkMix=THREE.MathUtils.damp(talkMix,speaking?1:0,7,dt);
      waveMix=THREE.MathUtils.damp(waveMix,greeting?1:0,8,dt);
      const move = walkMix;
      const stride = Math.sin(now*6.1), opp = Math.sin(now*6.1 + Math.PI);
      const relax = Math.sin(breath)*0.015;
      root.getWorldPosition(motionWorld);
      if(motionInitialized&&dt>0){
        motionLocal.copy(motionWorld).sub(prevWorld).multiplyScalar(1/Math.max(dt,.008));
        if(motionLocal.length()>10){previousVelocity.set(0,0,0);leanX=leanZ=leanVX=leanVZ=0;}
        else{
          inverseRoot.copy(root.getWorldQuaternion(inverseRoot)).invert();motionLocal.applyQuaternion(inverseRoot);
          const ax=clamp((motionLocal.x-previousVelocity.x)/Math.max(dt,.008),-9,9);
          const az=clamp((motionLocal.z-previousVelocity.z)/Math.max(dt,.008),-9,9);
          const steps=Math.max(1,Math.ceil(dt/.012)),h=dt/steps;
          for(let k=0;k<steps;k++){
            leanVX+=(-95*leanX-16*leanVX-az*.55)*h;leanX=clamp(leanX+leanVX*h,-.055,.055);
            leanVZ+=(-95*leanZ-16*leanVZ+ax*.55)*h;leanZ=clamp(leanZ+leanVZ*h,-.055,.055);
          }
          previousVelocity.copy(motionLocal);
        }
      }
      prevWorld.copy(motionWorld);motionInitialized=true;
      bend('leftUpperLeg', X_AXIS, stride*0.44*move);
      bend('rightUpperLeg', X_AXIS, opp*0.44*move);
      bend('leftLowerLeg', X_AXIS, Math.max(0,-stride)*0.36*move);
      bend('rightLowerLeg', X_AXIS, Math.max(0,-opp)*0.36*move);
      // Start in a relaxed, down-at-the-sides posture, including at dt=0.
      // Small asymmetric conversational gestures replace the permanently open arms.
      const emphasis=(.5+.5*Math.sin(now*2.4))*talkMix*(1-waveMix);
      aimArm('left', .035 + emphasis*.12, -stride*.18*move + .06);
      aimArm('right', .045 + emphasis*.42 + waveMix*.8, -opp*.18*move + .07 + emphasis*.32 + waveMix*.36);
      bend('leftLowerArm', Z_AXIS, (Math.sign(bones.get('leftLowerArm')?.node.position.x||1))*(.12+emphasis*.14));
      bend('rightLowerArm', Z_AXIS, (Math.sign(bones.get('rightLowerArm')?.node.position.x||-1))*(.14+emphasis*.45+waveMix*.74));
      bend('leftHand',Y_AXIS, .09 + emphasis*.04);
      bend('rightHand',Y_AXIS, -.09 - emphasis*.08);
      bend('chest',X_AXIS,relax+leanX*.38);
      bend('spine',X_AXIS,leanX*.62);
      bend('spine',Z_AXIS,Math.sin(now*1.12)*.013+leanZ*.68);
      bend('hips',Z_AXIS,leanZ*.22);
      bend('rightHand',Z_AXIS,waveMix*.21*Math.sin(now*6));
      if(attention) bend('head',Z_AXIS,.055);
      // Subtle head attention relative to NPC root. Avoid twists beyond VRM neck limits.
      let gaze=0;
      if(playerTarget && !locomotion) {
        const origin = root.getWorldPosition(new THREE.Vector3());
        const dx = playerTarget.x - origin.x, dz = playerTarget.z - origin.z;
        if(Number.isFinite(dx) && Number.isFinite(dz)){
          const worldYaw = root.getWorldQuaternion(new THREE.Quaternion());
          const forward = new THREE.Vector3(0,0,1).applyQuaternion(worldYaw);
          const current = Math.atan2(forward.x, forward.z);
          const wanted = Math.atan2(dx, dz) - current;
          gaze = clamp(Math.atan2(Math.sin(wanted),Math.cos(wanted)), -0.18, 0.18);
        }
      }
      gazeSmooth=THREE.MathUtils.damp(gazeSmooth,gaze,6,dt);
      bend('head',Y_AXIS,gazeSmooth + Math.sin(now*0.59)*0.027);
      bend('head',X_AXIS,0.027 + Math.sin(now*1.6)*0.012 + talkMix*.022*Math.sin(now*3.1));
      bend('head',Z_AXIS, talkMix*.025*Math.sin(now*1.4));
      if(vrm.lookAt && playerTarget && !locomotion && vrm.lookAt.lookAt) {
        vrm.lookAt.lookAt(playerTarget);
      }

      // The VRM0 source embeds Blink and A/I/U/E/O blendshape groups.
      if(now >= nextBlink) {
        blinkUntil = now + 0.16;
        nextBlink = now + 2.6 + ((now * 7.7) % 1.9);
      }
      const blink = now < blinkUntil
        ? Math.sin((blinkUntil - now) / 0.16 * Math.PI) * 0.95 : 0;
      setExpr('blink',blink);
      // Browser speech boundary events drive vowel shapes when available.
      // With muted narration, use restrained caption-time gestures instead.
      const speech=id === 'maya' ? globalThis.__meeraVoice : null;
      if(speech?.active && speech.word !== spokenWord){spokenWord=speech.word||'';lastWordAt=now;}
      if(speech?.active && !lastVoice)lastWordAt=now;
      lastVoice=!!speech?.active;
      const visibleSpeech=speaking && (!speech?.enabled || speech.active);
      talkPulse+=dt*8.4;
      const pulse=Math.pow(Math.max(0,Math.sin(talkPulse)),1.3);
      const vowel=(spokenWord.toLowerCase().match(/[aeiou]/)||[])[0]||'a';
      const shape=({a:'aa',e:'ee',i:'ih',o:'oh',u:'ou'})[vowel];
      const jaw=visibleSpeech?(0.06+0.32*pulse)*(speech?.active && now-lastWordAt>1.4?.45:1):0;
      for(const key of voiceKeys)expression(key,key===shape?jaw:jaw*.08,dt,22);
      expression('happy', .10+waveMix*.22+talkMix*.12,dt,5);
      expression('relaxed', .07+talkMix*.09,dt,5);
      expression('surprised',waveMix*.06,dt,6);
      // Bounded substeps keep the model's native spring simulation stable
      // during irregular mobile frame times. Humanoid and facial states persist.
      const substeps=Math.max(1,Math.ceil(dt/(1/60)));
      for(let i=0;i<substeps;i++)vrm.update(dt/substeps);
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
