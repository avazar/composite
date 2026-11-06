import { render } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { initialLang, setLang } from '../i18n.js';
import { loadStored, store } from '../ui/common.jsx';
import { topicHref } from '../navigation.js';
import { DEFAULTS, preset, makeModel, solve } from './core.js';
import { Language, useText, Tex, Num, Panel, Segmented, color, texNumber as tn, Status } from './ui.jsx';
import { Bar, ShapeFunctions, FieldPlot } from './diagrams.jsx';
import { Convergence } from './panels.jsx';
import { ElementPanel } from './element-lesson.jsx';
import { AssemblyPanel, BoundaryPanel, SolutionPanel } from './lesson-panels.jsx';
import './styles.css';

const steps = [['Исходные данные', 'Problem setup'], ['Аппроксимация', 'Interpolation'], ['Матрица элемента', 'Element matrix'], ['Сборка по узлам', 'Node assembly'], ['Граничные условия', 'Boundary conditions'], ['Решение', 'Solution'], ['Точность', 'Accuracy']];
const purposes = [
  ['Задайте стержень, нагрузки и условия на концах. Эта задача сохранится на всех следующих шагах.', 'Set the bar, loads and end conditions. This problem carries through every subsequent step.'],
  ['Как два узловых перемещения задают поле внутри элемента?', 'How do two nodal displacements define the field inside an element?'],
  ['Получаем концевые силы и выделяем коэффициенты при перемещениях.', 'Derive the end forces and identify the coefficients of the displacements.'],
  ['От равновесия каждого узла — к строкам общей системы.', 'From equilibrium at each node to the rows of the global system.'],
  ['Заменяем заданные перемещения числами и получаем систему с оставшимися неизвестными.', 'Replace prescribed displacements by numbers to obtain a system for the remaining unknowns.'],
  ['Сначала находим неизвестные перемещения, затем вычисляем реакции.', 'Find the unknown displacements first, then calculate the reactions.'],
  ['Восстанавливаем поля и сравниваем их с точным решением при сгущении сетки.', 'Recover the fields and compare them with the exact solution under mesh refinement.'],
];
const presets = [['lecture', 'Пример из лекции', 'Lecture example'], ['tension', 'Растяжение концевой силой', 'End-force tension'], ['stepped', 'Два участка разной жёсткости', 'Two stiffness regions'], ['settlement', 'Перемещение опоры', 'Support displacement'], ['free', 'Без закреплений', 'Unsupported bar']];

function Controls({ settings: s, update, scenario, choosePreset }) {
  const { t } = useText();
  const input = (key, label, unit, props = {}, factor = 1) => <label class="fem-input-row"><span>{label} <span class="unit">{unit}</span></span><Num label={label} value={s[key] / factor} onChange={value => update({ [key]: value * factor })} {...props} /></label>;
  return <>
    <Panel title={t('Задача', 'Problem')}>
      <label class="fem-select-label">{t('Готовый пример', 'Preset')}<select value={scenario} onChange={e => choosePreset(e.target.value)} aria-label={t('Готовый пример', 'Preset')}>
        {presets.map(([value, ru, en]) => <option key={value} value={value}>{t(ru, en)}</option>)}<option value="custom" disabled>{t('Свои параметры', 'Custom parameters')}</option>
      </select></label>
      {input('length', t('Длина L', 'Length L'), t('мм', 'mm'), { min: 1, max: 100000, step: 100 })}
      <label class="fem-input-row"><span>{t('Число элементов', 'Element count')}</span><Num label={t('Число элементов', 'Element count')} value={s.count} onChange={v => update({ count: Math.round(v) })} min={s.heterogeneous ? 2 : 1} max={32} step={1} /></label>
      <input type="range" aria-label={t('Сетка: число элементов', 'Mesh: element count')} min={s.heterogeneous ? 2 : 1} max="32" step="1" value={s.count} onInput={e => update({ count: +e.target.value })} />
      <p class="note">{t('1 степень свободы на узел: продольное перемещение u.', '1 degree of freedom per node: axial displacement u.')}</p>
    </Panel>
    <Panel title={t('Свойства стержня', 'Bar properties')}>
      {input('E', t('Модуль E', 'Modulus E'), t('ГПа', 'GPa'), { min: .001, max: 3000, step: 10 }, 1000)}
      {input('area', t('Площадь F', 'Area F'), t('мм²', 'mm²'), { min: .01, max: 100000, step: 10 })}
      <label class="check"><input type="checkbox" checked={s.heterogeneous} onChange={e => update({ heterogeneous: e.target.checked, count: e.target.checked ? Math.max(2, s.count) : s.count })} />{t('Другие свойства на правой половине', 'Different properties on the right half')}</label>
      {s.heterogeneous && <>
        {input('E2', t('Модуль E справа', 'Right modulus E'), t('ГПа', 'GPa'), { min: .001, max: 3000, step: 10 }, 1000)}
        {input('area2', t('Площадь F справа', 'Right area F'), t('мм²', 'mm²'), { min: .01, max: 100000, step: 10 })}
        <p class="note">{t('Граница участков всегда в L/2. При нечётном числе КЭ длины элементов слева и справа различаются.', 'The interface always stays at L/2. Odd element counts give different element lengths on the two sides.')}</p>
      </>}
    </Panel>
    <Panel title={t('Распределённая нагрузка', 'Distributed load')}>
      {input('q', t('Распределённая t', 'Distributed t'), t('Н/мм', 'N/mm'), { min: -10000, max: 10000, step: 1 })}
      <p class="note">{t('Действует по всей длине стержня. Положительное направление — вправо.', 'Acts along the entire bar. Positive direction is to the right.')}</p>
    </Panel>
    <Panel title={t('Граничные условия', 'Boundary conditions')}>
      {['left', 'right'].map(side => <div class="fem-boundary-control" key={side}>
        <label class="fem-select-label">{side === 'left' ? t('Левый конец', 'Left end') : t('Правый конец', 'Right end')}
          <select aria-label={side === 'left' ? t('Левый конец', 'Left end') : t('Правый конец', 'Right end')} value={s[side]} onChange={e => update({ [side]: e.target.value })}>
            <option value="fixed">{t('Закреплено · u = 0', 'Fixed · u = 0')}</option>
            <option value="prescribed">{t('Задано перемещение', 'Prescribed displacement')}</option>
            <option value="free">{t('Свободный край · P = 0', 'Free end · P = 0')}</option>
            <option value="force">{t('Задана сила', 'Applied force')}</option>
          </select>
        </label>
        {s[side] === 'prescribed' && input(side === 'left' ? 'uLeft' : 'uRight', side === 'left' ? 'u(0)' : 'u(L)', t('мм', 'mm'), { min: -100, max: 100, step: .1 })}
        {s[side] === 'force' && input(side === 'left' ? 'forceLeft' : 'forceRight', side === 'left' ? t('Сила слева P₁', 'Left force P₁') : t('Сила справа Pₙ', 'Right force Pₙ'), t('Н', 'N'), { min: -1e8, max: 1e8, step: 1000 })}
      </div>)}
      <p class="note">{t('На каждом конце задаётся либо перемещение, либо сила. При заданном перемещении реакция вычисляется. Положительная сила направлена вправо.', 'Prescribe either displacement or force at each end. A prescribed displacement produces an unknown reaction. Positive forces point right.')}</p>
    </Panel>
  </>;
}

function Inspector({ model, result: r, selected, onSelect, showMatrix, showResult }) {
  const { t, f } = useText();
  const e = r.elements[selected], field = r.fields?.[selected];
  return <>
    <Panel title={t('Выбранный элемент', 'Selected element')} aside={<span class="fem-element-dot" style={{ background: color(selected) }} />}>
      <label class="fem-select-label">{t('Элемент', 'Element')}<select aria-label={t('Выбранный элемент', 'Selected element')} value={selected} onChange={ev => onSelect(+ev.target.value)}>{r.elements.map(e => <option key={e.index} value={e.index}>e{e.index + 1} · {t('узлы', 'nodes')} {e.nodes[0] + 1}–{e.nodes[1] + 1}</option>)}</select></label>
      <dl class="fem-properties"><div><dt>{t('Глобальные узлы', 'Global nodes')}</dt><dd>{e.nodes.map(i => i + 1).join(' ↔ ')}</dd></div>
        <div><dt>ℓₑ</dt><dd>{f(e.length)} {t('мм', 'mm')}</dd></div><div><dt>Eₑ</dt><dd>{f(e.E / 1000)} {t('ГПа', 'GPa')}</dd></div><div><dt>Fₑ</dt><dd>{f(e.area)} {t('мм²', 'mm²')}</dd></div><div><dt>EₑFₑ / ℓₑ</dt><dd>{f(e.alpha)} {t('Н/мм', 'N/mm')}</dd></div>
      </dl>
      {showMatrix && <><Tex block>{`k_e=${tn(e.alpha)}\\begin{bmatrix}1&-1\\\\-1&1\\end{bmatrix}`}</Tex><Tex block>{`f_e^t=${tn(e.load[0])}\\begin{bmatrix}1\\\\1\\end{bmatrix}`}</Tex></>}
    </Panel>
    {showResult && r.status === 'ok' && <Panel title={t('Результат в элементе', 'Element result')}>
      <dl class="fem-properties"><div><dt>u<sub>{e.nodes[0] + 1}</sub></dt><dd>{f(r.u[e.nodes[0]])} {t('мм', 'mm')}</dd></div><div><dt>u<sub>{e.nodes[1] + 1}</sub></dt><dd>{f(r.u[e.nodes[1]])} {t('мм', 'mm')}</dd></div><div><dt>ε</dt><dd>{f(field.strain)}</dd></div><div><dt>σ</dt><dd>{f(field.stress)} {t('МПа', 'MPa')}</dd></div><div><dt>N</dt><dd>{f(field.N)} {t('Н', 'N')}</dd></div></dl>
      <p class="fem-readout">{Math.abs(field.N) < 1e-8 ? t('Нет осевого усилия', 'Zero axial force') : field.N > 0 ? t('Растяжение', 'Tension') : t('Сжатие', 'Compression')}</p>
      <details><summary>{t('Силы на концах элемента', 'Element end forces')}</summary>
        <Tex block>{'p_e=k_e u_e-f_e^t'}</Tex>
        <p class="mono">p₁ = {f(field.endForces[0])}, p₂ = {f(field.endForces[1])} {t('Н', 'N')}</p>
        <p class="note">{t('При t ≠ 0 эти силы учитывают эквивалентную нагрузку и отличаются от ±N, полученного через производную линейного u(x).', 'With t ≠ 0 these forces include the equivalent load and differ from ±N obtained by differentiating the linear u(x).')}</p>
      </details>
    </Panel>}
    <Panel title={t('Допущения', 'Assumptions')}>
      <p class="note">{t('Прямой стержень, малые деформации, линейная упругость. Каждый элемент работает только на растяжение и сжатие. Изгиб и потеря устойчивости не учитываются.', 'Straight bar, small strains and linear elasticity. Each element carries axial tension or compression only. Bending and buckling are excluded.')}</p>
      <p class="note">{t('Учебная модель, не для проектных расчётов.', 'Educational model, not for design calculations.')}</p>
    </Panel>
  </>;
}

function Intro({ model }) {
  const { t } = useText();
  return <Panel title={t('Что мы будем вычислять', 'What we will compute')}>
    <p class="fem-lead">{t('Одна задача — весь путь решения МКЭ.', 'One problem, the complete finite element workflow.')}</p>
    <p>{t('Стержень разбит на двухузловые элементы. В каждом узле одна степень свободы — продольное перемещение. Свойства, нагрузки и условия на концах задаются в панели исходных данных.', 'The bar is divided into two-node elements. Each node has one degree of freedom: axial displacement. Set properties, loads and end conditions in the problem setup panel.')}</p>
    <div class="fem-metrics"><div><span>{t('Элементов', 'Elements')}</span><strong>{model.elements.length}</strong></div><div><span>{t('Степеней свободы', 'Degrees of freedom')}</span><strong>{model.nodes.length}</strong></div><div><span>{t('Неизвестных перемещений', 'Unknown displacements')}</span><strong>{model.nodes.length - model.constraints.length}</strong></div></div>
    <Tex block>{'K u=f+R'}</Tex>
    <p>{t('Мы получим матрицу K из матриц элементов, соберём нагрузки f, зададим известные перемещения, найдём остальные u и реакции R. Затем восстановим поля внутри элементов.', 'We will assemble K from element matrices, collect loads f, prescribe known displacements, solve for the remaining u and reactions R, then recover the fields inside each element.')}</p>
    <p class="note">{t('В исходном примере оба конца закреплены, нагрузка распределена равномерно, сетка содержит 2 КЭ. При изменении параметров все следующие шаги пересчитываются.', 'The initial example has two fixed ends, a uniform distributed load and 2 elements. Changing parameters updates all subsequent steps.')}</p>
  </Panel>;
}

function AppContent({ ui, setUi }) {
  const { lang, t, f } = useText();
  const [settings, setSettings] = useState(() => ({ ...DEFAULTS }));
  const [scenario, setScenario] = useState('lecture');
  const [step, setStep] = useState(0), [selected, setSelected] = useState(0);
  const [cell, setCell] = useState([0, 0]), [activeNode, setNode] = useState(0);
  const [field, setField] = useState('u');
  const [experimentView, setExperimentView] = useState('fields');
  const [controlsOpen, setControlsOpen] = useState(true);
  const about = useRef(null);
  const lessonTop = useRef(null), lessonHeading = useRef(null);
  const model = useMemo(() => makeModel(settings), [settings]);
  const result = useMemo(() => solve(model), [model]);
  const assembly = result;
  const experiment = ui.mode === 'experiment';
  const showResult = experiment || step >= 5;
  function changeSettings(next, name = 'custom') {
    const count = Math.max(next.heterogeneous ? 2 : 1, next.count);
    const value = { ...next, count };
    setSettings(value); setScenario(name);
    setSelected(i => Math.min(i, count - 1)); setNode(i => Math.min(i, count));
    setCell(([i, j]) => [Math.min(i, count), Math.min(j, count)]);
  }
  const update = patch => changeSettings({ ...settings, ...patch });
  const choosePreset = name => changeSettings(preset(name), name);
  function mode(value) { setUi({ ...ui, mode: value }); }
  function goStep(value) {
    setStep(value);
    requestAnimationFrame(() => {
      lessonTop.current?.scrollIntoView({ block: 'start' });
      lessonHeading.current?.focus({ preventScroll: true });
    });
  }
  const assembling = experiment ? experimentView === 'matrices' : step === 3;
  const highlights = assembling ? assembly.elements.filter(e => e.nodes.includes(activeNode)).map(e => e.index) : [];
  const assemblyPanel = <AssemblyPanel model={model} assembly={assembly} selected={selected} onSelect={setSelected} cell={cell} setCell={setCell} activeNode={activeNode} setNode={setNode} />;
  const solutionPanel = <SolutionPanel model={model} result={result} activeNode={activeNode} setNode={setNode} />;
  const resultsPanel = result.status === 'ok' ? <div class={experiment ? 'fem-study-stack' : 'fem-study-grid fem-accuracy-study'}><FieldPlot model={model} result={result} selected={selected} onSelect={setSelected} field={field} setField={setField} /><Convergence settings={settings} model={model} result={result} onCount={count => update({ count })} /></div> : <Status result={result} />;
  const bar = <Bar model={model} result={result} selected={selected} onSelect={setSelected} activeNode={activeNode} highlight={highlights} showResult={showResult} />;
  const controls = <Controls settings={settings} update={update} scenario={scenario} choosePreset={choosePreset} />;
  return <>
    <header class="app-head">
      <a class="catalog-link" href={topicHref('../', lang)}>← {t('Все темы', 'All topics')}</a>
      <div class="brand"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M4 16h24M4 7v18M28 7v18" stroke="currentColor" stroke-width="2" fill="none" /><circle cx="4" cy="16" r="3" fill="var(--series-1)" /><circle cx="16" cy="16" r="3" fill="var(--series-2)" /><circle cx="28" cy="16" r="3" fill="var(--series-1)" /></svg><div><div class="brand-name">FEM</div><div class="brand-sub">{t('метод конечных элементов', 'finite element method')}</div></div></div>
      <nav class="tabs" aria-label={t('Режим работы', 'Mode')}>
        <button type="button" class="tab-btn" aria-pressed={!experiment} onClick={() => mode('steps')}><b>{t('По шагам', 'Step by step')}</b></button>
        <button type="button" class="tab-btn" aria-pressed={experiment} onClick={() => mode('experiment')}><b>{t('Эксперимент', 'Experiment')}</b></button>
      </nav>
      <div class="head-tools">
        <button class="tool-btn" type="button" aria-label={lang === 'ru' ? 'English version' : 'Русская версия'} onClick={() => setUi({ ...ui, lang: lang === 'ru' ? 'en' : 'ru' })}>{lang === 'ru' ? 'EN' : 'RU'}</button>
        <button class="tool-btn" type="button" aria-label={t('Уменьшить шрифт', 'Decrease font size')} onClick={() => setUi({ ...ui, scale: Math.max(.8, ui.scale / 1.08) })}>A−</button>
        <button class="tool-btn" type="button" aria-label={t('Увеличить шрифт', 'Increase font size')} onClick={() => setUi({ ...ui, scale: Math.min(1.6, ui.scale * 1.08) })}>A+</button>
        <button class="tool-btn" type="button" aria-label={t('Изменить тему оформления', 'Change colour theme')} onClick={() => setUi({ ...ui, theme: ui.theme === 'dark' ? 'light' : 'dark' })}>{ui.theme === 'dark' ? '☀' : '◐'}</button>
        <button class="tool-btn" type="button" aria-label={t('Вернуть пример из лекции', 'Reset lecture example')} title={t('Вернуть пример из лекции', 'Reset lecture example')} onClick={() => { choosePreset('lecture'); goStep(0); setSelected(0); setCell([0, 0]); setNode(0); }}>↺</button>
        <button class="tool-btn" type="button" aria-label={t('О модели', 'About the model')} onClick={() => about.current.showModal()}>?</button>
      </div>
    </header>
    {experiment ? <main class={`fem-layout ${controlsOpen ? '' : 'fem-controls-hidden'}`}>
      <aside class="fem-controls"><button class="ghost-btn fem-controls-toggle" type="button" onClick={() => setControlsOpen(!controlsOpen)} aria-expanded={controlsOpen}>{controlsOpen ? t('Свернуть параметры', 'Collapse parameters') : t('Параметры задачи', 'Problem parameters')}</button>
        {controlsOpen && controls}
      </aside>
      <div class="fem-workspace">
        {bar}
          <Segmented label={t('Представление эксперимента', 'Experiment view')} value={experimentView} onChange={setExperimentView} options={[{ value: 'fields', label: t('Поля и точность', 'Fields & accuracy') }, { value: 'matrices', label: t('Матрицы', 'Matrices') }, { value: 'solution', label: t('ГУ и решение', 'BCs & solution') }]} />
          {experimentView === 'fields' && resultsPanel}
          {experimentView === 'matrices' && assemblyPanel}
          {experimentView === 'solution' && <><BoundaryPanel model={model} result={result} />{result.status === 'ok' && solutionPanel}</>}
      </div>
      <aside class="fem-inspector"><Inspector model={model} result={result} selected={selected} onSelect={setSelected} showMatrix showResult /></aside>
    </main> : <main class="fem-lesson" ref={lessonTop}>
      <nav class="fem-steps" aria-label={t('Этапы решения', 'Solution stages')}>{steps.map(([ru, en], i) => <button key={i} type="button" aria-current={step === i ? 'step' : undefined} onClick={() => goStep(i)}><span>{String(i + 1).padStart(2, '0')}</span>{t(ru, en)}</button>)}</nav>
      <div class="fem-lesson-heading">
        <div><p class="fem-eyebrow">{t('Шаг', 'Step')} {step + 1} / {steps.length}</p><h1 tabIndex="-1" ref={lessonHeading}>{t(...steps[step])}</h1><p>{t(...purposes[step])}</p></div>
        {step > 0 && <button class="ghost-btn" type="button" onClick={() => goStep(0)}>← {t('Изменить исходные данные', 'Edit problem setup')}</button>}
      </div>
      {step === 0 ? <div class="fem-setup-grid">
        <aside class="fem-controls">{controls}</aside>
        <div class="fem-workspace">{bar}<Intro model={model} /><button class="ghost-btn fem-next" type="button" onClick={() => goStep(1)}>{t('Данные заданы — к аппроксимации', 'Setup complete — continue to interpolation')} →</button></div>
      </div> : <div class="fem-workspace">
        {step > 2 && <div class="fem-lesson-context"><span>L = {f(settings.length)} {t('мм', 'mm')}</span><span>{model.elements.length} {t('КЭ', 'elements')}</span><span>t = {f(settings.q)} {t('Н/мм', 'N/mm')}</span><span>{t('Неизвестных перемещений', 'Unknown displacements')}: {result.free.length}</span></div>}
        <details key={step} class="fem-context-diagram"><summary>{t('Расчётная схема всей задачи', 'Full problem diagram')}</summary>{bar}</details>
        {(step === 1 || step === 2) && <div class="fem-lesson-element">
          <label class="fem-select-label">{t('Изучаем элемент', 'Inspect element')}<select aria-label={t('Изучаем элемент', 'Inspect element')} value={selected} onChange={ev => setSelected(+ev.target.value)}>{result.elements.map(e => <option key={e.index} value={e.index}>e{e.index + 1} · {t('узлы', 'nodes')} {e.nodes[0] + 1}–{e.nodes[1] + 1}</option>)}</select></label>
          <span>ℓ = {f(result.elements[selected].length)} {t('мм', 'mm')}</span><span>E = {f(result.elements[selected].E / 1000)} {t('ГПа', 'GPa')}</span><span>F = {f(result.elements[selected].area)} {t('мм²', 'mm²')}</span>
        </div>}
        {step === 1 && <ShapeFunctions element={result.elements[selected]} />}
        {step === 2 && <ElementPanel element={result.elements[selected]} />}
        {step === 3 && assemblyPanel}
        {step === 4 && <BoundaryPanel model={model} result={result} />}
        {step === 5 && solutionPanel}
        {step === 6 && resultsPanel}
      </div>}
      <div class="fem-step-footer"><button class="ghost-btn" type="button" disabled={step === 0} onClick={() => goStep(step - 1)}>← {t('Назад', 'Back')}</button><span>{step + 1} / {steps.length}</span><button class="ghost-btn fem-next" type="button" onClick={() => step === 6 ? mode('experiment') : goStep(step + 1)}>{step === 6 ? t('К экспериментам', 'Experiment') : `${t('Далее', 'Next')}: ${t(...steps[step + 1])}`} →</button></div>
    </main>}
    <dialog class="about" ref={about}><h2>{t('О модели', 'About the model')}</h2>
      <p>{t('Двухузловой стержневой КЭ с линейной аппроксимацией перемещений. В пределах каждого элемента E, F и t постоянны. Вторая область материала, если включена, начинается в L/2.', 'Two-node axial bar element with linear displacement interpolation. E, F and t are constant within each element. The optional second material region starts at L/2.')}</p>
      <p>{t('Вектор эквивалентной нагрузки получен интегрированием функций формы. Геометрические ГУ учитываются исключением заданных степеней свободы с переносом их вклада вправо. Реакции восстанавливаются по исходной системе.', 'The consistent load vector is obtained by integrating shape functions. Prescribed degrees of freedom are eliminated, moving their contribution to the right-hand side. Reactions are recovered using the original system.')}</p>
      <p>{t('Точное решение вычисляется отдельно: интегрированием уравнений равновесия и закона Гука на участках с постоянными свойствами. Осевые усилия МКЭ показаны без сглаживания, через производную перемещений.', 'The exact reference is computed independently by integrating equilibrium and Hooke’s law in constant-property regions. FE axial forces are shown without smoothing, as derivatives of displacement.')}</p>
      <p>{t('Пример по умолчанию соответствует лекции: оба конца закреплены, равномерная продольная нагрузка, два равных элемента. Для численного показа приняты L = 1000 мм, E = 70 ГПа, F = 100 мм², t = 10 Н/мм.', 'The default example follows the lecture: both ends fixed, a uniform axial load and two equal elements. Numerical display uses L = 1000 mm, E = 70 GPa, F = 100 mm², t = 10 N/mm.')}</p>
      <p class="note"><a href="https://github.com/avazar/composite" target="_blank" rel="noopener">{t('Исходный код и тесты', 'Source code and tests')}</a> · <a href="../THIRD-PARTY-LICENSES.txt" target="_blank" rel="noopener">{t('Лицензии компонентов', 'Third-party licences')}</a></p>
      <p class="disclaimer">{t('Учебная линейная модель. Изгиб, пластичность и потеря устойчивости не учитываются. Результаты не предназначены для проектирования.', 'Educational linear model. Bending, plasticity and buckling are excluded. Results are not intended for engineering design.')}</p>
      <div class="about-foot"><form method="dialog"><button class="ghost-btn">{t('Закрыть', 'Close')}</button></form></div>
    </dialog>
  </>;
}

function App() {
  const [ui, setUi] = useState(() => {
    const saved = loadStored('laminate.ui', {});
    return { lang: initialLang(saved.lang), theme: saved.theme === 'dark' ? 'dark' : 'light',
      scale: Number.isFinite(saved.scale) ? Math.max(.8, Math.min(1.6, saved.scale)) : 1,
      mode: location.hash === '#experiment' ? 'experiment' : 'steps' };
  });
  setLang(ui.lang);
  useEffect(() => {
    document.documentElement.lang = ui.lang;
    document.documentElement.dataset.theme = ui.theme;
    document.documentElement.style.setProperty('--scale', ui.scale);
    document.title = ui.lang === 'ru' ? 'FEM · метод конечных элементов' : 'FEM · finite element method';
    store('laminate.ui', { ...loadStored('laminate.ui', {}), lang: ui.lang, theme: ui.theme, scale: ui.scale });
    try { history.replaceState(null, '', `${location.pathname}?lang=${ui.lang}#${ui.mode}`); } catch { /* file:// */ }
  }, [ui]);
  return <Language.Provider value={ui.lang}><AppContent ui={ui} setUi={setUi} /></Language.Provider>;
}

render(<App />, document.getElementById('app'));
