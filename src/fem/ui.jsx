import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
export { Tex, Num, Panel, Segmented } from '../ui/common.jsx';
export const Language = createContext('ru');
export function useText() {
  const lang = useContext(Language);
  const t = (ru, en) => lang === 'ru' ? ru : en;
  const f = value => Number.isFinite(value)
    ? (Math.abs(value) < 1e-10 ? 0 : value).toLocaleString(lang, { maximumSignificantDigits: 5, useGrouping: false }) : '—';
  return { lang, t, f };
}
export const colors = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--c-tsaiWu)', 'var(--c-hoffman)', 'var(--c-maxStrain)'];
export const color = i => colors[i % colors.length];
export { texNumber, texMatrix, texVector } from './notation.js';

export function Status({ result }) {
  const { t, f } = useText();
  if (result.status === 'ok') return null;
  const balanced = Math.abs(result.resultant || 0) <= 1e-9 * Math.max(1, result.f.reduce((sum, v) => sum + Math.abs(v), 0));
  return <div class="fem-warning" role="status">
    <strong>{t('Нет единственного решения', 'No unique solution')}</strong>
    <p>{result.status === 'unrestrained'
      ? balanced ? t('Закреплений нет. Стержень можно перемещать как целое без деформации: ко всем u можно прибавить одну константу. Задайте перемещение хотя бы одного конца.', 'There are no supports. A rigid translation creates no strain: the same constant can be added to every u. Prescribe the displacement of at least one end.')
        : t(`Закреплений нет, сумма внешних сил ${f(result.resultant)} Н. Статическое равновесие невозможно. Задайте закрепление.`, `There are no supports and the resultant load is ${f(result.resultant)} N. Static equilibrium is impossible. Add a support.`)
      : t('Система численно вырождена. Проверьте соотношение жёсткостей и закрепления.', 'The system is numerically singular. Check stiffness ratios and supports.')}</p>
    <p class="note">{t('Матрицы и их сборку можно изучать и без решения.', 'The matrices and assembly remain available for inspection.')}</p>
  </div>;
}
