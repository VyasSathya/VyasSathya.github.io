// Seed Brawl Lanes: 3D client. Draws the state of the lanes rules (core.js, window.SBL) with three.js and feeds it input.
// The look, the world pieces, the hero models and the unit models are the circles version's (game/src/look.js, world.js).
import * as THREE from 'three';
import * as LOOK from './game/src/look.js';
import * as W from './game/src/world.js';

const SB=window.SBL,I=window.SBL_INPUT,GP=(window.SBL_PATHS||{}).game||'./game/',$=id=>document.getElementById(id),PAL=LOOK.palette;
LOOK.setHeroBase(GP+'assets/heroes/');
const K=21/SB.W,wx=x=>x*K-10.5,wz=y=>(y-SB.H/2)*K;           // rules units to tiles; map is 21 tiles wide
const TEAM=[PAL.team.neutral,PAL.team.blue,PAL.team.red],GOLD=0xffc83d;
const CAST={bramble:'bear',sow:'owl',mower:'frog',magpie:'mouse',drover:'elephant',thistle:'penguin',shade:'cat',foxglove:'fox',bamboo:'panda'};

const renderer=new THREE.WebGLRenderer({canvas:$('gl'),antialias:true,alpha:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color(PAL.sky);
const cam=new THREE.PerspectiveCamera(30,1,.1,300),PITCH=58*Math.PI/180,focus=new THREE.Vector3();
let camDist=20,VW=1,VH=1,shake=0,SPAN=21,TALL=false;
function resize(){VW=innerWidth;VH=innerHeight;cam.aspect=VW/VH;cam.updateProjectionMatrix();renderer.setSize(VW,VH,false);LOOK.setOutlineViewport(VW,VH);
 TALL=cam.aspect<.8;SPAN=TALL?13:21;                          // a phone held upright looks at 13 tiles of width and follows the hero sideways
 const hf=2*Math.atan(Math.tan(cam.fov*Math.PI/360)*cam.aspect);camDist=SPAN/2/Math.tan(hf/2)}
addEventListener('resize',resize);resize();LOOK.addLights(scene);

const toon=o=>LOOK.toonMaterial(o);
function outlined(geo,mat){const g=new THREE.Group();g.add(new THREE.Mesh(geo,mat));LOOK.addOutline(g);return g}
const flat=(geo,color,op)=>{const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color,transparent:op!==undefined,opacity:op===undefined?1:op,depthWrite:false}));m.rotation.x=-Math.PI/2;return m};
function pool(make){const a=[];return{get(i){if(!a[i]){a[i]=make();scene.add(a[i])}a[i].visible=true;return a[i]},end(n){for(let i=n;i<a.length;i++)a[i].visible=false}}}
function domPool(cls){const a=[];return{get(i){if(!a[i]){a[i]=document.createElement('div');a[i].className='lab '+cls;$('labels').appendChild(a[i])}a[i].style.display='';return a[i]},end(n){for(let i=n;i<a.length;i++)a[i].style.display='none'}}}

// ---- static world: lanes, the wall strips between them, bushes and seed farms in the openings, the two bases
const world=new THREE.Group();scene.add(world);let built=false,farmViews=[],baseViews=[];
function buildWorld(){if(built)return;built=true;const L=SB.H*K;
 world.add(W.ground(21,L+8));
 for(let i=0;i<SB.NL;i++){const x=wx(SB.laneX(i));world.add(W.link({x,z:wz(SB.Y1+20)},{x,z:wz(SB.Y0-20)},'path'));
  for(const t of[1,2]){const p=SB.spawnPt(t,i),pad=flat(new THREE.PlaneGeometry(SB.LW*K*.8,1.1),TEAM[t],.22);pad.position.set(wx(p.x),.012,wz(p.y));world.add(pad)}}
 SB.WALLS.forEach((w,wi)=>{const nx=Math.max(1,Math.round((w.x1-w.x0)*K)),nz=Math.max(1,Math.round((w.y1-w.y0)*K)),sx=(w.x1-w.x0)*K/nx,sz=(w.y1-w.y0)*K/nz;
  for(let a=0;a<nx;a++)for(let b=0;b<nz;b++){const g=W.wall(w.kind,wi*31+a*7+b+1,0);g.scale.set(sx,1,sz);g.position.set(wx(w.x0)+(a+.5)*sx,0,wz(w.y0)+(b+.5)*sz);world.add(g)}});
 SB.BUSHES.forEach((b,i)=>{for(const[ox,oz,sc]of[[0,0,1],[-.45,.3,.7],[.45,.25,.72],[0,-.45,.7]]){const g=W.bush(i*4+ox*7+oz*3+1);g.scale.setScalar(b.r*K*1.25*sc);g.position.set(wx(b.x)+ox*b.r*K,0,wz(b.y)+oz*b.r*K);world.add(g)}});
 for(const f of SB.FARMS){const sc=.6,pod=W.seedPod();pod.scale.setScalar(sc);pod.position.set(wx(f.x),0,wz(f.y));world.add(pod);const pad=flat(new THREE.CircleGeometry(sc*1.9,28),GOLD,.3);pad.position.set(wx(f.x),.022,wz(f.y));world.add(pad);
  const lab=document.createElement('div');lab.className='lab farm';lab.innerHTML='<u></u>Seeds';$('labels').appendChild(lab);farmViews.push({x:f.x,y:f.y,h:sc*2.6,lab})}
 for(const t of[1,2]){const p=SB.BASEPOS[t],g=W.base(TEAM[t]);g.position.set(wx(p.x),0,wz(p.y));if(t===2)g.rotation.y=Math.PI;world.add(g);
  const gun=flat(new THREE.RingGeometry(SB.CFG.baseGun.range*K-.06,SB.CFG.baseGun.range*K,72),TEAM[t],.35);gun.position.set(wx(p.x),.014,wz(p.y));world.add(gun);   // how far the base gun reaches
  const lab=document.createElement('div');lab.className='lab base';$('labels').appendChild(lab);baseViews.push({t,p,lab,txt:''})}}

// ---- heroes
let heroViews=[];
async function makeHero(h){const mine=h===SB.G.me,H=await LOOK.loadHero(CAST[h.def.id]||'cat',{team:mine?PAL.team.you:TEAM[h.team]});scene.add(H.root);
 const lab=document.createElement('div');lab.className='lab hero';lab.innerHTML='<div class="pips"></div><div class="hp'+(h.team===SB.G.me.team?'':' foe')+'"><i></i></div><div class="nm"></div>';lab.lastChild.textContent=h.def.name;$('labels').appendChild(lab);
 return{h,grp:H.root,body:H.body,s0:H.body.scale.x,rig:rigOf(H),by0:H.body.position.y,bz0:H.body.position.z,rx0:H.body.rotation.x,wk:0,ph:Math.random()*6,at:0,su:0,dd:0,cd:0,sd:Math.random()*9,lx:h.x,ly:h.y,face:h.team===1?Math.PI:0,lab,w:H.size.width,ht:H.size.height,fire:0,seeds:-1,hp:h.hp,pop:0}}
// hero motion: poses set in code on the shared skeleton (the shipped clips hold a T-pose)
const POSE_B=['Hips','Spine','Chest','Head','UpperArm_L','UpperArm_R','Forearm_L','Forearm_R','Thigh_L','Thigh_R','Shin_L','Shin_R','Tail'];
const qa=new THREE.Quaternion(),eu=new THREE.Euler();
function rigOf(H){const rig={},rq=new THREE.Quaternion();H.root.updateMatrixWorld(true);H.root.getWorldQuaternion(rq).invert();
 H.root.traverse(o=>{if(o.isBone&&POSE_B.includes(o.name)&&!rig[o.name]){const w=new THREE.Quaternion();o.getWorldQuaternion(w).premultiply(rq);rig[o.name]={b:o,q0:o.quaternion.clone(),w,wi:w.clone().invert()}}});
 const a=new THREE.Vector3(),b=new THREE.Vector3();for(const sd of['L','R']){const u=rig['UpperArm_'+sd],f=rig['Forearm_'+sd];let dr=0;if(u&&f){u.b.getWorldPosition(a);f.b.getWorldPosition(b);dr=Math.atan2(a.y-b.y,Math.abs(b.x-a.x))}rig['dn'+sd]=Math.max(.25,1.12-Math.max(0,dr-.17))}return rig}
function setBone(r,n,x,y,z){const o=r[n];if(!o)return;qa.setFromEuler(eu.set(x,y,z,'XYZ'));o.b.quaternion.copy(o.q0).multiply(o.wi).multiply(qa).multiply(o.w)}
function pose(v,dt,sp,t){const h=v.h,r=v.rig,k=Math.min(1,dt*10);
 if(v.fire<=0&&h.fireT>0)v.at=1;if((h.supT||0)>v.cd+.2)v.su=1;v.cd=h.supT||0;
 v.wk+=((sp>12&&sp<900&&!h.dead?1:0)-v.wk)*k;v.ph+=dt*Math.min(16,Math.max(7,sp*.06));v.at=Math.max(0,v.at-dt/.34);v.su=Math.max(0,v.su-dt/.7);v.dd+=((h.dead?1:0)-v.dd)*Math.min(1,dt*7);
 const s=Math.sin(v.ph),c=Math.cos(v.ph),w=v.wk,br=Math.sin((t+v.sd)*2.2)*.05*(1-w),a=v.at>0?Math.sin(Math.min(1,(1-v.at)*1.7)*Math.PI):0,u=v.su>0?Math.sin(Math.min(1,(1-v.su)*1.5)*Math.PI):0,hit=v.pop/.14,D=v.dd;
 setBone(r,'Hips',.05*w-hit*.1,s*.14*w+a*.25,0);
 setBone(r,'Spine',.18*w+br+a*.22-u*.3-hit*.3,-s*.1*w+a*.35,0);
 setBone(r,'Chest',br,-s*.14*w+a*.3,s*.04*w);
 setBone(r,'Head',-.12*w-br*2+u*.35+hit*.25,-a*.5,0);
 setBone(r,'UpperArm_L',s*.75*w+a*.5-u*.3,0,-(r.dnL-D*.7)+br+u*2.3);
 setBone(r,'UpperArm_R',(-s*.75*w)*(1-a)-a*1.55-u*.3,0,(r.dnR-D*.7)-br-u*2.3);
 setBone(r,'Forearm_L',0,-(.3+.45*w+a*.5)*(1-u),0);
 setBone(r,'Forearm_R',0,(.3+.45*w)*(1-a)*(1-u),0);
 setBone(r,'Thigh_L',-s*.8*w-a*.25,0,0);setBone(r,'Thigh_R',s*.8*w+a*.3,0,0);
 setBone(r,'Shin_L',Math.max(0,c)*1.1*w,0,0);setBone(r,'Shin_R',Math.max(0,-c)*1.1*w+a*.3,0,0);
 setBone(r,'Tail',-s*.1*w,Math.sin((t+v.sd)*3)*.3*(1-w)+s*.3*w,0);
 v.body.position.y=v.by0+(Math.abs(c)*.07*w+u*.45)*v.ht*(1-D)+D*.12*v.ht;v.body.position.z=v.bz0+a*.28*v.ht;v.body.rotation.x=v.rx0-D*1.45+w*.06}
function tickHero(v,dt){const h=v.h,me=SB.G.me,vis=!(h.invisT>0&&h.team!==me.team);v.grp.visible=vis;
 const dx=h.x-v.lx,dy=h.y-v.ly,sp=Math.hypot(dx,dy)/Math.max(dt,.001);v.lx=h.x;v.ly=h.y;
 v.grp.position.set(wx(h.x),0,wz(h.y));
 let want=v.face;if(h.fireT>0||h.supT>0)want=Math.atan2(Math.cos(h.aimA),Math.sin(h.aimA));else if(sp>12&&sp<900)want=Math.atan2(dx,dy);
 let d=want-v.face;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;v.face+=d*Math.min(1,dt*14);v.grp.rotation.y=v.face;
 pose(v,dt,sp,SB.G.t);
 v.fire=h.fireT||0;
 if(h.hp<v.hp-1&&!h.dead){v.pop=.14}v.hp=h.hp;v.pop=Math.max(0,v.pop-dt);v.body.scale.setScalar(v.s0*(1+v.pop*1.6));
 const top=project(wx(h.x),v.ht+.35,wz(h.y));v.lab.style.display=!h.dead&&vis?'':'none';v.lab.style.opacity=h.invisT>0?.5:1;v.lab.style.transform=`translate(${top.x}px,${top.y}px) translate(-50%,-100%)`;
 v.lab.children[1].firstChild.style.width=Math.max(0,h.hp/h.maxhp*100)+'%';
 if(v.seeds!==h.seeds){v.seeds=h.seeds;v.lab.firstChild.innerHTML='<u></u>'.repeat(Math.min(10,h.seeds))}}
const pv=new THREE.Vector3();function project(x,y,z){pv.set(x,y,z).project(cam);return{x:(pv.x*.5+.5)*VW,y:(-pv.y*.5+.5)*VH}}

// ---- units: one instanced body + outline per kind, body and team (the circles version's models), one instanced team ring
const UMAX=200,USET={};let instOut=null;
function instOutline(){if(instOut)return instOut;const src=LOOK.outlineMaterial(1.6),m=src.clone();m.uniforms.uAspect=src.uniforms.uAspect;m.uniforms.uScale=src.uniforms.uScale;
 m.vertexShader=src.vertexShader.replace('modelViewMatrix * vec4(transformed, 1.0)','modelViewMatrix * instanceMatrix * vec4(transformed, 1.0)').replace('normalMatrix * objectNormal','normalMatrix * mat3(instanceMatrix) * objectNormal');return instOut=m}
function unitSet(kind,tier,team){const key=kind+'_'+tier+'_'+team;if(USET[key])return USET[key];let body,hull;W.unit(W.UNIT_KINDS[kind],tier,TEAM[team]).children[0].traverse(o=>{if(o.isMesh){if(o.userData.isHull)hull=o;else body=o}});
 const b=new THREE.InstancedMesh(body.geometry,body.material,UMAX),o=new THREE.InstancedMesh(hull.geometry,instOutline(),UMAX);for(const m of[b,o]){m.frustumCulled=false;m.count=0;scene.add(m)}return USET[key]={b,o,n:0,w:W.UNIT_WIDTH[tier]}}
const ringGeo=new THREE.RingGeometry(.42,.6,14);ringGeo.rotateX(-Math.PI/2);
const uRing=new THREE.InstancedMesh(ringGeo,new THREE.MeshBasicMaterial({color:0xffffff,depthWrite:false}),UMAX*2);uRing.frustumCulled=false;uRing.count=0;scene.add(uRing);
const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),P=new THREE.Vector3(),S=new THREE.Vector3(),C=new THREE.Color(),E3=new THREE.Euler();
function drawUnits(t){for(const k in USET)USET[k].n=0;let nr=0;for(const u of SB.G.units){if(u.dead)continue;const ti=Math.max(0,Math.min(4,u.tier-1)),s=unitSet(u.kind,ti,u.team);if(s.n>=UMAX)continue;
  if(u._x===undefined){u._x=u.x;u._y=u.y;u._f=u.team===1?Math.PI:0;u._s=Math.random()*6}const dx=u.x-u._x,dy=u.y-u._y;u._x=u.x;u._y=u.y;
  if(dx*dx+dy*dy>.02){let d=Math.atan2(dx,dy)-u._f;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;u._f+=d*.25}
  const w=s.w*1.5,ph=t+u._s,hit=u.atkCd>.78?(u.atkCd-.78)/.22:0;let y=0,sx=1,sy=1,rx=0,rz=0,fw=hit*w*.3;
  if(ti===0){const k=Math.abs(Math.sin(ph*(u.kind===2?7:4.5)));y=k*w*.16;sy=1+(k-.5)*.14}                 // grunt: hop
  else if(ti===1){rz=Math.sin(ph*3.2)*.16;y=Math.abs(Math.sin(ph*3.2))*w*.05;rx=.08}                      // brute: heavy waddle
  else if(ti===2){y=Math.abs(Math.sin(ph*3.6))*w*.07;sy=1-hit*.3;sx=1+hit*.2;fw=-hit*w*.2}               // splasher: recoil
  else if(ti===3){y=1.15+Math.sin(ph*2.4)*.12;rz=Math.sin(ph*9)*.22;rx=.3;sx=1+Math.sin(ph*18)*.1}        // flyer: flutter
  else{const k=Math.sin(ph*1.9);y=Math.abs(k)*w*.05;rz=k*.07;sy=1+hit*.1}                                 // colossus: stomp
  sy*=1+hit*.12;P.set(wx(u.x)+Math.sin(u._f)*fw,y,wz(u.y)+Math.cos(u._f)*fw);Q.setFromEuler(E3.set(rx,u._f,rz,'YXZ'));S.set(w*sx/Math.sqrt(sy),w*sy,w*sx/Math.sqrt(sy));M.compose(P,Q,S);s.b.setMatrixAt(s.n,M);s.o.setMatrixAt(s.n,M);s.n++;
  P.set(wx(u.x),.02,wz(u.y));Q.identity();S.setScalar(ti===3?w*.7:w);M.compose(P,Q,S);uRing.setMatrixAt(nr,M);uRing.setColorAt(nr,C.set(TEAM[u.team]));nr++}
 for(const k in USET){const s=USET[k];s.b.count=s.o.count=s.n;s.b.visible=s.o.visible=s.n>0;s.b.instanceMatrix.needsUpdate=s.o.instanceMatrix.needsUpdate=true}
 uRing.count=nr;uRing.instanceMatrix.needsUpdate=true;if(uRing.instanceColor)uRing.instanceColor.needsUpdate=true}

// ---- transient things, redrawn from state every frame
const seeds=pool(()=>W.seedPickup()),projs=pool(()=>outlined(new THREE.SphereGeometry(1,10,8),toon({color:0xffffff})));
const rings=pool(()=>flat(new THREE.RingGeometry(.93,1,48),0xffffff,.9)),discs=pool(()=>flat(new THREE.CircleGeometry(1,40),0xffffff,.3));
const strips=pool(()=>flat(new THREE.PlaneGeometry(1,1),0xffffff,.8)),balls=pool(()=>outlined(new THREE.SphereGeometry(.22,10,8),toon({color:0xffffff})));
const chevs=pool(()=>flat(new THREE.CircleGeometry(1,3,Math.PI/2),0xffffff,.8));
const coneGeos={};function coneGeo(half){const k=half.toFixed(2);return coneGeos[k]||(coneGeos[k]=new THREE.CircleGeometry(1,18,-half,half*2))}
const cones=pool(()=>flat(coneGeo(.8),0xffffff,.5));
const texts=domPool('dmg'),zlabs=domPool('zone');
function strip(m,x1,y1,x2,y2,w,col,op){const dx=wx(x2)-wx(x1),dz=wz(y2)-wz(y1);m.scale.set(Math.hypot(dx,dz),w,1);m.position.set((wx(x1)+wx(x2))/2,.04,(wz(y1)+wz(y2))/2);m.rotation.z=-Math.atan2(dz,dx);m.material.color.set(col);m.material.opacity=op}
let nR=0,nD=0,nS=0,nC=0,nV=0;
// particles: small unlit chunks thrown by hits, deaths, shots and spells
const PMAX=600,pMesh=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:0xffffff}),PMAX);pMesh.frustumCulled=false;pMesh.count=0;scene.add(pMesh);
const parts=[],seenFx=new WeakSet();
function burst(x,y,col,n,spd,size,up){for(let i=0;i<n&&parts.length<PMAX;i++){const a=Math.random()*6.283,v=spd*(.4+Math.random()*.6);parts.push({x:wx(x),y:.25+Math.random()*.5,z:wz(y),vx:Math.cos(a)*v,vy:up*(.5+Math.random()),vz:Math.sin(a)*v,life:.3+Math.random()*.35,size,col})}}
function drawParts(dt){let n=0;for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.life-=dt;if(p.life<=0){parts[i]=parts[parts.length-1];parts.pop();continue}p.vy-=9*dt;p.x+=p.vx*dt;p.y=Math.max(.05,p.y+p.vy*dt);p.z+=p.vz*dt}
 Q.identity();for(const p of parts){P.set(p.x,p.y,p.z);S.setScalar(p.size*Math.min(1,p.life/.2));M.compose(P,Q,S);pMesh.setMatrixAt(n,M);pMesh.setColorAt(n,C.set(p.col));n++}
 pMesh.count=n;pMesh.instanceMatrix.needsUpdate=true;if(pMesh.instanceColor)pMesh.instanceColor.needsUpdate=true}
function ringAt(x,y,r,col,op,yy){const m=rings.get(nR++);m.position.set(wx(x),yy||.05,wz(y));m.scale.setScalar(r*K);m.material.color.set(col);m.material.opacity=op}
function discAt(x,y,r,col,op){const m=discs.get(nD++);m.position.set(wx(x),.035,wz(y));m.scale.setScalar(r*K);m.material.color.set(col);m.material.opacity=op}
function coneAt(x,y,a,half,r,col,op){const m=cones.get(nC++);m.geometry=coneGeo(half);m.position.set(wx(x),.045,wz(y));m.scale.setScalar(r*K);m.rotation.z=-a;m.material.color.set(col);m.material.opacity=op}
function chevAt(x,y,s,col,op){const m=chevs.get(nV++);m.position.set(wx(x),.03,wz(y));m.scale.set(s*1.5,s,1);m.material.color.set(col);m.material.opacity=op}
function drawTransient(){const G=SB.G,me=G.me;nR=nD=nS=nC=nV=0;let i=0;
 for(const s of G.seeds){const m=seeds.get(i++);m.position.set(wx(s.x),0,wz(s.y));W.tickAll(m,G.t,0)}seeds.end(i);
 i=0;for(const p of G.projs){const m=projs.get(i++);m.position.set(wx(p.x),.7,wz(p.y));m.scale.setScalar(p.r*K*1.3);m.children[0].material.color.set(p.col);if(Math.random()<.7)burst(p.x,p.y,p.col,1,.3,.05,.3)}projs.end(i);
 i=0;for(const l of G.lobs){const k=1-l.t/l.max;if(l.t<.04&&Math.hypot(l.x-me.x,l.y-me.y)<l.r+40)shake=Math.min(.12,shake+.05);discAt(l.x,l.y,l.r,TEAM[l.team],.22);ringAt(l.x,l.y,l.r,TEAM[l.team],.9);ringAt(l.x,l.y,l.r*k,0xffffff,.8,.06);
  const m=balls.get(i++);m.position.set(wx(l.sx+(l.x-l.sx)*k),.6+Math.sin(k*3.14)*3.2,wz(l.sy+(l.y-l.sy)*k));m.scale.setScalar(l.big?1.8:1)}balls.end(i);
 let nz=0;for(const z of G.zones){const arming=z.arm>0,pu=.5+.5*Math.sin(G.t*6);
  discAt(z.x,z.y,z.r,z.col,arming?.12:z.dome?.18:.3);ringAt(z.x,z.y,z.r,z.col,arming?.5:.9);
  if(arming)ringAt(z.x,z.y,z.r*(1+z.arm*.5),0xffffff,.7,.06);else{if(z.dome)ringAt(z.x,z.y,z.r*(.96+pu*.03),0xffffff,.5,.07);if(z.dur<1.5)ringAt(z.x,z.y,z.r*Math.max(0,z.dur/1.5),0xffffff,.5,.06);
   if(Math.random()<.5){const a=Math.random()*6.283,d=Math.sqrt(Math.random())*z.r;burst(z.x+Math.cos(a)*d,z.y+Math.sin(a)*d,z.col,1,.3,.07,3.5)}}
  if(z.label){const el=zlabs.get(nz++),p=project(wx(z.x),.1,wz(z.y));if(el.textContent!==z.label)el.textContent=z.label;el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`}}
 zlabs.end(nz);
 let nt=0;for(const f of G.fx){const k=Math.max(0,Math.min(1,f.life/(f.max||.8)));
  if(!seenFx.has(f)){seenFx.add(f);if(f.k==='r'){const big=f.r>100;burst(f.x,f.y,f.col,big?22:f.r>30?8:4,big?6:2.6,big?.11:.07,big?4:2.5)}
   else if(f.k==='c')for(let j=0;j<7;j++){const a=f.a+(Math.random()*2-1)*f.half,d=f.r*(.5+Math.random()*.5);burst(f.x+Math.cos(a)*d,f.y+Math.sin(a)*d,f.col,1,1.5,.08,2)}
   else if(f.k==='t'&&f.t[0]==='+')burst(f.x,f.y,f.col,5,.8,.06,4)}
  if(f.k==='r')ringAt(f.x,f.y,f.r*(1.15-k*.4),f.col,k);
  else if(f.k==='c')coneAt(f.x,f.y,f.a,f.half,f.r,f.col,k*.6);
  else if(f.k==='l')strip(strips.get(nS++),f.x,f.y,f.x2,f.y2,.08,f.col,k);
  else if(f.k==='t'){const el=texts.get(nt++),p=project(wx(f.x),1.2+(1-f.life/.8)*1.1,wz(f.y));if(el.textContent!==f.t)el.textContent=f.t;el.style.color=f.col;el.style.opacity=k;el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`}}
 texts.end(nt);
 // the lane my units are sent down: a bright pad at my end and arrows running up it
 {const sp=SB.spawnPt(me.team,me.lane),dir=me.team===1?-1:1,pu=.5+.5*Math.sin(G.t*5);
  const m=strips.get(nS++);m.scale.set(SB.LW*K*.8,1.1,1);m.position.set(wx(sp.x),.02,wz(sp.y));m.rotation.z=0;m.material.color.set(PAL.team.you);m.material.opacity=.45+pu*.3;
  for(let j=0;j<7;j++){const f=(j+(G.t*1.2)%1)/7;chevAt(sp.x,sp.y+dir*(40+f*520),.5,PAL.team.you,.85*(1-f))}}
 // aim preview: the real reach and the real area
 if(aim&&!me.dead){const d=aim.sup?me.def.sup:me.def.atk,a=aim.a,r=d.range||d.r||200,col=aim.sup?GOLD:0xffffff;
  if(d.shape==='cone')coneAt(me.x,me.y,a,d.half||.6,r,col,.28);
  else if(d.shape==='line')strip(strips.get(nS++),me.x,me.y,me.x+Math.cos(a)*r,me.y+Math.sin(a)*r,(d.w||10)*2*K+.2,col,.3);
  else if(d.shape==='circle'){const dd=Math.min(r,aim.d);discAt(me.x+Math.cos(a)*dd,me.y+Math.sin(a)*dd,d.r||60,col,.3);ringAt(me.x+Math.cos(a)*dd,me.y+Math.sin(a)*dd,d.r||60,col,.9,.06);ringAt(me.x,me.y,r,col,.25)}
  else if(d.shape==='self')discAt(me.x,me.y,d.r||200,col,.25);
  if(aim.sup&&me.def.sup.name==='Heist'){const ex=me.x+Math.cos(a)*r,ey=me.y+Math.sin(a)*r;ringAt(ex,ey,220,col,.6,.06)}}
 rings.end(nR);discs.end(nD);strips.end(nS);cones.end(nC);chevs.end(nV)}

// ---- sound (the circles version's cue set)
const SFX={};let soundOn=false;
[['shoot','attack_shot.wav',0.31],['punch','attack_punch.wav',0.66],['throw','attack_throw.wav',0.64],['slash','attack_slash.wav',0.34],['hit','base_hit.wav',0.39],['seed','seed_pickup.wav',0.29],['sspawn','seed_spawn.wav',0.3],['boom','splasher_land.wav',0.53],['down','hero_down.wav',0.29],['hurt','hero_hurt.wav',0.41],['spell','super_cast.wav',0.36],['plant','plant.wav',0.8],['tier','plot_tier_up.wav',0.18],['send','send_burst.wav',0.23],['awake','base_awake.wav',0.27],['bshot','base_shot.wav',0.4],['grunt','grunt_hit.wav',0.2],['brute','brute_hit.wav',0.45],['splash','splasher_fire.wav',0.36],['flyer','flyer_dive.wav',0.2],['stomp','colossus_stomp.wav',0.8],['split','colossus_split.wav',0.54],['die','creep_die.wav',0.16],['ready','plot_open.wav',0.4],
 ['match_start','match_start.wav',0.6],['win','win.wav',0.7],['lose','lose.wav',0.7],['countdown_tick','countdown_tick.wav',0.354],['button_tap','button_tap.wav',0.369]]
.forEach(([k,f,v])=>{SFX[k]={f,v,pool:null,i:0,last:0}});
function playS(k){const s=SFX[k];if(!s||!soundOn)return;const n=performance.now();if(n-s.last<70)return;s.last=n;if(!s.pool)s.pool=[0,1,2].map(()=>{const a=new Audio(GP+'sfx/'+s.f);a.volume=s.v;return a});const a=s.pool[s.i++%3];try{a.currentTime=0;a.play().catch(()=>{})}catch(e){}}
window.SBL_SND=(k,x,y)=>{if(y!==undefined&&Math.abs(wz(y)-focus.z)>13)return;playS(k)};

// ---- input
let aim=null;const keys={},mouse={x:0,y:0,down:false};
const ray=new THREE.Raycaster(),gp=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
function groundAt(sx,sy){ray.setFromCamera(new THREE.Vector2(sx/VW*2-1,-(sy/VH)*2+1),cam);ray.ray.intersectPlane(gp,hit);return{x:(hit.x+10.5)/K,y:hit.z/K+SB.H/2}}
function autoAim(me,range){let best=null,bd=range*1.15;for(const e of[...SB.G.heroes,...SB.G.units]){if(e.dead||e.team===me.team||e.invisT>0)continue;const d=Math.hypot(e.x-me.x,e.y-me.y)-(e.isHero?40:0);if(d<bd){bd=d;best=e}}return best?{a:Math.atan2(best.y-me.y,best.x-me.x),d:Math.hypot(best.x-me.x,best.y-me.y)}:{a:me.aimA,d:range*.7}}
function fire(a,d){I.fireA=a;I.fireD=d;I.fire=true}
function castSup(a,d){const me=SB.G.me,sp=me.def.sup,r=sp.range||0,q=sp.shape==='circle'?Math.min(r,d):Math.max(60,r);SB.castSuper(me,me.x+Math.cos(a)*q,me.y+Math.sin(a)*q)}
function doSummon(tier){const G=SB.G;if(!G||G.over)return;const el=$('bodies').children[tier-1];if(!SB.summon(G.me,tier)){el.animate([{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'none'}],{duration:160});return}playS('button_tap')}
function nextKind(){const G=SB.G;if(!G)return;G.sel=(G.sel+1)%3;playS('button_tap');drawHud()}
function pickLane(l){const G=SB.G;if(!G||G.over)return;SB.setLane(G.me,l);drawHud()}
const LANEKEYS='zxcvb';
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k===' ')e.preventDefault();if(e.repeat||!SB.G||!started)return;keys[k]=true;
 if(k>='1'&&k<='5')doSummon(+k);if(k==='q')nextKind();if(k==='e')pickLane(SB.G.me.lane+1);const li=LANEKEYS.indexOf(k);if(li>=0&&li<SB.NL)pickLane(li);
 if(k===' ')aim={sup:true,a:SB.G.me.aimA,d:300,mouse:true}});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k]=false;if(k===' '&&aim&&aim.sup){castSup(aim.a,aim.d);aim=null}});
const gl=$('gl');
gl.addEventListener('pointerdown',e=>{soundOn=true;if(!SB.G||e.pointerType!=='mouse')return;mouse.x=e.clientX;mouse.y=e.clientY;if(e.button===0){mouse.down=true}else if(e.button===2)aim={sup:true,a:0,d:300,mouse:true}});
addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){mouse.x=e.clientX;mouse.y=e.clientY;mouse.seen=true}});
addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')return;if(e.button===0)mouse.down=false;else if(e.button===2&&aim&&aim.sup){castSup(aim.a,aim.d);aim=null}});
gl.addEventListener('contextmenu',e=>e.preventDefault());
// touch: the left half of the screen is a floating move stick; attack and super are drag-to-aim buttons
const stick={id:null,ox:0,oy:0,x:0,y:0},sl=$('stickL');
gl.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||!SB.G||stick.id!==null||e.clientX>VW*.5)return;stick.id=e.pointerId;stick.ox=e.clientX;stick.oy=e.clientY;stick.x=stick.y=0;sl.style.left=(e.clientX-59)+'px';sl.style.bottom=(VH-e.clientY-59)+'px'});
addEventListener('pointermove',e=>{if(e.pointerId!==stick.id)return;let dx=e.clientX-stick.ox,dy=e.clientY-stick.oy;const m=Math.hypot(dx,dy),R=46;if(m>R){dx*=R/m;dy*=R/m}stick.x=dx/R;stick.y=dy/R;sl.firstChild.style.transform=`translate(${dx}px,${dy}px)`});
const endStick=e=>{if(e.pointerId!==stick.id)return;stick.id=null;stick.x=stick.y=0;sl.firstChild.style.transform='';sl.style.left='';sl.style.bottom=''};addEventListener('pointerup',endStick);addEventListener('pointercancel',endStick);
function dragButton(el,sup){let id=null,ox=0,oy=0;
 el.addEventListener('pointerdown',e=>{soundOn=true;if(!SB.G||id!==null)return;e.preventDefault();id=e.pointerId;el.setPointerCapture(id);ox=e.clientX;oy=e.clientY;el.classList.add('on');const me=SB.G.me,t=autoAim(me,(sup?me.def.sup:me.def.atk).range||200);aim={sup,a:t.a,d:t.d,auto:true}});
 el.addEventListener('pointermove',e=>{if(e.pointerId!==id||!aim)return;const dx=e.clientX-ox,dy=e.clientY-oy,m=Math.hypot(dx,dy);el.firstElementChild.style.transform=`translate(${Math.max(-30,Math.min(30,dx))}px,${Math.max(-30,Math.min(30,dy))}px)`;
  if(m>12){aim.a=Math.atan2(dy,dx);aim.auto=false;const d=sup?SB.G.me.def.sup:SB.G.me.def.atk;aim.d=(d.range||200)*Math.min(1,m/70)}else if(aim.auto){const me=SB.G.me,t=autoAim(me,(sup?me.def.sup:me.def.atk).range||200);aim.a=t.a;aim.d=t.d}});
 const up=e=>{if(e.pointerId!==id)return;id=null;el.classList.remove('on');el.firstElementChild.style.transform='';if(!aim)return;const me=SB.G.me,d=sup?me.def.sup:me.def.atk,r=d.range||200,t=aim.auto?autoAim(me,r):aim;
  if(e.type==='pointerup'){if(sup)castSup(t.a,t.d);else fire(t.a,d.shape==='circle'?t.d:r)}aim=null};
 el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)}
dragButton($('btnAtk'),false);dragButton($('btnSup'),true);
$('btnSeed').addEventListener('pointerdown',e=>{e.preventDefault();soundOn=true;nextKind()});
$('lanes').addEventListener('pointerdown',e=>{e.preventDefault();soundOn=true;const r=e.currentTarget.getBoundingClientRect();pickLane(SB.laneOf((e.clientX-r.left)/r.width*SB.W))});
function readInput(){const me=SB.G.me;let mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),my=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
 if(stick.id!==null){mx=stick.x;my=stick.y}const m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m}if(m<.18){mx=my=0}I.mx=mx;I.my=my;
 I.aimA=null;if(aim){if(aim.mouse){const g=groundAt(mouse.x,mouse.y);aim.a=Math.atan2(g.y-me.y,g.x-me.x);aim.d=Math.hypot(g.x-me.x,g.y-me.y)}I.aimA=aim.a}
 else if(mouse.seen){const g=groundAt(mouse.x,mouse.y);I.aimA=Math.atan2(g.y-me.y,g.x-me.x);if(mouse.down)fire(I.aimA,Math.hypot(g.x-me.x,g.y-me.y))}
 else if(mx||my)I.aimA=Math.atan2(my,mx)}

// ---- HUD: seeds carried, the lane picker (a small live map), the seed kind, the five bodies
const fmt=t=>{t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};let hudT=0,lastTick=99,hudKind=-1;
const unitPics={};
function unitPic(kind,ti){const key=kind+'_'+ti;if(unitPics[key])return unitPics[key];const sc=new THREE.Scene();LOOK.addLights(sc);const g=W.unit(W.UNIT_KINDS[kind],ti,PAL.team.blue);g.children[0].userData.tick=null;const w=W.UNIT_WIDTH[ti];
 const body=g.children[0];sc.add(body);body.rotation.y=.5;const bx=new THREE.Box3().setFromObject(body),h=Math.max(.3,bx.max.y-bx.min.y),cy=(bx.max.y+bx.min.y)/2,c=new THREE.PerspectiveCamera(26,1,.05,50),d=Math.max(h,w*1.2)*2.6;
 c.position.set(0,cy+h*.35,d);c.lookAt(0,cy,0);const bg=scene.background;renderer.setSize(112,112,false);LOOK.setOutlineViewport(112,112);renderer.setClearColor(0,0);renderer.render(sc,c);const url=gl.toDataURL('image/png');resize();return unitPics[key]=url}
function buildDock(){const el=$('bodies');el.innerHTML='';for(let t=1;t<=5;t++){const b=document.createElement('div');b.className='sq';b.innerHTML='<img alt=""><kbd>'+t+'</kbd><em>'+SB.costOf(t)+'</em><span></span>';b.lastChild.textContent=SB.BODIES[t];b.addEventListener('pointerdown',e=>{e.preventDefault();soundOn=true;doSummon(t)});el.appendChild(b)}
 const k=document.createElement('kbd');k.textContent='Q';$('btnSeed').appendChild(k)}
const lc=$('lanes'),lx=lc.getContext('2d');
function drawLanes(){const G=SB.G,me=G.me,w=lc.width,h=lc.height,sx=w/SB.W,sy=h/SB.H;lx.clearRect(0,0,w,h);
 for(let i=0;i<SB.NL;i++){const x0=SB.laneL(i)*sx,x1=SB.laneR(i)*sx,on=i===me.lane;lx.fillStyle=on?'#4c6b55':'#2f4237';lx.fillRect(x0,0,x1-x0,h);
  if(on){lx.strokeStyle='#ffc83d';lx.lineWidth=5;lx.strokeRect(x0+2.5,2.5,x1-x0-5,h-5);lx.fillStyle='#ffc83d';lx.beginPath();lx.moveTo((x0+x1)/2,h-30);lx.lineTo((x0+x1)/2+12,h-12);lx.lineTo((x0+x1)/2-12,h-12);lx.fill()}}
 lx.fillStyle='#16202a';for(const wl of SB.WALLS)lx.fillRect(wl.x0*sx,wl.y0*sy,(wl.x1-wl.x0)*sx,(wl.y1-wl.y0)*sy);
 for(const u of G.units){if(u.dead)continue;lx.fillStyle=u.team===1?'#5fb0ff':'#ff6b6b';const r=2.5+u.tier*.9;lx.fillRect(u.x*sx-r,u.y*sy-r,r*2,r*2)}
 for(const b of[G.base[1],G.base[2]]){lx.fillStyle=b.team===1?'#2a8cff':'#ff4d4d';lx.fillRect(b.x*sx-16,b.y*sy-5,32,10)}
 for(const hh of G.heroes){if(hh.dead||(hh.invisT>0&&hh.team!==me.team))continue;lx.beginPath();lx.arc(hh.x*sx,hh.y*sy,hh===me?7:5.5,0,6.283);lx.fillStyle=hh===me?'#fff':hh.team===1?'#2a8cff':'#ff4d4d';lx.fill();lx.lineWidth=2;lx.strokeStyle='#1a1320';lx.stroke()}}
function drawHud(){const G=SB.G;if(!G)return;const me=G.me;{const c=Math.ceil(G.time);if(c<=10&&c>0&&c<lastTick){lastTick=c;playS('countdown_tick')}}
 $('clock').textContent=fmt(G.time);$('clock').classList.toggle('late',!!G.lateOn);$('sb').textContent=Math.max(0,Math.ceil(G.base[1].hp));$('sr').textContent=Math.max(0,Math.ceil(G.base[2].hp));
 $('seeds').innerHTML=Array.from({length:SB.CFG.carry},(_,i)=>'<u class="'+(i<me.seeds?'on':'')+'"></u>').join('');
 $('ammo').innerHTML=[0,1,2].map(i=>'<u class="'+(i<Math.floor(me.ammo)?'on':'')+'"></u>').join('');
 $('supArc').style.strokeDashoffset=100.5*(1-me.sup);$('btnSup').classList.toggle('cd',me.sup<1);$('supName').textContent=me.def.sup.name;
 if(hudKind!==G.sel){hudKind=G.sel;$('seedName').textContent=SB.KINDS[G.sel].name;$('btnSeed').firstElementChild.src=unitPic(G.sel,0);[...$('bodies').children].forEach((b,i)=>{b.firstElementChild.src=unitPic(G.sel,i)})}
 [...$('bodies').children].forEach((b,i)=>b.classList.toggle('off',!SB.canSummon(me,i+1)));
 drawLanes();if(me.dead)toast('Back in '+Math.max(1,Math.ceil(me.respawn)),.4)}
function drawHit(){const me=SB.G.me,el=$('hitdir'),f=me.hitFrom,age=f?SB.G.t-f.t:9;if(!f||age>.6||me.dead){el.style.opacity=0;$('hurt').style.opacity=0;return}
 const a=project(wx(me.x),.6,wz(me.y)),b=project(wx(f.x),.6,wz(f.y)),ang=Math.atan2(b.y-a.y,b.x-a.x);el.style.opacity=1-age/.6;el.style.transform=`translate(${a.x}px,${a.y}px) rotate(${ang}rad)`;$('hurt').style.opacity=Math.max(0,.55-age*1.4)}
function drawLabels(){for(const f of farmViews){const s=project(wx(f.x),f.h,wz(f.y));f.lab.style.transform=`translate(${s.x}px,${s.y}px) translate(-50%,-100%)`}
 for(const v of baseViews){const b=SB.G.base[v.t],t=String(Math.max(0,Math.ceil(b.hp)));if(v.txt!==t){v.txt=t;v.lab.textContent=t}const s=project(wx(v.p.x),.1,wz(v.p.y)+1.9);v.lab.style.transform=`translate(${s.x}px,${s.y}px) translate(-50%,-50%)`}}

// ---- screens and loop
let started=false,myPick=0,busy=false;
async function startMatch(i,auto){if(busy)return;busy=true;myPick=i;started=false;for(const v of heroViews){scene.remove(v.grp);v.lab.remove()}heroViews=[];
 SB.start(i,!!auto);buildWorld();heroViews=await Promise.all(SB.G.heroes.map(makeHero));$('pick').hidden=true;$('over').hidden=true;$('hud').hidden=false;hudKind=-1;started=true;busy=false;playS('match_start');lastTick=99;I.fire=false;aim=null;
 toast('Pick a lane, then spend seeds on units.',5);focus.z=wz(SB.G.me.y);drawHud()}
function toast(t,sec){const el=$('toast');if(el.textContent!==t)el.textContent=t;el.style.opacity=1;clearTimeout(toast.h);toast.h=setTimeout(()=>{el.style.opacity=0},sec*1000)}
const portraits={};
async function portrait(id){if(portraits[id])return portraits[id];const H=await LOOK.loadHero(id,{ring:false,shadow:false}),sc=new THREE.Scene();sc.background=new THREE.Color(0x3a5244);LOOK.addLights(sc);sc.add(H.root);
 const r=rigOf(H);setBone(r,'UpperArm_L',0,0,-r.dnL);setBone(r,'UpperArm_R',0,0,r.dnR);setBone(r,'Forearm_L',0,-.3,0);setBone(r,'Forearm_R',0,.3,0);
 const c=new THREE.PerspectiveCamera(28,1,.1,50),h=H.size.height;c.position.set(.9*h,h*1.0,2.9*h);c.lookAt(0,h*.56,0);
 renderer.setSize(192,192,false);LOOK.setOutlineViewport(192,192);renderer.render(sc,c);const url=gl.toDataURL('image/jpeg',.85);resize();return portraits[id]=url}
async function showPick(){started=false;$('hud').hidden=true;$('over').hidden=true;const el=$('pick');el.hidden=false;el.innerHTML='';
 for(const[i,h]of SB.HEROES.entries()){const c=document.createElement('div');c.className='card';
  c.innerHTML='<img alt=""><div><h3><span></span><small></small></h3><p></p><p></p></div>';c.querySelector('h3 span').textContent=h.name;c.querySelector('h3 small').textContent=SB.hpOf(h)+' health';const ps=c.querySelectorAll('p');ps[0].textContent=SB.say(h,h.adesc);ps[1].textContent=SB.say(h,h.sup.desc);c.addEventListener('click',()=>{soundOn=true;startMatch(i)});el.appendChild(c);
  portrait(CAST[h.id]).then(u=>{c.querySelector('img').src=u})}}
$('again').onclick=()=>startMatch(myPick);$('swap').onclick=showPick;
const clock=new THREE.Clock();let fpsN=0,fpsT=performance.now();
function frame(_,__,fdt){const dt=fdt||Math.min(.05,clock.getDelta());
 if(started&&SB.G){const G=SB.G,me=G.me;readInput();SB.update(dt);
  const ahead=TALL?5.5:2.2,tz=wz(me.y)-(me.team===1?ahead:-ahead),lim=SB.H*K/2-(TALL?8:1.5),xl=Math.max(0,10.5-SPAN/2);
  focus.set(Math.max(-xl,Math.min(xl,focus.x+(wx(me.x)-focus.x)*Math.min(1,dt*6))),0,Math.max(-lim,Math.min(lim,focus.z+(tz-focus.z)*Math.min(1,dt*6))));
  shake=Math.max(0,shake-dt);const sx=shake?(Math.random()-.5)*shake*1.2:0,sz=shake?(Math.random()-.5)*shake*1.2:0;cam.position.set(focus.x+sx,Math.sin(PITCH)*camDist,focus.z+Math.cos(PITCH)*camDist+sz);cam.lookAt(focus.x+sx,0,focus.z+sz);cam.updateMatrixWorld();W.tickAll(world,G.t,dt);
  for(const v of heroViews)tickHero(v,dt);drawUnits(G.t);drawTransient();drawParts(dt);drawLabels();drawHit();if((hudT+=dt)>.1){hudT=0;drawHud()}
  if(G.over&&$('over').hidden){$('overT').textContent=G.over==='Draw'?'Draw':G.over==='Blue wins'?'You win':'You lose';$('over').hidden=false;$('hud').hidden=true;playS(G.over==='Blue wins'?'win':'lose')}}
 renderer.render(scene,cam);if(++fpsN===60){const t=performance.now();window.SBFPS=Math.round(60000/(t-fpsT));fpsT=t;fpsN=0}}
await LOOK.heroRoster();buildDock();
const qs=new URLSearchParams(location.search);if(qs.has('hero'))await startMatch(+qs.get('hero')||0,qs.has('auto'));else showPick();
renderer.setAnimationLoop(frame);window.GAME={startMatch,showPick,scene,cam,renderer,SB,step(n,dt){for(let i=0;i<n;i++)frame(0,0,dt||1/30)},hold(v){renderer.setAnimationLoop(v?null:frame)}};   // step and hold are for tests and the clip recorder
