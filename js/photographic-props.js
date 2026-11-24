// CC0 Poly Haven models. Load the native glTF with its PBR image dependencies.
// Retain the local prop when a third-party asset cannot be fetched.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
const allowed=new Set(['potted_plant_02','potted_plant_04','ArmChair_01']);
export const propStatus = new Map();
const loader=new GLTFLoader();
const cache=new Map();
async function fetchAsset(id){
  const url='https://dl.polyhaven.org/file/ph-assets/Models/gltf/1k/'+id+'/'+id+'_1k.gltf';
  if(!cache.has(id))cache.set(id,loader.loadAsync(url).catch(err=>{cache.delete(id);throw err;}));
  return cache.get(id);
}
export async function loadPhotographicProp(id,height,maxWidth=Infinity,maxDepth=Infinity){
  if(!allowed.has(id))return null;
  propStatus.set(id,'loading');
  try{
    const gltf=await fetchAsset(id);
    const model=gltf.scene.clone(true);model.updateMatrixWorld(true);
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
    if(!(size.y>0)||!Number.isFinite(size.y))throw new Error('Invalid model bounds');
    const scale=Math.min(height/size.y,maxWidth/Math.max(size.x,.001),maxDepth/Math.max(size.z,.001)),center=bounds.getCenter(new THREE.Vector3());
    const root=new THREE.Group();model.scale.multiplyScalar(scale);
    model.position.x-=center.x*scale;model.position.y-=bounds.min.y*scale;model.position.z-=center.z*scale;
    // A successful geometry load is not proof that its diffuse image decoded.
    if(id.startsWith('potted_plant')){
      let colored=false;
      model.traverse(o=>{
        if(!o.isMesh)return;
        for(const mat of Array.isArray(o.material)?o.material:[o.material]){
          if(mat.color&&mat.color.g>mat.color.r*1.18&&mat.color.g>mat.color.b*1.18)colored=true;
          const img=mat.map?.image;
          if(!img)continue;
          try{
            const c=document.createElement('canvas');c.width=c.height=48;
            const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,48,48);
            const px=ctx.getImageData(0,0,48,48).data;
            let green=0,opaque=0;
            for(let i=0;i<px.length;i+=4){if(px[i+3]<128)continue;opaque++;if(px[i+1]>px[i]*1.12&&px[i+1]>px[i+2]*1.16&&px[i+1]>24)green++;}
            if(green>Math.max(20,opaque*.025))colored=true;
          }catch{ /* Cannot verify decoded texture, keep colored local model. */ }
        }
      });
      if(!colored)throw new Error('Botanical base color absent or unverified');
    }
    model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
      for(const m of Array.isArray(o.material)?o.material:[o.material]){
        if(m.isMeshStandardMaterial)m.envMapIntensity=.3;
        if(m.map)m.map.anisotropy=8;
      }
      // Existing compact interaction proxy handles the plant, not dense leaves.
      o.raycast=()=>{};
    });
    root.add(model);root.name='CC0 '+id;propStatus.set(id,'ready');return root;
  }catch(err){propStatus.set(id,'fallback');console.warn('Photographic prop unavailable; retaining local model:',id,err);return null;}
}
