import React, { useEffect, useMemo, useState } from "react";
import RESOURCES from "./data/resources.json";
import THEMES_RAW from "./data/barrier_themes.json";
import BARRIERS_RAW from "./data/barriers.json";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer} from "recharts";

const PERSONAS = ["Project", "Programme", "Business"];
const RAD = Math.PI / 180;

// --- Branding palette (tweak to match PDATF site) ---
const THEME_COLORS = {
  "leadership-and-alignment": "#2563eb", // blue-600
  "data-pooling-and-interoperability": "#06b6d4", // cyan-500
  "digital-and-tech-constraints": "#7c3aed", // violet-600
  "skill-and-culture-gaps": "#16a34a", // green-600
  "procurement-and-commercial-models": "#f59e0b", // amber-500
  "risk-ethics-and-assurance": "#ef4444", // red-500
};

// Lighten a hex colour by amt (0..1 -> lighter)
function lighten(hex, amt = 0.3) {
  let c = hex?.replace("#", "") || "64748b";
  if (c.length === 3) c = c.split("").map(ch => ch + ch).join("");
  const n = parseInt(c, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  r = Math.min(255, Math.round(r + (255 - r) * amt));
  g = Math.min(255, Math.round(g + (255 - g) * amt));
  b = Math.min(255, Math.round(b + (255 - b) * amt));
  const h = (v) => v.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}


// ---- Normalisation helpers (robust to CSV variations) ----
const toArray = (v) => Array.isArray(v) ? v : (typeof v === "string" ? v.split("|").map(s => s.trim()).filter(Boolean) : []);
const normalizeResource = (r) => ({
  ...r,
  personas: toArray(r.personas),
  barriers: toArray(r.barriers),
  tags: toArray(r.tags),
  barrier_category: r.barrier_category || r.barrier_theme || "",
});

export default function App() {
  const [search, setSearch] = useState("");
  const [selectedTheme, setSelectedTheme] = useState(null); // string | null
  const [selectedBarrier, setSelectedBarrier] = useState(null); // string | null (single)
  const [selectedPersonas, setSelectedPersonas] = useState([]);
  const [hoveredLayer, setHoveredLayer] = useState(null); // 'theme' | 'barrier' | null

  // Header ref and dynamic height effect
  const headerRef = React.useRef(null);
  useEffect(() => {
    const setHdr = () => {
      const h = headerRef.current?.offsetHeight || 0;
      document.documentElement.style.setProperty('--hdr', h + 'px');
    };
    setHdr();
    window.addEventListener('resize', setHdr);
    return () => window.removeEventListener('resize', setHdr);
  }, []);

  // URL ↔ state
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const q = (p.get("q") || "").trim();
    const theme = p.get("theme");
    const barrier = p.get("barrier");
    const personas = (p.get("personas") || "").split(",").filter(Boolean);
    if (q) setSearch(q);
    if (theme) setSelectedTheme(theme);
    if (barrier) setSelectedBarrier(barrier);
    if (personas.length) setSelectedPersonas(personas);
  }, []);
  useEffect(() => {
    const p = new URLSearchParams();
    if (search) p.set("q", search);
    if (selectedTheme) p.set("theme", selectedTheme);
    if (selectedBarrier) p.set("barrier", selectedBarrier);
    if (selectedPersonas.length) p.set("personas", selectedPersonas.join(","));
    const url = `${window.location.pathname}?${p.toString()}`;
    window.history.replaceState({}, "", url);
  }, [search, selectedTheme, selectedBarrier, selectedPersonas]);

  // SINGLE-SELECTION behaviour
  const toggleTheme = (id) => {
    setSelectedTheme((curr) => (curr === id ? null : id));
    setSelectedBarrier(null); // clear barrier when picking a theme
  };
  const toggleBarrier = (id, themeId) => {
    setSelectedBarrier((curr) => (curr === id ? null : id));
    setSelectedTheme(null); // clear theme when picking a barrier
  };
  const togglePersona = (id) => setSelectedPersonas((curr) => (curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id]));
  const clearAll = () => { setSearch(""); setSelectedTheme(null); setSelectedBarrier(null); setSelectedPersonas([]); };

  const DATA_RESOURCES = useMemo(() => RESOURCES.map(normalizeResource), []);
  const THEMES = useMemo(() => [...THEMES_RAW].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)), []);
  const BARRIERS = useMemo(() => BARRIERS_RAW.map(b => ({ ...b, themeId: b.themeId || b.categoryId })), []);

  // Base filter (affects counts & ring): search + personas only
  const baseFilter = (r) => {
    const q = search.trim().toLowerCase();
    const matchesText = !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || (r.tags || []).some((t) => t.toLowerCase().includes(q));
    const matchesPersonas = !selectedPersonas.length || r.personas.some((p) => selectedPersonas.includes(p));
    return matchesText && matchesPersonas;
  };

  // ---- Build aligned data ----
  const barrierValues = useMemo(() => {
    return BARRIERS.map(b => ({
      id: b.id,
      name: b.name,
      themeId: b.themeId,
      value: DATA_RESOURCES.filter((r) => baseFilter(r) && r.barriers.includes(b.id)).length,
    }));
  }, [BARRIERS, DATA_RESOURCES, search, selectedPersonas]);

  const barriersByTheme = useMemo(() => {
    const lookup = new Map();
    THEMES.forEach(t => lookup.set(t.id, []));
    barrierValues.forEach(b => { if (lookup.has(b.themeId)) lookup.get(b.themeId).push(b); });
    // keep stable ordering by name
    THEMES.forEach(t => lookup.get(t.id).sort((a, b) => a.name.localeCompare(b.name)));
    return THEMES.map(t => ({ theme: t, items: lookup.get(t.id) || [] }));
  }, [THEMES, barrierValues]);

  // Inner ring sizing must align with the sum of its barriers so the wedges line up.
  // We still show UNIQUE resource counts in the tooltip via `displayCount`.
  const themeData = useMemo(() => {
    // 1) Sum barrier values per theme (these already honor baseFilter)
    const sums = new Map();
    THEMES.forEach((t) => sums.set(t.id, 0));
    barrierValues.forEach((b) => {
      sums.set(b.themeId, (sums.get(b.themeId) || 0) + (b.value || 0));
    });

    // 2) Unique count by barrier_category for tooltip display
    const uniqueByTheme = new Map();
    THEMES.forEach((t) => uniqueByTheme.set(t.id, 0));
    THEMES.forEach((t) => {
      const c = DATA_RESOURCES.filter((r) => baseFilter(r) && r.barrier_category === t.id).length;
      uniqueByTheme.set(t.id, c);
    });

    return THEMES.map((t) => {
      const sum = sums.get(t.id) || 0;
      return {
        id: t.id,
        name: t.name,
        value: sum === 0 ? 0.0001 : sum, // epsilon keeps the slice visible while aligning with outer ring
        displayCount: uniqueByTheme.get(t.id) || 0,
      };
    });
  }, [THEMES, barrierValues, DATA_RESOURCES, search, selectedPersonas]);
  // Outer ring flattened, in the exact grouped order
  const barrierData = useMemo(() => barriersByTheme.flatMap(g => g.items), [barriersByTheme]);

  // Results list filter (honour single-selection)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DATA_RESOURCES.filter((r) => {
      const matchesText = !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || (r.tags || []).some((t) => t.toLowerCase().includes(q));
      const matchesPersonas = !selectedPersonas.length || r.personas.some((p) => selectedPersonas.includes(p));
      const matchesTheme = !selectedTheme || r.barrier_category === selectedTheme;
      const matchesBarrier = !selectedBarrier || r.barriers.includes(selectedBarrier);
      return matchesText && matchesPersonas && matchesTheme && matchesBarrier;
    }).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [DATA_RESOURCES, search, selectedPersonas, selectedTheme, selectedBarrier]);

  // Colours
  const themeFill = (themeId, highlighted) => highlighted ? (THEME_COLORS[themeId] || "#334155") : lighten(THEME_COLORS[themeId] || "#94a3b8", 0.35);
  const barrierFills = useMemo(() => {
    const map = new Map();
    barriersByTheme.forEach(({ theme, items }) => {
      const base = THEME_COLORS[theme.id] || "#64748b";
      const n = Math.max(1, items.length);
      items.forEach((item, i) => {
        const shade = lighten(base, 0.6 - (i / (n - 1 || 1)) * 0.32);
        map.set(item.id, shade);
      });
    });
    return map;
  }, [barriersByTheme]);

  const selectedThemeLabel = selectedTheme ? (THEMES.find((t) => t.id === selectedTheme) || {}).name : null;
  const selectedBarrierLabel = selectedBarrier ? (BARRIERS.find((b) => b.id === selectedBarrier) || {}).name : null;

  // selection highlighting for outer ring
  const isBarrierActive = (b) => {
    if (selectedBarrier) return b.id === selectedBarrier;
    if (selectedTheme) return b.themeId === selectedTheme; // highlight all within theme
    return false;
  };

  return (
    <div className="min-h-screen lg:overflow-hidden">
      {/* Small header with just title */}
      <header ref={headerRef} className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur text-white py-2 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">PDATF Toolkit</h1>
        </div>
      </header>

      {/* Main content */}
      <main
        className="max-w-7xl mx-auto px-4 py-2 grid lg:grid-cols-12 lg:grid-rows-[auto,1fr] gap-2 lg:h-[calc(100svh-var(--hdr))]"
      >
        {/* Filters card (search + personas) spans above ring */}
        <section className="lg:col-span-8 lg:row-start-1 bg-white border border-slate-200 rounded-3xl shadow-md/10 p-2">
          <div className="flex flex-col items-center gap-3">
            <div className="w-full md:w-3/4">
              <div className="relative">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.471 6.471 0 0 0 4.23-1.57l.27.28v.79L20 21.5 21.5 20 15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search title, description, tags…"
                  className="w-full rounded-full border border-slate-200 bg-white pl-9 pr-24 py-2.5 text-sm placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <button
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center rounded-full bg-slate-900 text-white hover:bg-slate-800 px-4 py-1.5 text-xs"
                  onClick={clearAll}
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {PERSONAS.map((p) => (
                <button
                  key={p}
                  onClick={() => togglePersona(p)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs ${
                    selectedPersonas.includes(p)
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white border-slate-300"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Center: ring */}
        <section className="lg:col-span-8 lg:row-start-2 bg-white border border-slate-200 rounded-3xl shadow-md/10 p-2 pb-0 h-[52vh] lg:h-full min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-2 text-xs text-slate-600 h-5">
            <div>
              <span className="hidden lg:inline">Click the inner ring (themes) or the outer ring (barriers) to filter.</span>
              <span className="lg:hidden">Tap a theme (inner) or barrier (outer); results are listed below.</span>
            </div>
            <div className="truncate max-w-[60%] text-right">
              {selectedTheme && <span>Selected: <span className="font-medium">Theme — {selectedThemeLabel}</span></span>}
              {selectedBarrier && <span>Selected: <span className="font-medium">Barrier — {selectedBarrierLabel}</span></span>}
            </div>
          </div>

          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="relative w-full h-full">
              <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
              background:
              'radial-gradient(90% 90% at 50% 55%, rgba(2,6,23,0.035) 0%, rgba(2,6,23,0.02) 40%, transparent 70%)'
              }}
              /> 
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 2, right: 4, bottom: 2, left: 4 }}>
                {/* Inner ring: themes (exact sum of its barriers) */}
                <Pie
                  data={themeData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="32%"
                  outerRadius="48%"
                  startAngle={90}
                  endAngle={-270}  // clockwise
                  cx="50%"
                  cy="50%"
                  isAnimationActive={false}
                  labelLine={false}
                  paddingAngle={0}  // ensure perfect alignment
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {themeData.map((d) => (
                    <Cell
                      key={d.id}
                      className="cursor-pointer"
                      fill={themeFill(d.id, selectedTheme === d.id)}
                      opacity={
                        selectedTheme
                          ? (selectedTheme === d.id ? 1 : 0.35)
                          : (selectedBarrier ? 0.35 : 1)
                      }
                      onClick={() => toggleTheme(d.id)}
                      onMouseEnter={() => setHoveredLayer('theme')}
                      onMouseLeave={() => setHoveredLayer(null)}
                    />
                  ))}
                </Pie>

                {/* Outer ring: barriers ordered by theme so arcs align */}
                <Pie
                  data={barrierData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="52%"
                  outerRadius="75%"
                  startAngle={90}
                  endAngle={-270}
                  cx="50%"
                  cy="50%"
                  isAnimationActive={false}
                  labelLine={false}
                  paddingAngle={0}  // ensure perfect alignment
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {barrierData.map((d) => (
                    <Cell
                      key={d.id}
                      className="cursor-pointer"
                      fill={
                        selectedBarrier === d.id
                          ? (THEME_COLORS[d.themeId] || "#334155")
                          : (barrierFills.get(d.id) || "#e5e7eb")
                      }
                      opacity={
                        selectedBarrier
                          ? (selectedBarrier === d.id ? 1 : 0.3)
                          : (selectedTheme ? (d.themeId === selectedTheme ? 1 : 0.3) : 1)
                      }
                      onClick={() => toggleBarrier(d.id, d.themeId)}
                      onMouseEnter={() => setHoveredLayer('barrier')}
                      onMouseLeave={() => setHoveredLayer(null)}
                    />
                  ))}
                </Pie>

                <Tooltip
                  followCursor
                  wrapperStyle={{ pointerEvents: 'none', transition: 'none' }}
                  content={({ payload }) => {
                    if (!payload || !payload.length) return null;
                    const pick = (hoveredLayer === 'barrier')
                      ? payload.find(e => e?.payload && e.payload.themeId)
                      : payload.find(e => e?.payload && !e.payload.themeId);
                    const entry = pick || payload[0];
                    const d = entry?.payload;
                    if (!d) return null;
                    const isBarrier = !!d.themeId;
                    const count = isBarrier ? d.value : (d.displayCount ?? d.value);
                    const themeName = isBarrier ? (THEMES.find(t => t.id === d.themeId)?.name || d.themeId) : d.name;
                    return (
                      <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 10px 30px rgba(2,6,23,0.12)', padding: '8px 10px' }}>
                        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>{d.name}</div>
                        <div style={{ fontSize: 12, color: '#334155' }}>
                          {count} resources{isBarrier ? ` • Theme: ${themeName}` : ''}
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>  
          </div>
          
        </section>

        {/* Right: results */}
        <section className="lg:col-span-4 lg:row-span-2 flex min-h-0 w-full lg:h-full">
          <div className="bg-white border border-slate-200 rounded-3xl shadow-md/10 p-4 w-full flex flex-col h-full">
            <div className="text-sm mb-2 shrink-0 sticky top-0 bg-white z-10 border-b border-slate-100 py-2"><span className="font-medium">{filtered.length}</span> result{filtered.length === 1 ? "" : "s"}</div>
            <div className="flex-1 min-h-0 lg:overflow-y-auto overflow-visible pr-1 space-y-3">
              {filtered.map((r) => (
                <article key={r.id} className="bg-white border border-slate-200 rounded-3xl shadow-md/10 p-4">
                  <h3 className="font-medium leading-snug">{r.title}</h3>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-3">{r.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1 text-xs">
                    {(r.personas || []).map((p) => <span key={p} className="inline-flex items-center rounded-full px-2.5 py-0.5 bg-slate-100 text-slate-700">{p}</span>)}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 text-xs">
                    {(r.barriers || []).map((b) => {
                      const barrier = BARRIERS.find(x => x.id === b);
                      const label = barrier?.name || b;
                      const color = barrier ? lighten(THEME_COLORS[barrier.themeId] || "#64748b", 0.6) : "#e5e7eb";
                      return (
                        <span key={b} style={{ background: color }} className="inline-flex items-center rounded-full border border-slate-300 px-2 py-0.5">
                          {label}
                        </span>
                      );
                    })}
                  </div>
                  <a className="mt-3 inline-flex text-sm rounded-md px-3 py-1.5 bg-slate-900 text-white hover:bg-slate-800" href={r.url} target="_blank" rel="noreferrer">
                    Open resource
                  </a>
                </article>
              ))}
              {!filtered.length && (
                <div className="bg-white border border-slate-200 rounded-3xl shadow-md/10 p-4 text-xs text-slate-600">
                  No resources match your filters. Clear some filters or search terms.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}