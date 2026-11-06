// Axially compressed, skinless lattice cylinder. Units: N, mm, MPa, kg.
// d and d90 are width / pitch, not widths.
// Local buckling follows Euler buckling of a rib segment between joints.
export const DEFAULTS = Object.freeze({ R: 500, L: 1000, E: 90000, E90: 90000,
  sigma: 500, rho: 1500, rho90: 1500, k: 1.2, count: 62, pMax: 5 });
export const MODES = ['strength', 'local', 'axis', 'nonaxis'];
const PI = Math.PI;
const rad = degrees => degrees * PI / 180;

export function validate(s) {
  for (const key of ['R', 'L', 'E', 'E90', 'sigma', 'rho', 'rho90', 'k', 'pMax']) {
    if (!Number.isFinite(s[key]) || s[key] <= 0) throw new RangeError(`${key} must be positive`);
  }
  if (!Number.isInteger(s.count) || s.count < 4 || s.count % 2) throw new RangeError('count must be an even integer ≥ 4');
}

export function capacities(s, { phi, h, d, d90 }) {
  const c2 = Math.cos(rad(phi)) ** 2, s2 = Math.sin(rad(phi)) ** 2;
  return {
    strength: 4 * PI * s.R * s.sigma * h * d * c2,
    local: 4 * PI ** 3 * s.k * s.E * s.R * h * d ** 3 * c2 ** 2 * s2 / 3,
    axis: 2 * PI * Math.sqrt(2 / 3) * h ** 2 * c2 * Math.sqrt(s.E * s.E90 * d * d90),
    nonaxis: 4 * PI * Math.sqrt(2 / 3) * s.E * d * h ** 2 * c2 * s2
      * Math.sqrt(1 + Math.sqrt(1 + s.E90 * d90 / (2 * s.E * d * s2 ** 2))),
  };
}

export function evaluate(s, p, design) {
  const P = PI * s.R ** 2 * p;
  const capacity = capacities(s, design);
  const reserves = Object.fromEntries(MODES.map(key => [key, capacity[key] / P]));
  const { phi, h, d, d90 } = design;
  const mass = 2 * PI * s.R * s.L * h * (2 * s.rho * d + s.rho90 * d90) * 1e-9;
  const a = 4 * PI * s.R / s.count;
  const aPhi = a * Math.cos(rad(phi));
  const a90 = a / (2 * Math.tan(rad(phi)));
  return { ...design, p, P, capacity, reserves, mass,
    arealMass: mass / (2 * PI * s.R * s.L * 1e-6),
    a, aPhi, a90, width: d * aPhi, width90: d90 * a90,
    ringIntervals: s.L / a90, active: MODES.filter(key => reserves[key] < 1.003),
    dense: 2 * d + d90 >= 1, thick: h / s.R > .1,
  };
}

// With t=h*d and r=d90/d, strength gives t>=P/(4*pi*R*sigma*c²).
// Global stability gives h>=P/(G*t); local stability gives h²<=A*t³/P.
// Hence t>=cbrt5(P³/(A*G²)). This eliminates h,d exactly and leaves
// two scalar searches (phi, log(r)). No penalty terms or unsafe candidates.
function candidate(s, p, phi, logRatio) {
  const r = Math.exp(logRatio), P = PI * s.R ** 2 * p;
  const c2 = Math.cos(rad(phi)) ** 2, s2 = 1 - c2;
  const A = 4 * PI ** 3 * s.k * s.E * s.R * c2 ** 2 * s2 / 3;
  const G0 = 2 * PI * Math.sqrt(2 / 3) * c2 * Math.sqrt(s.E * s.E90 * r);
  const Gn = 4 * PI * Math.sqrt(2 / 3) * s.E * c2 * s2
    * Math.sqrt(1 + Math.sqrt(1 + s.E90 * r / (2 * s.E * s2 ** 2)));
  const G = Math.min(G0, Gn);
  const t = Math.max(P / (4 * PI * s.R * s.sigma * c2), (P ** 3 / (A * G ** 2)) ** .2);
  const h = P / (G * t);
  return { phi, h, d: t / h, d90: r * t / h, value: t * (2 + s.rho90 / s.rho * r) };
}

// Scan all coarse intervals, then refine each local minimum, including cusps
// where the governing constraint switches. The endpoints are also candidates.
function minimize(fn, lo, hi, steps = 24) {
  const xs = Array.from({ length: steps + 1 }, (_, i) => lo + (hi - lo) * i / steps);
  const ys = xs.map(fn);
  let best = ys.reduce((a, b) => a.value < b.value ? a : b);
  for (let i = 1; i < steps; i++) {
    if (ys[i].value > ys[i - 1].value || ys[i].value > ys[i + 1].value) continue;
    let a = xs[i - 1], b = xs[i + 1];
    const q = (Math.sqrt(5) - 1) / 2;
    let x = b - q * (b - a), y = a + q * (b - a), fx = fn(x), fy = fn(y);
    for (let j = 0; j < 42; j++) {
      if (fx.value < fy.value) { b = y; y = x; fy = fx; x = b - q * (b - a); fx = fn(x); }
      else { a = x; x = y; fx = fy; y = a + q * (b - a); fy = fn(y); }
    }
    for (const result of [fx, fy]) if (result.value < best.value) best = result;
  }
  return best;
}

export function optimize(s, p, fixedPhi) {
  validate(s);
  if (!Number.isFinite(p) || p <= 0) throw new RangeError('p must be positive');
  if (fixedPhi !== undefined && (!Number.isFinite(fixedPhi) || fixedPhi < 1 || fixedPhi > 85)) throw new RangeError('phi outside 1–85 degrees');
  const atAngle = phi => minimize(logR => candidate(s, p, phi, logR), -12, 8);
  const design = fixedPhi === undefined ? minimize(atAngle, 1, 85, 42) : atAngle(fixedPhi);
  const result = evaluate(s, p, design);
  return { ...result, searchBoundary: design.phi < 1.001 || design.phi > 84.999 || design.d90 / design.d < Math.exp(-11.99) || design.d90 / design.d > Math.exp(7.99) };
}

// Axisymmetric analytical branch, used as an independent reference in tests.
// The height minimizes mass while local and axisymmetric stability are active.
export function analytical(s, p) {
  const { p1 } = transitions(s), P = PI * s.R ** 2 * p;
  const rhoRatio = s.rho90 / s.rho;
  const nr = Math.max(1, (p1 / p) ** .4);
  const h = (P ** 2 * s.k * rhoRatio * nr / (16 * s.E90 * s.sigma)) ** .25;
  const d = P * nr / (4 * PI * s.R * s.sigma * h)
    + 12 * s.R * s.sigma ** 2 * h / (PI * s.k * P * s.E * nr ** 2);
  const d90 = d * 6 * s.R ** 2 * s.sigma ** 2 / (s.E * s.E90 * h ** 2 * nr ** 2);
  const phi = Math.acos(Math.sqrt(P * nr / (4 * PI * s.R * s.sigma * h * d))) * 180 / PI;
  return evaluate(s, p, { h, d, d90, phi });
}

export function transitions(s) {
  const densityRatio = s.rho90 / s.rho;
  const p1 = 48 * s.sigma ** 2 / (PI * s.E) * Math.sqrt(densityRatio * s.sigma / (s.k * s.E90));
  const t = 2 * s.E * densityRatio / s.E90;
  // Larger root of (4x+1)² = 16tx, where x=p2/p1.
  // For t<25/16 even the low-load axisymmetric branch is invalid.
  const p2 = t >= 25 / 16 ? p1 * ((2 * t - 1) + 2 * Math.sqrt(t * (t - 1))) / 4 : null;
  return { p1, p2, analyticalValid: t >= 25 / 16 };
}

export function sweep(s, points = 101) {
  const { p1, p2, analyticalValid } = transitions(s);
  const loads = Array.from({ length: points }, (_, i) => s.pMax * (.01 + .99 * i / (points - 1)));
  if (analyticalValid) for (const p of [p1, p2]) if (p > loads[0] && p < s.pMax) loads.push(p);
  return loads.sort((a, b) => a - b).map(p => optimize(s, p));
}
