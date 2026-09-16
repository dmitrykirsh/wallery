export interface Wallpaper {
  id: string;
  url: string;
  short_url: string;
  views: number;
  favorites: number;
  source: string;
  purity: "sfw" | "sketchy" | "nsfw";
  category: "general" | "anime" | "people";
  dimension_x: number;
  dimension_y: number;
  resolution: string;
  ratio: string;
  file_size: number;
  file_type: string;
  created_at: string;
  colors: string[];
  path: string;
  thumbs: {
    large: string;
    original: string;
    small: string;
  };
  tags?: Tag[];
}

export interface Tag {
  id: number;
  name: string;
  alias: string;
  category_id: number;
  category: string;
  purity: string;
  created_at: string;
}

export interface SearchMeta {
  current_page: number;
  last_page: number;
  per_page: number | string;
  total: number;
  query?: string | { id: number; tag: string } | null;
  seed?: string | null;
}

export interface SearchResponse {
  data: Wallpaper[];
  meta: SearchMeta;
}

export type Category = "general" | "anime" | "people";
export type Purity = "sfw" | "sketchy" | "nsfw";
export type Sorting =
  | "date_added"
  | "relevance"
  | "random"
  | "views"
  | "favorites"
  | "toplist";
export type Order = "desc" | "asc";
export type TopRange = "1d" | "3d" | "1w" | "1M" | "3M" | "6M" | "1y";

export interface Filters {
  query: string;
  categories: Record<Category, boolean>;
  purities: Record<Purity, boolean>;
  sorting: Sorting;
  order: Order;
  topRange: TopRange;
  /** Minimum resolution (e.g. "1920x1080") — mutually exclusive with resolutions. */
  atleast: string | null;
  /** Exact resolutions to match, OR'd together — mutually exclusive with atleast. */
  resolutions: string[];
  ratios: string[];
  colors: string[];
}
