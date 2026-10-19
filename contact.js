/* Public submission credentials grant no access to the private inbox. */
(() => {
 const form=document.querySelector('#inquiry-form');if(!form)return;
 const status=document.querySelector('#inquiry-status'),submit=form.querySelector('[type=submit]');
 let requestId=crypto.randomUUID();
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(!form.reportValidity())return;
  submit.disabled=true;submit.textContent='Sending...';status.textContent='';status.className='form-status';
  try{
   const config=await fetch('contact-config.json').then(r=>{if(!r.ok)throw Error();return r.json()});
   const values=Object.fromEntries(new FormData(form));
   const response=await fetch(config.endpoint,{method:'POST',headers:{'Content-Type':'application/json','apikey':config.anonKey,'Authorization':'Bearer '+config.anonKey},body:JSON.stringify({...values,requestId})});
   const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Your message was not saved. Please try again.');
   form.reset();requestId=crypto.randomUUID();status.textContent='Thanks. Your inquiry has been saved.';status.classList.add('success');status.focus();
  }catch(error){status.textContent=error.message||'Your message was not saved. Please try again.';status.classList.add('error');status.focus();}
  finally{submit.disabled=false;submit.textContent='Send inquiry';}
 });
})();
