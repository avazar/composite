import { useMemo, useState } from 'preact/hooks';
import { niceTicks } from '../ui/common.jsx';
import { useText } from '../fem/ui.jsx';

export const COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--c-tsaiWu)', 'var(--series-3)'];
export function Plot({ title, unit, rows, series, selected, onSelect, markers = [], baseline, xKey = 'p', xLabel, reference }) {
  const { t, f } = useText();
  const W = 560, H = 260, left = 59, right = 18, top = 22, bottom = 40;
  const xmin = rows[0][xKey], xmax = rows.at(-1)[xKey];
  const values = [...rows, ...(baseline || [])].flatMap(row => series.map(s => s.get(row))).filter(Number.isFinite);
  const low = Math.min(...values, reference ?? Infinity), high = Math.max(...values, reference ?? -Infinity);
  const min = Math.max(0, low - (high - low) * .15), max = high + Math.max((high - low) * .12, high * .03, .01);
  const x = v => left + (v - xmin) / (xmax - xmin) * (W - left - right);
  const y = v => H - bottom - (v - min) / (max - min) * (H - top - bottom);
  const xticks = niceTicks(xmin, xmax, 5).ticks, yticks = niceTicks(min, max, 4).ticks;
  const path = (data, get) => data.map((row, i) => `${i ? 'L' : 'M'}${x(row[xKey]).toFixed(2)},${y(get(row)).toFixed(2)}`).join(' ');
  function choose(ev) {
    const svg = ev.currentTarget;
    const point = svg.createSVGPoint(); point.x = ev.clientX; point.y = ev.clientY;
    const local = point.matrixTransform(svg.getScreenCTM().inverse());
    onSelect?.(Math.min(xmax, Math.max(xmin, xmin + (local.x - left) / (W - left - right) * (xmax - xmin))));
  }
  return <section class="lat-plot">
    <div class="lat-plot-head"><h3>{title}</h3><span>{unit}</span></div>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title}. ${xLabel}. ${t('Точные значения — в таблице ниже.', 'Exact values are in the table below.')}`} onClick={choose}>
      {yticks.map(v => <g key={v}><path d={`M${left} ${y(v)}H${W - right}`} stroke="var(--grid)" /><text x={left - 9} y={y(v) + 4} text-anchor="end">{f(+v.toPrecision(3))}</text></g>)}
      {xticks.map(v => <g key={v}><path d={`M${x(v)} ${top}V${H - bottom}`} stroke="var(--grid)" /><text x={x(v)} y={H - bottom + 21} text-anchor="middle">{f(+v.toPrecision(3))}</text></g>)}
      {markers.filter(m => m.value > xmin && m.value < xmax).map(m => <g key={m.label}><path d={`M${x(m.value)} ${top}V${H - bottom}`} stroke="var(--ink-2)" stroke-dasharray="3 5" opacity=".5" /><text x={x(m.value) + 5} y={top + 12}>{m.label}</text></g>)}
      {reference !== undefined && <path d={`M${left} ${y(reference)}H${W - right}`} stroke="var(--ink)" stroke-dasharray="6 4" />}
      {baseline && series.map((s, i) => <path key={`base-${i}`} d={path(baseline, s.get)} fill="none" stroke={COLORS[i]} stroke-width="1.5" stroke-dasharray="5 5" opacity=".5" />)}
      {series.map((s, i) => <path key={s.name} d={path(rows, s.get)} fill="none" stroke={COLORS[i]} stroke-width="2.3" stroke-linejoin="round" />)}
      {selected && <g><path d={`M${x(selected[xKey])} ${top}V${H - bottom}`} stroke="var(--ink)" opacity=".5" />{series.map((s, i) => <circle key={s.name} cx={x(selected[xKey])} cy={y(s.get(selected))} r="4" fill="var(--surface)" stroke={COLORS[i]} stroke-width="2" />)}</g>}
      <text x={W - right} y={H - 2} text-anchor="end">{xLabel}</text>
    </svg>
    <div class="lat-legend">{series.map((s, i) => <span key={s.name}><i style={{ background: COLORS[i] }} /><span>{s.label || s.name}</span></span>)}</div>
  </section>;
}

export function Shell({ s, result: r }) {
  const { t, f } = useText();
  const [rotation, setRotation] = useState(25), [cell, setCell] = useState(false);
  const geometry = useMemo(() => {
    const half = s.L / 2, sinTilt = .28, cosTilt = Math.sqrt(1 - sinTilt ** 2);
    const scale = Math.min(120 / s.R, 125 / (half * cosTilt + s.R * sinTilt));
    // Orthographic view: tilt the camera above the horizontal plane, keeping
    // the cylinder axis vertical. Axial position must not shear screen x.
    const project = (z, theta) => [230 + scale * s.R * Math.cos(theta), 164 + scale * (sinTilt * s.R * Math.sin(theta) - cosTilt * z)];
    const lines = [];
    const add = (points, color, width, back) => lines.push({ d: points.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' '), color, width, back });
    const phase = rotation * Math.PI / 180, tan = Math.tan(r.phi * Math.PI / 180);
    for (const sign of [-1, 1]) for (let j = 0; j < s.count / 2; j++) {
      let points = [], lastBack = null;
      for (let k = 0; k <= 80; k++) {
        const z = -half + s.L * k / 80, theta = phase + 4 * Math.PI * j / s.count + sign * z * tan / s.R;
        const back = Math.sin(theta) < 0, point = project(z, theta);
        if (lastBack !== null && lastBack !== back) { points.push(point); add(points, 'var(--series-1)', Math.max(.65, r.width * scale), lastBack); points = [point]; }
        else points.push(point);
        lastBack = back;
      }
      add(points, 'var(--series-1)', Math.max(.65, r.width * scale), lastBack);
    }
    const rings = Math.min(80, Math.floor(s.L / r.a90));
    const pitch = r.ringIntervals > 80 ? s.L / 80 : r.a90;
    for (let j = 0; j <= rings; j++) for (const back of [true, false]) {
      const start = back ? Math.PI : 0;
      const points = Array.from({ length: 41 }, (_, i) => project(-half + j * pitch, start + Math.PI * i / 40));
      add(points, 'var(--series-2)', Math.max(.7, r.width90 * scale), back);
    }
    return lines.sort((a, b) => Number(b.back) - Number(a.back));
  }, [s, r, rotation]);
  const tan = Math.tan(r.phi * Math.PI / 180);
  return <section class="lat-shell">
    <div class="lat-panel-title"><h2>{t('Геометрия в этой точке', 'Geometry at this load')}</h2><div class="lat-toggle"><button aria-pressed={!cell} onClick={() => setCell(false)}>{t('Оболочка', 'Cylinder')}</button><button aria-pressed={cell} onClick={() => setCell(true)}>{t('Ячейка', 'Cell')}</button></div></div>
    {!cell ? <><svg class="lat-cylinder" viewBox="0 0 460 330" role="img" aria-label={t('Проекция цилиндра со спиральными и кольцевыми рёбрами', 'Projected cylinder with helical and hoop ribs')}>
      <path d="M230 5v26m-5-7 5 7 5-7M230 322v-26m-5 7 5-7 5 7" fill="none" stroke="var(--c-tsaiWu)" stroke-width="2" />
      {geometry.map((line, i) => <path key={i} d={line.d} fill="none" stroke={line.color} stroke-width={line.width} opacity={line.back ? .16 : .8} stroke-linejoin="round" />)}
      <text x="22" y="27" fill="var(--ink-2)" font-size="13">φ = {f(r.phi)}°</text><text x="22" y="312" fill="var(--ink-2)" font-size="13">P = {f(r.P / 1e6)} {t('МН', 'MN')}</text>
    </svg><label class="lat-rotation">{t('Поворот', 'Rotate')}<input type="range" min="0" max="360" step="1" value={rotation} onInput={ev => setRotation(+ev.target.value)} /></label></> : <svg class="lat-cylinder" viewBox="0 0 460 330" role="img" aria-label={t('Развёртка треугольной ячейки', 'Unrolled triangular cell')}>
      <defs><clipPath id="cell-clip"><rect x="45" y="45" width="370" height="230" /></clipPath></defs>
      <g clip-path="url(#cell-clip)" fill="none">
        {Array.from({ length: 15 }, (_, i) => (i - 7) * 66).flatMap((offset, i) => [-1, 1].map(sign => <path key={`${i}-${sign}`} d={`M45 ${160 + offset - 185 * tan * sign}L415 ${160 + offset + 185 * tan * sign}`} stroke="var(--series-1)" stroke-width={Math.max(1.5, r.d * 66)} />))}
        {Array.from({ length: 13 }, (_, i) => 230 + (i - 6) * 33 / tan).map(x => <path key={x} d={`M${x} 45V275`} stroke="var(--series-2)" stroke-width={Math.max(1.5, r.d90 * 33 / tan)} />)}
      </g><path d="M45 292H415m-8-4 8 4-8 4" stroke="var(--ink-2)" fill="none" /><text x="230" y="318" text-anchor="middle" fill="var(--ink-2)" font-size="13">{t('Ось цилиндра →', 'Cylinder axis →')} · ±{f(r.phi)}°</text>
    </svg>}
    <div class="lat-geometry-values"><span>{t('Шаг спиральных рёбер', 'Helical rib pitch')} a<sub>φ</sub> <b>{f(r.aPhi)} {t('мм', 'mm')}</b></span><span>{t('Шаг кольцевых рёбер', 'Hoop rib pitch')} a<sub>90</sub> <b>{f(r.a90)} {t('мм', 'mm')}</b></span></div>
    <p class="lat-note">{t('Синие — спиральные рёбра, зелёные — кольцевые рёбра. Схема непрерывной модели; число интервалов между кольцевыми рёбрами не округляется в расчёте.', 'Blue: helical ribs; green: hoop ribs. Continuous-model illustration; the computed number of intervals between hoop ribs is not rounded.')}{r.ringIntervals > 80 && t(' На схеме показаны только 80 кольцевых рёбер.', ' Only 80 hoop ribs are shown.')}</p>
  </section>;
}
