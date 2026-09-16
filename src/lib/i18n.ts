export type Lang = "ru" | "en" | "es" | "fr" | "de" | "zh";

export const LANGUAGES: { code: Lang; label: string }[] = [
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "zh", label: "中文" },
];

const dict = {
  "app.searchPlaceholder": {
    ru: "Поиск обоев по тегам…",
    en: "Search wallpapers by tag…",
    es: "Buscar fondos por etiqueta…",
    fr: "Rechercher des fonds par tag…",
    de: "Hintergründe nach Tag suchen…",
    zh: "按标签搜索壁纸…",
  },
  "nav.favorites": { ru: "Избранное", en: "Favorites", es: "Favoritos", fr: "Favoris", de: "Favoriten", zh: "收藏" },
  "nav.slideshow": { ru: "Автосмена обоев", en: "Wallpaper slideshow", es: "Cambio automático", fr: "Diaporama auto", de: "Auto-Wechsel", zh: "自动换壁纸" },
  "nav.settings": { ru: "Настройки", en: "Settings", es: "Ajustes", fr: "Paramètres", de: "Einstellungen", zh: "设置" },

  "quick.latest": { ru: "Последние", en: "Latest", es: "Recientes", fr: "Récents", de: "Neueste", zh: "最新" },
  "quick.hot": { ru: "Горячее", en: "Hot", es: "Popular", fr: "Tendance", de: "Beliebt", zh: "热门" },
  "quick.toplist": { ru: "Топлист", en: "Top list", es: "Top", fr: "Classement", de: "Bestenliste", zh: "排行榜" },
  "quick.random": { ru: "Рандом", en: "Random", es: "Aleatorio", fr: "Aléatoire", de: "Zufällig", zh: "随机" },

  "home.findByTag": { ru: "Найдите обои по тегу", en: "Find wallpapers by tag", es: "Busca por etiqueta", fr: "Trouver par tag", de: "Nach Tag finden", zh: "按标签查找壁纸" },
  "home.recommendedForYou": { ru: "Рекомендуем для вас", en: "Recommended for you", es: "Recomendado para ti", fr: "Recommandé pour vous", de: "Für dich empfohlen", zh: "为你推荐" },
  "home.moreTags": { ru: "Ещё по тегам", en: "More by tag", es: "Más por etiqueta", fr: "Plus par tag", de: "Mehr nach Tag", zh: "更多标签" },

  "action.set": { ru: "Установить", en: "Set", es: "Aplicar", fr: "Définir", de: "Setzen", zh: "设为壁纸" },
  "action.setting": { ru: "Устанавливаю…", en: "Setting…", es: "Aplicando…", fr: "Application…", de: "Wird gesetzt…", zh: "设置中…" },
  "action.download": { ru: "Скачать", en: "Download", es: "Descargar", fr: "Télécharger", de: "Herunterladen", zh: "下载" },
  "action.downloading": { ru: "Сохраняю…", en: "Saving…", es: "Guardando…", fr: "Enregistrement…", de: "Speichern…", zh: "保存中…" },
  "action.apply": { ru: "Применить", en: "Apply", es: "Aplicar", fr: "Appliquer", de: "Anwenden", zh: "应用" },
  "action.applyNow": { ru: "Применить сейчас", en: "Apply now", es: "Aplicar ahora", fr: "Appliquer maintenant", de: "Jetzt anwenden", zh: "立即应用" },
  "action.cancel": { ru: "Отмена", en: "Cancel", es: "Cancelar", fr: "Annuler", de: "Abbrechen", zh: "取消" },
  "action.save": { ru: "Сохранить", en: "Save", es: "Guardar", fr: "Enregistrer", de: "Speichern", zh: "保存" },
  "action.choose": { ru: "Выбрать…", en: "Choose…", es: "Elegir…", fr: "Choisir…", de: "Wählen…", zh: "选择…" },
  "action.reset": { ru: "Сбросить", en: "Reset", es: "Restablecer", fr: "Réinitialiser", de: "Zurücksetzen", zh: "重置" },
  "action.any": { ru: "Любой", en: "Any", es: "Cualquiera", fr: "Tous", de: "Alle", zh: "任意" },
  "action.delete": { ru: "Удалить", en: "Delete", es: "Eliminar", fr: "Supprimer", de: "Löschen", zh: "删除" },
  "action.addRule": { ru: "Добавить правило", en: "Add rule", es: "Añadir regla", fr: "Ajouter une règle", de: "Regel hinzufügen", zh: "添加规则" },

  "menu.monitor": { ru: "Монитор", en: "Monitor", es: "Monitor", fr: "Écran", de: "Monitor", zh: "显示器" },
  "menu.fillStyle": { ru: "Заполнение", en: "Fit style", es: "Ajuste", fr: "Ajustement", de: "Anpassung", zh: "填充方式" },
  "menu.folder": { ru: "Папка", en: "Folder", es: "Carpeta", fr: "Dossier", de: "Ordner", zh: "文件夹" },
  "menu.all": { ru: "Все", en: "All", es: "Todos", fr: "Tous", de: "Alle", zh: "全部" },

  "style.fill": { ru: "Заполнение", en: "Fill", es: "Rellenar", fr: "Remplir", de: "Ausfüllen", zh: "填充" },
  "style.fit": { ru: "Уместить", en: "Fit", es: "Ajustar", fr: "Adapter", de: "Einpassen", zh: "适应" },
  "style.stretch": { ru: "Растянуть", en: "Stretch", es: "Estirar", fr: "Étirer", de: "Strecken", zh: "拉伸" },
  "style.center": { ru: "По центру", en: "Center", es: "Centrar", fr: "Centrer", de: "Zentrieren", zh: "居中" },
  "style.tile": { ru: "Плитка", en: "Tile", es: "Mosaico", fr: "Mosaïque", de: "Kacheln", zh: "平铺" },
  "style.span": { ru: "На весь стол", en: "Span", es: "Expandir", fr: "Étendre", de: "Erweitern", zh: "跨屏" },

  "filter.categories": { ru: "Категория", en: "Category", es: "Categoría", fr: "Catégorie", de: "Kategorie", zh: "分类" },
  "filter.general": { ru: "Общее", en: "General", es: "General", fr: "Général", de: "Allgemein", zh: "普通" },
  "filter.anime": { ru: "Аниме", en: "Anime", es: "Anime", fr: "Anime", de: "Anime", zh: "动漫" },
  "filter.people": { ru: "Люди", en: "People", es: "Personas", fr: "Personnes", de: "Personen", zh: "人物" },
  "filter.resolution": { ru: "Разрешение", en: "Resolution", es: "Resolución", fr: "Résolution", de: "Auflösung", zh: "分辨率" },
  "filter.ratio": { ru: "Соотношение", en: "Aspect ratio", es: "Proporción", fr: "Ratio", de: "Seitenverhältnis", zh: "宽高比" },
  "filter.landscape": { ru: "Горизонтальные", en: "Landscape", es: "Horizontal", fr: "Paysage", de: "Querformat", zh: "横向" },
  "filter.portrait": { ru: "Портретные", en: "Portrait", es: "Vertical", fr: "Portrait", de: "Hochformat", zh: "纵向" },
  "filter.color": { ru: "Цвет", en: "Color", es: "Color", fr: "Couleur", de: "Farbe", zh: "颜色" },
  "filter.sorting": { ru: "Сортировка", en: "Sort", es: "Ordenar", fr: "Trier", de: "Sortieren", zh: "排序" },
  "filter.period": { ru: "Период", en: "Period", es: "Período", fr: "Période", de: "Zeitraum", zh: "时间段" },
  "filter.found": { ru: "обоев найдено", en: "wallpapers found", es: "fondos encontrados", fr: "fonds trouvés", de: "Hintergründe gefunden", zh: "个壁纸" },
  "filter.orientation": { ru: "Ориентация", en: "Orientation", es: "Orientación", fr: "Orientation", de: "Ausrichtung", zh: "方向" },
  "filter.any": { ru: "Любая", en: "Any", es: "Cualquiera", fr: "Toutes", de: "Beliebig", zh: "任意" },
  "filter.atLeast": { ru: "Не менее", en: "At Least", es: "Al menos", fr: "Au moins", de: "Mindestens", zh: "至少" },
  "filter.exactly": { ru: "Точно", en: "Exactly", es: "Exactamente", fr: "Exactement", de: "Genau", zh: "精确" },
  "filter.yourScreenIs": { ru: "Разрешение вашего экрана —", en: "Your screen resolution is", es: "La resolución de tu pantalla es", fr: "La résolution de votre écran est", de: "Ihre Bildschirmauflösung ist", zh: "您的屏幕分辨率是" },
  "filter.customResolution": { ru: "Свое разрешение", en: "Custom Resolution", es: "Resolución personalizada", fr: "Résolution personnalisée", de: "Benutzerdefinierte Auflösung", zh: "自定义分辨率" },
  "filter.apply": { ru: "Применить", en: "Apply", es: "Aplicar", fr: "Appliquer", de: "Anwenden", zh: "应用" },
  "filter.wide": { ru: "Широкие", en: "Wide", es: "Ancho", fr: "Large", de: "Breit", zh: "宽屏" },
  "filter.ultrawide": { ru: "Ультраширокие", en: "Ultrawide", es: "Ultra ancho", fr: "Ultra-large", de: "Ultrabreit", zh: "超宽屏" },
  "filter.square": { ru: "Квадратные", en: "Square", es: "Cuadrado", fr: "Carré", de: "Quadratisch", zh: "方形" },
  "filter.allWide": { ru: "Все широкие", en: "All Wide", es: "Todo ancho", fr: "Tout large", de: "Alle breit", zh: "全部宽屏" },
  "filter.allPortrait": { ru: "Все портретные", en: "All Portrait", es: "Todo vertical", fr: "Tout portrait", de: "Alle Hochformat", zh: "全部竖屏" },

  "sort.date_added": { ru: "Дата добавления", en: "Date added", es: "Fecha", fr: "Date d'ajout", de: "Hinzugefügt", zh: "添加日期" },
  "sort.relevance": { ru: "Релевантность", en: "Relevance", es: "Relevancia", fr: "Pertinence", de: "Relevanz", zh: "相关性" },
  "sort.random": { ru: "Случайно", en: "Random", es: "Aleatorio", fr: "Aléatoire", de: "Zufällig", zh: "随机" },
  "sort.views": { ru: "Просмотры", en: "Views", es: "Vistas", fr: "Vues", de: "Aufrufe", zh: "浏览量" },
  "sort.favorites": { ru: "Избранное", en: "Favorites", es: "Favoritos", fr: "Favoris", de: "Favoriten", zh: "收藏数" },
  "sort.toplist": { ru: "Топ", en: "Top", es: "Top", fr: "Top", de: "Top", zh: "排行" },

  "range.1d": { ru: "За день", en: "Last day", es: "Último día", fr: "Dernier jour", de: "Letzter Tag", zh: "一天内" },
  "range.3d": { ru: "За 3 дня", en: "Last 3 days", es: "3 días", fr: "3 jours", de: "3 Tage", zh: "三天内" },
  "range.1w": { ru: "За неделю", en: "Last week", es: "Última semana", fr: "Dernière semaine", de: "Letzte Woche", zh: "一周内" },
  "range.1M": { ru: "За месяц", en: "Last month", es: "Último mes", fr: "Dernier mois", de: "Letzter Monat", zh: "一月内" },
  "range.3M": { ru: "За 3 месяца", en: "Last 3 months", es: "3 meses", fr: "3 mois", de: "3 Monate", zh: "三月内" },
  "range.6M": { ru: "За 6 месяцев", en: "Last 6 months", es: "6 meses", fr: "6 mois", de: "6 Monate", zh: "六月内" },
  "range.1y": { ru: "За год", en: "Last year", es: "Último año", fr: "Dernière année", de: "Letztes Jahr", zh: "一年内" },

  "empty.loading": { ru: "Загрузка…", en: "Loading…", es: "Cargando…", fr: "Chargement…", de: "Wird geladen…", zh: "加载中…" },
  "empty.nothingFound": { ru: "Ничего не найдено", en: "Nothing found", es: "No se encontró nada", fr: "Aucun résultat", de: "Nichts gefunden", zh: "未找到结果" },
  "empty.favorites": { ru: "Пока пусто — нажмите на сердечко у обоев, чтобы сохранить их здесь", en: "Nothing yet — tap the heart on a wallpaper to save it here", es: "Aún vacío: pulsa el corazón en un fondo para guardarlo aquí", fr: "Rien pour l'instant — cliquez sur le cœur d'un fond pour l'enregistrer ici", de: "Noch leer — tippe auf das Herz bei einem Hintergrund, um ihn hier zu speichern", zh: "还没有内容——点击壁纸上的心形图标即可收藏" },
  "home.heroEmpty": {
    ru: "По этим тегам ничего не нашлось — проверьте написание в настройках баннера",
    en: "Nothing found for these tags — check the spelling in the banner settings",
    es: "No se encontró nada para estas etiquetas — revisa la ortografía en los ajustes del banner",
    fr: "Aucun résultat pour ces tags — vérifiez l'orthographe dans les paramètres de la bannière",
    de: "Für diese Tags wurde nichts gefunden — prüfe die Schreibweise in den Banner-Einstellungen",
    zh: "没有找到这些标签的结果——请检查横幅设置中的拼写",
  },

  "settings.title": { ru: "Настройки", en: "Settings", es: "Ajustes", fr: "Paramètres", de: "Einstellungen", zh: "设置" },
  "settings.nsfwToggle": { ru: "Показывать NSFW", en: "Show NSFW", es: "Mostrar NSFW", fr: "Afficher NSFW", de: "NSFW anzeigen", zh: "显示 NSFW" },
  "settings.nsfwHint": { ru: "Если выключено, категория NSFW не отображается вовсе", en: "When off, the NSFW category doesn't appear at all", es: "Si está desactivado, la categoría NSFW no aparece en absoluto", fr: "Si désactivé, la catégorie NSFW n'apparaît pas du tout", de: "Wenn deaktiviert, erscheint die NSFW-Kategorie überhaupt nicht", zh: "关闭后 NSFW 分类将完全不显示" },
  "settings.sketchyToggle": { ru: "Показывать Sketchy", en: "Show Sketchy", es: "Mostrar Sketchy", fr: "Afficher Sketchy", de: "Sketchy anzeigen", zh: "显示 Sketchy" },
  "settings.sketchyHint": { ru: "Если выключено, категория Sketchy не отображается вовсе", en: "When off, the Sketchy category doesn't appear at all", es: "Si está desactivado, la categoría Sketchy no aparece en absoluto", fr: "Si désactivé, la catégorie Sketchy n'apparaît pas du tout", de: "Wenn deaktiviert, erscheint die Sketchy-Kategorie überhaupt nicht", zh: "关闭后 Sketchy 分类将完全不显示" },
  "settings.apiKeyLabel": { ru: "Wallhaven API key", en: "Wallhaven API key", es: "Clave API de Wallhaven", fr: "Clé API Wallhaven", de: "Wallhaven-API-Schlüssel", zh: "Wallhaven API 密钥" },
  "settings.apiKeyHint": {
    ru: "Ключ находится на wallhaven.cc/settings/account. Он нужен, чтобы NSFW-обои действительно загружались (иначе API вернёт ошибку доступа).",
    en: "The key is on wallhaven.cc/settings/account. It's needed for NSFW wallpapers to actually load (otherwise the API returns an access error).",
    es: "La clave está en wallhaven.cc/settings/account. Es necesaria para que los fondos NSFW se carguen (de otro modo la API devuelve un error de acceso).",
    fr: "La clé se trouve sur wallhaven.cc/settings/account. Elle est nécessaire pour que les fonds NSFW se chargent (sinon l'API renvoie une erreur d'accès).",
    de: "Der Schlüssel befindet sich auf wallhaven.cc/settings/account. Er wird benötigt, damit NSFW-Hintergründe tatsächlich geladen werden (sonst gibt die API einen Zugriffsfehler zurück).",
    zh: "密钥位于 wallhaven.cc/settings/account。需要它才能真正加载 NSFW 壁纸（否则 API 会返回访问错误）。",
  },
  "settings.language": { ru: "Язык интерфейса", en: "Interface language", es: "Idioma de la interfaz", fr: "Langue de l'interface", de: "Sprache der Oberfläche", zh: "界面语言" },
  "settings.autostartToggle": { ru: "Запускать при включении компьютера", en: "Launch on startup", es: "Iniciar al arrancar el equipo", fr: "Lancer au démarrage", de: "Beim Systemstart starten", zh: "开机自动启动" },
  "settings.autostartHint": { ru: "Wallery запустится автоматически при входе в систему", en: "Wallery will start automatically when you sign in", es: "Wallery se iniciará automáticamente al iniciar sesión", fr: "Wallery démarrera automatiquement à la connexion", de: "Wallery startet automatisch bei der Anmeldung", zh: "登录系统时自动启动 Wallery" },
  "settings.closeToTray": {
    ru: "Закрытие окна сворачивает Wallery в трей (чтобы автосмена обоев продолжала работать). Полностью закрыть приложение можно через трей или кнопкой ниже.",
    en: "Closing the window minimizes Wallery to the tray (so the wallpaper slideshow keeps running). You can fully quit via the tray or the button below.",
    es: "Cerrar la ventana minimiza Wallery a la bandeja (para que el cambio automático siga funcionando). Puedes salir por completo desde la bandeja o con el botón de abajo.",
    fr: "Fermer la fenêtre réduit Wallery dans la barre système (pour que le diaporama continue). Vous pouvez quitter complètement via la barre système ou le bouton ci-dessous.",
    de: "Das Schließen des Fensters minimiert Wallery in die Taskleiste (damit die Diashow weiterläuft). Vollständig beenden kannst du über das Tray-Symbol oder den Button unten.",
    zh: "关闭窗口会将 Wallery 最小化到系统托盘（以便自动换壁纸继续运行）。你可以通过托盘或下方按钮完全退出应用。",
  },
  "settings.quit": { ru: "Закрыть приложение", en: "Quit app", es: "Cerrar la app", fr: "Fermer l'app", de: "App beenden", zh: "退出应用" },

  "settings.bannerTitle": { ru: "Баннер на главной", en: "Home banner", es: "Banner de inicio", fr: "Bannière d'accueil", de: "Startseiten-Banner", zh: "首页横幅" },
  "settings.bannerSource": { ru: "Источник", en: "Source", es: "Fuente", fr: "Source", de: "Quelle", zh: "来源" },
  "quick.custom": { ru: "Свои теги", en: "Custom", es: "Personalizado", fr: "Personnalisé", de: "Eigene", zh: "自定义" },
  "settings.bannerQueryPlaceholder": { ru: "Теги, например: nature sunset", en: "Tags, e.g.: nature sunset", es: "Etiquetas, p. ej.: nature sunset", fr: "Tags, ex. : nature sunset", de: "Tags, z. B.: nature sunset", zh: "标签，例如：nature sunset" },
  "settings.bannerSorting": { ru: "Сортировка", en: "Sorting", es: "Orden", fr: "Tri", de: "Sortierung", zh: "排序" },
  "settings.bannerNsfwToggle": { ru: "NSFW в баннере", en: "NSFW in banner", es: "NSFW en el banner", fr: "NSFW dans la bannière", de: "NSFW im Banner", zh: "横幅中显示 NSFW" },
  "settings.bannerSketchyToggle": { ru: "Sketchy в баннере", en: "Sketchy in banner", es: "Sketchy en el banner", fr: "Sketchy dans la bannière", de: "Sketchy im Banner", zh: "横幅中显示 Sketchy" },

  "settings.recTitle": { ru: "Рекомендации", en: "Recommendations", es: "Recomendaciones", fr: "Recommandations", de: "Empfehlungen", zh: "推荐" },
  "settings.recToggle": { ru: "Свои теги для рекомендаций", en: "Custom tags for recommendations", es: "Etiquetas propias para recomendaciones", fr: "Tags personnalisés pour les recommandations", de: "Eigene Tags für Empfehlungen", zh: "为推荐使用自定义标签" },
  "settings.recHint": {
    ru: "Если выключено, рекомендации основаны на истории поиска и избранном",
    en: "When off, recommendations are based on your search history and favorites",
    es: "Si está desactivado, las recomendaciones se basan en tu historial de búsqueda y favoritos",
    fr: "Si désactivé, les recommandations se basent sur votre historique de recherche et vos favoris",
    de: "Wenn deaktiviert, basieren Empfehlungen auf deinem Suchverlauf und Favoriten",
    zh: "关闭后，推荐将基于你的搜索历史和收藏",
  },
  "settings.recAddPlaceholder": { ru: "Добавить тег вручную и нажать Enter", en: "Add a tag manually and press Enter", es: "Añade una etiqueta manualmente y pulsa Enter", fr: "Ajoutez un tag manuellement et appuyez sur Entrée", de: "Tag manuell hinzufügen und Enter drücken", zh: "手动添加标签并按 Enter" },
  "settings.recSuggested": { ru: "Или выберите из списка", en: "Or pick from the list", es: "O elige de la lista", fr: "Ou choisissez dans la liste", de: "Oder aus der Liste wählen", zh: "或从列表中选择" },

  "slideshow.title": { ru: "Автосмена обоев", en: "Wallpaper slideshow", es: "Cambio automático de fondo", fr: "Diaporama de fonds", de: "Automatischer Hintergrundwechsel", zh: "壁纸自动切换" },
  "slideshow.description": {
    ru: "Раз в выбранный интервал приложение подберёт обои по этим параметрам и установит их. Работает, пока Wallery открыт (в том числе свёрнутым в трей).",
    en: "Once per chosen interval, the app picks wallpapers matching these settings and applies them. Works while Wallery is running (including minimized to the tray).",
    es: "Cada intervalo elegido, la app elegirá fondos según estos parámetros y los aplicará. Funciona mientras Wallery esté abierto (incluso minimizado a la bandeja).",
    fr: "À chaque intervalle choisi, l'app choisit des fonds selon ces paramètres et les applique. Fonctionne tant que Wallery est ouvert (même réduit dans la barre système).",
    de: "In jedem gewählten Intervall wählt die App passende Hintergründe aus und wendet sie an. Funktioniert, solange Wallery läuft (auch im Tray minimiert).",
    zh: "每隔设定的时间，应用会按这些参数挑选壁纸并设置。只要 Wallery 在运行（包括最小化到托盘）就会生效。",
  },
  "slideshow.source": { ru: "Источник", en: "Source", es: "Fuente", fr: "Source", de: "Quelle", zh: "来源" },
  "slideshow.source.random": { ru: "Случайные", en: "Random", es: "Aleatorio", fr: "Aléatoire", de: "Zufällig", zh: "随机" },
  "slideshow.source.latest": { ru: "Новые", en: "Latest", es: "Recientes", fr: "Récents", de: "Neueste", zh: "最新" },
  "slideshow.source.hot": { ru: "Горячее", en: "Hot", es: "Popular", fr: "Tendance", de: "Beliebt", zh: "热门" },
  "slideshow.source.toplist": { ru: "Топлист", en: "Top list", es: "Top", fr: "Classement", de: "Bestenliste", zh: "排行榜" },
  "slideshow.source.favorites": { ru: "Избранное", en: "Favorites", es: "Favoritos", fr: "Favoris", de: "Favoriten", zh: "收藏" },
  "slideshow.query": { ru: "Тег / запрос (необязательно)", en: "Tag / query (optional)", es: "Etiqueta / búsqueda (opcional)", fr: "Tag / recherche (facultatif)", de: "Tag / Suche (optional)", zh: "标签/搜索词（可选）" },
  "slideshow.interval": { ru: "Интервал", en: "Interval", es: "Intervalo", fr: "Intervalle", de: "Intervall", zh: "间隔" },
  "slideshow.differentPerMonitor": { ru: "Разные обои на каждый монитор", en: "Different wallpaper per monitor", es: "Fondo distinto por monitor", fr: "Fond différent par écran", de: "Unterschiedlicher Hintergrund je Monitor", zh: "每台显示器不同壁纸" },
  "slideshow.allOnePicture": { ru: "Все (одна картинка)", en: "All (one picture)", es: "Todos (una imagen)", fr: "Tous (une image)", de: "Alle (ein Bild)", zh: "全部（同一张）" },
  "slideshow.lastApplied": { ru: "Последняя смена", en: "Last applied", es: "Último cambio", fr: "Dernier changement", de: "Letzte Änderung", zh: "上次切换" },
  "slideshow.rules": { ru: "Правила", en: "Rules", es: "Reglas", fr: "Règles", de: "Regeln", zh: "规则" },
  "slideshow.newRule": { ru: "Новое правило", en: "New rule", es: "Nueva regla", fr: "Nouvelle règle", de: "Neue Regel", zh: "新规则" },
  "slideshow.targetMonitor": { ru: "Монитор для этого правила", en: "Target monitor for this rule", es: "Monitor de esta regla", fr: "Écran cible de cette règle", de: "Zielmonitor für diese Regel", zh: "此规则的目标显示器" },
  "interval.15": { ru: "15 минут", en: "15 minutes", es: "15 minutos", fr: "15 minutes", de: "15 Minuten", zh: "15 分钟" },
  "interval.30": { ru: "30 минут", en: "30 minutes", es: "30 minutos", fr: "30 minutes", de: "30 Minuten", zh: "30 分钟" },
  "interval.60": { ru: "1 час", en: "1 hour", es: "1 hora", fr: "1 heure", de: "1 Stunde", zh: "1 小时" },
  "interval.180": { ru: "3 часа", en: "3 hours", es: "3 horas", fr: "3 heures", de: "3 Stunden", zh: "3 小时" },
  "interval.360": { ru: "6 часов", en: "6 hours", es: "6 horas", fr: "6 heures", de: "6 Stunden", zh: "6 小时" },
  "interval.720": { ru: "12 часов", en: "12 hours", es: "12 horas", fr: "12 heures", de: "12 Stunden", zh: "12 小时" },
  "interval.1440": { ru: "24 часа", en: "24 hours", es: "24 horas", fr: "24 heures", de: "24 Stunden", zh: "24 小时" },
  "slideshow.deleteRule": { ru: "Удалить правило", en: "Delete rule", es: "Eliminar regla", fr: "Supprimer la règle", de: "Regel löschen", zh: "删除规则" },
  "slideshow.noRules": {
    ru: "Правил пока нет — добавьте одно, чтобы обои начали меняться автоматически.",
    en: "No rules yet — add one to start rotating wallpapers automatically.",
    es: "Aún no hay reglas: añade una para que los fondos cambien automáticamente.",
    fr: "Aucune règle pour l'instant — ajoutez-en une pour que les fonds changent automatiquement.",
    de: "Noch keine Regeln — füge eine hinzu, damit Hintergründe automatisch wechseln.",
    zh: "还没有规则——添加一条即可自动切换壁纸。",
  },

  "lightbox.notLoaded": { ru: "Не удалось загрузить", en: "Couldn't load", es: "No se pudo cargar", fr: "Impossible de charger", de: "Konnte nicht geladen werden", zh: "加载失败" },
  "lightbox.openInBrowser": { ru: "Открыть в браузере", en: "Open in browser", es: "Abrir en el navegador", fr: "Ouvrir dans le navigateur", de: "Im Browser öffnen", zh: "在浏览器中打开" },
  "tag.favHint": { ru: "В избранное для рекомендаций", en: "Favorite for recommendations", es: "Favorito para recomendaciones", fr: "Favori pour les recommandations", de: "Favorit für Empfehlungen", zh: "收藏用于推荐" },
  "tag.favAdded": { ru: "Добавлено в избранное для рекомендаций", en: "Added to recommendation favorites", es: "Añadido a favoritos de recomendaciones", fr: "Ajouté aux favoris de recommandations", de: "Zu Empfehlungs-Favoriten hinzugefügt", zh: "已添加到推荐收藏" },
  "tag.favRemoved": { ru: "Убрано из избранного для рекомендаций", en: "Removed from recommendation favorites", es: "Eliminado de favoritos de recomendaciones", fr: "Retiré des favoris de recommandations", de: "Aus Empfehlungs-Favoriten entfernt", zh: "已从推荐收藏中移除" },

  "crop.title": { ru: "Обрезка под экран", en: "Crop to screen", es: "Recortar a la pantalla", fr: "Recadrer à l'écran", de: "An Bildschirm zuschneiden", zh: "按屏幕裁剪" },
  "crop.myScreen": { ru: "Мой экран", en: "My screen", es: "Mi pantalla", fr: "Mon écran", de: "Mein Bildschirm", zh: "我的屏幕" },
  "crop.custom": { ru: "Свой размер", en: "Custom size", es: "Tamaño personalizado", fr: "Taille personnalisée", de: "Eigene Größe", zh: "自定义尺寸" },
  "crop.save": { ru: "Сохранить обрезанное", en: "Save cropped", es: "Guardar recortada", fr: "Enregistrer la version recadrée", de: "Zugeschnitten speichern", zh: "保存裁剪结果" },
  "crop.set": { ru: "Установить на фон", en: "Set as wallpaper", es: "Establecer como fondo", fr: "Définir comme fond d'écran", de: "Als Hintergrund festlegen", zh: "设为壁纸" },
  "crop.setDone": { ru: "Обои установлены", en: "Wallpaper set", es: "Fondo establecido", fr: "Fond d'écran défini", de: "Hintergrund festgelegt", zh: "壁纸已设置" },
  "crop.saveDone": { ru: "Сохранено", en: "Saved", es: "Guardado", fr: "Enregistré", de: "Gespeichert", zh: "已保存" },
  "crop.dragHint": { ru: "Двигайте и увеличивайте изображение, чтобы выбрать область", en: "Drag and zoom the image to choose the area", es: "Arrastra y haz zoom en la imagen para elegir el área", fr: "Faites glisser et zoomez l'image pour choisir la zone", de: "Bild verschieben und zoomen, um den Bereich zu wählen", zh: "拖动并缩放图片以选择区域" },
  "crop.forceReload": { ru: "Загрузить заново", en: "Force reload", es: "Recargar", fr: "Recharger", de: "Neu laden", zh: "重新加载" },

  "monitor.label": { ru: "Монитор", en: "Monitor", es: "Monitor", fr: "Moniteur", de: "Monitor", zh: "显示器" },
  "lightbox.favoriteHint": { ru: "В избранное", en: "Add to favorites", es: "Añadir a favoritos", fr: "Ajouter aux favoris", de: "Zu Favoriten hinzufügen", zh: "添加到收藏" },
  "unit.mb": { ru: "МБ", en: "MB", es: "MB", fr: "Mo", de: "MB", zh: "MB" },
  "error.tauriOnlySet": { ru: "Установка обоев доступна только в приложении Wallery.", en: "Setting the wallpaper is only available in the Wallery app.", es: "Establecer el fondo solo está disponible en la app Wallery.", fr: "Définir le fond n'est possible que dans l'application Wallery.", de: "Den Hintergrund festlegen ist nur in der Wallery-App möglich.", zh: "仅在 Wallery 应用中才能设置壁纸。" },
  "error.tauriOnlySave": { ru: "Сохранение доступно только в приложении Wallery.", en: "Saving is only available in the Wallery app.", es: "Guardar solo está disponible en la app Wallery.", fr: "L'enregistrement n'est possible que dans l'application Wallery.", de: "Speichern ist nur in der Wallery-App möglich.", zh: "仅在 Wallery 应用中才能保存。" },
  "error.tauriOnlyCrop": { ru: "Обрезка обоев доступна только в приложении Wallery.", en: "Cropping is only available in the Wallery app.", es: "Recortar solo está disponible en la app Wallery.", fr: "Le recadrage n'est possible que dans l'application Wallery.", de: "Zuschneiden ist nur in der Wallery-App möglich.", zh: "仅在 Wallery 应用中才能裁剪。" },
  "dialog.chooseFolder": { ru: "Выберите папку для сохранения", en: "Choose a folder to save to", es: "Elige una carpeta para guardar", fr: "Choisissez un dossier de destination", de: "Ordner zum Speichern wählen", zh: "选择保存文件夹" },
  "error.apiStatus": { ru: "Wallhaven API вернул", en: "Wallhaven API returned", es: "La API de Wallhaven devolvió", fr: "L'API Wallhaven a renvoyé", de: "Die Wallhaven-API antwortete mit", zh: "Wallhaven API 返回了" },
  "settings.defaultFolder": { ru: "Изображения\\Wallery", en: "Pictures\\Wallery", es: "Imágenes\\Wallery", fr: "Images\\Wallery", de: "Bilder\\Wallery", zh: "图片\\Wallery" },
  "tray.show": { ru: "Показать Wallery", en: "Show Wallery", es: "Mostrar Wallery", fr: "Afficher Wallery", de: "Wallery anzeigen", zh: "显示 Wallery" },
  "tray.quit": { ru: "Выход", en: "Quit", es: "Salir", fr: "Quitter", de: "Beenden", zh: "退出" },
  "toast.wallpaperSet": { ru: "Обои установлены", en: "Wallpaper set", es: "Fondo aplicado", fr: "Fond appliqué", de: "Hintergrund gesetzt", zh: "壁纸已设置" },
  "toast.saved": { ru: "Сохранено", en: "Saved", es: "Guardado", fr: "Enregistré", de: "Gespeichert", zh: "已保存" },
  "toast.fallback": {
    ru: "Не удалось загрузить оригинал — показана уменьшенная версия",
    en: "Couldn't load the original — showing a smaller version instead",
    es: "No se pudo cargar el original: se muestra una versión más pequeña",
    fr: "Impossible de charger l'original — version réduite affichée",
    de: "Original konnte nicht geladen werden — kleinere Version wird angezeigt",
    zh: "无法加载原图——已显示缩小版本",
  },
  "favorites.title": { ru: "Избранное", en: "Favorites", es: "Favoritos", fr: "Favoris", de: "Favoriten", zh: "收藏" },
  "tag.hint": {
    ru: "ЛКМ — поиск, ПКМ — копировать",
    en: "Left-click to search, right-click to copy",
    es: "Clic izquierdo: buscar, clic derecho: copiar",
    fr: "Clic gauche : rechercher, clic droit : copier",
    de: "Linksklick: Suchen, Rechtsklick: Kopieren",
    zh: "左键搜索，右键复制",
  },
  "tag.copied": { ru: "Скопировано", en: "Copied", es: "Copiado", fr: "Copié", de: "Kopiert", zh: "已复制" },
  "tag.copyFailed": {
    ru: "Не удалось скопировать",
    en: "Couldn't copy",
    es: "No se pudo copiar",
    fr: "Impossible de copier",
    de: "Kopieren fehlgeschlagen",
    zh: "复制失败",
  },
} as const;

export type TranslationKey = keyof typeof dict;

const LANG_KEY = "wallery:lang";

export function loadLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored && LANGUAGES.some((l) => l.code === stored)) return stored as Lang;
  } catch {
    // ignore
  }
  const nav = typeof navigator !== "undefined" ? navigator.language.slice(0, 2) : "ru";
  return LANGUAGES.some((l) => l.code === nav) ? (nav as Lang) : "ru";
}

export function saveLang(lang: Lang) {
  localStorage.setItem(LANG_KEY, lang);
}

export function translate(lang: Lang, key: TranslationKey): string {
  const entry = dict[key] as Record<Lang, string>;
  return entry[lang] ?? entry.en ?? entry.ru;
}
