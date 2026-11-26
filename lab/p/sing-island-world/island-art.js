/* What each island looks like: its own coastline and its own landmarks, drawn as SVG behind the singers.
   IslandArt.draw(id, layout, name)  the island you are on (colours come from the CSS variables of body[data-isl])
   IslandArt.mini(id, land, sand)    the same island small, for the map and the voyage (colours passed in)
   Landmarks keep clear of the places singers stand and of the four buildings. */
var IslandArt=(function(){
  var SHAPE={ /* n: how square the coast is; a,f: size and count of its bumps; sc: scalloped petals instead of waves */
    day:{n:3.6,a:5,f:7},lantern:{n:2.7,a:3,f:10,sc:1},night:{n:6,a:3,f:5},fog:{n:4.4,a:10,f:4},roof:{n:9,a:0,f:1},
    canal:{n:4,a:6,f:5},marsh:{n:3.4,a:11,f:9},cove:{n:3.1,a:13,f:3},bell:{n:3.2,a:9,f:13,sc:1},stage:{n:9,a:0,f:1}};
  function coast(id,x0,y0,x1,y1,k){
    var S=SHAPE[id]||SHAPE.day,cx=(x0+x1)/2,cy=(y0+y1)/2,a=(x1-x0)/2,b=(y1-y0)/2,d='';
    for(var i=0;i<=120;i++){var t=i/120*Math.PI*2,c=Math.cos(t),s=Math.sin(t);
      var x=a*(c<0?-1:1)*Math.pow(Math.abs(c),2/S.n),y=b*(s<0?-1:1)*Math.pow(Math.abs(s),2/S.n);
      var w=S.sc?Math.abs(Math.sin(S.f*t/2))*2-1:Math.sin(S.f*t+1.3)*.75+Math.sin((S.f+3)*t)*.25;
      var j=w*S.a*(k||1),len=Math.sqrt(x*x+y*y)||1;
      d+=(i?'L':'M')+(cx+x+x/len*j).toFixed(1)+' '+(cy+y+y/len*j).toFixed(1);}
    return d+'Z';
  }
  function P(d,f,o){return '<path d="'+d+'" fill="'+f+'"'+(o!=null?' opacity="'+o+'"':'')+'/>';}
  function L(d,c,w,o,dash){return '<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+w+'" stroke-linecap="round"'+(o!=null?' opacity="'+o+'"':'')+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';}
  function C(x,y,r,f,o){return '<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+f+'"'+(o!=null?' opacity="'+o+'"':'')+'/>';}
  function E(x,y,rx,ry,f,o){return '<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="'+f+'"'+(o!=null?' opacity="'+o+'"':'')+'/>';}
  function R(x,y,w,h,r,f,o){return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="'+r+'" fill="'+f+'"'+(o!=null?' opacity="'+o+'"':'')+'/>';}
  function G(x,y,s,body){return '<g transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+') scale('+s+')">'+body+'</g>';}
  function shade(w){return E(0,0,w,w*.22,'#000',.14);}

  /* landmarks, each drawn standing on (0,0) */
  var PROP={
    palm:function(i){var f=i%2?-1:1;return shade(16)+L('M0 0q'+(4*f)+' -24 '+(12*f)+' -46','#9A6B45',5.5)+'<g transform="translate('+(12*f)+' -47)">'+[[-24,4],[-18,-12],[0,-19],[19,-11],[24,5]].map(function(a){return P('M0 0Q'+(a[0]*.6)+' '+(a[1]-9)+' '+a[0]+' '+a[1]+'Q'+(a[0]*.45)+' '+(a[1]*.3+1)+' 0 4z','#3F8F55');}).join('')+C(-3,4,3.4,'#8A5A34')+C(4,4,3.4,'#8A5A34')+'</g>';},
    chest:function(){return shade(17)+R(-15,-16,30,16,3,'#9A6544')+P('M-15 -16q0 -13 15 -13t15 13z','#B07C4F')+R(-15,-18,30,4,1,'#E9B949')+R(-3,-19,6,9,2,'#E9B949')+C(-9,-3,2.6,'#FFD45C')+C(13,1,2.6,'#FFD45C')+C(18,-2,2.2,'#FFD45C');},
    rock:function(){return shade(22)+P('M-22 0l7 -18 12 -9 13 10 10 17z','#7E8C8E')+P('M-3 -27l13 10 -6 5z','#A4B0B0')+P('M8 0l8 -11 10 11z','#6B787A');},
    torch:function(){return shade(8)+R(-2,-34,4,34,1,'#6E4A30')+C(0,-42,13,'#FFB45C',.28)+P('M-6 -36q-2 -9 6 -17q8 8 6 17q-6 5 -12 0z','#F2873A')+P('M-3 -37q0 -5 3 -9q4 4 3 9q-3 2 -6 0z','#FFE08A');},
    flowers:function(i){var c=['#fff','#FFD45C','#F48AAE','#B9A2F0'][i%4];return [[-9,0],[3,-6],[10,3]].map(function(p){return L('M'+p[0]+' '+(p[1]+7)+'v-7','#5E9A45',1.6)+[0,1,2,3,4].map(function(k){var t=k*1.2566;return C(+(p[0]+Math.cos(t)*3.4).toFixed(1),+(p[1]+Math.sin(t)*3.4).toFixed(1),2.7,c);}).join('')+C(p[0],p[1],2.2,'#F2A93B');}).join('');},
    tree:function(){return shade(18)+R(-3,-22,6,22,2,'#9A6B45')+C(0,-34,18,'#5FA84C')+C(-11,-26,12,'#6DB65A')+C(12,-27,12,'#6DB65A')+C(-4,-41,9,'#86C96F');},
    blossom:function(){return shade(18)+R(-3,-22,6,22,2,'#9A6B54')+C(0,-34,18,'#F2A7C3')+C(-12,-26,12,'#F7BDD3')+C(12,-27,12,'#EC93B6')+C(-4,-42,9,'#FFD6E4')+C(8,-38,2.6,'#fff')+C(-10,-30,2.2,'#fff');},
    pond:function(){return E(0,0,30,13,'#E8DDBE')+E(0,0,25,10,'#7CC4D6')+L('M-12 -2q6 3 12 0M2 3q5 2 10 0','#fff',1.4,.8);},
    stall:function(i){var a=['#D9574F','#3E97CF','#D9A22C','#8467D3'][i%4],s=shade(26)+R(-22,-20,44,20,3,'#8A6245')+R(-22,-20,44,5,2,'#A97C57')+R(-20,-38,3,20,1,'#6E4E37')+R(17,-38,3,20,1,'#6E4E37');
      for(var k=0;k<6;k++)s+=P('M'+(-27+k*9)+' -36l3 -14h9l-3 14q-4.5 7 -9 0z',k%2?'#F6EBD8':a);
      return s+C(-10,-24,4,'#F2A93B')+C(0,-25,4,'#E0694B')+C(10,-24,4,'#7DB862');},
    lamp:function(){return shade(8)+R(-1.6,-44,3.2,44,1,'#4A3B33')+C(0,-48,13,'#FFD987',.28)+R(-6,-55,12,13,4,'#FFC85C')+R(-7,-57,14,4,2,'#4A3B33');},
    barrel:function(){return shade(13)+R(-11,-24,22,24,6,'#9A6544')+R(-11,-19,22,3,1,'#5F3F2B')+R(-11,-8,22,3,1,'#5F3F2B')+E(0,-24,11,3.5,'#B9835C');},
    crates:function(){return shade(20)+R(-20,-18,20,18,2,'#B07C4F')+R(0,-14,18,14,2,'#9A6A42')+R(-12,-32,18,14,2,'#C28E60')+L('M-20 -18L0 0M0 -14L18 0M-12 -32L6 -18','#7A5233',1.4,.8);},
    post:function(){return shade(9)+R(-5,-22,10,22,3,'#7A5233')+E(0,-22,5,2.4,'#A97C57')+L('M-5 -15q5 4 10 0M-5 -11q5 4 10 0','#E8D9B5',2);},
    lighthouse:function(){return shade(20)+P('M-14 0l5 -62h18l5 62z','#F5EFE2')+P('M-12.4 -20l1.4 -16h22l1.4 16z','#D9574F')+R(-12,-76,24,14,3,'#4A5560')+R(-7,-74,14,10,2,'#FFE08A')+P('M-14 -76l14 -12 14 12z','#D9574F')+C(0,-69,20,'#FFE08A',.22);},
    anchor:function(){return shade(12)+L('M0 -26V-4M-11 -12q2 10 11 9t11 -9M-6 -20h12','#4A5560',3.2)+C(0,-29,3.4,'#4A5560');},
    chimney:function(i){return shade(14)+R(-9,-30,18,30,2,i%2?'#B5654C':'#9C5A63')+R(-12,-35,24,7,2,'#6E4A48')+C(3,-43,5,'#fff',.55)+C(9,-52,7,'#fff',.4)+C(17,-62,8,'#fff',.25);},
    antenna:function(){return L('M0 0V-48M-12 -40h24M-8 -33h16','#6E5A5A',2.2)+C(0,-48,2.4,'#E0694B');},
    watertank:function(){return shade(22)+L('M-14 0V-16M14 0V-16M-14 -4L14 -14','#6E4A48',3)+R(-18,-42,36,28,4,'#B98062')+L('M-18 -33h36M-18 -23h36','#8E5C45',2)+P('M-20 -42l20 -14 20 14z','#7E5A54');},
    skylight:function(){return P('M-18 0l6 -16h24l6 16z','#8FB7CC')+L('M-12 -16h24M0 -16V0M-15 -8h30','#F5EFE2',1.8);},
    laundry:function(){return L('M-30 0V-36M30 0V-36','#6E5A5A',2.4)+L('M-30 -34q30 8 60 0','#4A3B33',1.2)+R(-20,-31,11,15,2,'#F6EBD8')+R(-4,-29,12,12,2,'#6FA8DC')+R(13,-31,10,16,2,'#E8A0B0');},
    boat:function(){return E(0,2,26,5,'#fff',.35)+P('M-24 -8h48q-5 12 -16 12h-16q-11 0 -16 -12z','#9A6544')+R(-24,-10,48,4,2,'#C08A5E')+L('M2 -10V-34','#6E4E37',2)+P('M3 -34l17 18H3z','#F6EBD8');},
    cattail:function(){return [[-10,30,-4],[-2,40,0],[7,32,3],[13,22,6]].map(function(c){return L('M'+c[0]+' 0q'+(c[2]/2)+' -'+(c[1]/2)+' '+c[2]+' -'+c[1],'#5F7D36',2)+R(c[0]+c[2]-2.6,-c[1]-9,5.2,12,2.6,'#8A5A34');}).join('')+L('M-14 0q2 -14 -6 -20M16 0q-1 -12 8 -18','#6F9040',2);},
    lily:function(i){return E(-9,0,13,6,'#6FA23E')+E(10,6,10,4.5,'#7FB24A')+(i%2?C(-9,-3,4,'#F7B6CC')+C(-9,-4,1.8,'#FFE08A'):'');},
    log:function(){return shade(24)+R(-24,-13,46,13,6,'#8A6038')+E(22,-6.5,5,6.5,'#C89A66')+E(22,-6.5,2.4,3.4,'#A9794B')+C(-8,-13,4,'#7FA047')+C(0,-14,3,'#8FB254');},
    mushroom:function(){return [[-8,1,1],[8,3,.7]].map(function(m){return G(m[0],m[1],m[2],R(-3,-11,6,11,2,'#F3E8D2')+P('M-12 -10q2 -13 12 -13t12 13z','#D96A4F')+C(-4,-16,2,'#fff')+C(5,-14,1.6,'#fff'));}).join('');},
    bellarch:function(){return shade(24)+L('M-20 0V-30q0 -22 20 -22t20 22V0','#F5EFE2',4.5)+L('M0 -52v9','#A98B5A',1.6)+P('M-9 -29q0 -14 9 -14t9 14l3 4h-24z','#E9B949')+C(0,-23,3,'#B98A2E')+C(-20,-30,5,'#F2A7C3')+C(20,-30,5,'#F2A7C3');},
    hedge:function(){return shade(24)+R(-24,-18,48,18,9,'#6DA356')+C(-14,-17,9,'#7DB565')+C(2,-20,11,'#7DB565')+C(15,-16,8,'#7DB565')+C(-8,-16,2.4,'#F7BDD3')+C(9,-22,2.4,'#fff')+C(17,-10,2,'#F7BDD3');},
    paperlamp:function(i){var c=['#FF8A4C','#FFC24B','#F2637A'][i%3];return L('M0 0V-30','#4A2F33',2)+C(0,-40,17,c,.22)+E(0,-40,9,11,c)+R(-5,-53,10,4,1,'#4A2F33')+R(-5,-30,10,4,1,'#4A2F33')+L('M-8 -40h16M0 -51v22','#fff',1,.35);},
    drumstack:function(){return shade(16)+R(-14,-18,28,18,4,'#C2474B')+E(0,-18,14,4,'#F6EBD8')+R(-10,-32,20,13,3,'#D9A22C')+E(0,-32,10,3,'#F6EBD8');},
    speaker:function(){return shade(14)+R(-13,-40,26,40,4,'#2E2733')+C(0,-28,6,'#5A5262')+C(0,-12,9,'#5A5262')+C(0,-12,3.5,'#2E2733')+C(0,-28,2.4,'#2E2733');}
  };
  var SET={day:['tree','flowers','flowers','tree','flowers','pond'],lantern:['paperlamp','paperlamp','drumstack','paperlamp','stall','paperlamp'],
    night:['stall','lamp','stall','crates','lamp','stall'],fog:['lighthouse','barrel','post','crates','anchor','barrel'],
    roof:['chimney','watertank','antenna','chimney','laundry','skylight'],canal:['tree','boat','lamp','flowers','post','tree'],
    marsh:['cattail','log','cattail','mushroom','lily','cattail'],bell:['blossom','bellarch','hedge','blossom','flowers','bellarch'],
    cove:['chest','palm','torch','rock','palm','boat','barrel'],
    stage:['speaker','drumstack','speaker','lamp','speaker','drumstack']};

  var ONCE={lighthouse:1,watertank:1,pond:1,chest:1}; /* one of these to an island, drawn large */
  function rng(seed){return function(){seed=(seed*9301+49297)%233280;return seed/233280;};}
  function clearOf(x,y,keep){for(var i=0;i<keep.length;i++){var k=keep[i],dx=(x-k[0])/k[2],dy=(y-k[1])/k[3];if(dx*dx+dy*dy<1)return false;}return true;}

  function draw(id,Y,lay){
    var w=Y.w,h=Y.h,y0=Y.y0,y1=h-4,s='',rnd=rng(11+id.length*37+id.charCodeAt(0)),i,x,y;
    var keep=Y.pts.map(function(p){return [p[0],p[1]-22,46,44];});for(var k in Y.st)keep.push([Y.st[k][0],Y.st[k][1]-40,62,64]);
    /* ripples on the water around the island */
    for(i=0;i<9;i++){x=(i%2?-18:w-26)+rnd()*40;y=y0+30+i*(y1-y0-40)/9;s+=L('M'+x.toFixed(0)+' '+y.toFixed(0)+'q8 -5 16 0t16 0','#fff',2,.35);}
    if(id==='stage'){
      s+=R(6,y0+8,w-12,y1-y0-8,26,'var(--rim)')+R(6,y0,w-12,y1-y0-14,26,'var(--land)');
      for(i=1;i<8;i++){y=y0+(y1-y0-14)*i/8;s+=L('M20 '+y.toFixed(0)+'H'+(w-20),'var(--land2)',2);}
      for(i=0;i<Math.floor(w/34);i++){x=22+i*34;s+=C(x,y1-20,9,'#FFE08A',.28)+C(x,y1-20,4,'#FFE08A');}
      [[8,1],[w-8,-1]].forEach(function(c){s+='<g transform="translate('+c[0]+' '+y0+') scale('+c[1]+' 1)">'+P('M-6 -8h40q-8 60 -18 110t6 120q-18 12 -28 2z','#8E2F45')+L('M10 -4q-6 60 -8 112M24 -6q-8 50 -18 92','#6F2237',3)+C(8,108,6,'#E9B949')+'</g>';});
    }else{
      s+=P(coast(id,4,y0+18,w-4,y1),'rgba(0,0,0,.10)');
      s+=P(coast(id,6,y0+6,w-6,y1-8),'var(--sand)');
      s+=P(coast(id,18,y0,w-18,y1-26,.8),'var(--land)');
      for(i=0;i<26;i++){x=44+rnd()*(w-88);y=y0+30+rnd()*(y1-y0-92);s+=E(x.toFixed(0),y.toFixed(0),(6+rnd()*10).toFixed(0),3,'var(--land2)');}
      if(id==='roof'){ /* flat roofs side by side: seams, ridges and tiles */
        var cols=lay==='tall'?2:4,rows=lay==='tall'?5:2,cw=(w-60)/cols,ch=(y1-y0-64)/rows;
        for(var a=0;a<cols;a++)for(var b=0;b<rows;b++){x=30+a*cw;y=y0+16+b*ch;var f=['#C98C74','#B9788A','#C79B6C','#A98BA0'][(a+b*2)%4];
          s+=R(x+3,y+9,cw-8,ch-10,10,'#000',.16)+R(x+3,y+3,cw-8,ch-10,10,f)+R(x+9,y+9,cw-20,ch-22,7,'#fff',.1);
          for(i=1;i<4;i++)s+=L('M'+(x+12)+' '+(y+3+i*(ch-10)/4).toFixed(0)+'h'+(cw-26).toFixed(0),'#6E4A48',1.4,.28,'7 5');}
      }else (Y.paths||[]).forEach(function(d){s+=L(d,'var(--sand)',16,.75)+L(d,'#000',16,.05,'2 22');});
      if(id==='fog'){ /* a plank pier along the shore */
        s+=R(w*.2,y1-62,w*.6,34,6,'#A9794F');for(i=0;i<Math.floor(w*.6/18);i++)s+=L('M'+(w*.2+9+i*18).toFixed(0)+' '+(y1-60)+'v30','#7A5233',1.8,.7);
        s+=R(w*.44,y1-34,w*.12,34,4,'#A9794F');}
      if(id==='canal'){ /* two water channels cross the island, each with its bridges */
        var ys=[y0+(y1-y0)*.36,y0+(y1-y0)*.7];ys.forEach(function(cy,n){var d='M10 '+cy.toFixed(0)+'C'+(w*.3)+' '+(cy-26+n*52).toFixed(0)+' '+(w*.65)+' '+(cy+30-n*60).toFixed(0)+' '+(w-10)+' '+cy.toFixed(0);
          s+=L(d,'#E8DDBE',36)+L(d,'#6FBFD0',27)+L(d,'#fff',2,.55,'14 26');
          var bx=n?w*.68:w*.3,by=cy+(n?8:-8);s+=G(bx,by,1,R(-17,-22,34,44,8,'#C9A77C')+L('M-9 -20v40M0 -20v40M9 -20v40','#9A7A55',1.6)+L('M-17 -20q-8 20 0 40M17 -20q8 20 0 40','#F5EFE2',4));});}
      if(id==='marsh'){for(i=0;i<7;i++){x=50+rnd()*(w-100);y=y0+80+rnd()*(y1-y0-150);s+=E(x.toFixed(0),y.toFixed(0),(18+rnd()*22).toFixed(0),(8+rnd()*8).toFixed(0),'#5E8C84',.85)+G(x,y,.8,PROP.lily(i));}}
      if(id==='bell'){for(i=0;i<46;i++){x=24+rnd()*(w-48);y=y0+14+rnd()*(y1-y0-60);s+=E(x.toFixed(0),y.toFixed(0),3.4,2,i%3?'#F7BDD3':'#fff',.9);}}
    }
    /* landmarks round the shore first, then in the open middle, never where a singer or a building stands */
    var set=SET[id]||SET.day,spots=[],want=id==='stage'?4:lay==='flat'?11:13,tries=0,pi=0;
    while(spots.length<want&&tries++<900){
      var edge=tries<520;
      if(edge){var left=rnd()<.5,top=rnd()<.25;x=top?40+rnd()*(w-80):left?20+rnd()*34:w-54+rnd()*34;y=top?y0+14+rnd()*30:y0+60+rnd()*(y1-y0-84);}
      else{x=34+rnd()*(w-68);y=y0+50+rnd()*(y1-y0-76);}
      if(id==='stage'&&y<y1-70&&x>46&&x<w-46)continue;
      if(!clearOf(x,y,keep)||spots.some(function(q){return Math.abs(q[0]-x)<46&&Math.abs(q[1]-y)<52;}))continue;
      spots.push([x,y,pi++]);}
    spots.sort(function(a,b){return a[1]-b[1];}).forEach(function(q){var n=set[q[2]%set.length];
      if(ONCE[n]&&q[2]>=set.length)n=set[1+q[2]%(set.length-1)];if(ONCE[n]&&q[2]>=set.length)n=set[set.length-1];
      s+=G(q[0],q[1],ONCE[n]?1.5:1.18,PROP[n](q[2]));});
    if(id==='lantern'||id==='night'){ /* strings of lights across the island */
      [y0+(y1-y0)*.28,y0+(y1-y0)*.66].forEach(function(cy,n){var d='M14 '+(cy-30).toFixed(0)+'Q'+(w/2)+' '+(cy+26).toFixed(0)+' '+(w-14)+' '+(cy-30).toFixed(0);s+=L(d,'#2A1B22',1.2,.7);
        for(var q=1;q<12;q++){var t=q/12,px=(1-t)*(1-t)*14+2*(1-t)*t*(w/2)+t*t*(w-14),py=(1-t)*(1-t)*(cy-30)+2*(1-t)*t*(cy+26)+t*t*(cy-30),c=['#FFC85C','#FF8A6B','#9FE0C8'][(q+n)%3];s+=C(+px.toFixed(1),+(py+5).toFixed(1),8,c,.22)+C(+px.toFixed(1),+(py+5).toFixed(1),3.4,c);}});}
    return s;
  }

  function mini(id,land,sand){
    var set=SET[id]||SET.day,s=P(coast(id,6,38,194,100,.7),'#000',.14)+P(coast(id,6,32,194,92,.7),sand)+P(coast(id,15,32,185,82,.6),land);
    if(id==='canal')s+=L('M16 58C60 44 130 74 186 56','#6FBFD0',9);
    if(id==='marsh')s+=E(70,62,22,7,'#5E8C84')+E(140,52,16,6,'#5E8C84');
    if(id==='stage')s+=L('M30 76H170','#FFE08A',4,1,'1 14');
    s+=G(32,56,.7,PROP[set[0]](0))+G(170,58,.7,PROP[set[1]](1))+G(146,78,.5,PROP[set[2]](2));
    return '<svg viewBox="0 -14 200 124" preserveAspectRatio="xMidYMax meet">'+s+'</svg>';
  }
  return {draw:draw,mini:mini};
})();
