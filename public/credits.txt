# Anatomical content and fonts

Application code is original and MIT licensed. Imported content retains its
original licenses; no new medical or clinical validation is claimed.

## Z-Anatomy

“Z-Anatomy — The libre 3D atlas of anatomy — CC-BY-SA 4.0”.

Source: https://github.com/Z-Anatomy/Models-of-human-anatomy

Source revision: `a4811a204f87a99e757ede4cb0ddb49bbc1a03ff`.

Authors include Gauthier Kervyn (design, 3D, anatomy), Marcin Zielinski
(Blender scripts), and Lluis Vinent (original Unity development). Spanish
translation of the anatomical structures: Carlos Torres Villar. Original
BodyParts3D model: Kousaku Okubo.

Z-Anatomy declares its shared content under Creative Commons
Attribution-ShareAlike 4.0 International:
https://creativecommons.org/licenses/by-sa/4.0/

Adaptations in this project: selected physical meshes exported from Blender to
glTF, large surfaces simplified, original procedural vessel and nerve curves
converted to surfaces, materials replaced for browser rendering, unused UVs
removed, meshes quantized and compressed with Meshopt. Model labels are linked
to the upstream terminology, with explicit spelling aliases and descriptive
Spanish translations for additional source-specific mesh labels. No missing
Latin names or TA2 IDs have been fabricated.

The derivatives in `public/models/` and `src/data/terms.json` retain the
upstream attribution/share-alike requirements. Anatomical names themselves
are factual terminology; the imported compilation remains attributed.

## BodyParts3D

“BodyParts3D — The Database Center for Life Science — CC-BY-SA 2.1 Japan”.

Original model: Kousaku Okubo. Source:
https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html

License: https://creativecommons.org/licenses/by-sa/2.1/jp/

## Other components attributed by the upstream model

Z-Anatomy's README additionally attributes the following included/adapted
models. Those components retain their individual terms; the blanket upstream
CC BY-SA notice does not erase noncommercial restrictions. In particular,
the visceral and nervous model collections must not be assumed commercially
reusable without checking component permissions.

- “Brainder” and “White matter” — University of Washington.
- “Cranial Nerves and Foramina” — University of Dundee, CAHID — CC BY 4.0.
- “Anatomy of the Inner Ear” — University of Dundee School of Medicine —
  CC BY-NC-SA 4.0.
- “Kidney” — Lissie Cowley — CC BY-NC 4.0.

Original attribution and license statement is preserved in
`public/models/Z-Anatomy-original-license.txt`. Consult the linked upstream
project for the original component sources. This application is intended for
noncommercial educational study of this content.

## Introductory definitions

`public/definitions.json` contains English introductory excerpts from text
blocks in the source Blender file. They are Wikipedia-derived content,
attributed by the upstream project under CC BY-SA 3.0. Individual article
links are retained alongside excerpts and displayed in the interface.

https://creativecommons.org/licenses/by-sa/3.0/

Adaptations: only introductory paragraphs are retained; Blender formatting
and source headings removed. Definitions are explicitly identified as the
original English text and are not presented as Spanish translations.

## Source integrity

- `Z-Anatomy.zip`: SHA-256
  `e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736`.
- `TA2.csv`: SHA-256
  `0f9092a328b27dcd15d696d9f9a4087deb229a1aad21b75876657622de835974`.

TLS verification and checksums remain enabled in asset regeneration.

## Fonts

Manrope — Mikhail Sharanda, Mirko Velimirovic and contributors.
Instrument Serif — Instrument and contributors.

Both are redistributed under the SIL Open Font License 1.1. Complete notices
are included in `public/fonts/Manrope-OFL.txt` and
`public/fonts/InstrumentSerif-OFL.txt`. Fonts are hosted locally; the application
does not require Google Fonts or any third-party CDN at runtime.
