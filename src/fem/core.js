// Axial, small-strain, two-node bar elements. Units: N, mm, MPa (N/mm²).
// No browser dependencies: intermediate data are also the data shown in the lesson.
export const DEFAULTS = Object.freeze({
  length: 1000, E: 70000, area: 100, count: 2, q: 10,
  forceLeft: 0, forceRight: 0, left: 'fixed', right: 'fixed',
  uLeft: 0, uRight: 0, heterogeneous: false, E2: 35000, area2: 100,
});

export function preset(name) {
  const s = { ...DEFAULTS };
  if (name === 'tension') Object.assign(s, { q: 0, right: 'force', forceRight: 10000 });
  if (name === 'stepped') Object.assign(s, { q: 0, right: 'force', forceRight: 10000, heterogeneous: true });
  if (name === 'settlement') Object.assign(s, { q: 0, right: 'prescribed', uRight: 1 });
  if (name === 'free') Object.assign(s, { left: 'free', right: 'free' });
  return s;
}

export function makeModel(s) {
  for (const key of ['length', 'E', 'area', ...(s.heterogeneous ? ['E2', 'area2'] : [])]) {
    if (!Number.isFinite(s[key]) || s[key] <= 0) throw new RangeError(`Invalid ${key}`);
  }
  for (const key of ['q', 'forceLeft', 'forceRight', 'uLeft', 'uRight']) {
    if (!Number.isFinite(s[key])) throw new RangeError(`Invalid ${key}`);
  }
  if (!Number.isInteger(s.count) || s.count < 1 || s.count > 64) throw new RangeError('Invalid count');
  if (![s.left, s.right].every(x => ['free', 'fixed', 'prescribed', 'force'].includes(x))) throw new RangeError('Invalid boundary');
  // The material interface stays at L/2 under refinement, including odd meshes.
  const count = Math.max(s.heterogeneous ? 2 : 1, s.count);
  const leftCount = Math.floor(count / 2);
  const nodes = Array.from({ length: count + 1 }, (_, i) => s.heterogeneous
    ? (i <= leftCount ? i / leftCount / 2 : .5 + (i - leftCount) / (count - leftCount) / 2) * s.length
    : i * s.length / count);
  const elements = Array.from({ length: count }, (_, i) => {
    const second = s.heterogeneous && i >= leftCount;
    return { nodes: [i, i + 1], E: second ? s.E2 : s.E, area: second ? s.area2 : s.area, q: s.q };
  });
  const forces = nodes.map(() => 0);
  // Endpoint conditions are exclusive. Remembered input values from inactive
  // modes must never introduce hidden loads or displacement constraints.
  forces[0] = s.left === 'force' ? s.forceLeft : 0;
  forces[count] = s.right === 'force' ? s.forceRight : 0;
  const constraints = [];
  if (s.left === 'fixed' || s.left === 'prescribed') constraints.push({ node: 0, value: s.left === 'fixed' ? 0 : s.uLeft });
  if (s.right === 'fixed' || s.right === 'prescribed') constraints.push({ node: count, value: s.right === 'fixed' ? 0 : s.uRight });
  return { nodes, elements, forces, constraints };
}

export function elementData(model, index) {
  const e = model.elements[index];
  const [i, j] = e.nodes;
  const length = model.nodes[j] - model.nodes[i];
  const alpha = e.E * e.area / length;
  return { ...e, index, length, alpha, k: [[alpha, -alpha], [-alpha, alpha]], load: [e.q * length / 2, e.q * length / 2] };
}

export function assemble(model, count = model.elements.length) {
  const n = model.nodes.length;
  const K = Array.from({ length: n }, () => Array(n).fill(0));
  const distributed = Array(n).fill(0);
  const elements = model.elements.map((_, i) => elementData(model, i));
  for (const e of elements.slice(0, count)) {
    e.nodes.forEach((i, a) => {
      distributed[i] += e.load[a];
      e.nodes.forEach((j, b) => { K[i][j] += e.k[a][b]; });
    });
  }
  const f = distributed.map((v, i) => v + model.forces[i]);
  return { K, f, distributed, elements };
}

// Row scaling and partial pivoting; solve the reduced system, never invert K.
function solveLinear(K, f) {
  const n = f.length;
  const a = K.map((row, i) => {
    const scale = Math.max(...row.map(Math.abs));
    if (!scale) throw new Error('singular');
    return [...row.map(v => v / scale), f[i] / scale];
  });
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(a[i][k]) > Math.abs(a[p][k])) p = i;
    if (Math.abs(a[p][k]) < 1e-12) throw new Error('singular');
    [a[k], a[p]] = [a[p], a[k]];
    for (let i = k + 1; i < n; i++) {
      const r = a[i][k] / a[k][k];
      for (let j = k; j <= n; j++) a[i][j] -= r * a[k][j];
    }
  }
  const u = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    u[i] = (a[i][n] - a[i].slice(i + 1, n).reduce((v, x, j) => v + x * u[i + j + 1], 0)) / a[i][i];
  }
  return u;
}

export function solve(model) {
  const assembly = assemble(model);
  const { K, f, elements } = assembly;
  const fixed = model.constraints.map(c => c.node);
  const free = model.nodes.map((_, i) => i).filter(i => !fixed.includes(i));
  const prescribed = model.constraints.map(c => c.value);
  const reducedK = free.map(i => free.map(j => K[i][j]));
  const correction = free.map(i => fixed.reduce((v, j, c) => v + K[i][j] * prescribed[c], 0));
  const reducedF = free.map((i, a) => f[i] - correction[a]);
  const base = { ...assembly, fixed, free, prescribed, reducedK, reducedF, correction };
  if (!fixed.length) return { ...base, status: 'unrestrained', resultant: f.reduce((a, b) => a + b, 0) };
  let unknown;
  try { unknown = solveLinear(reducedK, reducedF); }
  catch { return { ...base, status: 'singular' }; }
  const u = model.nodes.map(() => 0);
  fixed.forEach((i, a) => { u[i] = prescribed[a]; });
  free.forEach((i, a) => { u[i] = unknown[a]; });
  // Original K and the complete external load vector are retained for reactions.
  const residual = K.map((row, i) => row.reduce((v, k, j) => v + k * u[j], 0) - f[i]);
  const reactions = residual.map((r, i) => fixed.includes(i) ? r : 0);
  const fields = elements.map(e => {
    const [i, j] = e.nodes;
    const strain = (u[j] - u[i]) / e.length;
    const stress = e.E * strain;
    return { strain, stress, N: stress * e.area, endForces: e.k.map((row, a) => row[0] * u[i] + row[1] * u[j] - e.load[a]) };
  });
  const balance = f.reduce((a, b) => a + b, 0) + reactions.reduce((a, b) => a + b, 0);
  const energy = .5 * u.reduce((sum, v, i) => sum + v * K[i].reduce((s, k, j) => s + k * u[j], 0), 0);
  return { ...base, status: 'ok', u, residual, reactions, fields, balance, energy };
}

// Independent continuum solution: integrate N'=-q, u'=N/(EA).
// Exact for the supported piecewise-constant properties/loads and endpoint BCs.
export function exactSolution(model) {
  if (!model.constraints.length) return null;
  let compliance = 0, loadIntegral = 0, load = 0;
  const sections = model.elements.map((_, i) => {
    const e = elementData(model, i);
    const section = { ...e, x: model.nodes[e.nodes[0]], compliance, loadIntegral, load };
    const EA = e.E * e.area;
    compliance += e.length / EA;
    loadIntegral += (load * e.length + e.q * e.length ** 2 / 2) / EA;
    load += e.q * e.length;
    return section;
  });
  const left = model.constraints.find(c => c.node === 0);
  const right = model.constraints.find(c => c.node === model.nodes.length - 1);
  const C = left && right ? (right.value - left.value + loadIntegral) / compliance
    : left ? model.forces.at(-1) + load : -model.forces[0];
  const D = left ? left.value : right.value - C * compliance + loadIntegral;
  return (x, elementIndex) => {
    const clamped = Math.max(0, Math.min(model.nodes.at(-1), x));
    const e = elementIndex === undefined
      ? sections.find(s => clamped < s.x + s.length - 1e-10) || sections.at(-1)
      : sections[elementIndex];
    const dx = clamped - e.x;
    const N = C - e.load - e.q * dx;
    const u = D + C * (e.compliance + dx / (e.E * e.area))
      - e.loadIntegral - (e.load * dx + e.q * dx ** 2 / 2) / (e.E * e.area);
    return { u, N, stress: N / e.area, strain: N / (e.E * e.area) };
  };
}

export function sampleFE(model, result, elementIndex, xi) {
  const e = model.elements[elementIndex];
  const [i, j] = e.nodes;
  return { x: model.nodes[i] + (model.nodes[j] - model.nodes[i]) * xi,
    u: (1 - xi) * result.u[i] + xi * result.u[j], ...result.fields[elementIndex] };
}

export function errors(model, result) {
  if (result.status !== 'ok') return null;
  const exact = exactSolution(model);
  let maxU = 0, squared = 0, energyError = 0, energyExact = 0;
  const points = [-Math.sqrt(3 / 5), 0, Math.sqrt(3 / 5)];
  const weights = [5 / 9, 8 / 9, 5 / 9];
  result.elements.forEach((e, i) => {
    for (const xi of [0, .5, 1]) {
      const fe = sampleFE(model, result, i, xi);
      maxU = Math.max(maxU, Math.abs(fe.u - exact(fe.x, i).u));
    }
    points.forEach((p, k) => {
      const fe = sampleFE(model, result, i, (p + 1) / 2);
      const ref = exact(fe.x, i);
      const w = weights[k] * e.length / 2;
      squared += (fe.u - ref.u) ** 2 * w;
      energyError += e.E * e.area * (fe.strain - ref.strain) ** 2 * w;
      energyExact += e.E * e.area * ref.strain ** 2 * w;
    });
  });
  return { maxU, rmsU: Math.sqrt(squared / model.nodes.at(-1)),
    relativeEnergy: energyExact > 1e-24 ? Math.sqrt(energyError / energyExact) : 0 };
}
