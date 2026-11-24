// Playful extras: Commit the cat, record player, phone, résumé clipboard,
// event lanyards, rubber duck and the corner plant.
import * as THREE from 'three';
import * as TX from './textures.js';
import {loadPhotographicProp} from './photographic-props.js';

// The cat's patrol loop around the open floor (checked to avoid furniture).
const RING = [[-3.6, -1.2], [-3.7, 2.6], [-1.2, 3.9], [2.0, 4.1], [3.6, 3.3], [3.85, 2.6], [3.85, -0.3], [3.0, -2.9], [1.6, -0.4], [-1.5, -0.4]]
  .map(([x, z]) => new THREE.Vector3(x, 0, z));
// The old beanbag no longer exists. Keep the cat's naps on the floor.
const NAP_POINT = 4;

export function buildExtras(ctx) {
  const {scene,mesh,std,box,rbox,rod,register,spawn,deskTop,profile,collide,moveWithCollision,findFloorPath}=ctx;
  const anchors = {};
  const tmp = new THREE.Vector3();
  // Invisible, slightly larger click areas so small things are easy to hit.
  const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const hitBox = (parent, w, h, d, x = 0, y = 0, z = 0) => mesh(new THREE.BoxGeometry(w, h, d), hitMat, x, y, z, parent, { cast: false, receive: false });

  // =====================================================================
  // Commit the cat
  // =====================================================================
  const cat = (() => {
    const root = new THREE.Group();
    root.scale.setScalar(1.15);
    scene.add(root);
    const furMap=TX.catFurTexture(),whiteMap=TX.catFurTexture(true);
    const fur=new THREE.MeshPhysicalMaterial({color:0xb6b2ac,map:furMap,bumpMap:furMap,bumpScale:.007,roughness:.9,sheen:.42,sheenColor:new THREE.Color(0x827c72),sheenRoughness:.86,envMapIntensity:.16});
    const furDark=std(0x393734,{map:furMap,bumpMap:furMap,bumpScale:.006,roughness:.93});
    const white=std(0xd4cbbd,{map:whiteMap,bumpMap:whiteMap,bumpScale:.005,roughness:.9});
    const pink=std(0x986966,{roughness:.74});
    const eyeMat=new THREE.MeshPhysicalMaterial({color:0x9ba85b,map:TX.catIrisTexture(),roughness:.24,clearcoat:.7,clearcoatRoughness:.13,envMapIntensity:.5});
    const pupilMat = std(0x101010, { roughness: 0.2 });

    const body = new THREE.Group(); body.position.set(0, 0.3, 0); root.add(body);
    // Rounded rib cage and haunches, not detached rings around a capsule.
    mesh(new THREE.SphereGeometry(1,36,24),fur,0,0,-.025,body).scale.set(.147,.158,.32);
    mesh(new THREE.SphereGeometry(1,28,20),fur,0,.024,-.203,body).scale.set(.151,.16,.142);
    mesh(new THREE.SphereGeometry(1,28,20),white,0,-.037,.195,body).scale.set(.102,.115,.105);

    const head = new THREE.Group(); head.position.set(0, 0.12, 0.3); body.add(head);
    mesh(new THREE.SphereGeometry(.13,36,24),fur,0,0,0,head).scale.set(1.08,.95,1);
    for(const side of [-1,1])mesh(new THREE.SphereGeometry(.047,22,16),white,side*.035,-.042,.102,head).scale.set(1,.78,.91);
    mesh(new THREE.SphereGeometry(.019,18,12),pink,0,-.015,.145,head).scale.set(1,.66,.65);
    const eyes=[],ears=[];
    function earGeometry(){
      const shape=new THREE.Shape();shape.moveTo(-.047,0);shape.quadraticCurveTo(-.042,.06,-.012,.109);shape.quadraticCurveTo(.01,.127,.025,.094);shape.quadraticCurveTo(.041,.043,.047,0);shape.closePath();
      const g=new THREE.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:true,bevelThickness:.006,bevelSize:.006,bevelSegments:2,steps:1,curveSegments:8});g.computeVertexNormals();return g;
    }
    const earGeo=earGeometry();
    for (const s of [-1, 1]) {
      const ear=new THREE.Group();ear.position.set(s*.082,.082,-.022);ear.rotation.z=-s*.24;head.add(ear);
      mesh(earGeo,fur,0,0,0,ear);
      mesh(earGeo,pink,0,.008,.015,ear,{cast:false}).scale.set(.65,.72,.23);
      ears.push(ear);
      const eye = new THREE.Group(); eye.position.set(s * 0.052, 0.022, 0.104); head.add(eye);
      mesh(new THREE.SphereGeometry(.029,24,18),eyeMat,0,0,0,eye,{cast:false}).scale.set(1,.94,.78);
      mesh(new THREE.SphereGeometry(.019,16,12),pupilMat,0,0,.022,eye,{cast:false}).scale.set(.28,1.02,.30);
      eyes.push(eye);
      for (let k = 0; k < 3; k++) {
        const base=new THREE.Vector3(s*.067,-.035+(k-1)*.013,.121);
        const curve=new THREE.QuadraticBezierCurve3(base,new THREE.Vector3(s*.14,base.y+.009,.15),new THREE.Vector3(s*.20,base.y+(k-1)*.018,.12));
        mesh(new THREE.TubeGeometry(curve,8,.0015,4,false),white,0,0,0,head,{cast:false});
      }
    }
    const legs = [];
    for (const [x, z] of [[-0.075, 0.17], [0.075, 0.17], [-0.075, -0.17], [0.075, -0.17]]) {
      const pivot = new THREE.Group(); pivot.position.set(x, -0.06, z); body.add(pivot);
      mesh(new THREE.CapsuleGeometry(.035,.145,7,16),fur,0,-.105,0,pivot).scale.set(1.05,1,1.18);
      mesh(new THREE.SphereGeometry(.040,20,14),white,0,-.218,.014,pivot).scale.set(1,.64,1.22);
      legs.push(pivot);
    }
    const tail = [];
    let parent = new THREE.Group(); parent.position.set(0, 0.05, -0.29); body.add(parent);
    for (let i = 0; i < 8; i++) {
      const seg = new THREE.Group();
      if (i > 0) seg.position.set(0, 0, -0.06);
      parent.add(seg);
      mesh(new THREE.SphereGeometry(.035-i*.002,18,12),fur,0,0,-.03,seg).scale.set(1,1,1.92);
      tail.push(seg);
      parent = seg;
    }

    const POSES = {
      walk: { y: 0.3, pitch: 0, front: 0, back: 0, head: 0.05, headY: 0.12, eye: 1, raise: 0.22, curl: 0 },
      sit: { y: 0.27, pitch: -0.55, front: 0.55, back: -0.75, head: 0.45, headY: 0.12, eye: 1, raise: -0.12, curl: 0.32 },
      pet: { y: 0.27, pitch: -0.55, front: 0.55, back: -0.75, head: 0.3, headY: 0.13, eye: 0.15, raise: 0.5, curl: 0.05 },
      sleep: {y:.15,pitch:0,front:-1.45,back:1.45,head:.3,headY:.05,eye:.08,raise:-.04,curl:.42},
      held: {y:.20,pitch:.08,front:-.72,back:.8,head:.04,headY:.10,eye:.72,raise:-.2,curl:.18},
      heldPet: {y:.20,pitch:.08,front:-.72,back:.8,head:-.09,headY:.12,eye:.13,raise:-.12,curl:.24},
    };
    const cur = { ...POSES.walk };
    let tailFlex=0,tailVelocity=0,previousYaw=0;
    const st = { mode: 'walk', idx: 0, target: RING[1], timer: 0, yaw: 0, walk: 0, phase: 0, hop: null, attend: false, afterHop: null, lastFx: 0, onBean: false, blink: 2 };
    st.idx = 0; root.position.copy(RING[0]); st.target = RING[1]; st.idx = 1;

    let route=[],routeIndex=0,routeGoal=null;
    function nextTarget(){st.idx=(st.idx+1)%RING.length;st.target=RING[st.idx];routeGoal=null;}
    function planRoute(){route=findFloorPath?.(root.position,st.target,.20)||[];routeIndex=0;routeGoal=st.target;}
    function startHop(to, then) { st.hop = { from: root.position.clone(), to: to.clone(), k: 0 }; st.mode = 'hop'; st.afterHop = then; }
    function arrive() {
      if(st.idx===NAP_POINT&&Math.random()<.65){st.onBean=false;st.mode='sleep';st.timer=8+Math.random()*6;return;}
      if (Math.random() < 0.3) { st.mode = 'sit'; st.timer = 2.5 + Math.random() * 4; return; }
      nextTarget();
    }
    function leaveBean() {
      st.onBean=false;st.mode='walk';root.position.y=0;nextTarget();
    }

    function update(t, dt, camera) {
      let pose = 'walk', moving = false;
      switch (st.mode) {
        case 'walk': {
          if(routeGoal!==st.target)planRoute();
          if(routeIndex>=route.length){arrive();break;}
          const waypoint=route[routeIndex];tmp.set(waypoint.x-root.position.x,0,waypoint.z-root.position.z);
          const d=tmp.length();if(d<.045){routeIndex++;break;}
          const stepLen=Math.min(d,.54*dt);tmp.normalize();
          const oldX=root.position.x,oldZ=root.position.z;
          moveWithCollision(root.position,tmp.x*stepLen,tmp.z*stepLen,.20);
          st.yawGoal=Math.atan2(tmp.x,tmp.z);
          moving=Math.hypot(root.position.x-oldX,root.position.z-oldZ)>.0002;
          if(!moving&&dt>0){nextTarget();}
          break;
        }
        case 'sit': pose = 'sit'; st.timer -= dt; if (st.timer <= 0) { st.mode = 'walk'; nextTarget(); } break;
        case 'sleep':
          pose = 'sleep'; st.timer -= dt;
          if (t - st.lastFx > 1.5) { st.lastFx = t; head.getWorldPosition(tmp); spawn('z', tmp.clone().add(new THREE.Vector3(0.05, 0.22, 0)), { rise: 0.55, life: 2.2, size: 0.14, drift: [0.18, 0.08] }); }
          if (st.timer <= 0) leaveBean();
          break;
        case 'hop': {
          const h = st.hop; h.k = Math.min(1, h.k + dt / 0.6);
          root.position.lerpVectors(h.from, h.to, h.k);
          root.position.y += Math.sin(h.k * Math.PI) * 0.45;
          tmp.subVectors(h.to, h.from); st.yawGoal = Math.atan2(tmp.x, tmp.z);
          if (h.k >= 1) { st.hop = null; const then = st.afterHop; st.afterHop = null; then(); if (st.attend && st.mode !== 'pet') st.mode = 'attend'; }
          break;
        }
        case 'held': pose='held';break;
        case 'attend': pose = 'sit'; st.yawGoal = Math.atan2(camera.position.x - root.position.x, camera.position.z - root.position.z); break;
        case 'pet':
          pose=catHeld?'heldPet':'pet';st.timer-=dt;
          st.yawGoal = Math.atan2(camera.position.x - root.position.x, camera.position.z - root.position.z);
          if (t - st.lastFx > 0.32) { st.lastFx = t; spawn('heart', root.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.7, 0)), { rise: 0.7, life: 1.4, size: 0.15, drift: [(Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3] }); }
          if(st.timer<=0)st.mode=catHeld?'held':st.attend?'attend':(st.onBean?'sleep':'walk');
          if (st.mode === 'sleep') st.timer = 6;
          break;
      }
      // turn smoothly toward where it's heading
      if (st.yawGoal !== undefined) {
        let dy = st.yawGoal - st.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        st.yaw += dy * Math.min(1, dt * 6);
        root.rotation.y = st.yaw;
      }
      // pose blending
      const P = POSES[pose];
      for (const k in P) cur[k] = THREE.MathUtils.damp(cur[k], P[k], 7, dt);
      st.walk = THREE.MathUtils.damp(st.walk, moving ? 1 : 0, 10, dt);
      st.phase += dt * 9 * st.walk;
      const sw = Math.sin(st.phase) * 0.55 * st.walk;
      body.position.y = cur.y + Math.abs(Math.sin(st.phase)) * 0.012 * st.walk + (pose === 'sleep' ? Math.sin(t * 2) * 0.004 : 0);
      body.rotation.x = cur.pitch;
      legs[0].rotation.x = cur.front + sw; legs[1].rotation.x = cur.front - sw;
      legs[2].rotation.x = cur.back - sw; legs[3].rotation.x = cur.back + sw;
      const beingPetted=pose==='pet'||pose==='heldPet';
      head.rotation.x=cur.head+(beingPetted?Math.sin(t*3)*.045:0);
      head.rotation.z=THREE.MathUtils.damp(head.rotation.z,beingPetted?.09*Math.sin(t*2):0,7,dt);
      ears.forEach((ear,i)=>{ear.rotation.z=(i===0?1:-1)*.24+(beingPetted?.065*Math.sin(t*5+i):.018*Math.sin(t*1.8+i));});
      head.position.y = cur.headY;
      if (t > st.blink) { st.blink = t + 2.5 + Math.random() * 3; st.blinkEnd = t + 0.12; }
      const eyeY = t < (st.blinkEnd || 0) ? 0.1 : cur.eye;
      eyes.forEach((e) => (e.scale.y = eyeY));
      const yawDelta=Math.atan2(Math.sin(st.yaw-previousYaw),Math.cos(st.yaw-previousYaw));
      previousYaw=st.yaw;
      const targetFlex=THREE.MathUtils.clamp(-yawDelta/Math.max(dt,.008)*.035,-.16,.16);
      const steps=Math.max(1,Math.ceil(dt/.012)),h=dt/steps;
      for(let j=0;j<steps;j++){tailVelocity+=(75*(targetFlex-tailFlex)-14*tailVelocity)*h;tailFlex+=tailVelocity*h;}
      tail.forEach((s,i)=>{
        const amount=(i+1)/tail.length;
        s.rotation.x=(i<3?cur.raise:cur.raise*.5)+Math.sin(t*2-i*.6)*.035;
        s.rotation.y=cur.curl+tailFlex*amount+Math.sin(t*(pose==='pet'?4:1.8)-i*.5)*(pose==='sleep'?.025:.08);
      });
      if(pose==='sleep'||beingPetted||pose==='held')body.position.y+=Math.sin(t*2.7)*.004;
    }

    return {
      root, update,
      attend(on) {
        st.attend = on;
        if (on) { if (st.mode !== 'hop') st.mode = 'attend'; }
        else if (st.mode === 'attend') { if (st.onBean) { st.mode = 'sleep'; st.timer = 5 + Math.random() * 5; } else st.mode = 'walk'; }
      },
      pet() { if (st.mode === 'hop') return; st.mode = 'pet'; st.timer = 2.6; st.lastFx = 0; },
      hold(){st.hop=null;st.afterHop=null;st.attend=true;st.onBean=false;st.mode='held';},
      drop(position){root.position.copy(position).setY(0);st.attend=false;st.onBean=false;st.mode='walk';nextTarget();},
    };
  })();
  hitBox(cat.root, 0.42, 0.62, 0.85, 0, 0.3, 0);
  register(cat.root, { kind: 'cat', index: 0, label: 'Pick up Commit the cat' }, { dir: new THREE.Vector3(0, 0, 0), selectOffset: 0, hoverOffset: 0 });
  anchors.cat = () => cat.root.position.clone().add(new THREE.Vector3(0, 0.85, 0));
  let catHeld=false,catPetTime=0,catReturn=null,catLift=0,catDrop=null;
  const catStart=new THREE.Vector3(),catStartQ=new THREE.Quaternion(),catGoal=new THREE.Vector3(),catGoalQ=new THREE.Quaternion(),catGrip=new THREE.Vector3(),catYaw=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI*.68);
  const dropTarget=new THREE.Vector3();

  // =====================================================================
  // Record player on a cabinet by the certificate wall
  // =====================================================================
  const cabinetM = std(0xc99566, { roughness: 0.6 });
  mesh(rbox(0.66, 0.84, 1.5, 0.03), cabinetM, -4.63, 0.42, 2.35);
  for (const z of [1.98, 2.72]) {
    mesh(box(0.02, 0.62, 0.68), std(0xd5a374, { roughness: 0.5 }), -4.29, 0.44, z);
    mesh(new THREE.SphereGeometry(0.025, 10, 8), std(0x2a2a2a, { metalness: 0.5 }), -4.27, 0.44, z + (z < 2.3 ? 0.28 : -0.28));
  }
  const music = new THREE.Group(); music.position.set(-4.62, 0.84, 2.35); scene.add(music);
  const deck = new THREE.Group(); deck.position.set(0, 0, -0.28); music.add(deck);
  mesh(rbox(0.52, 0.09, 0.6, 0.02), std(0x2b2b30, { roughness: 0.5 }), 0, 0.045, 0, deck);
  mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.02, 40), std(0x9a9ca3, { metalness: 0.7, roughness: 0.3 }), -0.03, 0.1, -0.05, deck);
  const vinyl = new THREE.Group(); vinyl.position.set(-0.03, 0.115, -0.05); deck.add(vinyl);
  mesh(new THREE.CylinderGeometry(0.195, 0.195, 0.008, 40), std(0x111114, { roughness: 0.25 }), 0, 0, 0, vinyl);
  mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.01, 24), std(0xc2562f), 0, 0.001, 0, vinyl);
  mesh(new THREE.BoxGeometry(0.02, 0.011, 0.05), std(0xf2eadc), 0.03, 0.002, 0, vinyl, { cast: false });
  const arm = new THREE.Group(); arm.position.set(0.18, 0.13, 0.2); deck.add(arm);
  mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 12), std(0x9a9ca3, { metalness: 0.7 }), 0, -0.01, 0, arm);
  rod(new THREE.Vector3(0, 0.01, 0), new THREE.Vector3(0, 0.01, -0.3), 0.008, std(0xd0d2d8, { metalness: 0.8, roughness: 0.25 }), arm);
  mesh(box(0.035, 0.02, 0.05), std(0x222222), 0, 0.0, -0.31, arm);
  mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 12), std(0x555555, { metalness: 0.6 }), 0, 0.01, 0.05, arm).rotation.x = Math.PI / 2;
  const speaker = new THREE.Group(); speaker.position.set(0, 0, 0.5); music.add(speaker);
  mesh(rbox(0.32, 0.46, 0.32, 0.03), std(0x5a3b26, { roughness: 0.6 }), 0, 0.23, 0, speaker);
  const cone = mesh(new THREE.CircleGeometry(0.09, 24), std(0x1a1a1d, { roughness: 0.8 }), 0.162, 0.19, 0, speaker, { cast: false }); cone.rotation.y = Math.PI / 2;
  const tweet = mesh(new THREE.CircleGeometry(0.035, 16), std(0x1a1a1d), 0.162, 0.36, 0, speaker, { cast: false }); tweet.rotation.y = Math.PI / 2;
  register(music, { kind: 'music', index: 0, label: 'Record player — play some lo-fi' }, { dir: new THREE.Vector3(0, 1, 0), selectOffset: 0.02, hoverOffset: 0.03 });
  anchors.music = () => music.localToWorld(new THREE.Vector3(0, 0.75, 0));
  // record sleeves leaning against the cabinet
  ['#2f5d8a', '#d7a04a', '#9a3f52'].forEach((c, i) => {
    const s = mesh(box(0.4, 0.4, 0.012), std(c, { roughness: 0.7 }), -4.62 + i * 0.03, 0.21, 1.55 - i * 0.02);
    s.rotation.set(-0.22 + i * 0.04, 0, 0);
  });
  let playing = false, playAmt = 0, lastNote = 0;

  // =====================================================================
  // Phone on the desk (LinkedIn)
  // =====================================================================
  const phone = new THREE.Group(); phone.position.set(-0.64, deskTop, -1.2); phone.rotation.y = -0.35; scene.add(phone);
  mesh(rbox(0.17, 0.022, 0.33, 0.01), std(0x1b1c20, { roughness: 0.3, metalness: 0.4 }), 0, 0.011, 0, phone);
  const phoneScreen = TX.createPhoneScreen();
  const scr = mesh(new THREE.PlaneGeometry(0.15, 0.3), new THREE.MeshBasicMaterial({ map: phoneScreen.texture, toneMapped: false }), 0, 0.0225, 0, phone, { cast: false });
  scr.rotation.x = -Math.PI / 2;
  hitBox(phone, 0.26, 0.08, 0.42, 0, 0.03, 0);
  register(phone, { kind: 'phone', index: 0, label: 'Phone — 1 new message' }, { dir: new THREE.Vector3(0, 1, 0), selectOffset: 0.06, hoverOffset: 0.03 });
  anchors.phone = () => phone.position.clone().add(new THREE.Vector3(0, 0.35, 0));
  const phoneSt = { nextBuzz: 6, buzzUntil: 0, litUntil: 0, lit: null, answered: false };
  const istTime = () => {
    const now = new Date();
    const ist = new Date(now.getTime() + (now.getTimezoneOffset() + 330) * 60000);
    return String(ist.getHours()).padStart(2, '0') + ':' + String(ist.getMinutes()).padStart(2, '0');
  };

  // =====================================================================
  // Résumé clipboard on the back wall
  // =====================================================================
  const clip = new THREE.Group(); clip.position.set(0.2, 2.42, -4.97); clip.rotation.z = 0.03; scene.add(clip);
  mesh(rbox(0.5, 0.68, 0.025, 0.02), std(0x9a6a40, { roughness: 0.6 }), 0, 0, 0.0125, clip);
  mesh(new THREE.PlaneGeometry(0.44, 0.58), new THREE.MeshStandardMaterial({ map: TX.resumeTexture(profile), roughness: 0.9 }), 0, -0.035, 0.027, clip, { cast: false });
  mesh(rbox(0.2, 0.07, 0.03, 0.01), std(0xb8bcc4, { metalness: 0.8, roughness: 0.3 }), 0, 0.3, 0.035, clip);
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), std(0x777777, { metalness: 0.7 }), 0, 0.38, 0.02, clip).rotation.x = Math.PI / 2;
  register(clip, { kind: 'resume', index: 0, label: 'Résumé on the clipboard' }, { dir: new THREE.Vector3(0, 0, 1), selectOffset: 0.12, hoverOffset: 0.05 });
  anchors.resume = () => clip.position.clone().add(new THREE.Vector3(0, 0.45, 0.1));

  // =====================================================================
  // Event lanyards on a hook (community & leadership)
  // =====================================================================
  const lanyards = new THREE.Group(); lanyards.position.set(-4.93, 3.25, 4.56); lanyards.rotation.y = Math.PI / 2; scene.add(lanyards);
  const brass = std(0xc9a24d, { metalness: 0.7, roughness: 0.35 });
  rod(new THREE.Vector3(-0.42, 0, 0.05), new THREE.Vector3(0.42, 0, 0.05), 0.018, brass, lanyards);
  for (const x of [-0.38, 0.38]) rod(new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, 0, 0.06), 0.02, brass, lanyards);
  const events = [['Startup Mini Meetup', '#c2562f'], ['Ahmedabad Innovation Summit', '#2e5b52'], ['FITAG Tech Expo 2026', '#2f5d8a']];
  const swings = events.map(([name, col], i) => {
    const sw = new THREE.Group(); sw.position.set(-0.27 + i * 0.27, 0, 0.06); lanyards.add(sw);
    const strap = std(col, { roughness: 0.9 });
    rod(new THREE.Vector3(-0.05, 0, 0), new THREE.Vector3(0, -0.42, 0.005), 0.009, strap, sw);
    rod(new THREE.Vector3(0.05, 0, 0), new THREE.Vector3(0, -0.42, 0.005), 0.009, strap, sw);
    mesh(box(0.04, 0.05, 0.015), std(0x999999, { metalness: 0.7 }), 0, -0.44, 0.006, sw);
    mesh(rbox(0.18, 0.24, 0.008, 0.01), std(0xf4efe6), 0, -0.58, 0.006, sw);
    mesh(new THREE.PlaneGeometry(0.17, 0.227), new THREE.MeshStandardMaterial({ map: TX.badgeTexture(name, col), roughness: 0.7 }), 0, -0.58, 0.011, sw, { cast: false });
    sw.userData.phase = i * 1.3;
    return sw;
  });
  hitBox(lanyards, 0.95, 0.9, 0.14, 0, -0.4, 0.07);
  register(lanyards, { kind: 'lanyard', index: 0, label: 'Event passes — community work' }, { dir: new THREE.Vector3(1, 0, 0), selectOffset: 0.05, hoverOffset: 0.03 });
  anchors.lanyard = () => lanyards.position.clone().add(new THREE.Vector3(0.3, 0.25, 0));
  let swingAmp = 0.02;

  // =====================================================================
  // Rubber duck on the desk
  // =====================================================================
  const duck = new THREE.Group(); duck.position.set(-1.62, deskTop, -1.8); duck.rotation.y = 0.8; scene.add(duck);
  const duckBody = new THREE.Group(); duck.add(duckBody);
  const yellow = std(0xffcf33, { roughness: 0.35 });
  mesh(new THREE.SphereGeometry(0.075, 16, 12), yellow, 0, 0.065, 0, duckBody).scale.set(1, 0.85, 1.3);
  mesh(new THREE.SphereGeometry(0.052, 16, 12), yellow, 0, 0.14, 0.045, duckBody);
  mesh(rbox(0.05, 0.02, 0.055, 0.008), std(0xf28c28, { roughness: 0.4 }), 0, 0.128, 0.1, duckBody);
  for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.009, 8, 6), std(0x111111), s * 0.024, 0.158, 0.085, duckBody, { cast: false });
  mesh(new THREE.ConeGeometry(0.03, 0.06, 8), yellow, 0, 0.1, -0.1, duckBody).rotation.x = -1.1;
  hitBox(duck, 0.28, 0.26, 0.32, 0, 0.11, 0);
  register(duck, { kind: 'duck', index: 0, label: 'Rubber duck — debugging buddy' }, { dir: new THREE.Vector3(0, 1, 0), selectOffset: 0.0, hoverOffset: 0.02 });
  anchors.duck = () => duck.position.clone().add(new THREE.Vector3(0, 0.35, 0));
  let squash = 0;

  // =====================================================================
  // Corner plant (grows when watered)
  // =====================================================================
  const plant = new THREE.Group(); plant.position.set(-4.25, 0, -4.25); scene.add(plant);
  // Sculpted ceramic planter with a proper rim, recessed soil, and organic foliage.
  const fallbackPlant=new THREE.Group();plant.add(fallbackPlant);
  const ceramic=new THREE.MeshStandardMaterial({color:0x38322a,roughness:.57,metalness:.05,envMapIntensity:.25,map:TX.ceramicTexture(),bumpMap:TX.ceramicTexture(),bumpScale:.012});
  const profilePoints=[[0,0],[.26,0],[.29,.025],[.34,.12],[.405,.49],[.407,.59],[.395,.635],[.365,.65],[.342,.626],[.345,.565]].map(([x,y])=>new THREE.Vector2(x,y));
  mesh(new THREE.LatheGeometry(profilePoints,48),ceramic,0,0,0,fallbackPlant);
  const soil=mesh(new THREE.CircleGeometry(.349,40),new THREE.MeshStandardMaterial({color:0x63503b,map:TX.ceramicTexture(),roughness:1}),0,.565,0,fallbackPlant);
  soil.rotation.x=-Math.PI/2;
  const foliage=new THREE.Group();foliage.position.y=.57;fallbackPlant.add(foliage);
  // Curved pointed leaves, with a raised midrib and photographic-style vein texture.
  // Instancing keeps all leaves and all stalks to two draw calls on mobile.
  function leafGeometry(){
    const verts=[],uv=[],indices=[],rows=18,cols=8;
    for(let i=0;i<=rows;i++){
      const t=i/rows, width=.155*Math.pow(Math.sin(Math.PI*t),.78)*(1+.09*Math.sin(t*12));
      for(let j=0;j<=cols;j++){
        const u=j/cols,s=u*2-1;
        verts.push(s*width,t*.52, .075*Math.sin(Math.PI*t)*(1-s*s)-.10*t*t+.022*s*s*Math.sin(t*8));
        uv.push(u,t);
      }
    }
    for(let i=0;i<rows;i++)for(let j=0;j<cols;j++){const k=i*(cols+1)+j;indices.push(k,k+1,k+cols+1,k+1,k+cols+2,k+cols+1);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
  }
  const leavesCount=28,leafMat=new THREE.MeshPhysicalMaterial({color:0xffffff,map:TX.leafTexture(),bumpMap:TX.leafTexture(),bumpScale:.006,roughness:.47,envMapIntensity:.15,clearcoat:.08,clearcoatRoughness:.48,side:THREE.DoubleSide});
  const leaves=new THREE.InstancedMesh(leafGeometry(),leafMat,leavesCount);
  const stalks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.008,.013,1,7),std(0x50613a,{roughness:.87}),leavesCount);
  const obj=new THREE.Object3D(),up=new THREE.Vector3(0,1,0),dir=new THREE.Vector3();
  for(let k=0;k<leavesCount;k++){
    const angle=k*2.39996323, layer=k%7, reach=.13+.44*(layer/6), height=.42+layer*.17+.10*Math.sin(k*1.7);
    const end=new THREE.Vector3(Math.cos(angle)*reach,height,Math.sin(angle)*reach);
    obj.position.copy(end).multiplyScalar(.5);obj.quaternion.setFromUnitVectors(up,end.clone().normalize());obj.scale.set(1,end.length(),1);obj.updateMatrix();stalks.setMatrixAt(k,obj.matrix);
    dir.set(Math.cos(angle)*.88,.38-.48*(layer/6),Math.sin(angle)*.88).normalize();
    obj.position.copy(end);obj.quaternion.setFromUnitVectors(up,dir);obj.rotateY(Math.sin(k*2.7)*.45);
    const size=.72+.37*(.5+.5*Math.sin(k*5.2));obj.scale.set(size,size,size);obj.updateMatrix();leaves.setMatrixAt(k,obj.matrix);
    leaves.setColorAt(k,new THREE.Color().setRGB(.65+(k%4)*.055,.82+(k%3)*.05,.61+(k%5)*.04));
  }
  leaves.instanceMatrix.needsUpdate=true;stalks.instanceMatrix.needsUpdate=true;leaves.instanceColor.needsUpdate=true;
  leaves.castShadow=true;leaves.receiveShadow=true;stalks.castShadow=true;stalks.receiveShadow=true;
  foliage.add(leaves,stalks);
  // Explicit lightweight target for the foliage; actual pot remains selectable.
  const plantHit=hitBox(plant,1.38,2.08,1.38,0,1.20,0);plantHit.userData.interactionProxy=true;
  let growth = 1;
  try { growth = Math.min(1.35, Math.max(1, parseFloat(localStorage.getItem('room.plantGrowth')) || 1)); } catch { /* storage unavailable */ }
  foliage.scale.setScalar(growth);
  register(plant, { kind: 'plant', index: 0, label: 'Water the plant' }, { dir: new THREE.Vector3(0, 0, 0), selectOffset: 0, hoverOffset: 0 });
  anchors.plant = () => plant.position.clone().add(new THREE.Vector3(0.3, 2.2 * growth, 0.3));
  let wiggle=0,photoPlant=null;
  loadPhotographicProp('potted_plant_02',2.15,1.35,1.35).then(model=>{if(!model)return;photoPlant=model;plant.add(model);fallbackPlant.visible=false;model.scale.multiplyScalar(1+(growth-1)*.35);});

  // =====================================================================
  // Update + actions
  // =====================================================================
  function update(t,dt,{camera,playerPos,yaw}){
    cat.update(t,dt,camera);
    dropTarget.set(-Math.sin(yaw)*1.0,0,-Math.cos(yaw)*1.0).add(playerPos).setY(0);
    collide?.(dropTarget,.23);
    if(catHeld){
      catPetTime=Math.max(0,catPetTime-dt);
      catGoal.set(0,-.60+Math.sin(t*2.2)*.007,-.85).applyQuaternion(camera.quaternion).add(camera.position);
      catGoalQ.copy(camera.quaternion).multiply(catYaw);
      if(catDrop){
        catDrop.time+=dt;const x=Math.min(1,catDrop.time/.75),k=x*x*(3-2*x);
        cat.root.position.lerpVectors(catDrop.from,catDrop.to,k);
        cat.root.quaternion.slerpQuaternions(catDrop.q,catDrop.endQ,k);
        if(x>=1){catHeld=false;cat.drop(catDrop.to);catDrop=null;cat.root.userData.hit.label='Pick up Commit the cat';}
      }else{
        catLift=Math.min(1,catLift+dt/.70);const k=catLift*catLift*(3-2*catLift);
        cat.root.position.lerpVectors(catStart,catGoal,k);
        cat.root.quaternion.slerpQuaternions(catStartQ,catGoalQ,k);
      }
      catGrip.copy(cat.root.position);camera.worldToLocal(catGrip);
    }

    // record player
    playAmt = THREE.MathUtils.damp(playAmt, playing ? 1 : 0, 3, dt);
    vinyl.rotation.y -= dt * 3.5 * playAmt;
    arm.rotation.y = 0.38 * playAmt;
    speaker.scale.setScalar(1 + (playing ? Math.max(0, Math.sin(t * 7.8)) * 0.02 : 0));
    // The spinning record and audible music are the feedback; no floating cartoon notes.

    // phone buzzes every so often (much less once it's been opened)
    phoneSt.now = t;
    if (t > phoneSt.nextBuzz) {
      phoneSt.buzzUntil = t + 1.4; phoneSt.litUntil = t + 7;
      phoneSt.nextBuzz = t + (phoneSt.answered ? 60 : 22) + Math.random() * 10;
    }
    const buzzing = t < phoneSt.buzzUntil;
    phone.rotation.y = -0.35 + (buzzing ? Math.sin(t * 70) * 0.04 : 0);
    phone.position.x = -0.64 + (buzzing ? Math.sin(t * 90) * 0.006 : 0);
    const lit = t < phoneSt.litUntil;
    const clockStr = istTime();
    if (lit !== phoneSt.lit || (lit && clockStr !== phoneSt.clock)) { phoneSt.lit = lit; phoneSt.clock = clockStr; phoneScreen.draw(lit, clockStr); }

    // lanyards sway, more after a click
    swingAmp = THREE.MathUtils.damp(swingAmp, 0.02, 0.8, dt);
    swings.forEach((s) => { s.rotation.x = Math.sin(t * 2.2 + s.userData.phase) * swingAmp; });

    // duck squash + plant wiggle
    squash = THREE.MathUtils.damp(squash, 0, 6, dt);
    duckBody.scale.set(1 + squash * 0.25, 1 - squash * 0.35, 1 + squash * 0.25);
    wiggle = THREE.MathUtils.damp(wiggle, 0, 2.5, dt);
    foliage.rotation.z = Math.sin(t * 9) * 0.06 * wiggle;
    if(photoPlant)photoPlant.rotation.z=Math.sin(t*8)*.015*wiggle;
    foliage.rotation.x = Math.cos(t * 7) * 0.04 * wiggle;
    foliage.scale.setScalar(THREE.MathUtils.damp(foliage.scale.x, growth, 3, dt));
  }

  function act(kind, action) {
    switch (kind) {
      case 'cat':
        if(action==='pickup'&&!catHeld){catReturn=cat.root.position.clone();catStart.copy(cat.root.position);catStartQ.copy(cat.root.quaternion);catHeld=true;catLift=0;cat.hold();cat.root.userData.hit.label='Pet Commit';return true;}
        if(action==='putdown'&&catHeld&&!catDrop&&catLift>=1){catPetTime=0;cat.hold();catDrop={from:cat.root.position.clone(),to:dropTarget.clone(),q:cat.root.quaternion.clone(),endQ:new THREE.Quaternion(),time:0};return true;}
        if(action==='pet'&&catHeld&&!catDrop&&catLift>=1&&catPetTime<=0){catPetTime=2.6;cat.pet();return true;}
        if(catHeld)return false;
        if (action === 'attend') cat.attend(true);
        if (action === 'release') cat.attend(false);
        if (action === 'pet') cat.pet();
        return true;
      case 'music':
        playing = action === 'play';
        return playing;
      case 'phone':
        phoneSt.answered = true;
        phoneSt.buzzUntil = 0;
        phoneSt.litUntil = phoneSt.now + 10;
        phoneSt.nextBuzz = phoneSt.now + 60;
        return true;
      case 'lanyard': swingAmp = 0.35; return true;
      case 'duck': squash = 1; return true;
      case 'plant': {
        const previousGrowth=growth;growth=Math.min(1.35,growth+.05);if(photoPlant)photoPlant.scale.multiplyScalar((1+(growth-1)*.35)/(1+(previousGrowth-1)*.35));
        try { localStorage.setItem('room.plantGrowth', String(growth)); } catch { /* ignore */ }
        wiggle = 1;
        for (let i = 0; i < 9; i++) {
          spawn('drop', plant.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.7, 1.6 + Math.random() * 0.5, (Math.random() - 0.5) * 0.7)), { rise: -1.0, life: 0.9 + Math.random() * 0.3, size: 0.035 });
        }
        return growth;
      }
      default: return false;
    }
  }

  return {
    update, act,
    anchorOf: (kind) => anchors[kind]?.() || null,
    get catPos() { return cat.root.position; },
    get catHeld(){return catHeld;},
    get catReady(){return catHeld&&catLift>=1&&!catDrop;},
    get catGrip(){return catGrip;},
    get catPetting(){return catPetTime>0?Math.sin(catPetTime*5.5)*Math.min(1,catPetTime*3):0;},
    get plantGrowth() { return growth; },
  };
}
