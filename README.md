# Composite · механика композитов и конструкций

[English version below](#composite--composite-and-structural-mechanics)

Каталог учебных модулей: **https://avazar.github.io/composite/**. Первая карточка открывает раздел «Прочность слоистых композитов». В шапке раздела ссылка «Все темы» возвращает в каталог, сохраняя язык. Старый адрес `https://avazar.github.io/laminate/` перенаправляет в раздел прочности с сохранением параметров и вкладки.

Раздел **«Метод конечных элементов»**: `https://avazar.github.io/composite/fem/`. Линейные двухузловые стержневые элементы, работающие на растяжение и сжатие. Режим «По шагам» показывает функции формы, вывод матрицы элемента через энергию, сборку матрицы и вектора нагрузок, учёт ГУ, перемещения и реакции. В режиме «Эксперимент» можно менять сетку, нагрузки, закрепления и свойства двух участков, сравнивать поля с аналитическим решением и исследовать сходимость.

По умолчанию открыт пример лекции: стержень с двумя закреплёнными концами и равномерной продольной нагрузкой, два КЭ. Для численного показа приняты L = 1000 мм, E = 70 ГПа, F = 100 мм², t = 10 Н/мм. Доступны также сила на свободном конце, два участка разной жёсткости, заданное перемещение опоры и отсутствие закреплений. Ссылка `/fem/?lang=en#experiment` открывает английский режим эксперимента. Расчётная схема при загрузке всегда возвращается к примеру лекции; язык, тема и масштаб шрифта общие с разделом прочности.

Учебный раздел о критериях прочности и прогрессивном разрушении слоистых композитов: **https://avazar.github.io/composite/strength/**

- **Слой.** Предельные поверхности в осях σ₁, σ₂, τ₁₂ для семи критериев (максимальных напряжений, аппроксимационного по В. В. Васильеву, Цая–Ву, Хашина, максимальных деформаций, Цая–Хилла, Хоффмана) и три среза: σ₁–σ₂, σ₁–τ₁₂, σ₂–τ₁₂.
- **Пакет.** Укладка из слоёв разных материалов, пропорциональная нагрузка σx : σy : τxy, расчёт прогрессивного разрушения и диаграмма деформирования. Разрушение слоя определяется по одному из критериев, различающих волокно и матрицу: максимальных напряжений, аппроксимационному, Хашина, максимальных деформаций.

Ссылка `https://avazar.github.io/composite/strength/#laminate` открывает сразу вкладку «Пакет», а `https://avazar.github.io/composite/strength/?lang=en` — английскую версию. Язык переключается и кнопкой EN / RU в шапке.

Сайт создан в учебных целях. Модели упрощены, свойства материалов — типовые, поэтому результаты могут быть неточными и не годятся для проектных расчётов.

Для каждого конца стержня выбирается одно ГУ: «Закреплено» (u = 0), «Задано перемещение», «Свободный край» (P = 0) или «Задана сила». Поле величины появляется только для выбранного перемещения или силы. Значения из неактивных режимов в расчёте не участвуют; распределённая нагрузка задаётся отдельно.

В режиме «По шагам» исходные данные редактируются на первой странице. На следующих страницах доступен возврат к ним с сохранением задачи; в «Эксперименте» панель параметров остаётся рядом с результатами. Сборка разбирается по узлам: концевые силы соседних элементов, их сумма, коэффициенты строки K и узловая нагрузка. На этапе ГУ показана полная система до и после подстановки заданных перемещений. На этапе решения сначала выводится система с неизвестными u, затем найденные перемещения, расчёт реакций и итоговая таблица. Для больших сеток все уравнения доступны в прокручиваемом списке.

Учебные страницы скомпонованы по смысловым блокам. Аппроксимация показана рядом со схемой выделенного элемента, его концевыми силами и перемещениями. Вывод матрицы проходит через энергию и два условия стационарности; правая панель заполняется по строкам и переключается между буквами и числами. При сборке общая матрица остаётся справа при прокрутке разбора узла. График полей и таблица сходимости стоят рядом; ширина графиков ограничена. На узком экране блоки располагаются последовательно.

## Как собрать у себя

Нужен Node.js 24 или новее.

```bash
npm install
```

```bash
npm run build
```

```bash
npm test
```

`npm run build` создаёт папку `site/` — обычный статический сайт. Его можно открыть двойным кликом по `site/index.html`: интернет не нужен, библиотеки и шрифты лежат внутри. `npm test` проверяет переходы между страницами и расчётное ядро: формулы жёсткости, критерии, алгоритм разрушения.

Сайт на GitHub Pages обновляется сам: при каждом изменении ветки `dev` GitHub запускает тесты, сборку и публикацию (`.github/workflows/pages.yml`).

## Где что лежит

| Файл | Содержание |
|---|---|
| `src/home/` | Главная страница с карточками учебных модулей |
| `src/fem/` | Модуль МКЭ: отдельная страница, учебные шаги, интерактивные матрицы и графики |
| `src/fem/core.js` | Чистое ядро МКЭ, сборка, исключение заданных перемещений, реакции, независимое аналитическое решение и нормы ошибки |
| `src/main.jsx`, `src/index.html` | Модуль прочности, собирается в `site/strength/` |
| `src/shared.css`, `src/navigation.js` | Общее оформление и переходы с сохранением языка |
| `src/core/materials.js` | Свойства материалов: стеклопластик, органопластик, углепластик |
| `src/core/mech.js` | Закон Гука для слоя, преобразования поворота, жёсткость пакета A = Σ B̄ᵢh̄ᵢ |
| `src/core/criteria.js` | Семь критериев прочности |
| `src/core/progressive.js` | Алгоритм прогрессивного разрушения |
| `src/core/contour.js`, `src/core/bounds.js` | Линии срезов и габариты поверхностей |
| `src/viz/surface3d.js` | Трёхмерная сцена (three.js) |
| `src/ui/` | Интерфейс (Preact) |
| `src/i18n.js` | Тексты интерфейса на русском и английском |

## Добавление темы

Добавьте отдельную точку входа и HTML-шаблон модуля, включите их в `build.mjs`, затем добавьте карточку и тексты RU / EN в `src/home/main.jsx`. Каждая тема публикуется в собственной папке `site/<тема>/index.html`; переходы используйте относительные, через `topicHref()`. Главная не загружает расчётное ядро, KaTeX и three.js.

## Принятые допущения

Для FEM: прямой стержень, малые деформации, линейная упругость, одна степень свободы на узел. Внутри элемента E, площадь F и нагрузка t постоянны; граница двух материалов всегда совпадает с узлом в L/2, включая нечётные сетки. Система единиц расчёта — Н, мм, МПа; модуль в интерфейсе вводится в ГПа. Ненулевые заданные перемещения переносят вклад в правую часть; реакции вычисляются по исходной системе. Силы на концах элемента `kₑuₑ − fₑᵗ` отделены от усилия `N = EF duₕ/dx`, которое постоянно внутри линейного элемента и при распределённой нагрузке не совпадает с концевыми силами. Изгиб и потеря устойчивости исключены. Без закреплений модуль объясняет отсутствие единственного решения и сохраняет доступ к сборке матриц. `test/fem.test.mjs` проверяет аналитические примеры, реакции, неоднородность, ненулевые ГУ и сходимость.

Для раздела прочности:

- Оси слоя 1–2, оси пакета x–y, ν₂₁ — больший коэффициент Пуассона (E₁ν₁₂ = E₂ν₂₁).
- Пакет рассматривается в мембранной постановке, без изгиба; порядок слоёв на результат не влияет.
- Показатель F — величина, обратная запасу прочности: при умножении всех напряжений на 1/F точка попадает на предельную поверхность.
- Разрушение матрицы переводит слой на нитяную модель (E₂ = G₁₂ = ν = 0), разрушение волокна выключает слой. Набранные к моменту разрушения матрицы σ₂ и τ₁₂ по выбору либо сбрасываются до нуля («хрупкая» матрица, по умолчанию), либо остаются на достигнутом уровне и дальше не растут («пластичная»).
- Между событиями задача линейна, поэтому диаграмма строится точно, без шагов по нагрузке. «Жёсткое» нагружение удерживает деформацию в направлении нагрузки, «мягкое» — саму нагрузку.
- Для критерия максимальных деформаций предельные деформации приняты ε̄ = σ̄/E.
- В критерии Хашина прочность на поперечный сдвиг τ̄₂₃ принята равной σ̄₂⁻/2. Параметр α (вклад сдвига в разрушение волокна) на вкладке «Слой» по умолчанию равен 1, в расчёте пакета — 0, чтобы сдвиг не выключал слой целиком.
- Остаточные температурные напряжения и расслоение не учитываются.

## Лицензия

Код сайта распространяется по лицензии MIT, см. файл [LICENSE](LICENSE).

Сторонние компоненты: three.js, KaTeX, Preact (MIT), шрифты IBM Plex (SIL OFL 1.1). Тексты их лицензий сборка кладёт в `site/THIRD-PARTY-LICENSES.txt`.

---

# Composite · composite and structural mechanics

Learning modules: **https://avazar.github.io/composite/?lang=en**. The first card opens the strength lab; “All topics” returns to the catalog in the same language. The old `https://avazar.github.io/laminate/` address redirects to the strength module, preserving the query string and selected tab.

**Finite element method:** `https://avazar.github.io/composite/fem/?lang=en`. Two-node linear axial bar elements, with **Step by step** and **Experiment** modes. Explore shape functions, element stiffness, assembly, nonzero displacement boundary conditions, reactions, fields and mesh convergence against an independent analytical solution. The default lecture example uses a uniform load, two fixed ends and two elements (L = 1000 mm, E = 70 GPa, F = 100 mm², t = 10 N/mm). Presets include end-force loading, two stiffness regions, support displacement and an unsupported bar. Supports and point loads act at the endpoints; the optional material interface stays at L/2. The model excludes bending and buckling. Open `#experiment` for the experiment mode; model parameters reset to the lecture example on reload.

An educational module on failure criteria and progressive failure of composite laminates: **https://avazar.github.io/composite/strength/?lang=en**

- **Ply.** Failure surfaces in the axes σ₁, σ₂, τ₁₂ for seven criteria (maximum stress, the approximation criterion from V. V. Vasiliev's book, Tsai–Wu, Hashin, maximum strain, Tsai–Hill, Hoffman) and three sections: σ₁–σ₂, σ₁–τ₁₂, σ₂–τ₁₂.
- **Laminate.** A layup of plies of different materials, proportional loading σx : σy : τxy, progressive failure analysis and the stress–strain curve. Ply failure is detected by one of the criteria that tell fiber from matrix: maximum stress, approximation, Hashin, maximum strain.

The language is switched by the EN / RU button in the header; `?lang=en` in the address opens the English version directly, and `#laminate` opens the Laminate tab.

This site is an educational tool. The models are simplified and the material properties are typical values, so the results may be inaccurate and must not be used for design.

Each bar end has one boundary condition: fixed (u = 0), prescribed displacement, free end (P = 0), or applied force. Only the selected displacement or force input is shown and used in the calculation; distributed loading is specified separately.

In Step by step mode, problem parameters are edited on the first page; later pages provide a return link and retain the current problem. Experiment mode keeps the parameter sidebar. Assembly walks through node equilibrium, adjacent element end forces, their sum, matrix row coefficients and nodal loads. The boundary-condition page shows the complete system before and after displacement substitution. The solution page shows the system with unknown u values first, then solved displacements, reaction calculations and the results table. Large meshes retain every equation in a scrollable list.

Lesson pages group related content into panels. Interpolation is paired with an isolated-element diagram showing end forces and displacements. Element stiffness is derived through energy and two stationarity conditions; the right panel fills row by row and switches between symbolic and numerical coefficients. During assembly, the global matrix stays visible beside the node derivation. Field plots have a bounded width and sit beside the convergence table. Panels stack on narrow screens.

## Build

Node.js 24 or newer is required.

```bash
npm install
```

```bash
npm run build
```

```bash
npm test
```

`npm run build` creates the `site/` folder, a plain static site that also opens from disk by double-clicking `site/index.html` (no internet needed). `npm test` checks the solver: stiffness formulas, criteria, the failure algorithm. Every push to the `dev` branch runs the tests, the build and the GitHub Pages deployment.

## Assumptions

- Ply axes 1–2, laminate axes x–y. Note the index convention: ν₂₁ is the major Poisson's ratio (E₁ν₁₂ = E₂ν₂₁).
- The laminate is a membrane, bending is neglected; the stacking order does not affect the result.
- The index F is the reciprocal of the safety factor: multiplying all stresses by 1/F puts the point on the failure surface.
- Matrix failure switches the ply to the netting model (E₂ = G₁₂ = ν = 0); fiber failure removes the ply. The σ₂ and τ₁₂ reached at matrix failure either drop to zero (“brittle” matrix, the default) or stay at that level and stop growing (“plastic” matrix).
- Between events the problem is linear, so the curve is exact, with no load stepping. Strain control holds the strain in the load direction, load control holds the load.
- For the maximum strain criterion the ultimate strains are taken as ε̄ = σ̄/E.
- In the Hashin criterion the transverse shear strength τ̄₂₃ is taken as σ̄₂⁻/2. The parameter α (shear contribution to fiber failure) defaults to 1 on the Ply tab and to 0 in the laminate analysis, so that shear does not remove a ply completely.
- Residual thermal stresses and delamination are not considered.

## License

The code is released under the MIT license, see [LICENSE](LICENSE). Third-party components: three.js, KaTeX, Preact (MIT), IBM Plex fonts (SIL OFL 1.1); their license texts are written to `site/THIRD-PARTY-LICENSES.txt` by the build.
