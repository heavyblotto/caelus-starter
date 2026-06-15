"use client";
import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Engine, SIGNS, julianDay,
  progressedLongitude, solarReturn, solarArc, type Chart,
} from "caelus";
import { embeddedData } from "caelus/data-embedded";
import { toUT } from "caelus-birth";
import ChartView from "../../components/ChartView";

const engine = new Engine(embeddedData);

// longitude -> "Sign 12.3°"
const fmtLon = (lon: number) => {
  const x = ((lon % 360) + 360) % 360;
  return `${SIGNS[Math.floor(x / 30)]} ${(x % 30).toFixed(1)}\u00b0`;
};

// UT Julian Day -> "YYYY-MM-DD HH:MM UT" (rounded to the minute)
const jdToUtc = (jd: number) => {
  const d = new Date(Math.round((jd - 2440587.5) * 1440) * 60_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ` +
    `${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UT`;
};

// Resolve the query params to a UT instant and a chart. `useLater` picks the
// second candidate of an ambiguous (clocks-fell-back) local time.
function resolveChart(p: URLSearchParams, useLater: boolean, timeUnknown: boolean) {
  const n = (k: string) => Number(p.get(k));
  const t = toUT({
    year: n("y"), month: n("mo"), day: n("d"), hour: n("h"), minute: n("mi"),
    lat: n("lat"), lon: n("lon"),
    ...(p.get("zone") ? { zone: p.get("zone")! } : {}),
  });
  const utc = useLater && t.candidates?.[1]
    ? (() => {
        const ms = (t.candidates[1].jdUt - 2440587.5) * 86_400_000;
        const d = new Date(Math.round(ms));
        return {
          year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
          hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds(),
        };
      })()
    : t.utc;
  const chart = engine.chart(
    utc.year, utc.month, utc.day, utc.hour, utc.minute, utc.second,
    n("lat"), n("lon"), timeUnknown ? "whole_sign" : "placidus",
  );
  return { t, chart };
}

// Derived charts for "now": secondary progressions (a day of motion per year of
// life) and the next solar return. Time-mappings on the validated positions, so
// they hold even when the birth time is unknown.
function buildDerived(chart: Chart) {
  const natalJd = chart.jdUt;
  const now = new Date();
  const todayJd = julianDay(
    now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(),
    now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds(),
  );
  const sr = solarReturn(engine, natalJd, todayJd, todayJd + 366);
  return {
    on: now.toISOString().slice(0, 10),
    progSun: fmtLon(progressedLongitude(engine, "sun", natalJd, todayJd)),
    progMoon: fmtLon(progressedLongitude(engine, "moon", natalJd, todayJd)),
    arc: solarArc(engine, natalJd, todayJd),
    solarReturn: sr.length ? jdToUtc(sr[0]) : null,
  };
}

function ChartInner() {
  const params = useSearchParams();
  const router = useRouter();

  const n = (k: string) => Number(params.get(k));
  const timeUnknown = params.get("tu") === "1";
  const useLater = params.get("alt") === "1"; // ambiguous time: later candidate

  const { t, chart, derived, error } = useMemo(() => {
    try {
      const { t, chart } = resolveChart(params, useLater, timeUnknown);
      return { t, chart, derived: buildDerived(chart), error: null };
    } catch (e) {
      return { t: null, chart: null, derived: null, error: e instanceof Error ? e.message : String(e) };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  if (error) return <p style={{ color: "#e08a8a" }}>{error}</p>;
  if (!t || !chart || !derived) return null;

  const localTime = `${params.get("h")}:${String(n("mi")).padStart(2, "0")}`;

  return (
    <main>
      <h1 style={{ letterSpacing: "0.05em" }}>
        <a href="/" style={{ color: "inherit", textDecoration: "none" }}>‹</a> chart
      </h1>
      <p style={{ opacity: 0.6, fontSize: "0.9em" }}>
        {params.get("y")}-{params.get("mo")}-{params.get("d")} {localTime} local
        ({t.zone}, UTC{t.offsetMinutes >= 0 ? "+" : ""}{t.offsetMinutes / 60}
        {t.dst ? " DST" : ""}) → {String(t.utc.hour).padStart(2, "0")}:
        {String(t.utc.minute).padStart(2, "0")} UT
      </p>

      {t.status === "ambiguous" && (
        <p style={{ background: "#2a2438", padding: "0.6rem 1rem", borderRadius: 6 }}>
          Clocks changed that night — {localTime} happened twice. Showing the{" "}
          {useLater ? "later" : "earlier"} one.{" "}
          <button
            onClick={() => {
              const q = new URLSearchParams(params.toString());
              if (useLater) q.delete("alt"); else q.set("alt", "1");
              router.replace(`/chart?${q}`);
            }}
            style={{ color: "#8a7fd4", background: "none", border: "none",
              cursor: "pointer", font: "inherit", textDecoration: "underline" }}
          >switch?</button>
        </p>
      )}
      {t.status === "nonexistent" && (
        <p style={{ background: "#2a2438", padding: "0.6rem 1rem", borderRadius: 6 }}>
          Clocks sprang forward that night — {localTime} never existed. Shifted
          forward per timezone convention.
        </p>
      )}
      {timeUnknown && (
        <p style={{ background: "#2a2438", padding: "0.6rem 1rem", borderRadius: 6 }}>
          Birth time unknown: computed for local noon with whole-sign houses.
          Planet signs are usually reliable (the Moon can change sign within a
          day); <strong>houses and the Ascendant require a birth time</strong>.{" "}
          <a href="/rectify" style={{ color: "#8a7fd4" }}>How to narrow it down →</a>
        </p>
      )}

      <ChartView chart={chart} hideHouses={timeUnknown} />

      <section style={{ marginTop: "1.75rem" }}>
        <h2 style={{ fontSize: "1rem", letterSpacing: "0.05em", margin: "0 0 0.1rem" }}>
          derived — as of {derived.on}
        </h2>
        <p style={{ opacity: 0.6, fontSize: "0.85em", margin: "0 0 0.6rem" }}>
          Secondary progressions and the next solar return, computed live from the
          natal chart.
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, lineHeight: 1.9 }}>
          <li>Progressed Sun: <strong>{derived.progSun}</strong></li>
          <li>Progressed Moon: <strong>{derived.progMoon}</strong></li>
          <li>
            Solar arc: <strong>+{derived.arc.toFixed(1)}°</strong>{" "}
            <span style={{ opacity: 0.55 }}>(natal positions advanced by this much)</span>
          </li>
          {derived.solarReturn && (
            <li>Next solar return: <strong>{derived.solarReturn}</strong></li>
          )}
        </ul>
      </section>
    </main>
  );
}

export default function ChartPage() {
  return (
    <Suspense fallback={<p style={{ opacity: 0.5 }}>computing…</p>}>
      <ChartInner />
    </Suspense>
  );
}
