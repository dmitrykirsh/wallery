export interface WeatherDay {
  date: string;
  tempMax: number;
  code: number;
}

export interface WeatherData {
  temperature: number;
  code: number;
  locationName: string;
  forecast: WeatherDay[];
}

export type WeatherUnit = "c" | "f";
export type WeatherLocationMode = "auto" | "manual";

/** Maps a WMO weather code (used by Open-Meteo) to a single representative
 * emoji — no icon assets to ship or theme, and it reads fine at the small
 * sizes a widget's weather line uses. */
export function weatherIcon(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "🌤️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "🌨️";
  if (code >= 80 && code <= 82) return "🌦️";
  if (code >= 85 && code <= 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌡️";
}

async function geocodeCity(query: string): Promise<{ name: string; lat: number; lon: number } | null> {
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`);
    const data = await res.json();
    const hit = data?.results?.[0];
    if (!hit) return null;
    return { name: hit.name, lat: hit.latitude, lon: hit.longitude };
  } catch {
    return null;
  }
}

async function locateByIp(): Promise<{ name: string; lat: number; lon: number } | null> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    if (!data || data.error || typeof data.latitude !== "number") return null;
    return { name: data.city, lat: data.latitude, lon: data.longitude };
  } catch {
    return null;
  }
}

export async function fetchWeather(mode: WeatherLocationMode, query: string, unit: WeatherUnit): Promise<WeatherData | null> {
  const located = mode === "manual" && query.trim() ? await geocodeCity(query.trim()) : await locateByIp();
  if (!located) return null;

  try {
    const tempUnit = unit === "f" ? "fahrenheit" : "celsius";
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${located.lat}&longitude=${located.lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,weather_code&forecast_days=4&temperature_unit=${tempUnit}&timezone=auto`,
    );
    const data = await res.json();
    const forecast: WeatherDay[] = (data.daily?.time ?? []).slice(1, 4).map((date: string, i: number) => ({
      date,
      tempMax: Math.round(data.daily.temperature_2m_max[i + 1]),
      code: data.daily.weather_code[i + 1],
    }));
    return {
      temperature: Math.round(data.current.temperature_2m),
      code: data.current.weather_code,
      locationName: located.name,
      forecast,
    };
  } catch {
    return null;
  }
}
