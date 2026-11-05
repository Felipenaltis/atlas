import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const models = [];
for (const name of [
  "skeleton",
  "muscular",
  "cardiovascular",
  "nervous",
  "visceral",
]) {
  const bytes = await readFile(path.join(root, `public/models/${name}.glb`));
  const document = JSON.parse(
    bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)),
  );
  const structures = document.nodes.filter(
    (n) => n.extras?.boneId || n.extras?.entityId,
  );
  for (const node of structures)
    if (node.mesh === undefined) throw Error(`Missing mesh: ${node.name}`);
  models.push({
    file: `${name}.glb`,
    structures: structures.length,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
}
await writeFile(
  path.join(root, "public/models/manifest.json"),
  JSON.stringify(
    {
      source: "Z-Anatomy / BodyParts3D",
      sourceRevision: "a4811a204f87a99e757ede4cb0ddb49bbc1a03ff",
      compression: "EXT_meshopt_compression",
      totalStructures: models.reduce(
        (total, model) => total + model.structures,
        0,
      ),
      models,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  models
    .map(
      (m) =>
        `${m.file}: ${m.structures} structures, ${(m.bytes / 1024 / 1024).toFixed(2)} MiB`,
    )
    .join("\n"),
);
