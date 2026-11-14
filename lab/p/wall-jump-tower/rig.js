'use strict';
/* Characters, their animation clips, and sprite sheets.
   A clip is a short list of frames. Each frame is drawn by a rig from a handful of pose numbers, so every character has
   the same clips in the same sheet layout: one row per clip, CELL x CELL cells, feet at (OX, OY), drawn facing right.
   The game plays sheets (web/sprites/<name>.png, made by web/bake.html); with no file it bakes the same sheet in memory.
   Squash, stretch, tilt, tails and dust are added live on top, every screen frame (see game.js). */
const CHARS=['gecko','knight','bones'];
/* clip: [frames, frames per second (0 = driven by distance run), loops, clip that follows] */
/* timings follow research/animation-smoothness.md: turn 100 ms, land 100 ms, wall kick 167 ms, air jump 250 ms, loops near 12 fps,
   short joining clips faster than loops, apex picked by vertical speed. More frames than hand art would have, since the rig bakes them. */
const CLIPS={idle:[8,8,1],run:[12,0,1],turn:[3,30,0,'run'],jump:[5,26,0],apex:[5,0,0,'fall'],fall:[6,12,1],land:[3,30,0,'run'],
 cling:[3,24,0,'slide'],slide:[6,12,1],kick:[4,24,0],air:[8,32,0],die:[6,15,0],win:[8,10,1]};
const CLIPN=Object.keys(CLIPS),CELL=48,OX=24,OY=38,SS=3,O_='#150c1d';
let rx=null;
const lp=(a,b,t)=>a+(b-a)*t,PI=Math.PI;
function pose(c,u){const s=Math.sin,o={sw:0,la:0,lb:0,run:0,tuck:0,reach:0,crouch:0,lean:0,spin:0,cling:0,splay:0,eye:0,slip:0,str:0,hop:0};
 if(c=='run'){const a=u*2*PI;o.run=1;o.sw=s(a);o.la=Math.max(0,Math.cos(a));o.lb=Math.max(0,-Math.cos(a));o.lean=.13;o.crouch=.22*Math.abs(s(a))}
 else if(c=='idle'){o.crouch=.12+.12*s(u*2*PI);o.eye=u>.8?1:0}
 else if(c=='turn'){o.lean=-.4*(1-u);o.splay=.55*(1-u);o.crouch=.5*(1-u)}
 else if(c=='jump'){o.str=1-u;o.tuck=u*.75;o.reach=.35+.65*u;o.lean=.1}
 else if(c=='apex'){o.tuck=.75+.25*s(u*PI);o.reach=1-.3*u;o.splay=.3*u}
 else if(c=='fall'){o.tuck=.15;o.splay=.75+.25*s(u*2*PI);o.reach=.85+.15*s(u*2*PI+1);o.eye=2}
 else if(c=='land'){o.crouch=1.5*(1-u)*(1-u);o.splay=.6*(1-u);o.lean=.1*u}
 else if(c=='cling'){o.cling=1;o.crouch=.9*(1-u)}
 else if(c=='slide'){o.cling=1;o.slip=s(u*2*PI);o.eye=u>.84?1:0}
 else if(c=='kick'){o.str=1-u*.7;o.lean=.45*(1-u);o.reach=.5+.5*u;o.tuck=.5*u}
 else if(c=='air'){o.spin=u;o.tuck=1;o.reach=.15}
 else if(c=='die'){o.splay=1;o.spin=u*.55;o.eye=3;o.reach=1}
 else if(c=='win'){const h=Math.max(0,s(u*2*PI));o.reach=1;o.hop=h;o.crouch=.6*Math.max(0,-s(u*2*PI));o.tuck=.4*h;o.eye=h>.8?1:0}
 return o}
function rr_(x,y,w,h,r){r=Math.min(r,w/2,h/2);rx.beginPath();rx.moveTo(x+r,y);rx.arcTo(x+w,y,x+w,y+h,r);rx.arcTo(x+w,y+h,x,y+h,r);rx.arcTo(x,y+h,x,y,r);rx.arcTo(x,y,x+w,y,r);rx.closePath()}
function ln(x0,y0,x1,y1){rx.beginPath();rx.moveTo(x0,y0);rx.lineTo(x1,y1);rx.stroke()}
function limb(x0,y0,x1,y1,col,w){rx.strokeStyle=O_;rx.lineWidth=w+2.2;ln(x0,y0,x1,y1);rx.strokeStyle=col;rx.lineWidth=w;ln(x0,y0,x1,y1)}
function part(x,y,w,h,r,col){rr_(x,y,w,h,r);rx.fillStyle=col;rx.fill();rx.strokeStyle=O_;rx.lineWidth=1.5;rx.stroke()}
function ell(x,y,a,b,col,st){rx.beginPath();rx.ellipse(x,y,a,Math.max(.3,b),0,0,6.3);rx.fillStyle=col;rx.fill();if(st){rx.strokeStyle=O_;rx.lineWidth=st;rx.stroke()}}
function eyes(pts,o,rw,rh,glow){for(const[x,y]of pts){if(o.eye==3){rx.strokeStyle=O_;rx.lineWidth=1.2;ln(x-1.6,y-1.6,x+1.6,y+1.6);ln(x-1.6,y+1.6,x+1.6,y-1.6)}
  else{ell(x,y,rw,o.eye==1?.5:o.eye==2?rh*1.25:rh,O_);if(glow&&o.eye!=1){rx.fillStyle=glow;rx.fillRect(x-.2,y-rh*.45,rw*.7,rw*.7)}}}}
/* two-legged pose: feet A B and hands A B, blended from the pose numbers */
function biped(o){let q=o.run?[[o.sw*4.8,-o.la*3.2],[-o.sw*4.8,-o.lb*3.2],[-o.sw*5-1,-7],[o.sw*5+1,-7.5]]:[[-3,0],[3,0],[-5,-6.5],[5,-6.5]];
 const mix=(t,k)=>{if(k>0)q=q.map((a,i)=>t[i]?[lp(a[0],t[i][0],k),lp(a[1],t[i][1],k)]:a)};
 mix([[-4,-5],[3,-6.5],[-7,-9],[7,-9.5]],o.tuck);mix([[-6.5,-1],[6,-.5],[-11.5,-15],[11.5,-16]],o.splay);mix([null,null,[-11,-18],[11,-19.5]],Math.max(0,o.reach));
 mix([[-2.5,1.5],[1.5,1.5],[-6,-4.5],[10.5,-21]],o.str);mix([[7.5,-7-o.slip],[7.5,-2+o.slip],[9.6,-23+o.slip],[9.6,-10.5-o.slip]],o.cling);return q}
function knight(o){const SD='#7d85a3',ST='#b4bcd6',SL='#e6ebf8',[fa,fb,ha,hb]=biped(o),cd=o.crouch*3;
 limb(-2.6,-6.5+cd,fa[0],fa[1]-2,SD,3.6);part(fa[0]-2.6,fa[1]-3.6,5.6,3.6,1.6,SD);
 limb(2.6,-6.5+cd,fb[0],fb[1]-2,SD,3.6);part(fb[0]-2.6,fb[1]-3.6,5.6,3.6,1.6,SD);
 rx.save();rx.translate(o.cling*-1.5,-6+cd);rx.rotate(o.lean);rx.translate(0,6);
 limb(-3,-12.5,ha[0],ha[1]-cd,ST,3);ell(ha[0],ha[1]-cd,2,2,ST,1.2);
 part(-6.5,-14.5,13,9,3,ST);rx.fillStyle=SD;rx.fillRect(-5.6,-8,11.2,1.8);rx.fillStyle='#ffd35a';rx.fillRect(-5.8,-9.4,11.6,1.5);
 limb(3,-12.5,hb[0],hb[1]-cd,SL,3.2);
 part(-8,-24.5,16,12.5,5.5,'#cfd6ea');rx.fillStyle=SL;rr_(-5.5,-23,8,2,1);rx.fill();rx.fillStyle=SD;rr_(-6.5,-14.2,13,2,1);rx.fill();
 rx.fillStyle=O_;rr_(-.5,-20,9,4.2,1.6);rx.fill();
 if(o.eye==3){rx.strokeStyle='#fff';rx.lineWidth=1;ln(2,-19.2,4,-16.8);ln(4,-19.2,2,-16.8);ln(5.4,-19.2,7.4,-16.8);ln(7.4,-19.2,5.4,-16.8)}else if(o.eye!=1){rx.fillStyle='#fff';const h=o.eye==2?2.8:2;rx.fillRect(2.4,-18-h/2,1.5,h);rx.fillRect(5.6,-18-h/2,1.5,h)}
 ell(hb[0],hb[1]-cd,2.3,2.3,SL,1.2);rx.restore()}
function bones(o){const BN='#f3ead7',BS='#c9bca2',[fa,fb,ha,hb]=biped(o),cd=o.crouch*3;
 limb(-2.2,-4.8+cd,fa[0],fa[1]-1,BS,2.4);
 rx.save();rx.translate(o.cling*-1,-5+cd);rx.rotate(o.lean);rx.translate(0,5);limb(-1,-10.5,ha[0],ha[1]-cd,BS,2.2);
 part(-3.2,-5.6,6.4,2.6,1.3,BN);part(-4,-12,8,6.6,2.6,BN);rx.fillStyle=O_;rx.fillRect(-2.4,-9.6,4.8,.9);rx.fillRect(-2.4,-7.5,4.8,.9);rx.restore();
 limb(2.2,-4.8+cd,fb[0],fb[1]-1,BN,2.4);
 rx.save();rx.translate(o.cling*-1,-5+cd);rx.rotate(o.lean);rx.translate(0,5);limb(1,-10.5,hb[0],hb[1]-cd,BN,2.2);
 part(-3,-13.8,9,3.8,1.7,BN);part(-7.5,-24.2,15.5,12.5,6,BN);eyes([[1.4,-17.8],[6.4,-17.8]],o,2.3,2.9,'#2cc7b5');
 rx.fillStyle=O_;rx.beginPath();rx.moveTo(4,-15.3);rx.lineTo(3.1,-14);rx.lineTo(4.9,-14);rx.fill();rx.fillRect(-.6,-13,.9,2.4);rx.fillRect(1.7,-13,.9,2.4);rx.fillRect(4,-13,.9,2.4);rx.restore()}
function gecko(o){const B='#2fd1b8',D='#1a9d8c',cd=o.crouch*2;
 let near=[[-5+o.sw*3.6,-o.la*2.4],[4-o.sw*3.6,-o.lb*2.4]],far=[[-5-o.sw*3.6,-o.lb*2.4],[4+o.sw*3.6,-o.la*2.4]];
 if(!o.run){near=[[-5.5-cd,0],[4.5+cd,0]];far=[[-4,0],[5.5,0]]}
 const mix=(t,k)=>{if(k>0){near=near.map((a,i)=>[lp(a[0],t[i][0],k),lp(a[1],t[i][1],k)]);far=far.map((a,i)=>[lp(a[0],t[i][0]+1.5,k),lp(a[1],t[i][1]-1,k)])}};
 mix([[-4,-2.5],[5,-2.5]],o.tuck);mix([[-10.5,-5],[10.5,-4]],o.splay);mix([[-11.5,-3.5],[10,-9]],o.str);
 if(o.cling){near=[[-5,-o.slip*1.6],[4,o.slip*1.6]];far=[[-6.5,o.slip*1.6],[5.5,-o.slip*1.6]];rx.translate(0,-10);rx.rotate(-PI/2);rx.translate(0,10+cd*.6)}
 const hy=-5+cd;for(const[i,f]of far.entries())limb(i?4:-5,hy,f[0],f[1],D,2.6);
 rx.save();rx.translate(0,-8+cd);rx.rotate(-o.str*.42-o.tuck*.12+o.splay*.2+o.lean*.5+o.reach*-.06);rx.translate(0,8);
 rx.strokeStyle=O_;rx.lineWidth=3;rr_(-10,-12,17,9,4.5);rx.stroke();rx.beginPath();rx.ellipse(7,-12.5,6.5,5.5,0,0,6.3);rx.stroke();
 rx.fillStyle=B;rr_(-10,-12,17,9,4.5);rx.fill();rx.beginPath();rx.ellipse(7,-12.5,6.5,5.5,0,0,6.3);rx.fill();
 rx.fillStyle='#f6ecd9';rr_(-6.5,-6.6,11.5,2.9,1.45);rx.fill();rx.beginPath();rx.ellipse(7.6,-9.2,4.2,1.8,0,0,6.3);rx.fill();
 rx.fillStyle='#ffb347';for(const[x,y,r]of[[-5.5,-9.6,1.5],[-1,-10.2,1.2],[2.6,-9.2,1]]){rx.beginPath();rx.arc(x,y,r,0,6.3);rx.fill()}
 ell(8.6,-14.8,3.1,3.1,'#fff',1);
 if(o.eye==3){rx.strokeStyle=O_;rx.lineWidth=1.1;ln(7.2,-16.2,10,-13.4);ln(10,-16.2,7.2,-13.4)}else ell(9.5,-14.8,o.eye==2?1.7:1.3,o.eye==1?.4:o.eye==2?2.7:2.2,O_);
 rx.strokeStyle=O_;rx.lineWidth=1;rx.beginPath();if(o.eye>=2)rx.ellipse(10.6,-10.4,1.4,1.7,0,0,6.3);else rx.arc(10.2,-11.6,2.2,.5,2.2);rx.stroke();rx.restore();
 for(const[i,f]of near.entries())limb(i?4:-5,hy,f[0],f[1],B,2.6)}
const SKIN={gecko,knight,bones};
/* one frame, feet at the origin, facing right. u = 0..1 through the clip */
function rigDraw(c,ch,clip,u){rx=c;const o=pose(clip,u);c.save();c.lineCap='round';c.lineJoin='round';
 if(o.hop)c.translate(0,-o.hop*6);if(o.spin){c.translate(0,-11);c.rotate(o.spin*2*PI);c.translate(0,11)}SKIN[ch](o);c.restore()}
function bake(ch){const mx=Math.max(...CLIPN.map(k=>CLIPS[k][0])),cv=document.createElement('canvas');cv.width=mx*CELL*SS;cv.height=CLIPN.length*CELL*SS;const c=cv.getContext('2d');
 CLIPN.forEach((k,r)=>{const n=CLIPS[k][0],loop=CLIPS[k][2];for(let i=0;i<n;i++){c.setTransform(SS,0,0,SS,(i*CELL+OX)*SS,(r*CELL+OY)*SS);rigDraw(c,ch,k,loop?i/n:n>1?i/(n-1):0)}});
 c.setTransform(1,0,0,1,0,0);return cv}
const sheets={};
function loadSheets(done){let left=CHARS.length;for(const ch of CHARS){const im=new Image();im.onload=()=>{sheets[ch]=im;if(!--left&&done)done()};im.onerror=()=>{sheets[ch]=bake(ch);if(!--left&&done)done()};im.src='sprites/'+ch+'.png'}}
/* draw frame i of a clip from the sheet, feet at the current origin */
function sprite(c,ch,clip,i){const sh=sheets[ch];if(!sh){rigDraw(c,ch,clip,0);return}const r=CLIPN.indexOf(clip),k=CELL*SS;c.drawImage(sh,i*k,r*k,k,k,-OX,-OY,CELL,CELL)}
