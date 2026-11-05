"""Resolve spelling aliases and explicitly translate additional upstream mesh labels.

Source-specific labels do not receive invented TA2 IDs or Latin equivalents.
Run after export-systems.py; inspect aliases separately from descriptive translations.
"""
import json,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
terms=json.loads((root/'src/data/terms.json').read_text())
by_english={t['en']:t for t in terms}
aliases=json.loads((root/'scripts/terminology-aliases.json').read_text())
translations={
 '?x':'Vaso sin identificar en la fuente (?x)',
 'Proximal lateral striate branches':'Ramas estriadas laterales proximales',
 'Distal lateral striate branches':'Ramas estriadas laterales distales',
 'Anterior temporal branch':'Rama temporal anterior',
 'Posterior temporal branch':'Rama temporal posterior',
 'Branch to angular gyrus':'Rama para el giro angular',
 'Temporo-occipital branch':'Rama temporo-occipital',
 'Prefrontal artery':'Arteria prefrontal',
 'Lateral frontobasal artery':'Arteria frontobasal lateral',
 'Posterior parietal artery':'Arteria parietal posterior',
 'Artery of central sulcus':'Arteria del surco central',
 'Artery of precentral sulcus':'Arteria del surco precentral',
 'Cingulate sulcus (Marginal part*)':'Surco cingulado (porción marginal)',
 'Anterior occipital sulcus*':'Surco occipital anterior',
 'Orbital gyri (Frontomarginal gyrus and sulcus*)':'Giros orbitarios (giro y surco frontomarginales)',
 'Paracentral gyrus and sulcus*':'Giro y surco paracentrales',
 'Orbital sulci (H-shaped orbital sulci*)':'Surcos orbitarios (surcos en H)',
 'Orbital sulci (Lateral Orbital sulcus*)':'Surcos orbitarios (surco orbitario lateral)',
 'Precentral sulcus (inferior part)*':'Surco precentral (porción inferior)',
 'Precentral sulcus (Superior part)*':'Surco precentral (porción superior)',
 'Inferior occipital gyrus and sulcus*':'Giro y surco occipitales inferiores',
 'Lateral occipital gyrus (Middle occipital gyrus*)':'Giro occipital lateral (giro occipital medio)',
 'Superior temporal gyrus (Lateral part)':'Giro temporal superior (porción lateral)',
 'Medial occipitotemporal gyrus (Parahippocampal*)':'Giro occipitotemporal medial (porción parahipocampal)',
 'Occipitotemporal sulcus (Lateral part*)':'Surco occipitotemporal (porción lateral)',
 'Insula (Subcentral gyrus and ant. and post. sulci*)':'Ínsula (giro subcentral y surcos anterior y posterior)',
 'Cingulate gyrus and sulcus (Middle anterior part)':'Giro y surco del cíngulo (porción media anterior)',
 'Cingulate gyrus and sulcus (Middle posterior part)':'Giro y surco del cíngulo (porción media posterior)',
 'Cingulate gyrus and sulcus (Posterior dorsal part)':'Giro y surco del cíngulo (porción posterior dorsal)',
 'Cingulate gyrus (Posteroventral part*)':'Giro del cíngulo (porción posteroventral)',
 ' Posterior transverse collateral sulcus':'Surco colateral transverso posterior',
 'Sulcus interm_prim-Jensen':'Surco intermedio primario (de Jensen)'
}
entities=json.loads((root/'src/data/structures.json').read_text())
for e in entities:
    if e['translated']:continue
    name=e['english']
    if name in aliases:
        t=by_english[aliases[name]]
        e.update(name=t['es'],latin=t['la'],termId=t['id'],translated=True,terminologyOrigin='source-alias')
    elif name in translations:
        e.update(name=translations[name],latin='',translated=True,terminologyOrigin='translated-mesh-label')
    else:raise ValueError('Unresolved source name: '+name)
(root/'src/data/structures.json').write_text(json.dumps(entities,ensure_ascii=False,separators=(',',':'))+'\n')
print('All',len(entities),'mesh labels have Spanish names. Source-specific labels without a Latin counterpart remain explicitly blank.')
