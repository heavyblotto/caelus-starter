"use client";
import { useState } from "react";
import { BODIES, fmtLon, angularity, type Chart } from "caelus";
import { ChartWheel, ChartSphere } from "caelus-wheel";

// Essential dignity tone: strengths in accent, debilities muted red, else dim.
const DIGNITY_TONE: Record<string, string> = {
  domicile: "#8a7fd4",
  exaltation: "#8a7fd4",
  detriment: "#c98a8a",
  fall: "#c98a8a",
};
const dignityColor = (d: string) => DIGNITY_TONE[d] ?? "#8b849e";

export default function ChartView({ chart, hideHouses = false }: { chart: Chart; hideHouses?: boolean }) {
  const [reading, setReading] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"wheel" | "sphere">("wheel");

  const getReading = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chart }),
      });
      const data = await res.json();
      setReading(res.ok ? data.reading : data.error);
    } catch {
      setReading("Reading unavailable.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ maxWidth: 480, margin: "1rem 0" }}>
        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.6rem" }}>
          {(["wheel", "sphere"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? "#1a1626" : "transparent", color: "#e8e4f0",
              border: `1px solid ${view === v ? "#8a7fd4" : "#3a3550"}`,
              borderRadius: 4, padding: "0.25rem 0.7rem", cursor: "pointer",
              font: "inherit", textTransform: "capitalize",
            }}>{v}</button>
          ))}
        </div>
        {view === "wheel"
          ? <ChartWheel chart={chart} size={480} />
          : <ChartSphere chart={chart} size={480} />}
      </div>

      <h2>positions</h2>
      <table style={{ borderSpacing: "0.8rem 0.15rem" }}>
        <tbody>
          {BODIES.map((b) => {
            const body = chart.bodies[b];
            if (!body) return null; // omitted when outside its fitted range (e.g. Chiron)
            const ang = angularity(body.house);
            return (
              <tr key={b}>
                <td style={{ opacity: 0.6, fontWeight: !hideHouses && ang === "angular" ? 700 : 400 }}>{b}</td>
                <td>{fmtLon(body.lon)}{body.retrograde ? " ℞" : ""}</td>
                {!hideHouses && (
                  <td style={{ fontSize: "0.85em" }}>
                    <span style={{ opacity: 0.6 }}>house {body.house}</span>{" "}
                    <span style={{ color: ang === "angular" ? "#8a7fd4" : "#6f6885" }}>{ang}</span>
                  </td>
                )}
                <td style={{ fontSize: "0.85em" }}>
                  {body.dignities.length
                    ? body.dignities.map((d, i) => (
                        <span key={d} style={{ color: dignityColor(d) }}>{i ? ", " : ""}{d}</span>
                      ))
                    : <span style={{ opacity: 0.3 }}>—</span>}
                </td>
              </tr>
            );
          })}
          {!hideHouses && (
            <>
              <tr><td style={{ opacity: 0.6 }}>ASC</td><td>{fmtLon(chart.angles.asc)}</td><td /><td /></tr>
              <tr><td style={{ opacity: 0.6 }}>MC</td><td>{fmtLon(chart.angles.mc)}</td><td /><td /></tr>
            </>
          )}
        </tbody>
      </table>
      {!hideHouses && (
        <p style={{ opacity: 0.45, fontSize: "0.78em", margin: "0.3rem 0 0" }}>
          Angular planets (houses 1, 4, 7, 10) sit on the chart&apos;s axes; dignities are the planet&apos;s standing in its sign.
        </p>
      )}

      <h2>aspects</h2>
      <ul style={{ lineHeight: 1.7, paddingLeft: "1.2rem" }}>
        {[...chart.aspects].sort((x, y) => x.orb - y.orb).map((a, i) => {
          const tight = a.orb < 2;
          return (
            <li key={i} style={{ opacity: tight ? 1 : 0.65 }}>
              {a.a} {a.aspect} {a.b}{" "}
              <span style={{ opacity: 0.5 }}>(orb {a.orb}°)</span>
            </li>
          );
        })}
      </ul>

      <h2>reading <span style={{ opacity: 0.5, fontSize: "0.7em" }}>(optional, needs an API key)</span></h2>
      {reading
        ? <p style={{ whiteSpace: "pre-wrap", maxWidth: "42rem" }}>{reading}</p>
        : <button onClick={getReading} disabled={busy} style={{
            background: "#1a1626", color: "#e8e4f0", border: "1px solid #8a7fd4",
            borderRadius: 4, padding: "0.4rem 0.8rem", cursor: "pointer", font: "inherit",
          }}>{busy ? "thinking…" : "generate reading"}</button>}
    </div>
  );
}
