import test from 'node:test';
import assert from 'node:assert/strict';
import { topicHref } from '../src/navigation.js';

test('переходы между каталогом и темой сохраняют явный язык под префиксом Pages', () => {
  for (const lang of ['ru', 'en']) {
    const topic = new URL(topicHref('./strength/', lang, 'https:'), 'https://avazar.github.io/composite/');
    assert.equal(topic.href, `https://avazar.github.io/composite/strength/?lang=${lang}`);
    const home = new URL(topicHref('../', lang, 'https:'), topic);
    assert.equal(home.href, `https://avazar.github.io/composite/?lang=${lang}`);
  }
});

test('скачанный сайт открывает HTML-файлы при переходах между страницами', () => {
  const topic = new URL(topicHref('./strength/', 'en', 'file:'), 'file:///C:/course/site/index.html');
  assert.equal(topic.href, 'file:///C:/course/site/strength/index.html?lang=en');
  assert.equal(new URL(topicHref('../', 'ru', 'file:'), topic).href, 'file:///C:/course/site/index.html?lang=ru');
});

test('модуль FEM сохраняет язык и работает под префиксом Pages и с диска', () => {
  for (const lang of ['ru', 'en']) {
    assert.equal(new URL(topicHref('./fem/', lang, 'https:'), 'https://avazar.github.io/composite/').href, `https://avazar.github.io/composite/fem/?lang=${lang}`);
    const fem = new URL(topicHref('./fem/', lang, 'file:'), 'file:///C:/course/site/index.html');
    assert.equal(fem.href, `file:///C:/course/site/fem/index.html?lang=${lang}`);
    assert.equal(new URL(topicHref('../', lang, 'file:'), fem).href, `file:///C:/course/site/index.html?lang=${lang}`);
  }
});

test('модуль сетчатых оболочек доступен под префиксом Pages и с диска', () => {
  for (const lang of ['ru', 'en']) {
    assert.equal(new URL(topicHref('./lattice/', lang, 'https:'), 'https://avazar.github.io/composite/').href, `https://avazar.github.io/composite/lattice/?lang=${lang}`);
    assert.equal(new URL(topicHref('./lattice/', lang, 'file:'), 'file:///C:/course/site/index.html').href, `file:///C:/course/site/lattice/index.html?lang=${lang}`);
  }
});
