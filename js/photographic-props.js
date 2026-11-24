// CC0 Poly Haven models. Load the native glTF with its PBR image dependencies.
// Retain the local prop when a third-party asset cannot be fetched.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const allowed=new Set(['potted_plant_02','potted_plant_04']);
export async function loadPhotographicProp(id,height){
  if(!allowed.has(id))return null;
  const url='https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/'+id+'/'+id+'_1k.gltf';
  try{
    const gltf=await new GLTFLoader().loadAsync(url);
    const model=gltf.scene;model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
    if(!(size.y>0)||!Number.isFinite(size.y))return null;
    const scale=height/size.y,center=bounds.getCenter(new THREE.Vector3());
    const root=new THREE.Group();model.scale.multiplyScalar(scale);
    model.position.x-=center.x*scale;model.position.y-=bounds.min.y*scale;model.position.z-=center.z*scale;
    model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
      for(const m of Array.isArray(o.material)?o.material:[o.material]){
        if(m.isMeshStandardMaterial)m.envMapIntensity=.3;
        if(m.map)m.map.anisotropy=8;
      }
      // Existing compact interaction proxy handles the plant, not dense leaves.
      o.raycast=()=>{};
    });
    root.add(model);root.name='CC0 '+id;return root;
  }catch(err){console.warn('Photographic prop unavailable; retaining local model:',id,err);return null;}
}
