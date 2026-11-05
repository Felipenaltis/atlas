#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v blender >/dev/null
command -v python3 >/dev/null
command -v curl >/dev/null
asset_tmp=$(mktemp -d)
trap 'rm -rf "$asset_tmp"' EXIT
source_revision=a4811a204f87a99e757ede4cb0ddb49bbc1a03ff
source_base="https://raw.githubusercontent.com/Z-Anatomy/Models-of-human-anatomy/$source_revision"
curl --fail --show-error --location "$source_base/Z-Anatomy.zip" -o "$asset_tmp/Z-Anatomy.zip"
curl --fail --show-error --location "$source_base/TA2.csv" -o "$asset_tmp/TA2.csv"
(
  cd "$asset_tmp"
  sha256sum --check <<'CHECKSUMS'
e029688545627bd0214b269e1063143abb580aad72b2c2445d6d8a9a0d9da736  Z-Anatomy.zip
0f9092a328b27dcd15d696d9f9a4087deb229a1aad21b75876657622de835974  TA2.csv
CHECKSUMS
)
python3 - "$asset_tmp" <<'PY'
import sys,zipfile,pathlib
p=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(p/'Z-Anatomy.zip') as z:
    member='Z-Anatomy/Startup.blend'
    (p/'Startup.blend').write_bytes(z.read(member))
PY
python3 scripts/prepare-anatomy.py "$asset_tmp/TA2.csv"
blender -b -t 2 --python scripts/export-model.py -- "$asset_tmp/Startup.blend"
blender -b -t 2 --python scripts/export-systems.py -- "$asset_tmp/Startup.blend"
python3 scripts/translate-model-names.py
blender -b -t 2 --python scripts/export-definitions.py -- "$asset_tmp/Startup.blend"
node scripts/compress-models.mjs
node scripts/model-manifest.mjs
npm test
