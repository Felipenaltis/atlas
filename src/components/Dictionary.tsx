import { useEffect, useMemo, useState } from "react";
import {
  Search,
  ArrowUpRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { bones, TERM_COUNT, normalize, type Term } from "../data/anatomy";
import Modal from "./Modal";
import { entities } from "../data/systems";

const categories = [
  { id: "all", name: "Todos los sistemas", min: 0, max: Infinity },
  { id: "bones", name: "Osteología", min: 352, max: 1514 },
  { id: "joints", name: "Artrología", min: 1515, max: 1973 },
  { id: "muscles", name: "Miología", min: 1974, max: 2772 },
  { id: "viscera", name: "Vísceras y glándulas", min: 2773, max: 3890 },
  { id: "vessels", name: "Sistema cardiovascular", min: 3891, max: 5149 },
  { id: "lymph", name: "Sistema linfoide", min: 5150, max: 5362 },
  {
    id: "nerves",
    name: "Sistema nervioso y sentidos",
    min: 5363,
    max: Infinity,
  },
];
export default function Dictionary({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [terms, setTerms] = useState<Term[]>([]),
    [error, setError] = useState(false);
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("all"),
    [page, setPage] = useState(0);
  useEffect(() => {
    import("../data/terms.json")
      .then((d) => setTerms(d.default))
      .catch(() => setError(true));
  }, []);
  const results = useMemo(() => {
    const cat = categories.find((c) => c.id === category)!;
    const tokens = normalize(query).split(/\s+/).filter(Boolean);
    return terms.filter(
      (t) =>
        t.sectionId >= cat.min &&
        t.sectionId <= cat.max &&
        tokens.every((token) =>
          normalize(`${t.es} ${t.la} ${t.en} ${t.id}`).includes(token),
        ),
    );
  }, [query, terms, category]);
  const pages = Math.max(1, Math.ceil(results.length / 35));
  return (
    <Modal
      title="Cada estructura tiene un nombre."
      eyebrow="DICCIONARIO ANATÓMICO"
      onClose={onClose}
      wide
    >
      <p className="modal-lead">
        {TERM_COUNT} términos de la tabla TA2 de Z-Anatomy. Consulta huesos,
        accidentes óseos, músculos, órganos, vasos y nervios en español, latín o
        inglés.
      </p>
      <div className="dictionary-filters">
        <label className="search-field">
          <Search size={18} />
          <input
            autoFocus
            aria-label="Buscar término anatómico"
            placeholder="Prueba «foramen», «corazón» o «nervus»…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <select
          aria-label="Filtrar diccionario por sistema"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(0);
          }}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="dictionary-meta">
        <span>
          {terms.length
            ? `${results.length.toLocaleString("es-ES")} términos`
            : error
              ? "No se ha podido cargar el diccionario"
              : "Cargando diccionario…"}
        </span>
        <span>ESPAÑOL / LATÍN / INGLÉS</span>
      </div>
      <div className="dictionary-results">
        {results.slice(page * 35, (page + 1) * 35).map((term) => {
          const bone = entities.find(
            (b) =>
              b.termId === term.id ||
              normalize(b.english) === normalize(term.en),
          );
          return (
            <article key={term.id} className="term-row">
              <span className="term-id">
                {term.id.startsWith("source-")
                  ? "S/ID"
                  : term.id.padStart(4, "0")}
              </span>
              <div>
                <h3>{term.es || term.en}</h3>
                <p>{term.la}</p>
                <span>
                  {term.en}
                  {!term.es && " · Sin traducción española en la fuente"}
                </span>
              </div>
              {bone && (
                <button
                  className="text-button"
                  onClick={() => {
                    onSelect(bone.id);
                    onClose();
                  }}
                >
                  Ver en 3D <ArrowUpRight size={16} />
                </button>
              )}
            </article>
          );
        })}
        {terms.length > 0 && !results.length && (
          <div className="empty-state">
            <BookOpen size={30} />
            <h3>No hay coincidencias</h3>
            <p>Prueba otro término en español, latín o inglés.</p>
          </div>
        )}
      </div>
      <div className="pagination">
        <button
          className="icon-button"
          disabled={page === 0}
          aria-label="Página anterior"
          onClick={() => setPage((p) => p - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <span>
          Página {page + 1} de {pages}
        </span>
        <button
          className="icon-button"
          disabled={page + 1 >= pages}
          aria-label="Página siguiente"
          onClick={() => setPage((p) => p + 1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <p className="source-note">
        La terminología procede de una traducción comunitaria y puede contener
        variantes. «Ver en 3D» indica que hay una estructura correspondiente en
        uno de los cinco modelos disponibles.
      </p>
    </Modal>
  );
}
