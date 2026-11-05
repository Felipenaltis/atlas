import catalogue from "./bones.json";
import metadata from "./metadata.json";

export type Region =
  | "skull"
  | "spine"
  | "thorax"
  | "shoulder"
  | "arm"
  | "hand"
  | "pelvis"
  | "leg"
  | "foot";
export type Bone = Omit<
  (typeof catalogue)[number],
  "region" | "side" | "division"
> & {
  region: Region;
  side: "l" | "r" | null;
  division: "axial" | "appendicular";
};
export type Language = "es" | "la";
export type Term = {
  id: string;
  sectionId: number;
  es: string;
  la: string;
  en: string;
};
export const TERM_COUNT = metadata.termCount.toLocaleString("es-ES");
export const bones = catalogue as Bone[];
export const boneById = Object.fromEntries(
  bones.map((b) => [b.id, b]),
) as Record<string, Bone>;
export const regions: {
  id: Region;
  name: string;
  subtitle: string;
  count: number;
}[] = [
  {
    id: "skull",
    name: "Cabeza y cuello",
    subtitle: "Cráneo, cara, oído e hioides",
    count: 29,
  },
  {
    id: "spine",
    name: "Columna vertebral",
    subtitle: "Cervical, torácica, lumbar y sacra",
    count: 26,
  },
  {
    id: "thorax",
    name: "Caja torácica",
    subtitle: "Costillas y esternón",
    count: 25,
  },
  {
    id: "shoulder",
    name: "Cintura escapular",
    subtitle: "Clavículas y escápulas",
    count: 4,
  },
  {
    id: "arm",
    name: "Brazos y antebrazos",
    subtitle: "Húmeros, radios y ulnas",
    count: 6,
  },
  {
    id: "hand",
    name: "Manos",
    subtitle: "Carpo, metacarpo y falanges",
    count: 54,
  },
  { id: "pelvis", name: "Cintura pélvica", subtitle: "Coxales", count: 2 },
  {
    id: "leg",
    name: "Muslos y piernas",
    subtitle: "Fémures, rótulas, tibias y fíbulas",
    count: 8,
  },
  {
    id: "foot",
    name: "Pies",
    subtitle: "Tarso, metatarso y falanges",
    count: 52,
  },
];

export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
export function boneName(
  bone: Pick<Bone, "id" | "name" | "latin" | "side"> & {
    region: string;
    division?: string;
  },
  lang: Language = "es",
) {
  if (lang === "la")
    return bone.latin ? bone.latin.replace(" · ", " ") : bone.name;
  if (!bone.side) return bone.name;
  if (bone.division === "systemic")
    return `${bone.name} · lado ${bone.side === "l" ? "izquierdo" : "derecho"}`;
  const feminine = [
    "Clavícula",
    "Escápula",
    "Ulna",
    "Costilla",
    "Concha",
    "Mandíbula",
    "Rótula",
    "Tibia",
    "Fíbula",
    "Falange",
  ].some((n) => bone.name.startsWith(n));
  const suffix =
    bone.side === "l"
      ? feminine
        ? "izquierda"
        : "izquierdo"
      : feminine
        ? "derecha"
        : "derecho";
  if (bone.id.includes("phalanx"))
    return `${bone.name} · ${bone.region === "hand" ? "mano" : "pie"} ${bone.side === "l" ? (bone.region === "hand" ? "izquierda" : "izquierdo") : bone.region === "hand" ? "derecha" : "derecho"}`;
  return `${bone.name} ${suffix}`;
}
export function searchBones(query: string, region: Region | "all" = "all") {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  return bones.filter(
    (b) =>
      (region === "all" || b.region === region) &&
      tokens.every((t) =>
        normalize(
          `${boneName(b)} ${b.latin} ${b.english} ${b.id} ${b.landmarks.join(" ")}`,
        ).includes(t),
      ),
  );
}
export function loadProgress(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem("atlas:learned") || "[]");
    return Array.isArray(value)
      ? value.filter((id: unknown) => typeof id === "string" && boneById[id])
      : [];
  } catch {
    return [];
  }
}
export function saveProgress(ids: string[]) {
  try {
    localStorage.setItem("atlas:learned", JSON.stringify(ids));
  } catch {
    /* Storage can be unavailable in private contexts. */
  }
}
