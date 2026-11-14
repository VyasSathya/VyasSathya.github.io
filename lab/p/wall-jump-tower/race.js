'use strict';
/* Runs as data. The simulation is exact (fixed 1/120 steps, no chance), so a run is its taps: which step each press and
   release fell on. A run can be kept as the best, put in a link, and played back as a ghost beside the player.
   A replay that does not end in a win on its last step (the level or the simulation changed since it was made) is
   dropped: ghostRun returns null and only the run's time is used. The game and tools/par.js load this same file. */
const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
/* recording: n = steps played so far, ev = [step, bits, step, bits, ...] with bits 1 press, 2 release, 4 held */
function recNew(){return{n:0,ev:[],h:-1}}
function recTick(r,inp){const b=(inp.press?1:0)|(inp.release?2:0)|(inp.hold?4:0);if(b&3||(b&4)!=r.h){r.ev.push(r.n,b);r.h=b&4}r.n++}
/* text form: each event is (steps since the last event)*8+bits, five bits a character, sixth bit = more follows */
function recPack(r){let o='',last=0;for(let i=0;i<r.ev.length;i+=2){let v=(r.ev[i]-last)*8+r.ev[i+1];last=r.ev[i];do{const c=v&31;v=Math.floor(v/32);o+=B64[c|(v?32:0)]}while(v)}return o}
function recUnpack(str){const ev=[];let t=0,v=0,m=1;for(const ch of str){const c=B64.indexOf(ch);if(c<0)return null;v+=(c&31)*m;m*=32;if(!(c&32)){t+=Math.floor(v/8);ev.push(t,v&7);v=0;m=1}}return m==1?ev:null}
/* a level's fingerprint: a run made on another version of the level is not replayed */
function lvHash(L){const s=JSON.stringify(L)+RUN+JV+AJ+GAP;let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
/* play a run back on the real step(): where the body was after every step. st bits: 1 on ground, 2 on a wall,
   4 facing right, 8 rising, 16 died on this step. null if the run does not win on exactly its last step. */
function ghostRun(g,ev,n){if(!ev||!(n>0)||n>120*1200)return null;let s=newState(g);s.ev=null;const xs=new Float32Array(n),ys=new Float32Array(n),st=new Uint8Array(n);let k=0,hold=false;
 for(let i=0;i<n;i++){if(s.win)return null;if(s.dead){s=respawn(s);s.ev=null}let press=false,release=false;if(k<ev.length&&ev[k]==i){const b=ev[k+1];press=!!(b&1);release=!!(b&2);hold=!!(b&4);k+=2}
  step(g,s,1/120,{press,release,hold});const p=s.p;xs[i]=p.x;ys[i]=p.y;st[i]=(p.g?1:0)|(p.wall?2:0)|((p.wall||p.dir)>0?4:0)|(p.vy<0?8:0)|(s.dead?16:0)}
 return s.win?{n,xs,ys,st}:null}
/* a run in a link: level id . steps (base 36) . character number . level fingerprint . taps */
function linkPack(L,n,ch,taps){return[L.id,n.toString(36),ch,lvHash(L),taps].join('.')}
function linkUnpack(str,levels){const a=String(str||'').split('.');if(a.length<5)return null;const lv=levels.findIndex(l=>String(l.id)===a[0]),n=parseInt(a[1],36);if(lv<0||!(n>0)||n>120*1200)return null;
 return{lv,n,ch:+a[2]||0,same:a[3]===lvHash(levels[lv]),taps:a[4]}}
if(typeof module!='undefined')module.exports={recNew,recTick,recPack,recUnpack,lvHash,ghostRun,linkPack,linkUnpack};
