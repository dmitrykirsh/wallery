// Curated pool of popular Wallhaven search terms with plenty of results each,
// used to render an endless tag-browsing list on the home page (the public
// API has no "trending tags" endpoint).
export const SUGGESTED_TAGS: string[] = [
  "nature", "minimalism", "abstract", "cyberpunk", "space", "mountains", "ocean", "forest",
  "city at night", "architecture", "cars", "anime", "fantasy art", "dark", "neon", "low poly",
  "gradient", "black and white", "autumn", "winter", "sunset", "galaxy", "technology", "retro",
  "vaporwave", "mecha", "landscape", "wildlife", "macro", "aerial view", "desert", "snow",
  "rain", "clouds", "stars", "moon", "flowers", "Japan", "sci-fi", "dragons", "castles", "ships",
  "motorcycles", "supercars", "pastel", "geometric", "texture", "gaming", "samurai", "robots",
  "birds", "northern lights", "waterfalls", "canyons", "islands", "sakura", "midnight",
  "cityscape", "lakes", "space art", "sunrise", "beach", "tropical", "underwater", "volcano",
  "storm", "lightning", "fog", "mist", "reflection", "symmetry", "pattern", "wood", "marble",
  "concrete", "glass", "smoke", "fire", "ice", "crystal", "gold", "chrome", "vintage", "grunge",
  "watercolor", "oil painting", "sketch", "line art", "pixel art", "3d render", "isometric",
  "wallpaper engine", "portrait", "street photography", "black background", "colorful", "monochrome",
  "duotone", "bokeh", "long exposure", "drone photo", "cityscape night", "skyline", "bridge",
  "train", "subway", "airport", "road", "highway", "desert road", "countryside", "farm",
  "village", "temple", "shrine", "church", "cathedral", "ruins", "ancient", "medieval",
  "steampunk", "post apocalyptic", "utopia", "dystopia", "alien", "ufo", "astronaut", "planet",
  "nebula", "black hole", "satellite", "rocket", "space station", "moon landing", "earth from space",
  "wolf", "fox", "cat", "dog", "horse", "deer", "lion", "tiger", "eagle", "owl", "butterfly",
  "koi fish", "shark", "whale", "dinosaur", "dragon art", "phoenix", "unicorn", "fairy",
  "witch", "wizard", "knight", "warrior", "ninja", "assassin", "pirate", "viking", "cowboy",
  "superhero", "villain", "cyborg", "android", "cat girl", "elf", "demon", "angel", "ghost",
  "skull", "horror", "creepy", "gothic", "dark fantasy", "war", "battle", "explosion", "tank",
  "fighter jet", "submarine", "spaceship", "mech", "gundam", "cloud city", "floating island",
  "waterfall city", "treehouse", "cabin", "lighthouse", "windmill", "greenhouse", "garden",
  "bonsai", "cherry blossom", "lotus", "rose", "sunflower", "lavender field", "wheat field",
  "vineyard", "coffee", "tea", "food art", "dessert", "cocktail", "neon sign", "arcade",
  "retro game", "keyboard", "headphones", "vinyl", "camera", "typewriter", "books", "library",
  "coding", "desk setup", "minimal desk", "workspace", "office", "chalkboard", "graffiti",
  "street art", "skateboard", "surfing", "snowboarding", "skiing", "climbing", "hiking",
  "camping", "tent", "campfire", "stars at night", "milky way", "aurora", "iceberg", "glacier",
  "coral reef", "jellyfish", "octopus", "diving", "kayak", "sailing", "yacht", "cruise ship",
];

// Only mixed in when the user has NSFW enabled in settings — kept tasteful
// rather than explicit, since Wallhaven itself is what actually gates the
// resulting content by purity.
export const NSFW_TAGS: string[] = [
  "ecchi", "bikini", "lingerie", "pin-up", "boudoir", "glamour", "swimsuit",
  "cosplay girl", "gravure", "lace", "succubus", "femme fatale",
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickRandomTags(count: number, includeNsfw = false): string[] {
  const pool = includeNsfw ? [...SUGGESTED_TAGS, ...NSFW_TAGS] : SUGGESTED_TAGS;
  return shuffle(pool).slice(0, count);
}

/** A fully shuffled copy of the tag pool, reshuffled fresh every time this
 * is called (i.e. once per app load when used from module-level state). */
export function shuffledTags(includeNsfw = false): string[] {
  const pool = includeNsfw ? [...SUGGESTED_TAGS, ...NSFW_TAGS] : SUGGESTED_TAGS;
  return shuffle(pool);
}
