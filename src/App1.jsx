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

  // Sum of theme values for angle calculations (for label visibility)
  const themeTotal = useMemo(() => themeData.reduce((a, b) => a + (b.value || 0), 0), [themeData]);

  // Render theme labels along the arc with optional two lines, upright on both halves of the circle.
  // Uses polyline paths instead of SVG Arc flags to avoid sweep-direction quirks across browsers.
  const renderInnerThemeLabel = (props) => {
    const {
      cx, cy, startAngle, endAngle, innerRadius, outerRadius, payload,
    } = props;

    if (!themeTotal) return null;

    // Trim arc ends a tiny bit so text doesn't clip into the strokes.
    const pad = 3; // degrees
    // Preserve original direction (Recharts gives clockwise for our config: startAngle > endAngle)
    const sA = startAngle > endAngle ? startAngle - pad : startAngle + pad;
    const eA = startAngle > endAngle ? endAngle + pad : endAngle - pad;
    const rawAngle = Math.abs(eA - sA);
    if (rawAngle < 12) return null; // too small to show a label

    const ir = Number(innerRadius);
    const or = Number(outerRadius);
    if (!Number.isFinite(ir) || !Number.isFinite(or)) return null;

    // Helper to convert chart degrees → screen XY.
    const RAD = Math.PI / 180;
    const toXY = (deg, r) => {
      // Recharts angles increase clockwise; SVG y is downward, so negate.
      const rad = (-deg) * RAD;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
    };

    // Midpoint Y to determine whether slice is on the bottom half visually.
    const midDeg = (sA + eA) / 2;
    const [mx, my] = toXY(midDeg, (ir + or) / 2);
    const isBottom = my > cy;

    // Build a polyline-like path string from angle a0 → a1 at radius r.
    const buildPath = (a0, a1, r, steps = Math.max(10, Math.ceil(Math.abs(a1 - a0) / 6))) => {
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = a0 + (a1 - a0) * t;
        const [x, y] = toXY(a, r);
        pts.push([x, y]);
      }
      // Path as M + L segments
      let d = `M ${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
      return d;
    };

    // We want text upright. On the bottom half, reverse the path direction so the text isn't upside-down.
    const a0 = isBottom ? eA : sA;
    const a1 = isBottom ? sA : eA;

    // Two concentric paths (for 1st and optional 2nd line).
    const r1 = (ir + or) / 2 - 1;
    const r2 = r1 - 12; // second line slightly inwards
    const d1 = buildPath(a0, a1, r1);
    const d2 = buildPath(a0, a1, r2);

    // Estimate arc length in px for fitting text
    const arcLenPx = r1 * Math.abs(a1 - a0) * RAD;

    // Prefer shorter theme names when we have them
    const shortMap = {
      'Procurement & Commercial Models': 'Procurement & Commercial',
      'Digital & Tech Constraints': 'Digital & Tech',
      'Data Pooling & Interoperability': 'Data Pooling & Interop',
      'Risk, Ethics & Assurance': 'Risk, Ethics & Assurance',
      'Leadership & Alignment': 'Leadership & Alignment',
      'Skill & Culture Gaps': 'Skill & Culture'
    };
    const fullLabel = shortMap[payload?.name] || payload?.name || '';

    // Fit utilities
    const pxPerCharAt12px = 6.5; // rough width at 12px
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const ellipsize = (s, maxChars) => (s.length <= maxChars ? s : s.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…');

    // Decide max usable length per line (leave margin so it doesn't touch wedge edges)
    const maxSinglePx = Math.max(48, arcLenPx * 0.92);

    // First try single-line fit; if it won't fit, split into two lines.
    const singleFont = clamp(arcLenPx / Math.max(10, fullLabel.length * (pxPerCharAt12px / 12)), 9, 12);
    const singlePx = fullLabel.length * (pxPerCharAt12px * (singleFont / 12));
    const useTwoLines = singlePx > maxSinglePx;

    // Heuristic splitter for two lines
    const splitTwoLines = (s) => {
      const prefer = [' & ', ' - ', ' and '];
      for (const token of prefer) {
        const i = s.indexOf(token);
        if (i > 0 && i < s.length - token.length) {
          return [s.slice(0, i + token.trim().length), s.slice(i + token.length).trim()];
        }
      }
      const parts = s.split(' ');
      if (parts.length < 2) return [s];
      let acc = 0, bestIdx = -1, bestDiff = Infinity;
      const total = parts.join('').length;
      for (let i = 1; i < parts.length; i++) {
        acc += parts[i - 1].length;
        const diff = Math.abs(acc - total / 2);
        if (diff < bestDiff) { bestDiff = diff; bestIdx = i; }
      }
      return [parts.slice(0, bestIdx).join(' '), parts.slice(bestIdx).join(' ')];
    };

    let lines = useTwoLines ? splitTwoLines(fullLabel) : [fullLabel];

    // Compute fonts & ellipsis per line
    const baseFont = clamp(arcLenPx / Math.max(16, fullLabel.length * 0.7), 9, 12);
    const font1 = baseFont;
    const font2 = clamp(baseFont * 0.95, 8.5, 11.5);

    const maxPxLine1 = maxSinglePx;
    const maxPxLine2 = maxSinglePx * 0.92;

    const pxFor = (s, font) => s.length * (pxPerCharAt12px * (font / 12));

    // Ellipsize if needed
    if (lines.length === 1) {
      if (pxFor(lines[0], font1) > maxPxLine1) {
        const maxChars = Math.floor(maxPxLine1 / (pxPerCharAt12px * (font1 / 12)));
        lines[0] = ellipsize(lines[0], Math.max(3, maxChars));
      }
    } else {
      if (pxFor(lines[0], font1) > maxPxLine1) {
        const maxChars = Math.floor(maxPxLine1 / (pxPerCharAt12px * (font1 / 12)));
        lines[0] = ellipsize(lines[0], Math.max(3, maxChars));
      }
      if (pxFor(lines[1], font2) > maxPxLine2) {
        const maxChars = Math.floor(maxPxLine2 / (pxPerCharAt12px * (font2 / 12)));
        lines[1] = ellipsize(lines[1], Math.max(3, maxChars));
      }
    }

    const pathId1 = `themeLabelArc-${payload?.id}-1-${Math.round(sA)}-${Math.round(eA)}`;
    const pathId2 = `themeLabelArc-${payload?.id}-2-${Math.round(sA)}-${Math.round(eA)}`;

    return (
      <g style={{ pointerEvents: 'none' }}>
        <defs>
          <path id={pathId1} d={d1} fill="none" />
          {lines.length > 1 && <path id={pathId2} d={d2} fill="none" />}
        </defs>
        <text fill="#0f172a" fontSize={font1} textAnchor="middle" dominantBaseline="middle">
          <textPath href={`#${pathId1}`} startOffset="50%" method="align" spacing="auto">
            {lines[0]}
          </textPath>
        </text>
        {lines.length > 1 && (
          <text fill="#0f172a" fontSize={font2} textAnchor="middle" dominantBaseline="middle">
            <textPath href={`#${pathId2}`} startOffset="50%" method="align" spacing="auto">
              {lines[1]}
            </textPath>
          </text>
        )}
      </g>
    );
  };

  // Render theme labels just **outside** the outer ring, colour-coded, following the arc.
  const renderOuterThemeLabel = (props) => {
    const { cx, cy, startAngle, endAngle, innerRadius, outerRadius, payload } = props;
    if (!themeTotal) return null;

    // pad and angles
    const pad = 2;
    const sA = startAngle > endAngle ? startAngle - pad : startAngle + pad;
    const eA = startAngle > endAngle ? endAngle + pad : endAngle - pad;
    const rawAngle = Math.abs(eA - sA);
    if (rawAngle < 12) return null;

    const ir = Number(innerRadius);
    const or = Number(outerRadius);
    if (!Number.isFinite(ir) || !Number.isFinite(or)) return null;

    const RAD = Math.PI / 180;
    const toXY = (deg, r) => {
      const rad = (-deg) * RAD;
      return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
    };

    const midDeg = (sA + eA) / 2;
    const [mx, my] = toXY(midDeg, (ir + or) / 2);
    const isBottom = my > cy;

    // place path slightly outside the actual outer ring
    const r = or + 5; // 8px outside the ring (reduced whitespace)
    const buildPath = (a0, a1, r, steps = Math.max(10, Math.ceil(Math.abs(a1 - a0) / 6))) => {
      const pts = [];
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const a = a0 + (a1 - a0) * t;
        const rad = (-a) * RAD;
        const x = cx + r * Math.cos(rad);
        const y = cy + r * Math.sin(rad);
        pts.push([x, y]);
      }
      let d = `M ${pts[0][0]} ${pts[0][1]}`;
      for (let i = 1; i < pts.length; i++) d += ` L ${pts[i][0]} ${pts[i][1]}`;
      return d;
    };

    const a0 = isBottom ? eA : sA;
    const a1 = isBottom ? sA : eA;
    const d = buildPath(a0, a1, r);

    // fit
    const arcLenPx = r * Math.abs(a1 - a0) * RAD;
    const pxPerCharAt12px = 7.2;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
    const label = payload?.name || '';
    const maxPx = Math.max(64, arcLenPx * 0.9);
    let font = clamp(arcLenPx / Math.max(18, label.length * 0.85), 9.5, 12.5);
    const est = label.length * (pxPerCharAt12px * (font / 12));
    let text = label;
    if (est > maxPx) {
      const maxChars = Math.floor(maxPx / (pxPerCharAt12px * (font / 12)));
      text = (label.length <= maxChars) ? label : label.slice(0, Math.max(0, maxChars - 1)).trimEnd() + '…';
    }

    const color = THEME_COLORS[payload?.id] || '#334155';
    const pathId = `themeOuterArc-${payload?.id}-${Math.round(sA)}-${Math.round(eA)}`;

    // Dim labels when their theme isn't active (match ring behaviour)
    const activeThemeId = selectedTheme || (selectedBarrier ? (BARRIERS.find(b => b.id === selectedBarrier)?.themeId) : null);
    const dim = !!(activeThemeId && payload?.id !== activeThemeId);
    const labelOpacity = dim ? 0.3 : 1;

    // Make the label interactive: wrap in <g> (no pointerEvents: 'none'), add onClick to <text>, cursor pointer.
    return (
      <g>
        <defs>
          <path id={pathId} d={d} fill="none" />
        </defs>
        <text
          fill={color}
          fontSize={font}
          fontWeight="600"
          textAnchor="middle"
          dominantBaseline="middle"
          opacity={labelOpacity}
          style={{ cursor: "pointer" }}
          onClick={() => toggleTheme(payload?.id)}
        >
          <textPath href={`#${pathId}`} startOffset="50%" method="align" spacing="auto">
            {text}
          </textPath>
        </text>
      </g>
    );
  };

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
    <div className="min-h-screen overflow-hidden">
      {/* Small header with just title */}
      <header ref={headerRef} className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur text-white py-2 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">PDATF Toolkit</h1>
        </div>
      </header>

      {/* Main content */}
      <main
        className="max-w-7xl mx-auto px-4 py-2 grid lg:grid-cols-12 lg:grid-rows-[auto,1fr] gap-2"
        style={{ height: 'calc(100svh - var(--hdr))' }}
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
              <span className="hidden lg:inline">Click a theme (inner ring) or a barrier (outer ring) to filter.</span>
              <span className="lg:hidden">Tap a theme (inner) or barrier (outer); results are listed below.</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="truncate max-w-[50vw] text-right">
                {selectedBarrier && <span>Selected: <span className="font-medium">Barrier — {selectedBarrierLabel}</span></span>}
              </div>
            </div>
          </div>

          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="relative w-full h-full">
              {/* Gradient overlay: keep as first absolute child */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{
                  background:
                    'radial-gradient(90% 90% at 50% 55%, rgba(2,6,23,0.035) 0%, rgba(2,6,23,0.02) 40%, transparent 70%)'
                }}
              />
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 8, bottom: 0, left: 8 }}>
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
                    label={false}
                    labelLine={false}
                    paddingAngle={0}  // ensure perfect alignment
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="hidden lg:block"
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
                  <Pie
                    data={themeData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="78%"
                    outerRadius="83%"
                    startAngle={90}
                    endAngle={-270}
                    cx="50%"
                    cy="50%"
                    isAnimationActive={false}
                    label={renderOuterThemeLabel}
                    labelLine={false}
                    stroke="none"
                    fill="transparent"
                    pointerEvents="none"
                  />

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
              {/* Theme key removed */}
            </div>
          </div>
          
        </section>

        {/* Right: results */}
        <section className="lg:col-span-4 lg:row-span-2 flex min-h-0 lg:h-full">
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