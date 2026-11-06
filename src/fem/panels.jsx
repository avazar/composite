import { useMemo } from 'preact/hooks';
import { makeModel, solve, errors } from './core.js';
import { useText, Panel } from './ui.jsx';

export function Matrix({ values, rowIds, colIds = rowIds, selected, onCell, onRow, elementNodes = [], elementColor, fixed = [], activeRow, pendingRows = [], label, unit }) {
  const { t, f } = useText();
  return <div class="fem-matrix-scroll" tabIndex="0" role="region" aria-label={label} style={{ '--matrix-element-color': elementColor }}>
    <table class="fem-matrix"><caption>{label} {unit && <span class="unit">· {unit}</span>}</caption>
      <thead><tr><th scope="col">{t('Узел', 'Node')}</th>{colIds.map(j => <th scope="col" key={j}>u<sub>{j + 1}</sub></th>)}</tr></thead>
      <tbody>{values.map((row, a) => <tr key={rowIds[a]} class={rowIds[a] === activeRow ? 'fem-active-row' : fixed.includes(rowIds[a]) ? 'fem-fixed-row' : ''}>
        <th scope="row">{onRow ? <button type="button" onClick={() => onRow(rowIds[a])} title={t('Равновесие узла', 'Node equilibrium')}>{rowIds[a] + 1}</button> : rowIds[a] + 1}</th>
        {row.map((value, b) => {
          const i = rowIds[a], j = colIds[b];
          const cls = [value === 0 ? 'fem-zero' : '', selected && selected[0] === i && selected[1] === j ? 'fem-picked-cell' : '', elementNodes.includes(i) && elementNodes.includes(j) ? 'fem-element-cell' : ''].join(' ');
          return <td key={j} class={cls}>{pendingRows.includes(i) ? <span class="fem-pending">···</span> : onCell ? <button type="button" aria-label={`K${i + 1},${j + 1} = ${f(value)}`} aria-pressed={selected?.[0] === i && selected?.[1] === j} onClick={() => onCell([i, j])}>{f(value)}</button> : f(value)}</td>;
        })}
      </tr>)}</tbody>
    </table>
  </div>;
}

export function Convergence({ settings, model, result, onCount }) {
  const { t, f } = useText();
  const current = errors(model, result);
  const rows = useMemo(() => [1, 2, 4, 8, 16, 32].filter(n => !settings.heterogeneous || n >= 2).map(count => {
    const m = makeModel({ ...settings, count });
    const r = solve(m);
    return { count, error: errors(m, r) };
  }), [settings]);
  if (!current) return null;
  return <Panel title={t('Точность и сгущение сетки', 'Accuracy and mesh refinement')}>
    <div class="fem-metrics"><div><span>{t('Максимальная ошибка u(x)', 'Maximum error in u(x)')}</span><strong>{f(current.maxU)} {t('мм', 'mm')}</strong></div><div><span>{t('Относительная энергетическая ошибка', 'Relative energy-norm error')}</span><strong>{f(current.relativeEnergy * 100)} %</strong></div></div>
    <p class="note">{t('Сравнение с аналитическим решением уравнений N′ = −t и u′ = N/(EF). Энергетическая ошибка измеряет отличие деформаций с весом EF.', 'Compared with the analytical solution of N′ = −t and u′ = N/(EF). The energy-norm error measures the strain difference weighted by EF.')}</p>
    <div class="fem-table-scroll"><table class="fem-table"><thead><tr><th>{t('Число КЭ', 'Elements')}</th><th>max |u − uₕ|, {t('мм', 'mm')}</th><th>{t('Энергетическая, %', 'Energy norm, %')}</th></tr></thead><tbody>{rows.map(row => <tr key={row.count} class={row.count === model.elements.length ? 'fem-active-row' : ''}><th><button class="link-btn" type="button" onClick={() => onCount(row.count)}>{row.count}</button></th><td>{f(row.error?.maxU)}</td><td>{f(row.error ? row.error.relativeEnergy * 100 : NaN)}</td></tr>)}</tbody></table></div>
    {rows.some(row => !row.error) && <p class="note">{t('Прочерк: система численно вырождена при таком соотношении жёсткостей.', 'A dash indicates numerical singularity at this stiffness ratio.')}</p>}
    <p class="note">{t('Нажмите число КЭ, чтобы применить сетку. Длина, свойства, нагрузки и ГУ сохраняются. При t = 0 линейные элементы воспроизводят точное решение для этих участков.', 'Select an element count to apply that mesh. Length, properties, loads and boundary conditions stay unchanged. With t = 0, linear elements reproduce the exact solution in these regions.')}</p>
  </Panel>;
}
