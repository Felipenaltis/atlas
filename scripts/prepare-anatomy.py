"""Build the adult 206-bone catalogue and the attributed Z-Anatomy terminology.

Usage: python3 scripts/prepare-anatomy.py /path/to/TA2.csv
Geometry source names deliberately remain explicit: export-model.py checks every one.
"""
import csv
import hashlib
import io
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/data'
OUT.mkdir(exist_ok=True)
bones = []

def add(id, es, latin, en, region, kind, description, landmarks, articulations, side=None, sources=None):
    bones.append(dict(id=id, name=es, latin=latin, english=en, region=region, kind=kind,
        description=description, landmarks=landmarks.split('|'), articulations=articulations.split('|'),
        side=side, division='axial' if region in ['skull','spine','thorax'] else 'appendicular',
        sources=sources or [en]))

def pair(id, es, latin, en, region, kind, description, landmarks, articulations):
    feminine = latin.startswith(('Clavicula','Scapula','Ulna','Maxilla','Concha','Incus','Costa','Phalanx','Patella','Tibia','Fibula'))
    neuter = latin.startswith('Os ') or latin == 'Femur'
    for side, suffix, latin_side in [('r','derecho','dextra' if feminine else 'dextrum' if neuter else 'dexter'),('l','izquierdo','sinistra' if feminine else 'sinistrum' if neuter else 'sinister')]:
        # Bone names in Spanish have grammatical gender; the laterality is explicit and independent.
        add(f'{id}-{side}', es, f'{latin} · {latin_side}', en, region, kind, description,
            landmarks, articulations, side, [f'{en}.{side}'])

skull = [
 ('frontal','Frontal','Os frontale','Frontal bone','plano','Forma la frente, el techo de las órbitas y parte de la fosa craneal anterior.','Escama frontal|Glabela|Borde supraorbitario|Seno frontal|Porción orbitaria','Parietales|Esfenoides|Etmoides|Nasales|Maxilares|Lagrimales|Cigomáticos',False),
 ('parietal','Parietal','Os parietale','Parietal bone','plano','Constituye la parte superior y lateral de la bóveda craneal.','Eminencia parietal|Línea temporal superior|Surco del seno sagital superior|Foramen parietal','Frontal|Occipital|Temporal|Esfenoides|Parietal contralateral',True),
 ('temporal','Temporal','Os temporale','Temporal bone','irregular','Forma parte de la base y de la pared lateral del cráneo. Aloja los órganos de la audición y del equilibrio.','Porción petrosa|Apófisis mastoides|Apófisis estiloides|Meato acústico externo|Fosa mandibular|Apófisis cigomática','Parietal|Occipital|Esfenoides|Cigomático|Mandíbula',True),
 ('occipital','Occipital','Os occipitale','Occipital bone','plano','Forma la región posterior e inferior del cráneo y rodea el foramen magno.','Foramen magno|Cóndilos occipitales|Protuberancia occipital externa|Líneas nucales|Porción basilar','Parietales|Temporales|Esfenoides|Atlas',False),
 ('sphenoid','Esfenoides','Os sphenoidale','Sphenoid bone','irregular','Hueso central de la base craneal que participa en las órbitas y conecta múltiples huesos del cráneo.','Silla turca|Cuerpo|Alas mayores|Alas menores|Apófisis pterigoides|Conducto óptico|Foramen oval|Foramen espinoso','Frontal|Parietales|Temporales|Occipital|Etmoides|Cigomáticos|Palatinos|Vómer',False),
 ('ethmoid','Etmoides','Os ethmoidale','Ethmoid bone','irregular','Participa en la cavidad nasal, el tabique nasal y la pared medial de la órbita.','Lámina cribosa|Crista galli|Lámina perpendicular|Laberinto etmoidal|Concha nasal superior|Concha nasal media','Frontal|Esfenoides|Vómer|Nasales|Maxilares|Lagrimales|Palatinos|Conchas nasales inferiores',False),
 ('nasal','Nasal','Os nasale','Nasal bone','plano','Constituye el puente óseo de la nariz.','Borde superior|Cara externa|Surco etmoidal','Frontal|Etmoides|Maxilar|Nasal contralateral',True),
 ('lacrimal','Lagrimal','Os lacrimale','Lacrimal bone','plano','Pequeño hueso de la pared medial de la órbita, relacionado con el drenaje de las lágrimas.','Cresta lagrimal posterior|Surco lagrimal|Gancho lagrimal','Frontal|Etmoides|Maxilar|Concha nasal inferior',True),
 ('zygomatic','Cigomático','Os zygomaticum','Zygomatic bone','irregular','Forma la prominencia de la mejilla y parte de la órbita y del arco cigomático.','Apófisis temporal|Apófisis frontal|Foramen cigomaticofacial|Cara orbitaria','Frontal|Temporal|Esfenoides|Maxilar',True),
 ('maxilla','Maxilar','Maxilla','Maxilla','irregular','Sostiene los dientes superiores y forma parte del paladar duro, las órbitas y la cavidad nasal.','Seno maxilar|Apófisis alveolar|Apófisis palatina|Foramen infraorbitario|Apófisis frontal','Frontal|Etmoides|Nasal|Lagrimal|Cigomático|Palatino|Concha nasal inferior|Vómer|Maxilar contralateral',True),
 ('palatine','Palatino','Os palatinum','Palatine bone','irregular','Forma la porción posterior del paladar duro y participa en las cavidades nasal y orbitaria.','Lámina horizontal|Lámina perpendicular|Apófisis piramidal|Foramen palatino mayor','Maxilar|Esfenoides|Etmoides|Vómer|Concha nasal inferior|Palatino contralateral',True),
 ('concha','Concha nasal inferior','Concha nasalis inferior','Inferior nasal concha bone','irregular','Lámina ósea curva de la pared lateral nasal que ayuda a acondicionar el aire inspirado.','Apófisis lagrimal|Apófisis etmoidal|Apófisis maxilar','Maxilar|Lagrimal|Etmoides|Palatino',True),
 ('vomer','Vómer','Vomer','Vomer','plano','Constituye la parte posteroinferior del tabique nasal óseo.','Alas del vómer|Surco nasopalatino|Borde inferior','Esfenoides|Etmoides|Maxilares|Palatinos',False),
 ('mandible','Mandíbula','Mandibula','Mandible','irregular','Hueso móvil de la cara que sostiene los dientes inferiores y participa en la masticación.','Cuerpo|Rama|Ángulo mandibular|Apófisis condilar|Apófisis coronoides|Foramen mentoniano|Foramen mandibular','Temporales, mediante las articulaciones temporomandibulares',False),
 ('hyoid','Hioides','Os hyoideum','Hyoid bone','irregular','Hueso suspendido en el cuello que sostiene la lengua y sirve de inserción a músculos de la deglución.','Cuerpo|Astas mayores|Astas menores','No se articula directamente con otros huesos',False),
 ('malleus','Martillo','Malleus','Malleus','irregular','Huesecillo del oído medio unido a la membrana timpánica; transmite las vibraciones al yunque.','Cabeza|Cuello|Manubrio|Apófisis anterior|Apófisis lateral','Yunque',True),
 ('incus','Yunque','Incus','Incus','irregular','Huesecillo del oído medio situado entre el martillo y el estribo.','Cuerpo|Rama corta|Rama larga|Apófisis lenticular','Martillo|Estribo',True),
 ('stapes','Estribo','Stapes','Stapes','irregular','Transmite las vibraciones del oído medio hacia la ventana vestibular del oído interno.','Cabeza|Rama anterior|Rama posterior|Base del estribo','Yunque|Ventana vestibular mediante el ligamento anular',True),
]
for id,es,la,en,kind,desc,land,art,bilateral in skull:
    (pair if bilateral else add)(id,es,la,en,'skull',kind,desc,land,art)

for group, count, es, latin in [('C',7,'cervical','cervicalis'),('T',12,'torácica','thoracica'),('L',5,'lumbar','lumbalis')]:
    for n in range(1,count+1):
        en = 'Atlas (C1)' if group=='C' and n==1 else 'Axis (C2)' if group=='C' and n==2 else f'Vertebra {group}{n}'
        name = 'Atlas · C1' if en=='Atlas (C1)' else 'Axis · C2' if en=='Axis (C2)' else f'Vértebra {es} · {group}{n}'
        land = 'Arco anterior|Arco posterior|Masas laterales|Fóvea del diente' if n==1 and group=='C' else 'Diente del axis|Cuerpo|Apófisis espinosa|Apófisis transversas' if n==2 and group=='C' else 'Cuerpo vertebral|Arco vertebral|Pedículos|Láminas|Apófisis espinosa|Apófisis transversas|Apófisis articulares|Foramen vertebral'
        desc = {'C':'Sostiene y moviliza la cabeza. Las vértebras cervicales presentan forámenes transversos; C1 y C2 tienen una morfología especializada.','T':'Participa en la pared posterior del tórax y en la articulación de las costillas.','L':'Vértebra de gran cuerpo que soporta peso y permite el movimiento de la región lumbar.'}[group]
        add(f'vertebra-{group.lower()}{n}',name,f'Vertebra {latin} {n}',en,'spine','irregular',desc,land,'Vértebras adyacentes'+('|Costillas correspondientes' if group=='T' else '')+('|Occipital' if group=='C' and n==1 else ''))
add('sacrum','Sacro','Os sacrum','Sacrum','spine','irregular','Resultado de la fusión habitual de cinco vértebras sacras. Transmite el peso de la columna a la cintura pélvica.','Promontorio|Alas del sacro|Forámenes sacros|Conducto sacro|Hiato sacro|Cresta sacra mediana','L5|Coxales|Cóccix')
add('coccyx','Cóccix','Os coccygis','Coccyx','spine','irregular','Segmento terminal de la columna, formado habitualmente por tres a cinco vértebras fusionadas. Se cuenta como un hueso en el adulto.','Base|Vértice|Astas coccígeas','Sacro')

ordinals=['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth','Eleventh','Twelfth']
for n in range(1,13):
    desc = 'Costilla verdadera: conecta con el esternón a través de su propio cartílago costal.' if n<=7 else 'Costilla falsa: su cartílago se une al cartílago de la costilla superior.' if n<=10 else 'Costilla flotante: su extremo anterior no se une al esternón.'
    landmarks = 'Cabeza|Cuello|Tubérculo|Ángulo|Cuerpo|Surco costal'
    if n==1:landmarks='Cabeza|Cuello|Tubérculo|Tubérculo del músculo escaleno anterior|Surco de la vena subclavia|Surco de la arteria subclavia'
    elif n==2:landmarks+='|Tuberosidad del músculo serrato anterior'
    elif n==11:landmarks='Cabeza|Cuerpo|Ángulo poco marcado|Surco costal poco marcado'
    elif n==12:landmarks='Cabeza|Cuerpo|Extremo anterior'
    pair(f'rib-{n}',f'Costilla {n}',f'Costa {n}',f'{ordinals[n-1]} rib','thorax','plano',desc,landmarks,'Vértebras torácicas'+('|Esternón mediante cartílago costal' if n<=7 else ''))
add('sternum','Esternón','Sternum','Sternum','thorax','plano','Hueso anterior del tórax que protege estructuras mediastínicas. El recuento convencional adulto lo considera un solo hueso.','Manubrio|Cuerpo|Apófisis xifoides|Ángulo esternal|Incisura yugular|Incisuras claviculares','Clavículas|Cartílagos de las siete primeras costillas',sources=['Manubrium of sternum','Body of sternum','Xiphoid process'])

upper=[
 ('clavicle','Clavícula','Clavicula','Clavicle','shoulder','largo','Conecta el miembro superior con el esqueleto axial y mantiene el hombro separado del tórax.','Extremo esternal|Extremo acromial|Tubérculo conoideo|Línea trapezoidea|Surco del músculo subclavio','Esternón|Escápula'),
 ('scapula','Escápula','Scapula','Scapula','shoulder','plano','Hueso triangular posterior del hombro que proporciona la cavidad articular para el húmero.','Espina|Acromion|Apófisis coracoides|Cavidad glenoidea|Fosa supraespinosa|Fosa infraespinosa|Fosa subescapular|Ángulo inferior','Clavícula|Húmero'),
 ('humerus','Húmero','Humerus','Humerus','arm','largo','Hueso del brazo. Une el hombro con el codo y actúa como palanca para los músculos del miembro superior.','Cabeza|Cuello anatómico|Cuello quirúrgico|Tubérculo mayor|Tubérculo menor|Surco intertubercular|Tuberosidad deltoidea|Tróclea|Capítulo|Epicóndilos|Fosa olecraniana','Escápula|Radio|Ulna'),
 ('radius','Radio','Radius','Radius','arm','largo','Hueso lateral del antebrazo en posición anatómica. Gira alrededor de la ulna durante la pronación y la supinación.','Cabeza|Cuello|Tuberosidad del radio|Apófisis estiloides|Incisura ulnar|Tubérculo dorsal','Húmero|Ulna|Escafoides|Semilunar'),
 ('ulna','Ulna (cúbito)','Ulna','Ulna','arm','largo','Hueso medial del antebrazo en posición anatómica. El olécranon forma la prominencia posterior del codo.','Olécranon|Apófisis coronoides|Incisura troclear|Incisura radial|Tuberosidad de la ulna|Cabeza|Apófisis estiloides','Húmero|Radio'),
]
for id,es,la,en,region,kind,desc,land,art in upper:pair(id,es,la,en,region,kind,desc,land,art)
carpals=[('scaphoid','Escafoides','Os scaphoideum','Scaphoid bone'),('lunate','Semilunar','Os lunatum','Lunate bone'),('triquetrum','Piramidal','Os triquetrum','Triquetrum bone'),('pisiform','Pisiforme','Os pisiforme','Pisiform bone'),('trapezium','Trapecio','Os trapezium','Trapezium bone'),('trapezoid','Trapezoide','Os trapezoideum','Trapezoid bone'),('capitate','Grande','Os capitatum','Capitate bone'),('hamate','Ganchoso','Os hamatum','Hamate bone')]
for id,es,la,en in carpals:pair(id,es,la,en,'hand','sesamoideo' if id=='pisiform' else 'corto','Uno de los ocho huesos del carpo. Participa en la estabilidad y la movilidad de la muñeca.','Caras articulares|Cara palmar|Cara dorsal','Huesos vecinos del carpo; relaciones específicas según su posición')
for n in range(1,6):pair(f'metacarpal-{n}',f'Metacarpiano {n}',f'Os metacarpale {n}',f'{ordinals[n-1]} metacarpal bone','hand','largo','Forma el armazón de la palma y conecta el carpo con las falanges.','Base|Cuerpo|Cabeza','Carpo|Falange proximal correspondiente'+('|Metacarpianos vecinos' if n>1 else ''))

pair('hip','Coxal','Os coxae','Hip bone','pelvis','irregular','Hueso formado por la fusión del ilion, isquion y pubis. Ambos coxales constituyen la cintura pélvica.','Ilion|Cresta ilíaca|Espinas ilíacas|Acetábulo|Foramen obturador|Isquion|Tuberosidad isquiática|Pubis|Superficie sinfisaria','Sacro|Fémur|Coxal contralateral mediante la sínfisis púbica')
lower=[
 ('femur','Fémur','Femur','Femur','largo','El hueso más largo y resistente del cuerpo humano. Forma el esqueleto del muslo y transmite el peso desde la cadera hasta la rodilla.','Cabeza femoral|Fóvea de la cabeza|Cuello femoral|Trocánter mayor|Trocánter menor|Línea intertrocantérica|Cresta intertrocantérica|Línea áspera|Cóndilo medial|Cóndilo lateral|Fosa intercondílea|Superficie patelar','Coxal|Tibia|Rótula'),
 ('patella','Rótula','Patella','Patella','sesamoideo','Hueso sesamoideo incluido en el tendón del cuádriceps. Protege la rodilla y aumenta la eficacia de la extensión.','Base|Vértice|Cara anterior|Cara articular posterior','Fémur'),
 ('tibia','Tibia','Tibia','Tibia','largo','Hueso medial de la pierna que soporta la mayor parte de la carga entre la rodilla y el tobillo.','Cóndilo medial|Cóndilo lateral|Eminencia intercondílea|Tuberosidad tibial|Borde anterior|Maléolo medial|Incisura fibular','Fémur|Fíbula|Talus'),
 ('fibula','Fíbula (peroné)','Fibula','Fibula','largo','Hueso lateral y delgado de la pierna. Sirve de inserción muscular y estabiliza la articulación del tobillo.','Cabeza|Cuello|Cuerpo|Maléolo lateral|Fosa maleolar','Tibia|Talus'),
]
for id,es,la,en,kind,desc,land,art in lower:pair(id,es,la,en,'leg',kind,desc,land,art)
tarsals=[('talus','Talus (astrágalo)','Talus','Talus','Tróclea|Cuello|Cabeza|Apófisis posterior','Tibia|Fíbula|Calcáneo|Navicular'),('calcaneus','Calcáneo','Calcaneus','Calcaneus','Tuberosidad del calcáneo|Sustentáculo del talus|Tróclea fibular','Talus|Cuboides'),('navicular','Navicular','Os naviculare','Navicular bone','Tuberosidad del navicular|Cara proximal|Caras distales','Talus|Cuneiformes'),('cuboid','Cuboides','Os cuboideum','Cuboid bone','Surco del tendón del fibular largo|Tuberosidad|Caras articulares','Calcáneo|Cuneiforme lateral|Metatarsianos 4 y 5'),('cuneiform-medial','Cuneiforme medial','Os cuneiforme mediale','Medial cuneiform bone','Base|Vértice|Caras articulares','Navicular|Cuneiforme intermedio|Metatarsianos 1 y 2'),('cuneiform-intermediate','Cuneiforme intermedio','Os cuneiforme intermedium','Intermediate cuneiform bone','Base|Vértice|Caras articulares','Navicular|Cuneiformes medial y lateral|Metatarsiano 2'),('cuneiform-lateral','Cuneiforme lateral','Os cuneiforme laterale','Lateral cuneiform bone','Base|Vértice|Caras articulares','Navicular|Cuboides|Cuneiforme intermedio|Metatarsianos 2, 3 y 4')]
for id,es,la,en,land,art in tarsals:pair(id,es,la,en,'foot','corto','Hueso del tarso que participa en la transmisión de cargas y en el mantenimiento de los arcos del pie.',land,art)
for n in range(1,6):pair(f'metatarsal-{n}',f'Metatarsiano {n}',f'Os metatarsale {n}',f'{ordinals[n-1]} metatarsal bone','foot','largo','Hueso del metatarso que conecta el tarso con los dedos y participa en el apoyo y la propulsión.','Base|Cuerpo|Cabeza'+('|Tuberosidad del quinto metatarsiano' if n==5 else ''),'Tarso|Falange proximal correspondiente|Metatarsianos vecinos')

for region,part,latin_part in [('hand','hand','manus'),('foot','foot','pedis')]:
    for n in range(1,6):
        for level,es,la in [('Proximal','proximal','proximalis'),('Middle','media','media'),('Distal','distal','distalis')]:
            if n==1 and level=='Middle':continue
            en=f'{level} phalanx of {ordinals[n-1].lower()} finger of {part}'
            pair(f'{region}-phalanx-{n}-{level.lower()}',f'Falange {es} · dedo {n}',f'Phalanx {la} digiti {n} {latin_part}',en,region,'largo',
                f'Falange {es} del dedo {n} '+('de la mano.' if region=='hand' else 'del pie.'),
                'Base|Cuerpo|Cabeza' if level!='Distal' else 'Base|Cuerpo|Tuberosidad de la falange distal',
                'Metacarpiano correspondiente|Falange siguiente' if level=='Proximal' and region=='hand' else 'Metatarsiano correspondiente|Falange siguiente' if level=='Proximal' else 'Falanges adyacentes' if level=='Middle' else 'Falange precedente')

assert len(bones)==206, len(bones)
assert len({b['id'] for b in bones})==206
(OUT/'bones.json').write_text(json.dumps(bones,ensure_ascii=False,indent=2)+'\n')

source=pathlib.Path(sys.argv[1])
rows=[]
last_section=0
for line_no,raw in enumerate(csv.reader(io.StringIO(source.read_text(encoding='utf-8-sig'))),1):
    if not raw:continue
    # Upstream quotes each whole semicolon-separated line.
    cells=';'.join(raw).split(';') if len(raw)>1 else raw[0].split(';')
    if len(cells)<5 or not cells[1].strip() or cells[0]=='TA2ID':continue
    source_id=cells[0].strip()
    if source_id:
        assert source_id.split('*')[0].isdigit(), source_id
        last_section=int(source_id.split('*')[0])
    rows.append({'id':source_id or f'source-{line_no}','sectionId':last_section,'en':cells[1].strip(),'la':cells[2].strip(),'es':cells[4].strip()})
assert len(rows)>7000
assert len({t['id'] for t in rows})==len(rows)
(OUT/'terms.json').write_text(json.dumps(rows,ensure_ascii=False,separators=(',',':'))+'\n')
(OUT/'metadata.json').write_text(json.dumps({'termCount':len(rows),'boneCount':len(bones),'sourceCommit':'a4811a204f87a99e757ede4cb0ddb49bbc1a03ff'},indent=2)+'\n')
print(f'Catalogue: {len(bones)} bones; dictionary: {len(rows)} terms')
print('TA2 source SHA256:',hashlib.file_digest(source.open('rb'),'sha256').hexdigest())
