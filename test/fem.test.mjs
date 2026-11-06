import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, preset, makeModel, assemble, solve, exactSolution, errors, sampleFE } from '../src/fem/core.js';
import { nodeContributions, rowTerms, symbolVector } from '../src/fem/notation.js';
import katex from 'katex';

const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const run = (settings = {}) => { const model = makeModel({ ...DEFAULTS, ...settings }); return { model, result: solve(model) }; };

test('node lesson: local end forces reconstruct every global row and satisfy node equilibrium', () => {
  for (const count of [1, 2, 5, 32]) {
    const { model, result: r } = run({ count, heterogeneous: count > 1, q: -3, left: 'prescribed', uLeft: -.2, right: 'force', forceRight: 170 });
    model.nodes.forEach((_, i) => {
      const parts = nodeContributions(r, i), row = model.nodes.map(() => 0);
      let load = model.forces[i], endForceSum = 0;
      for (const c of parts) {
        c.element.nodes.forEach((j, b) => { row[j] += c.coefficients[b]; });
        load += c.load;
        endForceSum += c.element.nodes.reduce((sum, j, b) => sum + c.coefficients[b] * r.u[j], 0) - c.load;
      }
      row.forEach((value, j) => near(value, r.K[i][j]));
      near(load, r.f[i]);
      near(endForceSum, model.forces[i] + r.reactions[i]);
    });
  }
});

test('lesson notation retains unknown names and shows signed and zero prescribed substitutions', () => {
  const row = [14000, -28000, 14000];
  assert.equal(rowTerms(row), '14000u_{1}-28000u_{2}+14000u_{3}');
  const substituted = rowTerms(row, undefined, new Map([[0, 0], [2, -.2]]));
  assert.ok(substituted.includes('u_{2}'));
  assert.ok(substituted.includes('boxed{0}'));
  assert.ok(substituted.includes('boxed{-0.2}'));
  assert.equal(rowTerms(row, undefined, new Map([[0, 0], [2, -.2]]), false), '14000\\cdot 0-28000u_{2}+14000\\cdot (-0.2)');
  for (const formula of [substituted, symbolVector([1, 2, 3])]) assert.doesNotThrow(() => katex.renderToString(formula, { throwOnError: true }));
});

test('lecture: two fixed ends, uniform load, exact middle displacement and reactions', () => {
  const { model, result: r } = run();
  assert.equal(r.status, 'ok');
  const { length: L, q, E, area: A } = DEFAULTS;
  near(r.u[0], 0); near(r.u[1], q * L * L / (8 * E * A)); near(r.u[2], 0);
  near(r.reactions[0], -q * L / 2); near(r.reactions[2], -q * L / 2);
  near(r.fields[0].N, q * L / 4); near(r.fields[1].N, -q * L / 4);
  near(r.fields[0].endForces[1], 0); near(r.fields[1].endForces[0], 0);
  near(r.balance, 0);
  const fe = sampleFE(model, r, 0, .5);
  near(fe.u, q * L * L / (16 * E * A));
  near(exactSolution(model)(L / 4).u, 3 * q * L * L / (32 * E * A));
});

test('assembly: shared DOFs add stiffness AND equivalent load; rigid translation has zero strain energy', () => {
  const { model } = run();
  const a = assemble(model), first = assemble(model, 1);
  const k = 2 * DEFAULTS.E * DEFAULTS.area / DEFAULTS.length;
  assert.deepEqual(a.K, [[k, -k, 0], [-k, 2 * k, -k], [0, -k, k]]);
  assert.deepEqual(a.f, [2500, 5000, 2500]);
  assert.deepEqual(first.f, [2500, 2500, 0]);
  for (const row of a.K) near(row.reduce((a, b) => a + b), 0);
});

test('end force: exact linear solution for every mesh, including one element', () => {
  for (const count of [1, 2, 7, 32, 64]) {
    const { model, result: r } = run({ ...preset('tension'), count });
    near(r.u.at(-1), 10000 * DEFAULTS.length / (DEFAULTS.E * DEFAULTS.area));
    near(r.reactions[0], -10000);
    r.fields.forEach(f => near(f.N, 10000));
    near(errors(model, r).maxU, 0);
  }
});

test('nonzero prescribed motion shifts the reduced RHS; inactive end-force input is ignored', () => {
  const { result: r } = run({ q: 0, left: 'prescribed', uLeft: 2, right: 'prescribed', uRight: 3, forceLeft: 123 });
  assert.equal(r.status, 'ok');
  near(r.u[1], 2.5);
  near(r.fields[0].N, DEFAULTS.E * DEFAULTS.area / DEFAULTS.length);
  near(r.reactions[0], -7000); near(r.reactions[2], 7000);
  near(r.reducedF[0], 70000); near(r.correction[0], -70000);
  near(r.balance, 0);
});

test('one element with two prescribed DOFs: empty reduced system still recovers reactions', () => {
  const { result: r } = run({ count: 1 });
  assert.equal(r.status, 'ok');
  assert.deepEqual(r.free, []);
  assert.deepEqual(r.u, [0, 0]);
  near(r.reactions[0], -5000); near(r.reactions[1], -5000);
});

test('free bar distinguishes nonunique balanced loads and an unbalanced resultant', () => {
  const a = run({ left: 'free', right: 'free' }).result;
  assert.equal(a.status, 'unrestrained'); near(a.resultant, 10000);
  const b = run({ left: 'force', right: 'force', q: 0, forceLeft: -100, forceRight: 100 }).result;
  assert.equal(b.status, 'unrestrained'); near(b.resultant, 0);
  assert.equal(b.u, undefined);
});

test('two material regions: physical interface survives odd mesh counts, exact serial compliance', () => {
  for (const count of [2, 3, 9, 32]) {
    const { model, result: r } = run({ ...preset('stepped'), count });
    assert.ok(model.nodes.includes(500)); assert.equal(model.elements.length, count);
    near(r.u.at(-1), 10000 * (500 / 7000000 + 500 / 3500000));
    near(errors(model, r).maxU, 0);
    near(exactSolution(model)(1000).u, r.u.at(-1));
  }
});

test('uniform load convergence: displacement error decreases fourfold, energy error halves', () => {
  let previous;
  for (const count of [2, 4, 8, 16]) {
    const { model, result: r } = run({ count });
    const err = errors(model, r);
    const exact = exactSolution(model);
    model.nodes.forEach((x, i) => near(r.u[i], exact(x).u));
    if (previous) { near(previous.maxU / err.maxU, 4); near(previous.relativeEnergy / err.relativeEnergy, 2); }
    previous = err;
  }
});

test('right support only and negative loads: signs, boundary conditions, exact reference', () => {
  const { model, result: r } = run({ left: 'force', right: 'prescribed', uRight: -.5, q: -3, forceLeft: -200, count: 7 });
  near(r.reactions.at(-1), 3200); near(r.u.at(-1), -.5); near(r.balance, 0);
  const exact = exactSolution(model);
  model.nodes.forEach((x, i) => near(r.u[i], exact(x).u));
  near(exact(0).N, 200); near(exact(1000).N, 3200);
});

test('heterogeneous, both prescribed: independent continuum solution and global equilibrium', () => {
  const { model, result: r } = run({ heterogeneous: true, E2: 120000, area2: 60, count: 5, left: 'prescribed', uLeft: -.2, right: 'prescribed', uRight: .7, q: 5, forceRight: -90 });
  const exact = exactSolution(model);
  model.nodes.forEach((x, i) => near(r.u[i], exact(x).u));
  near(r.balance, 0);
  r.free.forEach(i => near(r.residual[i], 0));
});

test('invalid physical parameters never reach the solver', () => {
  for (const patch of [{ length: 0 }, { E: -1 }, { area: NaN }, { count: 1.5 }, { count: 65 }, { q: Infinity }, { left: 'roller' }]) {
    assert.throws(() => makeModel({ ...DEFAULTS, ...patch }), RangeError);
  }
});

test('switching either end between force, fixed, displacement and free leaves no hidden loading', () => {
  for (const side of ['left', 'right']) {
    const at = side === 'left' ? 0 : 2;
    const opposite = side === 'left' ? 2 : 0;
    const settings = { q: 0, forceLeft: 10000, forceRight: 10000, uLeft: 1, uRight: 1 };
    const loaded = run({ ...settings, [side]: 'force' });
    near(loaded.result.u[at], 10000 * DEFAULTS.length / (DEFAULTS.E * DEFAULTS.area));
    near(loaded.result.reactions[opposite], -10000);
    assert.equal(loaded.model.constraints.length, 1);
    const fixed = run({ ...settings, [side]: 'fixed' });
    fixed.result.u.forEach(u => near(u, 0));
    fixed.result.reactions.forEach(r => near(r, 0));
    const moved = run({ ...settings, [side]: 'prescribed' });
    near(moved.result.u[at], 1);
    near(moved.result.reactions[at], 7000);
    near(moved.result.reactions[opposite], -7000);
    const free = run({ ...settings, [side]: 'free' });
    free.result.u.forEach(u => near(u, 0));
    free.result.reactions.forEach(r => near(r, 0));
    assert.equal(free.model.constraints.length, 1);
  }
});
