import { useEffect, useMemo, useState } from "react";
import { backgroundCss, type ClockStyle } from "../../lib/clockStyle";
import { formatClockDate, currentLocale } from "../../lib/clockDate";
import { ensureGoogleFont, fontFamilyFor, FONT_OPTIONS } from "../../lib/googleFonts";
import { fetchWeather, weatherIcon, type WeatherData } from "../../lib/weather";

const WEATHER_REFRESH_MS = 20 * 60 * 1000;

interface Props {
  style: ClockStyle;
}

const ROMAN = ["XII", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI"];
const ARABIC = ["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"];

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function AnalogFace({ style, now }: { style: ClockStyle["analog"]; now: Date }) {
  const seconds = now.getSeconds();
  const minutes = now.getMinutes() + seconds / 60;
  const hours = (now.getHours() % 12) + minutes / 60;
  const secDeg = seconds * 6;
  const minDeg = minutes * 6;
  const hourDeg = hours * 30;

  const labels = style.face === "roman" ? ROMAN : style.face === "numerals" ? ARABIC : null;

  return (
    <svg viewBox="0 0 200 200" className="h-full w-full">
      {style.faceColor && <circle cx={100} cy={100} r={94} fill={style.faceColor} />}

      {style.face === "ticks" &&
        Array.from({ length: 12 }, (_, i) => {
          const outer = polar(100, 100, 88, i * 30);
          const inner = polar(100, 100, i % 3 === 0 ? 74 : 80, i * 30);
          return <line key={i} x1={outer.x} y1={outer.y} x2={inner.x} y2={inner.y} stroke={style.tickColor} strokeWidth={i % 3 === 0 ? 3 : 1.5} strokeLinecap="round" />;
        })}

      {labels &&
        labels.map((label, i) => {
          const pos = polar(100, 100, 72, i * 30);
          return (
            <text key={label} x={pos.x} y={pos.y} fill={style.tickColor} fontSize={16} textAnchor="middle" dominantBaseline="middle">
              {label}
            </text>
          );
        })}

      <line x1={100} y1={100} x2={100} y2={44} stroke={style.handHour} strokeWidth={5} strokeLinecap="round" transform={`rotate(${hourDeg} 100 100)`} />
      <line x1={100} y1={100} x2={100} y2={28} stroke={style.handMinute} strokeWidth={3.5} strokeLinecap="round" transform={`rotate(${minDeg} 100 100)`} />
      {style.showSecondHand && (
        <line x1={100} y1={112} x2={100} y2={22} stroke={style.handSecond} strokeWidth={2} strokeLinecap="round" transform={`rotate(${secDeg} 100 100)`} />
      )}
      <circle cx={100} cy={100} r={4} fill={style.handSecond} />
    </svg>
  );
}

function DigitalFace({ style, now }: { style: ClockStyle; now: Date }) {
  const d = style.digital;

  useEffect(() => {
    ensureGoogleFont(FONT_OPTIONS.find((f) => f.id === d.fontId)?.googleFont);
    if (d.showDate) ensureGoogleFont(FONT_OPTIONS.find((f) => f.id === d.dateFontId)?.googleFont);
  }, [d.fontId, d.dateFontId, d.showDate]);

  const [weather, setWeather] = useState<WeatherData | null>(null);
  useEffect(() => {
    if (!d.showWeather) {
      setWeather(null);
      return;
    }
    let cancelled = false;
    function load() {
      fetchWeather(d.weatherLocationMode, d.weatherLocationQuery, d.weatherUnit).then((w) => {
        if (!cancelled) setWeather(w);
      });
    }
    load();
    const interval = setInterval(load, WEATHER_REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [d.showWeather, d.weatherLocationMode, d.weatherLocationQuery, d.weatherUnit]);

  let hours = now.getHours();
  const suffix = d.format === "12h" ? (hours >= 12 ? "PM" : "AM") : "";
  if (d.format === "12h") {
    hours = hours % 12;
    if (hours === 0) hours = 12;
  }
  const hh = hours.toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");
  const timeText = `${hh}:${mm}${d.showSeconds ? `:${ss}` : ""}${suffix ? ` ${suffix}` : ""}`;

  const dateText = formatClockDate(now, d.dateFormat);

  return (
    <div className="flex flex-col items-center">
      <span
        style={{
          fontFamily: fontFamilyFor(d.fontId),
          fontWeight: d.fontWeight,
          fontStyle: d.italic ? "italic" : "normal",
          textTransform: d.uppercase ? "uppercase" : "none",
          color: d.color,
          letterSpacing: `${d.letterSpacing}px`,
          fontSize: `${d.fontSize}px`,
          lineHeight: 1,
          whiteSpace: "nowrap",
          textShadow: d.glow ? `0 0 0.3em ${d.color}, 0 0 0.08em ${d.color}` : undefined,
        }}
      >
        {timeText}
      </span>

      {style.background.divider && <div style={{ width: "70%", height: 1, margin: "0.4em 0", background: style.background.dividerColor }} />}

      {d.showDate && (
        <span
          style={{
            fontFamily: fontFamilyFor(d.dateFontId),
            color: d.dateColor,
            textTransform: d.dateUppercase ? "uppercase" : "none",
            fontSize: `${d.dateFontSize}px`,
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            marginTop: style.background.divider ? 0 : "0.3em",
          }}
        >
          {dateText}
        </span>
      )}

      {d.showWeather && weather && (
        <div className="flex items-center gap-2" style={{ marginTop: "0.35em", fontFamily: fontFamilyFor(d.fontId), color: d.weatherColor, fontSize: `${d.weatherFontSize}px`, whiteSpace: "nowrap" }}>
          <span>{weatherIcon(weather.code)}</span>
          <span>
            {weather.temperature > 0 ? "+" : ""}
            {weather.temperature}°{d.weatherUnit === "f" ? "F" : ""}
          </span>
          <span style={{ opacity: 0.75, fontSize: "0.7em" }}>{weather.locationName}</span>
        </div>
      )}

      {d.showWeather && weather && d.showForecast && weather.forecast.length > 0 && (
        <div className="flex gap-3" style={{ marginTop: "0.3em", fontFamily: fontFamilyFor(d.fontId), color: d.weatherColor, fontSize: `${d.weatherFontSize * 0.65}px`, opacity: 0.85 }}>
          {weather.forecast.map((day) => (
            <div key={day.date} className="flex flex-col items-center gap-0.5">
              <span>{new Intl.DateTimeFormat(currentLocale(), { weekday: "short" }).format(new Date(day.date))}</span>
              <span>{weatherIcon(day.code)}</span>
              <span>
                {day.tempMax > 0 ? "+" : ""}
                {day.tempMax}°
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Renders a clock according to its full ClockStyle — background layer,
 * rotation/opacity transform, and either the digital or analog face. */
export default function ClockWidget({ style }: Props) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const bgCss = useMemo(() => backgroundCss(style.background), [style.background]);

  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{
        transform: style.rotation ? `rotate(${style.rotation}deg)` : undefined,
        opacity: style.opacity / 100,
      }}
    >
      <div
        className="flex h-full w-full items-center justify-center p-2"
        style={{
          ...bgCss,
          borderRadius: style.background.cornerRadius,
          border: style.background.outline ? `1px solid ${style.background.outlineColor}` : style.background.borderColor && style.background.kind !== "none" ? `1px solid ${style.background.borderColor}` : undefined,
        }}
      >
        {style.mode === "analog" ? <AnalogFace style={style.analog} now={now} /> : <DigitalFace style={style} now={now} />}
      </div>
    </div>
  );
}
