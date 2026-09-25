import type { Lang } from "./i18n";

/** Release notes shown on the "what's new" screen right after an update.
 * Only ru and en are written out; every other language falls back to en. */
const CHANGELOG: Record<string, Partial<Record<Lang, string[]>>> = {
  "1.3.1": {
    ru: [
      "Избранное и все настройки больше не теряются после выхода из приложения — они дополнительно сохраняются в файл на диске.",
      "Из «Горячего» снова можно переключиться на «Топ» и другие сортировки.",
      "Сортировка на странице рекомендаций теперь работает; по умолчанию — «Подборка».",
      "Колесо мыши над рядом обоев больше не блокирует прокрутку главной страницы.",
      "Исправлены смешивание старых и новых результатов при смене фильтров и слишком раннее исчезновение уведомлений.",
    ],
    en: [
      "Favorites and all settings are no longer lost after quitting — they're also saved to a file on disk.",
      "You can switch from \"Hot\" to \"Top\" and other sort orders again.",
      "Sorting now works on the recommendations page; the default is \"Mixed\".",
      "The mouse wheel over a wallpaper row no longer traps scrolling on the home page.",
      "Fixed old and new results mixing when filters change, and notifications disappearing too early.",
    ],
  },
  "1.3.0": {
    ru: [
      "«Найти похожие»: рядом с кнопкой появился значок настроек — выберите, по каким именно тегам искать, выбранные подсвечиваются.",
      "Исправлены ползунки в настройках часов и в редактировании изображения — их снова видно.",
      "Избранное теперь хранится на диске: работает без сайта, новые обои подгружаются сами, а при снятии сердечка копия удаляется.",
      "Красивая заглушка, когда Wallhaven недоступен (например, ошибка 521): напоминает, что избранные обои всё ещё доступны.",
      "Обои можно поставить на экран блокировки.",
      "Из истории просмотра можно удалить одни конкретные обои, а не только очистить всё.",
      "Проверка обновлений и уведомление о новой версии (отключаются в настройках) и этот экран «Что нового».",
      "В настройках появилась справка с описанием каждой функции.",
    ],
    en: [
      "\"Find similar\": a settings icon next to the button lets you pick exactly which tags to search by — selected tags are highlighted.",
      "Fixed the sliders in the clock settings and the image editor — they're visible again.",
      "Favorites are now stored on disk: they work without the site, new ones are fetched automatically, and un-favoriting removes the copy.",
      "A friendly screen when Wallhaven is unavailable (e.g. error 521), reminding you your favorite wallpapers are still available.",
      "Wallpapers can be set as the lock screen picture.",
      "You can remove a single wallpaper from the view history instead of only clearing everything.",
      "Update checks and a new-version notification (both can be turned off in Settings), plus this \"What's new\" screen.",
      "Settings now include a help section describing every feature.",
    ],
  },
};

export function getChangelog(version: string, lang: Lang): string[] | null {
  const entry = CHANGELOG[version];
  if (!entry) return null;
  return entry[lang] ?? entry.en ?? null;
}
