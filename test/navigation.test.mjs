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
