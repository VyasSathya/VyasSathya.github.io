// Seed Brawl Lanes: 3D client. Draws the state of the lanes rules (core.js, window.SBL) with three.js and feeds it input.
// The look, the world pieces, the hero models and the unit models are the circles version's (game/src/look.js, world.js).
import * as THREE from 'three';
import * as LOOK from './game/src/look.js';
import * as W from './game/src/world.js';
import * as UNITS from './units.js';
import * as FX from './fx.js';

const SB=window.SBL,I=window.SBL_INPUT,GP=(window.SBL_PATHS||{}).game||'./game/',$=id=>document.getElementById(id),PAL=LOOK.palette;
LOOK.setHeroBase(GP+'assets/heroes/');
const K=21/SB.W,wx=x=>x*K-10.5,wz=y=>(y-SB.H/2)*K;           // rules units to tiles; map is 21 tiles wide
const TEAM=[PAL.team.neutral,PAL.team.blue,PAL.team.red],GOLD=0xffc83d;
const CAST={bramble:'bear',sow:'owl',mower:'frog',magpie:'mouse',drover:'elephant',thistle:'penguin',shade:'cat',foxglove:'fox',bamboo:'panda'};

const renderer=new THREE.WebGLRenderer({canvas:$('gl'),antialias:true,alpha:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color(PAL.sky);
const cam=new THREE.PerspectiveCamera(30,1,.1,300),PITCH=58*Math.PI/180,focus=new THREE.Vector3();
let camDist=20,VW=1,VH=1,shake=0,ROT=false;const SPAN=21,stage=document.getElementById('stage');   // the whole 21 tile width is always on screen; the camera only follows the hero up and down the map
// Landscape always. A touch screen held upright (the Web Lab frame, a phone browser) gets the stage turned a quarter turn, so the game is played with the phone on its side.
const px=e=>ROT?e.clientY:e.clientX,py=e=>ROT?innerWidth-e.clientX:e.clientY;
function resize(){ROT=innerHeight>innerWidth&&matchMedia('(pointer:coarse)').matches;VW=ROT?innerHeight:innerWidth;VH=ROT?innerWidth:innerHeight;
 stage.style.width=VW+'px';stage.style.height=VH+'px';stage.style.transform=ROT?`translateX(${innerWidth}px) rotate(90deg)`:'';stage.style.setProperty('--H',VH+'px');
 stage.classList.toggle('rot',ROT);stage.classList.toggle('short',VH<=480);
 cam.aspect=VW/VH;cam.updateProjectionMatrix();renderer.setSize(VW,VH,false);LOOK.setOutlineViewport(VW,VH);
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
 if(h.hp<v.hp-1&&!h.dead){v.pop=.14;if(fxOn&&vis&&SB.G.t-(v.hitT||0)>.15){v.hitT=SB.G.t;FX.play('hero_hit',{x:wx(h.x),z:wz(h.y),element:'default'})}}v.hp=h.hp;
 if(fxOn&&v.dead!==undefined&&v.dead!==!!h.dead)FX.play(h.dead?'hero_down':'respawn',{x:wx(h.x),z:wz(h.y),element:h.dead?(HEL[h.def.id]||'default'):'seed',team:h.team});v.dead=!!h.dead;v.pop=Math.max(0,v.pop-dt);v.body.scale.setScalar(v.s0*(1+v.pop*1.6));
 const top=project(wx(h.x),v.ht+.35,wz(h.y));v.lab.style.display=!h.dead&&vis?'':'none';v.lab.style.opacity=h.invisT>0?.5:1;v.lab.style.transform=`translate(${top.x}px,${top.y}px) translate(-50%,-100%)`;
 v.lab.children[1].firstChild.style.width=Math.max(0,h.hp/h.maxhp*100)+'%';
 if(v.seeds!==h.seeds){v.seeds=h.seeds;v.lab.firstChild.innerHTML='<u></u>'.repeat(Math.min(10,h.seeds))}}
const pv=new THREE.Vector3();function project(x,y,z){pv.set(x,y,z).project(cam);return{x:(pv.x*.5+.5)*VW,y:(-pv.y*.5+.5)*VH}}

// ---- units: one instanced body + outline per kind, body and team (the circles version's models), one instanced team ring
const UMAX=200,USET=UNITS.sets();UNITS.init(scene,UMAX);
const ringGeo=new THREE.RingGeometry(.42,.6,14);ringGeo.rotateX(-Math.PI/2);
const uRing=new THREE.InstancedMesh(ringGeo,new THREE.MeshBasicMaterial({color:0xffffff,depthWrite:false}),UMAX*2);uRing.frustumCulled=false;uRing.count=0;scene.add(uRing);
const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),P=new THREE.Vector3(),S=new THREE.Vector3(),C=new THREE.Color(),E3=new THREE.Euler();
// Creeps: where they are comes from the rules; how they move is drawn here. An attack is seen the moment the rules
// land it (the cooldown jumps back up): a fast lunge out, then a slower settle. A hit flashes the body white.
const env=ta=>ta<0?0:ta<.07?ta/.07:Math.max(0,1-(ta-.07)/.26),ease=k=>k<0?0:k>1?1:1-(1-k)*(1-k);
function drawUnits(t){for(const k in USET)USET[k].n=0;let nr=0;for(const u of SB.G.units){if(u.dead)continue;const ti=Math.max(0,Math.min(4,u.tier-1)),s=UNITS.set(u.kind,ti,u.team,TEAM[u.team]);if(s.n>=UMAX)continue;
  if(u._x===undefined){u._x=u.x;u._y=u.y;u._f=u.team===1?Math.PI:0;u._s=Math.random()*6;u._cd=u.atkCd;u._hp=u.hp;u._born=t;u._at=-9;u._fl=0;u._mv=0}
  const dx=u.x-u._x,dy=u.y-u._y,sp2=dx*dx+dy*dy;u._x=u.x;u._y=u.y;u._mv+=((sp2>.02?1:0)-u._mv)*.2;
  if(sp2>.02){let d=Math.atan2(dx,dy)-u._f;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;u._f+=d*.25}
  if(u.atkCd>u._cd+.4)u._at=t;u._cd=u.atkCd;if(u.hp<u._hp-.5)u._fl=.12;u._hp=u.hp;u._fl=Math.max(0,u._fl-1/60);
  const w=s.w*1.5,ph=t+u._s,mv=u._mv,A=env(t-u._at),R=Math.max(0,1-(t-u._at)/.5),born=ease((t-u._born)/.22),pop=1+.22*Math.sin(Math.min(1,(t-u._born)/.3)*Math.PI);
  let y=0,sx=1,sy=1,rx=0,rz=0,fw=0,lean=0,sway=0,flap=0;
  if(ti===0){const k=Math.abs(Math.sin(ph*(u.kind===2?7:4.5)))*mv;y=k*w*.16;sy=1+(k-.5)*.14*mv;sway=Math.sin(ph*4.5)*.05;lean=.95*A-.2*R*(1-A);fw=A*w*.4;sy*=1-.12*A}                 // grunt: hop, headbutt
  else if(ti===1){rz=Math.sin(ph*3.2)*.13*mv;y=Math.abs(Math.sin(ph*3.2))*w*.05*mv;sway=Math.sin(ph*3.2)*.07*mv;lean=.06+.9*A;fw=A*w*.25;sy=1-.2*A;sx=1+.14*A}                              // brute: waddle, slam
  else if(ti===2){y=Math.abs(Math.sin(ph*3.6))*w*.07*mv;sway=Math.sin(ph*3.6)*.05;lean=-.7*A+.25*R*(1-A);fw=-A*w*.22;sy=1-.28*A;sx=1+.2*A}                                                // splasher: recoil
  else if(ti===3){y=1.15+Math.sin(ph*2.4)*.12-A*.75;flap=Math.sin(ph*17)*.3;rx=.3+.5*A;lean=.4*A;fw=A*w*.5;sway=Math.sin(ph*2.4)*.05}                                                     // flyer: flap, dive
  else{const k=Math.sin(ph*1.9);y=Math.abs(k)*w*.05*mv;rz=k*.06*mv;sway=k*.04*mv;lean=.5*A;sy=1-.22*A+.08*R*(1-A);sx=1+.16*A;if(A>.9&&Math.abs(wz(u.y)-focus.z)<7)shake=Math.min(.1,shake+.012)} // colossus: stomp
  const sc=w*born*pop;P.set(wx(u.x)+Math.sin(u._f)*fw,y,wz(u.y)+Math.cos(u._f)*fw);Q.setFromEuler(E3.set(rx,u._f,rz,'YXZ'));S.set(sc*sx/Math.sqrt(sy),sc*sy,sc*sx/Math.sqrt(sy));M.compose(P,Q,S);s.b.setMatrixAt(s.n,M);s.o.setMatrixAt(s.n,M);
  s.anim.setXYZW(s.n,lean,sway,flap,u._fl/.12);s.n++;
  P.set(wx(u.x),.02,wz(u.y));Q.identity();S.setScalar((ti===3?w*.7:w)*born);M.compose(P,Q,S);uRing.setMatrixAt(nr,M);uRing.setColorAt(nr,C.set(TEAM[u.team]));nr++}
 for(const k in USET){const s=USET[k];s.b.count=s.o.count=s.n;s.b.visible=s.o.visible=s.n>0;s.b.instanceMatrix.needsUpdate=s.o.instanceMatrix.needsUpdate=true;s.anim.needsUpdate=true}
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
// ---- attacks, hits, deaths and spells: painted layered effects (fx.js) played from what the rules did this step
let fxOn=false;try{await FX.init(THREE,scene,cam,{base:'./fx/',max:600});fxOn=true}catch(e){console.warn('effects did not load, plain shapes stay',e)}
const HEL={bramble:'leaf',sow:'seed',mower:'blade',magpie:'shade',drover:'gourd',thistle:'bloom',shade:'shade',foxglove:'fox',bamboo:'gourd'},KEL=['thorn','spit','runner'],TSC=[0,1,1.3,1.1,1,1.8];
const ZFX={'Briar ring':'zone_briar','Nursery':'zone_nursery','Blade trap':'zone_blades','Rally post':'zone_rally','Lure':'zone_lure','Shelter':'zone_shelter'};
const elOf=o=>o&&o.def?HEL[o.def.id]||'default':'default',near=y=>Math.abs(wz(y)-focus.z)<10,W2=(x,y)=>({x:wx(x),z:wz(y)});
let shotsLive=[],zonesLive=[],seedsPrev=[];const seenP=new WeakSet(),seenL=new WeakSet(),muzT=new WeakMap();
function fxReset(){FX.clear();shotsLive=[];zonesLive=[];seedsPrev=[]}
// where a creep's shot leaves its body: the muzzle point its model carries (units.json), turned toward the target
function muzzleOf(e,to){const m=UNITS.meta(e.kind,e.tier-1),at=W2(e.x,e.y);if(!m||!m.muzzle)return at;const s=W.UNIT_WIDTH[e.tier-1]*1.5*(m.scale||1),dx=to.x-at.x,dz=to.z-at.z,d=Math.hypot(dx,dz)||1;return{x:at.x+dx/d*m.muzzle[2]*s,z:at.z+dz/d*m.muzzle[2]*s,y:m.muzzle[1]*s}}
function drawEvents(G){const E=G.ev;if(!E)return;if(fxOn)for(const e of E){if(!near(e.y))continue;const el=KEL[e.kind]||'default',sc=TSC[e.tier]||1,at=W2(e.x,e.y);
   if(e.k==='uatk'){const to=W2(e.tx,e.ty);
    if(e.tier===3)FX.play('splasher_lob',{...muzzleOf(e,to),to,radius:46*K,element:el,team:e.team});
    else if(SB.KINDS[e.kind].range>60)FX.play('spit_shot',{...muzzleOf(e,to),to,element:el});
    else if(e.tier===4)FX.play('flyer_dive',{...at,to,element:el});
    else{if(e.tier===5)FX.play('colossus_stomp',{...at,radius:(SB.KINDS[e.kind].range+30)*K,element:'dust'});FX.play('creep_hit',{...at,to,dir:Math.atan2(e.ty-e.y,e.tx-e.x),element:el,scale:sc})}}
   else if(e.k==='udie')FX.play(e.tier===5?'colossus_split':'creep_death',{...at,element:el,scale:sc,radius:.7});
   else if(e.k==='spawn'){const sp=SB.spawnPt(e.team,e.lane);if(Math.abs(sp.y-e.y)<40)FX.play('summon_arrive',{...at,y:3.5,to:{...at,y:0},element:el,team:e.team,scale:sc})}}
 E.length=0}
function drawFx(G,me){projs.end(0);balls.end(0);
 // hero shots: a painted head with a trail while it flies, a flash where it left, a hit or a fizzle where it ended
 for(const p of G.projs)if(!seenP.has(p)){seenP.add(p);const el=elOf(p.owner);shotsLive.push(p);FX.attach('shot_trail',()=>p.left>0?W2(p.x,p.y):null,{element:el});
   const o=p.owner||p;if(muzT.get(o)!==G.t){muzT.set(o,G.t);FX.play('hero_muzzle',{...W2(p.x,p.y),dir:Math.atan2(p.vy,p.vx),element:el})}}
 for(let i=shotsLive.length-1;i>=0;i--){const p=shotsLive[i];if(p.left>0)continue;shotsLive[i]=shotsLive[shotsLive.length-1];shotsLive.pop();if(near(p.y))FX.play(p.hit&&p.hit.size?'shot_hit':'shot_fizzle',{...W2(p.x,p.y),dir:Math.atan2(p.vy,p.vx),element:elOf(p.owner)})}
 // lobbed things: the arc, the landing spot at its real radius, the blast
 for(const l of G.lobs){if(l.t<.04&&Math.hypot(l.x-me.x,l.y-me.y)<l.r+40)shake=Math.min(.12,shake+.05);if(seenL.has(l))continue;seenL.add(l);
  FX.play(l.big?'seed_charge':'hero_lob',{...W2(l.sx,l.sy),to:W2(l.x,l.y),radius:l.r*K,travel:l.max,duration:l.max,element:l.big?'bloom':elOf(l.owner),team:l.team})}
 // zones on the ground: painted moving surfaces at the real radius, until the rules end them
 let nz=0;for(const z of G.zones){if(!z._fx){z._fx=FX.play(ZFX[z.label]||'puddle',{...W2(z.x,z.y),radius:z.r*K,duration:z.max,arm:z.arm,team:z.team,element:elOf(z.owner)})||{stop(){}};zonesLive.push(z)}
  if(z.label){const el=zlabs.get(nz++),p=project(wx(z.x),.1,wz(z.y));if(el.textContent!==z.label)el.textContent=z.label;el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`}}
 zlabs.end(nz);for(let i=zonesLive.length-1;i>=0;i--){const z=zonesLive[i];if(z.dur>0&&G.zones.includes(z))continue;z._fx.stop&&z._fx.stop();zonesLive[i]=zonesLive[zonesLive.length-1];zonesLive.pop()}
 // seeds picked up (a seed that was there last frame and is gone)
 {const now=new Set(G.seeds);for(const s of seedsPrev)if(!now.has(s)&&near(s.y))FX.play('seed_pickup',{...W2(s.x,s.y),element:'seed'});seedsPrev=G.seeds.slice()}
 // what the rules flagged this step: cones, the base gun, hero spells; the few plain rings left are match events (level up, base awake)
 let nt=0;for(const f of G.fx){const k=Math.max(0,Math.min(1,f.life/(f.max||.8)));
  if(!seenFx.has(f)){seenFx.add(f);const at=W2(f.x,f.y);
   if(f.k==='c')FX.play(f.src==='mower'?'hero_cone_blast':'hero_cone_slash',{...at,dir:f.a,radius:f.r*K,half:f.half,element:HEL[f.src]||'default',team:f.team});
   else if(f.k==='l'){const b=G.base[1].x===f.x&&G.base[1].y===f.y?G.base[1]:G.base[2].x===f.x&&G.base[2].y===f.y?G.base[2]:null;
    if(b)FX.play('base_shot',{...at,to:W2(f.x2,f.y2),element:'seed',team:b.team});else if(f.col==='#cecbf6')FX.play('heist',{...at,to:W2(f.x2,f.y2),radius:220*K,element:'shade'})}
   else if(f.k==='r'){f._own=false;
    if(f.r===60&&f.max===.3)FX.play('base_hit',{x:wx(f.x),z:wz(f.y)-.6,element:'seed',team:f.col==='#378add'?1:2});
    else if(f.r===90&&f.col==='#afa9ec')FX.play('vanish',{...at,radius:90*K,element:'shade'});
    else if(f.r===22&&f.col==='#f0997b')FX.play('seed_pickup',{...at,element:'fox'});
    else if(f.r===26&&f.col==='#fac775')FX.play('seed_pickup',{...at,element:'seed'});
    else if(f.r===16&&f.col==='#c0dd97')FX.play('seed_pickup',{...at,element:'heal'});
    else if(f.max===.35||f.max===.45||f.max===.15||f.r===46||f.r===220||f.col==='#fff');   // a death, a summon, a wall hit, a splash, the heist ring, a lob landing: their effects are played from the event
    else f._own=true}
   else if(f.k==='t'){f._ox=(Math.random()-.5)*1.3;f._oy=Math.random()*.5;if(f.t[0]==='+')FX.play('seed_pickup',{...at,element:'heal'})}}   // numbers from hits that land together fan out so they can be read
  if(f.k==='r'&&f._own)ringAt(f.x,f.y,f.r*(1.15-k*.4),f.col,k);
  else if(f.k==='t'){const el=texts.get(nt++),p=project(wx(f.x)+(f._ox||0),1.2+(f._oy||0)+(1-f.life/.8)*1.1,wz(f.y));if(el.textContent!==f.t)el.textContent=f.t;el.style.color=f.col;el.style.opacity=k;el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`}}
 texts.end(nt)}
function drawTransient(){const G=SB.G,me=G.me;nR=nD=nS=nC=nV=0;let i=0;
 for(const s of G.seeds){const m=seeds.get(i++);m.position.set(wx(s.x),0,wz(s.y));W.tickAll(m,G.t,0)}seeds.end(i);
 if(fxOn)drawFx(G,me);else{
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
 }
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

// ---- sound: one player for every cue (lanes/sound.js; ids, tiers and levels in lanes/sfx/cues.json)
// Settings (meta.js) switch effects and music; the menu flow plays the result stinger on its result screen (menu.js)
try{window.SBL_META&&window.SBL_META.load()}catch(e){}   // saved settings before the player starts (menu.js loads it again)
const SET=(window.SBL_META&&window.SBL_META.state&&window.SBL_META.state.settings)||{},MENU_FLOW=!!window.SBL_META&&!/[?&]nomenu\b/.test(location.search);
const SND=window.SBL_SOUND.create({base:'sfx/',music:'music/',sound:SET.sound!==false,music_on:SET.music!==false});let soundOn=false;window.SBL_SOUND.player=SND;
// what main.js asks for by name, as cue ids; a summon tap is answered by the summon itself (the tap click stays quiet after my own sound).
// match start: the match loop; match over: the loop fades, and the stinger plays (here without the menu, on the result screen with it)
function playS(k){if(k==='match_start'){SND.music.set('match');SND.music.preload('match_late','stinger_win','stinger_lose')}
 if(k==='win'||k==='lose'){const G=SB.G;if(G){if(G._endSnd)return 'once';G._endSnd=1}SND.music.set(null);if(MENU_FLOW)return 'menu';SND.music.stinger(k==='win'?'stinger_win':'stinger_lose',null);if(SND.tracks['stinger_'+k])return 'stinger'}
 return SND.play(k==='button_tap'?'ui_tap':k,{ui:true})}
// the listener is the camera focus; the view's half width and half height in rules units set where sounds fade out
const listen=()=>({x:(focus.x+10.5)/K,y:focus.z/K+SB.H/2,hw:SB.W/2,hh:SB.W/2*VH/VW/Math.sin(PITCH)});
window.SBL_SND=(k,x,y,a)=>{if(k==='late_double')SND.music.set('match_late');return SND.play(k,{x,y,actor:a,me:SB.G&&SB.G.me,at:listen()})};   // the late phase (CFG.late.at seconds left) switches the music
document.addEventListener('click',e=>{const t=e.target&&e.target.closest&&e.target.closest('#pick .tile,#play,#swap');if(t)SND.play(t.id==='play'?'ui_play':'ui_tap',{ui:true})},true);
if(!MENU_FLOW)SND.music.set('menu');   // the old pick screen: menu music once the first touch runs the sound

// ---- input
let aim=null;const keys={},mouse={x:0,y:0,down:false};
const ray=new THREE.Raycaster(),gp=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3();
function groundAt(sx,sy){ray.setFromCamera(new THREE.Vector2(sx/VW*2-1,-(sy/VH)*2+1),cam);ray.ray.intersectPlane(gp,hit);return{x:(hit.x+10.5)/K,y:hit.z/K+SB.H/2}}
function autoAim(me,range){let best=null,bd=range*1.15;for(const e of[...SB.G.heroes,...SB.G.units]){if(e.dead||e.team===me.team||e.invisT>0)continue;const d=Math.hypot(e.x-me.x,e.y-me.y)-(e.isHero?40:0);if(d<bd){bd=d;best=e}}return best?{a:Math.atan2(best.y-me.y,best.x-me.x),d:Math.hypot(best.x-me.x,best.y-me.y)}:{a:me.aimA,d:range*.7}}
function fire(a,d){I.fireA=a;I.fireD=d;I.fire=true}
function castSup(a,d){const me=SB.G.me,sp=me.def.sup,r=sp.range||0,q=sp.shape==='circle'?Math.min(r,d):Math.max(60,r);SB.castSuper(me,me.x+Math.cos(a)*q,me.y+Math.sin(a)*q)}
function doSummon(slot){const G=SB.G;if(!G||G.over)return;const el=$('hand').children[slot];if(!el)return;if(!SB.playCard(G.me,slot)){el.animate([{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'none'}],{duration:160});return}playS('button_tap');drawHud()}
function pickLane(l){const G=SB.G;if(!G||G.over)return;SB.setLane(G.me,l);drawHud()}
const LANEKEYS='zxcvb';
addEventListener('keydown',e=>{const k=e.key.toLowerCase();if(k===' ')e.preventDefault();if(e.repeat||!SB.G||!started)return;keys[k]=true;
 if(k>='1'&&k<=String(SB.HAND))doSummon(+k-1);if(k==='e')pickLane(SB.G.me.lane+1);const li=LANEKEYS.indexOf(k);if(li>=0&&li<SB.NL)pickLane(li);
 if(k===' ')aim={sup:true,a:SB.G.me.aimA,d:300,mouse:true}});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();keys[k]=false;if(k===' '&&aim&&aim.sup){castSup(aim.a,aim.d);aim=null}});
const gl=$('gl');
gl.addEventListener('pointerdown',e=>{soundOn=true;if(!SB.G||e.pointerType!=='mouse')return;mouse.x=px(e);mouse.y=py(e);if(e.button===0){mouse.down=true}else if(e.button===2)aim={sup:true,a:0,d:300,mouse:true}});
addEventListener('pointermove',e=>{if(e.pointerType==='mouse'){mouse.x=px(e);mouse.y=py(e);mouse.seen=true}});
addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')return;if(e.button===0)mouse.down=false;else if(e.button===2&&aim&&aim.sup){castSup(aim.a,aim.d);aim=null}});
gl.addEventListener('contextmenu',e=>e.preventDefault());
// touch: the left half of the screen is a floating move stick; attack and super are drag-to-aim buttons
const stick={id:null,ox:0,oy:0,x:0,y:0},sl=$('stickL');
gl.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||!SB.G||stick.id!==null||px(e)>VW*.5)return;stick.id=e.pointerId;stick.ox=px(e);stick.oy=py(e);stick.x=stick.y=0;sl.style.left=(px(e)-59)+'px';sl.style.bottom=(VH-py(e)-59)+'px'});
addEventListener('pointermove',e=>{if(e.pointerId!==stick.id)return;let dx=px(e)-stick.ox,dy=py(e)-stick.oy;const m=Math.hypot(dx,dy),R=46;if(m>R){dx*=R/m;dy*=R/m}stick.x=dx/R;stick.y=dy/R;sl.firstChild.style.transform=`translate(${dx}px,${dy}px)`});
const endStick=e=>{if(e.pointerId!==stick.id)return;stick.id=null;stick.x=stick.y=0;sl.firstChild.style.transform='';sl.style.left='';sl.style.bottom=''};addEventListener('pointerup',endStick);addEventListener('pointercancel',endStick);
function dragButton(el,sup){let id=null,ox=0,oy=0;
 el.addEventListener('pointerdown',e=>{soundOn=true;if(!SB.G||id!==null)return;e.preventDefault();id=e.pointerId;el.setPointerCapture(id);ox=px(e);oy=py(e);el.classList.add('on');const me=SB.G.me,t=autoAim(me,(sup?me.def.sup:me.def.atk).range||200);aim={sup,a:t.a,d:t.d,auto:true}});
 el.addEventListener('pointermove',e=>{if(e.pointerId!==id||!aim)return;const dx=px(e)-ox,dy=py(e)-oy,m=Math.hypot(dx,dy);el.firstElementChild.style.transform=`translate(${Math.max(-30,Math.min(30,dx))}px,${Math.max(-30,Math.min(30,dy))}px)`;
  if(m>12){aim.a=Math.atan2(dy,dx);aim.auto=false;const d=sup?SB.G.me.def.sup:SB.G.me.def.atk;aim.d=(d.range||200)*Math.min(1,m/70)}else if(aim.auto){const me=SB.G.me,t=autoAim(me,(sup?me.def.sup:me.def.atk).range||200);aim.a=t.a;aim.d=t.d}});
 const up=e=>{if(e.pointerId!==id)return;id=null;el.classList.remove('on');el.firstElementChild.style.transform='';if(!aim)return;const me=SB.G.me,d=sup?me.def.sup:me.def.atk,r=d.range||200,t=aim.auto?autoAim(me,r):aim;
  if(e.type==='pointerup'){if(sup)castSup(t.a,t.d);else fire(t.a,d.shape==='circle'?t.d:r)}aim=null};
 el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up)}
dragButton($('btnAtk'),false);dragButton($('btnSup'),true);
$('lanes').addEventListener('pointerdown',e=>{e.preventDefault();soundOn=true;const r=e.currentTarget.getBoundingClientRect();pickLane(SB.laneOf((ROT?(e.clientY-r.top)/r.height:(e.clientX-r.left)/r.width)*SB.W))});
function readInput(){const me=SB.G.me;let mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),my=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
 if(stick.id!==null){mx=stick.x;my=stick.y}const m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m}if(m<.18){mx=my=0}I.mx=mx;I.my=my;
 I.aimA=null;if(aim){if(aim.mouse){const g=groundAt(mouse.x,mouse.y);aim.a=Math.atan2(g.y-me.y,g.x-me.x);aim.d=Math.hypot(g.x-me.x,g.y-me.y)}I.aimA=aim.a}
 else if(mouse.seen){const g=groundAt(mouse.x,mouse.y);I.aimA=Math.atan2(g.y-me.y,g.x-me.x);if(mouse.down)fire(I.aimA,Math.hypot(g.x-me.x,g.y-me.y))}
 else if(mx||my)I.aimA=Math.atan2(my,mx)}

// ---- HUD: seeds carried, the lane picker (a small live map), the three creeps in hand and the next one
const fmt=t=>{t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};let hudT=0,lastTick=99,hudCards=[];
const unitPics={};UNITS.load(GP+'assets/units/',()=>{for(const k in unitPics)delete unitPics[k];hudCards=[]});
function unitPic(kind,ti){const key=kind+'_'+ti;if(unitPics[key])return unitPics[key];const sc=new THREE.Scene();LOOK.addLights(sc);const body=UNITS.single(kind,ti,PAL.team.blue);body.userData.tick=null;const w=W.UNIT_WIDTH[ti];
 sc.add(body);body.rotation.y=.5;const bx=new THREE.Box3().setFromObject(body),h=Math.max(.3,bx.max.y-bx.min.y),cy=(bx.max.y+bx.min.y)/2,c=new THREE.PerspectiveCamera(26,1,.05,50),d=Math.max(h,w*1.2)*2.6;
 c.position.set(0,cy+h*.35,d);c.lookAt(0,cy,0);const bg=scene.background;renderer.setSize(112,112,false);LOOK.setOutlineViewport(112,112);renderer.setClearColor(0,0);renderer.render(sc,c);const url=gl.toDataURL('image/png');resize();return unitPics[key]=url}
// hand slots keep a fixed label (Card 1..3) for the iOS test taps; the creep's own name is on the card
function buildDock(){const el=$('hand');el.innerHTML='';for(let i=0;i<SB.HAND;i++){const b=document.createElement('div');b.className='card';b.innerHTML='<img alt=""><kbd>'+(i+1)+'</kbd><em></em><span><small></small><b></b></span>';b.setAttribute('role','button');b.setAttribute('aria-label','Card '+(i+1));b.addEventListener('pointerdown',e=>{e.preventDefault();soundOn=true;doSummon(i)});el.appendChild(b)}}
// what a card shows: the creep's picture, its body and kind, its seed cost; redrawn only when the slot holds a new card
function drawCards(me){const els=$('hand').children,cards=me.hand.concat([SB.nextCard(me)]);
 cards.forEach((c,i)=>{if(!c)return;const el=i<SB.HAND?els[i]:$('next'),key=c.kind+'_'+c.tier;if(hudCards[i]!==c||el.dataset.k!==key){const fresh=hudCards[i]!==undefined&&hudCards[i]!==c;hudCards[i]=c;el.dataset.k=key;
  el.querySelector('img').src=unitPic(c.kind,c.tier-1);el.querySelector('em').textContent=SB.costOf(c.tier);
  if(i<SB.HAND){el.querySelector('b').textContent=SB.BODIES[c.tier];el.querySelector('small').textContent=SB.KINDS[c.kind].name;if(fresh){el.classList.remove('deal');void el.offsetWidth;el.classList.add('deal')}}}
  if(i<SB.HAND)el.classList.toggle('off',!SB.canPlay(me,i))})}
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
 drawCards(me);
 drawLanes();if(me.dead)toast('Back in '+Math.max(1,Math.ceil(me.respawn)),.4)}
function drawHit(){const me=SB.G.me,el=$('hitdir'),f=me.hitFrom,age=f?SB.G.t-f.t:9;if(!f||age>.6||me.dead){el.style.opacity=0;$('hurt').style.opacity=0;return}
 const a=project(wx(me.x),.6,wz(me.y)),b=project(wx(f.x),.6,wz(f.y)),ang=Math.atan2(b.y-a.y,b.x-a.x);el.style.opacity=1-age/.6;el.style.transform=`translate(${a.x}px,${a.y}px) rotate(${ang}rad)`;$('hurt').style.opacity=Math.max(0,.55-age*1.4)}
function drawLabels(){for(const f of farmViews){const s=project(wx(f.x),f.h,wz(f.y));f.lab.style.transform=`translate(${s.x}px,${s.y}px) translate(-50%,-100%)`}
 for(const v of baseViews){const b=SB.G.base[v.t],t=String(Math.max(0,Math.ceil(b.hp)));if(v.txt!==t){v.txt=t;v.lab.textContent=t}const s=project(wx(v.p.x),.1,wz(v.p.y)+1.9);v.lab.style.transform=`translate(${s.x}px,${s.y}px) translate(-50%,-50%)`}}

// ---- screens and loop
let started=false,myPick=0,busy=false;
// opts.deck: six {kind, tier} the player brings (the menu sets it); with none the hero's default deck
let myOpts={};async function startMatch(i,auto,opts){if(busy)return;busy=true;myPick=i;if(opts)myOpts=opts;started=false;for(const v of heroViews){scene.remove(v.grp);v.lab.remove()}heroViews=[];
 SB.start(i,!!auto,myOpts);fxReset();buildWorld();heroViews=await Promise.all(SB.G.heroes.map(makeHero));$('pick').hidden=true;$('over').hidden=true;$('hud').hidden=false;hudCards=[];started=true;busy=false;playS('match_start');lastTick=99;I.fire=false;aim=null;
 toast('Pick a lane, then spend seeds on units.',5);focus.z=wz(SB.G.me.y);drawHud()}
function toast(t,sec){const el=$('toast');if(el.textContent!==t)el.textContent=t;el.style.opacity=1;clearTimeout(toast.h);toast.h=setTimeout(()=>{el.style.opacity=0},sec*1000)}
const portraits={};
async function portrait(id){if(portraits[id])return portraits[id];const H=await LOOK.loadHero(id,{ring:false,shadow:false}),sc=new THREE.Scene();sc.background=new THREE.Color(0x3a5244);LOOK.addLights(sc);sc.add(H.root);
 const r=rigOf(H);setBone(r,'UpperArm_L',0,0,-r.dnL);setBone(r,'UpperArm_R',0,0,r.dnR);setBone(r,'Forearm_L',0,-.3,0);setBone(r,'Forearm_R',0,.3,0);
 const c=new THREE.PerspectiveCamera(28,1,.1,50),h=H.size.height;c.position.set(.9*h,h*1.0,2.9*h);c.lookAt(0,h*.56,0);
 renderer.setSize(192,192,false);LOOK.setOutlineViewport(192,192);renderer.render(sc,c);const url=gl.toDataURL('image/jpeg',.85);resize();return portraits[id]=url}
let picked=0;
async function showPick(){started=false;$('hud').hidden=true;$('over').hidden=true;const el=$('pick');el.hidden=false;
 el.innerHTML='<div id="heroes"></div><div id="info"><h2><span></span><small></small></h2><p></p><p></p><button id="play">Play</button></div>';
 const info=el.querySelector('#info'),ps=info.querySelectorAll('p'),tiles=[];
 const show=i=>{picked=i;const h=SB.HEROES[i];info.querySelector('h2 span').textContent=h.name;info.querySelector('h2 small').textContent=SB.hpOf(h)+' health';ps[0].textContent=SB.say(h,h.adesc);ps[1].textContent=SB.say(h,h.sup.desc);tiles.forEach((c,j)=>c.classList.toggle('on',j===i))};
 for(const[i,h]of SB.HEROES.entries()){const c=document.createElement('button');c.className='tile';c.innerHTML='<img alt=""><span></span>';c.querySelector('span').textContent=h.name;c.addEventListener('click',()=>{soundOn=true;show(i)});tiles.push(c);el.firstChild.appendChild(c);
  portrait(CAST[h.id]).then(u=>{c.querySelector('img').src=u})}
 show(picked);el.querySelector('#play').addEventListener('click',()=>{soundOn=true;startMatch(picked)})}
$('again').onclick=()=>startMatch(myPick);$('swap').onclick=showPick;
const clock=new THREE.Clock();let fpsN=0,fpsT=performance.now();
function frame(_,__,fdt){const dt=fdt||Math.min(.05,clock.getDelta());
 if(started&&SB.G){const G=SB.G,me=G.me;readInput();SB.update(dt);
  const ahead=.8,tz=wz(me.y)-(me.team===1?ahead:-ahead),lim=SB.H*K/2-1.5,xl=Math.max(0,10.5-SPAN/2);
  focus.set(Math.max(-xl,Math.min(xl,focus.x+(wx(me.x)-focus.x)*Math.min(1,dt*6))),0,Math.max(-lim,Math.min(lim,focus.z+(tz-focus.z)*Math.min(1,dt*6))));
  shake=Math.max(0,shake-dt);const sx=shake?(Math.random()-.5)*shake*1.2:0,sz=shake?(Math.random()-.5)*shake*1.2:0;cam.position.set(focus.x+sx,Math.sin(PITCH)*camDist,focus.z+Math.cos(PITCH)*camDist+sz);cam.lookAt(focus.x+sx,0,focus.z+sz);cam.updateMatrixWorld();W.tickAll(world,G.t,dt);
  for(const v of heroViews)tickHero(v,dt);drawUnits(G.t);drawTransient();drawEvents(G);if(fxOn)FX.tick(dt);drawParts(dt);drawLabels();drawHit();if((hudT+=dt)>.1){hudT=0;drawHud()}
  if(G.over&&$('over').hidden){$('overT').textContent=G.over==='Draw'?'Draw':G.over==='Blue wins'?'You win':'You lose';$('over').hidden=false;$('hud').hidden=true;playS(G.over==='Blue wins'?'win':'lose')}}
 renderer.render(scene,cam);if(++fpsN===60){const t=performance.now();window.SBFPS=Math.round(60000/(t-fpsT));fpsT=t;fpsN=0}}
await LOOK.heroRoster();buildDock();
const qs=new URLSearchParams(location.search);if(qs.has('hero'))await startMatch(+qs.get('hero')||0,qs.has('auto'));else showPick();
renderer.setAnimationLoop(frame);window.GAME={startMatch,showPick,scene,cam,renderer,SB,step(n,dt){for(let i=0;i<n;i++)frame(0,0,dt||1/30)},hold(v){renderer.setAnimationLoop(v?null:frame)}};   // step and hold are for tests and the clip recorder
// ==== MENU (shell branch): the app screens around the match live in menu.js; it gets the renderer, the hero pose code and the match start, and runs the frame while a screen is up. Keep this block whole when merging.
{const MENU=await import('./menu.js');await MENU.init({THREE,LOOK,W,UNITS,renderer,resize,CAST,rigOf,setBone,pose,startMatch,frame});}
// ==== /MENU
