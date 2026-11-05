import extraStructures from "./structures.json";
import { bones, normalize, type Bone, type Region } from "./anatomy";

export type System =
  | "skeletal"
  | "muscular"
  | "cardiovascular"
  | "nervous"
  | "visceral";
export type Entity = Omit<Bone, "region" | "division"> & {
  region: Region | "body";
  division: Bone["division"] | "systemic";
  system: System;
  termId?: string | null;
  translated?: boolean;
  terminologyOrigin?: string;
  definitionOriginal?: string;
  definitionSource?: string;
};
export const entities: Entity[] = [
  ...bones.map((b) => ({ ...b, system: "skeletal" as const })),
  ...(extraStructures as Entity[]),
];
export const entityById = Object.fromEntries(
  entities.map((e) => [e.id, e]),
) as Record<string, Entity>;
export const systems: {
  id: System;
  name: string;
  chapter: string;
  title: string;
  subtitle: string;
  file: string;
  defaultId: string;
  color: string;
}[] = [
  {
    id: "skeletal",
    name: "Sistema esquelético",
    chapter: "01 / OSTEOLOGÍA",
    title: "Una estructura extraordinaria.",
    subtitle: "206 piezas. Un universo de conexiones.",
    file: "skeleton",
    defaultId: "femur-l",
    color: "#b7cd9f",
  },
  {
    id: "muscular",
    name: "Sistema muscular",
    chapter: "02 / MIOLOGÍA",
    title: "El movimiento toma forma.",
    subtitle: "Cada fibra, una nueva posibilidad.",
    file: "muscular",
    defaultId: "muscular-sartorius-muscle-l",
    color: "#c39480",
  },
  {
    id: "cardiovascular",
    name: "Sistema cardiovascular",
    chapter: "03 / ANGIOLOGÍA",
    title: "La vida encuentra su camino.",
    subtitle: "Explora el corazón, las arterias y las venas.",
    file: "cardiovascular",
    defaultId: "cardiovascular-left-ventricle",
    color: "#b8848d",
  },
  {
    id: "nervous",
    name: "Sistema nervioso",
    chapter: "04 / NEUROANATOMÍA",
    title: "Un mundo de conexiones.",
    subtitle: "Del encéfalo a los nervios periféricos.",
    file: "nervous",
    defaultId: "nervous-median-nerve-l",
    color: "#d3c184",
  },
  {
    id: "visceral",
    name: "Órganos y vísceras",
    chapter: "05 / ESPLACNOLOGÍA",
    title: "El equilibrio está en el interior.",
    subtitle: "Explora las estructuras de los sistemas viscerales.",
    file: "visceral",
    defaultId: "visceral-stomach",
    color: "#bca090",
  },
];
export function structuresFor(system: System) {
  return entities.filter((e) => e.system === system);
}
export function searchEntities(query: string, system?: System) {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  return entities.filter(
    (e) =>
      (!system || e.system === system) &&
      tokens.every((t) =>
        normalize(
          `${e.name} ${e.latin} ${e.english} ${e.id} ${e.side === "l" ? "izquierdo izquierda sinister sinistra" : e.side === "r" ? "derecho derecha dexter dextra" : ""} ${e.landmarks.join(" ")}`,
        ).includes(t),
      ),
  );
}
export function defaultStructure(system: System) {
  const config = systems.find((s) => s.id === system)!;
  return entityById[config.defaultId] || structuresFor(system)[0];
}
