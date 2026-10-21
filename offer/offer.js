/* Offer page: pick or type what you do, see both sides of your portal, then ask for it.
   The demo frames are swapped live with postMessage; the request goes to the private inquiry inbox. */
(() => {
 const $=s=>document.querySelector(s);
 const theme=$('.theme');
 theme?.addEventListener('click',()=>{
  const root=document.documentElement,dark=root.dataset.theme?root.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme=dark?'light':'dark';try{localStorage.setItem('theme',root.dataset.theme)}catch(e){}
 });

 const chips=$('#chips'),typed=$('#typed'),fType=$('#t-type'),fBiz=$('#t-biz');
 const result=$('#result'),request=$('#request'),sub=$('#res-sub'),cta=$('#cta'),stage=$('.stage');
 const fo=$('#f-owner'),fc=$('#f-client');
 let current=null,loaded=false;

 const short=k=>DEMO_TEMPLATES[k].chip||DEMO_TEMPLATES[k].label;
 const chip=k=>`<button type="button" data-k="${k}" aria-pressed="false">${short(k)}</button>`;
 const total=Object.keys(DEMO_TEMPLATES).length;
 chips.innerHTML=DEMO_FEATURED.map(chip).join('')+`<button type="button" class="more" aria-expanded="false">See all ${total}</button>`;
 const all=document.createElement('div');all.className='all';all.hidden=true;
 all.innerHTML=Object.entries(DEMO_GROUPS).map(([g,keys])=>`<div class="grp"><h3>${g}</h3><div class="chips">${keys.map(chip).join('')}</div></div>`).join('');
 chips.after(all);

 function show(type,biz,scroll){
  const t=demoTemplate(type);if(!t)return;
  current={type,biz:(biz||'').trim()};
  const name=current.biz||(t.biz==='{biz}'?'your business':t.biz);
  document.querySelectorAll('[data-k]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.k===t.key&&!!DEMO_TEMPLATES[type])));
  const apps=(t.apps||t.tools||[]).map(a=>a.replace(/\s*\(.*?\)/,'')).slice(0,3);
  sub.textContent=(current.biz?`Set up for ${current.biz}.`:`Set up as ${name}; add your business name above to see yours.`)+(apps.length?` Works next to ${apps.length>1?apps.slice(0,-1).join(', ')+' and '+apps.at(-1):apps[0]}.`:'');
  cta.innerHTML=`Get this for ${esc(current.biz||'your business')} <span aria-hidden="true">&#8594;</span>`;
  $('#demo-form [name=kind]').value=`${t.label}${type!==t.key&&!DEMO_TEMPLATES[type]?' ('+type+')':''}`;
  result.hidden=false;request.hidden=false;
  const qs=`type=${encodeURIComponent(type)}&biz=${encodeURIComponent(current.biz)}&embed=1`;
  if(!loaded){fo.src=`../demo/owner.html?${qs}`;fc.src=`../demo/?${qs}`;loaded=true;}
  else for(const f of [fo,fc])f.contentWindow?.postMessage({demo:{type,biz:current.biz}},location.origin);
  try{history.replaceState(null,'',`?type=${encodeURIComponent(type)}${current.biz?'&biz='+encodeURIComponent(current.biz):''}`)}catch(e){}
  if(scroll)result.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 }
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

 const pick=e=>{const b=e.target.closest('button');if(!b)return;if(b.classList.contains('more')){all.hidden=!all.hidden;b.setAttribute('aria-expanded',String(!all.hidden));b.textContent=all.hidden?'See all '+total:'Fewer';return;}if(!b.dataset.k)return;fType.value='';show(b.dataset.k,fBiz.value,true);};
 chips.addEventListener('click',pick);all.addEventListener('click',pick);
 typed.addEventListener('submit',e=>{e.preventDefault();const v=fType.value.trim();if(!v&&!current){fType.focus();return;}show(v||current.type,fBiz.value,true);});
 document.querySelector('.sides').addEventListener('click',e=>{const b=e.target.closest('[data-side]');if(!b)return;stage.dataset.show=b.dataset.side;document.querySelectorAll('.sides button').forEach(x=>x.setAttribute('aria-selected',String(x===b)));});

 const params=new URLSearchParams(location.search);
 if(params.get('type')){fBiz.value=params.get('biz')||'';if(!DEMO_TEMPLATES[params.get('type')])fType.value=params.get('type');show(params.get('type'),params.get('biz'),false);}

 const form=$('#demo-form');if(!form)return;
 const status=$('#demo-status'),submit=form.querySelector('[type=submit]');
 let requestId=crypto.randomUUID();
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  submit.disabled=true;submit.textContent='Sending...';status.textContent='';status.className='form-status';
  try{
   const v=Object.fromEntries(new FormData(form));
   const config=await fetch('../contact-config.json').then(r=>{if(!r.ok)throw Error();return r.json()});
   const message=`Portal request.\nBusiness type: ${v.kind||'not picked'}\nBusiness name: ${current&&current.biz||'not given'}\nWebsite: ${v.site.trim()}`;
   const body={name:v.name,email:v.email,project:'Product or website',budget:'Client portal',timeline:'',message,website:v.website,requestId};
   const response=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json','apikey':config.anonKey,'Authorization':'Bearer '+config.anonKey},body:JSON.stringify(body)});
   const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Your request was not saved. Please try again.');
   form.reset();requestId=crypto.randomUUID();status.textContent='Thanks. Your portal will be on its way within two days.';status.classList.add('success');status.focus();
  }catch(error){status.textContent=error.message||'Your request was not saved. Please try again.';status.classList.add('error');status.focus();}
  finally{submit.disabled=false;submit.textContent='Send it to me';}
 });
})();
