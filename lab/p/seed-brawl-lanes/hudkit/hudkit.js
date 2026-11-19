// Seed Brawl match buttons: builds the markup for both skins (hudkit.css). One markup, the skin is a class on the
// HUD root (hk-a rings, hk-b stickers). The helper makes elements and changes their state; it never places them.
(function(){
const K = {
  base: '../game/assets/ui/tokens/',   // where <id>_256.png and <id>_pop_256.png live, relative to the page
  types: null                          // optional {id:'R'|'F'|...}; else read from window.SBL_CFG.homies.units
};
const STATES = ['normal','pressed','dragged','poor','empty'];
function el(tag, cls, html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e}
function unit(id){try{return window.SBL_CFG.homies.units[id]||{}}catch(_){return {}}}
function pct(f){return Math.max(0,Math.min(100,Math.round(f*100)))+'%'}
const UP='<svg viewBox="0 0 22 22"><path d="M5.5 13 L11 7.5 L16.5 13" fill="none" stroke="#1a1320" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 13 L11 7.5 L16.5 13" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CLAW='<svg viewBox="0 0 60 60"><g fill="none" stroke-linecap="round"><path d="M14 46 L30 10 M26 50 L42 14 M38 52 L50 24" stroke="#1a1320" stroke-width="11"/><path d="M14 46 L30 10 M26 50 L42 14 M38 52 L50 24" stroke="#fff" stroke-width="5"/></g></svg>';
const BURST='<svg viewBox="0 0 100 100"><polygon points="50,0 58,22 78,8 74,32 98,30 80,48 100,62 76,66 86,90 62,80 50,100 38,80 14,90 24,66 0,62 20,48 2,30 26,32 22,8 42,22" fill="#ffc83d" stroke="#1a1320" stroke-width="3" stroke-linejoin="round"/></svg>';
function pics(id){return '<i class="hk-face"><img class="hk-tight" alt="" src="'+K.base+id+'_256.png"></i><img class="hk-pop" alt="" src="'+K.base+id+'_pop_256.png">'}
function cost(n){return '<b class="hk-cost hk-num"><span>'+n+'</span></b>'}

// state: normal | pressed | dragged | poor (cannot afford; have = 0..1 of the cost already held) | empty (slot left behind)
K.set = function(e, o){
  if(o.state!=null){if(!STATES.includes(o.state))throw new Error('hudkit: state '+o.state);e.dataset.state=o.state}
  if(o.have!=null)e.style.setProperty('--have',pct(o.have));
  if(o.cost!=null){const c=e.querySelector('.hk-cost span');if(c)c.textContent=o.cost}
  return e;
};
// a homie card token. {id:'bramble_3', cost:3, state, have, type?, tier?}
K.token = function(o){
  const u=unit(o.id), type=o.type||(K.types&&K.types[o.id])||u.type||'T', tier=o.tier||u.tier||+(o.id.split('_')[1]||1);
  const e=el('div','hk hk-tok','<i class="hk-ring"></i>'+pics(o.id)+'<i class="hk-wait"></i><i class="hk-hl"></i><i class="hk-pips">'+'<u></u>'.repeat(tier)+'</i>'+cost(o.cost));
  e.dataset.type=type;e.dataset.id=o.id;
  return K.set(e,{state:o.state||'normal',have:o.have||0});
};
// the hero's super. {hero:'bramble', charge:0..1}; full charge = ready (burst behind, ring solid)
K.superBtn = function(o){
  const e=el('div','hk hk-sup','<i class="hk-burst">'+BURST+'</i><i class="hk-meter"></i><i class="hk-ring"></i>'+pics(o.hero)+'<i class="hk-tick"></i><i class="hk-hl"></i>');
  return K.setCharge(e,o.charge||0);
};
K.setCharge = function(e,f){e.style.setProperty('--ch',pct(f));e.style.setProperty('--cha',Math.min(1,Math.max(0,f))*360+'deg');if(f>=1)e.dataset.ready='';else delete e.dataset.ready;return e};
// attack. {ammo:2, max:3}
K.attack = function(o){
  const e=el('div','hk hk-atk','<i class="hk-ring"></i><i class="hk-face"></i><i class="hk-g">'+CLAW+'</i><i class="hk-hl"></i><i class="hk-ammo"></i>');
  return K.setAmmo(e,o&&o.ammo!=null?o.ammo:3,o&&o.max||3);
};
K.setAmmo = function(e,n,max){e.querySelector('.hk-ammo').innerHTML=Array.from({length:max},(_,i)=>'<u'+(i<n?' class="on"':'')+'></u>').join('');return e};
// upgrade: brings in the next bigger homie. {id:'bramble_5', cost:6, state:'normal'|'pressed'|'poor', have}
K.upgrade = function(o){
  const e=el('div','hk hk-upg','<i class="hk-ring"></i>'+pics(o.id)+'<i class="hk-wait"></i><i class="hk-hl"></i><i class="hk-up">'+UP+'</i>'+cost(o.cost));
  e.dataset.id=o.id;
  return K.set(e,{state:o.state||'normal',have:o.have||0});
};
K.setUpgrade = function(e,id){e.dataset.id=id;e.querySelector('.hk-tight').src=K.base+id+'_256.png';e.querySelector('.hk-pop').src=K.base+id+'_pop_256.png';return e};
// seed number pill
K.seeds = function(n){const e=el('div','hk hk-seeds','<i class="hk-seed"></i><b class="hk-num">'+n+'</b>');return e};
K.setSeeds = function(e,n){e.querySelector('b').textContent=n;return e};
K.pause = function(){return el('div','hk hk-pause','<i class="hk-ring"></i><i class="hk-face"><i></i><i></i></i>')};
// move stick: returns {base, knob}; move the knob yourself
K.stick = function(){return {base:el('div','hk hk-stick'),knob:el('div','hk hk-knob')}};
// skin switch on the HUD root: 'a' rings (default) or 'b' stickers; also sets the scale (1 at 874 css px wide)
K.skin = function(root, s, scale){root.classList.add('hk-root');root.classList.toggle('hk-a',s!=='b');root.classList.toggle('hk-b',s==='b');if(scale)root.style.setProperty('--hk-s',scale);return root};
window.HudKit = K;
})();
