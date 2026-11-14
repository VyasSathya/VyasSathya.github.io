'use strict';
/* Wall Jump Tower: simulation and map building. No drawing and no page: index.html and tools/bot.js load this same file.
   One button. The character runs by itself, turns at walls on the ground, slides on walls in the air.
   Jump numbers are the Web Lab Tower seed's (C:/Dev/vyas-lab/six-base-games, game 0); change them only on his word. */
const VW=360,RUN=200,JV=610,AJ=560,WT=6,DH=78,GAP=380,VGAP=300;
const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
let rs=1;const rnd=()=>{rs=rs+0x6D2B79F5|0;let t=Math.imul(rs^rs>>>15,1|rs);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const R=(a,b)=>a+rnd()*(b-a),X=c=>c*VW;

/* ---------- map: a level is a list of shafts left to right (up / down / across), or one three-wide tower ---------- */
function build(L){
 rs=(L.seed||1)*1000+7;
 const g={L,solids:[],pl:[],hot:[],it:[],segs:[],dr:[],gems:[],wind:[],mh:[],rings:[],start:{x:VW/2,y:-10,dir:1},lv:Object.assign({v:24,acc:.008},L.lava)};
 const wall=(c,side,y0,y1,ds,o)=>{const x=X(c)+(side?VW-WT:0),ice=o&&o.ice?1:0,lift=o&&o.lift&&!side?1:0;let top=y0;
  for(const d of[...ds].sort((a,b)=>a-b)){g.dr.push({x:x+(side?-16:WT+16),y:d-DH/2,s:side?1:-1,show:side||(o&&o.both)?1:0});if(d-DH>top)g.solids.push({x,y:top,w:WT,h:d-DH-top,wall:1,ice,lift});top=d}
  if(y1>top)g.solids.push({x,y:top,w:WT,h:y1-top,wall:1,ice,lift})};
 const floor=(c,y,w)=>g.solids.push({x:X(c),y,w:(w||1)*VW,h:14,wall:1,fl:1});
 const ceil=(c,y,w)=>g.solids.push({x:X(c),y:y-14,w:(w||1)*VW,h:14,wall:1,fl:1});
 const landing=(c,y,goal)=>g.pl.push({x:X(c)+WT,y,w:VW-2*WT,land:1,cp:1,cv:(g.tower?0:c*1e5)-y,goal:goal?1:0});
 const gem=(x,y)=>g.gems.push({x,y});
 function ledges(c,yb,yt,o){const x0=X(c),ps=[],mov=o.mov||0,cr=o.cr||0,sp=o.sp||0;let y=yb;
  while(y>yt+190){y-=R(o.g0||78,o.g1||104);const w=R(o.w0||64,o.w1||128),q={x:R(x0+12,x0+VW-12-w),y,w},r=rnd();
   if(r<mov){q.vx=(rnd()<.5?-1:1)*R(30,60);q.a=x0+10;q.b=x0+VW-10}else if(r<mov+cr)q.cr=.45;else if(r<mov+cr+sp&&y>yt+520)q.sp=1;
   g.pl.push(q);ps.push(q);
   if(y<yb-200&&y>yt+320){const r2=rnd(),a=o.pil||0,b=a+(o.saw||0),d=b+(o.las||0);
    if(r2<a){const h=R(90,170),x=R(x0+70,x0+VW-78);g.solids.push({x,y:y-R(20,60)-h,w:8,h,pil:1})}
    else if(r2<b)g.mh.push({k:'saw',x0:x0+34,x1:x0+VW-34,y0:y-46,y1:y-46,per:R(2.8,3.8),ph:rnd(),r:11});
    else if(r2<d){const lw=R(150,190);g.hot.push({x:rnd()<.5?x0+WT:x0+VW-WT-lw,y:y-48,w:lw,h:8,per:2.6,on:.46,ph:rnd()})}}}
  const plain=ps.filter(q=>!q.vx&&!q.cr&&!q.sp),mid=plain[Math.floor(plain.length/2)];
  if(o.item&&mid)g.it.push({x:mid.x+mid.w/2,y:mid.y-24,k:o.item});
  [.72,.36,.1].slice(0,o.gem||0).forEach(f=>{const q=plain[Math.floor(plain.length*f)]||mid;if(q)gem(cl(q.x+q.w/2+(rnd()<.5?-1:1)*R(50,80),x0+26,x0+VW-26),q.y-R(72,96))});
  for(let i=0;i<(o.fb||0);i++)g.mh.push({k:'fb',x:x0+R(60,VW-60),per:R(2.8,3.6),ph:rnd(),h:R(210,260),r:9});
  return ps}
 function chimney(c,yb,yt,o){const x0=X(c),lo=yb-90,hi=yt+96,n=Math.max(1,Math.round((lo-hi)/330)),h=(lo-hi-(n-1)*84)/n,ice=o.ice?1:0;let y=lo,prev=-1;
  for(let i=0;i<n;i++){const w=R(134,150),a=prev<0?R(30,VW-30-w):prev<110?R(prev+60,VW-30-w):R(30,prev-60);prev=a;
   g.solids.push({x:x0+WT,y:y-h,w:a-WT,h,blk:1,ice},{x:x0+a+w,y:y-h,w:VW-WT-a-w,h,blk:1,ice});
   const sx=x0+(a>VW-a-w?a/2:a+w+(VW-a-w)/2);
   if(o.item&&i==Math.floor(n/2))g.it.push({x:sx,y:y-h-26,k:o.item});
   if(o.gem&&i==(n>1?n-2:0))gem(x0+(a>VW-a-w?a+w+(VW-a-w)/2:a/2),y-h-30);
   y-=h+84}}
 function windy(c,yb,yt,o){const x0=X(c);let y=yb-70,side=rnd()<.5?0:1,k=0;
  while(y>yt+300){const h=Math.min(R(250,330),y-yt-150),x=x0+(side?VW-WT-118:WT);g.wind.push({x,y:y-h,w:118,h});
   g.pl.push({x:x0+(side?34:VW-34-112),y:y-h+6,w:112});if(o.gem&&k==1)gem(x+59,y-h-34);
   if(o.saw&&k%2)g.mh.push({k:'saw',x0:x0+150,x1:x0+VW-150,y0:y-h/2-40,y1:y-h/2+40,per:3.2,ph:rnd(),r:11});
   y-=h+34;side=1-side;k++}}
 function bats(c,yb,yt,o){const x0=X(c),ps=[];let y=yb,k=0;
  while(y>yt+300){const up=R(236,262);y-=up;const w=R(100,128),q={x:R(x0+16,x0+VW-16-w),y,w};g.pl.push(q);ps.push(q);
   g.mh.push({k:'bat',x0:x0+70,x1:x0+VW-70,y0:y+up-R(96,108),y1:y+up-R(96,108),per:R(3.4,4.2),ph:rnd(),r:10});
   if(o.gem&&k==1)gem(q.x+q.w/2,y-150);k++}
  if(o.item&&ps[1])g.it.push({x:ps[1].x+ps[1].w/2,y:ps[1].y-24,k:o.item})}
 /* boost rings: a ledge on one wall, two rings on the diagonal to the far wall, a kick back onto the next ledge */
 function rings(c,yb,yt,o){const x0=X(c);let y=yb,d=1,k=0;
  while(y>yt+430){if(k)g.pl.push({x:d>0?x0+WT:x0+VW-WT-150,y,w:150});const e=d>0?x0+WT+150:x0+VW-WT-150;
   g.rings.push({x:e+d*66,y:y-100,r:18},{x:e+d*144,y:y-204,r:18});if(o.gem&&k==1)gem(x0+VW/2,y-330);
   if(o.saw&&k%2)g.mh.push({k:'saw',x0:x0+VW/2-60,x1:x0+VW/2+60,y0:y-40,y1:y-40,per:3,ph:rnd(),r:11});y-=400;d=-d;k++}
  g.pl.push({x:d>0?x0+WT:x0+VW-WT-150,y,w:150});while(y>yt+200){y-=R(84,100);g.pl.push({x:R(x0+30,x0+VW-150),y,w:120})}}
 const fills={ledges,chimney,windy,bats,rings};
 const fill=(m,c,yb,yt)=>fills[m.fill||'ledges'](c,yb,yt,m.o||{});
 if(L.map[0].t=='tower3'){const m=L.map[0],K=m.k||4,ys=[0,-650];for(let k=2;k<=K;k++)ys.push(ys[k-1]-950);const top=ys[K],doors=ys.slice(1);
  g.start.x=X(1)+VW/2;g.tower=1;
  wall(1,0,top-240,14,doors,{both:1});wall(1,1,top-240,14,doors,{both:1});floor(1,0);for(let k=1;k<K;k++)landing(1,ys[k]);landing(1,top,true);
  for(let k=0;k<K;k++)ledges(1,ys[k],ys[k+1],k%2?{mov:.5,cr:.18,pil:.15}:{pil:.4,gem:k==2});
  for(const c of[0,2]){wall(c,0,top-DH-44,ys[1]+14,c?doors:[],{both:1});wall(c,1,top-DH-44,ys[1]+14,c?[]:doors,{both:1});floor(c,ys[1]);ceil(c,top-DH-30);for(let k=2;k<=K;k++)landing(c,ys[k]);
   for(let k=1;k<K;k++){if(c==0)chimney(c,ys[k],ys[k+1],{item:'freeze',gem:k==1});else ledges(c,ys[k],ys[k+1],{pil:.8,w0:52,w1:92,item:'jump',mov:.2,sp:k>1?.12:0,gem:k==K-1})}}
  g.segs.push({c:0,c1:0,y0:top-DH-44,y1:ys[1],dir:'up'},{c:1,c1:1,y0:top-120,y1:0,dir:'up'},{c:2,c1:2,y0:top-DH-44,y1:ys[1],dir:'up'});g.goalY=top;g.goalX=X(1)+VW/2}
 else{let c=0,y=0,pend=[];
  L.map.forEach((m,i)=>{const last=i==L.map.length-1,o=m.o||{};
   if(m.t=='up'){const yb=y,yt=yb-m.h,out=last?[]:[yt];wall(c,0,yt-DH-44,yb+14,pend,o);wall(c,1,yt-DH-44,yb+14,out,o);floor(c,yb);
    for(const a of pend)if(a<yb-1)g.solids.push({x:X(c)+WT,y:a,w:74,h:14,blk:1});
    if(!last)ceil(c,yt-DH-30);landing(c,yt,last);fill(m,c,yb,yt);
    if(o.gate){g.solids.push({x:X(c)+VW-WT-12,y:yt-DH,w:12,h:DH,gate:1});for(const q of g.pl)if(q.land&&q.y==yt&&q.x==X(c)+WT)q.need=1;const ps=g.pl.filter(q=>q.x>=X(c)&&q.x<X(c)+VW&&!q.land&&!q.vx&&!q.cr&&!q.sp&&q.y<yt+420&&q.y>yt+150),q=ps.sort((a,b)=>a.x-b.x)[0];if(q)g.it.push({x:q.x+q.w/2,y:q.y-24,k:'key'})}
    g.segs.push({c,c1:c,y0:yt-DH-44,y1:yb,dir:'up',len:m.h});pend=out;y=yt;c++;if(last){g.goalY=yt;g.goalX=X(c-1)+VW/2}}
   else if(m.t=='down'){const top=y,vb=y+m.h,alt=(m.alt||[]).map(d=>top+d);wall(c,0,top-DH-44,vb+14,pend,o);wall(c,1,top-DH-44,vb+14,[vb,...alt],o);floor(c,vb);ceil(c,top-DH-30);
    g.solids.push({x:X(c)+WT,y:top,w:74,h:14,blk:1});
    for(const a of alt){g.solids.push({x:X(c)+VW-WT-100,y:a,w:100,h:14,blk:1});if(o.gem)gem(X(c)+VW-WT-52,a-26)}
    for(let k=0;k<(o.hot||0);k++)g.hot.push({x:X(c)+R(120,230),y:top+(m.h-150)*(k+1)/((o.hot||0)+1)+R(-30,30)+60,w:70,h:12});
    if(o.gem&&!alt.length)gem(X(c)+VW/2+R(-40,40),top+m.h*.5);
    for(let k=0;k<(o.saw||0);k++)g.mh.push({k:'saw',x0:X(c)+40,x1:X(c)+VW-40,y0:top+m.h*(k+1)/((o.saw||0)+1)+40,y1:top+m.h*(k+1)/((o.saw||0)+1)+40,per:R(2.4,3.2),ph:rnd(),r:11});
    g.segs.push({c,c1:c,y0:top-DH-44,y1:vb,dir:'down',len:m.h});pend=[vb,...alt];y=vb;c++}
   else{const W=m.w||2,x0=X(c),x1=X(c+W),top=y-250;wall(c,0,top-14,y+14,pend,o);wall(c+W-1,1,top-14,y+14,[y],o);ceil(c,top,W);
    /* floor with pits; a pit kills a little below the floor line */
    let fx=x0;const pits=[];for(let k=0;k<(o.pits||0);k++){const pw=R(o.p0||70,o.p1||96),px=x0+150+(x1-x0-330)*(k+.5)/(o.pits)+R(-30,30)-pw/2;pits.push([px,pw])}
    for(const[px,pw]of pits){g.solids.push({x:fx,y,w:px-fx,h:14,wall:1,fl:1});g.hot.push({x:px,y:y+34,w:pw,h:14,pit:1});if(o.bat)g.mh.push({k:'bat',x0:px+pw/2-8,x1:px+pw/2+8,y0:y-34,y1:y-40,per:2.4,ph:rnd(),r:10});fx=px+pw}
    g.solids.push({x:fx,y,w:x1-fx,h:14,wall:1,fl:1});
    for(let k=0;k<(o.spk||0);k++){const sx=x0+130+(x1-x0-290)*(k+.5)/(o.spk)+R(-24,24);if(!pits.some(([px,pw])=>sx+28>px-30&&sx<px+pw+30))g.hot.push({x:sx,y:y-10,w:26,h:10,spk:1})}
    for(let k=0;k<(o.saw||0);k++){const sx=x0+160+(x1-x0-320)*(k+.5)/(o.saw);g.mh.push({k:'saw',x0:sx,x1:sx,y0:y-24,y1:y-150,per:R(2.2,2.9),ph:rnd(),r:11})}
    for(let k=0;k<(o.las||0);k++){const sx=x0+170+(x1-x0-340)*(k+.5)/(o.las);g.hot.push({x:sx,y:top,w:8,h:250,per:2.4,on:.45,ph:k*.37})}
    if(o.gem)gem((x0+x1)/2+R(-60,60),y-150);
    g.segs.push({c,c1:c+W-1,y0:top-14,y1:y,dir:'across',len:W*VW,x0});pend=[y];c+=W}})}
 let cum=0;for(const s of g.segs){s.s0=cum;cum+=g.tower?0:s.len}
 g.total=g.tower?-g.goalY:cum;g.open=g.solids.filter(q=>!q.gate);return g}

function newState(g){const s={p:{x:g.start.x,y:g.start.y,dir:1,vy:0,g:true,wall:0,air:1,airMax:1,coy:0,lw:0,sq:0,ice:0,inw:0},pl:g.pl.map(q=>({...q})),it:g.it.map(q=>({...q})),
 md:g.mh.map(()=>0),rg:g.rings.map(()=>0),lava:340,frz:0,jb:0,t:0,time:0,best:0,si:g.tower?1:0,dead:false,win:false,gems:0,key:0,cv:-1e9,deaths:0,go:0,tr:[],rec:1,t0:0,ev:[],snap:null};s.snap=clone(s);return s}
function clone(s){return{...s,p:{...s.p},pl:s.pl.map(q=>({...q})),it:s.it.map(q=>({...q})),md:s.md.slice(),rg:s.rg.slice(),rec:0,ev:[],snap:null}}
/* back to the last checkpoint; gems already taken stay taken */
function respawn(s){const z=clone(s.snap);z.snap=s.snap;z.gems=s.gems;z.deaths=s.deaths+1;z.time=s.time;z.lava=Math.max(z.lava,z.p.y+340);z.rec=1;z.tr=[];z.t0=z.t;return z}
/* the shadow of the last level: where the player was L.chase seconds ago */
function chaser(g,s){const d=g.L.chase,a=s.tr;if(!d||s.t-s.t0<d+.5||a.length<3)return null;const tt=s.t-d;let lo=0,hi=a.length/3-1;while(lo<hi){const m=lo+hi>>1;if(a[m*3]<tt)lo=m+1;else hi=m}return{x:a[lo*3+1],y:a[lo*3+2]}}
function segOf(g,s){const c=Math.floor(s.p.x/VW);for(let i=0;i<g.segs.length;i++)if(c>=g.segs[i].c&&c<=g.segs[i].c1)return i;return s.si}
function prog(g,s){if(g.tower)return-s.p.y;const q=g.segs[s.si],p=s.p;return q.s0+cl(q.dir=='up'?q.y1-10-p.y:q.dir=='down'?p.y+10-(q.y1-q.len):p.x-q.x0,0,q.len)}
function mhPos(m,t,lava){if(m.k=='fb'){const u=(t/m.per+m.ph)%1;return u<.62?{x:m.x,y:lava+14-Math.sin(Math.PI*u/.62)*m.h,on:1,u}:{x:m.x,y:lava+14,on:0,u}}
 const k=.5-.5*Math.cos(6.2832*(t/m.per+m.ph));return{x:m.x0+(m.x1-m.x0)*k,y:m.y0+(m.y1-m.y0)*k,on:1}}
const hotOn=(q,t)=>!q.per||((t/q.per+q.ph)%1)<q.on;

/* ---------- one step of the game. inp: {press, release, hold}. Things that happened go to s.ev for sound and effects. ---------- */
function step(g,s,dt,inp){
 if(s.dead||s.win)return;const p=s.p,E=(k,x,y,v)=>{if(s.ev)s.ev.push([k,x,y,v])};s.t+=dt;s.time+=dt;if(inp.press){s.jb=.14;s.go=1}else s.jb-=dt;
 const land=(lq,ly,v)=>{p.y=ly-10;p.sq=Math.min(.3,v/2600);E('land',p.x,p.y+10,v);p.vy=0;p.g=true;p.air=p.airMax;if(p.wall){p.dir=-p.wall;p.wall=0}
  if(lq.sp){p.vy=-1050;p.g=false;p.sq=-.3;lq.spt=.25;E('spring',p.x,p.y+10)}
  if(lq.cp&&lq.cv>s.cv&&!lq.goal&&!(lq.need&&!s.key)){s.cv=lq.cv;s.snap=clone(s);E('cp',p.x,p.y)}
  if(lq.goal){s.win=true;E('win',p.x,p.y)}};
 let ri=-1;if(s.jb>0&&!p.g)for(let i=0;i<g.rings.length;i++){const q=g.rings[i];if(s.rg[i]<=0&&Math.abs(q.x-p.x)<q.r+8&&Math.abs(q.y-p.y)<q.r+10){ri=i;break}}
 for(let i=0;i<s.rg.length;i++)if(s.rg[i]>0)s.rg[i]-=dt;if(p.stk>0)p.stk-=dt;
 if(inp.release&&!p.g&&!p.wall&&p.vy<-250&&!p.inw)p.vy=-250;
 for(const q of s.pl)if(q.vx){q.x+=q.vx*dt;if(q.x<q.a||q.x+q.w>q.b)q.vx=-q.vx}
 if(p.g||p.wall){p.coy=.1;p.lw=p.wall}else p.coy-=dt;p.sq*=Math.pow(.0004,dt);
 if(s.jb>0&&p.coy>0){const w=p.wall||(p.g?0:p.lw);if(w){p.dir=-w;p.wall=0}p.vy=-JV;p.g=false;p.air=p.airMax;p.coy=0;p.lw=0;s.jb=0;p.sq=-.22;E(w?'kick':'jump',p.x,p.y+10,w)}
 else if(ri>=0&&!p.wall){p.vy=-JV;s.rg[ri]=.45;s.jb=0;p.sq=-.2;E('ring',g.rings[ri].x,g.rings[ri].y)}
 else if(s.jb>0&&p.air>0&&!p.g){p.air--;p.vy=-AJ;s.jb=0;p.sq=-.16;E('air',p.x,p.y+10)}
 const so=s.key?g.open:g.solids;
 if(!p.wall){const px=p.x,nx=px+p.dir*RUN*dt;let hit=null;
  for(const q of so)if(p.y+10>q.y+1&&p.y-10<q.y+q.h-1){
   if(p.dir>0){if(px+10<=q.x+.01&&nx+10>q.x&&(!hit||q.x<hit.x))hit=q}else if(px-10>=q.x+q.w-.01&&nx-10<q.x+q.w&&(!hit||q.x+q.w>hit.x+hit.w))hit=q}
  if(hit){p.x=p.dir>0?hit.x-10:hit.x+hit.w+10;if(p.g){p.dir=-p.dir;E('turn',p.x,p.y+10,p.dir)}else{p.wall=p.dir;p.ice=hit.ice?1:0;p.lift=hit.lift?1:0;p.stk=hit.ice?0:.14;E('cling',p.x+p.dir*10,p.y,p.dir)}}else p.x=nx}
 else{let adj=null;for(const q of so)if(p.y+10>q.y+1&&p.y-10<q.y+q.h-1&&Math.abs(p.wall>0?q.x-(p.x+10):q.x+q.w-(p.x-10))<1.5){adj=q;break}if(!adj)p.wall=0;else{p.ice=adj.ice?1:0;p.lift=adj.lift?1:0}}
 p.inw=0;for(const w of g.wind)if(p.x>w.x&&p.x<w.x+w.w&&p.y>w.y&&p.y<w.y+w.h){p.g=false;p.vy=Math.max(-380,p.vy-3200*dt);p.inw=1}
 if(!p.g){p.vy+=(p.vy>0?2000:inp.hold&&p.vy>-90?800:1500)*dt;if(p.vy>900)p.vy=900;const cap=p.ice?300:70;if(p.wall){if(p.vy>cap)p.vy=cap;if(p.stk>0&&p.vy>0)p.vy=0;if(p.lift)p.vy=-120}const py=p.y;p.y+=p.vy*dt;
  if(p.vy<0){for(const q of so)if(p.x+10>q.x+1&&p.x-10<q.x+q.w-1&&py-10>=q.y+q.h-.01&&p.y-10<q.y+q.h){
    /* corner correction: a head that clips a block corner by a few px slides around it */
    const a=p.x+10-q.x,b=q.x+q.w-(p.x-10);if(!q.wall&&!p.wall&&a<8){p.x=q.x-10.02;continue}if(!q.wall&&!p.wall&&b<8){p.x=q.x+q.w+10.02;continue}
    p.y=q.y+q.h+10;p.vy=0;break}
   /* ledge pull-up: feet that end a rise just under a ledge top step onto it */
   if(p.vy>-150&&!p.wall)for(const q of s.pl)if(p.y+10>q.y&&p.y+10<q.y+9&&p.x>q.x-8&&p.x<q.x+q.w+8){land(q,q.y,120);break}}
  else if(p.vy>0){let ly=1e9,lq=null;
   for(const q of so)if(p.x+10>q.x+1&&p.x-10<q.x+q.w-1&&py+10<=q.y+.01&&p.y+10>=q.y&&q.y<ly){ly=q.y;lq=q}
   for(const q of s.pl)if(py+10<=q.y+.01&&p.y+10>=q.y&&p.x>q.x-8&&p.x<q.x+q.w+8&&q.y<ly){ly=q.y;lq=q}
   if(lq)land(lq,ly,p.vy)}}
 else{let on=false;for(const q of s.pl)if(Math.abs(p.y+10-q.y)<1&&p.x>q.x-8&&p.x<q.x+q.w+8){on=true;if(q.vx)p.x+=q.vx*dt;if(q.cr)q.ct=(q.ct===undefined?q.cr:q.ct)-dt}
  if(!on)for(const q of so)if(Math.abs(p.y+10-q.y)<1&&p.x+10>q.x+1&&p.x-10<q.x+q.w-1){on=true;break}if(!on)p.g=false}
 for(let i=s.pl.length-1;i>=0;i--){const q=s.pl[i];if(q.spt)q.spt-=dt;if(q.ct<=0){E('crumble',q.x+q.w/2,q.y);s.pl.splice(i,1)}}
 for(const it of s.it)if(!it.got&&Math.abs(it.x-p.x)<20&&Math.abs(it.y-p.y)<22){it.got=1;E('pickup',it.x,it.y,it.k);if(it.k=='jump'){p.airMax=Math.min(3,p.airMax+1);p.air=p.airMax}else if(it.k=='freeze')s.frz=7;else if(it.k=='key')s.key=1}
 for(let i=0;i<g.gems.length;i++)if(!(s.gems>>i&1)&&Math.abs(g.gems[i].x-p.x)<19&&Math.abs(g.gems[i].y-p.y)<21){s.gems|=1<<i;E('gem',g.gems[i].x,g.gems[i].y)}
 for(const q of g.hot)if(p.x+8>q.x&&p.x-8<q.x+q.w&&p.y+8>q.y&&p.y-8<q.y+q.h&&hotOn(q,s.t))s.dead=true;
 for(let i=0;i<g.mh.length;i++){const m=g.mh[i];if(s.md[i]>0){s.md[i]-=dt;continue}if(Math.abs((m.k=='fb'?m.x:(m.x0+m.x1)/2)-p.x)>260)continue;
  const q=mhPos(m,s.t,s.lava);if(!q.on)continue;const dx=q.x-p.x,dy=q.y-p.y;if(dx*dx+dy*dy<(m.r+9)*(m.r+9)){
   if(m.k=='bat'&&p.vy>0&&p.y<q.y-1){p.vy=-JV;p.g=false;p.wall=0;p.air=p.airMax;p.sq=-.25;s.md[i]=2.5;E('bop',q.x,q.y)}else if(m.k!='bat'||p.y>=q.y-1)s.dead=true}}
 s.si=segOf(g,s);s.best=Math.max(s.best,prog(g,s));
 /* lava: one level for the whole map. It never trails the lowest point still to pass by more than a fixed gap,
    and it waits just under a valley floor until the player has dropped in. */
 let F=null,ahead=false;for(let i=s.si;i<g.segs.length;i++){const q=g.segs[i];if(q.dir=='down'){F=q.y1;ahead=i>s.si;break}}
 if(g.L.chase){if(s.rec)s.tr.push(s.t,p.x,p.y);const c=chaser(g,s);if(c&&(c.x-p.x)*(c.x-p.x)+(c.y-p.y)*(c.y-p.y)<196)s.dead=true}
 if(s.frz>0)s.frz-=dt;else if(s.go)s.lava-=(g.lv.v+s.best*g.lv.acc)*dt;
 if(F!==null&&ahead)s.lava=Math.max(s.lava,F+220);
 s.lava=Math.min(s.lava,F!==null&&p.y<F?F+VGAP:p.y+GAP);
 if(p.y+10>s.lava)s.dead=true;if(s.dead)E('dead',p.x,p.y)}

/* ---------- test player: picks tap or no tap by trying both ahead on the same step() ---------- */
function think(g,s,o){o=o||{};const p=s.p,dt=1/60;
 const want=z=>{const p=z.p,d=g.segs[z.si].dir;if(z.dead)return 0;if(p.g)return d=='down'?0:.07;if(p.wall)return d=='down'?.02:.16;return p.air>0&&p.vy>120&&d!='down'?.07:0};
 const val=z=>z.dead?-1e7:z.win?1e7:prog(g,z)-(z.p.g?0:30)+(o.nolava?0:Math.min(300,z.lava-z.p.y)*.3);
 const nr=q=>Math.abs(q.x+q.w/2-p.x)<q.w/2+420&&q.y<p.y+500&&q.y+(q.h||8)>p.y-700,gn={...g,solids:g.solids.filter(nr),open:g.open.filter(nr),hot:g.hot.filter(nr)},base={...s,pl:s.pl.filter(nr)};
 const b=[-1e9,-1e9];for(let a=0;a<2;a++)for(let r=0;r<(o.n||5);r++){const z=clone(base);z.ev=null;if(o.nolava)z.lava=1e9;step(gn,z,dt,{press:!!a,hold:true});for(let i=0;i<(o.d||66)&&!z.dead&&!z.win;i++){if(o.nolava)z.lava=1e9;step(gn,z,dt,{press:Math.random()<want(z),hold:true})}b[a]=Math.max(b[a],val(z))}
 return b[1]>b[0]+2}
function bot(L,o){o=o||{};const g=build(L),s=newState(g),dt=1/60;s.ev=null;if(o.nolava)s.lava=1e9;
 let f=0,deaths=0;const lim=(o.sec||300)*60,log=[];let cur=s;
 while(!cur.win&&f<lim){const p=cur.p;let pr=false;
  if(cur.dead){deaths++;if(deaths>(o.lives||0))break;cur=respawn(cur);cur.ev=null;continue}
  if(f%4==0&&(p.g||p.wall||p.coy>0||p.air>0||g.rings.length))pr=think(g,cur,o);
  if(o.nolava)cur.lava=1e9;step(g,cur,dt,{press:pr,hold:true});f++;if(o.trace&&f%o.trace==0)log.push([+(f/60).toFixed(1),Math.round(p.x),Math.round(p.y),Math.round(cur.lava),cur.si,p.g?'g':p.wall?'w':'a'])}
 return{id:L.id,win:cur.win,dead:cur.dead,deaths,sec:+(f/60).toFixed(1),best:Math.round(cur.best),total:Math.round(g.total),seg:cur.si,x:Math.round(cur.p.x),y:Math.round(cur.p.y),gems:cur.gems,log}}
if(typeof module!='undefined')module.exports={build,newState,clone,respawn,step,bot,prog,mhPos,hotOn,chaser,VW,DH,WT,RUN,JV,AJ,GAP,cl};
