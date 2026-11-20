// Date Ninja QA autoplay. Loaded only when the debug app is launched with -qa (or the page with ?qa in a browser).
// Plays the main flow on its own through the game's own swipe path (seg / endSwipe) and logs what happened:
// Start, a run that sees every card type, a combo streak, a strike back at 100, three strikes, restart, a red flag,
// Menu, then roses: grant through the test hook, the shop (buy and equip a trail and a background, buy all three
// power-ups), the pre-run screen and an Arcade run with them on (a red flag hits the shield). QA never writes the
// real save: the game skips persisting while DN.qa is set, and qa.js works on a fresh in-memory save.
// Every line goes to the native log as "DNQA ..."; the last line is "QA_DONE {...}".
(function(){
  const t0=performance.now();
  const log=m=>{const s=((performance.now()-t0)/1000).toFixed(1)+'s '+m;console.log('DNQA '+s);post({t:'log',m:s})};
  const seen={},said={};
  const _swipe=swipeCard;swipeCard=function(c,dir){const k=c.kind+(c.pow?':'+c.pow:'')+(c.kind==='p'?(c.hot?':hot':':ugly'):'');if(!seen[k])log('first swipe on '+k+' dir '+(dir>0?'right':'left'));seen[k]=(seen[k]||0)+1;return _swipe(c,dir)};
  const _say=say;say=function(x,y,txt,c,sz){const k=String(txt).replace(/[0-9+]+/g,'#').trim();if(!said[k])log('shown: '+txt);said[k]=(said[k]||0)+1;return _say(x,y,txt,c,sz)};
  const _strike=strike;strike=function(x,y,txt){_strike(x,y,txt);log('strike: '+txt+', strikes '+strikes+', score '+score)};
  if(DN.qaManual){
    // real-touch run (ci/mac_run.py): say where Play is in screen points so the Mac taps it, then only log
    log('qa manual: logging real touches only, H='+H.toFixed(0)+' ST='+ST.toFixed(0));
    // a fresh install opens on onboarding, so the run is started here and the Mac's swipes only play it
    setTimeout(()=>{mode='classic';playAgain();log('manual Classic run started: phase='+phase);
      log('PLAY_AT '+Math.round((W/2+OX)*scale)+' '+Math.round(H*0.12*scale))},800);
    return}
  const qaKeep=JSON.stringify(save);__dnTest.reset();
  log('save reset in memory for the run, roses '+save.roses);
  const _end=endRun;endRun=function(d){const r=save.roses;_end(d);log('run over ('+mode+'): score '+score+(newBest?' new best':'')+', roses +'+(save.roses-r)+' (game-over shows +'+lastEarned+'), total '+save.roses)};
  const _sc=swipeCard;swipeCard=function(c,dir){
    const s0=score,e0=endT,sh=shieldN,fh=flagsHit;_sc(c,dir);
    if(c.kind==='flag'&&mode==='arcade')log('arcade red flag: shields '+sh+' -> '+shieldN+', score '+s0+' -> '+score+', flagsHit '+fh+' -> '+flagsHit+(sh>shieldN&&score>=s0?' (shield held, no -10)':''));
    if(c.boost)log('boost '+c.boost+' card swiped '+(dir>0?'right':'left')+': score '+s0+' -> '+score+', clock +'+(endT-e0).toFixed(1)+'s');
  };
  let ms=performance.now();
  let acts=[],actAt=0;
  const queue=(...f)=>{acts=f;actAt=now};
  const tapBox=b=>tapAt(b.x+b.w/2,b.y+b.h/2);
  // the home screen: pick the mode on the segmented control, then the Play pill
  // the home screen: tap the mode's ring (a tap picks it at once; a right swipe tears its card first)
  const startMode=m=>{tapBox(RINGS.find(a=>a.k===m))};
  // a fast stroke straight through a ring, through the game's own swipe path
  function swipeRing(k,dir){const R=RINGS.find(a=>a.k===k);let t=performance.now();const a={x:R.cx-dir*(R.r+30),y:R.cy,t};
    const b={x:R.cx,y:R.cy,t:t+30},c={x:R.cx+dir*(R.r+30),y:R.cy,t:t+60};ptr=a;homeDown={p:a,R:null,moved:0};seg(a,b);seg(b,c);ptr=null;homeDown=null}
  // shop 2: tap a tile to select it, then the one button under the preview buys (and equips) it
  const shopBtn=id=>shopLay().rows.find(r=>r.it.id===id).btn;
  const shopTabTo=i=>{const T=shopLay().tabs;tapAt(T.x+T.w/SHELF.length*(i+0.5),T.y+T.h/2)};
  const shopBuy=id=>{tapBox(shopBtn(id));tapBox(shopLay().act)};
  function buyEquip(tab,id,k){
    return[()=>{shopTabTo(tab);log('shop tab '+shopTab+' ('+SHELF[shopTab].t+')')},
      ()=>{const r=save.roses;shopBuy(id);log('buy '+k+' '+id+': owned='+save.own[k].includes(id)+', equipped='+save.eq[k]+', roses '+r+' -> '+save.roses)}];
  }
  // a stroke runs 90 units past the cards; hold it while a red flag is close to that line (unless the flag is the target)
  const flagNear=(list)=>cards.some(f=>f.kind==='flag'&&!f.state&&!list.includes(f)&&list.some(c=>Math.abs(f.y-c.y)<110&&Math.abs(f.x-c.x)<260));
  function swipeThrough(list,dir){
    if(flagNear(list))return false;
    // one fast stroke: a point left/right of each card, through its centre, in order of x
    for(const c of cards)c.inside=false;
    const pts=[];const xs=list.slice().sort((a,b)=>dir*(a.x-b.x));
    let x0=xs[0].x-dir*90;pts.push({x:x0,y:xs[0].y,t:ms});
    for(const c of xs){ms+=25;pts.push({x:c.x,y:c.y,t:ms})}
    ms+=25;pts.push({x:xs[xs.length-1].x+dir*90,y:xs[xs.length-1].y,t:ms});
    for(let i=1;i<pts.length;i++)seg(pts[i-1],pts[i]);
    endSwipe();ms+=200;return true;
  }
  function tapAt(x,y){
    const r=cv.getBoundingClientRect();
    cv.dispatchEvent(new PointerEvent('pointerdown',{clientX:r.left+(x+OX)*scale,clientY:r.top+y*scale,pointerId:9,bubbles:true}));
    cv.dispatchEvent(new PointerEvent('pointerup',{clientX:r.left+(x+OX)*scale,clientY:r.top+y*scale,pointerId:9,bubbles:true}));
  }
  const right=c=>c.kind==='pow'||c.kind==='ten'||c.kind==='one'||c.hot;
  let stage='start',stageAt=0,wrongDone=false,comboDone=0,comboAt=0,runs=0,checks={};
  function row(n,hot){
    // QA only: toss n plain cards side by side at one height so one stroke takes all of them (a combo)
    const made=[];for(let i=0;i<n;i++){toss(1);const c=cards[cards.length-1];c.kind='p';c.hot=hot;c.hint=false;made.push(c)}
    made.forEach((c,i)=>{c.x=W/2+(i-(n-1)/2)*95;c.y=H*0.45;c.vx=0;c.vy=-60;c.va=0;c.a=0});
    return made;
  }
  function next(s){stage=s;stageAt=now;log('stage '+s)}
  function tick(){
    try{
      if(acts.length){if(now-actAt>=0.4){actAt=now;acts.shift()()}}
      else if(stage==='start'&&now>1&&phase===6){
        // first launch: the onboarding picks, then Continue lands on the home rings
        log('onboarding up, picks me='+me+' want='+want);tapBox(ASK.find(a=>a.k==='cont'));log('continue: phase='+phase+' (0 = home), rings '+RINGS.map(r=>r.k).join(','))}
      else if(stage==='start'&&now>1.5){
        swipeRing('zen',-1);log('left swipe through the Zen ring: phase='+phase+' (stays 0)');
        swipeRing('classic',1);log('right swipe through the Classic ring: picked '+(homeSel&&homeSel.R.k));next('swipeStart')}
      else if(stage==='swipeStart'&&phase===2){log('classic started by the swipe: phase='+phase+' mode='+mode);next('run1')}
      else if(stage==='run1'){
        if(phase!==2)return requestAnimationFrame(tick);
        if(tossed===5)window.__force=['pow:x2','ten','pow:slow','one','pow:frenzy','ten'];
        // one deliberate wrong swipe early, to check the strike comes back at 100
        for(const c of cards){
          if(c.state||c.kind==='flag'||c.y>H*0.75)continue;
          if(c.kind==='one'&&c.hits){if(Math.random()<0.25)swipeThrough([c],1);continue}
          if(c.vy>-260||c.y<H*0.35){
            let dir=right(c)?1:-1;
            // a wrong-way swipe costs nothing now (his ruling); one card is let drop instead, for the strike-back check
            const wrong=!wrongDone&&c.kind==='p'&&tossed>=4;
            if(wrong){const st=strikes;swipeThrough([c],-dir);log('wrong-way swipe: strikes '+st+' -> '+strikes+(strikes===st?' (no strike, as ruled)':' (STRIKE, wrong)'));wrongDone=true;checks.dropOne=1;continue}
            if(checks.dropOne===1&&c.kind==='p'&&c.hot){checks.dropOne=c;continue}
            if(checks.dropOne===c)continue;
            swipeThrough([c],dir);
          }
        }
        if(score>=20&&comboDone<3&&now-comboAt>0.9){const hot=comboDone!==1;swipeThrough(row(3+comboDone,hot),hot?1:-1);comboDone++;comboAt=now}
        if(score>=100&&!checks.back){checks.back=true;log('score '+score+' strikes now '+strikes+(strikes===0?' (strike came back)':''))}
        if(score>=130&&wrongDone&&seen.ten&&seen.one&&seen['pow:x2']&&seen['pow:slow']&&seen['pow:frenzy']){log('score '+score+', every card type swiped; now losing on purpose');next('lose')}
        if(now-stageAt>150){log('run1 timed out at score '+score);next('lose')}
        if(over){log('run1 ended early: score '+score+' strikes '+strikes);next('over1')}
      }
      else if(stage==='lose'){
        // losing on purpose: stop swiping, let cards drop (drops cost a life in Classic, like Fruit Ninja Classic)
        if(over){log('three strikes: over='+over+' score='+score+' best='+best+' newBest='+newBest);next('over1')}
      }
      else if(stage==='over1'&&now-stageAt>1.6){
        tapAt(W/2,OVER.top+40);log('tap outside the buttons on game over: over='+over+' (must stay true), headline "'+endHead+'", report "'+endReport+'"');
        tapBox(OVER.play);log('play again: over='+over+' phase='+phase);runs++;window.__force=['p','flag'];next('run2')}
      else if(stage==='run2'){
        if(over){log('red flag run over: score '+score+' best '+best);next('over2');return requestAnimationFrame(tick)}
        for(const c of cards){
          if(c.state||c.y>H*0.75)continue;
          if(c.vy>-260||c.y<H*0.35)swipeThrough([c],c.kind==='flag'?1:right(c)?1:-1);
        }
        if(now-stageAt>40){log('run2 timed out');next('over2')}
      }
      else if(stage==='over2'&&now-stageAt>1.6){
        tapBox(OVER.share);const sh=window.__dnShare||{};
        log('share: '+(sh.error?'ERROR '+sh.error:'png '+(sh.png||'').slice(0,22)+'... '+Math.round((sh.bytes||0)/1024)+' KB, text "'+sh.text+'"'));
        tapAt(W/2,MENU.y+MENU.h/2);next('menu')}
      else if(stage==='menu'&&now-stageAt>0.5){
        log('back on start screen: phase='+phase);
        startMode('arcade');next('arcade');
      }
      else if(stage==='arcade'){
        if(!checks.arcadeStart){checks.arcadeStart=true;log('arcade started: mode='+mode+' timer '+(endT-now).toFixed(0)+'s');endT=now+16;window.__force=['flag','pow:x2']}
        for(const c of cards){
          if(c.state||c.y>H*0.75)continue;
          if(c.kind==='one'&&c.hits){if(Math.random()<0.3)swipeThrough([c],1);continue}
          if(c.vy>-260||c.y<H*0.35)swipeThrough([c],c.kind==='flag'?1:right(c)?1:-1);
        }
        if(over){log('arcade over: score '+score+' bonuses '+JSON.stringify(bonuses)+' flagsHit '+flagsHit+' best '+best);next('arcadeOver')}
        if(now-stageAt>40){log('arcade timed out');next('arcadeOver')}
      }
      else if(stage==='arcadeOver'&&now-stageAt>1.6){tapAt(W/2,MENU.y+MENU.h/2);next('zenStart')}
      else if(stage==='zenStart'&&now-stageAt>0.6){startMode('zen');next('zen')}
      else if(stage==='zen'){
        if(!checks.zenStart){checks.zenStart=true;log('zen started: mode='+mode+' timer '+(endT-now).toFixed(0)+'s');endT=now+14;checks.zenSeen={}}
        for(const c of cards){
          checks.zenSeen[c.kind]=1;
          if(c.state||c.y>H*0.75)continue;
          if(c.vy>-260||c.y<H*0.35)swipeThrough([c],right(c)?-1:1);  // all wrong on purpose: Zen has no strikes
        }
        if(over){log('zen over: score '+score+' strikes '+strikes+' kinds seen '+Object.keys(checks.zenSeen).join(','));next('zenOver')}
        if(now-stageAt>40){log('zen timed out');next('zenOver')}
      }
      else if(stage==='zenOver'&&now-stageAt>1.6){tapAt(W/2,MENU.y+MENU.h/2);next('shopOpen')}
      else if(stage==='shopOpen'&&now-stageAt>0.6){
        const r0=save.roses;__dnTest.grant(600);
        log('roses from the three runs '+r0+'; test hook granted 600, now '+save.roses);
        tapBox(RINGS.find(a=>a.k==='shop'));next('shop');
        queue(()=>log('shop open: phase='+phase+' (3 = shop), tab '+shopTab),
          ()=>{const r=save.roses,G=giftState();tapBox(shopLay().gift);log('daily roses: ready '+G.ready+' +'+G.amt+', roses '+r+' -> '+save.roses+', ready now '+giftState().ready)},
          ...buyEquip(0,'neon','trail'),...buyEquip(1,'lurkr','bg'),...buyEquip(2,'date','stamp'),
          ()=>{shopTabTo(3);log('shop tab '+shopTab+' ('+SHELF[shopTab].t+')')},
          ()=>{const r=save.roses;for(const id of['burst','time','shield'])shopBuy(id);log('bought power-ups '+JSON.stringify(save.pu)+', roses '+r+' -> '+save.roses)},
          ()=>{const sv=JSON.parse(window.__dnLastSave||'{}');log('save blob: '+window.__dnLastSave+(sv.eq&&sv.eq.trail==='neon'&&sv.eq.bg==='lurkr'&&sv.eq.stamp==='date'&&sv.pu.shield===1?' (matches)':' (MISMATCH)'))},
          ()=>{tapBox(topBar().back);log('back from shop: phase='+phase)},
          ()=>{startMode('arcade');log('arcade tapped: phase='+phase+' (4 = power-up screen), rows '+preLay().rows.map(r=>r.p.id).join(','))},
          ()=>{for(const r of preLay().rows)tapAt(r.x+r.w-28,r.y+r.h/2);log('switched on: '+JSON.stringify(pick))},
          ()=>{tapBox(preLay().play);log('play: phase='+phase+' mode='+mode+' runPU '+JSON.stringify(runPU)+' shields '+shieldN+', power-ups left '+JSON.stringify(save.pu)+', trail '+save.eq.trail+', bg '+save.eq.bg);next('puRun')});
      }
      else if(stage==='puRun'){
        if(!checks.pu){checks.pu=true;endT=now+14;window.__force=['p:burst','flag','p:time','flag','p']}
        for(const c of cards){
          if(c.state||c.y>H*0.75)continue;
          if(c.kind==='one'&&c.hits){if(Math.random()<0.3)swipeThrough([c],1);continue}
          if(c.vy>-260||c.y<H*0.35)swipeThrough([c],c.kind==='flag'?1:right(c)?1:-1);
        }
        if(over){log('power-up arcade over: score '+score+' flagsHit '+flagsHit+' shields left '+shieldN+' bonuses '+JSON.stringify(bonuses));next('puOver')}
        if(now-stageAt>40){log('power-up run timed out');next('puOver')}
      }
      else if(stage==='puOver'&&now-stageAt>1.6){
        tapAt(W/2,MENU.y+MENU.h/2);
        const shop={roses:save.roses,eq:save.eq,pu:save.pu,trails:save.own.trail,bgs:save.own.bg,stamps:save.own.stamp,gift:save.gift};
        __dnTest.restore(qaKeep);
        log('QA_DONE '+JSON.stringify({seen,said:Object.keys(said),best:BEST,phase,shop}));
        stage='done';
      }
    }catch(e){log('QA_ERROR '+e.message)}
    if(stage!=='done')requestAnimationFrame(tick);
  }
  log('qa loaded, H='+H.toFixed(0)+' ST='+ST.toFixed(0)+' scale='+scale.toFixed(3));
  requestAnimationFrame(tick);
})();
