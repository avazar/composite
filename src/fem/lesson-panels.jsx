import { useState } from 'preact/hooks';
import { useText, Tex, Panel, color, texNumber as tn, texMatrix, texVector, Status } from './ui.jsx';
import { rowTerms, symbolVector, signedNumber, nodeContributions } from './notation.js';
import { Matrix } from './panels.jsx';

const reactionTerm = (model, i) => model.constraints.some(c => c.node === i) ? `+R_{${i + 1}}` : '';
const forceSymbol = c => `p_{${c.local + 1}}^{(${c.element.index + 1})}`;
const localForce = (c, node) => {
  const e = c.element, other = e.nodes[1 - c.local];
  return `c_{${e.index + 1}}(u_{${node + 1}}-u_{${other + 1}})-\\frac{t_{${e.index + 1}}\\ell_{${e.index + 1}}}{2}`;
};

function NodeNeighborhood({ contributions, node }) {
  const { t } = useText();
  return <div class="fem-node-picture" role="img" aria-label={t(`Узел ${node + 1} и примыкающие элементы`, `Node ${node + 1} and adjacent elements`)}>
    <svg viewBox="0 0 700 120">
      {contributions.map(c => {
        const e = c.element, left = c.local === 1;
        return <g key={e.index}>
          <rect x={left ? 45 : 350} y="42" width="305" height="24" fill={color(e.index)} fill-opacity=".15" stroke={color(e.index)} stroke-width="2" />
          <text x={left ? 180 : 520} y="24" text-anchor="middle" style={{fill:color(e.index)}}>e{e.index + 1} · {t('конец', 'end')} {c.local + 1}</text>
          <circle cx={left ? 45 : 655} cy="54" r="5" fill="var(--surface)" stroke="var(--ink-2)" />
          <text x={left ? 45 : 655} y="97" text-anchor="middle">u{e.nodes[1 - c.local] + 1}</text>
        </g>;
      })}
      <circle cx="350" cy="54" r="12" fill="var(--m-aramid)" stroke="var(--ink)" stroke-width="2" />
      <text x="350" y="100" text-anchor="middle">{t('Узел', 'Node')} {node + 1} · u{node + 1}</text>
    </svg>
  </div>;
}

function EquationList({ model, result: r, substituted = false, ids = model.nodes.map((_, i) => i), activeNode, label }) {
  const { t } = useText();
  const prescribed = new Map(substituted ? model.constraints.map(c => [c.node, c.value]) : []);
  return <div class="fem-equations" role="region" tabIndex="0" aria-label={label}>
    <div class="fem-equations-brace">{ids.map(i => <div key={i} class={`fem-equation-row ${activeNode === i ? 'fem-active-row' : ''} ${substituted && prescribed.has(i) ? 'fem-reaction-row' : ''}`}>
      <span class="fem-equation-index">{i + 1}</span>
      <Tex>{`${rowTerms(r.K[i], undefined, prescribed)}=${tn(r.f[i])}${reactionTerm(model, i)}`}</Tex>
      {substituted && prescribed.has(i) && <span class="fem-equation-note">{t('для реакции', 'for reaction')} R{i + 1}</span>}
    </div>)}</div>
  </div>;
}

function ReducedSystem({ result: r }) {
  const { t } = useText();
  if (!r.free.length) return <p class="fem-readout">{t('Все перемещения заданы. Системы для неизвестных перемещений нет; остаётся вычислить реакции.', 'All displacements are prescribed. There is no displacement system to solve; only reactions remain to be calculated.')}</p>;
  return <div class="fem-reduced-system">
    <p class="note fem-unknowns">{t('Найти', 'Find')}: {r.free.map((i, a) => <span key={i}>u<sub>{i + 1}</sub>{a < r.free.length - 1 ? ', ' : '. '}</span>)}{t('Коэффициенты — Н/мм, правая часть — Н, перемещения — мм.', 'Coefficients: N/mm; right-hand side: N; displacements: mm.')}</p>
    {r.free.length <= 8 ? <Tex block>{`${texMatrix(r.reducedK)}${symbolVector(r.free)}=${texVector(r.reducedF)}`}</Tex>
      : <div class="fem-equations" tabIndex="0" role="region" aria-label={t('Система для неизвестных перемещений', 'System for unknown displacements')}><div class="fem-equations-brace">{r.free.map((i, a) => <div class="fem-equation-row" key={i}><span class="fem-equation-index">{i + 1}</span><Tex>{`${rowTerms(r.reducedK[a], r.free)}=${tn(r.reducedF[a])}`}</Tex></div>)}</div></div>}
  </div>;
}

export function BoundaryPanel({ model, result: r }) {
  const { t, f } = useText();
  return <Panel title={t('Была система — подставляем известные перемещения', 'The system before and after prescribed displacements')}>
    <p>{t('До подстановки все перемещения записаны буквами. Граничные условия задают некоторые из них. Заменяем именно эти u числами во всех строках, включая строки для реакций.', 'Before substitution, every displacement is a symbol. Boundary conditions prescribe some of them. Replace those u values by numbers in every row, including the reaction equations.')}</p>
    <div class="fem-dof-list">{model.nodes.map((_, i) => <span key={i} class={r.fixed.includes(i) ? 'is-fixed' : ''}>u<sub>{i + 1}</sub> {r.fixed.includes(i) ? `= ${f(model.constraints.find(c => c.node === i).value)} ${t('мм · задано', 'mm · prescribed')}` : t('— найти', '— unknown')}</span>)}</div>
    <div class="fem-system-comparison">
      <section><h3>{t('1. Исходная система Ku = f + R', '1. Original system Ku = f + R')}</h3><EquationList model={model} result={r} label={t('До подстановки ГУ', 'Before BC substitution')} /></section>
      <section><h3>{t('2. Подставляем значения из ГУ', '2. Substitute the prescribed values')}</h3><EquationList model={model} result={r} substituted label={t('После подстановки ГУ', 'After BC substitution')} /></section>
    </div>
    <p class="note">{t('Числа в рамках — подставленные перемещения; подпись под рамкой показывает, какое u заменено. Даже нулевые слагаемые пока оставлены, чтобы был виден переход.', 'Boxed numbers are substituted displacements; the label below each box identifies the replaced u. Zero terms are retained here to make the substitution visible.')}</p>
    <h3>{t('3. Оставляем систему для неизвестных перемещений', '3. Retain the system for unknown displacements')}</h3>
    <p>{t('В строках свободных узлов R = 0. Известные слагаемые переносим вправо и вычисляем правую часть. Строки с неизвестными реакциями используем после нахождения u.', 'At free nodes R = 0. Move known terms to the right and evaluate the right-hand side. Use the rows with unknown reactions after finding u.')}</p>
    {r.free.length > 0 && <div class="fem-equations" tabIndex="0" role="region" aria-label={t('Перенос известных слагаемых', 'Moving known terms')}><div class="fem-equations-brace">{r.free.map((i, a) => {
      const moved = model.constraints.filter(c => r.K[i][c.node] !== 0).map(c => `${signedNumber(r.K[i][c.node])}\\cdot${signedNumber(c.value)}`).join('+');
      return <div class="fem-equation-row" key={i}><span class="fem-equation-index">{i + 1}</span><Tex>{`${rowTerms(r.reducedK[a], r.free)}=${tn(r.f[i])}${moved ? `-\\left[${moved}\\right]` : ''}=${tn(r.reducedF[a])}`}</Tex></div>;
    })}</div></div>}
    <ReducedSystem result={r} />
    <Status result={r} />
    <details><summary>{t('Та же операция в блочной записи', 'The same operation in block notation')}</summary><Tex block>{'K_{ff}u_f=f_f-K_{fc}\\bar u_c'}</Tex><p class="note">{t('Индекс f обозначает неизвестные перемещения, c — заданные. Ненулевые заданные перемещения меняют правую часть.', 'Subscript f denotes unknown displacements; c denotes prescribed ones. Nonzero prescribed displacements change the right-hand side.')}</p></details>
  </Panel>;
}

export function SolutionPanel({ model, result: r, activeNode, setNode }) {
  const { t, f } = useText();
  return <div class="fem-study-stack"><div class="fem-study-grid fem-solution-study"><Panel title={t('Система и перемещения', 'System and displacements')}>
    <h3>{t('1. Система, которую решаем', '1. The system to solve')}</h3>
    <ReducedSystem result={r} />
    <Status result={r} />
    {r.status === 'ok' && <>
      <h3>{t('2. Найденные перемещения', '2. Solved displacements')}</h3>
      {r.free.length === 1 && <Tex block>{`u_{${r.free[0] + 1}}=\\frac{${tn(r.reducedF[0])}}{${tn(r.reducedK[0][0])}}=${tn(r.u[r.free[0]])}\\;\\mathrm{mm}`}</Tex>}
      {r.free.length > 1 && r.free.length <= 8 && <Tex block>{`${symbolVector(r.free)}=${texVector(r.free.map(i => r.u[i]))}\\;\\mathrm{mm}`}</Tex>}
      {r.free.length > 8 && <div class="fem-dof-list">{r.free.map(i => <span key={i}>u<sub>{i + 1}</sub> = {f(r.u[i])} {t('мм', 'mm')}</span>)}</div>}
      <p>{r.free.length ? t('Эти значения получены решением системы. Добавляем к ним перемещения, заданные в ГУ, и получаем полный вектор u.', 'These values come from solving the system. Add the displacements prescribed by the boundary conditions to obtain the complete vector u.') : t('Каждое перемещение уже задано граничными условиями. Для реакций используем этот известный вектор u.', 'Every displacement is already prescribed by a boundary condition. Use this known vector u to compute reactions.')}</p>
      {model.nodes.length <= 8 && <Tex block>{`u=${texVector(r.u)}\\;\\mathrm{mm}`}</Tex>}
    </>}
    </Panel>{r.status === 'ok' && <Panel title={t('Реакции опор', 'Support reactions')}>
      <h3>{t('3. Находим реакции из сохранённых уравнений', '3. Recover reactions from the retained equations')}</h3>
      <p class="note">{t('Теперь все u известны. Подставляем их в исходные строки закреплённых узлов: Rᵢ = (Ku)ᵢ − fᵢ.', 'All u values are now known. Substitute them into the original constrained-node rows: Rᵢ = (Ku)ᵢ − fᵢ.')}</p>
      <div class="fem-equations" tabIndex="0" role="region" aria-label={t('Вычисление реакций', 'Reaction calculation')}>{r.fixed.map(i => <div class="fem-equation-row" key={i}><Tex>{`R_{${i + 1}}=${rowTerms(r.K[i], undefined, new Map(r.u.map((u, j) => [j, u])), false)}-${signedNumber(r.f[i])}=${tn(r.reactions[i])}\\;\\mathrm{N}`}</Tex></div>)}</div>
      <div class="fem-metrics"><div><span>{t('Баланс внешних сил', 'External force balance')}</span><strong>Σf + ΣR = {f(r.balance)} {t('Н', 'N')}</strong></div><div><span>{t('Энергия деформации', 'Strain energy')}</span><strong>½uᵀKu = {f(r.energy)} {t('Н·мм', 'N·mm')}</strong></div></div>
    </Panel>}</div>
    {r.status === 'ok' && <Panel title={t('4. Итог по всем узлам', '4. Results at every node')}>
      <div class="fem-table-scroll"><table class="fem-table"><thead><tr><th>{t('Узел', 'Node')}</th><th>x, {t('мм', 'mm')}</th><th>u, {t('мм', 'mm')}</th><th>{t('Перемещение', 'Displacement')}</th><th>f, {t('Н', 'N')}</th><th>R, {t('Н', 'N')}</th></tr></thead><tbody>{model.nodes.map((x, i) => <tr key={i} class={i === activeNode ? 'fem-active-row' : ''}><th><button class="link-btn" type="button" onClick={() => setNode(i)}>{i + 1}</button></th><td>{f(x)}</td><td>{f(r.u[i])}</td><td>{r.fixed.includes(i) ? t('Задано', 'Prescribed') : t('Найдено', 'Solved')}</td><td>{f(r.f[i])}</td><td>{r.fixed.includes(i) ? f(r.reactions[i]) : '—'}</td></tr>)}</tbody></table></div>
      <p class="note">{t('f включает сосредоточенные и эквивалентные распределённые нагрузки. R показана только в узлах с заданным перемещением. Числа округлены только для показа.', 'f includes point loads and equivalent distributed loads. R is shown only where displacement is prescribed. Values are rounded for display only.')}</p>
      <p class="note">{t('Выбранный узел', 'Selected node')} {activeNode + 1}: Ku − f − R = {f(r.residual[activeNode] - r.reactions[activeNode])} {t('Н', 'N')}.</p>
    </Panel>}
  </div>;
}

export function AssemblyPanel({ model, assembly, selected, onSelect, cell, setCell, activeNode, setNode }) {
  const { t, f } = useText();
  const [allRows, setAllRows] = useState(false);
  const ids = model.nodes.map((_, i) => i), n = activeNode;
  const adjoining = nodeContributions(assembly, n);
  const [i, j] = cell;
  const contributors = nodeContributions(assembly, i).filter(c => c.element.nodes.includes(j));
  const pending = allRows ? [] : ids.filter(k => k > n);
  const selectNode = k => { setNode(k); setCell([k, k]); onSelect(Math.min(k, model.elements.length - 1)); };
  return <div class="fem-study-grid fem-assembly-study"><Panel title={t('Равновесие выбранного узла', 'Equilibrium of the selected node')}>
    <p>{t('Проходим по узлам слева направо. Для каждого узла берём нужную строку уравнений каждого примыкающего элемента, складываем силы и записываем коэффициенты в строку K.', 'Walk through the nodes from left to right. At each node, take the corresponding equation from every adjacent element, add the forces and write the coefficients into a row of K.')}</p>
    <div class="fem-node-nav" aria-label={t('Узел для сборки', 'Assembly node')}>
      <button class="ghost-btn" type="button" disabled={n === 0} onClick={() => selectNode(n - 1)}>← {t('Узел', 'Node')}</button>
      <div class="fem-node-buttons">{ids.map(k => <button key={k} class="ghost-btn" type="button" aria-label={t(`Равновесие узла ${k + 1}`, `Equilibrium of node ${k + 1}`)} aria-pressed={k === n} onClick={() => selectNode(k)}>{k + 1}</button>)}</div>
      <button class="ghost-btn" type="button" disabled={n === ids.length - 1} onClick={() => selectNode(n + 1)}>{t('Узел', 'Node')} →</button>
    </div>
    <NodeNeighborhood contributions={adjoining} node={n} />
    <h3>{t('1. Берём концевые силы примыкающих элементов', '1. Take the end forces of adjacent elements')}</h3>
    <div class="fem-contribution-cards">{adjoining.map(c => {
      const e = c.element;
      return <section key={e.index} class="fem-formula-highlight" style={{ '--element-color': color(e.index) }}>
        <button type="button" class="link-btn" onClick={() => onSelect(e.index)}>{t('Элемент', 'Element')} e{e.index + 1} · {t('локальный конец', 'local end')} {c.local + 1} → {t('узел', 'node')} {n + 1}</button>
        <p class="note">c{e.index + 1} = {f(e.alpha)} {t('Н/мм', 'N/mm')} · t{e.index + 1}ℓ{e.index + 1}/2 = {f(c.load)} {t('Н', 'N')}</p>
        <Tex block>{`${forceSymbol(c)}=${localForce(c, n)}`}</Tex>
        <Tex block>{`${forceSymbol(c)}=${rowTerms(c.coefficients, e.nodes)}-${signedNumber(c.load)}`}</Tex>
      </section>;
    })}</div>
    {adjoining.length === 2 && <div class="fem-compatibility">
      <Tex block>{`u_2^{(${adjoining[0].element.index + 1})}=u_1^{(${adjoining[1].element.index + 1})}=u_{${n + 1}}`}</Tex>
      <p class="note">{t('Это один и тот же узел: перемещения концов двух элементов равны. В формулах выше уже использована общая нумерация u.', 'This is one shared node: both element ends have the same displacement. The expressions above already use global displacement numbers.')}</p>
    </div>}
    <h3>{t('2. Записываем равновесие узла и подставляем силы', '2. Write node equilibrium and substitute the forces')}</h3>
    <p class="note">{t('p — силы, действующие на выделенные элементы. На узел элементы действуют с противоположными силами −p. Поэтому −Σp + P + R = 0, или Σp = P + R. P — заданная узловая сила, R — реакция там, где задано перемещение.', 'p denotes forces applied to isolated elements. The elements act on the node with opposite forces −p. Thus −Σp + P + R = 0, or Σp = P + R. P is a prescribed nodal force; R is a reaction where displacement is prescribed.')}</p>
    <Tex block>{`${adjoining.map(forceSymbol).join('+')}=P_{${n + 1}}${reactionTerm(model, n)}`}</Tex>
    <Tex block>{`${adjoining.map(c => `\\left[${localForce(c, n)}\\right]`).join('+')}=${tn(model.forces[n])}${reactionTerm(model, n)}`}</Tex>
    <p>{t('Собираем коэффициенты при одинаковых перемещениях. Эквивалентные распределённые нагрузки переносим вправо.', 'Collect the coefficients of each displacement. Move the equivalent distributed loads to the right-hand side.')}</p>
    <div class="fem-equation-result"><Tex block>{`${rowTerms(assembly.K[n])}=${tn(assembly.f[n])}${reactionTerm(model, n)}`}</Tex></div>
    <h3>{t('3. Коэффициенты становятся строкой матрицы', '3. The coefficients become a matrix row')}</h3>
    <div class="fem-coefficient-list">{ids.filter(k => assembly.K[n][k] !== 0).map(k => <div key={k}><Tex>{`K_{${n + 1},${k + 1}}=${adjoining.filter(c => c.element.nodes.includes(k)).map(c => signedNumber(c.coefficients[c.element.nodes.indexOf(k)])).join('+')}=${tn(assembly.K[n][k])}`}</Tex></div>)}</div>
    <Tex block>{`f_{${n + 1}}=${adjoining.map(c => signedNumber(c.load)).join('+')}+${signedNumber(model.forces[n])}=${tn(assembly.f[n])}`}</Tex>
    <p class="note">{t('Остальные коэффициенты этой строки равны нулю: соответствующие узлы не соединены элементом. Сила P добавляется один раз, распределённые нагрузки — от каждого соседа.', 'Other coefficients in this row are zero: those nodes are not connected by an element. P is added once; distributed load contributions come from each neighbor.')}</p>
    </Panel><aside class="fem-study-side fem-pin"><Panel title={t('Общая система', 'Global system')} class="fem-global-matrix">
    <div class="fem-assembly-controls"><strong>{t('Строка', 'Row')} {n + 1} / {ids.length}</strong><label class="check"><input type="checkbox" checked={allRows} onChange={ev => setAllRows(ev.target.checked)} />{t('Показать все строки', 'Show every row')}</label></div>
    <Matrix values={assembly.K} rowIds={ids} selected={cell} onCell={value => { setCell(value); setNode(value[0]); }} onRow={selectNode} activeRow={n} pendingRows={pending} elementNodes={assembly.elements[selected].nodes} elementColor={color(selected)} label="K" unit={t('Н/мм', 'N/mm')} />
    <p class="note">{pending.length ? t('Многоточие означает, что эту строку ещё не разбирали. Переходите к следующему узлу, чтобы дописать систему.', 'Dots mark rows not yet examined. Move to the next node to continue writing the system.') : t('Все строки записаны. Вместе они образуют систему Ku = f + R.', 'All rows are written. Together they form Ku = f + R.')}</p>
    <details><summary>{t('Вклады в выбранную ячейку', 'Contributions to the selected cell')} K{i + 1},{j + 1}</summary>
      <Tex block>{`K_{${i + 1},${j + 1}}=${contributors.length ? contributors.map(c => signedNumber(c.coefficients[c.element.nodes.indexOf(j)])).join('+') : '0'}=${tn(assembly.K[i][j])}`}</Tex>
      <p class="note">{contributors.length ? contributors.map(c => `e${c.element.index + 1}`).join(' + ') : t('Элемента между этими узлами нет.', 'No element connects these nodes.')}</p>
    </details>
    <details><summary>{t('Система в уравнениях', 'System in equation form')}</summary><EquationList model={model} result={assembly} ids={ids.filter(k => !pending.includes(k))} activeNode={n} label={t('Записанные уравнения', 'Assembled equations')} /></details>
    </Panel><Panel title={t('Текущая строка системы', 'Current system row')}>
      <Tex block>{`${rowTerms(assembly.K[n])}=${tn(assembly.f[n])}${reactionTerm(model, n)}`}</Tex>
      <p class="note">{t('Выделение в матрице связывает равновесие узла со строкой общей системы. Номер узла и номер строки совпадают.', 'The matrix highlight links node equilibrium to a global system row. Node and row numbers coincide.')}</p>
    </Panel></aside></div>;
}
