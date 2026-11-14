'use strict';
/* Levels as data. map = shafts left to right: {t:'up',h} climb, {t:'down',h,alt} drop (alt = extra doors on the way down),
   {t:'across',w} corridor, {t:'tower3'} three-wide tower. fill = ledges | chimney | windy | bats | rings. o = what is in it.
   Order follows research/levels-and-mechanics.md ("Level plan"): one new thing per level, each chapter ends on a map idea.
   Three gems a level. Every level is checked by tools/bot.js with lava on. */
const CHAPTERS=['The Lower Keep','The Forge','The High Towers'];
const LEVELS=[
 {id:1,name:'First Steps',seed:11,lava:{v:14,acc:.004},map:[{t:'up',h:800,o:{w0:120,w1:160,g0:66,g1:84,gem:2}},{t:'up',h:600,o:{w0:90,w1:130,g0:96,g1:112,gem:1}}]},
 {id:2,name:'The Chimney',seed:12,lava:{v:16,acc:.005},map:[{t:'up',h:500,o:{w0:100,w1:140,gem:1}},{t:'up',h:900,fill:'chimney',o:{gem:1}},{t:'up',h:600,o:{pil:.2,gem:1}}]},
 {id:3,name:'Second Wind',seed:13,lava:{v:18,acc:.005},map:[{t:'up',h:800,o:{g0:150,g1:182,w0:110,w1:150,gem:1}},{t:'across',w:2,o:{pits:1,p0:150,p1:170,gem:1}},{t:'up',h:700,o:{g0:130,g1:176,gem:1}}]},
 {id:4,name:'Pillars',seed:14,lava:{v:20,acc:.005},map:[{t:'up',h:1000,o:{pil:.9,w0:56,w1:96,gem:2}},{t:'across',w:2,o:{spk:2}},{t:'up',h:800,o:{pil:.9,w0:50,w1:84,g0:90,g1:116,gem:1}}]},
 {id:5,name:'Over the Wall',seed:15,lava:{v:20,acc:.006},map:[{t:'up',h:900,o:{pil:.3,gem:1}},{t:'across',w:2,o:{pits:1,gem:1}},{t:'down',h:800,o:{hot:2}},{t:'up',h:1000,fill:'chimney',o:{gem:1}}]},

 {id:6,name:'Crumbling Stone',seed:22,lava:{v:20,acc:.006},map:[{t:'up',h:1000,o:{cr:.55,gem:1}},{t:'across',w:2,o:{pits:2,gem:1}},{t:'down',h:600,o:{saw:1}},{t:'up',h:1100,o:{cr:.5,pil:.3,gem:1}}]},
 {id:7,name:'Lifts',seed:15,lava:{v:22,acc:.006},map:[{t:'up',h:1100,o:{mov:.5,gem:1}},{t:'across',w:2,o:{pits:2,spk:1}},{t:'down',h:600,o:{hot:1,gem:1}},{t:'up',h:1200,o:{mov:.55,pil:.4,item:'jump',gem:1}}]},
 {id:8,name:'Two Doors Down',seed:23,lava:{v:22,acc:.006},map:[{t:'up',h:1100,o:{pil:.4,cr:.2}},{t:'down',h:900,alt:[360],o:{gem:1}},{t:'up',h:1200,fill:'chimney',o:{item:'freeze',gem:1}},{t:'down',h:800,alt:[300],o:{gem:1}},{t:'up',h:1000,o:{mov:.4,cr:.2}}]},
 {id:9,name:'Launchers',seed:21,lava:{v:22,acc:.006},map:[{t:'up',h:1200,o:{sp:.4,gem:1}},{t:'up',h:1400,fill:'rings',o:{gem:1}},{t:'across',w:2,o:{pits:2,saw:1}},{t:'up',h:1300,o:{sp:.3,mov:.3,pil:.3,gem:1}}]},
 {id:10,name:'Three Towers',seed:35,lava:{v:24,acc:.006},map:[{t:'tower3',k:4}]},

 {id:11,name:'Fire Rising',seed:31,lava:{v:24,acc:.007},map:[{t:'up',h:1200,o:{las:.5,gem:1}},{t:'up',h:1300,o:{fb:3,pil:.3,gem:1}},{t:'down',h:600,o:{saw:1}},{t:'up',h:1300,o:{las:.35,fb:2,cr:.2,item:'freeze',gem:1}}]},
 {id:12,name:'Lift Walls',seed:32,lava:{v:24,acc:.007},map:[{t:'up',h:1300,o:{lift:1,las:.5,w0:60,w1:100,g0:120,g1:160,gem:1}},{t:'up',h:1200,fill:'chimney',o:{ice:1,gem:1}},{t:'down',h:700,alt:[280],o:{ice:1,gem:1}},{t:'up',h:1200,o:{lift:1,ice:0,saw:.4,mov:.3,g0:110,g1:150}}]},
 {id:13,name:'Night Air',seed:24,lava:{v:24,acc:.006},map:[{t:'up',h:1300,fill:'windy',o:{gem:1}},{t:'across',w:3,o:{pits:3,bat:1,gem:1}},{t:'up',h:1200,fill:'bats',o:{gem:1}},{t:'up',h:1300,fill:'windy',o:{saw:1}}]},
 {id:14,name:'Lock and Key',seed:33,lava:{v:26,acc:.007},map:[{t:'up',h:1300,o:{gate:1,pil:.3,cr:.2,gem:1}},{t:'across',w:2,o:{saw:2}},{t:'up',h:1400,o:{gate:1,mov:.4,sp:.2,las:.2,gem:1}},{t:'up',h:1000,fill:'rings',o:{saw:1,gem:1}}]},
 {id:15,name:'The Crown',seed:36,chase:2,lava:{v:24,acc:.005},map:[{t:'up',h:1000,o:{cr:.3,mov:.3,pil:.3,gem:1}},{t:'across',w:2,o:{pits:2,saw:1}},{t:'up',h:1000,o:{lift:1,las:.3,g0:110,g1:150}},{t:'down',h:700,alt:[280],o:{saw:1,gem:1}},{t:'up',h:1200,fill:'windy',o:{gem:1}},{t:'up',h:800,fill:'rings',o:{}},{t:'up',h:600,o:{sp:.3,fb:2}}]}
];
if(typeof module!='undefined')module.exports={LEVELS,CHAPTERS};
