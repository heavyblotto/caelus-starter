"use client";
import { useEffect, useState } from "react";
import { Engine, BODIES, fmtLon, type Chart } from "caelus";
import { embeddedData } from "caelus/data-embedded";

const STRIP = ["sun", "moon", "mercury", "venus", "mars"] as const;

export default function TodayStrip() {
  const [chart, setChart] = useState<Chart | null>(null);

  useEffect(() => {
    const engine = new Engine(embeddedData);
    const d = new Date();
    setChart(engine.chart(
      d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(),
      d.getUTCHours(), d.getUTCMinutes(), 0, 0, 0, "whole_sign",
    ));
  }, []);

  if (!chart) return null;
  const retro = BODIES.filter((b) => chart.bodies[b]?.retrograde);

  return (
    <p style={{ opacity: 0.55, fontSize: "0.85em", borderTop: "1px solid #2a2438", paddingTop: "1rem" }}>
      today:{" "}
      {STRIP.map((b) => `${b} ${fmtLon(chart.bodies[b].lon)}`).join(" · ")}
      {retro.length > 0 && <> · retrograde: {retro.join(", ")}</>}
    </p>
  );
}
