// Seed Brawl Lanes: 3D client. Draws the state of the lanes rules (core.js, window.SBL) with three.js and feeds it input.
// The look, the world pieces, the hero models and the unit models are the circles version's (game/src/look.js, world.js).
import * as THREE from 'three';
import * as LOOK from './game/src/look.js';
import * as W from './game/src/world.js';
import * as UNITS from './units.js';
import * as FX from './fx.js';
import * as HA from './heroanim.js';
import * as TV from './towers-view.js';   // [towers] draws ?towers=a / b, nothing when off
let CASC=null;if(/[?&]heroanim=casc/.test(location.search))import('./heroanim-casc.js').then(m=>{CASC=m});   // test switch, off by default: Champ's walk legs from the Cascadeur scene (lanes/heroanim-casc.js)
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SB=window.SBL,I=window.SBL_INPUT,GP=(window.SBL_PATHS||{}).game||'./game/',$=id=>document.getElementById(id),PAL=LOOK.palette;
LOOK.setHeroBase(GP+'assets/heroes/');
const K=21/SB.W,wx=x=>x*K-10.5,wz=y=>(y-SB.H/2)*K;           // rules units to tiles; map is 21 tiles wide
const TEAM=[PAL.team.neutral,PAL.team.blue,PAL.team.red],GOLD=0xffc83d;
// homies (work/homies-rules): a homie is drawn as the model lanes/homie-models.js maps its id to, its own once that has loaded,
// else the shared creep standing in for it; effects always follow the stand-in. A shared creep is drawn as itself.
const HML=window.SBL_HOMIE_MODELS||{};
function LK(o,fx){const m=o&&o.hid&&HML[o.hid];if(!m)return o;const[k,t]=m.standIn.split('_'),tier=+t,own=fx?-1:UNITS.KEYS.indexOf(o.hid);return{kind:own>=0&&UNITS.model(own,tier-1)?own:UNITS.KEYS.indexOf(k),tier,pic:m.pic?GP+'assets/units/'+m.pic:null}}
// the homie models of every crew in this match (and only those) start loading when the match starts; stand-ins show until each arrives
const crewIds=()=>SB.homiesOn&&SB.G?[...new Set(SB.G.heroes.flatMap(h=>(h.deck||[]).map(c=>c.hid).filter(Boolean)))]:[];   // the homies this match's decks hold
const CAST={bramble:'bear',sow:'owl',mower:'frog',magpie:'mouse',drover:'elephant',thistle:'penguin',shade:'cat',foxglove:'fox',bamboo:'panda'};

const renderer=new THREE.WebGLRenderer({canvas:$('gl'),antialias:true,alpha:true,preserveDrawingBuffer:false,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
const scene=new THREE.Scene();scene.background=new THREE.Color(PAL.sky);
const cam=new THREE.PerspectiveCamera(30,1,.1,300),PITCH=58*Math.PI/180,focus=new THREE.Vector3();
let camDist=20,VW=1,VH=1,shake=0,ROT=false,hudRects=null;const SPAN=21,stage=document.getElementById('stage');   // the whole 21 tile width is always on screen; the camera only follows the hero up and down the map
// Landscape always. A touch screen held upright (the Web Lab frame, a phone browser) gets the stage turned a quarter turn, so the game is played with the phone on its side.
const px=e=>ROT?e.clientY:e.clientX,py=e=>ROT?innerWidth-e.clientX:e.clientY;
function resize(){ROT=innerHeight>innerWidth&&matchMedia('(pointer:coarse)').matches;VW=ROT?innerHeight:innerWidth;VH=ROT?innerWidth:innerHeight;
 stage.style.width=VW+'px';stage.style.height=VH+'px';stage.style.transform=ROT?`translateX(${innerWidth}px) rotate(90deg)`:'';stage.style.setProperty('--H',VH+'px');
 stage.classList.toggle('rot',ROT);stage.classList.toggle('short',VH<=480);stage.classList.toggle('narrow',VW<760);hudRects=null;
 // wider than 874 (a desktop window, a 1920x1080 recording): the kit already grows by VW/874; the fixed-size attack button, stick,
 // pause and score bar grow by the same factor, so the cards keep their places round the attack button. 874 and under: unchanged.
 {const big=Math.max(1,VW/874);stage.classList.toggle('wide',big>1);stage.style.setProperty('--big',big.toFixed(4));const hud=document.getElementById('hud');if(hud&&hud.classList.contains('hk-root'))hud.style.setProperty('--hk-s',VW/874)}
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
// field props made in Meshy the creeps' way (game/assets/props, provenance in work/props/provenance.json): every copy of a
// prop is merged into one mesh (2 draw calls with its outline); the few farms stay separate, each with its shadow and its
// pod as its own mesh with the pod pulse world.js seedPod() has. The code-built piece shows until the model arrives and
// stays if it fails to load. Size: the footprint width and height the code-built piece had (model width is 1.0). The
// textures are flat palette colours, so the material is the world pieces' own (no saturation lift, rim .45).
const PROP_SIZE={bush:{w:1.1,h:.85},farm:{w:1.6,d:1.6,h:.75,rx:-Math.PI/2,split:.3},rock:{w:.94,d:.94,h:.9},hedge:{w:1,d:1,h:.85}},propLoader=new GLTFLoader(),propCache={};
function loadProp(n){return propCache[n]||(propCache[n]=new Promise(ok=>propLoader.load(GP+'assets/props/'+n+'.glb',g=>{g.scene.updateMatrixWorld(true);let m=null;g.scene.traverse(o=>{if(o.isMesh&&!m)m=o});
 if(m){m.geometry.applyMatrix4(m.matrixWorld);m.geometry.computeBoundingBox()}ok(m)},undefined,()=>ok(null))))}
// which props use the Meshy model: ?props=0 none (all code-built), ?props=all every one, ?props=bush,farm,rock just those;
// with no switch PROP_ON (the ones judged same or better than the code-built piece, work/props/props.md)
const PROP_ON=['bush','farm','rock'],PQ=(location.search.match(/[?&]props=([\w,]*)/)||[])[1];
const PROPS=new Set(PQ===undefined?PROP_ON:PQ==='0'?[]:PQ==='all'?Object.keys(PROP_SIZE):PQ.split(','));
function swapProp(n,old,at,size){if(!PROPS.has(n))return;loadProp(n).then(m=>{if(!m)return;let src=m.geometry;
 if(size.rx){src=src.clone().rotateX(size.rx);src.computeBoundingBox();const b=src.boundingBox;src.translate(-(b.min.x+b.max.x)/2,-b.min.y,-(b.min.z+b.max.z)/2);src.computeBoundingBox()}   // a model made standing up, laid flat
 const bb=src.boundingBox,mw=bb.max.x-bb.min.x,mh=bb.max.y-bb.min.y,md=bb.max.z-bb.min.z,mx=new THREE.Matrix4(),q=new THREE.Quaternion(),up=new THREE.Vector3(0,1,0);
 const fit=p=>mx.compose(new THREE.Vector3(p.x,p.y||0,p.z),q.setFromAxisAngle(up,p.ry||0),new THREE.Vector3((p.sx||p.s)*size.w/mw,(p.sy||p.s)*size.h/mh,(p.sz||p.s)*(size.d||size.w)/(size.d?md:mw)));
 const mat=LOOK.toonMaterial({map:m.material.map,sat:1,contrast:1,rim:.45}),g=new THREE.Group();g.userData.kind=n;
 if(size.split){   // farms: one group each, base and pod split at split x height (triangle centre), blob shadow as seedPod() has
  const tri=src.toNonIndexed(),P=tri.attributes.position,ids=[[],[]];for(let i=0;i<P.count;i+=3)ids[(P.getY(i)+P.getY(i+1)+P.getY(i+2))/3>size.split*mh?1:0].push(i);
  const part=list=>{const o=new THREE.BufferGeometry();for(const k in tri.attributes){const A=tri.attributes[k],n_=A.itemSize,a=new A.array.constructor(list.length*3*n_);list.forEach((i,j)=>{for(let v=0;v<3;v++)for(let c=0;c<n_;c++)a[(j*3+v)*n_+c]=A.array[(i+v)*n_+c]});o.setAttribute(k,new THREE.BufferAttribute(a,n_))}return o};
  const base=part(ids[0]),pod=part(ids[1]);
  for(const p of at){const f=new THREE.Group(),b=new THREE.Group(),pd=new THREE.Group();b.add(new THREE.Mesh(base,mat));pd.add(new THREE.Mesh(pod,mat));LOOK.addOutline(b);LOOK.addOutline(pd);
   f.add(b,pd);fit(p).decompose(f.position,f.quaternion,f.scale);const sh=LOOK.blobShadow(1.3*.6,.2);sh.scale.set(1/f.scale.x,1/f.scale.z,1);f.add(sh);
   pd.userData.tick=t=>{const s=1+Math.sin(t*2.2)*.025;pd.scale.set(s,1/s,s)};g.add(f)}}   // the same pulse as world.js seedPod() (it runs where W.tickAll runs)
 else{const geo=mergeGeometries(at.map(p=>src.clone().applyMatrix4(fit(p))),false);geo.computeBoundingSphere();g.add(new THREE.Mesh(geo,mat));LOOK.addOutline(g)}
 old.parent.add(g);old.parent.remove(old)})}
function buildWorld(){if(built)return;built=true;const L=SB.H*K;
 world.add(W.ground(21,L+8));
 for(let i=0;i<SB.NL;i++){const x=wx(SB.laneX(i));world.add(W.link({x,z:wz(SB.Y1+20)},{x,z:wz(SB.Y0-20)},'path'));
  for(const t of[1,2]){const p=SB.spawnPt(t,i),pad=flat(new THREE.PlaneGeometry(SB.LW*K*.8,1.1),TEAM[t],.22);pad.position.set(wx(p.x),.012,wz(p.y));world.add(pad)}}
 const wallGrp={rock:new THREE.Group(),hedge:new THREE.Group()},wallAt={rock:[],hedge:[]};for(const k in wallGrp)world.add(wallGrp[k]);
 SB.WALLS.forEach((w,wi)=>{const nx=Math.max(1,Math.round((w.x1-w.x0)*K)),nz=Math.max(1,Math.round((w.y1-w.y0)*K)),sx=(w.x1-w.x0)*K/nx,sz=(w.y1-w.y0)*K/nz;
  for(let a=0;a<nx;a++)for(let b=0;b<nz;b++){const g=W.wall(w.kind,wi*31+a*7+b+1,0),x=wx(w.x0)+(a+.5)*sx,z=wz(w.y0)+(b+.5)*sz;g.scale.set(sx,1,sz);g.position.set(x,0,z);(wallGrp[w.kind]||world).add(g);
   if(wallAt[w.kind])wallAt[w.kind].push({x,z,sx,sz,sy:1,ry:((wi*7+a*3+b*5)%4)*Math.PI/2})}});
 for(const k in wallGrp)swapProp(k,wallGrp[k],wallAt[k],PROP_SIZE[k]);
 const bushGrp=new THREE.Group(),bushAt=[];world.add(bushGrp);
 SB.BUSHES.forEach((b,i)=>{for(const[ox,oz,sc]of[[0,0,1],[-.45,.3,.7],[.45,.25,.72],[0,-.45,.7]]){const g=W.bush(i*4+ox*7+oz*3+1),s=b.r*K*1.25*sc,x=wx(b.x)+ox*b.r*K,z=wz(b.y)+oz*b.r*K;g.scale.setScalar(s);g.position.set(x,0,z);bushGrp.add(g);bushAt.push({x,z,s,ry:bushAt.length*2.39})}});
 swapProp('bush',bushGrp,bushAt,PROP_SIZE.bush);
 const farmGrp=new THREE.Group(),farmAt=[];world.add(farmGrp);
 for(const f of SB.FARMS){const sc=.6,pod=W.seedPod();pod.scale.setScalar(sc);pod.position.set(wx(f.x),0,wz(f.y));farmGrp.add(pod);farmAt.push({x:wx(f.x),z:wz(f.y),s:1,ry:0});const pad=flat(new THREE.CircleGeometry(sc*1.9,28),GOLD,.3);pad.position.set(wx(f.x),.022,wz(f.y));world.add(pad);
  const lab=document.createElement('div');lab.className='lab farm';lab.innerHTML='<u></u>Seeds';$('labels').appendChild(lab);farmViews.push({x:f.x,y:f.y,h:sc*2.6,lab})}
 swapProp('farm',farmGrp,farmAt,PROP_SIZE.farm);
 for(const t of[1,2]){const p=SB.BASEPOS[t],g=W.base(TEAM[t]);g.position.set(wx(p.x),0,wz(p.y));if(t===2)g.rotation.y=Math.PI;world.add(g);
  const gun=flat(new THREE.RingGeometry(SB.CFG.baseGun.range*K-.06,SB.CFG.baseGun.range*K,72),TEAM[t],.35);gun.position.set(wx(p.x),.014,wz(p.y));world.add(gun);   // how far the base gun reaches
  const lab=document.createElement('div');lab.className='lab base';$('labels').appendChild(lab);
  const bar=BASEBAR?document.createElement('div'):null;if(bar){bar.className='lab bbar t'+t;bar.innerHTML='<em></em><i><s></s></i><b></b>';$('labels').appendChild(bar)}
  baseViews.push({t,p,lab,txt:'',g,bar,hp:null,hitT:-9})}
 TV.build({THREE,SB,W,TEAM,wx,wz,K,world,flat,labels:$('labels'),project,near:y=>Math.abs(wz(y)-focus.z)<10,kick:v=>{shake=Math.min(.2,shake+v)},fx:()=>fxOn?FX:null})}   // [towers]

// ---- heroes
let heroViews=[];
// hero or creep at a glance (work/herocreep/notes.md): a hero stands on a filled team disc with a thick ring and carries the
// big bar with his name; a creep has only the thin ring and a short thin bar that shows only once it is hurt. Me: green, my team: blue, foes: red.
// my own hero carries a small green pointer over his bar and name (ff-flow, play review item 5 "my hero is hard to find"; his size
// and look are the looks child's). ?memark=0 = build 20.
const MEMARK=!/[?&]memark=0/.test(location.search);
function heroMark(w,col){const g=new THREE.Group(),r=w*.74,mk=(geo,c,op)=>{const m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:c,transparent:op<1,opacity:op,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}));m.rotation.x=-Math.PI/2;m.position.y=.018;m.renderOrder=2;m.userData.noOutline=true;g.add(m)};
 mk(new THREE.CircleGeometry(r*.8,40),col,.3);mk(new THREE.RingGeometry(r*.8,r,48),col,1);mk(new THREE.RingGeometry(r,r*1.07,48),PAL.outline,1);g.userData.noOutline=true;return g}
const mySkin=id=>{try{return window.SBL_META&&SBL_META.skinOf?SBL_META.skinOf(id):null}catch(e){return null}};   // skins (ff-looks): my hero wears the saved skin, bots the default
async function makeHero(h){const mine=h===SB.G.me,H=await LOOK.loadHero(CAST[h.def.id]||'cat',{ring:false,skin:mine?mySkin(h.def.id):null});H.root.add(heroMark(H.size.width,mine?PAL.team.you:TEAM[h.team]));scene.add(H.root);
 const lab=document.createElement('div');lab.className='lab hero'+(mine&&MEMARK?' me':'');lab.innerHTML='<div class="pips"></div><div class="hp'+(mine?' me':h.team===SB.G.me.team?'':' foe')+'"><i></i></div><div class="nm"></div>';lab.lastChild.textContent=h.def.name;$('labels').appendChild(lab);
 const v={h,grp:H.root,body:H.body,s0:H.body.scale.x,rig:rigOf(H),by0:H.body.position.y,bz0:H.body.position.z,rx0:H.body.rotation.x,wk:0,ph:Math.random()*6,at:0,su:0,dd:0,cd:0,sd:Math.random()*9,lx:h.x,ly:h.y,face:h.team===1?Math.PI:0,lab,w:H.size.width,ht:H.size.height,fire:0,seeds:-1,hp:h.hp,pop:0};pose(v,1/60,0,SB.G.t);return v}   // posed before the first frame it is drawn in (never the bind pose)
// hero motion: a hand pose set in code on the shared skeleton, with the model's own clips laid over it where they look
// better. The clips move (Idle, Walk, Attack, Hit, Death) but are authored from the arms-out bind pose, so a clip is
// applied as its change from the bind pose on top of the hand pose (bone = rest * hand * clip): the arms stay down, a
// punch or a flinch plays over a walking body, and a clip and the hand pose cross-fade by weight.
const POSE_B=['Hips','Spine','Chest','Head','UpperArm_L','UpperArm_R','Forearm_L','Forearm_R','Thigh_L','Thigh_R','Shin_L','Shin_R','Tail'];
const UPPER=new Set(['Spine','Chest','Neck','Head','Shoulder_L','Shoulder_R','UpperArm_L','UpperArm_R','Forearm_L','Forearm_R','Hand_L','Hand_R']);
// per model: which clip plays for a state (null = hand pose), where the Attack clip starts so its strike lands on the
// frame the rules fire (core.js attack() fires the shot the moment it sets fireT), and how fast it plays
// Looked at in strips (work/heroanim): Idle and Walk clips barely move at the game camera (legs swing 0.45 rad, arms stay
// out), so the hand idle and walk stay. The one-arm Attack clip lifts the arm toward the head and hardly reads from above,
// so the hand thrust stays for the punchers; the two-arm clips (owl bow draw, penguin throw, panda push) read and play,
// with the hand body lunge under them. Hit plays the clip (upper body, 1.8x) over the hand flinch; Death plays the clip.
const ANIM_ALL={atk:null,hit:{gain:1.8},death:{speed:1.3}};
const ANIM={owl:{atk:{from:.33,speed:1.25,gain:1.3,up:true}},penguin:{atk:{from:.22,speed:1.25,gain:1.3,up:true}},panda:{atk:{from:.33,speed:1.25,gain:1.4,up:true}}};
const ANIM_Q=(location.search.match(/[?&]anim=(\w+)/)||[])[1];   // test override: anim=hand (no clips) or anim=clip (every clip, Idle and Walk too)
const qa=new THREE.Quaternion(),eu=new THREE.Euler(),qd=new THREE.Quaternion(),qe=new THREE.Quaternion(),QI=new THREE.Quaternion();
function rigOf(H){const rig={},rq=new THREE.Quaternion();H.root.updateMatrixWorld(true);H.root.getWorldQuaternion(rq).invert();
 H.root.traverse(o=>{if(o.isBone&&POSE_B.includes(o.name)&&!rig[o.name]){const w=new THREE.Quaternion();o.getWorldQuaternion(w).premultiply(rq);rig[o.name]={b:o,q0:o.quaternion.clone(),w,wi:w.clone().invert()}}});
 const a=new THREE.Vector3(),b=new THREE.Vector3();for(const sd of['L','R']){const u=rig['UpperArm_'+sd],f=rig['Forearm_'+sd];let dr=0;if(u&&f){u.b.getWorldPosition(a);f.b.getWorldPosition(b);dr=Math.atan2(a.y-b.y,Math.abs(b.x-a.x))}rig['dn'+sd]=Math.max(.25,1.12-Math.max(0,dr-.17))}
 // leg length (thigh + shin, world units at scale 1) for the walk: the step rate follows the ground speed so the feet do not slide
 {let fo=null;H.root.traverse(o=>{if(!fo&&o.isBone&&o.name==='Foot_L')fo=o});const t=rig.Thigh_L,s=rig.Shin_L;if(t&&s&&fo){t.b.getWorldPosition(a);s.b.getWorldPosition(b);const c=new THREE.Vector3();fo.getWorldPosition(c);rig.leg=a.distanceTo(b)+b.distanceTo(c)}
  const ht=H.size&&H.size.height||1;rig.amp=rig.leg?Math.max(.8,Math.min(1,1.25-1.7*rig.leg/ht)):.8}
 // the clips: one sampler per bone track (rotations; position only for Root, the other position keys are the bind pose)
 const bones={};H.body.traverse(o=>{if(o.isBone&&!bones[o.name])bones[o.name]=o});rig.rest=Object.values(bones).map(b=>({b,q:b.quaternion.clone(),p:b.position.clone()}));rig.cl={};
 for(const n in H.clips||{}){const c=H.clips[n],tr=[];for(const k of c.tracks){const i=k.name.lastIndexOf('.'),bn=k.name.slice(0,i),pr=k.name.slice(i+1),bo=bones[bn];if(!bo)continue;
   if(pr==='quaternion')tr.push({b:bo,q:k.createInterpolant(),qi:bo.quaternion.clone().invert(),up:UPPER.has(bn)});else if(pr==='position'&&bn==='Root')tr.push({b:bo,p:k.createInterpolant(),p0:bo.position.clone(),up:false})}
  rig.cl[n]={dur:c.duration,tr}}
 const id=H.info&&H.info.id;rig.set=ANIM_Q==='hand'?{}:Object.assign({},ANIM_ALL,ANIM[id]);if(ANIM_Q==='clip')Object.assign(rig.set,{idle:true,walk:true,atk:rig.set.atk||{from:.3,speed:1.25,gain:1}});
 rig.id=id;rig.ha=ANIM_Q==='hand'||ANIM_Q==='clip'||ANIM_Q==='old'?{}:(HA.CLIPS[id]||{});if(rig.ha.atk)rig.set.atk=null;rig.X={};rig.T={};return rig}
function setBone(r,n,x,y,z){const o=r[n];if(!o)return;qa.setFromEuler(eu.set(x,y,z,'XYZ'));o.b.quaternion.copy(o.q0).multiply(o.wi).multiply(qa).multiply(o.w)}
// lay clip `name` at time t over the bones as they are (hand pose), weight w; up: only the upper body
function layer(r,name,t,w,up){const c=r.cl&&r.cl[name];if(!c||w<=.001)return;t=Math.max(0,Math.min(t,c.dur));
 for(const k of c.tr){if(up&&!k.up)continue;const o=(k.q||k.p).evaluate(t);
  if(k.q){qd.set(o[0],o[1],o[2],o[3]).premultiply(k.qi);if(w<1)qd.copy(qe.copy(QI).slerp(qd,w));k.b.quaternion.multiply(qd)}
  else k.b.position.set(k.b.position.x+(o[0]-k.p0.x)*w,k.b.position.y+(o[1]-k.p0.y)*w,k.b.position.z+(o[2]-k.p0.z)*w)}}
// Each hero's walk and idle character (what reads from the match camera, from above): bob = bounce per step, lean = lean
// into the walk (grows with speed), swing = arm swing, twist = shoulders against hips, roll = rocking foot to foot, sway =
// idle weight shift, breath = idle breathing. 1 = the shared walk.
const HSTY={bear:{bob:1.3,lean:1,swing:.7,twist:1.3,roll:1,sway:1,breath:1},owl:{bob:1.2,lean:.8,swing:1,twist:.8,roll:.9,sway:.8,breath:1.2},
 frog:{bob:1.5,lean:1,swing:.9,twist:1,roll:1,sway:1,breath:1},mouse:{bob:1,lean:1.3,swing:1.1,twist:1,roll:.9,sway:.9,breath:1},
 elephant:{bob:.7,lean:.6,swing:.9,twist:.8,roll:1.4,sway:1.3,breath:1.3},penguin:{bob:.9,lean:.5,swing:.6,twist:.6,roll:1.8,sway:1.5,breath:1},
 cat:{bob:.8,lean:1.4,swing:1,twist:1.2,roll:.8,sway:.9,breath:1},fox:{bob:1,lean:1.1,swing:1.1,twist:1.2,roll:1,sway:1,breath:1},
 panda:{bob:.8,lean:.7,swing:.8,twist:.9,roll:1.4,sway:1.3,breath:1.4}},HST0={bob:1,lean:1,swing:1,twist:1,roll:1,sway:1,breath:1};
const R4OFF=(location.search.match(/[?&]r4off=([\w,]+)/)||[])[1]||'',R4=k=>!R4OFF.includes(k);   // test only: ?r4off=bob,lean,twist,head,ss,idle,turn puts a part back to round 3 (to measure each)
function pose(v,dt,sp,t){const h=v.h,r=v.rig,S=r.set||{},k=Math.min(1,dt*10),S0=HSTY[r.id]||HST0,St={bob:R4('bob')?S0.bob:1,roll:R4('bob')?S0.roll:1,lean:S0.lean,swing:R4('twist')?S0.swing:1,twist:R4('twist')?S0.twist:.78,sway:R4('idle')?S0.sway:0,breath:R4('idle')?S0.breath:0};
 if(!v.ck)v.ck={A:-1,H:-1,D:-1,W:0,wD:0};const ck=v.ck;
 if(v.fire<=0&&h.fireT>0){v.at=1;v.an=1;if(S.atk)ck.A=S.atk.from}if((h.supT||0)>v.cd+.2){v.su=1;v.cn=1}v.cd=h.supT||0;
 if(v.hitNew){v.hitNew=0;if(S.hit&&!(ck.H>=0&&ck.H<.18))ck.H=0}
 if(h.dead){if(S.death&&ck.D<0)ck.D=0}else ck.D=-1;
 const pwk=v.wk;v.wk+=((sp>12&&sp<900&&!h.dead?1:0)-v.wk)*k;v.ss=R4('ss')?Math.max(-.12,Math.min(.12,((v.ss||0)+(v.wk-pwk)*1.4)*Math.exp(-dt*7))):0;v.ph+=dt*(r.leg?Math.min(23,Math.max(6,6.2832*sp*K/(4*r.leg*Math.sin(r.amp)*.9))):Math.min(16,Math.max(7,sp*.06)));v.at=Math.max(0,v.at-dt/.34);v.su=Math.max(0,v.su-dt/.7);v.dd+=((h.dead?1:0)-v.dd)*Math.min(1,dt*7);   // v.ss: a stretch as he sets off, a squash as he stops
 const cA=r.cl.Attack,cH=r.cl.Hit,cD=r.cl.Death;
 if(ck.A>=0){ck.A+=dt*S.atk.speed;if(!cA||ck.A>=cA.dur)ck.A=-1}if(ck.H>=0){ck.H+=dt;if(!cH||ck.H>=cH.dur)ck.H=-1}if(ck.D>=0&&cD)ck.D=Math.min(cD.dur,ck.D+dt*S.death.speed);
 ck.wD+=((ck.D>=0?1:0)-ck.wD)*Math.min(1,dt*25);
 // the hand thrust: the rules fire on the frame fireT is set, so the arm is fully out 0.05 s later (2 to 3 frames, the
 // release), holds to 0.1 s and is back by 0.34 s, inside the shortest gap between shots (0.25 s) it restarts cleanly
 const tA=(1-v.at)*.34,a0=r.ha&&r.ha.atk?0:v.at>0?(tA<.05?Math.sin(tA/.05*Math.PI/2):Math.max(0,1-Math.pow(Math.max(0,tA-.1)/.24,1.4))):0;
 // hand-keyed clips (lanes/heroanim.js): the idle loop while standing, a walk overlay, the super cast. The cast takes
 // over from the idle and walk overlays; a shot (hand thrust or clip) takes the arms back from them while it plays.
 const HC=r.ha||{},X=HA.clear(r.X);let cw=0;
 if(HC.cast){const mine=SB.G&&h===SB.G.me&&aim&&aim.sup&&!aim.cancel&&!h.dead;if(mine){v.ah=(v.ah||0)+dt;v.ao=0}else if((v.ao=(v.ao||0)+dt)>.12)v.ah=0;
  if(v.cn){v.cn=0;v.cs=(v.ah||0)>=.1?HC.cast.rel-HC.cast.pre:0}
  if(v.cs>=0){v.cs+=dt;if(v.cs>=HC.cast.dur||h.dead)v.cs=-1}
  if(v.cs>=0){cw=Math.max(0,Math.min(1,v.cs/.04,(HC.cast.dur-v.cs)/.12));HA.addTo(X,HA.sample(HC.cast,v.cs,r.T),cw)}
  else if(mine&&v.ah>0){cw=Math.min(1,v.ah/.12);HA.addTo(X,HA.sample(HC.cast,Math.min(v.ah,HC.cast.rel-HC.cast.pre),r.T),cw)}}
 // the attack clip: the hit lands on the frame the rules fire (aimed first: the wind-up is held while aiming, the clip
 // starts 1 frame before the hit; a tap, auto-fire or a bot: it starts 0.03 s before the hit); the cast wins over it
 let aw2=0;if(HC.atk){const A=HC.atk,ma=SB.G&&h===SB.G.me&&aim&&!aim.sup&&!aim.cancel&&!aim.auto&&!h.dead;if(ma){v.aa=(v.aa||0)+dt;v.ab=0}else if((v.ab=(v.ab||0)+dt)>.12)v.aa=0;
  if(v.an){v.an=0;v.as=(v.aa||0)>=.1?A.hit-1/60:A.hit-.03}
  if(v.as>=0){v.as+=dt;if(v.as>=A.dur||h.dead)v.as=-1}
  if(v.as>=0){aw2=Math.max(0,Math.min(1,(A.dur-v.as)/.1))*(1-cw);HA.addSplit(X,HA.sample(A,v.as,r.T),aw2,1-v.wk)}
  else if(ma&&v.aa>0){aw2=Math.min(1,v.aa/.1)*(1-cw);HA.addSplit(X,HA.sample(A,A.wind,r.T),aw2,1-v.wk)}}
 v.aw=(v.aw||0)+((ck.A>=0?1:0)-(v.aw||0))*Math.min(1,dt*20);const ov=(1-cw)*(1-Math.max(a0,v.aw,aw2))*(1-v.dd);
 if(HC.idle)HA.addTo(X,HA.sample(HC.idle,t+v.sd,r.T),(1-v.wk)*ov);
 if(HC.walk)HA.addTo(X,HA.sample(HC.walk,v.ph/6.2832*HC.walk.dur,r.T),v.wk*ov);
 const sb=(n,x,y,z)=>{const e=X[n];if(e)setBone(r,n,x+e[0],y+e[1],z+e[2]);else setBone(r,n,x,y,z)},XB=X.Body||[0,0,0];
 const s=Math.sin(v.ph),c=Math.cos(v.ph),w=v.wk,br=HC.idle?0:Math.sin((t+v.sd)*2.2)*.05*(1-w),a=S.atk?0:a0,ab=S.atk?a0*.6:a0,u=HC.cast?0:v.su>0?Math.sin(Math.min(1,(1-v.su)*1.5)*Math.PI):0,hit=v.pop/.14,D=S.death?0:v.dd,wl=S.walk?0:w,ib=S.idle?0:1;
 for(const o of r.rest){o.b.quaternion.copy(o.q);o.b.position.copy(o.p)}
 sb('Hips',.05*wl-hit*.1,s*(R4('twist')?.22:.18)*St.twist*wl+ab*.25,-s*.05*wl+Math.sin((t+v.sd)*1.1)*.08*St.sway*(1-w)*ib);
 sb('Spine',.18*wl+br*ib+ab*.22-u*.3-hit*.3,-s*.1*wl+ab*.35,s*.07*wl);
 sb('Chest',br*ib,-s*(R4('twist')?.32*St.twist:.14)*wl+ab*.3,s*.04*wl);   // shoulders turn against the hips
 const hl=R4('head')?.7:0,hk=R4('head')?1:0;sb('Head',-.12*wl-br*2*ib+u*.35+hit*.25+(Math.abs(Math.cos(v.ph-hl))-.5)*(.1+.06*hk)*wl,-ab*.5+Math.sin(v.ph-hl)*(.08+.04*hk)*wl+Math.sin((t+v.sd)*.7)*.25*St.sway*(1-w)*ib,-Math.sin(v.ph-hl)*(.05+.01*hk)*wl);   // the head bobs and turns a beat after the body
 sb('UpperArm_L',s*(R4('twist')?.9:.75)*St.swing*wl+a*.5-u*.3,0,-(r.dnL-D*.7)+br*ib+u*2.3);
 sb('UpperArm_R',(-s*(R4('twist')?.9:.75)*St.swing*wl)*(1-a)-a*1.55-u*.3,0,(r.dnR-D*.7)-br*ib-u*2.3);
 sb('Forearm_L',0,-(.3+.45*wl+Math.max(0,-s)*.4*wl+a*.5)*(1-u),0);
 sb('Forearm_R',0,(.3+.45*wl+Math.max(0,s)*.4*wl)*(1-a)*(1-u),0);   // the elbow bends more as the arm swings forward
 const am=r.amp||.8;sb('Thigh_L',s*am*wl-ab*.25*(1-w),0,0);sb('Thigh_R',-s*am*wl+ab*.3*(1-w),0,0);   // thigh x > 0 swings the leg forward: the knee bends on the forward swing and each arm swings against its own leg (it was the other way round, a moonwalk with the arms in step with the legs)
 sb('Shin_L',Math.max(0,c)*1.1*wl,0,0);sb('Shin_R',Math.max(0,-c)*1.1*wl+ab*.3*(1-w),0,0);
 sb('Tail',-s*.1*w,(S.idle?0:Math.sin((t+v.sd)*3)*.3*(1-w))+s*.3*w,0);
 if(S.idle)layer(r,'Idle',(t+v.sd)%2,(1-w)*(1-ck.wD));
 if(S.walk&&r.cl.Walk){ck.W=(ck.W+dt*Math.max(.7,sp/120))%r.cl.Walk.dur;layer(r,'Walk',ck.W,w*(1-ck.wD))}
 if(ck.A>=0)layer(r,'Attack',ck.A,Math.min(1,(cA.dur-ck.A)/.15)*(1-ck.wD)*(S.atk.gain||1),S.atk.up||w>.3);
 if(ck.H>=0)layer(r,'Hit',ck.H,(1-ck.wD)*(S.hit.gain||1),true);
 if(cD&&ck.wD>.001)layer(r,'Death',Math.max(0,ck.D),ck.wD);
 // a hit also knocks the whole body back a step and tips it back (0.35 s), so it reads at the game camera
 const kb=ck.H>=0&&ck.H<.35?Math.sin(ck.H/.35*Math.PI)*(1-ck.wD):0;
 const br2=Math.sin((t+v.sd)*2.4)*(1-w)*(1-v.dd);v.stq=(Math.abs(c)-.55)*.16*wl+v.ss+br2*.035*St.breath;v.body.position.y=v.by0+(Math.abs(c)*(R4('bob')?.14:.11)*St.bob*wl+br2*.012*St.breath+u*.45+XB[0])*v.ht*(1-v.dd)+D*.12*v.ht;v.body.position.z=v.bz0+(ab*.28*(1-w*.5)-kb*.14+XB[1])*v.ht;v.body.rotation.x=v.rx0-D*1.45+wl*(R4('lean')?Math.min(1,sp/130)*.2*St.lean:.14)+kb*.3+XB[2];v.body.rotation.z=(s*(R4('bob')?.2:.17)*St.roll*wl+Math.sin((t+v.sd)*1.1)*.06*St.sway*(1-w)*ib)*(1-v.dd)}   // lean grows with speed; standing, the weight shifts slowly side to side   // the whole body leans into the walk and rocks onto each foot, bouncing on each step: the step reads from the top-down camera
// the 3 s of protection after coming back to life (ff-flow 2026-11-18, Claude's pick): build 20 blinked the body out 40 percent of
// the time, so the hero was gone right when the player looked for him. Now the body stays drawn inside a team-colour bubble, a ring
// pulses out from his feet, and both fade over the last half second. ?blink=1 is the build 20 blink.
const BLINK=/[?&]blink=1/.test(location.search);
function protMark(v,h){const on=h.invuln>0&&!h.dead;
 if(BLINK){v.body.visible=!(on&&SB.G.t*9%1<.4);return}v.body.visible=true;
 if(on&&!v.prot){const col=new THREE.Color(h===SB.G.me?PAL.team.you:TEAM[h.team]).lerp(new THREE.Color(0xffffff),.4),r=Math.max(v.w,v.ht*.8)*.62,g=new THREE.Group();g.userData.noOutline=true;
  const b=new THREE.Mesh(new THREE.SphereGeometry(r,28,18),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.2,depthWrite:false}));b.position.y=r*.8;b.renderOrder=3;
  const ring=new THREE.Mesh(new THREE.RingGeometry(r*.92,r,48),new THREE.MeshBasicMaterial({color:col,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=.03;ring.renderOrder=3;
  g.add(b,ring);v.grp.add(g);v.prot=g}
 if(!v.prot)return;v.prot.visible=on;if(!on)return;
 const f=Math.min(1,h.invuln/.5),p=(SB.G.t*1.5)%1,[b,ring]=v.prot.children;b.material.opacity=(.3+.08*Math.sin(SB.G.t*8))*f;ring.scale.setScalar(.7+p*1.3);ring.material.opacity=(1-p)*.95*f}
function tickHero(v,dt){const h=v.h,me=SB.G.me,vis=!(h.invisT>0&&h.team!==me.team);v.grp.visible=vis;
 const dx=h.x-v.lx,dy=h.y-v.ly,sp=Math.hypot(dx,dy)/Math.max(dt,.001);v.lx=h.x;v.ly=h.y;
 v.grp.position.set(wx(h.x),0,wz(h.y));
 let want=v.face;if(h.fireT>0||h.supT>0||(h===me&&aim&&!aim.cancel))want=Math.atan2(Math.cos(h.aimA),Math.sin(h.aimA));else if(sp>12&&sp<900)want=Math.atan2(dx,dy);
 let d=want-v.face;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;v.face+=d*Math.min(1,dt*(h.fireT>0||h.supT>0?30:aim&&h===me&&!aim.cancel?14:R4('turn')?9:14));v.grp.rotation.y=v.face;   // a shot or a cast turns the body fast: the rules release it on the same frame; aiming turns at the old speed; a walking turn eases over about 0.3 s
 pose(v,dt,sp,SB.G.t);
 {const w=d*Math.min(1,dt*14)/Math.max(dt,.001),tl=Math.max(-.2,Math.min(.2,-w*.03))*v.wk;v.tl=(v.tl||0)+(tl-(v.tl||0))*Math.min(1,dt*8);v.body.rotation.z+=v.tl}
 if(CASC)CASC.legs(v);   // walking into a turn the body leans to the inside of it (rot z > 0 tips toward the hero's right)
 v.fire=h.fireT||0;
 protMark(v,h);
 if(h.hp<v.hp-1&&!h.dead){v.pop=.14;v.hitNew=1;if(fxOn&&vis&&SB.G.t-(v.hitT||0)>.15){v.hitT=SB.G.t;FX.play('hero_hit',{x:wx(h.x),z:wz(h.y),element:'default'})}}v.hp=h.hp;
 if(fxOn&&v.dead!==undefined&&v.dead!==!!h.dead)FX.play(h.dead?'hero_down':'respawn',{x:wx(h.x),z:wz(h.y),element:h.dead?(HEL[h.def.id]||'default'):'seed',team:h.team});v.dead=!!h.dead;v.pop=Math.max(0,v.pop-dt);{const q=v.s0*(1+v.pop*1.6),st=v.stq||0;v.body.scale.set(q*(1-st*.5),q*(1+st),q*(1-st*.5))}   // squash on each footfall, stretch as the legs pass
 const top=project(wx(h.x),v.ht+.35,wz(h.y));v.lab.style.display=!h.dead&&vis?'':'none';v.lab.style.opacity=h.invisT>0?.5:1;v.lab.style.transform=`translate(${top.x}px,${top.y}px) translate(-50%,-100%)`;
 v.lab.children[1].firstChild.style.width=Math.max(0,h.hp/h.maxhp*100)+'%';
 if(v.seeds!==h.seeds){v.seeds=h.seeds;v.lab.firstChild.innerHTML='<u></u>'.repeat(Math.min(10,h.seeds))}}
const pv=new THREE.Vector3();// ?rec=1, for recording takes: no desktop key hints (Space, Click, card numbers) and the move stick's knob follows where the
// hero actually goes on screen, so a bot-played take shows the controls as a thumb would use them (Marketing, 2026-11-17).
const REC=/[?&]rec=1\b/.test(location.search),recS={x:0,y:0,p:null};if(REC)document.getElementById('stage').classList.add('rec');
function recStick(){const sl=document.getElementById('stickL');if(!sl||!SB.G||!SB.G.me)return;const me=SB.G.me,p=project(wx(me.x),0,wz(me.y)),R=sl.offsetWidth*.39;
 let tx=0,ty=0;if(recS.p&&!me.dead){const dx=p.x-recS.p.x,dy=p.y-recS.p.y,m=Math.hypot(dx,dy);if(m>.15){tx=dx/m*R;ty=dy/m*R}}recS.p=p;
 recS.x+=(tx-recS.x)*.25;recS.y+=(ty-recS.y)*.25;if(sl.firstChild)sl.firstChild.style.transform=`translate(${recS.x.toFixed(1)}px,${recS.y.toFixed(1)}px)`}
function project(x,y,z){pv.set(x,y,z).project(cam);return{x:(pv.x*.5+.5)*VW,y:(-pv.y*.5+.5)*VH}}

// ---- units: one instanced body + outline per kind, body and team (the circles version's models), one instanced team ring
const UMAX=200,USET=UNITS.sets();UNITS.init(scene,UMAX);
const ringGeo=new THREE.RingGeometry(.5,.6,18);ringGeo.rotateX(-Math.PI/2);   // thin: the thick ring and disc are the heroes' mark
const uDiscGeo=new THREE.CircleGeometry(.62,20);uDiscGeo.rotateX(-Math.PI/2);   // with ink outlines the team is a filled disc under the feet, not a thin ring
const DISC=/[?&]disc=1/.test(location.search);   // the team now sits on each creep's body (its team part), so the floor mark is the thin ring again; ?disc=1 shows the filled disc
const uRing=new THREE.InstancedMesh(DISC?uDiscGeo:ringGeo,new THREE.MeshBasicMaterial({color:0xffffff,depthWrite:false,transparent:DISC,opacity:DISC?.8:1}),UMAX*2);uRing.frustumCulled=false;uRing.count=0;scene.add(uRing);
const M=new THREE.Matrix4(),Q=new THREE.Quaternion(),P=new THREE.Vector3(),S=new THREE.Vector3(),C=new THREE.Color(),E3=new THREE.Euler();
// Creeps: where they are comes from the rules; how they move is drawn here. An attack is seen the moment the rules
// land it (the cooldown jumps back up): a fast lunge out, then a slower settle. A hit flashes the body white.
// Rigged creeps (their set has baked clips, lanes/units.js) play clips instead of the bend: walk while moving, the attack
// timed so its hit frame lands on the rules' hit (the windup starts when the cooldown falls under the hit time while the
// creep stands engaged; the rest plays after), a flinch when hurt, idle when standing, and death on a short-lived copy
// (the rules drop a dead creep at once).
const env=ta=>ta<0?0:ta<.07?ta/.07:Math.max(0,1-(ta-.07)/.26),ease=k=>k<0?0:k>1?1:1-(1-k)*(1-k);
let uPrev=new Set();const ghosts=[];
// homie flyers (a homie's own model on the flyer body): drawn smaller and lower than the shared creep flyers, so a tier 1 flyer reads no
// bigger than a tier 1 walker at the match camera (a unit raised toward the camera draws bigger). ?flyfix=0: as in the first build 9 join.
// homie juice (build 12, visual only: the rules, numbers and unit positions in core.js are untouched; ?juice=0 turns it all off;
// shared creeps and heroes never get it, so ?homies=0 is unchanged): a squash and stretch on each step of the walk clip (volume
// kept), a lunge toward the target in the wind-up to the hit frame (ranged and siege lean back, then forward), a short knock back
// when hit, a spawn pop 0.6 -> 1.1 -> 1, and breathing when standing.
const JUICE=!/[?&]juice=0/.test(location.search),JSQ=[.05,.055,.06,.065,.07];
function juice(u,s,t,mv,ti,w){const C=s.clips,o={y:1,fw:0,pop:1};if(!JUICE||!u.hid)return null;
 const W=C.walk,b=t-u._born;o.pop=b<.1?.6+5*b:b<.2?1.1-(b-.1):1;
 if(mv>.3&&W){const p=((t+u._s)/W.sec)%1;o.y=1+JSQ[ti]*Math.cos(p*12.566)*mv}                                  // two steps a walk cycle: tall at the top of each step, squat on landing
 else o.y=1+.02*Math.sin((t+u._s)*6.283/(2.2+.25*ti));                                                      // breathing
 const A=C.attack,k=A&&u.st&&u.st.atk?Math.min(1,u.st.atk/A.sec):1,ha=A?(A.hit!==undefined?A.hit:A.sec*.5)*k:0,back=u.ty==='R'||u.ty==='G';
 let wind=-1;if(A&&u.ty==='G'&&u.sgT!==undefined){const left=SB.SIEGE.every-u.sgT;if(left>0&&left<ha&&mv<.5)wind=1-left/ha}else if(A&&u.atkCd>0&&u.atkCd<ha&&mv<.5)wind=1-u.atkCd/ha;
 const g=s.b.geometry;if(!g.boundingBox)g.computeBoundingBox();const hW=Math.max(.5,g.boundingBox.max.y)*w;   // the drawn body height (model box under its scale)
 const L=.12*hW,since=t-u._at,ret=since>=0&&since<.25?1-ease(since/.25):0;                                  // lunge 15 percent of the body height
 if(wind>=0)o.fw=back?(wind<.6?-.6*L*(wind/.6):-.6*L+1.2*L*((wind-.6)/.4)):L*wind*wind;else if(ret>0)o.fw=(back?.6*L:L)*ret;
 if(u._fl>0)o.fw-=.11*hW*(u._fl/.12);                                                                     // knocked back about 3 CSS px at the match camera, gone in 0.12 s
 return o}
const FLYFIX=!/[?&]flyfix=0/.test(location.search),FLY={hover:.6,s:.74},flyK=(L,ti)=>FLYFIX&&ti===3&&L.kind>=3?FLY.s:1,flyY=(L,ti)=>FLYFIX&&L.kind>=3?FLY.hover:1.15;
// A homie hitting faster than its clip lasts (runners every 0.8 s against a 1.0 s clip) plays the clip faster (k), so the hit frame
// still lands on the rules' hit. A siege's throw (its sgT running up to SIEGE.every) winds up the same way; a tank plays its slam as it crashes.
function clipRow(s,u,t,mv){const LKk=LK(u).kind;const C=s.clips,A=C.attack,k=A&&u.st&&u.st.atk?Math.min(1,u.st.atk/A.sec):1,ha=A?(A.hit!==undefined?A.hit:A.sec*.5)*k:0,since=(t-u._at)/k;
 if(A&&since>=0&&since<(A.sec*k-ha)/k)return UNITS.row(C,'attack',ha/k+since);
 if(A&&u.ty==='G'&&u.sgT!==undefined){const left=SB.SIEGE.every-u.sgT;if(left>0&&left<ha&&mv<.5)return UNITS.row(C,'attack',(ha-left)/k)}
 else if(A&&u.atkCd>0&&u.atkCd<ha&&mv<.5)return UNITS.row(C,'attack',(ha-u.atkCd)/k);
 if(u._fl>0&&C.hit)return UNITS.row(C,'hit',.12-u._fl);
 return mv>.3?UNITS.row(C,'walk',(t+u._s)*(LKk===2?1.35:1)):UNITS.row(C,'idle',t+u._s)}
const ubars=domPool('ubar'),UBW=[15,19,19,19,26],UBH=[.75,1.05,.95,1.0,1.6];   // creep bar width (px) and height above the feet (tiles, times the body width) per body
function drawUnits(t){for(const k in USET)USET[k].n=0;let nr=0,nb=0;const now=new Set(),myT=SB.G.me.team;for(const u of SB.G.units){if(u.dead)continue;now.add(u);const L=LK(u),ti=Math.max(0,Math.min(4,L.tier-1)),s=UNITS.set(L.kind,ti,u.team,TEAM[u.team]);if(s.n>=UMAX)continue;
  if(u._x===undefined){u._x=u.x;u._y=u.y;u._f=u.team===1?Math.PI:0;u._s=Math.random()*6;u._cd=u.atkCd;u._hp=u.hp;u._born=t;u._at=-9;u._fl=0;u._mv=0}
  const dx=u.x-u._x,dy=u.y-u._y,sp2=dx*dx+dy*dy;u._x=u.x;u._y=u.y;u._mv+=((sp2>.02?1:0)-u._mv)*.2;
  if(sp2>.02){let d=Math.atan2(dx,dy)-u._f;while(d>Math.PI)d-=6.283;while(d<-Math.PI)d+=6.283;u._f+=d*.25}
  if(u.atkCd>u._cd+.4||(u.sgT!==undefined&&u._sg!==undefined&&u.sgT<u._sg-.5))u._at=t;u._cd=u.atkCd;u._sg=u.sgT;if(u.hp<u._hp-.5)u._fl=.12;u._hp=u.hp;u._fl=Math.max(0,u._fl-1/60);
  const w=s.w*1.5,ph=t+u._s,mv=u._mv,A=env(t-u._at),R=Math.max(0,1-(t-u._at)/.5),born=ease((t-u._born)/.22),pop=1+.22*Math.sin(Math.min(1,(t-u._born)/.3)*Math.PI);
  let y=0,sx=1,sy=1,rx=0,rz=0,fw=0,lean=0,sway=0,flap=0;
  let J=null;if(s.clips){if(ti===3)y=flyY(L,ti)+Math.sin(ph*2.4)*.08;if(ti===4&&A>.9&&Math.abs(wz(u.y)-focus.z)<7)shake=Math.min(.1,shake+.012);s.pose.setX(s.n,clipRow(s,u,t,mv));J=juice(u,s,t,mv,ti,w);if(J){sy=J.y;fw=J.fw}}   // rigged: the clip carries the motion (homies: plus the juice)
  else if(ti===0){const k=Math.abs(Math.sin(ph*(L.kind===2?7:4.5)))*mv;y=k*w*.16;sy=1+(k-.5)*.14*mv;sway=Math.sin(ph*4.5)*.05;lean=.95*A-.2*R*(1-A);fw=A*w*.4;sy*=1-.12*A}                 // grunt: hop, headbutt
  else if(ti===1){rz=Math.sin(ph*3.2)*.13*mv;y=Math.abs(Math.sin(ph*3.2))*w*.05*mv;sway=Math.sin(ph*3.2)*.07*mv;lean=.06+.9*A;fw=A*w*.25;sy=1-.2*A;sx=1+.14*A}                              // brute: waddle, slam
  else if(ti===2){y=Math.abs(Math.sin(ph*3.6))*w*.07*mv;sway=Math.sin(ph*3.6)*.05;lean=-.7*A+.25*R*(1-A);fw=-A*w*.22;sy=1-.28*A;sx=1+.2*A}                                                // splasher: recoil
  else if(ti===3){y=1.15+Math.sin(ph*2.4)*.12-A*.75;flap=Math.sin(ph*17)*.3;rx=.3+.5*A;lean=.4*A;fw=A*w*.5;sway=Math.sin(ph*2.4)*.05}                                                     // flyer: flap, dive
  else{const k=Math.sin(ph*1.9);y=Math.abs(k)*w*.05*mv;rz=k*.06*mv;sway=k*.04*mv;lean=.5*A;sy=1-.22*A+.08*R*(1-A);sx=1+.16*A;if(A>.9&&Math.abs(wz(u.y)-focus.z)<7)shake=Math.min(.1,shake+.012)} // colossus: stomp
  const sc=w*(J?J.pop:born*pop)*flyK(L,ti);u._dy=y;u._dsc=sc;P.set(wx(u.x)+Math.sin(u._f)*fw,y,wz(u.y)+Math.cos(u._f)*fw);Q.setFromEuler(E3.set(rx,u._f,rz,'YXZ'));S.set(sc*sx/Math.sqrt(sy),sc*sy,sc*sx/Math.sqrt(sy));M.compose(P,Q,S);s.b.setMatrixAt(s.n,M);s.o.setMatrixAt(s.n,M);
  if(window.JDBG&&u.hid){const g=s.b.geometry;if(!g.boundingBox)g.computeBoundingBox();u._dbg={x:P.x,y:P.y,z:P.z,bx:wx(u.x),bz:wz(u.y),sx:S.x,sy:S.y,lo:g.boundingBox.min.y,hi:g.boundingBox.max.y,fw,sq:J?J.y:1,t}}   // test only (tools/homies/juice_close.js): what was drawn
  s.anim.setXYZW(s.n,lean,sway,flap,u._fl/.12);s.n++;
  if(u.hp<u.maxhp*.98&&Math.abs(wz(u.y)-focus.z)<9){const b=ubars.get(nb++),p=project(wx(u.x),(ti===3?y:0)+w*UBH[ti]*born*1.5,wz(u.y)),c=u.team===myT?'ubar':'ubar foe';if(!b.firstChild)b.innerHTML='<i></i>';if(b.className!=='lab '+c)b.className='lab '+c;b.style.width=UBW[ti]+'px';b.firstChild.style.width=Math.max(0,u.hp/u.maxhp*100)+'%';b.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-100%)`}
  if(!s.glow){P.set(wx(u.x),.02,wz(u.y));Q.identity();S.setScalar((ti===3?w*.7:w)*born);M.compose(P,Q,S);uRing.setMatrixAt(nr,M);uRing.setColorAt(nr,C.set(TEAM[u.team]));nr++}}   // a creep with a soft glow ring (units.json "glow", lanes/units.js) skips the hard ring
 for(const u of uPrev)if(!now.has(u)&&u._x!==undefined){const L=LK(u),ti=Math.max(0,Math.min(4,L.tier-1)),s=UNITS.set(L.kind,ti,u.team,TEAM[u.team]);if(s.clips&&s.clips.death)ghosts.push({u,ti,t0:t,crash:u.hp>0&&!!s.clips.attack})}   // gone with health left = it crashed into the base: its attack from the hit frame, not a death
 uPrev=now;
 for(let i=ghosts.length-1;i>=0;i--){const g=ghosts[i],u=g.u,s=UNITS.set(LK(u).kind,g.ti,u.team,TEAM[u.team]),D=s.clips&&(g.crash?s.clips.attack&&{sec:s.clips.attack.sec-(s.clips.attack.hit||0)}:s.clips.death),a=t-g.t0;if(!D||a>D.sec+.45||s.n>=UMAX){ghosts.splice(i,1);continue}
  const GL=LK(u),sc=s.w*1.5*flyK(GL,g.ti)*Math.min(1,Math.max(0,1-(a-D.sec-.15)/.3));P.set(wx(u._x),g.ti===3?flyY(GL,g.ti)*Math.max(0,1-a/D.sec):0,wz(u._y));Q.setFromEuler(E3.set(0,u._f,0,'YXZ'));S.setScalar(sc);M.compose(P,Q,S);   // lie still a moment, then shrink away
  s.b.setMatrixAt(s.n,M);s.o.setMatrixAt(s.n,M);s.anim.setXYZW(s.n,0,0,0,a<.1?1:0);s.pose.setX(s.n,g.crash?UNITS.row(s.clips,'attack',(s.clips.attack.hit||0)+a):UNITS.row(s.clips,'death',a));s.n++}
 for(const k in USET){const s=USET[k];s.b.count=s.o.count=s.n;s.b.visible=s.o.visible=s.n>0;s.b.instanceMatrix.needsUpdate=s.o.instanceMatrix.needsUpdate=true;s.anim.needsUpdate=true;if(s.pose)s.pose.needsUpdate=true}
 ubars.end(nb);uRing.count=nr;uRing.instanceMatrix.needsUpdate=true;if(uRing.instanceColor)uRing.instanceColor.needsUpdate=true}

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
const BOOT=k=>{try{window.SBL_BOOT&&(k>=1?window.SBL_BOOT.done():window.SBL_BOOT.step(k))}catch(e){}};BOOT(.15);
let fxOn=false;try{await FX.init(THREE,scene,cam,{base:'./fx/',max:600});fxOn=true}catch(e){console.warn('effects did not load, plain shapes stay',e)}
BOOT(.45);
// each hero plays his own effects, themed to the animal he is (work/fx/heroes/looks.md): the def `<base>.<animal>` when it exists, else the shared base
const HEL={bramble:'bear',sow:'owl',mower:'frog',magpie:'mouse',drover:'elephant',thistle:'penguin',shade:'cat',foxglove:'fox',bamboo:'panda'},HX=(b,id)=>{const k=b+'.'+(HEL[id&&id.def?id.def.id:id]||''),d=FX.defs();return d&&d[k]?k:b},KEL=['thorn','spit','runner'],TSC=[0,1,1.3,1.1,1,1.8];
const ZFX={briar:'zone_briar',nursery:'zone_nursery',blades:'zone_blades',rally:'zone_rally',lure:'zone_lure',shelter:'zone_shelter'};   // by the super's key, never its on-screen name
const elOf=o=>o&&o.def?HEL[o.def.id]||'default':'default',near=y=>Math.abs(wz(y)-focus.z)<10,W2=(x,y)=>({x:wx(x),z:wz(y)});
let shotsLive=[],zonesLive=[],seedsPrev=[];const seenP=new WeakSet(),seenL=new WeakSet(),muzT=new WeakMap();
function fxReset(){FX.clear();shotsLive=[];zonesLive=[];seedsPrev=[]}
// where a creep's shot leaves its body: the muzzle point its model carries (units.json), turned toward the target
function muzzleOf(e,to){const L=LK(e),m=UNITS.meta(L.kind,L.tier-1),at=W2(e.x,e.y);if(!m||!m.muzzle)return at;const s=W.UNIT_WIDTH[L.tier-1]*1.5*(m.scale||1),dx=to.x-at.x,dz=to.z-at.z,d=Math.hypot(dx,dz)||1;return{x:at.x+dx/d*m.muzzle[2]*s,z:at.z+dz/d*m.muzzle[2]*s,y:m.muzzle[1]*s}}
function drawEvents(G){const E=G.ev;if(!E)return;if(fxOn)for(const e0 of E){if(!near(e0.y))continue;const e=e0.hid?Object.assign({},e0,LK(e0,1)):e0,el=KEL[e.kind]||'default',sc=TSC[e.tier]||1,at=W2(e.x,e.y);
   if(e.k==='uatk'){const to=W2(e.tx,e.ty);
    if(e.tier===3)FX.play('splasher_lob',{...muzzleOf(e,to),to,radius:46*K,element:el,team:e.team});
    else if(SB.KINDS[e.kind].range>60)FX.play('spit_shot',{...muzzleOf(e,to),to,element:el});
    else if(e.tier===4)FX.play('flyer_dive',{...at,to,element:el});
    else{if(e.tier===5)FX.play('colossus_stomp',{...at,radius:(SB.KINDS[e.kind].range+30)*K,element:'dust'});FX.play('creep_hit',{...at,to,dir:Math.atan2(e.ty-e.y,e.tx-e.x),element:el,scale:sc*.62})}}   // .62: the slash stays smaller than the body it lands on, so the creeps' own motion reads in a clump
   else if(e.k==='udie')FX.play(e.tier===5?'colossus_split':'creep_death',{...at,element:el,scale:sc,radius:.7});
   else if(e.k==='spawn'){const sp=SB.spawnPt(e.team,e.lane);if(Math.abs(sp.y-e.y)<40)FX.play('summon_arrive',{...at,y:3.5,to:{...at,y:0},element:el,team:e.team,scale:sc})}}
 E.length=0}
function drawFx(G,me){projs.end(0);balls.end(0);
 // hero shots: a painted head with a trail while it flies, a flash where it left, a hit or a fizzle where it ended
 for(const p of G.projs)if(!seenP.has(p)){seenP.add(p);const el=elOf(p.owner);shotsLive.push(p);FX.attach(HX('shot_trail',p.owner),()=>p.left>0?W2(p.x,p.y):null,{element:el,dir:Math.atan2(p.vy,p.vx)});
   const o=p.owner||p;if(muzT.get(o)!==G.t){muzT.set(o,G.t);FX.play(HX('hero_muzzle',p.owner),{...W2(p.x,p.y),dir:Math.atan2(p.vy,p.vx),element:el})}}
 for(let i=shotsLive.length-1;i>=0;i--){const p=shotsLive[i];if(p.left>0)continue;shotsLive[i]=shotsLive[shotsLive.length-1];shotsLive.pop();if(near(p.y))FX.play(HX(p.hit&&p.hit.size?'shot_hit':'shot_fizzle',p.owner),{...W2(p.x,p.y),dir:Math.atan2(p.vy,p.vx),element:elOf(p.owner)})}
 // lobbed things: the arc, the landing spot at its real radius, the blast
 for(const l of G.lobs){if(l.t<.04&&Math.hypot(l.x-me.x,l.y-me.y)<l.r+40)shake=Math.min(.12,shake+.05);if(seenL.has(l))continue;seenL.add(l);
  FX.play(HX(l.big?'seed_charge':'hero_lob',l.owner),{...W2(l.sx,l.sy),to:W2(l.x,l.y),radius:l.r*K,travel:l.max,duration:l.max,element:elOf(l.owner),team:l.team})}
 // zones on the ground: painted moving surfaces at the real radius, until the rules end them
 let nz=0;for(const z of G.zones){if(!z._fx){z._fx=FX.play(HX(ZFX[z.key]||'puddle',z.owner),{...W2(z.x,z.y),radius:z.r*K,duration:z.max,arm:z.arm,team:z.team,element:elOf(z.owner)})||{stop(){}};zonesLive.push(z)}
  if(z.label){const el=zlabs.get(nz++),p=project(wx(z.x),.1,wz(z.y));if(el.textContent!==z.label)el.textContent=z.label;el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`}}
 zlabs.end(nz);for(let i=zonesLive.length-1;i>=0;i--){const z=zonesLive[i];if(z.dur>0&&G.zones.includes(z))continue;z._fx.stop&&z._fx.stop();zonesLive[i]=zonesLive[zonesLive.length-1];zonesLive.pop()}
 // seeds picked up (a seed that was there last frame and is gone)
 {const now=new Set(G.seeds);for(const s of seedsPrev)if(!now.has(s)&&near(s.y))FX.play('seed_pickup',{...W2(s.x,s.y),element:'seed'});seedsPrev=G.seeds.slice()}
 // what the rules flagged this step: cones, the base gun, hero spells; the few plain rings left are match events (level up, base awake)
 let nt=0;const skipT=TEXTCAP?textSkip(G):null;for(const f of G.fx){const k=Math.max(0,Math.min(1,f.life/(f.max||.8)));
  if(!seenFx.has(f)){seenFx.add(f);const at=W2(f.x,f.y);
   if(f.k==='c')FX.play(HX(f.src==='mower'?'hero_cone_blast':'hero_cone_slash',f.src),{...at,dir:f.a,radius:f.r*K,half:f.half,element:HEL[f.src]||'default',team:f.team});
   else if(f.k==='l'){const b=G.base[1].x===f.x&&G.base[1].y===f.y?G.base[1]:G.base[2].x===f.x&&G.base[2].y===f.y?G.base[2]:null;
    if(b)FX.play('base_shot',{...at,to:W2(f.x2,f.y2),element:'seed',team:b.team});else if(f.col==='#cecbf6')FX.play(HX('heist','magpie'),{...at,to:W2(f.x2,f.y2),radius:220*K,element:HEL.magpie})}
   else if(f.k==='r'){f._own=false;
    if(f.r===60&&f.max===.3)FX.play('base_hit',{x:wx(f.x),z:wz(f.y)-.6,element:'seed',team:f.col==='#378add'?1:2});
    else if(f.r===90&&f.col==='#afa9ec')FX.play(HX('vanish','shade'),{...at,radius:90*K,element:HEL.shade});
    else if(f.r===22&&f.col==='#f0997b')FX.play('seed_pickup',{...at,element:'fox'});
    else if(f.r===26&&f.col==='#fac775')FX.play('seed_pickup',{...at,element:'seed'});
    else if(f.r===16&&f.col==='#c0dd97')FX.play('seed_pickup',{...at,element:'heal'});
    else if(f.max===.35||f.max===.45||f.max===.15||f.r===46||f.r===220||f.col==='#fff');   // a death, a summon, a wall hit, a splash, the heist ring, a lob landing: their effects are played from the event
    else f._own=true}
   else if(f.k==='t'){f._ox=(Math.random()-.5)*1.3;f._oy=Math.random()*.5;
    {let n=0;for(const o of G.fx)if(o!==f&&o.k==='t'&&o._oy!==undefined&&o.life>(o.max||.8)-.6&&Math.abs(o.x-f.x)<80&&Math.abs(o.y-f.y)<80)n++;if(n){f._oy=(n%4)*.8;f._ox=(n%2?1:-1)*.5}}   // numbers landing together stack upward instead of printing on top of each other ("670670")
    if(f.t[0]==='+')FX.play('seed_pickup',{...at,element:'heal'})}}   // numbers from hits that land together fan out so they can be read
  if(f.k==='r'&&f._own)ringAt(f.x,f.y,f.r*(1.15-k*.4),f.col,k);
  else if(f.k==='t'&&!(skipT&&skipT.has(f))){const el=texts.get(nt++),p=project(wx(f.x)+(f._ox||0),2.1+(f._oy||0)+(1-f.life/.8)*1.1,wz(f.y));if(el.textContent!==f.t)el.textContent=f.t;el.style.color=f.col;el.style.opacity=k;
   // ff-flow: a name or number near the side of the map stays whole on screen (667x375 cut "Pupil" to "Pup" at the right edge)
   if(el._tw!==f.t){el._tw=f.t;el._w=el.offsetWidth||40}p.x=Math.min(VW-el._w/2-4,clampX(p.x,el._w+8));
   el.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`}}
 texts.end(nt)}
// floating words (ff-flow, play review items 4 and 10): the same words floating more than once at a time ("level 5: attack up" for
// three heroes, two "Kingfisher") show once, the copy nearest my hero; and at most two words float within 110 of my hero, the
// newest. Numbers are never merged. ?textcap=0 = build 20.
const TEXTCAP=!/[?&]textcap=0/.test(location.search);
function textSkip(G){const me=G.me,skip=new Set(),best=new Map(),near=[];
 for(const f of G.fx){if(f.k!=='t'||!/[a-z]/i.test(f.t))continue;const d=Math.hypot(f.x-me.x,f.y-me.y),o=best.get(f.t);
  if(o&&o.d<=d)skip.add(f);else{if(o)skip.add(o.f);best.set(f.t,{f,d})}if(d<110&&!me.dead)near.push(f)}
 near.filter(f=>!skip.has(f)).sort((a,b)=>b.life/(b.max||.8)-a.life/(a.max||.8)).slice(2).forEach(f=>skip.add(f));return skip}
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
 // aim preview: the real reach and the real area. A shot (and Magpie's dash) stops at the first wall as the rules stop it; a lob flies over.
 // Not drawn while a drag back to the middle has cancelled the shot.
 if(aim&&!me.dead&&!aim.cancel){const d=aim.sup?me.def.sup:me.def.atk,a=aim.a,r=d.range||d.r||200,col=aim.sup?GOLD:0xffffff;
  if(d.shape==='cone'){coneAt(me.x,me.y,a,d.half||.6,r,col,.42)}
  else if(d.shape==='line'){const L=reach(me.x,me.y,a,r),ex=me.x+Math.cos(a)*L,ey=me.y+Math.sin(a)*L;strip(strips.get(nS++),me.x,me.y,ex,ey,(d.w||10)*2*K+.24,col,.45);ringAt(ex,ey,(d.w||10)+10,col,.9,.06)}
  else if(d.shape==='circle'){const dd=Math.min(r,aim.d);discAt(me.x+Math.cos(a)*dd,me.y+Math.sin(a)*dd,d.r||60,col,.38);ringAt(me.x+Math.cos(a)*dd,me.y+Math.sin(a)*dd,d.r||60,col,.95,.06);ringAt(me.x,me.y,r,col,.45)}
  else if(d.shape==='self')discAt(me.x,me.y,d.r||200,col,.3);
  if(aim.sup&&me.def.sup.key==='heist'){const L=reach(me.x,me.y,a,r),ex=me.x+Math.cos(a)*L,ey=me.y+Math.sin(a)*L;ringAt(ex,ey,220,col,.6,.06)}}
 rings.end(nR);discs.end(nD);strips.end(nS);cones.end(nC);chevs.end(nV)}

// ---- sound: one player for every cue (lanes/sound.js; ids, tiers and levels in lanes/sfx/cues.json)
// Settings (meta.js) switch effects and music; the menu flow plays the result stinger on its result screen (menu.js)
try{window.SBL_META&&window.SBL_META.load()}catch(e){}   // saved settings before the player starts (menu.js loads it again)
const SET=(window.SBL_META&&window.SBL_META.state&&window.SBL_META.state.settings)||{},MENU_FLOW=!!window.SBL_META&&!/[?&]nomenu\b/.test(location.search);
const SND=window.SBL_SOUND.create({base:'sfx/',music:'music/',sound:SET.sound!==false,music_on:SET.music!==false});let soundOn=false;window.SBL_SOUND.player=SND;
// what main.js asks for by name, as cue ids; a summon tap is answered by the summon itself (the tap click stays quiet after my own sound).
// match start: the match loop; match over: the loop fades, and the stinger plays (here without the menu, on the result screen with it)
function playS(k){if(k==='match_start'){SND.music.set('match');SND.music.preload('match_late','stinger_win','stinger_lose')}
 if(k==='win'||k==='lose'||k==='draw'){const G=SB.G;if(G){if(G._endSnd)return 'once';G._endSnd=1}SND.music.set(null);if(k!=='draw'){if(MENU_FLOW)return 'menu';SND.music.stinger(k==='win'?'stinger_win':'stinger_lose',null);if(SND.tracks['stinger_'+k])return 'stinger'}}   // a draw has no music stinger: its own short sting on the stamp
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
// how far a straight shot from x,y at angle a gets before the first wall or the map edge (the rules end a shot there), at most r
function reach(x,y,a,r){const c=Math.cos(a),s=Math.sin(a);if(c)r=Math.min(r,(c>0?SB.W-x:x)/Math.abs(c));if(s)r=Math.min(r,(s>0?SB.H-y:y)/Math.abs(s));r=Math.max(0,r);
 if(!SB.blocked(x,y,x+c*r,y+s*r))return r;let lo=0,hi=r;for(let i=0;i<12;i++){const m=(lo+hi)/2;if(SB.blocked(x,y,x+c*m,y+s*m))hi=m;else lo=m}return lo}
const HOLD_ATK=.25;function fire(a,d){I.fireA=a;I.fireD=d;I.fire=true}
function castSup(a,d){const me=SB.G.me,sp=me.def.sup,r=sp.range||0,q=sp.shape==='circle'?Math.min(r,d):Math.max(60,r);SB.castSuper(me,me.x+Math.cos(a)*q,me.y+Math.sin(a)*q)}
// a card that costs more than the seeds carried shakes, and so do the seeds, with the missing ones lit red: the cost is in seeds
function doSummon(slot){const G=SB.G;if(!G||G.over||paused)return;const el=$('hand').children[slot];if(!el)return;if(!SB.playCard(G.me,slot)){el.animate([{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'none'}],{duration:160});lackSeeds(G.me,slot);SND.play('ui_deny',{ui:true});return}playS('button_tap');coach.summoned=true;drawHud()}
function lackSeeds(me,slot){const c=me.hand[slot];if(!c)return;if(LB>=5){const n=$('seedNum');if(n){n.classList.remove('lack');void n.offsetWidth;n.classList.add('lack')}}const need=SB.costOf(c.tier),s=$('seeds');drawHud();[...s.children].forEach((u,i)=>u.classList.toggle('miss',i>=me.seeds&&i<need));s.classList.remove('lack');void s.offsetWidth;s.classList.add('lack');clearTimeout(lackSeeds.h);lackSeeds.h=setTimeout(()=>{s.classList.remove('lack');for(const u of s.children)u.classList.remove('miss')},650)}
function pickLane(l){const G=SB.G;if(!G||G.over||paused)return;SB.setLane(G.me,l);coach.laned=true;drawHud()}
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
// touch: the left half of the screen is a floating move stick; attack and super are drag-to-aim buttons, Brawl Stars' way: a tap fires at the
// nearest enemy, a drag aims and the release fires, dragging back to the middle cancels. Each button keeps its own finger (pointerId) and its own aim.
const stick={id:null,ox:0,oy:0,x:0,y:0},sl=$('stickL');
gl.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'||!SB.G||stick.id!==null||px(e)>VW*.5)return;stick.id=e.pointerId;stick.ox=px(e);stick.oy=py(e);stick.x=stick.y=0;sl.style.left=(px(e)-sl.offsetWidth/2)+'px';sl.style.bottom=(VH-py(e)-sl.offsetHeight/2)+'px'});
addEventListener('pointermove',e=>{if(e.pointerId!==stick.id)return;let dx=px(e)-stick.ox,dy=py(e)-stick.oy;const m=Math.hypot(dx,dy),R=46;if(m>R){dx*=R/m;dy*=R/m}stick.x=dx/R;stick.y=dy/R;sl.firstChild.style.transform=`translate(${dx}px,${dy}px)`});
const endStick=e=>{if(e.pointerId!==stick.id)return;stick.id=null;stick.x=stick.y=0;sl.firstChild.style.transform='';sl.style.left='';sl.style.bottom=''};addEventListener('pointerup',endStick);addEventListener('pointercancel',endStick);
// px: a drag past DZ aims by hand, back inside CANCEL cancels, FULL is full reach for a lobbed shot. The drag is kept as a screen vector and turned
// into a world direction through the camera every frame (aimOf), so the shot leaves the hero the way the thumb went on screen (the ground is seen
// at 58 degrees: the raw screen angle was up to 4 degrees off on the diagonals). The knob follows the thumb in a circle, never a square.
const DZ=14,CANCEL=10,FULL=64;
function aimOf(me,a,r){const h=project(wx(me.x),0,wz(me.y)),n=Math.hypot(a.dx,a.dy)||1,g=groundAt(h.x+a.dx/n*90,h.y+a.dy/n*90);return{a:Math.atan2(g.y-me.y,g.x-me.x),d:r*a.k}}
function dragButton(el,sup){let id=null,ox=0,oy=0,my=null,hist=[];
 const knob=(dx,dy)=>{const m=Math.hypot(dx,dy),T=el.offsetWidth*.32,k=m>T?T/m:1;el.firstElementChild.style.transform=dx||dy?`translate(${dx*k}px,${dy*k}px)`:''};
 el.addEventListener('pointerdown',e=>{soundOn=true;if(!SB.G||id!==null||paused)return;e.preventDefault();id=e.pointerId;try{el.setPointerCapture(id)}catch(_){}ox=px(e);oy=py(e);hist=[];el.classList.add('on');const me=SB.G.me,t=autoAim(me,(sup?me.def.sup:me.def.atk).range||200);aim=my={sup,a:t.a,d:t.d,auto:true,touch:true,dx:0,dy:0,k:1,t0:performance.now(),held:0}});
 el.addEventListener('pointermove',e=>{if(e.pointerId!==id||!my)return;const dx=px(e)-ox,dy=py(e)-oy,m=Math.hypot(dx,dy);knob(dx,dy);
  if(my.auto){if(m>DZ)my.auto=false}else my.cancel=m<CANCEL;
  if(!my.auto&&!my.cancel){my.dx=dx;my.dy=dy;my.k=Math.min(1,m/FULL);hist.push([e.timeStamp,dx,dy,my.k]);if(hist.length>16)hist.shift()}aim=my});
 const up=e=>{if(e.pointerId!==id)return;id=null;el.classList.remove('on');knob(0,0);const a=my;my=null;if(aim===a)aim=null;if(!a||e.type!=='pointerup'||a.cancel||!SB.G||paused)return;if(!sup&&a.held)return;   // a held attack already fired while held: lifting adds no shot
  // a thumb rolls a few pixels as it lifts: when the last 50 ms moved less than 8 px, the aim held before them is the one fired (a flick keeps its end)
  if(!a.auto&&hist.length>1){const L=hist[hist.length-1];for(let i=hist.length-2;i>=0;i--)if(L[0]-hist[i][0]>=50||i===0){if(Math.hypot(L[1]-hist[i][1],L[2]-hist[i][2])<8&&Math.hypot(hist[i][1],hist[i][2])>DZ)[,a.dx,a.dy,a.k]=hist[i];break}}
  const me=SB.G.me,d=sup?me.def.sup:me.def.atk,r=d.range||200,t=a.auto?autoAim(me,r):aimOf(me,a,r);if(sup)castSup(t.a,t.d);else fire(t.a,d.shape==='circle'?t.d:r)};
 el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);el.addEventListener('lostpointercapture',up)}
dragButton($('btnAtk'),false);dragButton($('btnSup'),true);
$('lanes').addEventListener('pointerdown',e=>{e.preventDefault();soundOn=true;const r=e.currentTarget.getBoundingClientRect();pickLane(SB.laneOf((ROT?(e.clientY-r.top)/r.height:(e.clientX-r.left)/r.width)*SB.W))});
function readInput(){const me=SB.G.me;let mx=(keys.d||keys.arrowright?1:0)-(keys.a||keys.arrowleft?1:0),my=(keys.s||keys.arrowdown?1:0)-(keys.w||keys.arrowup?1:0);
 if(stick.id!==null){mx=stick.x;my=stick.y}const m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m}if(m<.18){mx=my=0}I.mx=mx;I.my=my;
 I.aimA=null;if(aim){if(aim.mouse){const g=groundAt(mouse.x,mouse.y);aim.a=Math.atan2(g.y-me.y,g.x-me.x);aim.d=Math.hypot(g.x-me.x,g.y-me.y)}
  else if(aim.touch&&!aim.cancel){const r=(aim.sup?me.def.sup:me.def.atk).range||200,t=aim.auto?autoAim(me,r):aimOf(me,aim,r);aim.a=t.a;aim.d=t.d}I.aimA=aim.a}
 else if(mouse.seen){const g=groundAt(mouse.x,mouse.y);I.aimA=Math.atan2(g.y-me.y,g.x-me.x);if(mouse.down)fire(I.aimA,Math.hypot(g.x-me.x,g.y-me.y))}
 else if(mx||my)I.aimA=Math.atan2(my,mx)
 // build 15 (his "for atttack it should be automatic if u hold it as u may wanna keep attacking"): the attack button held for HOLD_ATK s
 // keeps attacking each time a shot is ready. Build 16 (his "ur auto attack should happen when u drag in auto so it jus keeps going"):
 // also while dragging, at the dragged aim; a quick drag (under HOLD_ATK s) still fires once on release, dragging back to the middle cancels
 if(aim&&aim.touch&&!aim.sup&&!aim.cancel&&aim.t0&&performance.now()-aim.t0>=HOLD_ATK*1000&&me.ammo>=1&&!(me.atkCd>0)&&!me.dead){const d=me.def.atk;fire(aim.a,d.shape==='circle'?aim.d:(d.range||200));aim.held++}}

// ---- HUD: seeds carried, the lane picker (a small live map), the three creeps in hand and the next one
const fmt=t=>{t=Math.max(0,Math.ceil(t));return Math.floor(t/60)+':'+String(t%60).padStart(2,'0')};let hudT=0,lastTick=99,hudCards=[],hudSeeds=-1,hudRectN=0;
const unitPics={};UNITS.load(GP+'assets/units/',()=>{for(const k in unitPics)delete unitPics[k];hudCards=[]});
function unitPic(kind,ti){const key=kind+'_'+ti;if(unitPics[key])return unitPics[key];const sc=new THREE.Scene();LOOK.addLights(sc);const body=UNITS.single(kind,ti,PAL.team.blue);body.userData.tick=null;const w=W.UNIT_WIDTH[ti];
 sc.add(body);body.rotation.y=.5;const bx=new THREE.Box3().setFromObject(body),h=Math.max(.3,bx.max.y-bx.min.y),cy=(bx.max.y+bx.min.y)/2,c=new THREE.PerspectiveCamera(26,1,.05,50),d=Math.max(h,w*1.2)*2.6;
 c.position.set(0,cy+h*.35,d);c.lookAt(0,cy,0);const bg=scene.background;renderer.setSize(112,112,false);LOOK.setOutlineViewport(112,112);renderer.setClearColor(0,0);renderer.render(sc,c);const url=gl.toDataURL('image/png');resize();return unitPics[key]=url}
// hand slots keep a fixed label (Card 1..3) for the iOS test taps; the creep's own name is on the card
function buildDock(){const el=$('hand');el.innerHTML='';for(let i=0;i<SB.HAND;i++){const b=document.createElement('div');b.className='card';b.innerHTML='<img alt=""><kbd>'+(i+1)+'</kbd><em></em><span><small></small><b></b></span>';b.setAttribute('role','button');b.setAttribute('aria-label','Card '+(i+1));if(LB===3)cardDrag(b,i);else if(LB===8)cardDrag8(b,i);else b.addEventListener('pointerdown',e=>{e.preventDefault();soundOn=true;doSummon(i)});b.addEventListener('animationend',e=>{if(e.target===b)b.classList.remove('ready','deal')});el.appendChild(b)}}
// what a card shows: the creep's picture, its body and kind, its seed cost; redrawn only when the slot holds a new card
function drawCards(me){if(KIT)return kitCards(me);const els=$('hand').children,cards=me.hand.concat([SB.nextCard(me)]);
 cards.forEach((c,i)=>{if(!c)return;const el=i<SB.HAND?els[i]:$('next'),key=c.hid||c.kind+'_'+c.tier;if(hudCards[i]!==c||el.dataset.k!==key){const fresh=hudCards[i]!==undefined&&hudCards[i]!==c;hudCards[i]=c;el.dataset.k=key;
  {const L=LK(c);el.querySelector('img').src=(LB===8&&tokenPic(c))||L.pic||unitPic(L.kind,L.tier-1)}el.querySelector('em').textContent=SB.costOf(c.tier);
  if(i<SB.HAND){el.querySelector('b').textContent=c.hid?SB.HOMIES[c.hid].name:SB.BODIES[c.tier];el.querySelector('small').textContent=c.hid?SB.TYPES[SB.HOMIES[c.hid].type].name:SB.KINDS[c.kind].name;if(fresh){el.classList.remove('deal');void el.offsetWidth;el.classList.add('deal')}}}
  if(i<SB.HAND){const off=!SB.canPlay(me,i);if(el.classList.contains('off')&&!off){el.classList.remove('ready');void el.offsetWidth;el.classList.add('ready')}el.classList.toggle('off',off)}})}
const lc=$('lanes'),lx=lc.getContext('2d');
function drawLanes(){const G=SB.G,me=G.me,w=lc.width,h=lc.height,sx=w/SB.W,sy=h/SB.H;lx.clearRect(0,0,w,h);
 for(let i=0;i<SB.NL;i++){const x0=SB.laneL(i)*sx,x1=SB.laneR(i)*sx,on=i===me.lane;lx.fillStyle=on?'#4c6b55':'#2f4237';lx.fillRect(x0,0,x1-x0,h);
  if(on){lx.strokeStyle='#ffc83d';lx.lineWidth=5;lx.strokeRect(x0+2.5,2.5,x1-x0-5,h-5);lx.fillStyle='#ffc83d';lx.beginPath();lx.moveTo((x0+x1)/2,h-30);lx.lineTo((x0+x1)/2+12,h-12);lx.lineTo((x0+x1)/2-12,h-12);lx.fill()}}
 lx.fillStyle='#16202a';for(const wl of SB.WALLS)lx.fillRect(wl.x0*sx,wl.y0*sy,(wl.x1-wl.x0)*sx,(wl.y1-wl.y0)*sy);
 for(const u of G.units){if(u.dead)continue;lx.fillStyle=u.team===1?'#5fb0ff':'#ff6b6b';const r=2.5+u.tier*.9;lx.fillRect(u.x*sx-r,u.y*sy-r,r*2,r*2)}
 for(const b of[G.base[1],G.base[2]]){lx.fillStyle=b.team===1?'#2a8cff':'#ff4d4d';lx.fillRect(b.x*sx-16,b.y*sy-5,32,10)}
 for(const hh of G.heroes){if(hh.dead||(hh.invisT>0&&hh.team!==me.team))continue;lx.beginPath();lx.arc(hh.x*sx,hh.y*sy,hh===me?7:5.5,0,6.283);lx.fillStyle=hh===me?'#fff':hh.team===1?'#2a8cff':'#ff4d4d';lx.fill();lx.lineWidth=2;lx.strokeStyle='#1a1320';lx.stroke()}}
// ---- lane buttons (?lanebtn=1 to 6, off by default; with no switch the small map above is the lane picker, as in build 9).
// Three buttons in place of the map, each filled solid blue from our end and solid red from theirs, split where that lane's
// two front lines meet: our front is our unit farthest up the lane, theirs is theirs farthest down (a team with nobody in
// the lane has its front on its own spawn line, Y1 or Y0), and the split is the middle of the two. The side that is farther
// ahead is bright, the other dim. 1: the buttons where the map is; 2: a row over the attack stick, the cards beside the
// super; 3: as 1, and a card can also be dragged up into a lane on the field or onto a button (Clash Royale's way);
// 4: his layout (2026-11-16): the buttons where the cards were, the cards over the right hand, the seeds up the right edge;
// 5 and 6: his second layout (2026-11-16): the super above the attack stick, the seed pips replaced by one number beside
// the cards; 5 puts the three lane buttons, small, where the super was; 6 puts the cards there, small, and the buttons bottom centre.
// build 15 (his "left one build it", 2026-11-17): round 9 with lane meters is the default whenever homies are on; ?lanebtn=0 is build 14's map
const LB=+((location.search.match(/[?&]lanebtn=([0-68])\b/)||[])[1]||(SB.homiesOn?8:0)),LBS=[];let lbEls=null;
// danger (work/lanebtn-review/RESEARCH.md; every number a draft): level 1 when their front in a lane is past LB_DANGER of the
// way to our base; level 2 when our base lost health in the last LB_HIT_HOLD s and the lane is the one whose unit of theirs
// was nearest our base (within LB_NEAR) just before (the rules hit the base only with units: one that arrives, or a siege
// throw). Level 1 and 2 keep a steady red edge on the button. A burst is LB_PULSES pulses at LB_HZ a second (under the 3 a
// second flash limit), then the edge stays steady. Flash b (the default, the draft pick): no burst for level 1, a burst only
// when our base is hit from the lane. Flash a (?laneflash=a, the runner-up): a burst also when a lane turns dangerous. Limits
// for both: one lane bursts at most every LB_REARM s (a hit after a warning in the same lane after LB_HIT_REARM s), and no
// two bursts on any lanes within LB_GAP s. Reduce Motion: edges only, no pulse. Both counts are kept in every mode (LBX.count).
const LB_DANGER=.67,LB_HIT_HOLD=2,LB_NEAR=420,LB_PULSES=3,LB_HZ=2,LB_REARM=30,LB_HIT_REARM=15,LB_GAP=6;
const LBF=/[?&]laneflash=a\b/.test(location.search)?'a':'b',LB_STILL=matchMedia('(prefers-reduced-motion: reduce)').matches;
const LBX={count:{a:0,b:0,aWarn:0,aHit:0},log:[]};window.SBL_LANEBTN=LBX;
function buildLaneBtns(){stage.classList.add('lb'+LB,'lf'+LBF);if(ROW)stage.classList.add('row9');if(NOMETER)stage.classList.add('nometer');const w=document.createElement('div');w.id='lanebtns';
 for(let i=0;i<SB.NL;i++){const b=document.createElement('div');b.className='lbtn';b.setAttribute('role',LB===8?'img':'button');b.setAttribute('aria-label','Lane '+(i+1));b.innerHTML='<i class="r"></i><i class="b"></i>';
  b.addEventListener('pointerdown',e=>{e.preventDefault();soundOn=true;b.classList.add('press');pickLane(i)});
  const up=()=>b.classList.remove('press');b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('pointerleave',up);w.appendChild(b);LBS[i]=.5}
 if(LB===2||LB>=4)$('hud').appendChild(w);else $('row').insertBefore(w,$('lanes'));lbEls=[...w.children];
 if(LB===4)$('hud').appendChild($('seeds'));   // the seed column stands on its own up the right edge
 if(LB>=5){const n=document.createElement('div');n.id='seedNum';n.setAttribute('aria-label','Seeds');n.innerHTML='<u></u><b>0</b>';$('hud').appendChild(n);if(LB===6)$('hud').appendChild($('next'))}   // 5, 6: one number for the seeds, near the lane buttons (NEXT too in 6)
 if(LB===8)for(const c of $('hand').children){const m=document.createElement('i');m.className='ln';m.innerHTML='<u></u><u></u><u></u>';c.appendChild(m)}   // 8: the lane a tap plays to
 if(LB===8){const sg=document.createElement('div');sg.id='spawnGhost';sg.hidden=true;sg.innerHTML='<img alt="">';$('hud').appendChild(sg)}
 if(KIT)setTimeout(kitBuild,0);   // after the ghost and the seed number exist, so the kit replaces them
 if(LB===3||LB===8){const g=document.createElement('div');g.id='lbghost';g.hidden=true;g.innerHTML='<img alt="">';$('hud').appendChild(g)}}
// our share of the lane, 0 (their front at our spawn line) to 1 (our front at theirs); and how far their front is toward our base
function laneFronts(G,i){let bf=SB.Y1,rf=SB.Y0,foe=false;const blue=G.me.team===SB.BLUE;for(const u of G.units){if(u.dead||(u.lane!==undefined?u.lane:SB.laneOf(u.x))!==i)continue;if(u.team===SB.BLUE)bf=Math.min(bf,u.y);else rf=Math.max(rf,u.y);if(u.team!==G.me.team)foe=true}
 const m=Math.max(SB.Y0,Math.min(SB.Y1,(bf+rf)/2)),s=(SB.Y1-m)/(SB.Y1-SB.Y0),L=SB.Y1-SB.Y0,theirs=blue?(rf-SB.Y0)/L:(SB.Y1-bf)/L;return{s:blue?s:1-s,foe:foe?theirs:0}}
function laneShare(G,i){return laneFronts(G,i).s}
function laneDanger(G,me){if(LBX.G!==G){LBX.G=G;for(const k of['lv','near','nearD','hit','burst','lastA','lastB'])LBX[k]=[];LBX.lastAnyA=LBX.lastAnyB=-99;LBX.count={a:0,b:0,aWarn:0,aHit:0};LBX.hp=null;LBX.log=[]}   // a new match starts clean
 const t=G.t,b=G.base[me.team],bp=SB.BASEPOS[me.team],dropped=LBX.hp!==null&&b.hp<LBX.hp-1e-6;LBX.hp=b.hp;let hitLane=-1,hd=1e9;
 for(let i=0;i<SB.NL;i++){let d=1e9;for(const u of G.units)if(!u.dead&&u.team!==me.team&&(u.lane!==undefined?u.lane:SB.laneOf(u.x))===i)d=Math.min(d,Math.hypot(u.x-bp.x,u.y-bp.y));
  if(d<LB_NEAR){LBX.near[i]=t;LBX.nearD[i]=d}if(dropped&&t-(LBX.near[i]??-99)<.6&&LBX.nearD[i]<hd){hd=LBX.nearD[i];hitLane=i}}
 if(hitLane>=0)LBX.hit[hitLane]=t;
 for(let i=0;i<SB.NL;i++){const f=laneFronts(G,i).foe,lv=t-(LBX.hit[i]??-99)<LB_HIT_HOLD?2:f>=LB_DANGER?1:0,was=LBX.lv[i]||0;
  if(lv>was){   // a rise: decide on a burst for each flash style (both counted, the shown one drawn)
   const la=t-(LBX.lastA[i]??-99),lb=t-(LBX.lastB[i]??-99);
   const a=t-LBX.lastAnyA>=LB_GAP&&(lv===2&&was===1?la>=LB_HIT_REARM:la>=LB_REARM),bb=lv===2&&t-LBX.lastAnyB>=LB_GAP&&lb>=LB_REARM;
   if(a){LBX.lastA[i]=LBX.lastAnyA=t;LBX.count.a++;LBX.count[lv===2?'aHit':'aWarn']++}
   if(bb){LBX.lastB[i]=LBX.lastAnyB=t;LBX.count.b++}
   if(LBF==='a'?a:bb)LBX.burst[i]=t;LBX.log.push([+t.toFixed(1),i,lv,a?1:0,bb?1:0])}
  LBX.lv[i]=lv}}
function drawLaneBtns(G,me){if(!lbEls)return;laneDanger(G,me);for(let i=0;i<lbEls.length;i++){const s=laneShare(G,i);LBS[i]+=(s-LBS[i])*.35;const v=LBS[i],b=lbEls[i];   // eased: about 0.6 s to settle
 b.children[0].style.flexBasis=((1-v)*100).toFixed(1)+'%';b.children[1].style.flexBasis=(v*100).toFixed(1)+'%';b.classList.toggle('bw',v>.52);b.classList.toggle('rw',v<.48);b.classList.toggle('on',i===me.lane);
 b.classList.toggle('warn',LBX.lv[i]===1);b.classList.toggle('alarm',LBX.lv[i]===2)}
 if(LB>=7){layoutFan();if(LB===8)dragHintTick(G,me);if(MULTI)multiTick(G,me);if(LB===8)for(const c of $('hand').children){const u=c.querySelector('.ln');if(u)[...u.children].forEach((x,j)=>x.classList.toggle('on',j===SB.laneOf(me.x)))}}
 if(LB>=5){const n=$('seedNum');if(n){const t=String(me.seeds);if(n.lastChild.textContent!==t){n.lastChild.textContent=t;n.classList.remove('new');void n.offsetWidth;n.classList.add('new')}n.classList.toggle('zero',me.seeds<1)}}}
// every frame: the pulse of a burst, from match time (so a paused or stepped match pulses with it); --p runs 0 to 1 and back
function lbAnim(){if(LB===8&&spawnLane>=0)spawnMark();if(NOMETER)laneAlertTick();if(!lbEls||!SB.G||LBX.G!==SB.G)return;const t=SB.G.t,D=LB_PULSES/LB_HZ;for(let i=0;i<lbEls.length;i++){const k=t-(LBX.burst[i]??-99),on=k>=0&&k<D&&!LB_STILL&&LBX.lv[i]>0,b=lbEls[i];
 b.classList.toggle('burst',on);b.style.setProperty('--p',on?(.5-.5*Math.cos(k*LB_HZ*6.2832)).toFixed(3):'0')}}
// ?lanebtn=3: a tap plays the card down the picked lane (on release); a drag shows the creep under the thumb, lights the lane it is over
// (a button, or the lane on the field above the dock) and plays it there on release; back on the dock cancels
// ---- 8: drag a card onto a lane, with the right thumb laid out the way Wild Rift lays it out (work/lanebtn-review/NOTES.md,
// round 5). The attack stick is the centre of a fan. On one arc about 130 px out (874x402; every radius scales with the stick):
// the three cards from straight left of the stick round to above it, the super at the top end, like Wild Rift's four
// abilities with the ultimate at the top. No lane buttons: a card is pressed, dragged over the field and let go on a lane,
// and the lane itself lights on the field; three thin lane meters carry the push fill and the danger edge. NEXT and the seed
// number sit at the outer end of the card arc. (A mode 7 with lane buttons on a second ring was dropped before it was built;
// FAN.lanes is its unused ring.)
// the super sits in the wall gap between the middle and the right lane (the one strip of ground near the thumb no unit walks on)
// round 8 (his "the super has to be not so far out it needs to be where the upgrade thign is"): the super low at the inner end of
// the arc, by the thumb's rest, the cards moved up the arc; ?suppos=gap puts it back in the wall gap of round 5 for comparison.
// A paid upgrade button (?upgrade=1, not on this branch) has a slot at the bottom edge right of the lane meters (FAN.upg, from
// the bottom middle: 124 px right, 30 up at 874), the owner's "upgrade and lanes thing can be on bottom side".
const SUPGAP=/[?&]suppos=gap\b/.test(location.search),FAN=SUPGAP?{r1:130,cards:[195,161,125],sup:[195,144],lanes:[[205,177],[205,156],[205,135]],seed:[190,176],next:[128,95],meters:[200,190]}
 :{r1:130,cards:[157,125,93],sup:[126,190],lanes:[[205,177],[205,156],[205,135]],seed:[210,160],next:[200,93],meters:null,upg:[124,30]};
// round 9 (his "upgrade te number of seed and the lanes can be in the center and only upgrade needs to look like a ring as a
// button", "the lanes thing can be a bi widers liek before"): one row at the bottom centre, left to right the seed count, the
// three lane meters (26 px wide, were 12) and the upgrade ring; only the ring is a button. The super stays where round 8 put it;
// with the seed number out of the fan the cards close up, lower and nearer the stick (r1 118, was 130), NEXT moves in between
// card 1 and card 2 one ring out (it sat up the right lane). ?row=8 is the round 8 layout. ?upgslot=1 draws the upgrade ring
// (the kit's upgrade button: cost badge, up arrow, the face of the crew's biggest homie) as a preview: a tap does nothing.
// ?lanemeter=0: no meters, a lane alert instead (laneAlertTick below).
const ROW=LB===8&&!SUPGAP&&!/[?&]row=8\b/.test(location.search),NOMETER=ROW&&/[?&]lanemeter=0\b/.test(location.search),UPGSLOT=ROW&&(/[?&]upgslot=1\b/.test(location.search)||!!SB.UPG),UPGREAL=ROW&&!!SB.UPG;
if(ROW)Object.assign(FAN,{r1:118,cards:[154,119,84],next:[176,137]});
// lay out the bottom row centred on the screen: seed count, 8 px, the meters 6 px apart, 8 px, the upgrade ring
function rowLay(k,cy){if(UPGREAL&&$('upgSlot')&&$('upgSlot').offsetWidth)return rowLayUp(k,cy);const y=cy+32*k,m=NOMETER?[]:lbEls.filter(e=>e.offsetWidth),parts=[$('seedNum'),...m,$('upgSlot')].filter(e=>e&&e.offsetWidth),gp=i=>i&&m.includes(parts[i])&&m.includes(parts[i-1])?6:parts[i]&&parts[i].id==='upgSlot'&&i?16:i?8:0;   // 16 before the ring: its arrow badge stands 8 px out of it
 let w=0;parts.forEach((e,i)=>w+=gp(i)+e.offsetWidth);let x=VW/2-w/2;parts.forEach((e,i)=>{x+=gp(i);e.style.left=x+'px';e.style.top=(y-e.offsetHeight/2)+'px';x+=e.offsetWidth})}
// build 16 (his "i dont see the upgrade button or the number it costs it has to be more prominent and can be in the middle"): the
// upgrade ring at the centre of the bottom row, bigger than a card, the lane meters to its left and the seed count to its right
function rowLayUp(k,cy){const y=cy+32*k,u=$('upgSlot'),m=NOMETER?[]:lbEls.filter(e=>e.offsetWidth),sn=$('seedNum'),put=(e,x)=>{e.style.left=x+'px';e.style.top=(y-e.offsetHeight/2)+'px'};
 const ux=VW/2-u.offsetWidth/2;u.style.left=ux+'px';u.style.top=(y-u.offsetHeight/2-16*k)+'px';let x=ux-18;for(let i=m.length-1;i>=0;i--){x-=m[i].offsetWidth;put(m[i],x);x-=6}
 if(sn&&sn.offsetWidth)put(sn,ux+u.offsetWidth+18)}
// ?lanemeter=0 (his question "maybe we dont even need th lanes icon instead when its gettin close or dmg u should get indicator"):
// no meters. A lane alerts when ALERT_N or more of their homies in it are within ALERT_D of our base (down the field: the side lanes
// run 365 to the side of the base) for ALERT_HOLD s, when one of theirs stays within ALERT_D1 of it down the field for ALERT_LONE s
// (the base gun reaches 260 and fires 500 every 0.7 s; a lone tier 1 walking in dies after about 1.75 s in that band and never
// hits the base, drag8.js athresh), or when our base is hit from that lane (laneDanger's hit, round 5). The alert: a red pulse and a down arrow at
// the lowest point of the lane on screen that is clear of the stick and every button (pointer-events none, not a control, so a
// drag passes over it), and the lane tinted red on the field. The round 5 alarm rules: LB_PULSES pulses at LB_HZ when it starts,
// then steady; Reduce Motion, steady only. It holds ALERT_KEEP s after the lane is clear, then fades in ALERT_FADE s. No text, no sound.
const ALERT_N=2,ALERT_D=420,ALERT_HOLD=.6,ALERT_D1=270,ALERT_LONE=2.5,ALERT_KEEP=1.5,ALERT_FADE=.4;
const LA={G:null,on:[0,0,0],a:[0,0,0],since:[-1,-1,-1],lone:[-1,-1,-1],last:[-99,-99,-99],t0:[-99,-99,-99],count:0,log:[],els:null,pl:null,pos:null,n:0,tp:0};window.SBL_ALERT=LA;
function laneAlertTick(){const G=SB.G;if(!G||!G.me)return;const me=G.me,t=G.t,dt=Math.max(0,Math.min(.1,t-(LA.tp??t)));LA.tp=t;   // match time, so a stepped or paused match fades with it

 if(LA.G!==G){LA.G=G;LA.tp=t;LA.on=[0,0,0];LA.a=[0,0,0];LA.since=[-1,-1,-1];LA.lone=[-1,-1,-1];LA.last=[-99,-99,-99];LA.t0=[-99,-99,-99];LA.count=0;LA.log=[];LA.pos=null}
 if(!LA.els){const w=document.createElement('div');w.id='laneAlerts';for(let i=0;i<SB.NL;i++){const e=document.createElement('div');e.className='lal';e.innerHTML='<i></i><svg viewBox="0 0 24 24"><path d="M6 9 L12 15 L18 9" fill="none" stroke="#1a1320" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 9 L12 15 L18 9" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';w.appendChild(e)}$('hud').appendChild(w);LA.els=[...w.children]}
 if(!LA.pl){const y0=SB.Y0,y1=SB.H-60,len=(y1-y0)*K;LA.pl=[];for(let i=0;i<SB.NL;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(SB.LW*K,len),new THREE.MeshBasicMaterial({color:0xff2a2a,transparent:true,opacity:0,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(wx(SB.laneX(i)),.05,wz((y0+y1)/2));m.renderOrder=1;m.visible=false;scene.add(m);LA.pl.push(m)}}
 const bp=SB.BASEPOS[me.team];
 for(let i=0;i<SB.NL;i++){let n=0,close=false;for(const u of G.units){if(u.dead||u.team===me.team||(u.lane!==undefined?u.lane:SB.laneOf(u.x))!==i)continue;if(Math.abs(u.y-bp.y)<ALERT_D)n++;if(Math.abs(u.y-bp.y)<ALERT_D1)close=true}
  if(n>=ALERT_N){if(LA.since[i]<0)LA.since[i]=t}else LA.since[i]=-1;if(close){if(LA.lone[i]<0)LA.lone[i]=t}else LA.lone[i]=-1;
  const hot=LA.since[i]>=0&&t-LA.since[i]>=ALERT_HOLD||LA.lone[i]>=0&&t-LA.lone[i]>=ALERT_LONE||LBX.hit&&t-(LBX.hit[i]??-99)<LB_HIT_HOLD;
  if(hot){if(!LA.on[i]){LA.on[i]=1;LA.t0[i]=t;LA.count++;LA.log.push([+t.toFixed(1),i,n,close?1:0])}LA.last[i]=t}else if(LA.on[i]&&t-LA.last[i]>ALERT_KEEP)LA.on[i]=0;
  LA.a[i]=Math.max(0,Math.min(1,LA.a[i]+(LA.on[i]?1:-1)*dt/ALERT_FADE))}
 if(!LA.a.some(a=>a>0)){LA.els.forEach(e=>e.style.opacity='0');LA.pl.forEach(m=>m.visible=false);return}
 if(!LA.pos||++LA.n%15===0){   // where each lane's mark goes: walk up the lane from our end to the first point clear of the controls
  const box=[$('stickL'),$('btnAtk'),$('btnSup'),$('pauseBtn'),$('top'),$('next'),$('seedNum'),$('upgSlot'),...$('hand').children].filter(e=>e&&e.offsetWidth).map(stageRect),M=26,s0=SB.spawnPt(me.team,0).y,dir=me.team===SB.BLUE?-1:1;
  LA.pos=[0,1,2].map(i=>{for(let k=0;k<60;k++){const p=project(wx(SB.laneX(i)),0,wz(s0+dir*k*15));if(p.y>VH-M||p.x<M||p.x>VW-M)continue;if(box.some(b=>p.x>b.x-M&&p.x<b.x+b.w+M&&p.y>b.y-M&&p.y<b.y+b.h+M))continue;return[p.x,p.y]}return null})}
 for(let i=0;i<SB.NL;i++){const e=LA.els[i],a=LA.a[i],k=t-LA.t0[i],D=LB_PULSES/LB_HZ,p=LA.on[i]&&k>=0&&k<D&&!LB_STILL?.5-.5*Math.cos(k*LB_HZ*6.2832):0,q=LA.pos&&LA.pos[i];
  e.style.opacity=q?a.toFixed(3):'0';if(q)e.style.transform=`translate(${Math.round(q[0])}px,${Math.round(q[1])}px)`;e.style.setProperty('--p',p.toFixed(3));
  const m=LA.pl[i];m.visible=a>0;m.material.opacity=a*(.30+.14*p)}}
// one swap for the token pictures: return the round 2D face for a card (by c.hid) once those land; null keeps the 3D render
function tokenPic(c){return null}
let fanKey='';
function layoutFan(){const a=$('btnAtk');if(!a||!a.offsetWidth)return;const k=a.offsetWidth/104,cx=a.offsetLeft+a.offsetWidth/2,cy=a.offsetTop+a.offsetHeight/2,cs=[...$('hand').children],
  key=[cx,cy,k,innerWidth,innerHeight,cs.length,cs[0]&&cs[0].offsetWidth,ROW&&$('seedNum')&&$('seedNum').offsetWidth].join();if(key===fanKey)return;fanKey=key;
 const pol=(R,d)=>[cx+R*k*Math.cos(d*Math.PI/180),cy-R*k*Math.sin(d*Math.PI/180)],put=(el,p)=>{if(!el)return;el.style.left=(p[0]-el.offsetWidth/2)+'px';el.style.top=(p[1]-el.offsetHeight/2)+'px'};
 put($('btnSup'),pol(...FAN.sup));cs.forEach((c,i)=>put(c,pol(FAN.r1,FAN.cards[i])));put($('next'),pol(...FAN.next));if(!ROW)put($('seedNum'),pol(...FAN.seed));
 if(KIT)for(const [k,h] of [['sup','btnSup'],['atk','btnAtk'],['pz','pauseBtn']]){const e=$(h);if(KX[k]&&e)put(KX[k],[e.offsetLeft+e.offsetWidth/2,e.offsetTop+e.offsetHeight/2])}
 if(LB===7)lbEls.forEach((b,i)=>put(b,pol(...FAN.lanes[i])));else if(SUPGAP){const p=pol(...FAN.meters);lbEls.forEach((b,i)=>put(b,[p[0]+(i-1)*17,p[1]]))}
 else if(ROW)rowLay(k,cy);
 else{const x=innerWidth/2+48*k,y=cy+32*k;lbEls.forEach((b,i)=>put(b,[x+(i-1)*24*k,y]))}}   // round 8: the meters at the bottom edge, middle right, clear of both thumbs and of our base's number
// 8: the lane under the finger lights on the field itself, from our base to the far end, in our blue; the other two dim; a ring
// marks where the homie will come out. Three flat planes and a ring on the ground, made once, shown only while dragging.
let laneGlow=null;
function laneGlowSet(l){const G=SB.G;if(!G)return;
 if(!laneGlow){laneGlow={p:[],ring:null};const y0=SB.Y0,y1=SB.H-60,len=(y1-y0)*K;
  for(let i=0;i<SB.NL;i++){const m=new THREE.Mesh(new THREE.PlaneGeometry(SB.LW*K,len),new THREE.MeshBasicMaterial({color:0x2a8cff,transparent:true,opacity:.36,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(wx(SB.laneX(i)),.06,wz((y0+y1)/2));m.renderOrder=2;m.visible=false;scene.add(m);laneGlow.p.push(m)}
  const r=new THREE.Mesh(new THREE.RingGeometry(.55,.85,40),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.9,depthWrite:false,side:THREE.DoubleSide}));r.rotation.x=-Math.PI/2;r.renderOrder=3;r.visible=false;scene.add(r);laneGlow.ring=r}
 laneGlow.p.forEach((m,i)=>{m.visible=l>=0;if(l>=0){m.material.color.setHex(i===l?0x2a8cff:0x000000);m.material.opacity=i===l?.38:.14}});spawnLane=l;spawnMark();
 laneGlow.ring.visible=false}
// where the homie will come out: a blue ring with its face on the lit lane at its spawn point, or at the bottom edge with a
// chevron when that point is below the screen; moved every frame while dragging
let spawnLane=-1;
function spawnMark(){const el=$('spawnGhost');if(!el)return;if(spawnLane<0||!SB.G){el.hidden=true;return}const s=SB.spawnPt(SB.G.me.team,spawnLane),p=project(wx(s.x),0,wz(s.y));let lim=VH-34;
 if(ROW){let L=1e9,R=-1e9,T=1e9;for(const e of[$('seedNum'),$('upgSlot'),...(NOMETER?[]:lbEls)]){if(!e||!e.offsetWidth)continue;const r=stageRect(e);L=Math.min(L,r.x);R=Math.max(R,r.x+r.w);T=Math.min(T,r.y)}
  if(p.x>L-30&&p.x<R+30)lim=Math.min(lim,T-48)}   // round 9: the start point of the middle lane is below the screen, under the bottom row; its mark waits just over the row, pointing down
 const cl=p.y>lim;
 el.hidden=false;el.classList.toggle('below',cl);el.style.transform=`translate(${Math.round(p.x)}px,${Math.round(Math.min(p.y,lim))}px)`}
// press a card, drag over the field, let go on a lane; let go on a card or a control cancels; a press that moves under 12 px
// is a tap and plays the card down the lane the hero stands in; let go off the screen edge also cancels (the small mark on each card); a card you cannot pay for shakes and stays
// 8, first match only: once a card can be paid for, a ghost of it slides from the card toward the field and fades (no words); then
// never again on this device. Stored in localStorage under sbl_draghint ("1" once shown); without storage it shows each match.
let dragHint=0;function dragHintTick(G,me){if(dragHint)return;try{if(localStorage.getItem('sbl_draghint')){dragHint=1;return}}catch(e){}
 if(G.t<1.5)return;const i=[0,1,2].find(j=>SB.canPlay(me,j));if(i===undefined)return;const c=$('hand').children[i],g=$('lbghost');if(!c||!g||!c.offsetWidth)return;dragHint=1;try{localStorage.setItem('sbl_draghint','1')}catch(e){}
 const r=stageRect(c),x=r.x+r.w/2,y=r.y+r.h/2;g.querySelector('img').src=c.querySelector('img').src;g.hidden=false;g.classList.add('hint');
 const an=g.animate([{transform:`translate(${x}px,${y+40}px)`,opacity:0},{transform:`translate(${x}px,${y+20}px)`,opacity:.9,offset:.2},{transform:`translate(${x-70}px,${y-70}px)`,opacity:.9,offset:.75},{transform:`translate(${x-80}px,${y-80}px)`,opacity:0}],{duration:1300,easing:'ease-in-out'});
 an.onfinish=()=>{g.hidden=true;g.classList.remove('hint')}}
// ---- 8: the match buttons from lanes/hudkit (rings A by default, ?btnstyle=b stickers, ?btnstyle=0 the plain round tokens).
// The kit draws the cards, NEXT, the super, the attack, the seed number and pause; the layout and every behaviour stay here.
// The super, attack and pause keep their own elements (drag to aim, taps) and the kit button is drawn over each, centred on it
// (kept out of them: the old .btn rules would restyle the kit's parts); the stick is restyled only.
const KIT=LB===8&&window.HudKit&&!/[?&]btnstyle=0\b/.test(location.search)?(/[?&]btnstyle=b\b/.test(location.search)?'b':'a'):null;
const KX={sup:null,atk:null,hero:null};
function kitBuild(){const H=window.HudKit;H.base='./game/assets/ui/tokens/';H.skin($('hud'),KIT,VW/874);stage.classList.add('hkit');
 const hand=$('hand');hand.innerHTML='';for(let i=0;i<SB.HAND;i++){const t=H.token({id:'bramble_1',cost:1});t.setAttribute('role','button');t.setAttribute('aria-label','Card '+(i+1));cardDrag8(t,i);hand.appendChild(t)}
 const nx=H.token({id:'bramble_1',cost:1});nx.id='next';nx.classList.add('hk-next');$('next').replaceWith(nx);
 const sn=H.seeds(0);sn.id='seedNum';const old=$('seedNum');if(old)old.replaceWith(sn);else $('hud').appendChild(sn);
 KX.sup=H.superBtn({hero:'bramble',charge:0});KX.sup.classList.add('kin');$('hud').appendChild(KX.sup);
 KX.atk=H.attack({ammo:3,max:3});KX.atk.classList.add('kin');$('hud').appendChild(KX.atk);
 KX.pz=H.pause();KX.pz.classList.add('kin');$('hud').appendChild(KX.pz);
 if(UPGSLOT){const u=H.upgrade({id:'bramble_1',cost:6});u.id='upgSlot';u.setAttribute('role','button');u.setAttribute('aria-label','Upgrade');$('hud').appendChild(u);   // round 9 preview: pressed look on touch, nothing else
  u.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();u._p=1;soundOn=true;if(UPGREAL)doUpgrade()});for(const t of['pointerup','pointercancel','pointerleave'])u.addEventListener(t,()=>{u._p=0})}
 if(UPGREAL){nx.hidden=true;nx.style.display='none'}
 const g=H.token({id:'bramble_1',cost:1});g.id='lbghost';g.hidden=true;H.set(g,{state:'dragged'});const og=$('lbghost');if(og)og.replaceWith(g);else $('hud').appendChild(g);
 fanKey=''}
// a card's two pictures (tight for A, pop-out for B): the 2D face when the homie has one, else the 3D render
function kitPics(el,c){const H=window.HudKit,L=LK(c),id=c.hid,ti=el.querySelector('.hk-tight'),po=el.querySelector('.hk-pop');
 if(id&&SB.HOMIES[id]){ti.src=H.base+id+'_256.png';po.src=H.base+id+'_pop_256.png';el.dataset.type=SB.HOMIES[id].type}else{const p=L.pic||unitPic(L.kind,L.tier-1);ti.src=p;po.src=p}
 const pp=el.querySelector('.hk-pips');if(pp)pp.innerHTML='<u></u>'.repeat(c.tier)}
function kitCards(me){const H=window.HudKit,cs=$('hand').children,cards=me.hand.concat([SB.nextCard(me)]);
 cards.forEach((c,i)=>{const el=i<SB.HAND?cs[i]:$('next');if(!el||!c)return;const key=c.hid||c.kind+'_'+c.tier,cost=SB.costOf(c.tier);
  const tot=cost+(SB.UPG&&me.rise&&i<SB.HAND?me.rise[i]||0:0);if(el.dataset.k!==key){el.dataset.k=key;kitPics(el,c);el._c=-1}if(el._c!==tot){el._c=tot;H.set(el,{cost:tot})}
  if(i<SB.HAND&&!el._drag)H.set(el,{state:el._press?'pressed':SB.canPlay(me,i)?'normal':'poor',have:Math.min(1,me.seeds/tot)})});
 const hero=me.def.id,sk=LOOK.heroSkin(CAST[hero],mySkin(hero)),tok=sk&&sk.tokens||hero;   // skins (ff-looks): the drawn face the skin names (catalog "tokens")
 if(KX.hero!==tok){KX.hero=tok;KX.sup.querySelector('.hk-tight').src=H.base+tok+'_256.png';KX.sup.querySelector('.hk-pop').src=H.base+tok+'_pop_256.png'}
 H.setCharge(KX.sup,me.sup);H.setAmmo(KX.atk,Math.floor(me.ammo),3);
 const us=$('upgSlot');if(us){const top=SB.crewDeck(hero).reduce((a,c)=>!a||c.tier>a.tier?c:a,null);   // the preview shows the crew's biggest homie and its cost
  if(UPGREAL){const nx=SB.upNext(me);us.style.display=nx?'':'none';if(nx){const need=SB.upNeed(me),all=SB.upCost(me),have=Math.min(1,((me.bank||0)+me.seeds)/all);if(us._k!==nx.hid){us._k=nx.hid;kitPics(us,nx)}if(us._n!==need){us._n=need;H.set(us,{cost:need})}
   H.set(us,{state:us._p?'pressed':(me.bank||0)+me.seeds>=all?'normal':'poor',have})}}
  else if(top){const key=top.hid||top.kind+'_'+top.tier,cost=SB.costOf(top.tier);if(us._k!==key){us._k=key;kitPics(us,top);H.set(us,{cost})}H.set(us,{state:us._p?'pressed':me.seeds>=cost?'normal':'poor',have:Math.min(1,me.seeds/cost)})}}}
// the upgrade button: pours the seeds held into the upgrade; when the total is in, the next bigger homie comes into the hand and the
// smallest leaves (core.js upgrade). Nothing held: a shake and the deny sound.
function doUpgrade(){const G=SB.G;if(!G||G.over||paused)return;const u=$('upgSlot'),r=SB.upgrade(G.me);
 if(!r){if(u)u.animate([{transform:'translateX(-3px)'},{transform:'translateX(3px)'},{transform:'none'}],{duration:160});SND.play('ui_deny',{ui:true});return}
 if(r===true){SND.play('level_up',{ui:true});hudCards=[];for(const el of $('hand').children)el.dataset.k='';if(u)u.animate([{transform:'scale(1.25)'},{transform:'none'}],{duration:300,easing:'ease-out'})}else SND.play('ui_tap',{ui:true});drawHud()}
// ?lanebtn=8&multi=1 (his idea): a tap on a card adds one to how many of it go out (x2, x3 on the token, the cost badge shows the
// total), up to MULTI_MAX and what the seeds cover; the drag sends that many to the lane in a short line (core.js playCardN). The
// count goes back to 1 after a send, after MULTI_IDLE s without touching that card, or on a long press (MULTI_HOLD s). Each card
// keeps its own count. ?multi=2 (what ships in Battle Cats and Cartoon Wars): every tap or drag sends one and the card stays in
// the hand; it then recharges for MULTI_RECHARGE s (a sweep on the token) before it can go again; the units-per-side cap holds.
const MULTI=LB===8?(+((location.search.match(/[?&]multi=([12])\b/)||[])[1]||0)):0,MULTI_MAX=5,MULTI_IDLE=3,MULTI_HOLD=.5,MULTI_RECHARGE=.6,MC={n:[1,1,1],t:[0,0,0],c:[null,null,null],rc:[-99,-99,-99]};
function multiTick(G,me){const cs=$('hand').children;for(let i=0;i<cs.length;i++){const c=me.hand[i],el=cs[i];if(MC.c[i]!==c){MC.c[i]=c;MC.n[i]=1}
  if(MULTI===2){let r=el.querySelector('.rc');if(!r){r=document.createElement('i');r.className='rc';el.appendChild(r)}const k=Math.max(0,1-(G.t-MC.rc[i])/MULTI_RECHARGE);r.style.setProperty('--rc',(k*100).toFixed(1)+'%');r.hidden=k<=0;continue}
  if(MC.n[i]>1&&G.t-MC.t[i]>MULTI_IDLE)MC.n[i]=1;if(c){const cost=SB.costOf(c.tier);MC.n[i]=Math.max(1,Math.min(MC.n[i],Math.floor(me.seeds/cost)||1))}
  let b=el.querySelector('.mult');if(!b){b=document.createElement('b');b.className='mult';el.appendChild(b)}const n=MC.n[i];b.textContent='x'+n;b.hidden=n<2;
  if(c){const t=SB.costOf(c.tier)*n;if(KIT)window.HudKit.set(el,{cost:t});else{const e=el.querySelector('em');if(e)e.textContent=t}}}}
function multiTap(i,held){const G=SB.G,me=G.me,c=me.hand[i];if(!c)return;MC.t[i]=G.t;if(held){MC.n[i]=1}else{const cost=SB.costOf(c.tier);
  if(MC.n[i]<MULTI_MAX&&me.seeds>=cost*(MC.n[i]+1)){MC.n[i]++;playS('button_tap')}else{$('hand').children[i].animate([{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'none'}],{duration:160});SND.play('ui_deny',{ui:true})}}multiTick(G,me)}
function multiSend(i,l){const me=SB.G.me;pickLane(l);const n=SB.playCardN(me,i,MC.n[i]);MC.n[i]=1;if(!n){lackSeeds(me,i);SND.play('ui_deny',{ui:true});return}playS('button_tap');coach.summoned=true;drawHud()}
// ?multi=2: one homie of the card in slot i down lane l, the card stays and recharges; false while recharging or short of seeds
function multiOne(i,l){const G=SB.G,me=G.me,c=me.hand[i];if(!c||G.t-MC.rc[i]<MULTI_RECHARGE)return false;pickLane(l);if(!SB.summon(me,c.tier,c.kind,c.hid)){lackSeeds(me,i);SND.play('ui_deny',{ui:true});return false}
  MC.rc[i]=G.t;playS('button_tap');coach.summoned=true;drawHud();return true}
// build 16 (his "draggisn to left side for ur creeps psawning shouldnt need to go all the way to left"): the lane a dragged card drops
// into is picked by screen bands, not the ground under the finger: left of DRAG_BANDS[0] of the screen width is the left lane, up to
// DRAG_BANDS[1] the middle, past it the right (the cards sit on the right, so the left lane is about half as far as before)
const DRAG_BANDS=[.42,.62];function dragLane(x,y){const f=x/VW,l=f<DRAG_BANDS[0]?0:f<DRAG_BANDS[1]?1:2;return SB.CFG.lanes===3?l:SB.laneOf(groundAt(x,y).x)}
function cardDrag8(b,i){let id=null,ox=0,oy=0,drag=false,tl=-1;const g=()=>$('lbghost');
 // round 9: the bottom row's seed count and meters are readouts, so a drop over them still plays; only the upgrade ring cancels
 const onControl=(x,y)=>{for(const el of[...$('hand').children,$('btnAtk'),$('btnSup'),$('pauseBtn'),...(ROW?[$('upgSlot')]:[$('seedNum'),...lbEls])]){if(!el||!el.offsetWidth)continue;const r=stageRect(el);if(x>=r.x-6&&x<=r.x+r.w+6&&y>=r.y-6&&y<=r.y+r.h+6)return true}return false};
 b.addEventListener('pointerdown',e=>{e.preventDefault();soundOn=true;if(id!==null||!SB.G||SB.G.over||paused)return;const me=SB.G.me;
  if(!SB.canPlay(me,i)||MULTI===2&&SB.G.t-MC.rc[i]<MULTI_RECHARGE){b.animate([{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'none'}],{duration:180});lackSeeds(me,i);SND.play('ui_deny',{ui:true});return}
  id=e.pointerId;try{b.setPointerCapture(id)}catch(_){}ox=px(e);oy=py(e);drag=false;tl=-1;b.classList.add('press');b._t0=performance.now();if(KIT){b._press=1;window.HudKit.set(b,{state:'pressed'})}});
 b.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;const x=px(e),y=py(e);
  if(!drag&&Math.hypot(x-ox,y-oy)>12){drag=true;b.classList.add('lift');g().querySelector('img').src=b.querySelector('img').src;if(KIT){const gp=g().querySelector('.hk-pop'),bp=b.querySelector('.hk-pop');if(gp&&bp)gp.src=bp.src;g().dataset.type=b.dataset.type||'';const gc=g().querySelector('.hk-cost span'),bc=b.querySelector('.hk-cost span');if(gc&&bc)gc.textContent=bc.textContent;const gq=g().querySelector('.hk-pips'),bq=b.querySelector('.hk-pips');if(gq&&bq)gq.innerHTML=bq.innerHTML;b._drag=1;window.HudKit.set(b,{state:'empty'})}g().hidden=false;const sg=$('spawnGhost');if(sg)sg.querySelector('img').src=b.querySelector('img').src}
  if(!drag)return;{const t=stageRect($('top')),pb=stageRect($('pauseBtn')),top=Math.max(t.y+t.h,pb.y+pb.h)+6;g().style.transform=`translate(${x}px,${Math.max(y,top+112)}px)`}   // the face rides 112 px above the finger, never over the score, clock or pause
 const nl=x<4||y<4||x>VW-4||y>VH-4||onControl(x,y)?-1:dragLane(x,y);if(nl!==tl){tl=nl;laneGlowSet(tl);g().classList.toggle('none',tl<0)}});
 const up=e=>{if(e.pointerId!==id)return;id=null;b.classList.remove('press','lift');b._press=0;b._drag=0;if(KIT)window.HudKit.set(b,{state:'normal'});g().hidden=true;laneGlowSet(-1);if(e.type!=='pointerup'||!SB.G)return;
  if(!drag){if(MULTI===1)return multiTap(i,performance.now()-b._t0>MULTI_HOLD*1000);if(MULTI===2)return multiOne(i,SB.laneOf(SB.G.me.x));pickLane(SB.laneOf(SB.G.me.x));return doSummon(i)}if(tl>=0){if(MULTI===1)return multiSend(i,tl);if(MULTI===2)return multiOne(i,tl);pickLane(tl);doSummon(i)}};
 b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up)}
function cardDrag(b,i){let id=null,ox=0,oy=0,drag=false,tl=-1;const g=()=>$('lbghost');
 const laneAt=e=>{const x=px(e),y=py(e);for(let j=0;j<lbEls.length;j++){const r=stageRect(lbEls[j]);if(x>=r.x-6&&x<=r.x+r.w+6&&y>=r.y-6&&y<=r.y+r.h+6)return j}
  if(y<stageRect($('dock')).y-8)return SB.laneOf(groundAt(x,y).x);return -1};
 b.addEventListener('pointerdown',e=>{e.preventDefault();soundOn=true;if(id!==null)return;id=e.pointerId;try{b.setPointerCapture(id)}catch(_){}ox=px(e);oy=py(e);drag=false;tl=-1;b.classList.add('press')});
 b.addEventListener('pointermove',e=>{if(e.pointerId!==id)return;if(!drag&&Math.hypot(px(e)-ox,py(e)-oy)>14){drag=true;g().querySelector('img').src=b.querySelector('img').src;g().hidden=false}
  if(!drag)return;g().style.transform=`translate(${px(e)}px,${py(e)}px)`;tl=laneAt(e);lbEls.forEach((el,j)=>el.classList.toggle('tgt',j===tl))});
 const up=e=>{if(e.pointerId!==id)return;id=null;b.classList.remove('press');g().hidden=true;lbEls.forEach(el=>el.classList.remove('tgt'));
  if(e.type!=='pointerup')return;if(!drag)return doSummon(i);if(tl>=0){pickLane(tl);doSummon(i)}};
 b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up)}
// Base health as two bars in the HUD around the clock, seen from anywhere on the map (his words 2026-11-18: "u need to be
// able to see the base health bars and as they are in danger from anywhere", "it should part of the hud it hsould be ovvious").
// Blue fills from the left edge, red from the right. A line every 10 health. On each hit the bar shakes and the lost part
// stays pale for 0.6 s, then drains. While a base was hit in the last 2.5 s its bar pulses (1 flash a second), and at a
// quarter or less the number turns gold. Drawn only: core.js is not touched. ?basebars=0 gives the old number pills.
const BB={on:!/[?&]basebars=0\b/.test(location.search),G:null,els:null,max:[0,1,1],hp:[0,0,0],trail:[0,0,0],hold:[0,0,0],hitT:[0,-99,-99],t:0};
function drawBaseBars(G){
 if(!BB.on){$('sb').textContent=Math.max(0,Math.ceil(G.base[1].hp));$('sr').textContent=Math.max(0,Math.ceil(G.base[2].hp));return}
 if(!BB.els){BB.els=[null,$('sb'),$('sr')];for(const t of[1,2]){const e=BB.els[t];e.className='bhp '+(t===1?'blue':'red');e.innerHTML='<b class="tr"></b><b class="fl"></b><s></s><em></em>'}}
 if(BB.G!==G){BB.G=G;BB.t=G.t;for(const t of[1,2]){const h=Math.max(1,G.base[t].hp);BB.max[t]=h;BB.hp[t]=BB.trail[t]=h;BB.hold[t]=0;BB.hitT[t]=-99;BB.els[t].classList.remove('danger','low','shake');
  BB.els[t].querySelector('s').style.backgroundSize=(100/Math.max(1,Math.round(h/10)))+'% 100%'}}
 const dt=Math.max(0,G.t-BB.t);BB.t=G.t;
 for(const t of[1,2]){const e=BB.els[t],hp=Math.max(0,G.base[t].hp);if(hp>BB.max[t])BB.max[t]=hp;const m=BB.max[t];
  if(hp<BB.hp[t]-1e-6){BB.hitT[t]=G.t;BB.hold[t]=.6;e.classList.remove('shake');void e.offsetWidth;e.classList.add('shake')}
  BB.hp[t]=hp;if(BB.hold[t]>0)BB.hold[t]-=dt;else BB.trail[t]=Math.max(hp,BB.trail[t]-m*.9*dt);if(BB.trail[t]<hp)BB.trail[t]=hp;
  e.children[1].style.width=(hp/m*100)+'%';e.children[0].style.width=(BB.trail[t]/m*100)+'%';
  const txt=String(Math.ceil(hp));if(e.lastChild.textContent!==txt)e.lastChild.textContent=txt;
  e.classList.toggle('danger',hp>0&&G.t-BB.hitT[t]<2.5);e.classList.toggle('low',hp<=m*.25)}}
function drawHud(){const G=SB.G;if(!G)return;const me=G.me;{const c=Math.ceil(G.time);if(c<=10&&c>0&&c<lastTick){lastTick=c;playS('countdown_tick')}}
 $('clock').textContent=fmt(G.time);$('clock').classList.toggle('late',!!G.lateOn);drawBaseBars(G);
 {const s=$('seeds');if(s.children.length!==SB.CFG.carry){s.innerHTML='<u></u>'.repeat(SB.CFG.carry);hudSeeds=-1}
  for(let i=0;i<s.children.length;i++){const u=s.children[i],on=i<me.seeds;if(on!==u.classList.contains('on')){u.classList.toggle('on',on);if(on&&hudSeeds>=0){u.classList.remove('new');void u.offsetWidth;u.classList.add('new')}}}hudSeeds=me.seeds}
 $('ammo').innerHTML=[0,1,2].map(i=>'<u class="'+(i<Math.floor(me.ammo)?'on':'')+'"></u>').join('');
 $('supArc').style.strokeDashoffset=100.5*(1-me.sup);$('btnSup').classList.toggle('cd',me.sup<1);$('supName').textContent=me.def.sup.name;
 drawCards(me);
 if(++hudRectN%10===0&&stick.id===null)hudRects=null;   // the control boxes the world labels keep clear of, measured again once a second
 drawLanes();if(LB)drawLaneBtns(G,me);if(me.dead)toast('Back in '+Math.max(1,Math.ceil(me.respawn)),.4);drawCoach(G,me)}
// ---- the first match teaches by pointing, never by words: a hand and a glow on the one thing to touch next.
// 1) a card you can pay for (or, with too few seeds, the seeds filling up), until you summon; 2) the lane map, until you pick a lane.
const coach={on:false,summoned:false,laned:false,t:0,tgt:null},HAND_SVG='<svg viewBox="0 0 54 54"><path d="M20 30V10a4 4 0 018 0v14l9 2c4 1 6 4 5 8l-3 12H22l-9-11c-2-3 1-6 4-4z" fill="#fff8e8" stroke="#1a1320" stroke-width="3.5" stroke-linejoin="round"/></svg>';
$('coach').innerHTML=HAND_SVG;
function stageRect(el){const r=el.getBoundingClientRect();return ROT?{x:r.top,y:innerWidth-r.right,w:r.height,h:r.width}:{x:r.left,y:r.top,w:r.width,h:r.height}}
function coachAt(el){const c=$('coach');if(coach.tgt&&coach.tgt!==el)coach.tgt.classList.remove('glow');coach.tgt=el;
 if(!el){c.hidden=true;return}el.classList.add('glow');const r=stageRect(el);c.hidden=false;c.style.transform=`translate(${r.x+r.w/2-30}px,${r.y+r.h*.45-50}px) rotate(180deg)`}
function drawCoach(G,me){if(!coach.on||G.over||paused||me.dead)return coachAt(null);coach.t+=.1;
 if(!coach.summoned){const i=[0,1,2].find(j=>SB.canPlay(me,j));return coachAt(i===undefined?$(LB>=5?'seedNum':'seeds'):$('hand').children[i])}
 if(!coach.laned){if((coach.lt=(coach.lt||coach.t))&&coach.t-coach.lt>1.2&&coach.t-coach.lt<9){if(LB===8)coach.laned=true;else return coachAt(LB?$('lanebtns'):$('lanes'))}if(coach.t-coach.lt>=9)coach.laned=true}
 coachAt(null);if(coach.laned)coach.on=false}
// ---- pause: the button at the top left, Escape, or the app going to the background stops the match; Leave ends it as a loss
let paused=false,leaveArm=0;
const TROPHY_SVG='<svg viewBox="0 0 40 40"><path d="M11 6h18v6c0 7-4 12-9 12s-9-5-9-12z" fill="#ffc83d" stroke="#1a1320" stroke-width="3" stroke-linejoin="round"/><path d="M11 9H5c0 6 3 9 7 9M29 9h6c0 6-3 9-7 9" fill="none" stroke="#1a1320" stroke-width="3" stroke-linecap="round"/><path d="M17 24h6l1 6h-8z" fill="#ffc83d" stroke="#1a1320" stroke-width="3" stroke-linejoin="round"/><rect x="11" y="30" width="18" height="6" rx="2" fill="#ffc83d" stroke="#1a1320" stroke-width="3"/></svg>';
function setSw(){const s=(window.SBL_META&&window.SBL_META.state&&window.SBL_META.state.settings)||SET;$('pMusic').classList.toggle('on',s.music!==false);$('pSound').classList.toggle('on',s.sound!==false)}
function pauseMatch(){if(!started||!SB.G||SB.G.over||paused)return;paused=true;stick.id=null;stick.x=stick.y=0;sl.firstChild.style.transform='';sl.style.left=sl.style.bottom='';aim=null;I.fire=false;I.mx=I.my=0;
 for(const b of[$('btnAtk'),$('btnSup')])b.classList.remove('on');leaveArm=0;drawLeave();setSw();$('pause').hidden=false;coachAt(null)}
function resumeMatch(){if(!paused)return;paused=false;$('pause').hidden=true;clock.getDelta()}
function drawLeave(){const b=$('pLeave');b.classList.toggle('arm',!!leaveArm);let chip='';
 if(leaveArm&&MENU_FLOW){const M=window.SBL_META,s=M.state,d=Math.max(M.floor(s.best),s.trophies-(M.homies()?M.lossAt(s.trophies):M.TABLE.trophies.loss))-s.trophies;if(d<0)chip='<span class="tr">'+TROPHY_SVG+d+'</span>'}
 b.innerHTML='<span>Leave</span>'+chip}
function leaveMatch(){const G=SB.G;paused=false;$('pause').hidden=true;if(!G||G.over)return;
 if(MENU_FLOW){const me=G.me.team,w=me===1?2:1;G.over=w===1?'Blue wins':'Red wins';G.result={winner:w,by:'leave',base:[G.base[1].hp,G.base[2].hp],mine:false};G._left=true}else showPick()}
function tapOn(el,fn){el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();soundOn=true;fn(e)})}
tapOn($('pauseBtn'),()=>{SND.play('ui_tap',{ui:true});pauseMatch()});
tapOn($('pResume'),()=>{SND.play('ui_play',{ui:true});resumeMatch()});
tapOn($('pause').firstChild,()=>{if(leaveArm){leaveArm=0;drawLeave()}});
tapOn($('pLeave'),()=>{SND.play('ui_tap',{ui:true});if(!leaveArm||performance.now()-leaveArm>4000){leaveArm=performance.now();drawLeave();return}leaveMatch()});
for(const[id,k]of[['pMusic','music'],['pSound','sound']])tapOn($(id),()=>{const M=window.SBL_META,s=M&&M.state?M.state.settings:SET;s[k]=s[k]===false;try{M&&M.save()}catch(e){}
 try{k==='music'?SND.setMusic(s.music):SND.setSound(s.sound)}catch(e){}setSw();SND.play('menu_tap',{ui:true})});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseMatch()});
addEventListener('keydown',e=>{if(e.key==='Escape'&&started&&SB.G&&!SB.G.over&&!(window.SBL_MENU&&window.SBL_MENU.active)){paused?resumeMatch():pauseMatch()}});
// world labels (seed farms, bases, hero names) fade where they would sit under the stick, a button, the dock or the score
function hudBoxes(){if(hudRects&&stick.id===null)return hudRects;if(stick.id!==null&&hudRects)return hudRects;
 const r=[];for(const id of LB>=7?['stickL','btnAtk','btnSup','seeds','top','pauseBtn','seedNum','next','upgSlot']:['stickL','btnAtk','btnSup','row','seeds','top','pauseBtn','lanebtns','seedNum']){const el=$(id);if(el&&el.offsetWidth){const b=stageRect(el);r.push({x:b.x-6,y:b.y-6,w:b.w+12,h:b.h+12})}}
 if(LB>=7)for(const el of[...$('hand').children,...(lbEls||[])]){if(el.offsetWidth){const b=stageRect(el);r.push({x:b.x-6,y:b.y-6,w:b.w+12,h:b.h+12})}}
 if(LB===8){const s=$('btnSup');if(s&&s.offsetWidth){const b=stageRect(s);r.push({x:b.x-6,y:b.y-44,w:b.w+12,h:44})}}   // 8: world labels also keep out of the band just over the super   // 8: the dock and the meter row fill the screen; their parts count
 {const tp=$('top');topRect=tp&&tp.offsetWidth?stageRect(tp):null}   // the score bar: base bars that would sit under it pin just below it
 const pb=$('pauseBtn');hudBand=0;if(pb&&pb.offsetWidth){const L=stageRect(pb).x-4;if(L>14)hudBand=L}   // the Dynamic Island band (the pause button sits just inside it): labels slide out of it
 return hudRects=r}
let hudBand=0,topRect=null;const clampX=(x,w)=>Math.max(x,hudBand+w/2+2);
// base health bars (ff-flow 2026-11-18, his "also shoudlnt it be health bars", "if its health", "for the thrones"; the score at the
// top stays as it is). A bar in team colour with the number over each base's roof. Where the roof is under the score bar, the bar
// sits just below the score; where it is under the bottom row, just above it. A base off screen shows its bar at that edge with
// an arrow toward it for 3 s after each hit, and every hit flashes the bar. ?basebar=0 is build 20's number under the base.
function baseBar(v,b,t){const el=v.bar,G=SB.G,hp=Math.max(0,b.hp);if(v.hp!==null&&hp<v.hp-1e-6)v.hitT=G.t;v.hp=hp;v.max=Math.max(v.max||0,hp,SB.CFG.baseHp||0);
 if(el._t!==t){el._t=t;el.lastChild.textContent=t;el.children[1].firstChild.style.width=(hp/v.max*100).toFixed(1)+'%'}
 const w=el._w||(el._w=el.offsetWidth||96),h=el._h||(el._h=el.offsetHeight||20),s=project(wx(v.p.x),2.9,wz(v.p.y)),recent=G.t-v.hitT<3;
 let x=Math.min(VW-w/2-4,clampX(s.x,w)),y=s.y,dir=0,show=true;
 const top=(topRect?topRect.y+topRect.h:0)+4;let bot=VH-4;if(hudRects)for(const r of hudRects)if(r.y>VH*.5&&x+w/2>r.x&&x-w/2<r.x+r.w)bot=Math.min(bot,r.y);
 if(y-h/2<top){if(y<-h)dir=-1;if(dir&&!recent)show=false;y=top+h/2}
 else if(y+h/2>bot){if(y>VH+h)dir=1;if(dir&&!recent)show=false;y=bot-h/2}
 const cls='lab bbar t'+v.t+(G.t-v.hitT<.5?' hit':'')+(dir<0?' up':dir>0?' down':'');if(el._c!==cls){el._c=cls;el.className=cls}
 el.style.opacity=show?1:0;if(show)el.style.transform=`translate(${x}px,${y}px) translate(-50%,-50%)`}
function underHud(x,y,w,h){if($('hud').hidden)return false;for(const b of hudBoxes())if(x<b.x+b.w&&x+w>b.x&&y<b.y+b.h&&y+h>b.y)return true;return false}
function drawHit(){const me=SB.G.me,el=$('hitdir'),f=me.hitFrom,age=f?SB.G.t-f.t:9;if(!f||age>.6||me.dead){el.style.opacity=0;$('hurt').style.opacity=0;return}
 const a=project(wx(me.x),.6,wz(me.y)),b=project(wx(f.x),.6,wz(f.y)),ang=Math.atan2(b.y-a.y,b.x-a.x);el.style.opacity=1-age/.6;el.style.transform=`translate(${a.x}px,${a.y}px) rotate(${ang}rad)`;$('hurt').style.opacity=Math.max(0,.55-age*1.4)}
const labSize=l=>l._w?l:(l._w=l.offsetWidth||40,l._h=l.offsetHeight||16,l);
const heroBoxes=[];
function drawLabels(){if(!$('hud').hidden)hudBoxes();heroBoxes.length=0;
 for(const v of heroViews){if(v.lab.style.display==='none')continue;const h=v.h,s=project(wx(h.x),v.ht+.35,wz(h.y)),l=labSize(v.lab),cx=Math.min(VW-l._w/2-2,clampX(s.x,l._w));if(cx!==s.x)v.lab.style.transform=`translate(${cx}px,${s.y}px) translate(-50%,-100%)`;let ly=s.y-l._h;
  if(underHud(cx-l._w/2,ly,l._w,l._h)){const f=project(wx(h.x),0,wz(h.y));ly=f.y+4;if(underHud(cx-l._w/2,ly,l._w,l._h))v.lab.style.opacity=0;else v.lab.style.transform=`translate(${cx}px,${ly}px) translate(-50%,0)`}   // under the score: the bar and name go under the feet instead, so a hero never loses his mark
  heroBoxes.push({x:cx-l._w/2,y:ly,w:l._w,h:l._h});{const ft=project(wx(h.x),0,wz(h.y)),bw=Math.max(36,l._w*.6);heroBoxes.push({x:ft.x-bw/2,y:s.y,w:bw,h:Math.max(0,ft.y+10-s.y)})}}   // and the body under it, down to his feet
 for(const f of farmViews){const s=project(wx(f.x),f.h,wz(f.y)),l=labSize(f.lab);s.x=clampX(s.x,l._w);f.lab.style.transform=`translate(${s.x}px,${s.y}px) translate(-50%,-100%)`;   // a hero's label on top of the farm's: the farm's steps aside
  const x=s.x-l._w/2,y=s.y-l._h;f.lab.style.opacity=underHud(x,y,l._w,l._h)||heroBoxes.some(b=>x<b.x+b.w&&x+l._w>b.x&&y<b.y+b.h&&y+l._h>b.y)?0:1}
 for(const v of baseViews){const b=SB.G.base[v.t],t=String(Math.max(0,Math.ceil(b.hp)));if(v.txt!==t){v.txt=t;v.lab.textContent=t;v.lab._w=0}
  if(v.bar){baseBar(v,b,t);v.lab.style.opacity=0;continue}
  const s=project(wx(v.p.x),.1,wz(v.p.y)+1.9),l=labSize(v.lab);v.lab.style.transform=`translate(${s.x}px,${s.y}px) translate(-50%,-50%)`;
  // ff-flow: it also steps aside where it would be cut by the screen edge (667x375 showed half a number at the bottom) or sit on a
  // hero's bar and name; the score bar at the top shows both bases' health all the time
  const x=s.x-l._w/2,y=s.y-l._h/2;v.lab.style.opacity=underHud(x,y,l._w,l._h)||y<0||y+l._h>VH||heroBoxes.some(b=>x<b.x+b.w&&x+l._w>b.x&&y<b.y+b.h&&y+l._h>b.y)?0:1}}

// ---- screens and loop
let started=false,myPick=0,busy=false;
// opts.deck: six {kind, tier} the player brings (the menu sets it); with none the hero's default deck
let myOpts={};async function startMatch(i,auto,opts){if(busy)return;busy=true;myPick=i;if(opts)myOpts=opts;started=false;for(const v of heroViews){scene.remove(v.grp);v.lab.remove()}heroViews=[];
 SB.start(i,!!auto,myOpts);UNITS.loadHomies(crewIds());fxReset();buildWorld();heroViews=await Promise.all(SB.G.heroes.map(makeHero));$('pick').hidden=true;$('over').hidden=true;$('hud').hidden=false;hudCards=[];started=true;busy=false;playS('match_start');lastTick=99;I.fire=false;aim=null;
 paused=false;$('pause').hidden=true;$('endStamp').hidden=true;hudRects=null;
 coach.on=/[?&]coach\b/.test(location.search)||(MENU_FLOW&&!!window.SBL_META&&window.SBL_META.state.played===0);coach.summoned=coach.laned=false;coach.t=coach.lt=0;
 focus.z=wz(SB.G.me.y);drawHud()}
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
// build 21: base health is shown by the HUD bars beside the clock (ff-review, his "it should part of the hud"); the bars over
// each roof (ff-flow) are off unless ?basebar=1, so the same health is not drawn twice.
const CAM_PRE=.9,CAM_OLD=/[?&]respawncam=0/.test(location.search),BASEBAR=/[?&]basebar=1/.test(location.search),HOMECAM=!/[?&]homecam=0/.test(location.search),HOME_AHEAD=1.6;
// a base goes see-through while the player's own hero stands behind or in it (ff-flow 2026-11-18): the 3 x 2.2 tile glass house
// covered him when he walked or came back there. Off: ?basefade=0.
const BASEFADE=!/[?&]basefade=0/.test(location.search);
function baseFade(me,dt){if(!BASEFADE)return;for(const v of baseViews){if(!v.g)continue;
 const dx=wx(me.x)-v.g.position.x,dz=wz(me.y)-v.g.position.z,hid=!me.dead&&Math.abs(dx)<1.95&&dz>-2.7&&dz<1.9,want=hid?.32:1;
 v.op=v.op===undefined?1:v.op+(want-v.op)*Math.min(1,dt*10);const o=v.op<.985?v.op:1;if(o===v.opSet)continue;v.opSet=o;
 if(!v.parts){v.parts=[];v.hulls=[];v.fmat=LOOK.toonMaterial({vertexColors:true,rim:.45,transparent:true});v.fmat.depthWrite=false;
  v.g.traverse(m=>{if(!m.isMesh)return;if(m.userData.isHull)v.hulls.push(m);else if(!m.userData.noOutline&&m.material&&m.material.vertexColors)v.parts.push([m,m.material])})}
 v.fmat.opacity=o;for(const[m,mat]of v.parts)m.material=o<1?v.fmat:mat;for(const h of v.hulls)h.visible=o>=1}}
const clock=new THREE.Clock();let fpsN=0,fpsT=performance.now();
function frame(_,__,fdt){const dt=fdt||Math.min(.05,clock.getDelta());
 if(started&&SB.G&&!paused){const G=SB.G,me=G.me;readInput();SB.update(dt);
  // dead: the camera stays where he fell, then moves to where he will come back for the last CAM_PRE seconds, so he appears on a
  // screen that is already there (build 20 panned after he was back, about half a second with him at the bottom edge)
  // near our own base (within about 8 tiles) the camera looks up to HOME_AHEAD tiles further up the lanes, so the base sits low on
  // the screen and the lanes above it show (the play review's "the camera parks on my own base"). ?homecam=0 = build 20.
  const fo=me.dead&&me.respawn<CAM_PRE&&!CAM_OLD?me.spawnAt||SB.BASEPOS[me.team]:me,hd=Math.abs(wz(fo.y)-wz(SB.BASEPOS[me.team].y)),ahead=.8+(HOMECAM?HOME_AHEAD*Math.max(0,Math.min(1,1-(hd-2)/6)):0),tz=wz(fo.y)-(me.team===1?ahead:-ahead),lim=SB.H*K/2-1.5,xl=Math.max(0,10.5-SPAN/2);
  focus.set(Math.max(-xl,Math.min(xl,focus.x+(wx(me.x)-focus.x)*Math.min(1,dt*6))),0,Math.max(-lim,Math.min(lim,focus.z+(tz-focus.z)*Math.min(1,dt*6))));
  shake=Math.max(0,shake-dt);const sx=shake?(Math.random()-.5)*shake*1.2:0,sz=shake?(Math.random()-.5)*shake*1.2:0;cam.position.set(focus.x+sx,Math.sin(PITCH)*camDist,focus.z+Math.cos(PITCH)*camDist+sz);cam.lookAt(focus.x+sx,0,focus.z+sz);cam.updateMatrixWorld();W.tickAll(world,G.t,dt);
  for(const v of heroViews)tickHero(v,dt);baseFade(me,dt);if(REC)recStick();drawUnits(G.t);drawTransient();drawEvents(G);TV.tick(G,dt);if(fxOn)FX.tick(dt);drawParts(dt);drawLabels();drawHit();if(LB)lbAnim();if((hudT+=dt)>.1){hudT=0;drawHud()}
  if(G.over&&$('over').hidden){$('overT').textContent=G.over==='Draw'?'Draw':G.over==='Blue wins'?'You win':'You lose';$('over').hidden=false;$('hud').hidden=true;coachAt(null);playS(G.over==='Draw'?'draw':G.over===(G.me.team===1?'Blue wins':'Red wins')?'win':'lose');
   if(MENU_FLOW&&!G._left){const out=G.over==='Draw'?'draw':G.over===(me.team===1?'Blue wins':'Red wins')?'win':'loss',st=$('endStamp');st.className=out;st.textContent=out==='win'?'Victory!':out==='loss'?'Defeat':'Draw';st.hidden=false}}}
 renderer.render(scene,cam);if(++fpsN===60){const t=performance.now();window.SBFPS=Math.round(60000/(t-fpsT));fpsT=t;fpsN=0}}
await LOOK.heroRoster();try{window.SBL_META&&SBL_META.setCatalog&&SBL_META.setCatalog(LOOK.catalog())}catch(e){}   /* skins (ff-looks): the cosmetics catalog to the save code */
buildDock();if(LB)buildLaneBtns();BOOT(.7);
const qs=new URLSearchParams(location.search);if(qs.has('hero'))await startMatch(+qs.get('hero')||0,qs.has('auto'));else showPick();
renderer.setAnimationLoop(frame);window.GAME={startMatch,showPick,scene,cam,renderer,SB,step(n,dt){for(let i=0;i<n;i++)frame(0,0,dt||1/30)},hold(v){renderer.setAnimationLoop(v?null:frame)},heroView:h=>heroViews.find(v=>v.h===h),setAim:o=>{aim=o},aim:()=>aim&&{sup:aim.sup,auto:!!aim.auto,cancel:!!aim.cancel,a:aim.a,d:aim.d},
 // test hook (tools/homies/build9_proof.js sizes): how tall each unit and hero is drawn on screen, in CSS px (its rest-pose box, placed and
 // scaled as drawn this frame, projected through the match camera)
 drawnSizes(){const out=[],V3=new THREE.Vector3(),hOf=b=>{let lo=1e9,hi=-1e9,l=1e9,r=-1e9;for(let i=0;i<8;i++){V3.set(i&1?b.max.x:b.min.x,i&2?b.max.y:b.min.y,i&4?b.max.z:b.min.z).project(cam);const py=(1-V3.y)/2*VH,px_=(V3.x+1)/2*VW;lo=Math.min(lo,py);hi=Math.max(hi,py);l=Math.min(l,px_);r=Math.max(r,px_)}return[Math.round(hi-lo),Math.round(r-l)]};
  for(const u of SB.G.units){if(u.dead||u._dsc===undefined)continue;const L=LK(u),md=UNITS.model(L.kind,L.tier-1);if(!md)continue;if(!md.geo.boundingBox)md.geo.computeBoundingBox();const b=md.geo.boundingBox.clone(),s=u._dsc;b.min.multiplyScalar(s);b.max.multiplyScalar(s);b.translate(new THREE.Vector3(wx(u.x),u._dy,wz(u.y)));out.push({id:u.hid||(u.kind+'_'+u.tier),team:u.team,own:L.kind>=3,...(([h,w])=>({h,w}))(hOf(b)),hover:+u._dy.toFixed(2)})}
  for(const v of heroViews){const b=new THREE.Box3().setFromObject(v.body);out.push({id:'hero:'+v.h.def.id,team:v.h.team,...(([h,w])=>({h,w}))(hOf(b))})}return out}};   // step, hold, aim and setAim are for tests and the clip recorder
// ==== MENU (shell branch): the app screens around the match live in menu.js; it gets the renderer, the hero pose code and the match start, and runs the frame while a screen is up. Keep this block whole when merging.
{const MENU=await import('./menu.js');await MENU.init({THREE,LOOK,W,UNITS,renderer,resize,CAST,rigOf,setBone,pose,startMatch,frame});}
// ==== /MENU
BOOT(1);   // loaded: the loading screen fades into the first screen (the first-run title, Home, or the match)
