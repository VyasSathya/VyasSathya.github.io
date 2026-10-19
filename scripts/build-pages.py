"""Build static project pages and the browser catalog from projects.json. Python standard library only."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
projects = json.loads((ROOT / "projects.json").read_text(encoding="utf-8"))
esc = lambda s: html.escape(str(s), quote=True)
theme = "try{const t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t;}catch(e){}"
toggle = "document.querySelector('.theme').addEventListener('click',()=>{const r=document.documentElement,d=r.dataset.theme?r.dataset.theme==='dark':matchMedia('(prefers-color-scheme:dark)').matches;r.dataset.theme=d?'light':'dark';try{localStorage.setItem('theme',r.dataset.theme);}catch(e){}});const v=document.querySelector('video'),play=document.querySelector('.case-play');if(v&&play){v.controls=false;play.hidden=false;const start=()=>{v.controls=true;v.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});v.play().then(()=>{play.hidden=true;v.focus();}).catch(()=>{v.focus();});};play.addEventListener('click',start);document.querySelector('[data-watch]')?.addEventListener('click',start);v.addEventListener('play',()=>{play.hidden=true;});v.addEventListener('ended',()=>{play.hidden=false;});}"
for i,p in enumerate(projects):
    poster = f'../../media/{p.get("playerPoster",p["poster"])}' if p.get('poster') else ''
    actions = '<button class="primary" type="button" data-watch>Watch film</button>' if p.get('film') else ''
    actions += ''.join(f'<a href="{esc(href)}" rel="noopener">{esc(label)} &#8599;</a>' for label,href in p['links'])
    if p.get('film'):
        media = f'<video controls playsinline preload="none" poster="{poster}" tabindex="0" aria-label="{esc(p["name"])} film"><source src="../../media/{esc(p["film"])}" type="video/mp4"></video><button class="case-play" type="button" hidden aria-label="Play {esc(p["name"])} film with sound">&#9654; <span>Play film</span></button>'
    elif p.get('youtube'):
        media = f'<iframe loading="lazy" src="https://www.youtube-nocookie.com/embed/{esc(p["youtube"])}" title="Vyas Sathya stand-up performance" allow="fullscreen; picture-in-picture" allowfullscreen></iframe>'
    elif poster:
        media = f'<img src="{poster}" alt="{esc(p.get("imageAlt",p["name"]))}">'
    else:
        media = f'<span class="wordmark">{esc(p.get("wordmark",p["name"]))}</span>'
    nxt = projects[(i+1)%len(projects)]
    details = ''.join(f'<li><strong>{esc(k)}</strong><span>{esc(v)}</span></li>' for k,v in p['details'])
    page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>{esc(p['name'])} - Vyas Sathya</title><meta name="description" content="{esc(p['summary'])}"><meta name="color-scheme" content="light dark"><meta property="og:title" content="{esc(p['name'])} - Vyas Sathya"><meta property="og:description" content="{esc(p['tagline'])}"><link rel="icon" href="../../favicon.svg"><link rel="stylesheet" href="../../site.css"><script>{theme}</script></head>
<body class="case-shell identity-{p['id']}" style="--brand:{p['accent']}"><a class="skip" href="#project">Skip to project</a><header class="bar"><a class="mark" href="../../">VS<span>Vyas Sathya</span></a><nav aria-label="Main navigation"><a href="../../">Work</a><a href="../../services/">Services</a><a href="../../about/">About</a><a href="../../contact/">Contact</a><button class="theme" type="button" aria-label="Switch light or dark appearance"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 3a7 7 0 0 1 0 14z" fill="currentColor"/></svg></button></nav></header>
<main class="case-main" id="project"><section class="case-hero"><p class="eyebrow case-label">{esc(p['type'])} / {esc(p['kind'])}</p><h1>{esc(p['name'])}</h1><p class="case-tagline">{esc(p['tagline'])}</p><div class="case-actions">{actions}</div></section><div class="case-stage" id="film">{media}</div><p class="case-film-note">{esc(p['filmNote'])}</p><section class="case-body"><div><h2>The work</h2><p>{esc(p['summary'])}</p><h2 style="margin-top:30px">What I built</h2><p>{esc(p['contribution'])}</p></div><div><ul class="case-details">{details}</ul><p style="font-size:12px;margin-top:24px">{esc(p['state'])}</p></div></section><nav class="case-next" aria-label="More work"><a href="../../#work/{p['group']}">&#8592; Back to work</a><a href="../{nxt['id']}/"><small>Next project</small>{esc(nxt['name'])} &#8594;</a></nav></main><footer class="foot"><span>Vyas Sathya, 2026</span><a href="../../services/">Build something together &#8599;</a></footer><script>{toggle}</script></body></html>'''
    page = page.replace('</head>', '<link rel="stylesheet" href="../../identities.css"></head>')
    out = ROOT / 'work' / p['id']
    out.mkdir(parents=True, exist_ok=True)
    (out / 'index.html').write_text(page, encoding='utf-8')
(ROOT/'catalog.js').write_text('// Generated by scripts/build-pages.py from projects.json.\nconst PROJECTS = '+json.dumps(projects,ensure_ascii=True,separators=(',',':'))+';\n',encoding='utf-8')
print(f'Built {len(projects)} project pages and catalog.js')
