// New isolated endpoint; existing Sparktory functions and credentials remain unchanged.
const allowed = new Set(['https://vyassathya.github.io','http://localhost:8791','http://127.0.0.1:8791']);
const types = new Set(['Product or website','Workflow automation','Game or 3D tooling','Product film','Collection launch','Something else']);
Deno.serve(async (req:Request) => {
 const origin=req.headers.get('origin')||'';
 const headers={'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'};
 const reply=(status:number,body:unknown)=>new Response(JSON.stringify(body),{status,headers});
 if(!allowed.has(origin))return reply(403,{error:'This form must be sent from the portfolio website.'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'Use the project inquiry form.'});
 if(!req.headers.get('content-type')?.includes('application/json'))return reply(415,{error:'Unsupported form format.'});
 if(Number(req.headers.get('content-length')||0)>12000)return reply(413,{error:'Please shorten your message.'});
 try {
  const raw=await req.text();if(raw.length>12000)return reply(413,{error:'Please shorten your message.'});
  const input=JSON.parse(raw);
  if(input.website)return reply(400,{error:'Unable to accept this inquiry.'});
  const field=(key:string,max:number)=>typeof input[key]==='string'?input[key].trim().slice(0,max):'';
  const name=field('name',100),email=field('email',254).toLowerCase(),project=field('project',80),message=field('message',5000);
  if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||!types.has(project)||message.length<20)return reply(400,{error:'Please enter your name, email, project type and a little more detail.'});
  const id=/^[0-9a-f-]{36}$/i.test(input.requestId||'')?input.requestId:crypto.randomUUID();
  const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,url=Deno.env.get('SUPABASE_URL')!;
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
  const hmac=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const hash=Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',hmac,new TextEncoder().encode(ip)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const result=await fetch(url+'/rest/v1/rpc/portfolio_submit_inquiry',{method:'POST',headers:{'apikey':key,'Authorization':'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({p_id:id,p_name:name,p_email:email,p_project_type:project,p_budget:field('budget',80),p_timeline:field('timeline',120),p_message:message,p_rate_hash:hash})});
  if(!result.ok){const err=await result.json().catch(()=>({}));return reply(err.code==='P0001'?429:503,{error:err.code==='P0001'?'Please wait before sending another inquiry.':'Your message was not saved. Please try again.'});}
  return reply(201,{ok:true,reference:id.slice(0,8)});
 }catch{return reply(400,{error:'Your message was not saved. Check the fields and try again.'});}
});
