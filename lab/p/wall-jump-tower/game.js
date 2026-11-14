'use strict';
/* Screens, animation, sound, input and the loop. The simulation is sim.js; drawing of the world is draw.js. */
const Q=new URLSearchParams(location.search);
let SV={done:{},ch:'gecko',mute:0};try{Object.assign(SV,JSON.parse(localStorage.getItem('wjt2')||'{}'))}catch(e){}
const save=()=>{try{localStorage.setItem('wjt2',JSON.stringify(SV))}catch(e){}};
let CH=CHARS.includes(Q.get('c'))?Q.get('c'):CHARS.includes(SV.ch)?SV.ch:'gecko';
let scr='title',LV=0,tab=0,btns=[],hold=false,press=false,release=false,frz=0,deadT=0,winT=0,intro=0,acc=0,lastSi=0,gone=false;
const an={clip:'idle',t:0,fr:0,sx:1,sy:1,face:1,tilt:0,dist:0,dustT:0};

/* ---------- sound ---------- */
const AU={c:null,g:null,buf:{},loops:{}},VAR={jump:3,land:3};
const FILES=['jump','jump_2','jump_3','air_jump','wall_kick','land','land_2','land_3','wall_slide','spring','crumble','pickup','gem','freeze','checkpoint','door','death','win','ui_tap','lava_loop','music'];
function loopS(n,vol){const b=AU.buf[n],s=AU.c.createBufferSource(),g=AU.c.createGain();s.buffer=b;s.loop=true;s.loopStart=.03;s.loopEnd=b.duration-.03;g.gain.value=vol;s.connect(g);g.connect(AU.g);s.start();AU.loops[n]=g}
function grab(f,ok){const x=new XMLHttpRequest();x.open('GET','sfx/'+f+'.m4a');x.responseType='arraybuffer';x.onload=()=>{if(x.response)AU.c.decodeAudioData(x.response,ok,()=>{})};x.onerror=()=>{};x.send()}
function auInit(){if(AU.c){if(AU.c.state!='running')AU.c.resume();return}const A=window.AudioContext||window.webkitAudioContext;if(!A)return;AU.c=new A();AU.g=AU.c.createGain();AU.g.gain.value=SV.mute?0:1;AU.g.connect(AU.c.destination);
 for(const f of FILES)grab(f,d=>{AU.buf[f]=d;if(f=='music')loopS(f,.28);else if(f=='lava_loop'||f=='wall_slide')loopS(f,0)})}
function sfx(n,vol,rate){if(!AU.c)return;const k=VAR[n]?(i=>i?n+'_'+(i+1):n)(Math.floor(Math.random()*VAR[n])):n,b=AU.buf[k];if(!b)return;const s=AU.c.createBufferSource(),g=AU.c.createGain();s.buffer=b;s.playbackRate.value=rate||1;g.gain.value=vol===undefined?1:vol;s.connect(g);g.connect(AU.g);s.start()}
const lvol=(n,v)=>{const g=AU.loops[n];if(g)g.gain.value+=(v-g.gain.value)*.15};

/* ---------- animation: clip from what the body is doing, squash and stretch from what just happened ---------- */
function setClip(c){if(an.clip!=c){an.clip=c;an.t=0}}
const DUST='#cbb9d6';
function dust(x,y,n,ax,ay){for(let i=0;i<n;i++)fx.push({x:x+FR(-4,4),y:y+FR(-2,1),vx:(ax||0)*FR(.3,1)+FR(-26,26),vy:(ay||0)*FR(.3,1)+FR(-14,4),life:FR(.3,.5),col:DUST,r:FR(1.6,2.8),dust:1})}
function events(){const p=S.p;for(const[k,x,y,v]of S.ev){
  if(k=='jump'){an.clip='';setClip('jump');an.sx=.6;an.sy=1.4;dust(x,y,4,0,-30);sfx('jump',.7,FR(.95,1.06))}
  else if(k=='kick'){an.clip='';setClip('kick');an.sx=.6;an.sy=1.4;dust(x+v*9,y-10,4,-v*70,-26);sfx('wall_kick',.8,FR(.95,1.05))}
  else if(k=='air'||k=='ring'){an.clip='';setClip('air');an.sx=.6;an.sy=1.4;const c=k=='ring'?C.accent:'#bfeeff';for(let i=0;i<8;i++){const a=i/8*6.28;fx.push({x:x+Math.cos(a)*9,y:y-4+Math.sin(a)*4,vx:Math.cos(a)*60,vy:20+Math.sin(a)*24,life:.32,col:c,r:2.2})}sfx('air_jump',.7,k=='ring'?1.3:FR(.97,1.04))}
  else if(k=='land'){const f=Math.min(1,v/1350);an.sx=1+.6*f;an.sy=1-.6*f;if(v>260){setClip('land');sfx('land',.25+.7*f,FR(.94,1.05))}if(v>=450)dust(x,y,8,0,-8);if(v>=880)cam.sh=3}
  else if(k=='turn'){setClip('turn');an.sx=.8;an.sy=1.2;dust(x-v*8,y,2,-v*40,-10)}
  else if(k=='cling'){an.clip='';setClip('cling');an.sx=.8;an.sy=1.18;dust(x,y+4,3,-v*30,10)}
  else if(k=='spring'){an.clip='';setClip('jump');an.sx=.58;an.sy=1.5;puff(x,y,10,C.accent,0,-90);sfx('spring',.8);cam.sh=2}
  else if(k=='bop'){an.clip='';setClip('jump');an.sx=.65;an.sy=1.4;puff(x,y,10,'#b9a2ff',0,40);sfx('spring',.6,1.35);frz=.05}
  else if(k=='crumble'){dust(x,y+4,10,0,60);sfx('crumble',.7)}
  else if(k=='pickup'){puff(x,y,16,v=='freeze'?'#8fe3ff':C.accent,0,0,150);sfx(v=='freeze'?'freeze':'pickup',.8)}
  else if(k=='gem'){let n=0;for(let i=0;i<G.gems.length;i++)n+=S.gems>>i&1;puff(x,y,14,C.gem,0,0,140);sfx('gem',.8,.9+.1*n)}
  else if(k=='cp'){puff(x-150,y-6,8,'#ff8a2a',0,-60);puff(x+150,y-6,8,'#ff8a2a',0,-60);sfx('checkpoint',.6)}
  else if(k=='dead'){setClip('die');puff(x,y,26,C.warn,0,-40,190);puff(x,y,10,'#ffe36a',0,-60,120);cam.sh=7;frz=.07;deadT=.62;sfx('death',.8)}
  else if(k=='win'){winT=1.25;puff(x,y-20,30,C.accent,0,-80,200);sfx('win',.8);const id=G.L.id,o=SV.done[id]||{g:0,t:1e9};SV.done[id]={g:o.g|S.gems,t:Math.min(o.t,S.time),n:G.gems.length};save()}}
 S.ev.length=0}
function anim(dt){const p=S.p;an.t+=dt;let k=an.clip,c=CLIPS[k]||CLIPS.run,done=c[1]&&an.t*c[1]>=c[0];
 if(S.dead)setClip('die');else if(S.win&&p.g)setClip('win');
 else if(p.g){if(k!='run'&&k!='turn'&&k!='land'||done)setClip('run')}
 else if(p.wall){if(k!='cling'&&k!='slide')setClip('cling');else if(k=='cling'&&done)setClip('slide')}
 else if(k=='jump'||k=='kick'){if(p.vy>-90)setClip('apex')}
 else if(k=='air'){if(done&&p.vy>-90)setClip(p.vy>=90?'fall':'apex')}
 else if(k=='apex'){if(p.vy>=90)setClip('fall');else if(p.vy<-260)setClip('jump')}
 else if(k=='fall'){if(p.vy<-200)setClip('jump')}
 else setClip(p.vy<0?'jump':'fall');
 k=an.clip;c=CLIPS[k];if(k=='run'){an.dist+=RUN*dt;an.fr=Math.floor(an.dist/46*c[0])%c[0];an.dustT-=dt;if(an.dustT<0){an.dustT=.267;dust(p.x-p.dir*6,p.y+10,1,-p.dir*20,-6)}}
 else if(k=='apex')an.fr=cl(Math.floor((p.vy+90)/180*c[0]),0,c[0]-1);
 else an.fr=c[2]?Math.floor(an.t*c[1])%c[0]:Math.min(c[0]-1,Math.floor(an.t*c[1]));
 const ap=(v,t,r)=>v<t?Math.min(t,v+r):Math.max(t,v-r);an.sx=ap(an.sx,1,1.75*dt);an.sy=ap(an.sy,1,1.75*dt);
 if(!S.dead)an.face=p.wall||p.dir;const tt=p.g||p.wall||k=='air'?0:cl(p.vy/900,-1,1)*.16*an.face;an.tilt+=(tt-an.tilt)*Math.min(1,14*dt);
 if(p.wall&&p.vy>30&&!S.dead&&Math.random()<dt*24){fx.push({x:p.x+p.wall*10,y:p.y+8,vx:-p.wall*FR(10,50),vy:FR(-60,-10),life:.3,col:'#ffb347',r:2});if(Math.random()<.4)dust(p.x+p.wall*9,p.y+4,1,-p.wall*14,-20)}
 lvol('wall_slide',p.wall&&p.vy>30&&!S.dead?Math.min(.5,p.vy/140):0);lvol('lava_loop',cl(1-(S.lava-p.y)/520,0,1)*.6)}
/* tail, plume, scarf: a short chain that trails the body every screen frame */
function trail(dt){const p={x:RP.x,y:RP.y},w=S.p.wall,f=w||S.p.dir;let ax,ay,rx_=-f,ry=.25;
 if(CH=='gecko'){if(w){ax=p.x+w*4;ay=p.y+9;rx_=-w*.3;ry=1}else{ax=p.x-f*9;ay=p.y+3.5;ry=.1}}else if(CH=='knight'){ax=p.x-f*3-(w?w*1.5:0);ay=p.y-12}else{ax=p.x-f*5;ay=p.y-1}
 if(!rope.length||Math.abs(rope[0].x-ax)>90||Math.abs(rope[0].y-ay)>200)rope=Array.from({length:6},()=>({x:ax,y:ay}));
 rope[0].x=ax;rope[0].y=ay;for(let i=1;i<rope.length;i++){const a=rope[i-1],b=rope[i],k=Math.min(1,22*dt),wv=Math.sin(T*11-i*1.1)*3.2;b.x+=(a.x+rx_*3.5+ry*wv*.5-b.x)*k;b.y+=(a.y+ry*3.5+(1-Math.abs(ry))*wv-b.y)*k;
  const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy);if(l>4.2){b.x=a.x+dx/l*4.2;b.y=a.y+dy/l*4.2}}}
function hero(){if(gone)return;const p=S.p,rc=CH=='gecko'?['#2fd1b8',6.2,.95,6]:CH=='knight'?['#2cc7b5',5.6,1,4]:['#2cc7b5',4.6,.6,5];
 if(rope.length&&an.clip!='air'&&an.clip!='die')for(let pass=0;pass<2;pass++)for(let i=1;i<rc[3];i++){ctx.strokeStyle=pass?rc[0]:'#150c1d';ctx.lineWidth=rc[1]-i*rc[2]+(pass?0:2.4);seg(rope[i-1].x,rope[i-1].y,rope[i].x,rope[i].y)}
 ctx.save();ctx.translate(RP.x,RP.y+10);if(an.tilt){ctx.translate(0,-10);ctx.rotate(an.tilt);ctx.translate(0,10)}
 const w=an.clip=='cling'||an.clip=='slide';ctx.scale(an.face*(w&&CH=='gecko'?an.sy:an.sx),w&&CH=='gecko'?an.sx:an.sy);sprite(ctx,CH,an.clip,an.fr);ctx.restore()}

/* ---------- play ---------- */
/* RP = where the body is drawn: between the last two physics steps, so 60 and 120 Hz screens both move evenly */
const RP={x:0,y:0,ox:0,oy:0};
function camX(){const p=S.p,q=G.segs[S.si];return q.dir=='across'?cl(RP.x-VW/2+p.dir*50,q.x0,q.x0+q.len-VW):Math.floor(p.x/VW)*VW}
const ease=(r,dt)=>1-Math.exp(-r*dt);
function startLevel(i){LV=i;G=build(LEVELS[i]);S=newState(G);fx=[];rope=[];scr='play';intro=1.8;deadT=winT=frz=acc=0;gone=false;lastSi=S.si;an.clip='run';an.t=0;an.sx=an.sy=1;an.tilt=0;RP.x=RP.ox=S.p.x;RP.y=RP.oy=S.p.y;cam.x=camX();cam.y=S.p.y-H*.7;press=release=false}
function tick(dt){anim(dt);trail(dt);const p=S.p;
 if(S.si!=lastSi){lastSi=S.si;sfx('door',.5)}
 if(deadT>0){deadT-=dt;if(an.clip=='die'&&an.t>.3)gone=true;if(deadT<=0){S=respawn(S);RP.x=RP.ox=S.p.x;RP.y=RP.oy=S.p.y;gone=false;rope=[];an.clip='';setClip(S.p.g?'run':'fall');an.sx=.7;an.sy=1.3;lastSi=S.si;puff(S.p.x,S.p.y,12,'#bfeeff',0,-30)}}
 if(winT>0){winT-=dt;if(winT<=0){scr='clear';sfx('checkpoint',.5,1.2)}}
 if(intro>0)intro-=dt;
 const ac=G.segs[S.si].dir=='across',tx=camX();cam.x+=(tx-cam.x)*ease(ac?7:9,dt);if(!ac&&Math.abs(tx-cam.x)<.5)cam.x=tx;
 const dn=G.segs[S.si].dir=='down',hi=RP.y-H*(dn?.3:.55),lo=RP.y-H*(dn?.34:.78);
 if(cam.y>hi)cam.y+=(hi-cam.y)*ease(dn?6:14,dt);else if(cam.y<lo)cam.y+=(lo-cam.y)*ease(12,dt)}
const tm=t=>Math.floor(t/60)+':'+(t%60<10?'0':'')+(t%60).toFixed(1);
function pips(x,y,n,mask,k,right){for(let i=0;i<n;i++)gemAt(right?x-(n-1-i)*13*k:x+i*13*k,y,k*.72,mask>>i&1)}
function hud(){const g=G,s=S,p=s.p,y=TOP+26;
 ctx.fillStyle=C.text;rr(16,y-8,4,16,1.5);ctx.fill();rr(24,y-8,4,16,1.5);ctx.fill();
 txt(g.L.name,VW/2,y,13,C.dim,'center');pips(VW-22,y,g.gems.length,s.gems,1,1);
 ctx.fillStyle=C.line;rr(16,y+15,VW-32,4,2);ctx.fill();const f=cl(s.best/g.total,0,1);if(f>0){ctx.fillStyle=C.accent;rr(16,y+15,Math.max(4,(VW-32)*f),4,2);ctx.fill()}
 for(let i=0;i<p.airMax;i++){ctx.beginPath();ctx.arc(22+i*13,y+33,4,0,6.3);if(i<p.air){ctx.fillStyle='#bfeeff';ctx.fill()}else{ctx.lineWidth=1.5;ctx.strokeStyle=C.line;ctx.stroke()}}
 if(s.key)icon('key',26+p.airMax*13,y+33,C.accent);if(s.frz>0){ctx.fillStyle='#8fe3ff';rr(16,y+44,60*s.frz/7,3,1.5);ctx.fill()}
 if(g.segs.length>1){let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;for(const q of g.segs){x0=Math.min(x0,q.c*VW);x1=Math.max(x1,q.c1*VW+VW);y0=Math.min(y0,q.y0+(q.dir=='across'?0:DH+30));y1=Math.max(y1,q.y1)}
  const k=Math.min(64/(x1-x0),90/(y1-y0)),mx=VW-16-(x1-x0)*k,my=y+30;ctx.lineWidth=1;ctx.globalAlpha=.85;
  for(let i=0;i<g.segs.length;i++){const q=g.segs[i],a=q.y0+(q.dir=='across'?0:DH+30),w=(q.c1-q.c+1)*VW*k;ctx.fillStyle=i==s.si?C.line:C.panel;ctx.strokeStyle=C.dim;ctx.fillRect(mx+(q.c*VW-x0)*k,my+(a-y0)*k,w,(q.y1-a)*k);ctx.strokeRect(mx+(q.c*VW-x0)*k+.5,my+(a-y0)*k+.5,w-1,(q.y1-a)*k-1)}
  const lv=my+(s.lava-y0)*k;if(lv<my+(y1-y0)*k){ctx.globalAlpha=.5;ctx.fillStyle=s.frz>0?C.dim:C.warn;ctx.fillRect(mx,Math.max(my,lv),(x1-x0)*k,my+(y1-y0)*k-Math.max(my,lv))}ctx.globalAlpha=1;
  ctx.fillStyle=C.accent;ctx.fillRect(mx+(g.goalX-x0)*k-2,my+(g.goalY-y0)*k-1,4,2);ctx.fillStyle=C.text;ctx.beginPath();ctx.arc(mx+(cl(p.x,x0,x1)-x0)*k,my+(cl(p.y,y0,y1)-y0)*k,2.2,0,6.3);ctx.fill()}
 if(intro>0){ctx.globalAlpha=cl(intro*1.6,0,1);txt(CHAPTERS[Math.floor(LV/5)],VW/2,H*.3-28,13,C.dim,'center');txt(g.L.name,VW/2,H*.3,30,C.text,'center',600);ctx.globalAlpha=1}}

/* ---------- screens ---------- */
function btn(label,x,y,w,h,kind,fn){btns.push({x,y,w,h,fn});if(kind==1){ctx.fillStyle=C.accent;rr(x,y,w,h,h/2);ctx.fill();txt(label,x+w/2,y+h/2+.5,17,'#1d1206','center',600)}
 else if(kind==2){ctx.strokeStyle=C.line;ctx.lineWidth=1;rr(x+.5,y+.5,w-1,h-1,h/2);ctx.stroke();txt(label,x+w/2,y+h/2+.5,15,C.text,'center',500)}else txt(label,x+w/2,y+h/2,15,C.dim,'center',500)}
function shade(a){ctx.fillStyle='rgba(16,9,22,'+a+')';ctx.fillRect(0,0,VW,H)}
function backdrop(){back(0,-H-200);lava({lava:H-70+cam.y,frz:0});let gr=ctx.createRadialGradient(VW/2,H*.45,H*.2,VW/2,H*.45,H*.8);gr.addColorStop(0,'rgba(8,4,12,0)');gr.addColorStop(1,'rgba(8,4,12,.6)');ctx.fillStyle=gr;ctx.fillRect(0,0,VW,H)}
function title(){cam.y=-H-200;backdrop();const cy=H*.5;txt('Wall Jump Tower',VW/2,TOP+H*.17,31,C.text,'center',600);
 glow(VW/2,cy-30,150,'255,150,60',.22);ctx.fillStyle='rgba(0,0,0,.3)';rr(VW/2-67,cy+7,140,12,4);ctx.fill();ctx.fillStyle='#6a5874';rr(VW/2-70,cy,140,12,4);ctx.fill();ctx.fillStyle='#9a87a5';rr(VW/2-69,cy,138,4,2);ctx.fill();
 const c=CLIPS.idle;ctx.save();ctx.translate(VW/2,cy);ctx.scale(3.4,3.4);ctx.imageSmoothingEnabled=true;sprite(ctx,CH,'idle',Math.floor(T*c[1])%c[0]);ctx.restore();
 ctx.strokeStyle=C.dim;ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';for(const s of[-1,1]){const x=VW/2+s*112;ctx.beginPath();ctx.moveTo(x-s*5,cy-52);ctx.lineTo(x+s*5,cy-42);ctx.lineTo(x-s*5,cy-32);ctx.stroke()}ctx.lineCap='butt';
 const sw=d=>()=>{CH=CHARS[(CHARS.indexOf(CH)+d+CHARS.length)%CHARS.length];SV.ch=CH;save();rope=[]};btns.push({x:0,y:cy-110,w:VW/2,h:130,fn:sw(-1)},{x:VW/2,y:cy-110,w:VW/2,h:130,fn:sw(1)});
 let nx=LEVELS.findIndex(l=>!SV.done[l.id]);if(nx<0)nx=0;
 btn('Play',VW/2-100,H-BOT-212,200,54,1,()=>startLevel(nx));btn('Levels',VW/2-70,H-BOT-146,140,44,0,()=>{tab=Math.floor(nx/5);scr='levels'})}
function chev(x,y,fn){ctx.strokeStyle=C.text;ctx.lineWidth=2.5;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(x+5,y-9);ctx.lineTo(x-4,y);ctx.lineTo(x+5,y+9);ctx.stroke();ctx.lineCap='butt';btns.push({x:x-20,y:y-24,w:52,h:48,fn})}
function levels(){cam.y=-H-200;backdrop();shade(.55);chev(24,TOP+30,()=>{scr='title'});
 let x=24;const ty=TOP+84;for(let i=0;i<CHAPTERS.length;i++){ctx.font='600 13.5px Inter,system-ui,sans-serif';const w=ctx.measureText(CHAPTERS[i]).width;txt(CHAPTERS[i],x,ty,13.5,i==tab?C.text:C.dim,'left',600);if(i==tab){ctx.fillStyle=C.accent;rr(x,ty+13,w,2.5,1.2);ctx.fill()}const k=i;btns.push({x:x-7,y:ty-22,w:w+14,h:44,fn:()=>{tab=k}});x+=w+16}
 for(let i=0;i<5;i++){const n=tab*5+i,L=LEVELS[n],y=TOP+124+i*62,d=SV.done[L.id];ctx.fillStyle=C.line;ctx.fillRect(24,y+61.5,VW-48,1);
  txt(L.name,24,y+31,18,C.text,'left',500);if(d){pips(VW-30,y+31,d.n||1,d.g,1.25,1);ctx.fillStyle=C.accent;ctx.beginPath();ctx.arc(14,y+31,2.5,0,6.3);ctx.fill()}btns.push({x:0,y,w:VW,h:62,fn:()=>startLevel(n)})}}
function pauseS(){shade(.72);const y=H*.34;btn('Resume',VW/2-100,y,200,54,1,()=>{scr='play'});btn('Restart',VW/2-100,y+70,200,48,2,()=>startLevel(LV));btn('Levels',VW/2-100,y+128,200,48,2,()=>{tab=Math.floor(LV/5);scr='levels'});
 btn(SV.mute?'Sound off':'Sound on',VW/2-100,y+190,200,44,0,()=>{SV.mute=SV.mute?0:1;save();if(AU.g)AU.g.gain.value=SV.mute?0:1})}
function clearS(){shade(.72);const y=H*.3,g=G;txt(g.L.name,VW/2,y,15,C.dim,'center');txt('Clear',VW/2,y+38,34,C.text,'center',600);
 if(g.gems.length)pips(VW/2-(g.gems.length-1)*13,y+86,g.gems.length,S.gems,2,0);txt(tm(S.time),VW/2,y+124,15,C.dim,'center');
 const last=LV>=LEVELS.length-1;btn(last?'Levels':'Next',VW/2-100,y+164,200,54,1,()=>last?(tab=2,scr='levels'):startLevel(LV+1));btn('Again',VW/2-100,y+232,200,48,2,()=>startLevel(LV));if(!last)btn('Levels',VW/2-100,y+288,200,44,0,()=>{tab=Math.floor(LV/5);scr='levels'})}

/* ---------- loop and input ---------- */
function resize(){const r=cv.getBoundingClientRect(),d=Math.min(3,window.devicePixelRatio||1);cv.width=Math.round(r.width*d);cv.height=Math.round(r.height*d);SC=r.width/VW;H=r.height/SC;ctx.setTransform(d*SC,0,0,d*SC,0,0);
 const sa=document.getElementById('sa');if(sa){const s=getComputedStyle(sa);TOP=(parseFloat(s.paddingTop)||0)/SC;BOT=(parseFloat(s.paddingBottom)||0)/SC}}
function down(x,y){auInit();if(scr=='play'){if(x<56&&y<TOP+52&&!S.win&&!S.dead){scr='pause';sfx('ui_tap',.6);return}press=true;hold=true;return}
 for(let i=btns.length-1;i>=0;i--){const b=btns[i];if(x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h){sfx('ui_tap',.6);b.fn();return}}}
function up(){hold=false;release=true}
cv.addEventListener('pointerdown',e=>{e.preventDefault();const r=cv.getBoundingClientRect();down((e.clientX-r.left)/SC,(e.clientY-r.top)/SC)});addEventListener('pointerup',up);addEventListener('pointercancel',up);
addEventListener('keydown',e=>{if(e.repeat)return;if(e.key==' '||e.key=='Enter'){e.preventDefault();if(scr=='play')down(180,400);else if(btns.length){auInit();(btns.find(b=>b.w==200)||btns[0]).fn()}}else if(e.key=='Escape'&&scr=='play')scr='pause'});
addEventListener('keyup',e=>{if(e.key==' ')up()});addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(scr=='play')scr='pause';if(AU.c)AU.c.suspend()}else if(AU.c)AU.c.resume()});
let last=0,autoN=0;function loop(t){const dt=Math.min(.05,(t-last)/1000||0);last=t;T+=dt;btns=[];
 if(scr=='play'){if(frz>0)frz-=dt;else{acc+=dt;while(acc>=1/120){if(window.__auto&&!S.dead&&!S.win&&autoN++%6==0&&think(G,S,{n:4,d:60}))press=true;RP.ox=S.p.x;RP.oy=S.p.y;step(G,S,1/120,{press,release,hold});press=release=false;acc-=1/120;if(S.ev.length)events()}
   const p=S.p,a=acc*120,jx=Math.abs(p.x-RP.ox)>30||Math.abs(p.y-RP.oy)>30||S.dead;RP.x=jx?p.x:RP.ox+(p.x-RP.ox)*a;RP.y=jx?p.y:RP.oy+(p.y-RP.oy)*a;tick(dt)}}
 else{lvol('wall_slide',0);lvol('lava_loop',scr=='title'?.25:0)}
 for(const f of fx){f.x+=f.vx*dt;f.y+=f.vy*dt;if(!f.dust)f.vy+=260*dt;f.life-=dt}fx=fx.filter(f=>f.life>0);cam.sh=Math.max(0,cam.sh-22*dt);
 ctx.clearRect(0,0,VW,H);
 if(scr=='title')title();else if(scr=='levels')levels();else{world(hero);hud();if(scr=='pause')pauseS();else if(scr=='clear')clearS()}
 requestAnimationFrame(loop)}
resize();loadSheets();G=build(LEVELS[0]);S=newState(G);
if(+Q.get('l')>0&&LEVELS[+Q.get('l')-1])startLevel(+Q.get('l')-1);
requestAnimationFrame(loop);
/* checks only: the test player drives the real game. __auto plays live; __run(sec) plays ahead without waiting for frames */
window.__dbg=()=>({G,S,cam,H,an,scr});window.__go=startLevel;
window.__run=sec=>{for(let i=0;i<sec*120&&scr=='play';i++){if(!S.dead&&!S.win&&i%6==0&&think(G,S,{n:4,d:60}))press=true;RP.ox=S.p.x;RP.oy=S.p.y;step(G,S,1/120,{press,release,hold:true});press=release=false;if(S.ev.length)events();
  if(i%2){RP.x=S.p.x;RP.y=S.p.y;T+=1/60;tick(1/60);for(const f of fx){f.x+=f.vx/60;f.y+=f.vy/60;f.life-=1/60}fx=fx.filter(f=>f.life>0)}}return{scr,x:Math.round(S.p.x),y:Math.round(S.p.y),si:S.si,deaths:S.deaths,gems:S.gems,clip:an.clip}};
/* the iPhone app's own check (launched with -qa on the simulator): where the page came from, whether the sheets and the
   sounds loaded, and the test player through three levels. Lines go to the app's log (ci/mac_run.py reads them). */
if(window.__qa){const say=m=>{try{webkit.messageHandlers.qa.postMessage(m)}catch(e){console.log(m)}};
 addEventListener('error',e=>say('QA_ERROR '+e.message+' '+(e.filename||'').split('/').pop()+':'+e.lineno));
 setTimeout(()=>{auInit();setTimeout(()=>{say('QA_INFO '+JSON.stringify({from:location.origin,sheets:CHARS.map(c=>sheets[c]?sheets[c].tagName:'none').join(','),sounds:Object.keys(AU.buf).length+'/'+FILES.length,audio:AU.c?AU.c.state:'none',w:innerWidth,h:innerHeight,top:Math.round(TOP*SC),bottom:Math.round(BOT*SC)}));
  const lv=[0,7,14];let k=0;(function next(){if(k>=lv.length){say('QA_DONE');return}startLevel(lv[k]);let n=0;const t=setInterval(()=>{__run(3);if(scr=='clear'||++n>90){clearInterval(t);say('QA_LEVEL '+(lv[k]+1)+' '+(scr=='clear'?'won':'NOT won')+', deaths '+S.deaths);k++;setTimeout(next,2500)}},350)})()},5000)},1500)}
