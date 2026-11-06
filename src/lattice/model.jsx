import { Tex } from '../ui/common.jsx';
import { useText } from '../fem/ui.jsx';

export function Model() {
  const { t } = useText();
  return <section class="lat-model">
    <h2>{t('Как устроена расчётная модель', 'How the model works')}</h2>
    <p>{t('Рассматриваем цилиндрическую оболочку без обшивки: два семейства спиральных рёбер и кольцевые рёбра. Для каждой осевой нагрузки находим конструкцию минимальной массы, удовлетворяющую условиям прочности и устойчивости.', 'We consider a skinless cylinder with two families of helical ribs and a family of hoop ribs. For each axial load, we find the lightest design that satisfies strength and stability constraints.')}</p>

    <h3>{t('Геометрия и материал', 'Geometry and materials')}</h3>
    <p><Tex>R</Tex> — {t('радиус,', 'radius,')} <Tex>L</Tex> — {t('длина,', 'length,')} <Tex>h</Tex> — {t('общая высота рёбер.', 'common rib height.')} {t('Спиральные рёбра направлены под углами', 'Helical ribs run at angles')} <Tex>{String.raw`\pm\varphi`}</Tex> {t('к оси цилиндра. Индекс', 'to the cylinder axis. The subscript')} <Tex>{String.raw`\varphi`}</Tex> {t('обозначает спиральные рёбра, индекс', 'denotes helical ribs;')} <Tex>90</Tex> — {t('кольцевые рёбра.', 'denotes hoop ribs.')}</p>
    <p><Tex>{String.raw`E_\varphi,\ E_{90}`}</Tex> — {t('модули упругости вдоль рёбер;', 'elastic moduli along the ribs;')} <Tex>{String.raw`\rho_\varphi,\ \rho_{90}`}</Tex> — {t('плотности материалов;', 'material densities;')} <Tex>{String.raw`\bar\sigma`}</Tex> — {t('прочность спиральных рёбер при сжатии.', 'compressive strength of the helical ribs.')}</p>
    <p>{t('Ширину каждого ребра делим на шаг соответствующего семейства. Получаем безразмерные относительные ширины и отношение плотностей:', 'Dividing each rib width by the pitch of its family gives the dimensionless relative widths. We also define the density ratio:')}</p>
    <Tex block>{String.raw`\bar\delta_\varphi=\frac{\delta_\varphi}{a_\varphi},\qquad \bar\delta_{90}=\frac{\delta_{90}}{a_{90}},\qquad \bar\rho=\frac{\rho_{90}}{\rho_\varphi}`}</Tex>
    <p>{t('Осевая сила задаёт нормированную нагрузку. Для записи формул вводим сокращения:', 'The axial force defines a normalized load. We use the following shorthand:')}</p>
    <Tex block>{String.raw`p=\frac{P}{\pi R^2},\qquad c=\cos\varphi,\qquad s=\sin\varphi`}</Tex>
    <p><Tex>p</Tex> {t('имеет размерность напряжения, но не является давлением на стенку оболочки.', 'has stress units, but is not pressure applied to the cylinder wall.')}</p>
    <details><summary>{t('От числа рёбер к шагам и ширинам', 'From rib count to pitches and widths')}</summary>
      <p>{t('Пусть', 'Let')} <Tex>n</Tex> — {t('общее число спиральных рёбер, поровну в двух направлениях. Тогда геометрия треугольной ячейки даёт:', 'the total number of helical ribs, equally divided between the two directions. The triangular cell geometry gives:')}</p>
      <Tex block>{String.raw`a=\frac{4\pi R}{n},\qquad a_\varphi=a\cos\varphi,\qquad a_{90}=\frac{a}{2\tan\varphi}`}</Tex>
      <Tex block>{String.raw`\delta_\varphi=a_\varphi\bar\delta_\varphi,\qquad \delta_{90}=a_{90}\bar\delta_{90}`}</Tex>
      <p>{t('Увеличение числа рёбер уменьшает шаг и ширину при тех же относительных ширинах. Масса и предельные силы в непрерывной модели при этом сохраняются.', 'Increasing the rib count reduces pitch and width at fixed relative widths. Mass and capacities remain unchanged in the continuous model.')}</p>
    </details>

    <h3>{t('Минимизируем массу', 'Minimize mass')}</h3>
    <p>{t('Суммируем объёмы двух семейств спиральных рёбер и кольцевых рёбер с учётом плотности каждого материала:', 'We add the volumes of the two helical rib families and the hoop ribs, weighted by their respective material densities:')}</p>
    <Tex block>{String.raw`M=2\pi RLh\left(2\rho_\varphi\bar\delta_\varphi+\rho_{90}\bar\delta_{90}\right)\longrightarrow\min`}</Tex>
    <p>{t('На графике поверхностной массы показана масса, отнесённая к боковой площади цилиндра:', 'The areal-mass plot shows mass per unit lateral area of the cylinder:')}</p>
    <Tex block>{String.raw`m_A=\frac{M}{2\pi RL}`}</Tex>

    <h3>{t('Проверяем четыре ограничения', 'Check four constraints')}</h3>
    <p>{t('Каждая предельная сила должна быть не меньше приложенной нагрузки. Коэффициент запаса равен отношению этих сил:', 'Each capacity must be at least the applied load. Its reserve factor is the ratio of the two forces:')}</p>
    <Tex block>{String.raw`P_i\ge P,\qquad n_i=\frac{P_i}{P}\ge1,\qquad i\in\{r,m,0,n\}`}</Tex>
    <div class="lat-formulas">
      <div><h4>{t('Прочность спиральных рёбер', 'Helical rib strength')}</h4><Tex block>{String.raw`P_r=4\pi R\bar\sigma h\bar\delta_\varphi c^2`}</Tex></div>
      <div><h4>{t('Местная устойчивость спиральных рёбер', 'Local buckling of helical ribs')}</h4><Tex block>{String.raw`P_m=\frac{4\pi^3 k}{3}E_\varphi Rh\bar\delta_\varphi^3c^4s^2`}</Tex></div>
      <div><h4>{t('Осесимметричная форма общей потери устойчивости', 'Axisymmetric global buckling')}</h4><Tex block>{String.raw`P_0=2\pi\sqrt{\frac23}h^2c^2\sqrt{E_\varphi E_{90}\bar\delta_\varphi\bar\delta_{90}}`}</Tex></div>
      <div><h4>{t('Неосесимметричная форма общей потери устойчивости', 'Non-axisymmetric global buckling')}</h4><Tex block>{String.raw`P_n=4\pi\sqrt{\frac23}E_\varphi\bar\delta_\varphi h^2c^2s^2\sqrt{1+\sqrt{1+\frac{E_{90}\bar\delta_{90}}{2E_\varphi\bar\delta_\varphi s^4}}}`}</Tex></div>
    </div>
    <p><Tex>k</Tex> {t('учитывает закрепление участка спирального ребра между узлами. Ограничение с', 'accounts for the end restraint of a helical rib segment between joints. A constraint with')} <Tex>{String.raw`n_i\approx1`}</Tex> {t('называем активным: оно определяет размеры конструкции. Несколько ограничений могут быть активными одновременно.', 'is called active: it governs the design dimensions. Several constraints can be active at the same time.')}</p>

    <h3>{t('Находим оптимальную конструкцию', 'Find the optimal design')}</h3>
    <p>{t('Для каждой нагрузки меняем угол и отношение относительных ширин рёбер. При выбранной паре этих параметров условия прочности и устойчивости позволяют выразить необходимые высоту и ширины. Сравниваем массу полученных вариантов и выбираем наименьшую.', 'For each load, we vary the angle and the ratio of relative rib widths. For each pair, the strength and stability constraints determine the required height and widths. We compare the resulting masses and select the smallest.')}</p>
    <details><summary>{t('Как свести задачу к двум параметрам', 'How to reduce the problem to two parameters')}</summary>
      <p>{t('Введём отношение относительных ширин и произведение высоты на относительную ширину:', 'Introduce the relative-width ratio and the product of height and relative width:')}</p>
      <Tex block>{String.raw`q=\frac{\bar\delta_{90}}{\bar\delta_\varphi},\qquad u=h\bar\delta_\varphi`}</Tex>
      <p>{t('Для фиксированных', 'For fixed')} <Tex>{String.raw`\varphi`}</Tex> {t('и', 'and')} <Tex>q</Tex> {t('перепишем предельные силы через коэффициенты:', 'we rewrite the capacities using these coefficients:')}</p>
      <Tex block>{String.raw`A=\frac{4\pi^3k}{3}E_\varphi R c^4s^2,\qquad P_m=A\frac{u^3}{h^2}`}</Tex>
      <Tex block>{String.raw`G_0=2\pi\sqrt{\frac23}c^2\sqrt{E_\varphi E_{90}q}`}</Tex>
      <Tex block>{String.raw`G_n=4\pi\sqrt{\frac23}E_\varphi c^2s^2\sqrt{1+\sqrt{1+\frac{E_{90}q}{2E_\varphi s^4}}}`}</Tex>
      <Tex block>{String.raw`G=\min(G_0,G_n),\qquad \min(P_0,P_n)=Ghu`}</Tex>
      <p>{t('Местная и общая устойчивость ограничивают высоту с двух сторон:', 'Local and global stability bound the height from both sides:')}</p>
      <Tex block>{String.raw`\frac{P}{Gu}\le h\le\sqrt{\frac{Au^3}{P}}`}</Tex>
      <p>{t('Добавляя условие прочности, получаем минимальное допустимое произведение:', 'Adding the strength constraint gives the smallest feasible product:')}</p>
      <Tex block>{String.raw`u=\max\left\{\frac{P}{4\pi R\bar\sigma c^2},\ \sqrt[5]{\frac{P^3}{AG^2}}\right\}`}</Tex>
      <p>{t('Выбираем нижнюю допустимую высоту и восстанавливаем относительные ширины:', 'Choose the lowest feasible height and recover the relative widths:')}</p>
      <Tex block>{String.raw`h=\frac{P}{Gu},\qquad \bar\delta_\varphi=\frac uh,\qquad \bar\delta_{90}=q\frac uh`}</Tex>
      <p>{t('Остаётся численно минимизировать массу по двум параметрам:', 'We then minimize mass numerically over two parameters:')}</p>
      <Tex block>{String.raw`M(\varphi,q)=2\pi RL\rho_\varphi u\left(2+\bar\rho q\right)`}</Tex>
      <p>{t('Диапазон поиска:', 'Search range:')}</p>
      <Tex block>{String.raw`1^\circ\le\varphi\le85^\circ,\qquad e^{-12}\le q\le e^8`}</Tex>
    </details>
    <p>{t('Каждая точка графиков по нагрузке — отдельная оптимальная конструкция. В режиме «Почему такой угол?» угол задаёт пользователь, а размеры рёбер оптимизируются заново; прибавка массы показывает цену этого выбора.', 'Each point in the load plots is a separately optimized design. In “Why this angle?”, the user fixes the angle and the rib dimensions are re-optimized; the mass penalty shows the cost of that choice.')}</p>

    <details><summary>{t('Почему меняются определяющие ограничения', 'Why the governing constraints change')}</summary>
      <p>{t('На осесимметричной аналитической ветви при малых нагрузках размеры определяются местной и общей устойчивостью. При', 'At low loads on the axisymmetric analytical branch, local and global stability govern the dimensions. At')} <Tex>{String.raw`p=p_1`}</Tex> {t('становится активным также условие прочности:', 'the strength constraint also becomes active:')}</p>
      <Tex block>{String.raw`p_1=\frac{48\bar\sigma^2}{\pi E_\varphi}\sqrt{\frac{\bar\rho\bar\sigma}{kE_{90}}}`}</Tex>
      <p>{t('Переход к равенству двух критических сил общей устойчивости на этой ветви определяется соотношением материалов:', 'The transition to equal global buckling capacities on this branch depends on the material ratio:')}</p>
      <Tex block>{String.raw`\chi=\frac{2E_\varphi\bar\rho}{E_{90}},\qquad p_2=\frac{p_1}{4}\left(\sqrt\chi+\sqrt{\chi-1}\right)^2`}</Tex>
      <p>{t('Эта последовательность переходов применима при', 'This sequence of transitions applies when')} <Tex>{String.raw`\chi\ge\frac{25}{16}`}</Tex>. {t('При других соотношениях материалов метки переходов не показываются. Численный поиск во всех случаях проверяет обе формы общей устойчивости.', 'For other material ratios, transition markers are omitted. The numerical search always checks both global buckling forms.')}</p>
    </details>
    <details><summary>{t('Область применимости', 'Scope of the model')}</summary>
      <p>{t('Идеальная оболочка без обшивки, одинаковая высота рёбер, линейная упругость и равномерное осевое сжатие. Прочность кольцевых рёбер, узлы, торцевые пояса, технологические минимумы, целое число кольцевых рёбер, дефекты, поперечный сдвиг и дискретные волновые числа не учитываются.', 'Ideal skinless cylinder, common rib height, linear elasticity and uniform axial compression. Hoop rib strength, joints, end rings, manufacturing minima, integer hoop rib counts, imperfections, transverse shear and discrete wave numbers are excluded.')}</p>
      <p><Tex>L</Tex> {t('влияет на массу, но в этих формулах не влияет на критическую силу. Результат — учебный непрерывный оптимум, не готовая конструкция.', 'affects mass but not capacity in these formulas. The result is an educational continuous optimum, not a finished design.')}</p>
    </details>
  </section>;
}
