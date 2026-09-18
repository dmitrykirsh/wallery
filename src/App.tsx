import { useEffect, useState } from "react";
import TopBar from "./components/TopBar";
import SettingsModal from "./components/SettingsModal";
import SlideshowModal from "./components/SlideshowModal";
import WidgetsModal from "./components/WidgetsModal";
import Toast from "./components/Toast";
import Lightbox from "./components/Lightbox";
import ScrollToTopButton from "./components/ScrollToTopButton";
import Home from "./pages/Home";
import Results from "./pages/Results";
import Favorites from "./pages/Favorites";
import History from "./pages/History";
import Recommendations from "./pages/Recommendations";
import { defaultFilters } from "./lib/filters";
import { loadSettings, saveSettings, type Settings } from "./lib/settings";
import { loadHeroSettings, saveHeroSettings, type HeroSettings } from "./lib/heroSettings";
import { loadRecommendationSettings, saveRecommendationSettings, type RecommendationSettings } from "./lib/recommendationSettings";
import { loadSlideshowRules, saveSlideshowRules } from "./lib/slideshow";
import { useSlideshowRunner } from "./lib/useSlideshowRunner";
import { useFavorites } from "./lib/useFavorites";
import { recordSearch } from "./lib/searchHistory";
import { getViewHistory, recordView, clearViewHistory } from "./lib/viewHistory";
import { useLang } from "./lib/LangContext";
import { isTauri, setTrayLabels } from "./lib/tauri";
import { loadWidgets } from "./lib/widgets";
import { spawnWidgetWindow, widgetWindowExists } from "./lib/widgetWindow";
import type { Filters, Wallpaper } from "./lib/types";

type View = "home" | "results" | "favorites" | "history" | "recommendations";
interface NavEntry {
  view: View;
  filters: Filters;
}

function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings());
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(loadHeroSettings());
  const [recommendationSettings, setRecommendationSettings] = useState<RecommendationSettings>(loadRecommendationSettings());
  const [view, setView] = useState<View>("home");
  const [filters, setFilters] = useState<Filters>(defaultFilters());
  const [navStack, setNavStack] = useState<NavEntry[]>([]);
  const [viewHistoryList, setViewHistoryList] = useState<Wallpaper[]>(() => getViewHistory());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [widgetsOpen, setWidgetsOpen] = useState(false);
  const [slideshowRules, setSlideshowRules] = useState(() => loadSlideshowRules());
  const [toast, setToast] = useState<string | null>(null);
  const [activeList, setActiveList] = useState<Wallpaper[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = activeList[activeIndex] ?? null;
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { t, lang } = useLang();

  // Switching pages while scrolled deep into the previous one left the new
  // page's content mounting far below the fold — which then made its own
  // infinite-scroll sentinel (already in view) fire immediately, loading
  // more before the user ever saw the top. Every view change starts fresh.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  // Snapshots where we're leaving FROM, right before a navigation actually
  // changes the view/filters — so "back" can restore it afterward.
  function pushNav() {
    setNavStack((stack) => [...stack, { view, filters }].slice(-30));
  }

  function goBack() {
    setNavStack((stack) => {
      if (stack.length === 0) return stack;
      const prev = stack[stack.length - 1];
      setView(prev.view);
      setFilters(prev.filters);
      return stack.slice(0, -1);
    });
  }

  function openWallpaper(wallpaper: Wallpaper, list: Wallpaper[]) {
    const idx = list.findIndex((w) => w.id === wallpaper.id);
    setActiveList(list);
    setActiveIndex(idx >= 0 ? idx : 0);
    recordView(wallpaper);
    setViewHistoryList(getViewHistory());
  }

  useSlideshowRunner(settings.apiKey, slideshowRules);

  // The system tray menu is native OS UI, so it can't read the React i18n
  // context directly — push the current language's labels into it whenever
  // the app starts or the language changes.
  useEffect(() => {
    setTrayLabels(t("tray.show"), t("tray.quit"));
  }, [lang, t]);

  // Widgets are activated as their own separate overlay windows (see
  // lib/widgetWindow.ts), not React state — so anything the user saved
  // last session needs to be respawned here on launch. Guarded by
  // widgetWindowExists so a dev-mode HMR re-run of this effect (or
  // StrictMode's double-invoke) doesn't try to create the same
  // already-open window twice.
  useEffect(() => {
    if (!isTauri()) return;
    (async () => {
      for (const widget of loadWidgets()) {
        if (!(await widgetWindowExists(widget.id))) {
          await spawnWidgetWindow(widget).catch(() => {});
        }
      }
    })();
  }, []);

  useEffect(() => {
    setFilters((f) => {
      if (settings.nsfwEnabled && settings.sketchyEnabled) return f;
      const purities = { ...f.purities };
      if (!settings.nsfwEnabled) purities.nsfw = false;
      if (!settings.sketchyEnabled) purities.sketchy = false;
      return { ...f, purities };
    });
  }, [settings.nsfwEnabled, settings.sketchyEnabled]);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  }

  function toggleRecommendationTag(tag: string): boolean {
    const has = recommendationSettings.customTags.includes(tag);
    const next = {
      ...recommendationSettings,
      // Adding a tag here no longer force-enables useCustomTags — the user
      // decides that separately in Settings; the Lightbox toast tells them
      // to if it's currently off.
      customTags: has ? recommendationSettings.customTags.filter((t) => t !== tag) : [...recommendationSettings.customTags, tag],
    };
    setRecommendationSettings(next);
    saveRecommendationSettings(next);
    return !has;
  }

  function navigateTo(next: View) {
    if (next === view) return;
    pushNav();
    setView(next);
  }

  function runSearch(query: string) {
    pushNav();
    recordSearch(query);
    setFilters({
      ...defaultFilters(),
      query,
      // date_added mixes in loosely-related results for a text/tag query —
      // relevance is what actually keeps results on-topic.
      sorting: "relevance",
      purities: { sfw: true, sketchy: settings.sketchyEnabled, nsfw: settings.nsfwEnabled },
    });
    setView("results");
  }

  function handleFiltersChange(next: Filters) {
    setFilters(next);
    setView("results");
  }

  function runSort(sorting: Filters["sorting"], topRange?: Filters["topRange"]) {
    pushNav();
    setFilters({
      ...defaultFilters(),
      sorting,
      ...(topRange ? { topRange } : {}),
      purities: { sfw: true, sketchy: settings.sketchyEnabled, nsfw: settings.nsfwEnabled },
    });
    setView("results");
  }

  function handleClearHistory() {
    clearViewHistory();
    setViewHistoryList([]);
  }

  return (
    <div className="isolate min-h-screen" style={{ background: "var(--color-bg)" }}>
      <TopBar
        query={filters.query}
        favoritesCount={favorites.length}
        slideshowActive={slideshowRules.some((r) => r.enabled)}
        canGoBack={navStack.length > 0}
        onBack={goBack}
        onSearch={runSearch}
        onLogo={() => navigateTo("home")}
        onOpenFavorites={() => navigateTo("favorites")}
        onOpenHistory={() => navigateTo("history")}
        onOpenSlideshow={() => setSlideshowOpen(true)}
        onOpenWidgets={() => setWidgetsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {view === "home" && (
        <Home
          apiKey={settings.apiKey}
          nsfwAllowed={settings.nsfwEnabled}
          sketchyAllowed={settings.sketchyEnabled}
          heroSettings={heroSettings}
          recommendationSettings={recommendationSettings}
          favoritesVersion={favorites.length}
          isFavorite={isFavorite}
          onSelectTag={runSearch}
          onQuickSort={runSort}
          onOpenRecommendations={() => navigateTo("recommendations")}
          onOpen={openWallpaper}
          onToggleFavorite={toggleFavorite}
          onToast={showToast}
        />
      )}

      {view === "results" && (
        <Results
          filters={filters}
          onFiltersChange={handleFiltersChange}
          apiKey={settings.apiKey}
          nsfwAllowed={settings.nsfwEnabled}
          sketchyAllowed={settings.sketchyEnabled}
          isFavorite={isFavorite}
          onOpen={openWallpaper}
          onToggleFavorite={toggleFavorite}
          onToast={showToast}
        />
      )}

      {view === "favorites" && (
        <Favorites
          favorites={favorites}
          isFavorite={isFavorite}
          onOpen={openWallpaper}
          onToggleFavorite={toggleFavorite}
          onToast={showToast}
        />
      )}

      {view === "history" && (
        <History
          history={viewHistoryList}
          isFavorite={isFavorite}
          onOpen={openWallpaper}
          onToggleFavorite={toggleFavorite}
          onClear={handleClearHistory}
          onToast={showToast}
        />
      )}

      {view === "recommendations" && (
        <Recommendations
          apiKey={settings.apiKey}
          nsfwAllowed={settings.nsfwEnabled}
          sketchyAllowed={settings.sketchyEnabled}
          recommendationSettings={recommendationSettings}
          isFavorite={isFavorite}
          onOpen={openWallpaper}
          onToggleFavorite={toggleFavorite}
          onToast={showToast}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          heroSettings={heroSettings}
          recommendationSettings={recommendationSettings}
          onClose={() => setSettingsOpen(false)}
          onSave={(next, nextHero, nextRec) => {
            setSettings(next);
            saveSettings(next);
            setHeroSettings(nextHero);
            saveHeroSettings(nextHero);
            setRecommendationSettings(nextRec);
            saveRecommendationSettings(nextRec);
            setSettingsOpen(false);
          }}
        />
      )}

      {slideshowOpen && (
        <SlideshowModal
          rules={slideshowRules}
          apiKey={settings.apiKey}
          nsfwAllowed={settings.nsfwEnabled}
          sketchyAllowed={settings.sketchyEnabled}
          onClose={() => setSlideshowOpen(false)}
          onSave={(next) => {
            setSlideshowRules(next);
            saveSlideshowRules(next);
            setSlideshowOpen(false);
          }}
        />
      )}

      {widgetsOpen && <WidgetsModal onClose={() => setWidgetsOpen(false)} />}

      {active && (
        <Lightbox
          wallpaper={active}
          apiKey={settings.apiKey}
          favorite={isFavorite(active.id)}
          hasMultiple={activeList.length > 1}
          favoriteTags={recommendationSettings.customTags}
          myTagsEnabled={recommendationSettings.useCustomTags}
          nsfwAllowed={settings.nsfwEnabled}
          sketchyAllowed={settings.sketchyEnabled}
          onToggleFavoriteTag={toggleRecommendationTag}
          onClose={() => setActiveList([])}
          onNext={() => setActiveIndex((i) => (i + 1) % activeList.length)}
          onPrev={() => setActiveIndex((i) => (i - 1 + activeList.length) % activeList.length)}
          onTagClick={(tag) => {
            setActiveList([]);
            runSearch(tag);
          }}
          onFindSimilar={(query) => {
            setActiveList([]);
            runSearch(query);
          }}
          onToggleFavorite={toggleFavorite}
          onToast={showToast}
        />
      )}

      <Toast message={toast} />
      <ScrollToTopButton />
    </div>
  );
}

export default App;
