import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { initialLang } from '../i18n.js';
import { topicHref } from '../navigation.js';
import './styles.css';

// Общие настройки сохраняют совместимость со старым адресом /laminate/.
const UI_KEY = 'laminate.ui';
function readUi() {
  try { return JSON.parse(localStorage.getItem(UI_KEY) || '{}') || {}; }
  catch { return {}; }
}

const copy = {
  ru: {
    title: 'Composite · механика композитов и конструкций',
    label: 'Интерактивные учебные модули',
    heading: <>Механика композитов<br />и конструкций</>,
    intro: 'От модели — к пониманию. Исследуйте поведение материалов и конструкций: меняйте параметры, сравнивайте результаты и проверяйте свои предположения.',
    topics: 'Темы', count: '01 / доступна',
    category: 'Механика композитов',
    strength: 'Прочность слоистых композитов',
    description: 'От разрушения отдельного слоя до потери несущей способности пакета. Критерии прочности, предельные поверхности и виртуальные испытания.',
    ply: 'Слой · критерии прочности', laminate: 'Пакет · прогрессивное разрушение',
    open: 'Открыть тему',
    footer: 'Для изучения механики, лекций и самостоятельных экспериментов.',
    source: 'Исходный код',
    theme: 'Изменить тему оформления', light: 'Светлая тема', dark: 'Тёмная тема',
    diagram: 'Схема слоистого композита с разными направлениями армирования',
  },
  en: {
    title: 'Composite · composite and structural mechanics',
    label: 'Interactive learning modules',
    heading: <>Composite and<br />structural mechanics</>,
    intro: 'From models to understanding. Explore how materials and structures behave: change parameters, compare results and test your assumptions.',
    topics: 'Topics', count: '01 / available',
    category: 'Composite mechanics',
    strength: 'Strength of composite laminates',
    description: 'From the failure of a single ply to the loss of laminate load capacity. Failure criteria, failure surfaces and virtual tests.',
    ply: 'Ply · failure criteria', laminate: 'Laminate · progressive failure',
    open: 'Explore topic',
    footer: 'For learning mechanics, lectures and independent exploration.',
    source: 'Source code',
    theme: 'Change color theme', light: 'Light theme', dark: 'Dark theme',
    diagram: 'Composite laminate diagram with different reinforcement directions',
  },
};

function LaminateIllustration({ label }) {
  return (
    <svg class="laminate-illustration" viewBox="0 0 480 340" role="img" aria-label={label}>
      <defs>
        {[[-23.4, '0'], [0, '45'], [90, '-45'], [23.6, '90']].map(([rotation, direction]) => (
          <pattern key={direction} id={`fibers-${direction}`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform={`rotate(${rotation})`}>
            <path d="M0 0H12" stroke="currentColor" stroke-width="1" opacity=".28" />
          </pattern>
        ))}
      </defs>
      <g fill="none" stroke="currentColor" opacity=".2" stroke-dasharray="3 6">
        <path d="M76 125v142M240 54v142M405 125v142M240 197v142" />
      </g>
      {[{ y: 126, color: 'var(--m-carbon)', pattern: 'fibers-90' }, { y: 84, color: 'var(--m-aramid)', pattern: 'fibers--45' }, { y: 42, color: 'var(--m-glass)', pattern: 'fibers-45' }, { y: 0, color: 'var(--m-glass)', pattern: 'fibers-0' }].map(({ y, color, pattern }, i) => (
        <g key={y} transform={`translate(0 ${y})`}>
          <path d="M76 125 240 54 405 125 240 197Z" fill="var(--surface)" />
          <path d="M76 125 240 54 405 125 240 197Z" fill={color} fill-opacity={i === 3 ? '.22' : '.13'} stroke={color} stroke-width="1.8" stroke-linejoin="round" />
          <path d="M76 125 240 54 405 125 240 197Z" fill={`url(#${pattern})`} />
        </g>
      ))}
      <g class="diagram-labels" fill="currentColor">
        <text x="425" y="130">0°</text><text x="425" y="172">45°</text>
        <text x="425" y="214">−45°</text><text x="425" y="256">90°</text>
      </g>
    </svg>
  );
}

function Home() {
  const [ui, setUi] = useState(() => {
    const saved = readUi();
    return { lang: initialLang(saved.lang), theme: saved.theme === 'dark' ? 'dark' : 'light' };
  });
  const t = copy[ui.lang];
  useEffect(() => {
    document.documentElement.lang = ui.lang;
    document.documentElement.dataset.theme = ui.theme;
    document.title = t.title;
    try { localStorage.setItem(UI_KEY, JSON.stringify({ ...readUi(), ...ui })); } catch {}
    try {
      const url = new URL(location.href);
      url.searchParams.set('lang', ui.lang);
      history.replaceState(null, '', url);
    } catch {}
  }, [ui]);

  return (
    <div class="portal">
      <header class="portal-header">
        <a class="portal-brand" href={topicHref('./', ui.lang)} aria-label="Composite">
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 5l13 6-13 6-13-6z" fill="var(--m-glass)" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" /><path d="M3 16l13 6 13-6" fill="none" stroke="var(--m-aramid)" stroke-width="2.2" stroke-linejoin="round" /><path d="M3 21l13 6 13-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" /></svg>
          <span>Composite</span>
        </a>
        <div class="portal-tools">
          <button type="button" lang={ui.lang === 'ru' ? 'en' : 'ru'} aria-label={ui.lang === 'ru' ? 'English version' : 'Русская версия'} onClick={() => setUi({ ...ui, lang: ui.lang === 'ru' ? 'en' : 'ru' })}>{ui.lang === 'ru' ? 'EN' : 'RU'}</button>
          <button type="button" aria-label={ui.theme === 'light' ? t.dark : t.light} title={t.theme} onClick={() => setUi({ ...ui, theme: ui.theme === 'light' ? 'dark' : 'light' })}>
            {ui.theme === 'light' ? <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16 12.3A7 7 0 0 1 7.7 4 7 7 0 1 0 16 12.3Z" fill="none" stroke="currentColor" stroke-width="1.5" /></svg> : <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.5" fill="none" stroke="currentColor" stroke-width="1.5" /><path d="M10 1v3m0 12v3M1 10h3m12 0h3M3.6 3.6l2 2m8.8 8.8 2 2m0-12.8-2 2m-8.8 8.8-2 2" stroke="currentColor" stroke-width="1.5" /></svg>}
          </button>
        </div>
      </header>
      <main class="portal-main">
        <section class="portal-intro" aria-labelledby="portal-title">
          <p class="eyebrow"><span class="status-dot" />{t.label}</p>
          <h1 id="portal-title">{t.heading}</h1>
          <p class="portal-description">{t.intro}</p>
        </section>
        <section class="topic-section" aria-labelledby="topics-title">
          <div class="section-label"><h2 id="topics-title">{t.topics}</h2><span>{t.count}</span></div>
          <a class="topic-card" href={topicHref('./strength/', ui.lang)} aria-labelledby="strength-title" aria-describedby="strength-description">
            <div class="topic-visual"><span class="topic-number" aria-hidden="true">01</span><LaminateIllustration label={t.diagram} /></div>
            <div class="topic-content">
              <p class="eyebrow">{t.category}</p>
              <h3 id="strength-title">{t.strength}</h3>
              <p class="topic-description" id="strength-description">{t.description}</p>
              <ul class="topic-parts"><li>{t.ply}</li><li>{t.laminate}</li></ul>
              <span class="topic-open">{t.open}<span aria-hidden="true">↗</span></span>
            </div>
          </a>
        </section>
      </main>
      <footer class="portal-footer"><p>{t.footer}</p><a href="https://github.com/avazar/composite" target="_blank" rel="noopener">{t.source} <span aria-hidden="true">↗</span></a></footer>
    </div>
  );
}

render(<Home />, document.getElementById('app'));
