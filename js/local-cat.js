// Runtime-only animation of the supplied quadruped VRM. Original file is unchanged.
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
export async function loadLocalCat(file){
  const buffer=await file.arrayBuffer();
  const gltf=await new GLTFLoader().parseAsync(buffer,'');
  const model=gltf.scene,root=new THREE.Group();
  root.name='private-cat-vrm';root.userData.noInteractionRay=true;root.add(model);
  if(gltf.parser.json.extensions?.VRM)model.rotation.y=Math.PI;
  const find=prefix=>{let hit=null;model.traverse(n=>{if(!hit&&n.name.startsWith(prefix))hit=n;});return hit;};
  const head=find('Head_'),tail=[find('Tail1_'),find('Tail2_'),find('Tail3_')],ears=[find('LEar1_'),find('REar1_')];
  if(!head||!tail[0])throw new Error('Cat skeleton is missing expected joints.');
  const legs=['LArm_','RArm_','LThigh_','RThigh_'].map(find);
  const fore=['LForeArm_','RForeArm_'].map(find);
  root.updateMatrixWorld(true);
  // The model is authored in a spread-arm rest pose. Point front legs toward the floor.
  const down=new THREE.Vector3(0,-1,0);
  function aim(bone,child,direction){
    if(!bone||!child)return;
    root.updateMatrixWorld(true);
    const a=bone.getWorldPosition(new THREE.Vector3()),b=child.getWorldPosition(new THREE.Vector3());
    const d=b.sub(a).normalize(),delta=new THREE.Quaternion().setFromUnitVectors(d,direction);
    const world=bone.getWorldQuaternion(new THREE.Quaternion()),parent=bone.parent.getWorldQuaternion(new THREE.Quaternion());
    bone.quaternion.copy(parent.invert().multiply(delta).multiply(world));root.updateMatrixWorld(true);
  }
  fore.forEach((bone,i)=>{
    aim(legs[i],bone,new THREE.Vector3(0,-1,.10).normalize());
    aim(bone,find(i===0?'LHand_':'RHand_'),down);
  });
  const bounds=new THREE.Box3().setFromObject(model,true),size=bounds.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<.01||size.z<.01)throw new Error('Invalid cat geometry dimensions.');
  const factor=Math.min(.68/size.y,.90/size.z,.63/Math.max(size.x,.01));
  const center=bounds.getCenter(new THREE.Vector3());
  model.scale.multiplyScalar(factor);model.position.set(-center.x*factor,-bounds.min.y*factor,-center.z*factor);
  const ground=model.position.y;
  const parts=[...legs,...fore,head,...tail,...ears].filter(Boolean),rest=new Map(parts.map(n=>[n,n.quaternion.clone()]));
  model.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=true;o.receiveShadow=true;}});
  const q=new THREE.Quaternion(),axisX=new THREE.Vector3(1,0,0),axisY=new THREE.Vector3(0,1,0),axisZ=new THREE.Vector3(0,0,1);
  function bend(n,axis,angle){if(n)n.quaternion.multiply(q.setFromAxisAngle(axis,angle));}
  return {root,width:size.x*factor,height:size.y*factor,depth:size.z*factor,
    update(t,phase,walk,pose,tailFlex){
      for(const n of parts)n.quaternion.copy(rest.get(n));
      const pet=pose==='pet'||pose==='heldPet',held=pose==='held'||pose==='heldPet';
      const step=Math.sin(phase)*.16*walk;
      legs.forEach((n,i)=>bend(n,axisX,(i===0||i===3?step:-step)*(held?0:1)));
      fore.forEach((n,i)=>bend(n,axisX,held?.13:Math.max(0,i===0?-step:step)*.35));
      bend(head,axisX,pet?-.07+Math.sin(t*3)*.035:Math.sin(t*1.7)*.015);
      bend(head,axisZ,pet?.09*Math.sin(t*2):0);
      tail.forEach((n,i)=>bend(n,axisY,Math.sin(t*2-i*.5)*.07+tailFlex*(i+1)/3));
      ears.forEach((n,i)=>bend(n,axisZ,Math.sin(t*(pet?4:1.6)+i)*.04));
      model.position.y=ground+Math.abs(Math.sin(phase))*.008*walk+(held||pet?Math.sin(t*2.7)*.004:0);
    }
  };
}
