import { render } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import { initialLang, setLang } from '../i18n.js';
import { topicHref } from '../navigation.js';
import { loadStored, store, Tex, Num } from '../ui/common.jsx';
import { Language, useText } from '../fem/ui.jsx';
import { DEFAULTS, MODES, optimize, sweep, transitions } from './core.js';
import { Plot, Shell, COLORS } from './diagrams.jsx';
import { Model } from './model.jsx';
import './styles.css';

const modeNames = { strength: ['Прочность спиральных рёбер', 'Helical rib strength'], local: ['Местная устойчивость', 'Local buckling'], axis: ['Осесимметричная форма', 'Axisymmetric buckling'], nonaxis: ['Неосесимметричная форма', 'Non-axisymmetric buckling'] };

function Controls({ s, set, reset }) {
  const { t } = useText();
  const field = (key, label, unit, min, max, step = 1, factor = 1, notation) => <label class="lat-field"><span>{notation ? <Tex>{notation}</Tex> : label}<small>{unit}</small></span><Num label={label} value={s[key] / factor} min={min} max={max} step={step} onChange={v => set({ ...s, [key]: key === 'count' ? Math.max(4, Math.round(v / 2) * 2) : v * factor })} /></label>;
  return <aside class="lat-controls">
    <div class="lat-panel-title"><h2>{t('Исходные данные', 'Inputs')}</h2><button class="lat-link" onClick={reset}>{t('Сбросить', 'Reset')}</button></div>
    <p class="lat-note">{t('Осевое сжатие оболочки со спиральными и кольцевыми рёбрами.', 'Axial compression of a cylinder with helical and hoop ribs.')}</p>
    <fieldset><legend>{t('Геометрия', 'Geometry')}</legend>
      {field('R', t('Радиус R', 'Radius R'), t('мм', 'mm'), 50, 10000, 50)}
      {field('L', t('Длина L', 'Length L'), t('мм', 'mm'), 100, 30000, 100)}
      {field('count', t('Число спиральных рёбер n', 'Total helical rib count n'), '', 4, 240, 2)}
      <p class="lat-note">{t('По n/2 рёбер в направлениях +φ и −φ. Число рёбер задаёт шаг и ширину, но не массу непрерывной модели.', 'n/2 ribs in each direction, +φ and −φ. Rib count sets pitch and width, but not the continuous-model mass.')}</p>
    </fieldset>
    <fieldset><legend>{t('Материал спиральных рёбер', 'Helical rib material')}</legend>
      {field('E', 'Eφ', t('ГПа', 'GPa'), 5, 500, 5, 1000, String.raw`E_\varphi`)}
      {field('sigma', t('Прочность при сжатии σ̄', 'Compressive strength σ̄'), t('МПа', 'MPa'), 20, 2500, 10)}
      {field('rho', 'ρφ', t('кг/м³', 'kg/m³'), 500, 10000, 50, 1, String.raw`\rho_\varphi`)}
    </fieldset>
    <fieldset><legend>{t('Материал кольцевых рёбер', 'Hoop rib material')}</legend>
      {field('E90', 'E₉₀', t('ГПа', 'GPa'), 5, 500, 5, 1000, 'E_{90}')}
      {field('rho90', 'ρ₉₀', t('кг/м³', 'kg/m³'), 500, 10000, 50, 1, String.raw`\rho_{90}`)}
    </fieldset>
    <fieldset><legend>{t('Модель и диапазон', 'Model and range')}</legend>
      {field('k', t('Коэффициент закрепления k', 'End-restraint factor k'), '', 1, 1.5, .05)}
      {field('pMax', t('До нагрузки p', 'Maximum load p'), t('МПа', 'MPa'), .1, 20, .5)}
      <p class="lat-note">p = P / (πR²). {t('Это нормированная осевая сила, а не давление на стенку.', 'This is a normalized axial force, not pressure on the wall.')}</p>
    </fieldset>
  </aside>;
}

function Lab({ ui, setUi }) {
  const { t, f, lang } = useText();
  const [s, setSettings] = useState({ ...DEFAULTS });
  const [p, setP] = useState(4 / Math.PI), [view, setView] = useState('load');
  const [saved, setSaved] = useState(null), [dimensionless, setDimensionless] = useState(false);
  const [angle, setAngle] = useState(26.565);
  const [wideAngles, setWideAngles] = useState(false);
  const rows = useMemo(() => sweep(s), [s]);
  const selected = useMemo(() => optimize(s, p), [s, p]);
  const trans = useMemo(() => transitions(s), [s]);
  const baseline = useMemo(() => saved ? sweep({ ...saved, pMax: s.pMax }) : null, [saved, s.pMax]);
  const baselinePoint = useMemo(() => saved ? optimize(saved, p) : null, [saved, p]);
  const angleMin = wideAngles ? 1 : Math.max(1, Math.floor(selected.phi) - 12);
  const angleMax = wideAngles ? 85 : Math.min(85, Math.ceil(selected.phi) + 12);
  const chosenAngle = Math.max(angleMin, Math.min(angleMax, angle));
  const angleRows = useMemo(() => view === 'angle' ? Array.from({ length: 81 }, (_, i) => optimize(s, p, angleMin + (angleMax - angleMin) * i / 80)) : [], [s, p, view, angleMin, angleMax]);
  const anglePoint = useMemo(() => view === 'angle' ? optimize(s, p, chosenAngle) : null, [s, p, chosenAngle, view]);
  const current = view === 'angle' ? anglePoint : selected;
  const massPenalty = Math.max(0, Math.round(10000 * (current.mass / selected.mass - 1)) / 100);
  const markers = trans.analyticalValid ? [{ value: trans.p1, label: 'p₁' }, { value: trans.p2, label: 'p₂' }] : [];
  function set(next) { setSettings(next); setP(v => Math.max(next.pMax * .01, Math.min(next.pMax, v))); }
  const reserves = MODES.map(key => ({ name: t(...modeNames[key]), get: r => r.reserves[key] }));
  const dimensions = dimensionless ? [{ name: '10h/R', get: r => 10 * r.h / s.R }, { name: 'δ̄φ', label: <>δ̄<sub>φ</sub></>, get: r => r.d }, { name: 'δ̄₉₀', label: <>δ̄<sub>90</sub></>, get: r => r.d90 }]
    : [{ name: 'h', get: r => r.h }, { name: 'δφ', label: <>δ<sub>φ</sub></>, get: r => r.width }, { name: 'δ₉₀', label: <>δ<sub>90</sub></>, get: r => r.width90 }];
  const loadLabel = t('p, МПа', 'p, MPa');
  return <>
    <header class="app-head lat-head">
      <a class="catalog-link" href={topicHref('../', lang)}>← {t('Все темы', 'All topics')}</a>
      <div class="brand">
        <svg viewBox="0 0 32 32" aria-hidden="true"><ellipse cx="16" cy="6" rx="10" ry="3" fill="none" stroke="var(--series-2)" stroke-width="1.5" /><path d="M6 6v20m20-20v20M6 10l20 12M6 18l16 10M10 4l16 10M26 10L6 22M26 18L10 28M22 4L6 14" fill="none" stroke="var(--series-1)" stroke-width="1.3" /><ellipse cx="16" cy="26" rx="10" ry="3" fill="none" stroke="var(--series-2)" stroke-width="1.5" /></svg>
        <div><h1 class="brand-name">Lattice</h1><p class="brand-sub">{t('сетчатые цилиндрические оболочки', 'lattice cylindrical shells')}</p></div>
      </div>
      <nav class="tabs" aria-label={t('Режим исследования', 'Study mode')}>
        {[['load', 'По нагрузке', 'Load sweep'], ['angle', 'Почему такой угол?', 'Why this angle?'], ['model', 'Модель и формулы', 'Model & equations']].map(([key, ru, en]) => <button type="button" class="tab-btn" key={key} aria-pressed={view === key} onClick={() => setView(key)}><b>{t(ru, en)}</b></button>)}
      </nav>
      <div class="head-tools">
        <button type="button" class="tool-btn" onClick={() => setUi({ ...ui, lang: lang === 'ru' ? 'en' : 'ru' })} aria-label={lang === 'ru' ? 'English version' : 'Русская версия'}>{lang === 'ru' ? 'EN' : 'RU'}</button>
        <button type="button" class="tool-btn" aria-label={t('Уменьшить шрифт', 'Decrease font size')} onClick={() => setUi({ ...ui, scale: Math.max(.8, ui.scale / 1.08) })}>A−</button>
        <button type="button" class="tool-btn" aria-label={t('Увеличить шрифт', 'Increase font size')} onClick={() => setUi({ ...ui, scale: Math.min(1.6, ui.scale * 1.08) })}>A+</button>
        <button type="button" class="tool-btn" aria-label={t('Изменить тему', 'Change theme')} onClick={() => setUi({ ...ui, theme: ui.theme === 'dark' ? 'light' : 'dark' })}>{ui.theme === 'dark' ? '☀' : '◐'}</button>
      </div>
    </header>
    <div class="lat-app">
    <main class="lat-layout"><Controls s={s} set={set} reset={() => { set({ ...DEFAULTS }); setP(4 / Math.PI); }} />
      <div class="lat-workspace">
        {view === 'model' ? <Model /> : <>
          <section class="lat-load"><div><label for="lat-p">{t('Выбранная нагрузка', 'Selected load')} <strong>p = {f(p)} {t('МПа', 'MPa')}</strong></label><span>P = {f(selected.P / 1e6)} {t('МН', 'MN')}</span></div>
            <input id="lat-p" type="range" min={s.pMax * .01} max={s.pMax} step={s.pMax / 1000} value={p} onInput={ev => setP(+ev.target.value)} aria-valuetext={`${f(p)} ${t('МПа', 'MPa')}`} />
            <div class="lat-load-foot"><span>{f(s.pMax * .01)}</span><p>{t('Передвигайте ползунок или нажмите на график. В каждой точке — новый оптимум.', 'Move the slider or click a plot. Each load has a newly optimized design.')}</p><span>{f(s.pMax)} {t('МПа', 'MPa')}</span></div>
          </section>
          <div class="lat-overview"><Shell s={s} result={current} /><section class="lat-result">
            <div class="lat-panel-title"><h2>{view === 'angle' ? t('При заданном угле', 'At the selected angle') : t('Оптимум при этой нагрузке', 'Optimum at this load')}</h2><span class="lat-live">{t('Расчёт', 'Calculated')}</span></div>
            <div class="lat-metrics"><div><span>{t('Масса оболочки', 'Shell mass')}</span><strong>{f(current.mass)} <small>{t('кг', 'kg')}</small></strong></div><div><span>{t('Угол спиральных рёбер', 'Helical rib angle')}</span><strong>{f(current.phi)}°</strong></div></div>
            <div class="lat-size-line"><span>h = <b>{f(current.h)}</b></span><span>δ<sub>φ</sub> = <b>{f(current.width)}</b></span><span>δ<sub>90</sub> = <b>{f(current.width90)}</b> {t('мм', 'mm')}</span></div>
            <h3>{t('Запасы по ограничениям', 'Constraint reserve factors')}</h3>
            <div class="lat-reserves">{MODES.map((key, i) => <div key={key}><span><i style={{ background: COLORS[i] }} />{t(...modeNames[key])}</span><b>{f(current.reserves[key])}</b><small class={current.active.includes(key) ? 'lat-active' : ''}>{current.active.includes(key) ? t('активно', 'active') : t('есть запас', 'reserve')}</small></div>)}</div>
            <p class="lat-note">{t('n = 1 — ограничение определяет конструкцию. Избыточный запас может быть следствием других ограничений.', 'n = 1: a constraint governs the design. Extra reserve may be a consequence of other constraints.')}</p>
            {baselinePoint && view === 'load' && <p class="lat-compare">{t('К сохранённому варианту', 'Versus saved design')}: <b>{current.mass >= baselinePoint.mass ? '+' : ''}{f(100 * (current.mass / baselinePoint.mass - 1))}%</b> {t('по массе при том же p', 'mass at equal p')}. {t('Сохранено', 'Saved')}: R = {f(saved.R)} {t('мм', 'mm')}, L = {f(saved.L)} {t('мм', 'mm')}, <Tex>{String.raw`E_\varphi`}</Tex> = {f(saved.E / 1000)} {t('ГПа', 'GPa')}.</p>}
          </section></div>
          {(current.dense || current.thick || current.searchBoundary) && <p class="lat-warning" role="status">{t('Результат выходит к границе учебной модели:', 'Result approaches the limits of this model:')} {current.dense && t('сумма относительных ширин ≥ 1; ', 'sum of relative widths ≥ 1; ')}{current.thick && 'h/R > 0,1; '}{current.searchBoundary && t('достигнута граница поиска. ', 'search boundary reached. ')}{t('Такой вариант требует отдельной проверки геометрии и модели.', 'This design requires a separate geometry and model review.')}</p>}
          {view === 'load' ? <>
            <div class="lat-chart-toolbar"><h2>{t('Семейство оптимальных конструкций', 'Family of optimal designs')}</h2><div><button onClick={() => setSaved({ ...s })}>{saved ? t('Обновить эталон', 'Update reference') : t('Сохранить для сравнения', 'Save reference')}</button>{saved && <button onClick={() => setSaved(null)}>{t('Убрать сравнение', 'Clear reference')}</button>}</div></div>
            {saved && <p class="lat-note">{t('Пунктир — сохранённые параметры, сплошные линии — текущие. Сравнение при одинаковом p; при разных R осевая сила различается.', 'Dashed: saved settings; solid: current. Designs are compared at equal p; axial force differs if R differs.')}</p>}
            <div class="lat-charts">
              <Plot title={t('Угол спиральных рёбер', 'Helical rib angle')} unit="°" rows={rows} series={[{ name: 'φ', get: r => r.phi }]} selected={selected} onSelect={setP} markers={markers} baseline={baseline} xLabel={loadLabel} />
              <div><div class="lat-dimension-toggle"><button aria-pressed={!dimensionless} onClick={() => setDimensionless(false)}>{t('Размеры, мм', 'Dimensions, mm')}</button><button aria-pressed={dimensionless} onClick={() => setDimensionless(true)}>{t('Безразмерные', 'Dimensionless')}</button></div><Plot title={t('Высота и ширина рёбер', 'Rib height and widths')} unit={dimensionless ? '—' : t('мм', 'mm')} rows={rows} series={dimensions} selected={selected} onSelect={setP} markers={markers} baseline={dimensionless ? baseline?.map(r => ({ ...r, h: r.h * s.R / saved.R })) : baseline} xLabel={loadLabel} /></div>
              <Plot title={t('Поверхностная масса', 'Areal mass')} unit={t('кг/м²', 'kg/m²')} rows={rows} series={[{ name: 'M / (2πRL)', get: r => r.arealMass }]} selected={selected} onSelect={setP} markers={markers} baseline={baseline} xLabel={loadLabel} />
              <Plot title={t('Что ограничивает конструкцию', 'What governs the design')} unit="n" rows={rows} series={reserves} selected={selected} onSelect={setP} markers={markers} baseline={baseline} reference={1} xLabel={loadLabel} />
            </div>
            <p class="lat-note">{trans.analyticalValid ? `${t('Переходы аналитической ветви', 'Analytical branch transitions')}: p₁ = ${f(trans.p1)}, p₂ = ${f(trans.p2)} ${t('МПа', 'MPa')}.` : t('Для этого соотношения материалов стандартная последовательность p₁ → p₂ неприменима; показано численное решение.', 'For this material ratio the standard p₁ → p₂ sequence does not apply; the numerical solution is shown.')} <Tex>{String.raw`\delta_\varphi,\ \delta_{90}`}</Tex> — {t('ширины рёбер,', 'rib widths;')} <Tex>h</Tex> — {t('общая высота. Кривые запасов могут совпадать.', 'common height. Reserve-factor curves may overlap.')}</p>
          </> : <>
            <section class="lat-angle-control"><div class="lat-dimension-toggle"><button aria-pressed={!wideAngles} onClick={() => setWideAngles(false)}>{t('Вблизи оптимума', 'Near the optimum')}</button><button aria-pressed={wideAngles} onClick={() => setWideAngles(true)}>{t('Весь диапазон', 'Full range')}</button></div><label for="lat-angle">{t('Задайте угол и сравните массу с оптимумом', 'Choose an angle and compare mass with the optimum')}: <b>{f(chosenAngle)}°</b></label><input id="lat-angle" type="range" min={angleMin} max={angleMax} step=".01" value={chosenAngle} onInput={ev => setAngle(+ev.target.value)} /><p>{t('При каждом угле высота и ширины заново оптимизируются.', 'Height and widths are re-optimized at every angle.')} {t('Добавка массы', 'Mass penalty')}: <b>{f(massPenalty)}%</b>. {t('Лучший угол', 'Best angle')}: {f(selected.phi)}°.</p></section>
            <div class="lat-charts"><Plot title={t('Цена выбора угла', 'Cost of the chosen angle')} unit={t('кг', 'kg')} rows={angleRows} selected={anglePoint} xKey="phi" xLabel="φ, °" onSelect={setAngle} series={[{ name: 'M', get: r => r.mass }]} markers={[{ value: selected.phi, label: 'φ*' }]} /><Plot title={t('Ограничения при изменении угла', 'Constraints versus angle')} unit="n" rows={angleRows} selected={anglePoint} xKey="phi" xLabel="φ, °" onSelect={setAngle} series={reserves} reference={1} /></div>
          </>}
          <details class="lat-table-wrap"><summary>{t('Точные значения', 'Exact values')}</summary><div class="lat-table-scroll"><table><caption>{t('Точки расчётных кривых', 'Computed curve points')}</caption><thead><tr>{[<>p, {t('МПа', 'MPa')}</>, 'φ, °', <>h, {t('мм', 'mm')}</>, <>δ<sub>φ</sub>, {t('мм', 'mm')}</>, <>δ<sub>90</sub>, {t('мм', 'mm')}</>, <>M, {t('кг', 'kg')}</>, 'nᵣ', 'nₘ', 'n₀', 'nₙ'].map((v, i) => <th key={i}>{v}</th>)}</tr></thead><tbody>{(view === 'angle' ? angleRows : rows).map((r, i) => <tr key={i}>{[r.p, r.phi, r.h, r.width, r.width90, r.mass, ...MODES.map(key => r.reserves[key])].map((v, j) => <td key={j}>{f(v)}</td>)}</tr>)}</tbody></table></div></details>
        </>}
        <footer class="lat-footer">{t('Учебная модель сетчатой цилиндрической оболочки при осевом сжатии. Постановка задачи, формулы и допущения — во вкладке «Модель и формулы».', 'Educational model of a lattice cylindrical shell under axial compression. Problem setup, equations and assumptions are in the Model & equations tab.')}</footer>
      </div>
    </main>
    </div>
  </>;
}

function App() {
  const [ui, setUi] = useState(() => { const saved = loadStored('laminate.ui', {}); return { lang: initialLang(saved.lang), theme: saved.theme === 'dark' ? 'dark' : 'light', scale: Number.isFinite(saved.scale) ? Math.max(.8, Math.min(1.6, saved.scale)) : 1 }; });
  setLang(ui.lang);
  useEffect(() => {
    document.documentElement.lang = ui.lang; document.documentElement.dataset.theme = ui.theme;
    document.documentElement.style.setProperty('--scale', ui.scale);
    document.title = ui.lang === 'ru' ? 'Сетчатые оболочки · Composite' : 'Lattice shells · Composite';
    store('laminate.ui', { ...loadStored('laminate.ui', {}), ...ui });
    try { history.replaceState(null, '', `${location.pathname}?lang=${ui.lang}`); } catch {}
  }, [ui]);
  return <Language.Provider value={ui.lang}><Lab ui={ui} setUi={setUi} /></Language.Provider>;
}
render(<App />, document.getElementById('app'));
