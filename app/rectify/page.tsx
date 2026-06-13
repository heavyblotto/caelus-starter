export const metadata = { title: "caelus starter — rectification" };

export default function Rectify() {
  return (
    <main>
      <h1 style={{ letterSpacing: "0.05em" }}>
        <a href="/" style={{ color: "inherit", textDecoration: "none" }}>‹</a> unknown birth time
      </h1>
      <p style={{ maxWidth: "42rem" }}>
        Without a birth time the Ascendant and houses are undefined — they move
        through the full zodiac every 24 hours. Rectification narrows the time
        by checking which Ascendant fits known life events.
      </p>
      <p style={{ maxWidth: "42rem" }}>
        The <code>caelus-mcp</code> server has a tool for exactly this. Connect
        it to Claude (or any MCP client) and ask:
      </p>
      <pre style={{ background: "#1a1626", padding: "1rem", borderRadius: 6, overflow: "auto" }}>
{`npx caelus-mcp   # or add to your MCP client config

"Run a rectification grid for a birth on 1990-06-10
 in Tampa (27.95, -82.46), 20-minute steps."`}
      </pre>
      <p style={{ maxWidth: "42rem" }}>
        The <code>rectification_grid</code> tool returns the Ascendant and MC at
        each step across the day, plus the exact times the Ascendant changes
        sign. Cross-reference the candidate windows with appearance, manner, or
        major timed life events (an astrologer&apos;s judgement, not the
        engine&apos;s) and re-enter the narrowed time in the{" "}
        <a href="/" style={{ color: "#8a7fd4" }}>birth form</a>.
      </p>
    </main>
  );
}
