// Fixed-step spring integration and analytic gravity in room units.
export function advanceSpring(s,target,dt,k=95,damping=15){
  const elapsed=Math.max(0,Math.min(dt,.12)),n=Math.max(1,Math.ceil(elapsed*120)),h=elapsed/n;
  for(let i=0;i<n;i++){s.v+=(k*(target-s.x)-damping*s.v)*h;s.x+=s.v*h;}return s.x;
}
export function advanceDrop(d,dt,floor){
  const h=Math.max(0,Math.min(.12,dt)),g=15.7;
  d.x+=d.vx*h;d.z+=d.vz*h;d.y+=d.vy*h-.5*g*h*h;d.vy-=g*h;
  if(d.y<=floor){d.y=floor;return false;}return true;
}
export function runPropChecks(){
  const results=[],check=(name,pass)=>results.push({name,pass:!!pass});
  const d={x:0,y:2,z:0,vx:0,vy:0,vz:0};advanceDrop(d,.1,0);
  check('Gravity accelerates water',d.y<2&&d.vy<0);
  for(let i=0;i<120;i++)advanceDrop(d,1/60,.5);
  check('Water stops at soil',Math.abs(d.y-.5)<1e-8);
  const s={x:1,v:0};for(let i=0;i<240;i++)advanceSpring(s,0,1/60);
  check('Spring settles',Math.abs(s.x)<.001&&Math.abs(s.v)<.001);
  const a={x:1,v:0},b={x:1,v:0};for(let i=0;i<30;i++)advanceSpring(a,0,1/30);for(let i=0;i<120;i++)advanceSpring(b,0,1/120);
  check('Frame-rate independent spring',Math.abs(a.x-b.x)<.0001);
  return results;
}
