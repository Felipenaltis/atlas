import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bone,
  BookOpen,
  Bookmark,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Crosshair,
  Expand,
  Eye,
  EyeOff,
  Footprints,
  Hand,
  Layers,
  ListFilter,
  Maximize2,
  Minus,
  MousePointer2,
  Move3D,
  Plus,
  RotateCcw,
  Rotate3D,
  Search,
  Share2,
  Skull,
  Sparkles,
  Tag,
  X,
} from "lucide-react";
import SkeletonViewer, {
  type ViewerHandle,
  type View,
} from "./components/SkeletonViewer";
import Dictionary from "./components/Dictionary";
import Modal from "./components/Modal";
import {
  entityById,
  systems,
  structuresFor,
  searchEntities,
  defaultStructure,
  type Entity,
  type System,
} from "./data/systems";
import {
  boneById,
  boneName,
  bones,
  loadProgress,
  regions,
  saveProgress,
  searchBones,
  TERM_COUNT,
  type Bone as BoneType,
  type Language,
  type Region,
} from "./data/anatomy";

const regionIcons: Record<Region, typeof Bone> = {
  skull: Skull,
  spine: Move3D,
  thorax: Layers,
  shoulder: Expand,
  arm: Bone,
  hand: Hand,
  pelvis: Layers,
  leg: Bone,
  foot: Footprints,
};
const initialBone = () => {
  const id = new URLSearchParams(window.location.hash.slice(1)).get("hueso");
  return id && entityById[id] ? id : "femur-l";
};
const readBookmarks = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem("atlas:bookmarks") || "[]");
    return Array.isArray(v)
      ? v.filter((id) => typeof id === "string" && entityById[id])
      : [];
  } catch {
    return [];
  }
};

export default function App() {
  const [selected, setSelected] = useState(initialBone),
    [region, setRegion] = useState<Region | "all">("all"),
    [expanded, setExpanded] = useState<Region | null>(null);
  const [query, setQuery] = useState(""),
    [language, setLanguage] = useState<Language>("es");
  const [mode, setMode] = useState<"explore" | "study">("explore"),
    [modal, setModal] = useState<
      "dictionary" | "help" | "progress" | "sources" | null
    >(null);
  const [isolate, setIsolate] = useState(false),
    [connective, setConnective] = useState(false),
    [ghost, setGhost] = useState(false),
    [labels, setLabels] = useState(true),
    [rotate, setRotate] = useState(false),
    [view, setView] = useState<View>("anterior");
  const [hidden, setHidden] = useState<string[]>([]),
    [learned, setLearned] = useState(loadProgress),
    [bookmarks, setBookmarks] = useState(readBookmarks),
    [collection, setCollection] = useState(false);
  const [ready, setReady] = useState(0),
    [toast, setToast] = useState(""),
    [mobileNav, setMobileNav] = useState(false),
    [mobileDetail, setMobileDetail] = useState(false);
  const [revealed, setRevealed] = useState(false),
    [studyIndex, setStudyIndex] = useState(0),
    [detailTab, setDetailTab] = useState<"overview" | "landmarks">("overview");
  const [studyRegion, setStudyRegion] = useState<Region | "all">("all");
  const viewer = useRef<ViewerHandle>(null),
    searchRef = useRef<HTMLInputElement>(null);
  const closeModal = useCallback(() => setModal(null), []);
  const bone = entityById[selected];
  const activeSystem = bone.system;
  const currentSystem = systems.find((s) => s.id === activeSystem)!;
  const currentStructures = useMemo(
    () => structuresFor(activeSystem),
    [activeSystem],
  );
  const results = useMemo(() => searchEntities(query), [query]);
  const studyDeck = useMemo(
    () =>
      bones.filter((b) => studyRegion === "all" || b.region === studyRegion),
    [studyRegion],
  );
  const displayName = boneName(bone, language);

  useEffect(() => {
    saveProgress(learned);
  }, [learned]);
  useEffect(() => {
    try {
      localStorage.setItem("atlas:bookmarks", JSON.stringify(bookmarks));
    } catch {
      /* Optional storage. */
    }
  }, [bookmarks]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 3600);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setMobileNav(true);
        searchRef.current?.focus();
      }
    };
    const onHash = () => {
      const id = new URLSearchParams(location.hash.slice(1)).get("hueso");
      if (id && entityById[id]) {
        setSelected(id);
        setRegion("all");
        setIsolate(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);
  const selectBone = useCallback((id: string) => {
    setSelected(id);
    setHidden((h) => h.filter((i) => i !== id));
    setDetailTab("overview");
    setMobileDetail(true);
  }, []);
  const reset = () => {
    setRegion("all");
    setIsolate(false);
    setGhost(false);
    setHidden([]);
    setRotate(false);
    setView("anterior");
    requestAnimationFrame(() => viewer.current?.view("anterior"));
  };
  const startStudy = () => {
    setMode("study");
    setStudyIndex(0);
    setSelected(studyDeck[0].id);
    setRevealed(false);
    setRegion("all");
    setHidden([]);
    setIsolate(true);
    setGhost(false);
    setRotate(false);
    setQuery("");
    setExpanded(null);
    setCollection(false);
    setMobileNav(false);
  };
  const endStudy = () => {
    setMode("explore");
    setIsolate(false);
    requestAnimationFrame(() => viewer.current?.reset());
  };
  const nextCard = (known: boolean) => {
    if (known)
      setLearned((ids) => (ids.includes(selected) ? ids : [...ids, selected]));
    const next = (studyIndex + 1) % studyDeck.length;
    if (next === 0)
      setToast("Has completado esta vuelta al mazo. ¡Sigue repasando!");
    setStudyIndex(next);
    setSelected(studyDeck[next].id);
    setRevealed(false);
  };
  const toggleLearned = () =>
    setLearned((ids) =>
      ids.includes(selected)
        ? ids.filter((id) => id !== selected)
        : [...ids, selected],
    );
  const toggleBookmark = () => {
    setBookmarks((ids) =>
      ids.includes(selected)
        ? ids.filter((id) => id !== selected)
        : [...ids, selected],
    );
  };
  const changeView = (next: View) => {
    setView(next);
    setRotate(false);
    viewer.current?.view(next);
  };
  const share = async () => {
    const url = new URL(location.href);
    url.hash = new URLSearchParams({ hueso: selected }).toString();
    history.replaceState(null, "", url);
    try {
      await navigator.clipboard.writeText(url.toString());
      setToast("Enlace a esta estructura copiado.");
    } catch {
      setToast(
        "El enlace está preparado en la barra de direcciones para copiarlo.",
      );
    }
  };
  const exportProgress = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            version: 1,
            date: new Date().toISOString(),
            learned,
            bookmarks,
            bones: learned.map((id) => ({
              id,
              name: boneName(boneById[id]),
              latin: boneById[id].latin,
            })),
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "atlas-mi-progreso.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const renderBoneRow = (b: Entity) => (
    <button
      key={b.id}
      className={`bone-row ${b.id === selected ? "active" : ""}`}
      onClick={() => {
        selectBone(b.id);
        setRegion(b.region === "body" ? "all" : b.region);
        setMobileNav(false);
      }}
    >
      <span className="bone-row-dot" />
      <span>{boneName(b, language)}</span>
      {learned.includes(b.id) ? (
        <Check size={13} />
      ) : (
        <ChevronRight size={13} />
      )}
    </button>
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        Saltar al atlas
      </a>
      <header className="app-header">
        <a
          className="brand"
          href="#"
          aria-label="Atlas, inicio"
          onClick={(e) => {
            e.preventDefault();
            reset();
            endStudy();
          }}
        >
          <span className="brand-mark">
            <span>A</span>
          </span>
          <span>
            atlas<span className="brand-dot">.</span>
          </span>
          <span className="brand-divider" />
          <span className="brand-caption">EL CUERPO, EN PERSPECTIVA</span>
        </a>
        <nav className="main-nav" aria-label="Navegación principal">
          <button
            className={mode === "explore" && !modal ? "active" : ""}
            onClick={endStudy}
          >
            Explorar
          </button>
          <button
            className={mode === "study" ? "active" : ""}
            onClick={startStudy}
          >
            Estudiar <span className="nav-badge">206</span>
          </button>
          <button
            className={modal === "dictionary" ? "active" : ""}
            onClick={() => setModal("dictionary")}
          >
            Diccionario <ArrowUpRight size={13} />
          </button>
        </nav>
        <div className="header-actions">
          <button className="help-button" onClick={() => setModal("help")}>
            <CircleHelp size={17} />
            <span>Guía rápida</span>
          </button>
          <span className="header-separator" />
          <button
            className="profile-button"
            onClick={() => setModal("progress")}
            aria-label="Ver mi progreso"
          >
            TU
          </button>
        </div>
      </header>

      <section className="page-heading">
        <div>
          <span className="eyebrow">
            <span className="status-dot" /> ATLAS ANATÓMICO INTERACTIVO
          </span>
          <h1>
            El conocimiento empieza <em>por dentro.</em>
          </h1>
        </div>
        <div className="heading-facts">
          <span>
            <strong>206</strong> huesos
          </span>
          <span className="fact-divider" />
          <span>
            <strong>3D</strong> en tiempo real
          </span>
          <span className="edition">
            EDICIÓN DE ESTUDIO <span>01</span>
          </span>
        </div>
      </section>

      <main
        id="workspace"
        className={`workspace ${mode === "study" ? "study-mode" : ""}`}
      >
        <aside
          className={`anatomy-sidebar ${mobileNav ? "mobile-open" : ""}`}
          aria-label="Navegador anatómico"
        >
          <div className="sidebar-header">
            <div>
              <span className="eyebrow">TU PUNTO DE PARTIDA</span>
              <h2>Explora el cuerpo</h2>
            </div>
            <button
              className="icon-button mobile-only"
              onClick={() => setMobileNav(false)}
              aria-label="Cerrar navegador"
            >
              <X size={18} />
            </button>
          </div>
          <label className="search-field sidebar-search">
            <Search size={16} />
            <input
              ref={searchRef}
              aria-label="Buscar estructura"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca cualquier estructura…"
            />
            {query ? (
              <button
                aria-label="Limpiar búsqueda"
                onClick={() => setQuery("")}
              >
                <X size={14} />
              </button>
            ) : (
              <kbd>⌘ K</kbd>
            )}
          </label>
          <div className="sidebar-tabs">
            <button
              className={!collection ? "active" : ""}
              onClick={() => setCollection(false)}
            >
              Anatomía
            </button>
            <button
              className={collection ? "active" : ""}
              onClick={() => setCollection(true)}
            >
              Mi colección <span>{bookmarks.length}</span>
            </button>
          </div>
          <label className="system-select">
            <Layers size={14} />
            <select
              aria-label="Sistema anatómico"
              value={activeSystem}
              onChange={(e) => {
                const id = e.target.value as System;
                setSelected(defaultStructure(id).id);
                setRegion("all");
                setExpanded(null);
                setQuery("");
                setCollection(false);
                setIsolate(false);
                setHidden([]);
                setGhost(false);
                setRotate(false);
                setMode("explore");
                setView("anterior");
                setDetailTab("overview");
              }}
            >
              {systems.map((system) => (
                <option key={system.id} value={system.id}>
                  {system.name}
                </option>
              ))}
            </select>
          </label>
          {activeSystem === "muscular" && (
            <button
              className="layer-toggle"
              aria-pressed={connective}
              onClick={() => setConnective((value) => !value)}
            >
              {connective ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>Fascias y vainas</span>
              <span>{connective ? "Visibles" : "Ocultas"}</span>
            </button>
          )}
          <div className="structure-list">
            {query ? (
              <>
                <div className="list-caption">
                  {results.length} coincidencias
                </div>
                {results.length ? (
                  results.map(renderBoneRow)
                ) : (
                  <div className="empty-state">
                    <Search size={24} />
                    <p>No encontramos esa estructura.</p>
                    <button
                      className="text-button"
                      onClick={() => setModal("dictionary")}
                    >
                      Buscar en el diccionario <ArrowUpRight size={14} />
                    </button>
                  </div>
                )}
              </>
            ) : collection ? (
              <>
                {bookmarks.length ? (
                  bookmarks.map((id) => renderBoneRow(entityById[id]))
                ) : (
                  <div className="empty-state">
                    <Bookmark size={25} />
                    <h3>Tu colección, a tu ritmo</h3>
                    <p>
                      Guarda una estructura con el marcador para volver a ella.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <button
                  className={`system-row ${region === "all" ? "active" : ""}`}
                  onClick={() => {
                    setRegion("all");
                    setExpanded(null);
                    setIsolate(false);
                    requestAnimationFrame(() => viewer.current?.reset());
                  }}
                >
                  <span className="system-icon">
                    <Bone size={19} />
                  </span>
                  <span>
                    <strong>{currentSystem.name}</strong>
                    <small>
                      {activeSystem === "skeletal"
                        ? "Cuerpo completo"
                        : "Estructuras del modelo"}
                    </small>
                  </span>
                  <span className="count-badge">
                    {currentStructures.length}
                  </span>
                </button>
                {activeSystem !== "skeletal" ? (
                  <>
                    <div className="list-caption">
                      <span>ESTRUCTURAS ANATÓMICAS</span>
                      <span>{currentStructures.length}</span>
                    </div>
                    {currentStructures.map(renderBoneRow)}
                  </>
                ) : (
                  <>
                    <div className="list-caption">
                      <span>REGIONES ANATÓMICAS</span>
                      <span>09</span>
                    </div>
                    {regions.map((r) => {
                      const Icon = regionIcons[r.id];
                      const open = expanded === r.id;
                      return (
                        <div
                          key={r.id}
                          className={`region-group ${region === r.id ? "selected" : ""}`}
                        >
                          <button
                            className="region-row"
                            aria-expanded={open}
                            onClick={() => {
                              setExpanded(open ? null : r.id);
                              setRegion(open ? "all" : r.id);
                              setIsolate(false);
                            }}
                          >
                            <Icon size={17} />
                            <span>{r.name}</span>
                            <span className="region-count">{r.count}</span>
                            <ChevronDown
                              size={13}
                              className={open ? "chevron-up" : ""}
                            />
                          </button>
                          {open && (
                            <div className="region-bones">
                              <p>{r.subtitle}</p>
                              {bones
                                .filter((b) => b.region === r.id)
                                .map((b) => renderBoneRow(entityById[b.id]))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </div>
          <button className="sidebar-study-card" onClick={startStudy}>
            <span className="study-card-icon">
              <BookOpen size={20} />
            </span>
            <span>
              <strong>Un hueso a la vez.</strong>
              <small>Convierte la curiosidad en conocimiento.</small>
            </span>
            <ArrowUpRight size={17} />
          </button>
          <div className="sidebar-footer">
            <span className="status-dot" /> Español <span>·</span> Latín{" "}
            <button onClick={() => setModal("sources")}>
              Fuentes <ArrowUpRight size={11} />
            </button>
          </div>
        </aside>

        <section
          className="viewer-panel"
          aria-label="Explorador tridimensional"
        >
          <div className="viewer-topbar">
            <div className="viewer-breadcrumb">
              <span className="tiny-square" /> CUERPO HUMANO{" "}
              <ChevronRight size={11} />
              <strong>
                {mode === "study"
                  ? "MODO DE REPASO"
                  : currentSystem.name.toUpperCase()}
              </strong>
            </div>
            <button
              className="icon-button"
              onClick={() => {
                const el = document.querySelector(".viewer-panel");
                if (document.fullscreenElement) document.exitFullscreen?.();
                else
                  el?.requestFullscreen?.().catch(() =>
                    setToast(
                      "Tu navegador no permite abrir la pantalla completa.",
                    ),
                  );
              }}
              aria-label="Pantalla completa"
              title="Pantalla completa"
            >
              <Maximize2 size={16} />
            </button>
          </div>
          <div className="viewer-title">
            <span className="eyebrow">
              {mode === "study"
                ? `TARJETA ${studyIndex + 1} DE ${studyDeck.length}`
                : currentSystem.chapter}
            </span>
            <h2>
              {mode === "study"
                ? "Reconoce. Recuerda. Aprende."
                : currentSystem.title}
            </h2>
            <p>
              {mode === "study"
                ? "Observa el hueso e intenta recordar su nombre."
                : currentSystem.subtitle}
            </p>
          </div>
          <SkeletonViewer
            system={activeSystem}
            ref={viewer}
            selected={selected}
            region={region}
            isolate={isolate}
            ghost={ghost}
            connective={connective}
            hidden={hidden}
            labels={labels}
            rotate={rotate}
            language={language}
            quiz={mode === "study" && !revealed}
            onSelect={(id) => {
              if (mode === "explore") selectBone(id);
            }}
            onReady={setReady}
            onInteract={() => setRotate(false)}
          />
          <span className="anatomy-watermark" aria-hidden="true">
            HUMAN
            <br />
            NATURE.
          </span>
          <div className="viewer-scale" aria-hidden="true">
            <span>SUPERIOR</span>
            <div />
            <span>INFERIOR</span>
          </div>
          <div className="orientation" aria-label={`Orientación ${view}`}>
            <span>S</span>
            <div>
              <button
                aria-label="Vista lateral"
                onClick={() => changeView("lateral")}
              >
                {view === "posterior" ? "I" : "D"}
              </button>
              <span className="orientation-core">
                {view === "anterior" ? "A" : view === "posterior" ? "P" : "L"}
              </span>
              <button
                aria-label="Vista posterior"
                onClick={() => changeView("posterior")}
              >
                {view === "posterior" ? "D" : "I"}
              </button>
            </div>
            <span>INFERIOR</span>
          </div>
          <div className="viewer-side-tools">
            <button
              className="icon-button"
              aria-label="Acercar"
              title="Acercar"
              onClick={() => viewer.current?.zoom(1)}
            >
              <Plus size={19} />
            </button>
            <button
              className="icon-button"
              aria-label="Alejar"
              title="Alejar"
              onClick={() => viewer.current?.zoom(-1)}
            >
              <Minus size={19} />
            </button>
            <span />
            <button
              className="icon-button"
              aria-label="Centrar hueso seleccionado"
              title="Centrar selección"
              onClick={() => viewer.current?.focus()}
            >
              <Crosshair size={19} />
            </button>
            <button
              className="icon-button"
              aria-label="Restablecer vista"
              title="Restablecer vista"
              onClick={reset}
            >
              <RotateCcw size={17} />
            </button>
          </div>
          <div className="view-selector" aria-label="Vistas anatómicas">
            {(["anterior", "posterior", "lateral"] as View[]).map((v) => (
              <button
                key={v}
                className={view === v ? "active" : ""}
                onClick={() => changeView(v)}
              >
                {v[0].toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
          <div className="viewer-bottom">
            <span>
              <span
                className={`status-dot ${ready === currentStructures.length ? "" : "pending"}`}
              />
              {ready === currentStructures.length
                ? "MODELO ANATÓMICO 3D"
                : "CARGANDO MODELO"}
            </span>
            <span>
              <MousePointer2 size={12} /> Arrastra para girar <span>·</span>{" "}
              Scroll para acercar
            </span>
          </div>
          <div className="viewer-toolbar" aria-label="Herramientas del modelo">
            <button
              className={labels ? "active" : ""}
              aria-pressed={labels}
              onClick={() => setLabels((v) => !v)}
            >
              <Tag size={17} />
              <span>Etiquetas</span>
            </button>
            <button
              className={isolate ? "active" : ""}
              aria-pressed={isolate}
              onClick={() => {
                setIsolate((v) => !v);
                if (isolate)
                  requestAnimationFrame(() => viewer.current?.reset());
              }}
            >
              <FocusIcon />
              <span>Aislar</span>
            </button>
            <button
              className={ghost ? "active" : ""}
              aria-pressed={ghost}
              onClick={() => setGhost((v) => !v)}
            >
              <Layers size={17} />
              <span>Transparencia</span>
            </button>
            <span className="toolbar-divider" />
            <button
              className={rotate ? "active" : ""}
              aria-pressed={rotate}
              onClick={() => setRotate((v) => !v)}
            >
              <Rotate3D size={18} />
              <span>Rotación</span>
            </button>
          </div>
          <button className="mobile-browse" onClick={() => setMobileNav(true)}>
            <ListFilter size={16} /> Explorar huesos
          </button>
          <button
            className="mobile-details"
            onClick={() =>
              mode === "study" ? endStudy() : setMobileDetail((v) => !v)
            }
          >
            <BookOpen size={16} />{" "}
            {mode === "study"
              ? "Salir del repaso"
              : mobileDetail
                ? "Cerrar ficha"
                : "Ver ficha"}
          </button>
        </section>

        <aside
          className={`detail-panel ${mobileDetail ? "mobile-open" : ""}`}
          aria-label="Ficha de la estructura seleccionada"
        >
          <div className="detail-header">
            <span className="eyebrow">
              {mode === "study"
                ? "TU SESIÓN DE ESTUDIO"
                : "MÁS CERCA DEL DETALLE"}
            </span>
            <button
              className="icon-button mobile-only"
              onClick={() => setMobileDetail(false)}
              aria-label="Cerrar ficha"
            >
              <X size={17} />
            </button>
            <div className="language-toggle">
              <button
                className={language === "es" ? "active" : ""}
                onClick={() => setLanguage("es")}
              >
                ES
              </button>
              <button
                className={language === "la" ? "active" : ""}
                onClick={() => setLanguage("la")}
              >
                LAT
              </button>
            </div>
          </div>
          {mode === "study" && !revealed ? (
            <div className="quiz-front">
              <span className="quiz-number">
                {String(studyIndex + 1).padStart(2, "0")}
              </span>
              <span className="eyebrow">MIRA EL MODELO</span>
              <h2>¿Qué hueso estás viendo?</h2>
              <p>
                Gíralo, acércalo y busca sus rasgos más característicos antes de
                descubrir la respuesta.
              </p>
              <button
                className="primary-button"
                onClick={() => setRevealed(true)}
              >
                Mostrar respuesta <Eye size={17} />
              </button>
              <div className="study-filter">
                <label htmlFor="study-region">REPASAR UNA REGIÓN</label>
                <select
                  id="study-region"
                  value={studyRegion}
                  onChange={(e) => {
                    const r = e.target.value as Region | "all";
                    setStudyRegion(r);
                    const first = bones.find(
                      (b) => r === "all" || b.region === r,
                    )!;
                    setSelected(first.id);
                    setStudyIndex(0);
                    setRevealed(false);
                  }}
                >
                  <option value="all">Los 206 huesos</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <>
              <div className="bone-heading">
                <div className="bone-category">
                  <span className="bone-category-icon">
                    <Bone size={19} />
                  </span>
                  <span>
                    {activeSystem === "skeletal"
                      ? regions.find((r) => r.id === bone.region)?.name
                      : currentSystem.name}
                    <small>
                      {bone.division === "axial"
                        ? "Esqueleto axial"
                        : bone.division === "appendicular"
                          ? "Esqueleto apendicular"
                          : "Anatomía de sistemas"}
                    </small>
                  </span>
                  <button
                    className={`icon-button ${bookmarks.includes(selected) ? "saved" : ""}`}
                    aria-label={
                      bookmarks.includes(selected)
                        ? "Quitar de mi colección"
                        : "Guardar en mi colección"
                    }
                    aria-pressed={bookmarks.includes(selected)}
                    onClick={toggleBookmark}
                  >
                    <Bookmark
                      size={18}
                      fill={
                        bookmarks.includes(selected) ? "currentColor" : "none"
                      }
                    />
                  </button>
                </div>
                <h2>{displayName}</h2>
                <p className="latin-name">
                  {language === "es"
                    ? bone.latin
                      ? bone.latin.replace(" · ", " ")
                      : "Sin término latino en la fuente"
                    : boneName(bone)}
                </p>
                <div className="bone-pills">
                  <span>
                    {activeSystem === "skeletal"
                      ? `Hueso ${bone.kind}`
                      : "Estructura anatómica"}
                  </span>
                  <span>
                    {bone.side
                      ? `Lado ${bone.side === "l" ? "izquierdo" : "derecho"}`
                      : activeSystem === "skeletal"
                        ? "Línea media"
                        : "Reconstrucción 3D"}
                  </span>
                </div>
              </div>
              {activeSystem === "skeletal" && (
                <div className="detail-tabs">
                  <button
                    className={detailTab === "overview" ? "active" : ""}
                    onClick={() => setDetailTab("overview")}
                  >
                    Vista general
                  </button>
                  <button
                    className={detailTab === "landmarks" ? "active" : ""}
                    onClick={() => setDetailTab("landmarks")}
                  >
                    Accidentes óseos <span>{bone.landmarks.length}</span>
                  </button>
                </div>
              )}
              <div className="detail-scroll">
                {activeSystem !== "skeletal" ? (
                  <StructureDetails
                    entity={bone}
                    onDictionary={() => setModal("dictionary")}
                  />
                ) : detailTab === "overview" ? (
                  <>
                    <section className="detail-section">
                      <h3>Una pieza esencial.</h3>
                      <p>{bone.description}</p>
                    </section>
                    <section className="detail-section articulation-section">
                      <span className="section-caption">SE ARTICULA CON</span>
                      <div className="articulation-tags">
                        {bone.articulations.map((a) => (
                          <span key={a}>{a}</span>
                        ))}
                      </div>
                    </section>
                    <section className="detail-section">
                      <div className="section-heading">
                        <span className="section-caption">
                          PUNTOS DE REFERENCIA
                        </span>
                        <button
                          className="text-button"
                          onClick={() => setDetailTab("landmarks")}
                        >
                          Ver todos <ArrowUpRight size={12} />
                        </button>
                      </div>
                      <div className="landmark-preview">
                        {bone.landmarks.slice(0, 4).map((l, i) => (
                          <div key={l}>
                            <span>{String(i + 1).padStart(2, "0")}</span>
                            {l}
                          </div>
                        ))}
                      </div>
                    </section>
                  </>
                ) : (
                  <section className="detail-section">
                    <h3>Aprende a reconocerlo.</h3>
                    <p>
                      Principales accidentes de este hueso. Consulta el
                      diccionario para ampliar la terminología.
                    </p>
                    <ol className="landmark-list">
                      {bone.landmarks.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ol>
                    <button
                      className="secondary-button"
                      onClick={() => setModal("dictionary")}
                    >
                      <BookOpen size={16} /> Abrir diccionario anatómico
                    </button>
                  </section>
                )}
              </div>
              {mode === "study" ? (
                <div className="study-answer">
                  <span>¿Lo habías reconocido?</span>
                  <div>
                    <button
                      className="secondary-button"
                      onClick={() => nextCard(false)}
                    >
                      Repasar <RotateCcw size={15} />
                    </button>
                    <button
                      className="primary-button"
                      onClick={() => nextCard(true)}
                    >
                      Lo sabía <Check size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="detail-actions">
                  {activeSystem === "skeletal" && (
                    <button
                      className={`learn-button ${learned.includes(selected) ? "learned" : ""}`}
                      aria-pressed={learned.includes(selected)}
                      onClick={toggleLearned}
                    >
                      <span>
                        {learned.includes(selected) ? (
                          <Check size={17} />
                        ) : (
                          <Plus size={17} />
                        )}
                      </span>
                      {learned.includes(selected)
                        ? "Añadido a aprendidos"
                        : "Marcar como aprendido"}
                      <ChevronRight size={16} />
                    </button>
                  )}
                  <div className="detail-secondary">
                    <button
                      onClick={() =>
                        setHidden((ids) =>
                          ids.includes(selected)
                            ? ids.filter((id) => id !== selected)
                            : [...ids, selected],
                        )
                      }
                    >
                      {hidden.includes(selected) ? (
                        <Eye size={14} />
                      ) : (
                        <EyeOff size={14} />
                      )}
                      {hidden.includes(selected)
                        ? activeSystem === "skeletal"
                          ? "Mostrar hueso"
                          : "Mostrar estructura"
                        : activeSystem === "skeletal"
                          ? "Ocultar hueso"
                          : "Ocultar estructura"}
                    </button>
                    <button onClick={share}>
                      <Share2 size={14} /> Compartir
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
          <div className="progress-card">
            <div>
              <span>TU PROGRESO</span>
              <button onClick={() => setModal("progress")}>
                {learned.length} <small>/ 206</small> <ArrowUpRight size={12} />
              </button>
            </div>
            <div className="progress-track">
              <span style={{ width: `${(learned.length / 206) * 100}%` }} />
            </div>
            <p>Cada descubrimiento cuenta.</p>
          </div>
          {mode === "study" && (
            <button className="exit-study text-button" onClick={endStudy}>
              <ArrowLeft size={14} /> Volver a explorar
            </button>
          )}
        </aside>
      </main>
      <footer className="app-footer">
        <span>HECHO PARA MENTES CURIOSAS.</span>
        <span>Explora. Conecta. Comprende.</span>
        <button onClick={() => setModal("sources")}>
          Anatomía abierta, conocimiento compartido <ArrowUpRight size={12} />
        </button>
      </footer>

      {modal === "dictionary" && (
        <Dictionary
          onClose={closeModal}
          onSelect={(id) => {
            endStudy();
            reset();
            selectBone(id);
            requestAnimationFrame(() => viewer.current?.focus());
          }}
        />
      )}
      {modal === "help" && (
        <Modal
          title="Haz tuyo el atlas."
          eyebrow="GUÍA RÁPIDA"
          onClose={closeModal}
        >
          <p className="modal-lead">
            La mejor forma de aprender anatomía es explorar sus relaciones.
          </p>
          <div className="help-grid">
            <div>
              <Rotate3D />
              <h3>Gira y descubre</h3>
              <p>
                Arrastra con un dedo o con el botón izquierdo. Rueda o pellizca
                para acercar. Botón derecho o dos dedos para desplazar.
              </p>
            </div>
            <div>
              <MousePointer2 />
              <h3>Selecciona una estructura</h3>
              <p>
                Pulsa un hueso en el modelo o búscalo por su nombre, sinónimos,
                término latino o accidentes óseos.
              </p>
            </div>
            <div>
              <Crosshair />
              <h3>Cambia de perspectiva</h3>
              <p>
                Usa las vistas anterior, posterior y lateral. Centra la
                selección, aíslala o haz transparente el resto del esqueleto.
              </p>
            </div>
            <div>
              <BookOpen />
              <h3>Aprende a tu ritmo</h3>
              <p>
                Repasa con tarjetas, guarda estructuras y marca las que ya
                reconoces. Tu progreso se conserva en este navegador.
              </p>
            </div>
          </div>
          <div className="notice">
            <strong>¿Qué incluye el atlas?</strong>
            <p>
              Los 206 huesos del recuento adulto convencional y un diccionario
              de {TERM_COUNT} términos. También puedes explorar modelos de los
              sistemas muscular, cardiovascular, nervioso y visceral desde el
              selector de sistemas. Cada sistema carga sus propias estructuras
              bajo demanda. La anatomía individual y el número de huesos pueden
              variar.
            </p>
          </div>
          <button className="primary-button" onClick={closeModal}>
            Empezar a explorar <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {modal === "progress" && (
        <Modal
          title="Todo lo que ya sabes."
          eyebrow="MI APRENDIZAJE"
          onClose={closeModal}
        >
          <div className="progress-summary">
            <strong>
              {learned.length}
              <span>/206</span>
            </strong>
            <div>
              <h3>huesos aprendidos</h3>
              <p>
                {Math.round((learned.length / 206) * 100)} % del esqueleto
                adulto
              </p>
            </div>
          </div>
          <div className="region-progress">
            {regions.map((r) => {
              const count = learned.filter(
                (id) => boneById[id].region === r.id,
              ).length;
              return (
                <div key={r.id}>
                  <span>{r.name}</span>
                  <div className="progress-track">
                    <span style={{ width: `${(count / r.count) * 100}%` }} />
                  </div>
                  <small>
                    {count}/{r.count}
                  </small>
                </div>
              );
            })}
          </div>
          <p className="source-note">
            Se guarda en este navegador. Puedes descargar una copia con tus
            huesos aprendidos y tu colección.
          </p>
          <button className="primary-button" onClick={exportProgress}>
            <ArrowDownToLine size={17} /> Descargar mi progreso
          </button>
        </Modal>
      )}
      {modal === "sources" && (
        <Modal
          title="Conocimiento compartido."
          eyebrow="FUENTES Y CRÉDITOS"
          onClose={closeModal}
        >
          <p className="modal-lead">
            Mallas anatómicas reales, adaptadas para explorar en el navegador.
          </p>
          <div className="source-card">
            <h3>Z-Anatomy</h3>
            <p>
              The libre 3D atlas of anatomy. Gauthier Kervyn, Marcin Zielinski y
              colaboradores. Modelos y tabla de términos TA2 bajo CC BY-SA 4.0.
              Traducción española: Carlos Torres Villar.
            </p>
            <a
              href="https://github.com/Z-Anatomy/Models-of-human-anatomy"
              target="_blank"
              rel="noreferrer"
            >
              Repositorio original <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="source-card">
            <h3>BodyParts3D</h3>
            <p>
              The Database Center for Life Science. Modelo original de Kousaku
              Okubo. CC BY-SA 2.1 Japan.
            </p>
            <a
              href="https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html"
              target="_blank"
              rel="noreferrer"
            >
              Fuente de los modelos <ArrowUpRight size={14} />
            </a>
          </div>
          <div className="notice">
            <strong>Alcance y recuento</strong>
            <p>
              206 huesos: 80 axiales y 126 apendiculares. Se cuentan sacro,
              cóccix y esternón como un hueso cada uno. Se excluyen dientes,
              huesos suturales y sesamoideos variables; se incluyen las rótulas
              y los seis huesecillos del oído. Los dientes del modelo son
              referencias visuales y no se cuentan como huesos.
            </p>
            <p>
              Las mallas y el diccionario conservan sus atribuciones. El
              upstream declara CC BY-SA 4.0 e incluye componentes con licencias
              no comerciales, entre ellos modelos de oído interno y riñón. El
              contenido es educativo; no está validado para uso clínico. La
              terminología comunitaria puede incluir variantes y errores de
              traducción.
            </p>
          </div>
          <p className="source-note">
            Otros créditos del modelo original: University of Washington;
            University of Dundee, CAHID (CC BY 4.0); University of Dundee School
            of Medicine (CC BY-NC-SA 4.0); Lissie Cowley (CC BY-NC 4.0).
          </p>
          <a
            className="text-button"
            href="/credits.txt"
            target="_blank"
            rel="noreferrer"
          >
            Todos los avisos y licencias <ArrowUpRight size={14} />
          </a>
          <br />
          <br />
          <a
            className="text-button"
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            Consultar licencia CC BY-SA 4.0 <ArrowUpRight size={14} />
          </a>
        </Modal>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
          <button aria-label="Cerrar aviso" onClick={() => setToast("")}>
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function FocusIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 3H3v4m10-4h4v4M3 13v4h4m6 0h4v-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

type Definition = { text: string; url: string | null };
let definitionCache: Promise<Record<string, Definition>> | null = null;
function StructureDetails({
  entity,
  onDictionary,
}: {
  entity: Entity;
  onDictionary: () => void;
}) {
  const [definition, setDefinition] = useState<Definition | null>(null);
  useEffect(() => {
    let active = true;
    setDefinition(null);
    definitionCache ||= fetch("/definitions.json")
      .then((r) => {
        if (!r.ok) throw Error("Definitions unavailable");
        return r.json();
      })
      .catch(() => ({}));
    definitionCache.then((data) => {
      if (active) setDefinition(data[entity.id] || null);
    });
    return () => {
      active = false;
    };
  }, [entity.id]);
  return (
    <section className="detail-section structure-details">
      <h3>Conoce su anatomía.</h3>
      <p>
        Explora esta estructura en su posición anatómica. Aíslala para estudiar
        su forma, o gira el modelo para observar sus relaciones.
      </p>
      <div className="structure-names">
        <span className="section-caption">NOMENCLATURA</span>
        <dl>
          <dt>Español</dt>
          <dd>
            {entity.translated ? entity.name : "Sin traducción en la fuente"}
          </dd>
          <dt>Latín</dt>
          <dd>{entity.latin || "Sin término latino en la fuente"}</dd>
          <dt>Inglés</dt>
          <dd>{entity.english}</dd>
          {entity.termId && (
            <>
              <dt>ID de fuente</dt>
              <dd>{entity.termId}</dd>
            </>
          )}
        </dl>
      </div>
      {definition && (
        <details className="original-definition" key={entity.id}>
          <summary>
            Leer descripción original <span>EN</span>
          </summary>
          <p>{definition.text}</p>
          {definition.url && (
            <a href={definition.url} target="_blank" rel="noreferrer">
              Wikipedia · CC BY-SA 3.0 <ArrowUpRight size={12} />
            </a>
          )}
        </details>
      )}
      <button className="secondary-button" onClick={onDictionary}>
        <BookOpen size={16} /> Ampliar en el diccionario
      </button>
    </section>
  );
}
