// Cubic Bezier helpers. Anchors carry handles as deltas from the anchor.
// anchor: { x, y, hIn: {dx,dy}|null, hOut: {dx,dy}|null }

export function handlePoint(anchor, side) {
  const h = side === "in" ? anchor.hIn : anchor.hOut;
  if (!h) return null;
  return { x: anchor.x + h.dx, y: anchor.y + h.dy };
}

export function bezierPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  return {
    x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
    y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
  };
}

export function buildPathString(anchors) {
  if (anchors.length < 2) return "";
  const fmt = (n) => {
    const r = Math.round(n * 1000) / 1000;
    return Object.is(r, -0) ? "0" : String(r);
  };
  let d = `M${fmt(anchors[0].x)},${fmt(anchors[0].y)}`;
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1];
    const b = anchors[i];
    const c1 = handlePoint(a, "out") || { x: a.x, y: a.y };
    const c2 = handlePoint(b, "in") || { x: b.x, y: b.y };
    d += ` C${fmt(c1.x)},${fmt(c1.y)} ${fmt(c2.x)},${fmt(c2.y)} ${fmt(b.x)},${fmt(b.y)}`;
  }
  return d;
}

export function curveGoesBackward(anchors) {
  const samples = sampleCurve(anchors, 64);
  for (let i = 1; i < samples.length; i++) {
    if (samples[i].x < samples[i - 1].x) return true;
  }
  return false;
}

export function buildLinearCss(anchors, stops = 17) {
  if (anchors.length < 2) return "linear(0, 1)";
  const samples = sampleCurve(anchors);
  const fmt = (n) => {
    const r = Math.round(n * 10000) / 10000;
    return Object.is(r, -0) ? "0" : String(r);
  };
  const ys = [];
  for (let i = 0; i < stops; i++) {
    const x = i / (stops - 1);
    ys.push(fmt(sampleY(samples, x)));
  }
  return `linear(${ys.join(", ")})`;
}

// Sample the whole curve into a sorted [x,y] table for fast progress→value lookup.
export function sampleCurve(anchors, perSegment = 64) {
  const samples = [];
  for (let i = 1; i < anchors.length; i++) {
    const a = anchors[i - 1];
    const b = anchors[i];
    const p0 = { x: a.x, y: a.y };
    const p3 = { x: b.x, y: b.y };
    const p1 = handlePoint(a, "out") || p0;
    const p2 = handlePoint(b, "in") || p3;
    const start = i === 1 ? 0 : 1;
    for (let s = start; s <= perSegment; s++) {
      const t = s / perSegment;
      samples.push(bezierPoint(p0, p1, p2, p3, t));
    }
  }
  return samples;
}

export function sampleY(samples, x) {
  if (!samples.length) return 0;
  if (x <= samples[0].x) return samples[0].y;
  if (x >= samples[samples.length - 1].x) return samples[samples.length - 1].y;
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].x <= x) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const dx = b.x - a.x;
  if (dx === 0) return a.y;
  const t = (x - a.x) / dx;
  return a.y + (b.y - a.y) * t;
}

// De Casteljau split of segment between anchors[i-1] and anchors[i] at parameter t.
// Returns the new middle anchor and the updated handle deltas for the neighbours.
export function splitSegment(prev, next, t) {
  const p0 = { x: prev.x, y: prev.y };
  const p3 = { x: next.x, y: next.y };
  const p1 = handlePoint(prev, "out") || p0;
  const p2 = handlePoint(next, "in") || p3;

  const lerp = (a, b) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  const q0 = lerp(p0, p1);
  const q1 = lerp(p1, p2);
  const q2 = lerp(p2, p3);
  const r0 = lerp(q0, q1);
  const r1 = lerp(q1, q2);
  const m = lerp(r0, r1);

  const newAnchor = {
    x: m.x,
    y: m.y,
    hIn: { dx: r0.x - m.x, dy: r0.y - m.y },
    hOut: { dx: r1.x - m.x, dy: r1.y - m.y },
  };
  return {
    newAnchor,
    leftHOut: { dx: q0.x - prev.x, dy: q0.y - prev.y },
    rightHIn: { dx: q2.x - next.x, dy: q2.y - next.y },
  };
}

// Fit a CSS cubic-bezier(x1,y1,x2,y2) to the curve.
// 2-anchor curves: exact extraction. Multi-anchor: iterative least-squares.
export function fitCubicBezier(anchors, samples) {
  if (anchors.length === 2) {
    const a0 = anchors[0], a1 = anchors[1];
    const x1 = a0.x + (a0.hOut?.dx ?? 0);
    const y1 = a0.y + (a0.hOut?.dy ?? 0);
    const x2 = a1.x + (a1.hIn?.dx ?? 0);
    const y2 = a1.y + (a1.hIn?.dy ?? 0);
    return { x1, y1, x2, y2, exact: true };
  }

  const N = 64;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const x = i / (N - 1);
    pts.push({ x, y: sampleY(samples, x) });
  }

  let x1 = 1 / 3, x2 = 2 / 3, y1 = 0, y2 = 1;
  for (let iter = 0; iter < 8; iter++) {
    const ts = pts.map(p => _solveBezierT(p.x, x1, x2));
    [y1, y2] = _lsqFit2(ts, pts.map(p => p.y), null);
    [x1, x2] = _lsqFit2(ts, pts.map(p => p.x), [0, 1]);
  }
  return { x1, y1, x2, y2, exact: false };
}

function _solveBezierT(x, x1, x2) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let lo = 0, hi = 1;
  for (let i = 0; i < 16; i++) {
    const mid = (lo + hi) / 2;
    const bx = 3 * mid * (1 - mid) * (1 - mid) * x1 + 3 * mid * mid * (1 - mid) * x2 + mid * mid * mid;
    if (bx < x) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

function _lsqFit2(ts, vs, clamp) {
  let a00 = 0, a01 = 0, a11 = 0, b0 = 0, b1 = 0;
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i], v = vs[i];
    const bb1 = 3 * t * (1 - t) * (1 - t);
    const bb2 = 3 * t * t * (1 - t);
    const r = v - t * t * t;
    a00 += bb1 * bb1; a01 += bb1 * bb2; a11 += bb2 * bb2;
    b0 += bb1 * r; b1 += bb2 * r;
  }
  const det = a00 * a11 - a01 * a01;
  if (Math.abs(det) < 1e-12) return [1 / 3, 2 / 3];
  let p1 = (a11 * b0 - a01 * b1) / det;
  let p2 = (a00 * b1 - a01 * b0) / det;
  if (clamp) {
    p1 = Math.max(clamp[0], Math.min(clamp[1], p1));
    p2 = Math.max(clamp[0], Math.min(clamp[1], p2));
  }
  return [p1, p2];
}

export function buildCubicBezierCss(anchors, samples) {
  const { x1, y1, x2, y2, exact } = fitCubicBezier(anchors, samples);
  const fmt = (n) => {
    const r = Math.round(n * 1000) / 1000;
    return Object.is(r, -0) ? "0" : String(r);
  };
  let error = 0;
  if (!exact && samples.length > 0) {
    let sumSq = 0;
    const N = 48;
    for (let i = 0; i < N; i++) {
      const x = i / (N - 1);
      const t = _solveBezierT(x, x1, x2);
      const fy = 3 * t * (1 - t) * (1 - t) * y1 + 3 * t * t * (1 - t) * y2 + t * t * t;
      const ay = sampleY(samples, x);
      sumSq += (fy - ay) ** 2;
    }
    error = Math.sqrt(sumSq / N);
  }
  return { str: `cubic-bezier(${fmt(x1)}, ${fmt(y1)}, ${fmt(x2)}, ${fmt(y2)})`, exact, x1, y1, x2, y2, error };
}

export function findSegmentForX(anchors, x) {
  for (let i = 1; i < anchors.length; i++) {
    if (x >= anchors[i - 1].x && x <= anchors[i].x) return i;
  }
  return Math.min(anchors.length - 1, 1);
}

export function solveTForX(p0, p1, p2, p3, targetX) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const x = bezierPoint(p0, p1, p2, p3, mid).x;
    if (x < targetX) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
