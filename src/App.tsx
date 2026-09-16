import { useEffect, useState } from "react";
import TopBar from "./components/TopBar";
import SettingsModal from "./components/SettingsModal";
import SlideshowModal from "./components/SlideshowModal";
import Toast from "./components/Toast";
import Lightbox from "./components/Lightbox";
import HoverBackdrop from "./components/HoverBackdrop";
import ScrollToTopButton from "./components/ScrollToTopButton";
import Home from "./pages/Home";
import Results from "./pages/Results";
import Favorites from "./pages/Favorites";
import { defaultFilters } from "./lib/filters";
import { loadSettings, saveSettings, type Settings } from "./lib/settings";
import { loadHeroSettings, saveHeroSettings, type HeroSettings } from "./lib/heroSettings";
import { loadRecommendationSettings, saveRecommendationSettings, type RecommendationSettings } from "./lib/recommendationSettings";
import { loadSlideshowRules, saveSlideshowRules } from "./lib/slideshow";
import { useSlideshowRunner } from "./lib/useSlideshowRunner";
import { useFavorites } from "./lib/useFavorites";
import { recordSearch } from "./lib/searchHistory";
import { useLang } from "./lib/LangContext";
import { setTrayLabels } from "./lib/tauri";
import type { Filters, Wallpaper } from "./lib/types";

type View = "home" | "results" | "favorites";

function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings());
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(loadHeroSettings());
  const [recommendationSettings, setRecommendationSettings] = useState<RecommendationSettings>(loadRecommendationSettings());
  const [view, setView] = useState<View>("home");
  const [filters, setFilters] = useState<Filters>(defaultFilters());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [slideshowOpen, setSlideshowOpen] = useState(false);
  const [slideshowRules, setSlideshowRules] = useState(() => loadSlideshowRules());
  const [toast, setToast] = useState<string | null>(null);
  const [activeList, setActiveList] = useState<Wallpaper[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const active = activeList[activeIndex] ?? null;
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { t, lang } = useLang();

  function openWallpaper(wallpaper: Wallpaper, list: Wallpaper[]) {
    const idx = list.findIndex((w) => w.id === wallpaper.id);
    setActiveList(list);
    setActiveIndex(idx >= 0 ? idx : 0);
  }

  useSlideshowRunner(settings.apiKey, slideshowRules);

  // The system tray menu is native OS UI, so it can't read the React i18n
  // context directly — push the current language's labels into it whenever
  // the app starts or the language changes.
  useEffect(() => {
    setTrayLabels(t("tray.show"), t("tray.quit"));
  }, [lang, t]);

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
      // Starring a tag is an explicit signal the user wants tag-based
      // recommendations — without this, the tag was saved but silently had
      // no effect until the user separately found and flipped the toggle
      // in Settings themselves.
      useCustomTags: has ? recommendationSettings.useCustomTags : true,
      customTags: has ? recommendationSettings.customTags.filter((t) => t !== tag) : [...recommendationSettings.customTags, tag],
    };
    setRecommendationSettings(next);
    saveRecommendationSettings(next);
    return !has;
  }

  function runSearch(query: string) {
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
    setFilters({
      ...defaultFilters(),
      sorting,
      ...(topRange ? { topRange } : {}),
      purities: { sfw: true, sketchy: settings.sketchyEnabled, nsfw: settings.nsfwEnabled },
    });
    setView("results");
  }

  return (
    <div className="isolate min-h-screen" style={{ background: "var(--color-bg)" }}>
      <HoverBackdrop />
      <TopBar
        query={filters.query}
        favoritesCount={favorites.length}
        slideshowActive={slideshowRules.some((r) => r.enabled)}
        onSearch={runSearch}
        onLogo={() => setView("home")}
        onOpenFavorites={() => setView("favorites")}
        onOpenSlideshow={() => setSlideshowOpen(true)}
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

      {active && (
        <Lightbox
          wallpaper={active}
          apiKey={settings.apiKey}
          favorite={isFavorite(active.id)}
          hasMultiple={activeList.length > 1}
          favoriteTags={recommendationSettings.customTags}
          onToggleFavoriteTag={toggleRecommendationTag}
          onClose={() => setActiveList([])}
          onNext={() => setActiveIndex((i) => (i + 1) % activeList.length)}
          onPrev={() => setActiveIndex((i) => (i - 1 + activeList.length) % activeList.length)}
          onTagClick={(tag) => {
            setActiveList([]);
            runSearch(tag);
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
