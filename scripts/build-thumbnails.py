"""Compose responsive posters from approved portfolio imagery. Requires Pillow and fontTools."""
import base64
import argparse
import hashlib
import html
import io
import json
from pathlib import Path
from PIL import Image
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'media/thumbnails'
OUT.mkdir(exist_ok=True)
FONT = TTFont(ROOT / 'fonts/geist-latin-500-normal.woff2')
GLYPHS = FONT.getGlyphSet()
CMAP = FONT.getBestCmap()
UPM = FONT['head'].unitsPerEm
PROJECTS = json.loads((ROOT / 'projects.json').read_text())
parser = argparse.ArgumentParser()
parser.add_argument('--only', nargs='+', default=[], help='Rebuild selected project posters; retain other variants and overview.')
args = parser.parse_args()
# Each rectangle is a deliberately selected normalized source region, not a center crop.
DESIGNS = {
 'talkover': ('thumbnails/source-panel.png', (0,0,1,1), '#101215', '#f5f4f0', '#d77d57', ['Talkover'], 'Voice for coding agents'),
 'kpop-sing': ('kpop-sing.jpg', (.46,0,1,1), '#160c25', '#fff4ff', '#f7a4e5', ['Kpop','Sing'], 'K-pop karaoke'),
 'brainrot-brawl': ('brainrot-wide.jpg', (0,.10,1,.98), '#30215b', '#fff5cf', '#f6ca5b', ['Brainrot','Brawl'], 'Mobile party game'),
 'punchpad': ('punchpad.jpg', (.535,.06,.97,.94), '#f3efe7', '#242324', '#dd7245', ['Punchpad'], 'Record. Review. Prepare.'),
 'crewboard': ('crewboard.jpg', (.48,.13,.98,.94), '#ede7f6', '#302539', '#8966b2', ['crewboard'], 'A view of every agent'),
 'agent-brain': ('agent-brain.jpg', (.04,.15,.98,.94), '#e4ebe1', '#234536', '#427165', ['agent-brain'], 'Source-linked memory'),
 'marquee': ('marquee.jpg', (0,.08,1,.98), '#191917', '#f6f2e7', '#c5ae7b', ['J Will Media'], 'The Marquee Studios'),
 'front-of-line': ('front-of-line.jpg', (.40,.20,.98,.83), '#0d1421', '#f2f4ff', '#91a7fa', ['Front of Line'], 'Interview preparation'),
 'flower-girls': ('flower-girls.jpg', (0,0,1,1), '#e9dfe0', '#553946', '#946078', ['Flower Girls'], 'Art by Varvara Alay'),
 'puzzle-people': ('puzzle-people.jpg', (.54,.24,.96,.79), '#0e2523', '#f6cf57', '#dba940', ['Puzzle','People'], 'Original Procreate art'),
 'standup': ('standup.jpg', (.36,.02,.70,.96), '#171a20', '#f7e9d5', '#d2ae75', ['Vyas Sathya'], 'Stand-up'),
 'whiteboard': ('range-whiteboard.jpg', (0,0,1,1), '#f6f6ee', '#303b31', '#8f554b', ['Whiteboard','films'], 'How Talkover works'),
 'video-studio': ('thumbnails/source-panel.png', (0,0,1,1), '#221b1a', '#f8f0e9', '#e38665', ['video-studio'], 'Two film styles. One product.'),
 'mad-balls': ('mad-balls.jpg', (0,.10,1,.98), '#16343c', '#edf6e7', '#f49b60', ['Ricochet','Riot'], 'Inside Brainrot Brawl'),
 'buildwhatever': ('buildwhatever.jpg', (.45,.05,.98,.96), '#11271e', '#e2f1db', '#9bd9ac', ['BuildWhatever'], 'Public-source architecture'),
 'asset-pipeline': ('asset-pipeline.jpg', (0,.08,1,1), '#25282d', '#f4eee3', '#eaa65a', ['3D asset','pipeline'], 'Material repair in Blender'),
}
SIZES = {'wide': (1611,504), 'medium': (1200,504), 'compact': (996,672), 'player': (1920,1080)}
manifest = {'producer':'scripts/build-thumbnails.py; native SVG composition with approved image crops and Geist glyph paths', 'variants':SIZES, 'entries':[]}
if args.only:
    unknown = set(args.only) - set(DESIGNS)
    if unknown: parser.error('Unknown project ids: ' + ', '.join(sorted(unknown)))
    manifest = json.loads((OUT / 'provenance.json').read_text())
    manifest['entries'] = [p for p in manifest['entries'] if p['id'] not in args.only]

def text(value,x,y,size,color):
    cursor=0; parts=[]
    for char in value:
        name=CMAP.get(ord(char))
        if not name: continue
        pen=SVGPathPen(GLYPHS); GLYPHS[name].draw(pen)
        if pen.getCommands():parts.append(f'<path transform="translate({cursor} 0)" d="{pen.getCommands()}"/>')
        cursor+=FONT['hmtx'][name][0]
    return f'<g fill="{color}" transform="translate({x} {y}) scale({size/UPM} {-size/UPM})">'+''.join(parts)+'</g>'

def image_data(source,rect):
    im=Image.open(source).convert('RGB'); w,h=im.size
    box=tuple(round(v*s) for v,s in zip(rect,[w,h,w,h])); im=im.crop(box)
    im.thumbnail((1500,1200)); b=io.BytesIO();im.save(b,format='JPEG',quality=90,optimize=True)
    return 'data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode(),box

for p in PROJECTS:
    if args.only and p['id'] not in args.only: continue
    key=p['id'];source,rect,bg,fg,accent,title,sub=DESIGNS[key]
    data,box=image_data(ROOT/'media'/source,rect)
    entry={'id':key,'source':f'media/{source}','sha256':hashlib.sha256((ROOT/'media'/source).read_bytes()).hexdigest(),'source_crop_pixels':box,'background':bg,'outputs':{}}
    for variant,(w,h) in SIZES.items():
        compact=variant=='compact'
        if compact:
            # Portrait subjects stay intact; the brand moves above the image on the phone.
            tx,ty=56,93;size=66 if max(map(len,title))<14 else 57
            labels=title if len(title)<2 else [' '.join(title)]
            if len(labels[0])>18:labels=title
            image_y=140 if len(labels)==1 else 205
            ix,iy,iw,ih=40,image_y,w-80,h-image_y-32
            label=''.join(text(t,tx,ty+i*72,size,fg) for i,t in enumerate(labels))
        else:
            tx=74 if variant!='player' else 100
            size=78 if variant!='player' else 105
            if max(map(len,title))>11:size*=.78
            left=w*(.36 if variant!='player' else .38)
            # Long single wordmarks are fitted mathematically rather than clipped.
            max_width=max(sum(FONT['hmtx'][CMAP[ord(c)]][0] for c in t) for t in title)/UPM*size
            size=min(size,(left-tx-24)/max_width*size)
            block=(len(title)-1)*size*1.08
            ty=h*.46-block/2
            label=''.join(text(t,tx,ty+i*size*1.08,size,fg) for i,t in enumerate(title))
            label+=text(sub,tx,ty+block+size*.7,24 if variant!='player' else 31,fg)
            ix,iy,iw,ih=left+12,30,w-left-42,h-60
        # Every selected region is contained in its frame, so all subject pixels survive.
        art=f'<image x="{ix}" y="{iy}" width="{iw}" height="{ih}" preserveAspectRatio="xMidYMid meet" href="{data}"/>'
        if key=='video-studio':
            second,_=image_data(ROOT/'media/range-whiteboard.jpg',(0,0,1,1))
            art=f'<image x="{ix}" y="{iy}" width="{iw}" height="{ih*.31}" preserveAspectRatio="xMidYMid meet" href="{data}"/><image x="{ix}" y="{iy+ih*.36}" width="{iw}" height="{ih*.64}" preserveAspectRatio="xMidYMid meet" href="{second}"/>'
        svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img"><title>{html.escape(p["name"])} portfolio poster</title><rect width="{w}" height="{h}" fill="{bg}"/><path d="M {tx} {h-38} h {70 if compact else 100}" stroke="{accent}" stroke-width="5"/>{label}{art}</svg>'
        filename=f'{key}-{variant}.svg';(OUT/filename).write_text(svg)
        entry['outputs'][variant]='thumbnails/'+filename
    versioned={variant:path+'?v='+hashlib.sha256((ROOT/'media'/path).read_bytes()).hexdigest()[:10] for variant,path in entry['outputs'].items()}
    p['thumbnail']={**versioned,'background':bg}
    p['playerPoster']=versioned['player']
    entry['source_note']=p.get('filmNote','')
    if key in ['talkover','video-studio']:
        entry['upstream_source']='Original app-drawn panel: video-studio projects/talkover-launch/build/panel.webm, frame at 1.3 seconds, preserved alpha. Existing approved capture; no UI recreation.'
    if key=='video-studio':entry['additional_source']='media/range-whiteboard.jpg, complete Talkover workflow diagram'
    manifest['entries'].append(entry)

# Three actual project subjects introduce the range without disguising the poster as product UI.
svg='<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><title>Vyas Sathya selected work: Talkover, Kpop Sing and 3D asset repair</title><rect width="1920" height="1080" fill="#151b19"/>'
svg+=text('Vyas Sathya',90,115,58,'#f5f2e9')+text('Selected work',1370,115,36,'#afc4b5')
overview_sources=[]
for name,rect,x,y,w,h in [('thumbnails/source-panel.png',(0,0,1,1),70,190,1080,330),('asset-pipeline.jpg',(0,.08,1,1),70,570,1080,400),('kpop-sing.jpg',(.46,0,1,1),1200,180,650,800)]:
    data,box=image_data(ROOT/'media'/name,rect)
    overview_sources.append({'source':'media/'+name,'source_crop_pixels':box})
    svg+=f'<image x="{x}" y="{y}" width="{w}" height="{h}" href="{data}" preserveAspectRatio="xMidYMid meet"/>'
svg+='</svg>'
if not args.only:
    (OUT/'overview-player.svg').write_text(svg)
    manifest['overview']={'sources':overview_sources,'output':'thumbnails/overview-player.svg','dimensions':[1920,1080]}
(ROOT/'projects.json').write_text(json.dumps(PROJECTS,ensure_ascii=True,indent=2)+'\n')
(OUT/'provenance.json').write_text(json.dumps(manifest,ensure_ascii=True,indent=2)+'\n')
print(f'Composed {len(args.only) if args.only else len(PROJECTS)} projects x {len(SIZES)} variants.' + (' Retained overview poster.' if args.only else ' Updated overview poster.'))
