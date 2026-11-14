'use strict';
/* Drawing of the lava keep. Nothing here feeds the simulation. */
const C={bg:'#140c1c',panel:'#170e20',line:'#4d3d58',text:'#f6ecd9',dim:'#a995ae',accent:'#ffd35a',warn:'#ff6a2a',gem:'#6ff0e0'};
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
let H=640,SC=1,TOP=0,BOT=0,T=0,G=null,S=null,fx=[],rope=[];const cam={x:0,y:0,sh:0},tiles={};
const hs=i=>{const x=Math.sin(i*127.1+3.7)*43758.5453;return x-Math.floor(x)},md=(a,m)=>((a%m)+m)%m,FR=(a,b)=>a+Math.random()*(b-a);
function rr(x,y,w,h,r){r=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath()}
function txt(s,x,y,size,col,align,w){ctx.font=(w||500)+' '+size+'px Inter,system-ui,sans-serif';ctx.fillStyle=col;ctx.textAlign=align||'left';ctx.textBaseline='middle';ctx.fillText(s,x,y)}
function seg(x0,y0,x1,y1){ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke()}
function tile(k,w,h,fn){if(!tiles[k]){const c=document.createElement('canvas');c.width=w*2;c.height=h*2;const x=c.getContext('2d');x.scale(2,2);fn(x);const p=ctx.createPattern(c,'repeat');p.setTransform(new DOMMatrix([.5,0,0,.5,0,0]));tiles[k]=p}return tiles[k]}
function bricks(cols,mortar,bw,bh){return x=>{x.fillStyle=mortar;x.fillRect(0,0,bw*4,bh*4);for(let r=0;r<4;r++)for(let c=-1;c<4;c++){x.fillStyle=cols[Math.floor(hs(r*4+md(c,4))*cols.length)];x.fillRect(c*bw+(r%2?bw/2:0)+1,r*bh+1,bw-2,bh-2)}}}
function puff(x,y,n,col,ax,ay,sp){for(let i=0;i<n;i++){const a=FR(0,6.28),s=FR(.3,1)*(sp||70);fx.push({x,y,vx:Math.cos(a)*s*.6+(ax||0)*FR(.4,1),vy:Math.sin(a)*s*.4+(ay||0)*FR(.4,1),life:FR(.25,.5),col,r:FR(1.5,3.2)})}}
function flame(x,y,k,f){ctx.fillStyle='#ff8a2a';ctx.beginPath();ctx.moveTo(x-5*k,y);ctx.quadraticCurveTo(x-7*k,y-9*k,x+f*2.5*k,y-(18+f*2)*k);ctx.quadraticCurveTo(x+7*k,y-9*k,x+5*k,y);ctx.closePath();ctx.fill();
 ctx.fillStyle='#ffe27a';ctx.beginPath();ctx.moveTo(x-2.5*k,y);ctx.quadraticCurveTo(x-3.5*k,y-6*k,x+f*1.2*k,y-(10+f)*k);ctx.quadraticCurveTo(x+3.5*k,y-6*k,x+2.5*k,y);ctx.closePath();ctx.fill()}
function glow(x,y,r,col,a){ctx.globalCompositeOperation='lighter';const gr=ctx.createRadialGradient(x,y,1,x,y,r);gr.addColorStop(0,'rgba('+col+','+a+')');gr.addColorStop(1,'rgba('+col+',0)');ctx.fillStyle=gr;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.globalCompositeOperation='source-over'}
function back(cx,cy){const c0=Math.floor(cx/VW);let gr;ctx.save();ctx.translate(-cx,-cy);
 ctx.fillStyle=tile('eb',176,88,bricks(['#2b1c33','#2f1f38','#271930','#2d1d35','#33223c'],'#1a1023',44,22));ctx.fillRect(cx,cy,VW,H);
 const n0=Math.floor((-cy-H-700)/560),n1=Math.ceil((-cy+200)/560),hid=(x,y)=>G&&G.solids.some(q=>(q.blk||q.fl)&&x>q.x-20&&x<q.x+q.w+20&&y>q.y-34&&y<q.y+q.h+30);
 for(let c=c0;c<=c0+1;c++)for(let n=n0;n<=n1;n++){const wx=c*VW+(hs(n*3+c*17)<.5?92:268),wy=-300-n*560,tx=c*VW+(md(n,2)?44:316),ty=-560-n*560,f=Math.sin(T*13+n*2)*.5+Math.sin(T*23+n)*.5;
  if(!hid(wx,wy)){gr=ctx.createLinearGradient(0,wy-24,0,wy+26);gr.addColorStop(0,'#46599c');gr.addColorStop(1,'#151b3d');ctx.fillStyle=gr;
   ctx.beginPath();ctx.moveTo(wx-13,wy+26);ctx.lineTo(wx-13,wy-10);ctx.arc(wx,wy-10,13,Math.PI,0);ctx.lineTo(wx+13,wy+26);ctx.closePath();ctx.fill();ctx.strokeStyle='#150c1d';ctx.lineWidth=3;ctx.stroke();
   ctx.fillStyle='#fdf3c4';ctx.beginPath();ctx.arc(wx+5,wy-9,3.2,0,6.3);ctx.fill();ctx.fillStyle='#150c1d';ctx.fillRect(wx-1,wy-23,2,49);ctx.fillRect(wx-13,wy+4,26,2);ctx.fillStyle='#4d3d58';rr(wx-17,wy+26,34,4,2);ctx.fill()}
  if(hid(tx,ty))continue;glow(tx,ty-12,90+f*6,'255,150,60',.36);ctx.fillStyle='#150c1d';rr(tx-2.5,ty-2,5,14,2);ctx.fill();rr(tx-6,ty-3,12,4,2);ctx.fill();flame(tx,ty-3,1,f)}
 ctx.restore()}
function solid(q,cy){const x=q.x,w=q.w,left=md(x,VW)<VW/2,big=q.pil||q.blk||q.gate,y=big?q.y:Math.max(q.y,cy-40),h=big?q.h:Math.min(q.y+q.h,cy+H+40)-y;
 if(q.gate){if(S.key)return;ctx.fillStyle='#2a2030';ctx.fillRect(x,y,w,h);ctx.fillStyle='#8589a3';for(let i=0;i<3;i++)ctx.fillRect(x+1+i*4,y,2,h);ctx.fillStyle='#565972';ctx.fillRect(x-1,y+h*.3,w+2,3);ctx.fillRect(x-1,y+h*.7,w+2,3);
  ctx.fillStyle=C.accent;rr(x-2,y+h*.45,w+4,12,3);ctx.fill();ctx.fillStyle='#150c1d';ctx.beginPath();ctx.arc(x+w/2,y+h*.45+5,2,0,6.3);ctx.fill();return}
 if(q.pil){ctx.fillStyle='rgba(0,0,0,.3)';ctx.fillRect(x+3,y+5,w,h);ctx.fillStyle='#8589a3';rr(x,y,w,h,3);ctx.fill();ctx.fillStyle='#c6cade';ctx.fillRect(x+1.5,y+4,2,h-8);ctx.fillStyle='#565972';rr(x-2,y-1,w+4,5,2);ctx.fill();rr(x-2,y+h-4,w+4,5,2);ctx.fill()}
 else if(q.blk){ctx.fillStyle='rgba(0,0,0,.32)';rr(x+3,y+6,w,h,5);ctx.fill();ctx.fillStyle=q.ice?tile('ei',144,72,bricks(['#6fa9d4','#7db6de','#659fcb','#86c0e6'],'#3f6f9a',36,18)):tile('ef',144,72,bricks(['#5a4866','#62506e','#54435f','#5e4c6a'],'#3a2c44',36,18));rr(x,y,w,h,5);ctx.fill();ctx.strokeStyle='#170e20';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=q.ice?'#e4f6ff':'#a18dab';ctx.fillRect(x+4,y+1.5,w-8,2)}
 else if(q.lift){ctx.fillStyle='#24424a';ctx.fillRect(x,y,w+3,h);ctx.strokeStyle='#5fe3cf';ctx.lineWidth=1.6;ctx.lineJoin='round';for(let yy=Math.ceil(y/18)*18-md(T*60,18);yy<y+h;yy+=18){if(yy<y+4)continue;ctx.beginPath();ctx.moveTo(x+1,yy);ctx.lineTo(x+4.5,yy-4);ctx.lineTo(x+8,yy);ctx.stroke()}}
 else if(w==WT){ctx.fillStyle=q.ice?'#6fa9d4':'#5c4a68';ctx.fillRect(x,y,w,h);ctx.fillStyle=q.ice?'#e4f6ff':'#8d7a99';ctx.fillRect(left?x+w-1.5:x,y,1.5,h);ctx.fillStyle=q.ice?'#3f6f9a':'#3a2c44';for(let yy=Math.ceil(y/22)*22;yy<y+h;yy+=22)ctx.fillRect(x,yy,w,1.5)}
 else{ctx.fillStyle='#5c4a68';ctx.fillRect(x,y,w,h);ctx.fillStyle='#9684a2';ctx.fillRect(x,y,w,2.5);ctx.fillStyle='#3a2c44';ctx.fillRect(x,y+h-2,w,2);for(let xx=Math.ceil(x/30)*30;xx<x+w;xx+=30)ctx.fillRect(xx,y+3,1.5,h-5)}}
function plat(q){const tch=q.cr&&q.ct!==undefined,x=q.x+(tch?Math.sin(T*70)*1.5:0),y=q.y+(q.spt>0?3:0),w=q.w,mx=x+w/2;
 if(q.vx){ctx.strokeStyle='rgba(255,255,255,.09)';ctx.lineWidth=2;ctx.setLineDash([2,7]);seg(q.a,q.y+4,q.b,q.y+4);ctx.setLineDash([])}
 if(tch)ctx.globalAlpha=.7;ctx.fillStyle='rgba(0,0,0,.3)';rr(x+3,y+5,w,9,3);ctx.fill();
 if(q.sp){ctx.fillStyle='#4a3a44';rr(mx-13,y+12,26,4,2);ctx.fill();ctx.strokeStyle='#b8922f';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(mx-8,y+6);ctx.lineTo(mx+8,y+8);ctx.lineTo(mx-8,y+10);ctx.lineTo(mx+8,y+12);ctx.stroke();ctx.fillStyle='#ffd35a';rr(x,y,w,6,3);ctx.fill();ctx.fillStyle='#fff0b0';rr(x+3,y+1,w-6,1.5,.7);ctx.fill()}
 else{const[b,t,d]=q.goal?['#d9a93a','#ffe08a','#8a6420']:q.land?['#6a5874','#9a87a5','#3f3148']:q.vx?['#8f97b3','#d7ddf0','#565c78']:q.cr?['#8d7a80','#bfaeb2','#5a4a50']:['#b06f3c','#eab573','#6e4324'];
  ctx.fillStyle=b;rr(x,y,w,9,3);ctx.fill();ctx.fillStyle=t;rr(x+1,y,w-2,3,1.5);ctx.fill();ctx.fillStyle=d;ctx.fillRect(x+2,y+7.5,w-4,1.5);
  if(q.cr){ctx.strokeStyle=d;ctx.lineWidth=1.2;for(let i=x+14;i<x+w-6;i+=18){ctx.beginPath();ctx.moveTo(i,y+1);ctx.lineTo(i+3,y+4.5);ctx.lineTo(i-1,y+8);ctx.stroke()}}
  else if(q.vx){ctx.beginPath();ctx.arc(x+5,y+5.2,1.5,0,6.3);ctx.arc(x+w-5,y+5.2,1.5,0,6.3);ctx.fill()}
  else for(let i=x+(q.land?29:22);i<x+w-8;i+=q.land?29:22)ctx.fillRect(i,y+3,1,4.5)}
 ctx.globalAlpha=1;
 if(q.cp&&!q.goal)for(const bx of[x+16,x+w-16]){ctx.fillStyle='#150c1d';rr(bx-6,y-7,12,7,2);ctx.fill();ctx.fillStyle='#565972';ctx.fillRect(bx-7,y-8,14,2);if(S.cv>=q.cv){const f=Math.sin(T*13+bx)*.5+Math.sin(T*23)*.5;glow(bx,y-14,46,'255,150,60',.4);flame(bx,y-8,.8,f)}}}
function hot(q){const x=q.x,y=q.y,w=q.w,h=q.h;
 if(q.pit){const gr=ctx.createLinearGradient(0,y-34,0,y+14);gr.addColorStop(0,'#ffe36a');gr.addColorStop(.3,'#ff8f1f');gr.addColorStop(1,'#a81d10');ctx.fillStyle=gr;ctx.fillRect(x,y-26+Math.sin(T*3+x)*1.5,w,44);glow(x+w/2,y-30,w*.8,'255,110,30',.35);return}
 if(q.spk){ctx.fillStyle='#c6cade';ctx.strokeStyle='#150c1d';ctx.lineWidth=1.2;for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(x+i*w/3,y+h);ctx.lineTo(x+(i+.5)*w/3,y-2);ctx.lineTo(x+(i+1)*w/3,y+h);ctx.closePath();ctx.fill();ctx.stroke()}return}
 if(q.per){const u=md(S.t/q.per+q.ph,1),on=u<q.on,soon=u>.82,hz=w>h;ctx.fillStyle='#565972';
  if(hz){rr(x-4,y-3,8,h+6,2);ctx.fill();rr(x+w-4,y-3,8,h+6,2);ctx.fill()}else{rr(x-3,y-4,w+6,8,2);ctx.fill();rr(x-3,y+h-4,w+6,8,2);ctx.fill()}
  if(on){ctx.globalCompositeOperation='lighter';ctx.fillStyle='rgba(255,90,31,.35)';hz?ctx.fillRect(x,y-4,w,h+8):ctx.fillRect(x-4,y,w+8,h);ctx.globalCompositeOperation='source-over';ctx.fillStyle=C.warn;hz?ctx.fillRect(x+3,y+1,w-6,h-2):ctx.fillRect(x+1,y+3,w-2,h-6);ctx.fillStyle='#ffe27a';hz?ctx.fillRect(x+3,y+h/2-1,w-6,2):ctx.fillRect(x+w/2-1,y+3,2,h-6)}
  else{ctx.strokeStyle=soon?'rgba(255,106,42,'+(.5+.5*Math.sin(T*40))+')':'rgba(255,106,42,.22)';ctx.lineWidth=1.5;ctx.setLineDash([3,6]);hz?seg(x+4,y+h/2,x+w-4,y+h/2):seg(x+w/2,y+4,x+w/2,y+h-4);ctx.setLineDash([])}return}
 ctx.fillStyle='rgba(255,90,31,.25)';rr(x-5,y-5,w+10,h+10,8);ctx.fill();ctx.fillStyle=C.warn;
 for(let i=x+5;i<x+w-9;i+=10){ctx.beginPath();ctx.moveTo(i,y+1);ctx.lineTo(i+5,y-6);ctx.lineTo(i+10,y+1);ctx.moveTo(i,y+h-1);ctx.lineTo(i+5,y+h+6);ctx.lineTo(i+10,y+h-1);ctx.fill()}
 ctx.globalAlpha=.8+.2*Math.sin(T*8);rr(x,y,w,h,4);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#ffe27a';rr(x+3,y+2,w-6,2,1);ctx.fill()}
function mover(m,i){const q=mhPos(m,S.t,S.lava),x=q.x,y=q.y;
 if(m.k=='saw'){ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=2;ctx.setLineDash([2,7]);seg(m.x0,m.y0,m.x1,m.y1);ctx.setLineDash([]);ctx.save();ctx.translate(x,y);ctx.rotate(T*9);ctx.fillStyle='#c6cade';ctx.strokeStyle='#150c1d';ctx.lineWidth=1.3;ctx.beginPath();for(let k=0;k<16;k++){const a=k*.3927,r=k%2?m.r+2:m.r-3;k?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#565972';ctx.beginPath();ctx.arc(0,0,4,0,6.3);ctx.fill();ctx.fillStyle=C.warn;ctx.beginPath();ctx.arc(0,0,1.6,0,6.3);ctx.fill();ctx.restore()}
 else if(m.k=='bat'){const dn=S.md[i]>0,fl=dn?.2:Math.sin(T*16+i),yy=y+(dn?10:Math.sin(T*5+i)*2);ctx.globalAlpha=dn?.4:1;ctx.fillStyle='#3a2c5c';ctx.strokeStyle='#150c1d';ctx.lineWidth=1.3;
  for(const s of[-1,1]){ctx.beginPath();ctx.moveTo(x+s*4,yy-2);ctx.quadraticCurveTo(x+s*12,yy-10*fl-4,x+s*18,yy-6*fl);ctx.lineTo(x+s*13,yy+2-2*fl);ctx.lineTo(x+s*9,yy-1);ctx.lineTo(x+s*5,yy+3);ctx.closePath();ctx.fill();ctx.stroke()}
  ctx.fillStyle='#4b3a75';ctx.beginPath();ctx.ellipse(x,yy,6.5,6,0,0,6.3);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(x-5,yy-4);ctx.lineTo(x-4,yy-9);ctx.lineTo(x-1.5,yy-5.5);ctx.moveTo(x+5,yy-4);ctx.lineTo(x+4,yy-9);ctx.lineTo(x+1.5,yy-5.5);ctx.fill();
  ctx.fillStyle=dn?'#150c1d':'#ffd35a';ctx.fillRect(x-3.5,yy-1.5,2.2,2.2);ctx.fillRect(x+1.3,yy-1.5,2.2,2.2);ctx.globalAlpha=1}
 else if(q.on){const up=q.u<.31;glow(x,y,34,'255,140,40',.6);ctx.fillStyle='#ff8f1f';ctx.beginPath();ctx.moveTo(x-m.r,y);ctx.quadraticCurveTo(x,y+(up?1:-1)*m.r*3.4,x+m.r,y);ctx.arc(x,y,m.r,0,Math.PI,up);ctx.fill();ctx.fillStyle='#ffe36a';ctx.beginPath();ctx.arc(x,y,m.r*.6,0,6.3);ctx.fill()}}
function lava(s){const ly=s.lava-cam.y,fz=s.frz>0;if(ly>H+190)return;const wv=x=>fz?0:Math.sin(x*.05+T*2.3)*3+Math.sin(x*.13-T*3.4)*1.6;let gr;
 if(!fz){ctx.globalCompositeOperation='lighter';gr=ctx.createLinearGradient(0,ly-180,0,ly);gr.addColorStop(0,'rgba(255,110,30,0)');gr.addColorStop(1,'rgba(255,110,30,.42)');ctx.fillStyle=gr;ctx.fillRect(0,ly-180,VW,185);ctx.globalCompositeOperation='source-over'}
 const st=fz?['#6d6078','#4b3f55','#2a2233']:['#ffe36a','#ff8f1f','#a81d10'];gr=ctx.createLinearGradient(0,ly,0,ly+150);gr.addColorStop(0,st[0]);gr.addColorStop(.16,st[1]);gr.addColorStop(1,st[2]);ctx.fillStyle=gr;
 ctx.beginPath();ctx.moveTo(0,H+10);for(let x=0;x<=VW;x+=10)ctx.lineTo(x,ly+wv(x));ctx.lineTo(VW,H+10);ctx.fill();
 ctx.strokeStyle=fz?'#9fe6ff':'#fff3b0';ctx.lineWidth=2;ctx.lineJoin='round';ctx.beginPath();for(let x=0;x<=VW;x+=10)x?ctx.lineTo(x,ly+wv(x)):ctx.moveTo(x,ly+wv(x));ctx.stroke();ctx.lineJoin='miter';if(fz)return;
 for(let i=0;i<6;i++){const x=md(hs(i+40)*VW+T*(6+i),VW+60)-30,y=ly+24+hs(i+50)*70;ctx.fillStyle='rgba(120,20,10,.35)';ctx.beginPath();ctx.ellipse(x,y,16+hs(i)*14,4,0,0,6.3);ctx.fill()}
 ctx.strokeStyle='#ffe9a0';ctx.lineWidth=1.5;for(let i=0;i<7;i++){const ph=md(T*(.5+hs(i+9)*.6)+hs(i+20),1),x=hs(i)*VW;ctx.globalAlpha=1-ph;ctx.beginPath();ctx.arc(x,ly+wv(x)+8+(1-ph)*12,1.5+ph*3.5,0,6.3);ctx.stroke()}
 ctx.globalCompositeOperation='lighter';ctx.fillStyle='#ffb347';for(let i=0;i<16;i++){const ph=md(T*(.22+hs(i+60)*.3)+hs(i+70),1),x=hs(i+80)*VW+Math.sin(T*2+i)*12,y=ly-ph*(200+hs(i+90)*120);ctx.globalAlpha=(1-ph)*.9;ctx.beginPath();ctx.arc(x,y,1+hs(i+3)*1.6,0,6.3);ctx.fill()}ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over'}
function icon(k,x,y,col){ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';
 if(k=='jump'){ctx.beginPath();ctx.moveTo(x-6,y+.5);ctx.lineTo(x,y-5.5);ctx.lineTo(x+6,y+.5);ctx.moveTo(x-6,y+6);ctx.lineTo(x,y);ctx.lineTo(x+6,y+6);ctx.stroke()}
 else if(k=='key'){ctx.beginPath();ctx.arc(x-3.5,y,3.6,0,6.3);ctx.moveTo(x,y);ctx.lineTo(x+8,y);ctx.moveTo(x+5,y);ctx.lineTo(x+5,y+3.5);ctx.moveTo(x+8,y);ctx.lineTo(x+8,y+3);ctx.stroke()}
 else{ctx.beginPath();for(let i=0;i<3;i++){const a=i*1.047+.52;ctx.moveTo(x-Math.cos(a)*7,y-Math.sin(a)*7);ctx.lineTo(x+Math.cos(a)*7,y+Math.sin(a)*7)}ctx.stroke()}}
function gemAt(x,y,k,got){ctx.beginPath();ctx.moveTo(x,y-7*k);ctx.lineTo(x+5.5*k,y);ctx.lineTo(x,y+7*k);ctx.lineTo(x-5.5*k,y);ctx.closePath();if(got===0){ctx.strokeStyle=C.line;ctx.lineWidth=1.5;ctx.stroke();return}
 ctx.fillStyle=C.gem;ctx.fill();ctx.strokeStyle='#150c1d';ctx.lineWidth=1.3;ctx.stroke();ctx.fillStyle='#e9fffb';ctx.beginPath();ctx.moveTo(x,y-5*k);ctx.lineTo(x+2.6*k,y-1*k);ctx.lineTo(x-1*k,y-1*k);ctx.closePath();ctx.fill()}
function world(hero){const g=G,s=S,cx=cam.x+(cam.sh?FR(-cam.sh,cam.sh):0),cy=cam.y+(cam.sh?FR(-cam.sh,cam.sh):0);
 const vis=q=>q.x+q.w>cx-30&&q.x<cx+VW+30&&q.y+(q.h||12)>cy-50&&q.y<cy+H+50,near=(x,y,r)=>x>cx-r&&x<cx+VW+r&&y>cy-r&&y<cy+H+r;
 back(cx,cy);ctx.save();ctx.translate(-cx,-cy);ctx.lineCap='round';ctx.lineJoin='round';
 for(const d of g.dr)if(near(d.x,d.y,80)){const f0=d.x+d.s*16,gr=ctx.createLinearGradient(f0,0,f0-d.s*72,0);gr.addColorStop(0,'rgba(255,211,90,.2)');gr.addColorStop(1,'rgba(255,211,90,0)');ctx.fillStyle=gr;ctx.fillRect(Math.min(f0,f0-d.s*72),d.y-DH/2,72,DH)}
 for(const w of g.wind)if(vis(w)){const gr=ctx.createLinearGradient(0,w.y,0,w.y+w.h);gr.addColorStop(0,'rgba(159,230,255,0)');gr.addColorStop(1,'rgba(159,230,255,.13)');ctx.fillStyle=gr;ctx.fillRect(w.x,w.y,w.w,w.h);
  ctx.strokeStyle='#bfeeff';ctx.lineWidth=1.6;for(let i=0;i<9;i++){const ph=md(T*(.7+hs(i+w.y)*.5)+hs(i*3+w.x),1),x=w.x+8+hs(i*7+w.y)*(w.w-16)+Math.sin(T*3+i)*3,y=w.y+w.h*(1-ph);ctx.globalAlpha=Math.sin(ph*Math.PI)*.55;seg(x,y,x,y-16-hs(i)*14)}ctx.globalAlpha=1;
  ctx.fillStyle='#3a2c44';for(let i=w.x+6;i<w.x+w.w-4;i+=12)ctx.fillRect(i,w.y+w.h-3,7,3)}
 for(const q of g.solids)if(vis(q))solid(q,cy);
 for(const q of g.hot)if(vis(q))hot(q);
 for(const q of s.pl)if(vis(q))plat(q);
 const gx=g.goalX,fy=g.goalY;if(near(gx,fy,90)){ctx.fillStyle='#d8c7a0';rr(gx-1.5,fy-54,3,54,1.5);ctx.fill();ctx.beginPath();ctx.arc(gx,fy-55,3,0,6.3);ctx.fill();ctx.fillStyle=C.accent;ctx.beginPath();ctx.moveTo(gx+1.5,fy-52);
  for(let i=1;i<=6;i++)ctx.lineTo(gx+1.5+i*5,fy-52+i*.9+Math.sin(T*6-i*.8)*i*.5);for(let i=6;i>=0;i--)ctx.lineTo(gx+1.5+i*5,fy-34-i*.9+Math.sin(T*6-i*.8)*i*.5);ctx.fill()}
 ctx.strokeStyle=C.accent;ctx.lineWidth=3;for(const d of g.dr)if(d.show&&near(d.x,d.y,20)){const x=d.x+d.s*Math.sin(T*5)*3,y=d.y;ctx.globalAlpha=.6+.4*Math.sin(T*5);ctx.beginPath();ctx.moveTo(x-d.s*4,y-8);ctx.lineTo(x+d.s*4,y);ctx.lineTo(x-d.s*4,y+8);ctx.stroke()}ctx.globalAlpha=1;
 for(let i=0;i<g.mh.length;i++){const m=g.mh[i];if(near(m.k=='fb'?m.x:(m.x0+m.x1)/2,m.k=='fb'?s.lava-120:(m.y0+m.y1)/2,300))mover(m,i)}
 for(const it of s.it)if(!it.got&&near(it.x,it.y,30)){const x=it.x,y=it.y+Math.sin(T*4+it.x)*3,col=it.k=='freeze'?'#8fe3ff':C.accent;
  ctx.fillStyle=col;ctx.globalAlpha=.16+.06*Math.sin(T*5);ctx.beginPath();ctx.arc(x,y,20,0,6.3);ctx.fill();ctx.globalAlpha=1;ctx.fillStyle='#170e20';ctx.beginPath();ctx.arc(x,y,12.5,0,6.3);ctx.fill();ctx.strokeStyle=col;ctx.lineWidth=2;ctx.stroke();icon(it.k,x,y,col)}
 for(let i=0;i<g.rings.length;i++){const q=g.rings[i];if(near(q.x,q.y,40)){const off=s.rg[i]>0,k=1+.08*Math.sin(T*6+q.x);if(!off)glow(q.x,q.y,30,'255,211,90',.3);ctx.strokeStyle=off?C.line:C.accent;ctx.lineWidth=3.2;ctx.beginPath();ctx.arc(q.x,q.y,13*k,0,6.3);ctx.stroke();ctx.lineWidth=1.4;ctx.globalAlpha=.6;ctx.beginPath();ctx.arc(q.x,q.y,8*k,0,6.3);ctx.stroke();ctx.globalAlpha=1}}
 const sh=chaser(g,s);if(sh&&!s.dead){const x=sh.x,y=sh.y;glow(x,y,34,'150,60,255',.35);ctx.fillStyle='rgba(22,10,34,.92)';rr(x-10,y-11,20,21,7);ctx.fill();for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(x-7.5+i*5,y+10+Math.sin(T*9+i)*1.5,2.6,0,6.3);ctx.fill()}ctx.fillStyle='#ff4d6a';ctx.fillRect(x-5,y-4,3,3);ctx.fillRect(x+2,y-4,3,3)}
 for(let i=0;i<g.gems.length;i++)if(!(s.gems>>i&1)){const q=g.gems[i];if(near(q.x,q.y,30)){const y=q.y+Math.sin(T*3+q.x)*3;glow(q.x,y,22,'111,240,224',.3);gemAt(q.x,y,1+.06*Math.sin(T*6+q.x))}}
 hero();
 ctx.globalCompositeOperation='lighter';for(const f of fx)if(!f.dust){ctx.globalAlpha=Math.min(1,f.life*2.2);ctx.fillStyle=f.col;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(.4+f.life),0,6.3);ctx.fill()}ctx.globalCompositeOperation='source-over';
 for(const f of fx)if(f.dust){ctx.globalAlpha=Math.min(.7,f.life*1.8);ctx.fillStyle=f.col;ctx.beginPath();ctx.arc(f.x,f.y,f.r*(1.6-f.life*1.4),0,6.3);ctx.fill()}ctx.globalAlpha=1;
 ctx.restore();ctx.lineCap='butt';ctx.lineJoin='miter';
 let gr=ctx.createRadialGradient(VW/2,H*.5,H*.3,VW/2,H*.5,H*.75);gr.addColorStop(0,'rgba(8,4,12,0)');gr.addColorStop(1,'rgba(8,4,12,.5)');ctx.fillStyle=gr;ctx.fillRect(0,0,VW,H);
 lava(s);gr=ctx.createLinearGradient(0,0,0,110+TOP);gr.addColorStop(0,'rgba(20,12,28,.9)');gr.addColorStop(1,'rgba(20,12,28,0)');ctx.fillStyle=gr;ctx.fillRect(0,0,VW,110+TOP)}
