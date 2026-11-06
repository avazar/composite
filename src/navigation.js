// Явный язык в ссылке важнее языка браузера и сохранённого выбора.
// index.html позволяет пользоваться скачанным сайтом без HTTP-сервера.
export function topicHref(directory, lang, protocol = location.protocol) {
  return `${directory}${protocol === 'file:' ? 'index.html' : ''}?lang=${lang === 'en' ? 'en' : 'ru'}`;
}
