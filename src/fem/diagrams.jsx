import { useState } from 'preact/hooks';
import { exactSolution, sampleFE } from './core.js';
import { useText, color, Tex, Num, Panel, Segmented } from './ui.jsx';

function Arrow({ x, y, value, length = 42, class: cls = '', label }) {
  if (!value) return null;
  const dx = Math.sign(value) * length;
  return <g class={cls}>
    <path d={`M${x} ${y}h${dx}m${-Math.sign(value) * 8} -5l${Math.sign(value) * 8} 5 -${Math.sign(value) * 8} 5`} fill="none" stroke="currentColor" stroke-width="2" />
    {label && <text x={x + dx / 2} y={y - 10} text-anchor="middle">{label}</text>}
  </g>;
}

export function Bar({ model, result, selected, onSelect, activeNode, highlight = [], showResult }) {
  const { t, f } = useText();
  const L = model.nodes.at(-1), n = model.elements.length;
  const X = x => 75 + x / L * 690;
  const maxU = result.status === 'ok' ? Math.max(...result.u.map(Math.abs)) : 0;
  const amplification = maxU > 1e-12 ? .07 * L / maxU : 1;
  const keyboard = (event, i) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(i); } };
  return <Panel title={t('Расчётная схема', 'Bar model')} aside={<span class="head-hint">{t('КЭ', 'Elements')}: {n} · {t('Узлы / степени свободы', 'Nodes / DOFs')}: {n + 1}</span>} class="fem-scheme">
    <div class="fem-plot-scroll" tabIndex="0" role="region" aria-label={t('Схема стержня', 'Bar diagram')}><svg viewBox={`0 0 840 ${showResult && result.status === 'ok' ? 285 : 205}`} role="group" aria-label={t('Стержень: выберите элемент для изучения', 'Bar: select an element to inspect')}>
      <path d="M75 175H790l-8-5m8 5-8 5" stroke="var(--axis)" fill="none" />
      <text x="792" y="195">x, {t('мм', 'mm')}</text><text x="75" y="195">0</text><text x="765" y="195" text-anchor="end">{f(L)}</text>
      {model.elements.map((e, i) => {
        const a = X(model.nodes[e.nodes[0]]), b = X(model.nodes[e.nodes[1]]);
        const active = i === selected || highlight.includes(i);
        return <g key={i} role="button" tabIndex="0" aria-label={`${t('Элемент', 'Element')} ${i + 1}`} aria-pressed={i === selected}
          onClick={() => onSelect(i)} onKeyDown={ev => keyboard(ev, i)} class="fem-element" style={{ '--element-color': color(i) }}>
          <title>{t('Элемент', 'Element')} {i + 1}: {f(e.E / 1000)} {t('ГПа', 'GPa')}, {f(e.area)} {t('мм²', 'mm²')}</title>
          <rect x={a + 1} y="92" width={Math.max(1, b - a - 2)} height="28" rx="2" fill={color(i)} fill-opacity={active ? .28 : .1} stroke={active ? color(i) : 'var(--axis)'} stroke-width={active ? 2.5 : 1} />
          <rect x={a} y="56" width={b - a} height="86" fill="transparent" />
          {(n <= 10 || i === selected) && <text x={(a + b) / 2} y="71" text-anchor="middle" style={{ fill: color(i) }}>e{i + 1}</text>}
          {e.q !== 0 && <Arrow x={(a + b) / 2 - Math.sign(e.q) * Math.min(16, (b - a) / 4)} y={106} value={e.q} length={Math.min(32, (b - a) / 2)} class="fem-load" />}
        </g>;
      })}
      <text x="420" y="31" text-anchor="middle" class="fem-load">t = {f(model.elements[0].q)} {t('Н/мм', 'N/mm')}</text>
      {model.nodes.map((x, i) => <g key={i}>
        <circle cx={X(x)} cy="106" r={i === activeNode ? 7 : 4.5} fill={i === activeNode ? 'var(--m-aramid)' : 'var(--surface)'} stroke="var(--ink)" stroke-width="1.5" />
        {(n <= 10 || i === 0 || i === n || result.elements[selected].nodes.includes(i) || i === activeNode) && <text x={X(x)} y="151" text-anchor="middle">{i + 1} · u{i + 1}</text>}
      </g>)}
      {model.constraints.map(c => <g key={c.node} stroke="var(--ink)" fill="none">
        <path d={`M${X(model.nodes[c.node])} 84v44`} stroke-width="3" />
        {[0, 1, 2, 3].map(j => <path key={j} d={`M${X(model.nodes[c.node])} ${87 + j * 12}l${c.node === 0 ? -10 : 10} 7`} />)}
        <text x={X(model.nodes[c.node])} y="169" text-anchor="middle" stroke="none" fill="var(--ink-2)">u={f(c.value)}</text>
      </g>)}
      <Arrow x={75} y={49} value={model.forces[0]} class="fem-load" label={`${f(model.forces[0])} ${t('Н', 'N')}`} />
      <Arrow x={765} y={49} value={model.forces.at(-1)} class="fem-load" label={`${f(model.forces.at(-1))} ${t('Н', 'N')}`} />
      {showResult && result.status === 'ok' && <g>
        <text x="75" y="228" class="fem-small">{t('Продольные перемещения', 'Axial displacements')} ×{f(amplification)}</text>
        <path d="M75 254H765" stroke="var(--axis)" stroke-dasharray="4 5" />
        {model.elements.map((e, i) => <line key={i} x1={X(model.nodes[e.nodes[0]] + amplification * result.u[e.nodes[0]])} x2={X(model.nodes[e.nodes[1]] + amplification * result.u[e.nodes[1]])} y1="254" y2="254" stroke={color(i)} stroke-width="7" opacity={i === selected ? 1 : .5} />)}
        {model.nodes.map((x, i) => <circle key={i} cx={X(x + amplification * result.u[i])} cy="254" r="4" fill="var(--surface)" stroke="var(--ink)" />)}
      </g>}
    </svg></div>
    <p class="note">{t('Нажмите на элемент. Все силы положительны вправо, растяжение N > 0.', 'Select an element. Positive forces point right; N > 0 denotes tension.')}</p>
  </Panel>;
}

export function ElementSketch({ element: e, trial, unloaded = false, activeEnd }) {
  const { t, f } = useText();
  const q = unloaded ? 0 : e.q;
  const p = trial ? e.k.map(row => row[0] * trial[0] + row[1] * trial[1] - q * e.length / 2) : null;
  return <Panel title={t('Выделенный элемент', 'Isolated element')} class="fem-element-sketch" aside={<span class="head-hint">e{e.index + 1} · ℓ = {f(e.length)} {t('мм', 'mm')}</span>}>
    <svg viewBox="0 0 480 210" role="img" aria-label={t('Элемент с концевыми силами p₁, p₂, перемещениями u₁, u₂ и распределённой нагрузкой t', 'Element with end forces p₁, p₂, displacements u₁, u₂ and distributed load t')}>
      <text x="240" y="20" text-anchor="middle" class="fem-load">t = {f(q)} {t('Н/мм', 'N/mm')}</text>
      <rect x="90" y="91" width="300" height="22" rx="3" fill={color(e.index)} fill-opacity=".12" stroke={color(e.index)} stroke-width="2" />
      {[0, 1].map(a => <g key={a}>
        <circle cx={90 + 300 * a} cy="102" r="6" fill={activeEnd === a ? 'var(--m-aramid)' : 'var(--surface)'} stroke="var(--ink)" stroke-width="1.6" />
        <text x={90 + 300 * a} y="135" text-anchor="middle">{a + 1}</text>
        <text x={90 + 300 * a} y="46" text-anchor="middle" class="fem-end-force">p{a === 0 ? '₁' : '₂'}</text>
        <Arrow x={90 + 300 * a} y={62} value={p ? p[a] : 1} length={42} class="fem-end-force" />
        <text x={90 + 300 * a} y="194" text-anchor="middle" class="fem-displacement">u{a === 0 ? '₁' : '₂'}{trial ? ` = ${f(trial[a])}` : ''}</text>
        <Arrow x={90 + 300 * a} y={168} value={trial ? trial[a] : 1} length={42} class="fem-displacement" />
      </g>)}
      {[165, 240, 315].map(x => <Arrow key={x} x={x - 15 * Math.sign(q)} y={102} value={q} length={30} class="fem-load" />)}
      <path d="M30 202H450l-7-4m7 4-7 4" stroke="var(--axis)" fill="none" /><text x="457" y="207">x</text>
    </svg>
    <div class="fem-sketch-legend"><span class="fem-end-force">p₁, p₂ · {t('силы на элемент', 'forces on element')}</span><span class="fem-displacement">u₁, u₂ · {t('перемещения', 'displacements')}</span></div>
    <p class="note">{t('Локальные концы', 'Local ends')} 1, 2 ↔ {t('глобальные узлы', 'global nodes')} {e.nodes.map(i => i + 1).join(', ')}. {trial ? t('Стрелки показывают знаки пробных значений, длины стрелок условны.', 'Arrows show the signs of trial values; arrow lengths are schematic.') : t('Стрелки p и u задают положительное направление. Знаки сил станут известны после решения.', 'The p and u arrows define the positive direction. Force signs become known after solving.')}</p>
    {p && <div class="fem-sketch-forces"><span>p₁ = {f(p[0])} {t('Н', 'N')}</span><span>p₂ = {f(p[1])} {t('Н', 'N')}</span></div>}
  </Panel>;
}

export function ShapeFunctions({ element }) {
  const { t, f } = useText();
  const [u1, setU1] = useState(0), [u2, setU2] = useState(1), [xi, setXi] = useState(.5);
  const X = x => 65 + x * 660;
  const Y = y => 130 - y * 82;
  return <div class="fem-study-grid fem-interpolation-study"><Panel title={t('Перемещение внутри элемента', 'Displacement inside the element')} class="fem-chart-panel">
    <p>{t('Задайте пробные перемещения концов. Функции формы интерполируют их в любой точке элемента.', 'Set trial end displacements. Shape functions interpolate them at every point inside the element.')}</p>
    <div class="fem-inline-inputs">
      <label>u₁, {t('мм', 'mm')}<Num value={u1} onChange={setU1} min={-1} max={1} step={.1} label="u₁" /></label>
      <label>u₂, {t('мм', 'mm')}<Num value={u2} onChange={setU2} min={-1} max={1} step={.1} label="u₂" /></label>
      <label>ξ = x / ℓ <input type="range" min="0" max="1" step=".01" value={xi} onInput={e => setXi(+e.target.value)} aria-label="ξ = x / ℓ" /></label>
    </div>
    <div class="fem-plot-scroll" tabIndex="0" role="region" aria-label={t('График функций формы', 'Shape function plot')}><svg viewBox="0 0 800 255" role="img" aria-label={t('Функции формы и пробная аппроксимация перемещений', 'Shape functions and trial displacement interpolation')}>
      {[-1, 0, 1].map(y => <g key={y}><path d={`M65 ${Y(y)}H725`} stroke="var(--grid)" /><text x="48" y={Y(y) + 5} text-anchor="end">{y}</text></g>)}
      <path d={`M65 ${Y(1)}L725 ${Y(0)}`} class="fem-shape-one" /><path d={`M65 ${Y(0)}L725 ${Y(1)}`} class="fem-shape-two" />
      <path d={`M65 ${Y(u1)}L725 ${Y(u2)}`} stroke="var(--ink)" stroke-width="3" fill="none" />
      <path d={`M${X(xi)} 35V220`} stroke="var(--muted)" stroke-dasharray="4 4" />
      <circle cx={X(xi)} cy={Y((1 - xi) * u1 + xi * u2)} r="5" fill="var(--ink)" />
      <text x="65" y="244">ξ = 0</text><text x="725" y="244" text-anchor="end">ξ = 1</text>
    </svg></div>
    <div class="fem-legend"><span style={{ color: color(0) }}>N₁ = 1 − ξ</span><span style={{ color: color(1) }}>N₂ = ξ</span><span>u = N₁u₁ + N₂u₂</span></div>
    <div class="fem-readout">ξ = {f(xi)} · N₁ = {f(1 - xi)} · N₂ = {f(xi)} · u = {f((1 - xi) * u1 + xi * u2)} {t('мм', 'mm')}</div>
    <p class="note">{t('График совмещает безразмерные N₁, N₂ и пробное перемещение u в мм. Измените u₁ и u₂, чтобы увидеть, как меняется наклон прямой.', 'The plot overlays dimensionless N₁, N₂ and trial displacement u in mm. Change u₁ and u₂ to see the line slope change.')}</p>
  </Panel><aside class="fem-study-side">
    <ElementSketch element={element} trial={[u1, u2]} />
    <Panel title={t('От узлов к полю', 'From nodes to the field')}>
      <Tex block>{'N_1=1-\\frac{x}{\\ell_e},\\quad N_2=\\frac{x}{\\ell_e}'}</Tex>
      <Tex block>{'u(x)=N_1u_1+N_2u_2'}</Tex>
      <Tex block>{'\\varepsilon=\\frac{u_2-u_1}{\\ell_e},\\quad \\sigma=E_e\\varepsilon'}</Tex>
      <p class="fem-readout">ε = {f((u2 - u1) / element.length)} · N = {f(element.alpha * (u2 - u1))} {t('Н', 'N')}</p>
      <p class="note">{t('При u₁ = u₂ элемент перемещается как целое, деформация равна нулю. Пробные значения не меняют решение всей задачи. Концевые силы на схеме вычислены как p = kₑuₑ − fₑᵗ.', 'When u₁ = u₂ the element translates rigidly with zero strain. Trial values do not change the solved model. End forces in the diagram are computed as p = kₑuₑ − fₑᵗ.')}</p>
    </Panel>
  </aside></div>;
}

const fieldTitles = { u: ['Перемещения', 'Displacement'], N: ['Осевые усилия', 'Axial force'], strain: ['Деформации', 'Strain'], stress: ['Напряжения', 'Stress'] };

export function FieldPlot({ model, result, selected, onSelect, field, setField }) {
  const { t, f } = useText();
  const [showExact, setShowExact] = useState(true), [probe, setProbe] = useState(.25);
  const exact = exactSolution(model), L = model.nodes.at(-1);
  const sample = model.elements.map((e, i) => Array.from({ length: 17 }, (_, k) => {
    const fe = sampleFE(model, result, i, k / 16);
    return { x: fe.x, fe: fe[field], exact: exact(fe.x, i)[field] };
  }));
  const values = sample.flatMap(segment => segment.flatMap(p => showExact ? [p.fe, p.exact] : [p.fe]));
  let min = Math.min(0, ...values), max = Math.max(0, ...values);
  if (max - min < 1e-14) { min = -1; max = 1; }
  const span = max - min; min -= span * .12; max += span * .12;
  const X = x => 90 + x / L * 640, Y = y => 230 - (y - min) / (max - min) * 195;
  const d = (pts, key) => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x)},${Y(p[key])}`).join(' ');
  const at = probe * L;
  const ei = Math.max(0, model.elements.findIndex(e => at <= model.nodes[e.nodes[1]] + 1e-9));
  const e = result.elements[ei], xi = (at - model.nodes[e.nodes[0]]) / e.length;
  const fe = sampleFE(model, result, ei, xi), ref = exact(at, ei);
  const units = field === 'u' ? t('мм', 'mm') : field === 'N' ? t('Н', 'N') : field === 'stress' ? t('МПа', 'MPa') : '—';
  function move(event, select) {
    const bounds = event.currentTarget.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, ((event.clientX - bounds.left) * 800 / bounds.width - 90) / 640));
    setProbe(p);
    if (select) onSelect(Math.max(0, model.elements.findIndex(e => p * L <= model.nodes[e.nodes[1]] + 1e-9)));
  }
  return <Panel title={t(...fieldTitles[field])} aside={<span class="head-hint">{units}</span>} class="fem-chart-panel">
    <Segmented label={t('Поле', 'Field')} value={field} onChange={setField} options={Object.keys(fieldTitles).map(value => ({ value, label: value === 'strain' ? 'ε(x)' : value === 'stress' ? 'σ(x)' : `${value}(x)` }))} />
    <div class="fem-plot-scroll" tabIndex="0" role="region" aria-label={t('График поля', 'Field plot')}><svg viewBox="0 0 800 270" class="fem-field" role="img" aria-label={`${t(...fieldTitles[field])}, ${t('МКЭ и точное решение', 'FE and exact solution')}`} onPointerMove={ev => move(ev, false)} onClick={ev => move(ev, true)}>
      {Array.from({ length: 5 }, (_, i) => min + (max - min) * i / 4).map((y, i) => <g key={i}><path d={`M90 ${Y(y)}H730`} stroke="var(--grid)" /><text x="80" y={Y(y) + 4} text-anchor="end">{f(y)}</text></g>)}
      {model.nodes.map((x, i) => <path key={i} d={`M${X(x)} 35V230`} stroke="var(--grid)" />)}
      <rect x={X(model.nodes[result.elements[selected].nodes[0]])} width={result.elements[selected].length / L * 640} y="35" height="195" fill={color(selected)} opacity=".06" />
      <path d={`M90 ${Y(0)}H730`} stroke="var(--axis)" />
      {sample.map((segment, i) => <g key={i}>
        {showExact && <path d={d(segment, 'exact')} fill="none" stroke="var(--ink-2)" stroke-width="1.8" stroke-dasharray="6 4" />}
        <path d={d(segment, 'fe')} fill="none" stroke={color(i)} stroke-width={i === selected ? 3.5 : 2.5} />
        {field === 'u' && [segment[0], segment.at(-1)].map((p, j) => <circle key={j} cx={X(p.x)} cy={Y(p.fe)} r="3.5" stroke={color(i)} fill="var(--surface)" />)}
      </g>)}
      <path d={`M${X(at)} 35V230`} stroke="var(--muted)" stroke-dasharray="2 4" />
      <circle cx={X(at)} cy={Y(fe[field])} r="4" fill={color(ei)} />
      <text x="90" y="253">0</text><text x="730" y="253" text-anchor="end">{f(L)} {t('мм', 'mm')}</text><text x="747" y="253">x</text>
    </svg></div>
    <div class="fem-legend"><span class="fem-legend-fe">{t('МКЭ · цвет элемента', 'FE · element colour')}</span><label class="check"><input type="checkbox" checked={showExact} onChange={ev => setShowExact(ev.target.checked)} />{t('Точное решение · штриховая линия', 'Exact solution · dashed')}</label></div>
    <label class="fem-probe-label">x / L <input type="range" min="0" max="1" step=".001" value={probe} onInput={ev => setProbe(+ev.target.value)} aria-label={t('Точка на графике x/L', 'Plot probe x/L')} /></label>
    <div class="fem-readout">x = {f(at)} {t('мм', 'mm')} · e{ei + 1} · {t('МКЭ', 'FE')}: {f(fe[field])} · {t('точно', 'exact')}: {f(ref[field])} {units}</div>
    <p class="note">{field === 'u' ? t('Узловые значения в этой постановке могут быть точными, хотя внутри элементов остаётся ошибка. Наведите курсор или перемещайте ползунок.', 'Nodal values can be exact in this formulation while an error remains inside elements. Move the pointer or the slider.') : t('Показана производная линейной аппроксимации: значение постоянно в пределах элемента. Скачки намеренно не сглаживаются. На общей границе проба берётся слева.', 'This is the derivative of the linear interpolation: constant within each element. Jumps are not smoothed. At a shared boundary, the probe uses the left-hand value.')}</p>
  </Panel>;
}
