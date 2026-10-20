/* Offer page: theme switch and the free-demo request, saved to the same private inquiry inbox as Contact. */
(() => {
 const theme=document.querySelector('.theme');
 theme?.addEventListener('click',()=>{
  const root=document.documentElement,dark=root.dataset.theme?root.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme=dark?'light':'dark';try{localStorage.setItem('theme',root.dataset.theme)}catch(e){}
 });

 const form=document.querySelector('#demo-form');if(!form)return;
 const status=document.querySelector('#demo-status'),submit=form.querySelector('[type=submit]');
 let requestId=crypto.randomUUID();
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  submit.disabled=true;submit.textContent='Sending...';status.textContent='';status.className='form-status';
  try{
   const v=Object.fromEntries(new FormData(form));
   const config=await fetch('../contact-config.json').then(r=>{if(!r.ok)throw Error();return r.json()});
   const message=`Free portal demo request.\nWebsite: ${v.site.trim()}\n${v.note.trim()?'Note: '+v.note.trim():''}`.trim();
   const body={name:v.name,email:v.email,project:'Product or website',budget:'Portal demo',timeline:'',message,website:v.website,requestId};
   const response=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json','apikey':config.anonKey,'Authorization':'Bearer '+config.anonKey},body:JSON.stringify(body)});
   const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Your request was not saved. Please try again.');
   form.reset();requestId=crypto.randomUUID();status.textContent='Thanks. Your demo will be on its way within two days.';status.classList.add('success');status.focus();
  }catch(error){status.textContent=error.message||'Your request was not saved. Please try again.';status.classList.add('error');status.focus();}
  finally{submit.disabled=false;submit.textContent='Send me a demo';}
 });
})();
