"""Extract attributed, introductory English definitions from the source Blender texts.

blender -b -t 2 --python scripts/export-definitions.py -- /path/to/Startup.blend
Only introductions are included. Full articles remain linked to their original source.
"""
import bpy,json,pathlib,re,sys
root=pathlib.Path(__file__).resolve().parents[1]
entities=json.loads((root/'src/data/structures.json').read_text())
terms={t['id']:t for t in json.loads((root/'src/data/terms.json').read_text())}
with bpy.data.libraries.load(sys.argv[sys.argv.index('--')+1],link=False) as (src,dst):dst.texts=src.texts
texts={t.name:t.as_string() for t in dst.texts if t}
def norm(s):return re.sub(r'[^a-z0-9]','',s.lower())
normal={norm(k):v for k,v in texts.items()}
definitions={}
for e in entities:
    text=normal.get(norm(e['english'])) or normal.get(norm(terms.get(e['termId'],{}).get('en','')))
    if not text:continue
    links=re.findall(r'https://en\.wikipedia\.org/wiki/[^\s<>]+',text)
    intro=re.split(r'\n\s*==',text)[0].strip()
    parts=[p.strip() for p in intro.split('\n\n') if p.strip()]
    if parts and (parts[0].isupper() or len(parts[0])<65):parts=parts[1:]
    intro='\n\n'.join(parts)
    intro=re.sub(r'https?://\S+','',intro).strip()
    if not intro:continue
    if len(intro)>2200:intro=intro[:2200].rsplit('. ',1)[0]+'.'
    definitions[e['id']]={'text':intro,'url':links[-1] if links else None}
(root/'public/definitions.json').write_text(json.dumps(definitions,ensure_ascii=False,separators=(',',':'))+'\n')
print('Introductory source definitions:',len(definitions))
