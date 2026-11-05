import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  bones,
  boneById,
  boneName,
  loadProgress,
  regions,
  searchBones,
} from "./anatomy";
import terms from "./terms.json";
import metadata from "./metadata.json";
import { entities, structuresFor, systems } from "./systems";

describe("adult osteology catalogue", () => {
  it("has exactly 206 unique bones, 80 axial and 126 appendicular", () => {
    expect(bones).toHaveLength(206);
    expect(new Set(bones.map((b) => b.id)).size).toBe(206);
    expect(bones.filter((b) => b.division === "axial")).toHaveLength(80);
    expect(bones.filter((b) => b.division === "appendicular")).toHaveLength(
      126,
    );
    for (const region of regions)
      expect(bones.filter((b) => b.region === region.id)).toHaveLength(
        region.count,
      );
  });
  it("counts fused adult bones once and omits variable sesamoids and teeth", () => {
    for (const name of ["sternum", "sacrum", "coccyx"])
      expect(bones.filter((b) => b.id === name)).toHaveLength(1);
    expect(
      bones.filter((b) => /^(malleus|incus|stapes)-/.test(b.id)),
    ).toHaveLength(6);
    expect(bones.filter((b) => b.id.includes("phalanx"))).toHaveLength(56);
    expect(bones.some((b) => /tooth|sesamoid/.test(b.id))).toBe(false);
  });
  it("preserves anatomical laterality and names for every bone", () => {
    for (const bone of bones) {
      expect(bone.name.length).toBeGreaterThan(2);
      expect(bone.latin.length).toBeGreaterThan(2);
      if (bone.side) {
        const opposite =
          boneById[bone.id.slice(0, -1) + (bone.side === "l" ? "r" : "l")];
        expect(opposite).toBeDefined();
        expect(opposite.region).toBe(bone.region);
      }
    }
    expect(boneName(boneById["femur-l"])).toBe("Fémur izquierdo");
    expect(boneName(boneById["tibia-r"])).toBe("Tibia derecha");
    expect(boneName(boneById["femur-l"], "la")).toBe("Femur sinistrum");
  });
  it("searches accents, Latin, synonyms, laterality and landmarks", () => {
    expect(searchBones("femur izquierdo").map((b) => b.id)).toEqual([
      "femur-l",
    ]);
    expect(searchBones("cúbito")).toHaveLength(2);
    expect(searchBones("trocanter mayor")).toHaveLength(2);
    expect(searchBones("Os coxae")).toHaveLength(2);
    expect(searchBones("femur", "hand")).toHaveLength(0);
  });
});

describe("real 3D model coverage", () => {
  it("maps all 206 catalogue entries to actual meshes without duplicates", () => {
    const glb = readFileSync(
      new URL("../../public/models/skeleton.glb", import.meta.url),
    );
    expect(glb.toString("ascii", 0, 4)).toBe("glTF");
    expect(glb.readUInt32LE(4)).toBe(2);
    const json = JSON.parse(
      glb.toString("utf8", 20, 20 + glb.readUInt32LE(12)),
    );
    const mapped = json.nodes.filter(
      (node: { extras?: { boneId: string } }) => node.extras?.boneId,
    );
    expect(mapped).toHaveLength(206);
    expect(
      mapped.map((n: { extras: { boneId: string } }) => n.extras.boneId).sort(),
    ).toEqual(bones.map((b) => b.id).sort());
    for (const node of mapped) {
      expect(node.mesh).toBeTypeOf("number");
      expect(json.meshes[node.mesh].primitives.length).toBeGreaterThan(0);
    }
    expect(
      json.nodes.filter(
        (n: { extras?: { decorative: boolean } }) => n.extras?.decorative,
      ),
    ).toHaveLength(28);
  });
  it("maps the other four systems to 2342 distinct, named mesh structures", () => {
    expect(entities).toHaveLength(2548);
    expect(new Set(entities.map((e) => e.id)).size).toBe(entities.length);
    for (const system of systems.filter((s) => s.id !== "skeletal")) {
      const glb = readFileSync(
        new URL(`../../public/models/${system.file}.glb`, import.meta.url),
      );
      const json = JSON.parse(
        glb.toString("utf8", 20, 20 + glb.readUInt32LE(12)),
      );
      const ids = json.nodes
        .filter((n: { extras?: { entityId?: string } }) => n.extras?.entityId)
        .map((n: { extras: { entityId: string } }) => n.extras.entityId);
      expect(ids.sort()).toEqual(
        structuresFor(system.id)
          .map((e) => e.id)
          .sort(),
      );
      for (const node of json.nodes.filter(
        (n: { extras?: { entityId?: string } }) => n.extras?.entityId,
      )) {
        expect(node.mesh, node.extras.entityId).toBeTypeOf("number");
        expect(json.meshes[node.mesh].primitives.length).toBeGreaterThan(0);
      }
      expect(json.extensionsRequired).toContain("EXT_meshopt_compression");
      for (const entity of structuresFor(system.id)) {
        expect(entity.name).not.toBe("");
        expect(entity.translated).toBe(true);
      }
    }
  });
});

describe("complete source terminology and persisted progress", () => {
  it("retains all 7298 nonempty source rows, including extended and unnumbered source identifiers", () => {
    expect(terms).toHaveLength(metadata.termCount);
    expect(terms).toHaveLength(7298);
    expect(new Set(terms.map((t) => t.id)).size).toBe(terms.length);
    expect(terms.some((t) => t.id === "906*11")).toBe(true);
    expect(terms.some((t) => t.id.startsWith("source-"))).toBe(true);
    for (const t of terms) {
      expect(t.en).not.toBe("");
      expect(t.la).not.toBe("");
    }
  });
  it("safely ignores malformed and stale local progress", () => {
    vi.stubGlobal("localStorage", { getItem: () => "broken json" });
    expect(loadProgress()).toEqual([]);
    vi.stubGlobal("localStorage", {
      getItem: () => '["femur-l","not-a-bone",23]',
    });
    expect(loadProgress()).toEqual(["femur-l"]);
    vi.unstubAllGlobals();
  });
});
