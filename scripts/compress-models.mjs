import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, meshopt } from "@gltf-transform/functions";
import { MeshoptEncoder, MeshoptDecoder } from "meshoptimizer";
import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const io = new NodeIO()
  .registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({
    "meshopt.encoder": MeshoptEncoder,
    "meshopt.decoder": MeshoptDecoder,
  });
const entities = [
  ...JSON.parse(await readFile(path.join(root, "src/data/bones.json"), "utf8")),
  ...JSON.parse(
    await readFile(path.join(root, "src/data/structures.json"), "utf8"),
  ),
];
const byId = Object.fromEntries(entities.map((e) => [e.id, e]));
for (const name of [
  "skeleton",
  "muscular",
  "cardiovascular",
  "nervous",
  "visceral",
]) {
  const file = path.join(root, `public/models/${name}.glb`);
  const before = (await stat(file)).size;
  const document = await io.read(file);
  for (const node of document.getRoot().listNodes()) {
    const extras = node.getExtras();
    const entity = byId[extras.boneId || extras.entityId];
    if (entity)
      node.setExtras({ ...extras, nameEs: entity.name, latin: entity.latin });
  }
  // These source materials have no textures; unused UVs cost bandwidth only.
  for (const mesh of document.getRoot().listMeshes())
    for (const primitive of mesh.listPrimitives()) {
      for (const semantic of primitive.listSemantics())
        if (semantic.startsWith("TEXCOORD_") || semantic === "TANGENT")
          primitive.setAttribute(semantic, null);
    }
  // Meshopt retains topology and node metadata. Positions use 16-bit quantization.
  await document.transform(
    dedup(),
    meshopt({ encoder: MeshoptEncoder, level: "high" }),
  );
  await io.write(file, document);
  console.log(
    `${name}: ${before.toLocaleString()} → ${(await stat(file)).size.toLocaleString()} bytes`,
  );
}
