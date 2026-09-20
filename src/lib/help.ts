import type { Lang } from "./i18n";

export interface HelpSection {
  title: string;
  body: string;
}

/** The in-app help. Only ru and en are written out; every other language
 * falls back to en. */
const HELP: Partial<Record<Lang, HelpSection[]>> = {
  ru: [
    {
      title: "Поиск и теги",
      body: "Введите слово в строке сверху и нажмите Enter — Wallery найдёт обои по тегу. На главной внизу есть облако тегов и ленты по темам: нажмите на тег, чтобы открыть все обои с ним. Кнопка со стрелкой слева от строки поиска возвращает на предыдущий экран.",
    },
    {
      title: "Фильтры",
      body: "На странице результатов сверху есть панель фильтров: категории (общее, аниме, люди), уровень (SFW / Sketchy / NSFW), сортировка, разрешение («не меньше» или «ровно»), соотношение сторон и цвет. Для топа можно выбрать период. Уровни Sketchy и NSFW включаются в настройках.",
    },
    {
      title: "Просмотр обоев",
      body: "Нажмите на обои, чтобы открыть их крупно. Стрелки на клавиатуре и по бокам листают список, Esc закрывает. Ctrl + колесо мыши приближает картинку, потом её можно перетаскивать. Справа — разрешение, размер файла, теги и все действия. Правый клик по тегу открывает меню: добавить в «мои теги», показывать чаще или реже в рекомендациях, запретить тег.",
    },
    {
      title: "Найти похожие",
      body: "Кнопка «Найти похожие» сама подбирает несколько тегов обоев и ищет по ним. Если хотите решить сами — нажмите значок настроек справа от кнопки: откроется список тегов этих обоев. Нажимайте на нужные — они подсветятся, — затем «Найти по выбранным тегам». Найдутся только обои, у которых есть все выбранные теги.",
    },
    {
      title: "Установка обоев",
      body: "Кнопка «Установить» ставит обои на рабочий стол. Стрелка рядом открывает меню: на какой монитор поставить, как вписать картинку (заполнить, по размеру, растянуть, мозаика, по центру, на все мониторы) и кнопка «Экран блокировки» — она ставит эти обои на экран блокировки Windows. Экран блокировки должен быть в режиме «Изображение» (Параметры → Персонализация → Экран блокировки).",
    },
    {
      title: "Скачивание",
      body: "«Скачать» сохраняет оригинал в папку. Стрелка рядом позволяет выбрать папку; по умолчанию это Изображения\\Wallery.",
    },
    {
      title: "Редактирование",
      body: "В окне просмотра раздел «Редактирование» (только в приложении) позволяет обрезать обои под нужное разрешение — по вашему экрану или своему размеру, — приближать и двигать кадр, а также менять яркость, контраст, насыщенность и другие цвета. Готовые фильтры можно применять, а свои — сохранять. Результат можно поставить на рабочий стол или сохранить файлом.",
    },
    {
      title: "Избранное",
      body: "Сердечко на обоях добавляет их в избранное (кнопка-сердечко сверху открывает список). Избранные обои копируются на диск: они открываются и ставятся на рабочий стол даже без интернета и когда Wallhaven недоступен. Если убрать сердечко — копия удаляется. Новые избранные загружаются автоматически; на странице избранного есть переключатель «Кэшировать избранное» — если выключить, новые обои на диск не скачиваются.",
    },
    {
      title: "История просмотра",
      body: "Всё, что вы открывали, попадает в историю (последние 300). Наведите на обои и нажмите ✕ в углу, чтобы убрать одни конкретные, или «Очистить историю», чтобы удалить всё.",
    },
    {
      title: "Рекомендации",
      body: "Wallery подбирает обои по тегам того, что вы смотрите и добавляете в избранное. На главной есть строка «Рекомендуем вам», полная лента — по её заголовку. Стрелки вверх/вниз на карточках — «больше такого» и «убрать». В настройках можно задать свои теги, фильтры для рекомендаций и список запрещённых тегов.",
    },
    {
      title: "Автосмена обоев",
      body: "Кнопка с часами открывает правила автосмены: источник (случайные, новые, горячие, топ или избранное), тег, разрешение, ориентация, интервал и монитор. Для нескольких мониторов можно сделать отдельное правило на каждый. Смена работает, пока приложение запущено (оно живёт в трее).",
    },
    {
      title: "Виджеты",
      body: "Кнопка с четырьмя квадратами — виджеты рабочего стола. «Добавить часы» создаёт часы, «Настроить» открывает редактор: готовые стили, размер, фон, шрифт, цвета, поворот и другое; свои стили можно сохранять и переносить экспортом/импортом. «Переместить» позволяет перетащить часы в нужное место экрана, затем нажмите «Готово».",
    },
    {
      title: "Настройки",
      body: "Язык, показ Sketchy и NSFW, источник баннера на главной, свои теги и фильтры рекомендаций, ключ API Wallhaven (открывает больше контента и NSFW), автозапуск вместе с Windows. Закрытие окна прячет приложение в трей, полностью выйти можно из меню трея или кнопкой «Выйти». Экспорт и импорт данных сохраняют избранное, настройки и виджеты в файл — сделайте копию перед переустановкой.",
    },
    {
      title: "Обновления",
      body: "Раз в несколько часов Wallery смотрит, нет ли новой версии, и показывает уведомление со ссылкой на загрузку. И проверку, и уведомления можно отключить в настройках; «Проверить сейчас» запускает проверку вручную. После обновления один раз показывается экран «Что нового».",
    },
    {
      title: "Если сайт недоступен",
      body: "Когда Wallhaven не отвечает (например, ошибка 521 — сервер сайта не работает), вместо пустого экрана показывается заглушка. Ваше избранное при этом доступно полностью — откройте его кнопкой на заглушке. Обычно сайт возвращается сам через некоторое время.",
    },
  ],
  en: [
    {
      title: "Search and tags",
      body: "Type a word into the bar at the top and press Enter — Wallery searches wallpapers by that tag. The home page has a tag cloud and topic rows: click a tag to open every wallpaper with it. The arrow button left of the search bar returns to the previous screen.",
    },
    {
      title: "Filters",
      body: "The results page has a filter bar: categories (general, anime, people), purity (SFW / Sketchy / NSFW), sorting, resolution (\"at least\" or \"exactly\"), aspect ratio and color. Toplist sorting lets you pick a time range. Sketchy and NSFW are enabled in Settings.",
    },
    {
      title: "Viewing wallpapers",
      body: "Click a wallpaper to open it large. Arrow keys and the side buttons page through the list, Esc closes. Ctrl + mouse wheel zooms in, then drag to pan. The right-hand panel shows resolution, file size, tags and every action. Right-click a tag for a menu: add to \"my tags\", show more or less in recommendations, block the tag.",
    },
    {
      title: "Find similar",
      body: "\"Find similar\" picks a few of the wallpaper's tags automatically and searches by them. To choose yourself, click the settings icon on the right of the button: the wallpaper's tags appear. Click the ones you want — they light up — then press \"Search by selected tags\". Only wallpapers that have all the selected tags are found.",
    },
    {
      title: "Setting wallpapers",
      body: "\"Set\" puts the wallpaper on your desktop. The arrow next to it opens a menu: which monitor, how to fit the picture (fill, fit, stretch, tile, center, span) and a \"Lock screen\" button that sets it as the Windows lock screen picture. The lock screen must be in \"Picture\" mode (Settings → Personalization → Lock screen).",
    },
    {
      title: "Downloading",
      body: "\"Download\" saves the original to a folder. The arrow next to it lets you choose the folder; the default is Pictures\\Wallery.",
    },
    {
      title: "Editing",
      body: "The \"Edit\" section in the viewer (desktop app only) lets you crop a wallpaper to the exact resolution — your screen or a custom size — zoom and move the frame, and adjust brightness, contrast, saturation and other color settings. Apply ready-made filters or save your own. Set the result as your wallpaper or save it as a file.",
    },
    {
      title: "Favorites",
      body: "The heart adds a wallpaper to favorites (the heart button at the top opens the list). Favorites are copied to disk, so they open and can be set as wallpaper even without internet or while Wallhaven is down. Un-favoriting deletes the copy. New favorites are downloaded automatically; the \"Cache favorites\" switch on the Favorites page turns that off, so new ones are not downloaded.",
    },
    {
      title: "View history",
      body: "Everything you open is recorded (the last 300). Hover a wallpaper and click ✕ in the corner to remove just that one, or use \"Clear history\" to remove everything.",
    },
    {
      title: "Recommendations",
      body: "Wallery picks wallpapers based on the tags of what you view and favorite. The home page has a \"Recommended for you\" row; the full feed opens from its title. The up/down arrows on cards mean \"more like this\" and \"remove\". In Settings you can set your own tags, recommendation filters and a list of blocked tags.",
    },
    {
      title: "Wallpaper slideshow",
      body: "The clock button opens slideshow rules: source (random, latest, hot, toplist or favorites), tag, resolution, orientation, interval and monitor. With several monitors you can make a separate rule for each. It runs while the app is running (it lives in the tray).",
    },
    {
      title: "Widgets",
      body: "The four-squares button opens desktop widgets. \"Add clock\" creates a clock, \"Customize\" opens the editor: presets, size, background, font, colors, rotation and more; save your own styles and share them via export/import. \"Move\" lets you drag the clock to the right spot on screen — click \"Done\" when finished.",
    },
    {
      title: "Settings",
      body: "Language, Sketchy and NSFW visibility, the home banner's source, your own recommendation tags and filters, the Wallhaven API key (unlocks more content and NSFW), and autostart with Windows. Closing the window hides the app in the tray; quit fully from the tray menu or the \"Quit\" button. Export/import saves favorites, settings and widgets to a file — make a copy before reinstalling.",
    },
    {
      title: "Updates",
      body: "Every few hours Wallery checks for a newer version and shows a notification with a download link. Both the check and the notifications can be turned off in Settings; \"Check now\" runs a check manually. After an update, a \"What's new\" screen is shown once.",
    },
    {
      title: "When the site is unavailable",
      body: "When Wallhaven isn't responding (for example error 521 — the site's server is down), a friendly screen replaces the empty page. Your favorites remain fully available — open them with the button on that screen. The site usually comes back on its own after a while.",
    },
  ],
};

export function getHelp(lang: Lang): HelpSection[] {
  return HELP[lang] ?? HELP.en ?? [];
}
