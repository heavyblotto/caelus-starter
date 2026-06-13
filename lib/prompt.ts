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
import type { Chart } from "caelus";

export const SYSTEM_PROMPT =
  "You are an astrologer writing a short natal chart reading. Ground every " +
  "statement in the chart data provided — name the placement or aspect you " +
  "are interpreting. No medical, legal, or financial advice. Warm but " +
  "plain language; no mystic filler.";

export function buildUserPrompt(chart: Chart): string {
  return (
    "Write a reading of at most 250 words for this natal chart. Cover: the " +
    "Sun/Moon/Ascendant triad, one dominant aspect pattern, and one tension " +
    "worth knowing about. Chart JSON (positions in ecliptic degrees):\n\n" +
    JSON.stringify(chart)
  );
}
