// Каталог тем и независимые учебные модули в папке site/.
// Результат открывается двойным кликом по site/index.html и не требует интернета.
import * as esbuild from 'esbuild';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const watch = process.argv.includes('--watch');
const outdir = 'site';

// В CSS шрифтов перечислены woff2 и запасные woff/ttf. Браузеры берут первый поддерживаемый формат,
// поэтому в сборку кладём только woff2, а остальные ссылки оставляем как есть.
const woff2Only = {
  name: 'woff2-only',
  setup(build) {
    build.onResolve({ filter: /\.(woff|ttf)$/ }, (args) => ({ path: args.path, external: true }));
  },
};

const options = {
  entryPoints: { home: 'src/home/main.jsx', 'strength/app': 'src/main.jsx', 'fem/app': 'src/fem/main.jsx' },
  bundle: true,
  outdir,
  format: 'iife',
  target: ['es2020'],
  minify: !watch,
  sourcemap: watch,
  jsx: 'automatic',
  jsxImportSource: 'preact',
  loader: { '.woff2': 'file' },
  assetNames: 'fonts/[name]',
  plugins: [woff2Only],
  logLevel: 'info',
};

await rm(outdir, { recursive: true, force: true });
await mkdir(`${outdir}/strength`, { recursive: true });
await mkdir(`${outdir}/fem`, { recursive: true });
// Метка сборки в адресах app.js и app.css: после обновления сайта браузеры студентов не покажут старую версию из кэша.
const stamp = Date.now().toString(36);
for (const [source, target, bundle] of [
  ['src/home/index.html', 'index.html', 'home'],
  ['src/index.html', 'strength/index.html', 'app'],
  ['src/fem/index.html', 'fem/index.html', 'app'],
]) {
  const html = await readFile(source, 'utf8');
  await writeFile(`${outdir}/${target}`, html
    .replace(`href="${bundle}.css"`, `href="${bundle}.css?v=${stamp}"`)
    .replace(`src="${bundle}.js"`, `src="${bundle}.js?v=${stamp}"`));
}
await writeFile(`${outdir}/.nojekyll`, '');

// В сборку входит чужой код и шрифты; их лицензии требуют распространять текст лицензии вместе с ними.
const thirdParty = [
  ['three.js', 'three'],
  ['KaTeX (including the KaTeX fonts)', 'katex'],
  ['Preact', 'preact'],
  ['IBM Plex Sans (Fontsource package)', '@fontsource/ibm-plex-sans'],
  ['IBM Plex Mono (Fontsource package)', '@fontsource/ibm-plex-mono'],
];
let notices = 'Third-party components bundled with this site\n';
for (const [title, pkg] of thirdParty) {
  const { version, license } = JSON.parse(await readFile(`node_modules/${pkg}/package.json`, 'utf8'));
  const text = await readFile(`node_modules/${pkg}/LICENSE`, 'utf8');
  notices += `\n${'='.repeat(78)}\n${title} ${version} — ${license}\n${'='.repeat(78)}\n\n${text.trim()}\n`;
}
await writeFile(`${outdir}/THIRD-PARTY-LICENSES.txt`, notices);

if (watch) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
