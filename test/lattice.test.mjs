import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, capacities, optimize, analytical, transitions, sweep } from '../src/lattice/core.js';
const s = DEFAULTS;
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) <= tol * Math.max(1, Math.abs(b)), `${a} != ${b}`);

test('осевая сила и масса восстанавливаются из дискретных длин рёбер', () => {
  const r = optimize(s, 4 / Math.PI), phi = r.phi * Math.PI / 180;
  near(r.P, 1e6);
  const mass = s.count * s.L / Math.cos(phi) * r.width * r.h * s.rho * 1e-9
    + s.L / r.a90 * 2 * Math.PI * s.R * r.width90 * r.h * s.rho90 * 1e-9;
  near(r.mass, mass);
  const ribForce = r.P / (s.count * Math.cos(phi));
  const stress = ribForce / (r.width * r.h);
  near(r.reserves.strength, s.sigma / stress);
  const segment = r.aPhi / Math.sin(2 * phi);
  const eulerStress = s.k * Math.PI ** 2 * s.E * r.width ** 2 / (12 * segment ** 2);
  near(r.reserves.local, eulerStress / stress);
});

test('общая устойчивость согласована с независимыми матрицами B и D', () => {
  const d = { phi: 31, h: 8, d: .09, d90: .05 };
  const c = Math.cos(d.phi * Math.PI / 180), q = Math.sin(d.phi * Math.PI / 180);
  const B11 = 2 * s.E * d.h * d.d * c ** 4;
  const B22 = d.h * (2 * s.E * d.d * q ** 4 + s.E90 * d.d90);
  const B12 = 2 * s.E * d.h * d.d * c ** 2 * q ** 2;
  const determinant = B11 * B22 - B12 ** 2;
  const D11 = B11 * d.h ** 2 / 12;
  const cap = capacities(s, d);
  near(cap.axis, 4 * Math.PI * Math.sqrt(D11 * determinant / B11));
  near(cap.nonaxis, 2 * Math.PI * d.h * Math.sqrt(2 * B12 * (Math.sqrt(B11 * B22) + B12) / 3));
});

test('численный оптимум совпадает с аналитическим до смены формы устойчивости', () => {
  for (const params of [s, { ...s, E: 140000, rho90: 1700 }]) {
    const { p1, p2 } = transitions(params);
    for (const p of [.2 * p1, .9 * p1, p1, (p1 + p2) / 2]) {
      const actual = optimize(params, p), expected = analytical(params, p);
      for (const key of ['mass', 'phi', 'h', 'd', 'd90']) near(actual[key], expected[key], 3e-5);
    }
    near(optimize(params, p1 / 2).phi, Math.atan(.5) * 180 / Math.PI, 1e-5);
  }
});

test('p₂ удовлетворяет равенству критических сил; после него аналитическая ветвь нарушает ограничение', () => {
  const { p1, p2 } = transitions(s);
  const r = analytical(s, p2);
  near(r.capacity.axis, r.capacity.nonaxis);
  near(analytical(s, p1).reserves.strength, 1);
  assert.ok(analytical(s, 1.2 * p2).reserves.nonaxis < 1);
  const corrected = optimize(s, 1.2 * p2);
  assert.ok(Math.min(...Object.values(corrected.reserves)) > 1 - 1e-8);
  assert.ok(corrected.mass > analytical(s, 1.2 * p2).mass);
});

test('весь диапазон выполним, включая материалы без стандартной аналитической ветви', () => {
  for (const params of [s, { ...s, E: 30000, E90: 180000, rho90: 800, k: 1.5 }]) {
    for (const r of sweep(params, 31)) {
      for (const value of Object.values(r.reserves)) assert.ok(Number.isFinite(value) && value >= 1 - 1e-8);
      assert.ok(r.mass > 0 && r.width > 0 && r.width90 > 0 && r.h > 0);
    }
  }
  assert.equal(transitions({ ...s, E: 30000, E90: 180000 }).analyticalValid, false);
});

test('масштабирование радиуса, длины, плотностей и числа спиральных рёбер', () => {
  const base = optimize(s, 2);
  const radius = optimize({ ...s, R: s.R * 2 }, 2);
  near(radius.phi, base.phi); near(radius.h, base.h * 2); near(radius.mass, base.mass * 4);
  const length = optimize({ ...s, L: s.L * 3 }, 2);
  near(length.mass, base.mass * 3); near(length.h, base.h);
  const density = optimize({ ...s, rho: s.rho * 2, rho90: s.rho90 * 2 }, 2);
  near(density.mass, base.mass * 2); near(density.h, base.h);
  const count = optimize({ ...s, count: s.count * 2 }, 2);
  near(count.width, base.width / 2); near(count.width90, base.width90 / 2); near(count.mass, base.mass);
});

test('свободный оптимум не тяжелее решений при заданном угле; отрицательный ввод отклоняется', () => {
  const best = optimize(s, 5);
  for (const phi of [5, 10, 20, 30, 45, 60, 80]) {
    const fixed = optimize(s, 5, phi);
    assert.ok(best.mass <= fixed.mass * (1 + 1e-7));
    assert.ok(Math.min(...Object.values(fixed.reserves)) >= 1 - 1e-8);
  }
  for (const p of [0, -1, NaN, Infinity]) assert.throws(() => optimize(s, p), RangeError);
  assert.throws(() => optimize({ ...s, count: 61 }, 1), RangeError);
  assert.throws(() => optimize({ ...s, E: 0 }, 1), RangeError);
  assert.throws(() => optimize(s, 1, 0), RangeError);
});
