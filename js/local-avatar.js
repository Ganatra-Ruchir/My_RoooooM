// Keep licensed VRM bytes on the visitor's device. No upload or public hosting.
const DB='ruchir-local-avatar-v1', STORE='avatar', KEY='ruchir';
function database(){return new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB)return reject(new Error('Local storage unavailable'));
  const request=indexedDB.open(DB,1);
  request.onupgradeneeded=()=>request.result.createObjectStore(STORE);
  request.onsuccess=()=>resolve(request.result); request.onerror=()=>reject(request.error);
});}
export async function readLocalAvatar(){
  try{const db=await database(); const file=await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readonly'), req=tx.objectStore(STORE).get(KEY);
    req.onsuccess=()=>resolve(req.result||null); req.onerror=()=>reject(req.error);
  });db.close(); if(file)document.getElementById('localAvatarCredit').hidden=false;return file;}
  catch{return null;}
}
export function wireLocalAvatar(){
  const input=document.getElementById('localAvatarFile'); if(!input)return;
  document.querySelectorAll('[data-local-avatar]').forEach(btn=>btn.addEventListener('click',()=>input.click()));
  input.addEventListener('change',async()=>{
    const file=input.files?.[0]; if(!file)return;
    try{
      if(file.size>60*1024*1024)throw new Error('Choose a VRM under 60 MB.');
      const b=await file.arrayBuffer(), v=new DataView(b);
      if(v.byteLength<20||v.getUint32(0,true)!==0x46546c67||v.getUint32(8,true)!==b.byteLength)throw new Error('This is not a valid binary VRM.');
      const length=v.getUint32(12,true); if(length>v.byteLength-20)throw new Error('VRM JSON header is incomplete.');
      const j=JSON.parse(new TextDecoder().decode(new Uint8Array(b,20,length)));
      if(!j.extensions?.VRM&&!j.extensions?.VRMC_vrm)throw new Error('The file does not contain a VRM humanoid.');
      const db=await database(); await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).put(file,KEY);
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      });db.close(); location.reload();
    }catch(e){alert(e.message||'Could not load the local avatar.');}
    input.value='';
  });
}
