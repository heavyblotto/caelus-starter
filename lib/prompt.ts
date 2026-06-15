/**
 * The reading prompt — edit freely; this file is the whole "voice" of the
 * /api/reading route.
 *
 * Caveat worth keeping in mind: an uncited LLM reading is the FLOOR of what
 * astrology software can do, not the ceiling. The model interpolates from
 * training data with no source attribution. A stronger design retrieves
 * passages from a real corpus whose claims are keyed to machine-checkable
 * chart predicates (which caelus can evaluate), and has the model synthesize
 * WITH citations. This route exists so the template demos end-to-end; treat
 * it as a placeholder for that better system.
 */
import { BODIES, fmtLon, angularity, type Chart } from "caelus";

export const SYSTEM_PROMPT =
  "You are an astrologer writing a short natal chart reading. Ground every " +
  "statement in the chart data provided — name the placement or aspect you " +
  "are interpreting. No medical, legal, or financial advice. Warm but " +
  "plain language; no mystic filler.";

/**
 * A compact, readable summary of the chart for the model: positions with sign,
 * house, angularity and dignities, the angles, and the tightest aspects. Far
 * smaller and less noisy than the raw chart JSON, and it foregrounds the
 * structured data (houses, dignities) the engine computes.
 */
function summarize(chart: Chart): string {
  const positions = BODIES.map((b) => {
    const p = chart.bodies[b];
    if (!p) return null;
    const dign = p.dignities.length ? ` [${p.dignities.join(", ")}]` : "";
    return `${b}: ${fmtLon(p.lon)}, house ${p.house} (${angularity(p.house)})` +
      `${p.retrograde ? ", retrograde" : ""}${dign}`;
  })
    .filter(Boolean)
    .join("\n");

  const angles = `Asc ${fmtLon(chart.angles.asc)}, MC ${fmtLon(chart.angles.mc)}`;

  const aspects = [...chart.aspects]
    .sort((a, b) => a.orb - b.orb)
    .slice(0, 12)
    .map((a) => `${a.a} ${a.aspect} ${a.b} (orb ${a.orb}°)`)
    .join("\n");

  return `Positions:\n${positions}\n\nAngles: ${angles}\n\nTightest aspects:\n${aspects}`;
}

export function buildUserPrompt(chart: Chart): string {
  return (
    "Write a reading of at most 250 words for this natal chart. Cover: the " +
    "Sun/Moon/Ascendant triad, one dominant aspect pattern, and one tension " +
    "worth knowing about. Use only the chart data below, and name the " +
    "placement or aspect behind each statement.\n\n" +
    summarize(chart)
  );
}
