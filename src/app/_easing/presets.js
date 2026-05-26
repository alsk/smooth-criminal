// Each preset is a list of anchors: { x, y, hIn:{dx,dy}|null, hOut:{dx,dy}|null }
// The first/last anchor are the start/end (0,0)/(1,1) and only have one side.

const cb = (cp1x, cp1y, cp2x, cp2y) => [
  { x: 0, y: 0, hIn: null, hOut: { dx: cp1x, dy: cp1y } },
  { x: 1, y: 1, hIn: { dx: cp2x - 1, dy: cp2y - 1 }, hOut: null },
];

// Catmull-Rom-to-Bezier smoothing for a polyline of points.
function smoothPolyline(points, tension = 0.5) {
  const n = points.length;
  const anchors = points.map((p) => ({ x: p.x, y: p.y, hIn: null, hOut: null }));
  for (let i = 0; i < n; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(n - 1, i + 1)];
    const dx = (next.x - prev.x) * tension * (1 / 3);
    const dy = (next.y - prev.y) * tension * (1 / 3);
    if (i > 0) anchors[i].hIn = { dx: -dx, dy: -dy };
    if (i < n - 1) anchors[i].hOut = { dx, dy };
  }
  return anchors;
}

function findLocalExtrema(f) {
  const N = 600;
  const ys = Array.from({ length: N + 1 }, (_, i) => f(i / N));
  const pts = [{ x: 0, y: ys[0] }];
  for (let i = 1; i < N; i++) {
    if ((ys[i] - ys[i - 1]) * (ys[i + 1] - ys[i]) < 0) pts.push({ x: i / N, y: ys[i] });
  }
  pts.push({ x: 1, y: ys[N] });
  return pts;
}

function elasticOutSamples() {
  const p = 0.3;
  const f = (x) => {
    if (x === 0) return 0;
    if (x === 1) return 1;
    return Math.pow(2, -10 * x) * Math.sin(((x - p / 4) * (2 * Math.PI)) / p) + 1;
  };
  return findLocalExtrema(f);
}

export const PRESETS = {
  // ─── Custom ───────────────────────────────────────────────────
  snap: {
    variants: {
      default: [
        { x: 0,     y: 0,     hIn: null,                        hOut: { dx: 0.01, dy: 0.627 } },
        { x: 0.131, y: 0.864, hIn: { dx: -0.056, dy: -0.068 }, hOut: { dx: 0.093, dy: 0.113 } },
        { x: 1,     y: 1,     hIn: { dx: -0.626, dy: 0 },      hOut: null },
      ],
      soft: [
        { x: 0,     y: 0,     hIn: null,                        hOut: { dx: 0.06, dy: 0.056 } },
        { x: 0.191, y: 0.859, hIn: { dx: -0.168, dy: -0.173 }, hOut: { dx: 0.109, dy: 0.112 } },
        { x: 1,     y: 1,     hIn: { dx: -0.626, dy: 0 },      hOut: null },
      ],
      inOut: [
        { x: 0,    y: 0,     hIn: null,                        hOut: { dx: 0.244, dy: 0 } },
        { x: 0.28, y: 0.856, hIn: { dx: -0.087, dy: -0.134 }, hOut: { dx: 0.072, dy: 0.11 } },
        { x: 1,    y: 1,     hIn: { dx: -0.626, dy: 0 },      hOut: null },
      ],
    },
  },
  drift: {
    variants: {
      default: cb(0.04, 0.9, 0.1, 1),
    },
  },
  settle: {
    variants: {
      default: cb(0.062, 1.562, 0.273, 0.975),
    },
  },
  bump: {
    variants: {
      soft: [
        { x: 0,    y: 0,    hIn: null,                       hOut: { dx: 0.05, dy: 0.06 } },
        { x: 0.21, y: 1.05, hIn: { dx: -0.1,  dy: -0.075 }, hOut: { dx: 0.08, dy: -0.056 } },
        { x: 1,    y: 1,    hIn: { dx: -0.58, dy: 0 },      hOut: null },
      ],
    },
  },
  none: { variants: { default: cb(0, 0, 1, 1) } },

  // ─── Penner classics ──────────────────────────────────────────
  power1:  { variants: { out: cb(0.25, 0.46, 0.45, 0.94),    inOut: cb(0.455, 0.03, 0.515, 0.955) } },
  power2:  { variants: { out: cb(0.215, 0.61, 0.355, 1),     inOut: cb(0.645, 0.045, 0.355, 1) } },
  power3:  { variants: { out: cb(0.165, 0.84, 0.44, 1),      inOut: cb(0.77, 0, 0.175, 1) } },
  power4:  { variants: { out: cb(0.23, 1, 0.32, 1),          inOut: cb(0.86, 0, 0.07, 1) } },
  back:    { variants: { out: cb(0.175, 0.885, 0.32, 1.275), inOut: cb(0.68, -0.55, 0.265, 1.55) } },
  circ:    { variants: { out: cb(0.075, 0.82, 0.165, 1),     inOut: cb(0.785, 0.135, 0.15, 0.86) } },
  elastic: { variants: { out: smoothPolyline(elasticOutSamples(), 0.5) } },
  expo:    { variants: { out: cb(0.19, 1, 0.22, 1),          inOut: cb(1, 0, 0, 1) } },
  sine:    { variants: { out: cb(0.39, 0.575, 0.565, 1),     inOut: cb(0.445, 0.05, 0.55, 0.95) } },
};

export const CORE_NAMES = [
  "snap", "drift", "settle", "bump", "none",
  "power1", "power2", "power3", "power4", "back", "circ", "elastic", "expo", "sine",
];

function toWords(s) {
  return s
    .replace(/([A-Z])/g, ' $1')
    .replace(/(\d+)/g, ' $1')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function formatLabel(name, variant) {
  if (name === "steps") return `steps${variant}`;
  const capVariant = variant === "default" ? "" : variant.charAt(0).toUpperCase() + variant.slice(1);
  return toWords(name + capVariant);
}

// snap: default → soft → inOut; Penner: out → inOut
const VARIANT_ORDER = ["in", "out", "default", "soft", "inOut"];

export function flattenPresets() {
  const out = [];
  for (const name of CORE_NAMES) {
    const preset = PRESETS[name];
    if (!preset) continue;
    const variantKeys = Object.keys(preset.variants);
    const ordered = [...variantKeys].sort((a, b) => {
      const ia = VARIANT_ORDER.indexOf(a);
      const ib = VARIANT_ORDER.indexOf(b);
      const sa = ia === -1 ? 100 : ia;
      const sb = ib === -1 ? 100 : ib;
      if (sa !== sb) return sa - sb;
      return a.localeCompare(b);
    });
    for (const v of ordered) {
      out.push({
        name,
        variant: v,
        key: `${name}.${v}`,
        label: formatLabel(name, v),
        anchors: preset.variants[v],
      });
    }
  }
  return out;
}

const _default = flattenPresets().find((p) => p.key === "drift.default");
export const DEFAULT_ANCHORS = _default.anchors;
export const DEFAULT_ACTIVE_KEY = _default.key;
