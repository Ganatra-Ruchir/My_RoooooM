// Licensed files stay in this browser's IndexedDB. Never uploaded or redistributed.
const DB='ruchir-local-avatar-v1',STORE='avatar';
function database(){return new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB)return reject(new Error('Local storage unavailable'));
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>req.result.createObjectStore(STORE);
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);req.onblocked=()=>reject(new Error('Close other portfolio tabs and retry.'));
});}
function readKey(db,key){return new Promise((resolve,reject)=>{const req=db.transaction(STORE,'readonly').objectStore(STORE).get(key);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});}
function status(id,message){const el=document.getElementById(id);if(el)el.textContent=message;}
export async function readLocalModels(){
  try{
    const db=await database(),[ruchir,cat]=await Promise.all([readKey(db,'ruchir'),readKey(db,'cat')]);db.close();
    const credit=document.getElementById('localAvatarCredit');if(credit)credit.hidden=!ruchir;
    status('avatarStatus',ruchir?'Loading custom Ruchir: '+ruchir.name:'Public placeholder active. Select your Ruchir VRM.');
    status('catStatus',cat?'Loading custom cat: '+cat.name:'Default cat active. Select your cat VRM.');
    return {ruchir,cat};
  }catch(e){status('avatarStatus','Browser storage unavailable: '+e.message);return {ruchir:null,cat:null};}
}
export async function readLocalAvatar(){return (await readLocalModels()).ruchir;}
async function inspect(file){
  if(file.size>60*1024*1024)throw new Error('VRM must be under 60 MB.');
  const b=await file.arrayBuffer(),v=new DataView(b);
  if(v.byteLength<20||v.getUint32(0,true)!==0x46546c67||v.getUint32(4,true)!==2||v.getUint32(8,true)!==b.byteLength)throw new Error('Invalid binary VRM: '+file.name);
  const n=v.getUint32(12,true);if(v.getUint32(16,true)!==0x4e4f534a||n>v.byteLength-20)throw new Error('Invalid VRM JSON header.');
  const j=JSON.parse(new TextDecoder().decode(new Uint8Array(b,20,n)));
  if(!j.extensions?.VRM&&!j.extensions?.VRMC_vrm)throw new Error('Not a VRM model: '+file.name);
  const cat=j.nodes?.some(n=>/^Tail1_|^LEar1_|^pm0197_/.test(n.name||''))&&j.nodes?.some(n=>/^LThigh_/.test(n.name||''));
  return {file,key:cat?'cat':'ruchir'};
}
export function wireLocalAvatar(){
  const input=document.getElementById('localAvatarFile');if(!input)return;
  let mode='both';
  document.querySelectorAll('[data-local-avatar]').forEach(btn=>btn.addEventListener('click',()=>{mode=btn.dataset.localAvatar||'ruchir';input.multiple=mode==='both';input.click();}));
  input.addEventListener('change',async()=>{
    const files=[...input.files];if(!files.length)return;
    try{
      const items=await Promise.all(files.map(inspect));
      if(mode!=='both'&&items.some(x=>x.key!==mode))throw new Error('Choose the '+(mode==='cat'?'cat':'Ruchir')+' VRM, not the other character.');
      if(new Set(items.map(x=>x.key)).size!==items.length)throw new Error('Select one Ruchir model and one cat model.');
      const db=await database();await new Promise((resolve,reject)=>{
        const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);for(const {key,file} of items)store.put(file,key);
        tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
      });db.close();
      for(const {key,file} of items)status(key==='cat'?'catStatus':'avatarStatus','Saved '+file.name+' — reloading room…');
      location.reload();
    }catch(e){alert(e.message||'Could not save models.');}
    input.value='';
  });
}
