import { useState } from 'preact/hooks';
import { ElementSketch } from './diagrams.jsx';
import { useText, Tex, Panel, Segmented, color, texNumber as tn, texMatrix, texVector } from './ui.jsx';

export function ElementPanel({ element: e }) {
  const { t, f } = useText();
  const [phase, setPhase] = useState(0), [numeric, setNumeric] = useState(false), [column, setColumn] = useState(0);
  const titles = [['Энергия', 'Energy'], ['Левый конец', 'Left end'], ['Правый конец', 'Right end'], ['Матрица', 'Matrix']];
  const filled = Math.min(phase, 2), active = phase === 1 ? 0 : phase === 2 ? 1 : null;
  const symbolic = [['c_e', '-c_e'], ['-c_e', 'c_e']];
  const a = phase === 2 ? 2 : 1, b = 3 - a;
  return <div class="fem-study-grid fem-element-study">
    <Panel title={t('Вывод уравнений элемента', 'Deriving element equations')} class="fem-derivation">
      <div class="fem-mini-steps" aria-label={t('Этапы вывода матрицы', 'Element derivation stages')}>{titles.map((title, i) => <button key={i} type="button" aria-pressed={phase === i} onClick={() => setPhase(i)}><span>{i + 1}</span>{t(...title)}</button>)}</div>
      <div class="fem-derivation-content" aria-live="polite">
        {phase === 0 && <>
          <h3>{t('Подставляем линейное поле в энергию', 'Substitute the linear field into the energy')}</h3>
          <p>{t('u₁ и u₂ — перемещения локальных концов. p₁ и p₂ — силы, действующие на выделенный элемент. Все величины считаем положительными вправо.', 'u₁ and u₂ are local end displacements. p₁ and p₂ are the forces acting on the isolated element. All quantities are positive to the right.')}</p>
          <Tex block>{'u=N_1u_1+N_2u_2,\\qquad \\varepsilon=\\frac{u_2-u_1}{\\ell_e}'}</Tex>
          <p>{t('Потенциальная энергия равна энергии деформации за вычетом работы распределённой и концевых сил.', 'Potential energy equals strain energy minus the work of distributed and end loads.')}</p>
          <Tex block>{'\\Pi_e=\\frac{E_eF_e}{2\\ell_e}(u_2-u_1)^2'}</Tex>
          <Tex block>{'\\phantom{\\Pi_e={}}-\\frac{t_e\\ell_e}{2}(u_1+u_2)-p_1u_1-p_2u_2'}</Tex>
          <details><summary>{t('До интегрирования', 'Before integration')}</summary><Tex block>{'\\Pi_e=\\frac12\\int_0^{\\ell_e}E_eF_e\\varepsilon^2 dx-\\int_0^{\\ell_e}t_eu\\,dx-p_1u_1-p_2u_2'}</Tex></details>
          <div class="fem-teaching-note"><Tex>{'c_e=E_eF_e/\\ell_e'}</Tex><p class="note">{t('Обозначим повторяющийся коэффициент через cₑ. Это продольная жёсткость элемента, Н/мм. Из двух условий стационарности получатся две строки матрицы справа.', 'Call the repeated coefficient cₑ. It is the axial stiffness in N/mm. The two stationarity conditions will give the two matrix rows on the right.')}</p></div>
        </>}
        {(phase === 1 || phase === 2) && <>
          <h3>{t(`Условие стационарности по u${a}`, `Stationarity with respect to u${a}`)}</h3>
          <p>{phase === 1 ? t('Меняем перемещение левого конца, удерживая перемещение правого. Производная энергии по u₁ должна быть равна нулю.', 'Vary the left end displacement while holding the right end displacement. The energy derivative with respect to u₁ must vanish.') : t('Теперь меняем перемещение правого конца. Аналогично получаем второе уравнение равновесия.', 'Now vary the right end displacement. This gives the second equilibrium equation.')}</p>
          <Tex block>{`\\frac{\\partial\\Pi_e}{\\partial u_${a}}=c_e(u_${a}-u_${b})-\\frac{t_e\\ell_e}{2}-p_${a}=0`}</Tex>
          <p>{t('Раскрываем скобки. Силы переносим вправо, перемещения оставляем слева.', 'Expand the brackets. Move the forces to the right and keep displacements on the left.')}</p>
          <div class="fem-equation-result"><Tex block>{`${phase === 1 ? 'c_eu_1-c_eu_2' : '-c_eu_1+c_eu_2'}=\\frac{t_e\\ell_e}{2}+p_${a}`}</Tex></div>
          <div class="fem-coefficient-pair"><div><span>{t('При', 'Coefficient of')} u₁</span><Tex>{symbolic[a - 1][0]}</Tex></div><div><span>{t('При', 'Coefficient of')} u₂</span><Tex>{symbolic[a - 1][1]}</Tex></div></div>
          <p class="note">{t(`Эти два коэффициента записываем в строку ${a} матрицы. Справа она выделена цветом. Распределённая нагрузка даёт tₑℓₑ/2 в соответствующей строке вектора fₑᵗ.`, `Write these coefficients into matrix row ${a}, highlighted on the right. The distributed load contributes tₑℓₑ/2 to the matching row of fₑᵗ.`)}</p>
        </>}
        {phase === 3 && <>
          <h3>{t('Два уравнения в матричной форме', 'Two equations in matrix form')}</h3>
          <Tex block>{'k_eu_e=f_e^t+p_e'}</Tex>
          <Tex block>{'k_e=c_e\\begin{bmatrix}1&-1\\\\-1&1\\end{bmatrix},\\quad u_e=\\begin{bmatrix}u_1\\\\u_2\\end{bmatrix}'}</Tex>
          <p>{t('Строка отвечает за равновесие одного конца. Столбец собирает коэффициенты при одном перемещении. Матрица симметрична; сумма каждой строки равна нулю.', 'A row describes equilibrium at one end. A column collects coefficients of one displacement. The matrix is symmetric and each row sums to zero.')}</p>
          <h3>{t('Проба: один конец сдвигаем на 1 мм', 'Trial: move one end by 1 mm')}</h3>
          <p class="note">{t('Для этой отдельной пробы берём t = 0. Умножение на единичный вектор выбирает столбец kₑ. Результат — силы, необходимые для удержания этих перемещений.', 'For this separate trial, set t = 0. Multiplication by a unit vector selects a column of kₑ. The result gives the forces needed to hold these displacements.')}</p>
          <Segmented label={t('Пробное перемещение', 'Trial displacement')} value={column} onChange={setColumn} options={[{ value: 0, label: 'u₁ = 1, u₂ = 0' }, { value: 1, label: 'u₁ = 0, u₂ = 1' }]} />
          <Tex block>{`${texMatrix(e.k)}${texVector(column === 0 ? [1, 0] : [0, 1])}=${texVector(e.k.map(row => row[column]))}\\;\\mathrm{N}`}</Tex>
          <p class="note">{t('Исходная задача и её распределённая нагрузка при этой пробе не меняются.', 'This trial does not change the original problem or its distributed load.')}</p>
        </>}
      </div>
      <div class="fem-local-footer"><button type="button" class="ghost-btn" disabled={phase === 0} onClick={() => setPhase(phase - 1)}>← {t('Назад', 'Back')}</button><span>{phase + 1} / 4</span><button type="button" class="ghost-btn" disabled={phase === 3} onClick={() => setPhase(phase + 1)}>{t('Следующий этап', 'Next stage')} →</button></div>
    </Panel>
    <aside class="fem-study-side fem-pin">
      <Panel title={t('Матрица элемента', 'Element matrix')} aside={<span class="head-hint">e{e.index + 1} · {filled}/2 {t('строки', 'rows')}</span>} class="fem-live-matrix">
        <label class="check"><input type="checkbox" checked={numeric} onChange={ev => setNumeric(ev.target.checked)} />{t('Подставить числа', 'Substitute numbers')}</label>
        {numeric && <p class="note">kₑ: {t('Н/мм', 'N/mm')} · fₑᵗ: {t('Н', 'N')}</p>}
        <div class="fem-local-matrices" role="region" aria-label={t('Заполнение матрицы элемента', 'Element matrix construction')}>
          <div><Tex>{'k_e'}</Tex><table class="fem-local-matrix"><thead><tr><th>{t('Конец', 'End')}</th><th>u₁</th><th>u₂</th></tr></thead><tbody>{[0, 1].map(row => <tr key={row} class={row === active ? 'fem-active-row' : ''}><th><button type="button" class="link-btn" aria-label={t(`Вывод для конца ${row + 1}`, `Derivation for end ${row + 1}`)} onClick={() => setPhase(row + 1)}>{row + 1}</button></th>{[0, 1].map(col => <td key={col} data-filled={row < filled}>{row < filled ? <Tex>{numeric ? tn(e.k[row][col]) : symbolic[row][col]}</Tex> : '···'}</td>)}</tr>)}</tbody></table></div>
          <div><Tex>{'f_e^t'}</Tex><table class="fem-local-matrix fem-local-load"><thead><tr><th>{t('Нагрузка', 'Load')}</th></tr></thead><tbody>{[0, 1].map(row => <tr key={row} class={row === active ? 'fem-active-row' : ''}><td data-filled={row < filled}>{row < filled ? <Tex>{numeric ? tn(e.load[row]) : 't_e\\ell_e/2'}</Tex> : '···'}</td></tr>)}</tbody></table></div>
        </div>
        <p class="note" aria-live="polite">{phase === 0 ? t('Две строки ещё не выведены. Начните с условия для левого конца.', 'Neither row has been derived yet. Start with the left end condition.') : phase === 1 ? t('Получена строка 1. Далее — равновесие правого конца.', 'Row 1 is complete. Next comes equilibrium of the right end.') : t('Обе строки получены. Нажмите номер конца, чтобы вернуться к его выводу.', 'Both rows are complete. Select an end number to revisit its derivation.')}</p>
        <div class="fem-stiffness-value" style={{ '--element-color': color(e.index) }}><Tex>{'c_e=E_eF_e/\\ell_e'}</Tex><strong>{f(e.alpha)} <span class="unit">{t('Н/мм', 'N/mm')}</span></strong></div>
      </Panel>
      <ElementSketch element={e} activeEnd={active} />
    </aside>
  </div>;
}
