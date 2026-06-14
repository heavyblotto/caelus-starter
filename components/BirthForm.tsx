"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { openMeteoGeocoder, type GeocodeResult } from "caelus-birth/geocode";

const inp = {
  background: "#1a1626", color: "#e8e4f0", border: "1px solid #3a3450",
  borderRadius: 4, padding: "0.4rem 0.6rem", fontFamily: "inherit", fontSize: "1em",
};

export default function BirthForm() {
  const router = useRouter();
  const [date, setDate] = useState("1990-06-10");
  const [time, setTime] = useState("14:30");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [lat, setLat] = useState("27.95");
  const [lon, setLon] = useState("-82.46");
  const [geoMsg, setGeoMsg] = useState("");

  // City search is opt-in: it's the one step that leaves the browser (it sends
  // the place name to Open-Meteo). The manual lat/lon and "use my location"
  // paths never touch the network — caelus-birth resolves the timezone offline
  // from the coordinates. We do not persist any input (no localStorage).
  const [searchOn, setSearchOn] = useState(false);
  const [place, setPlace] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [picked, setPicked] = useState<GeocodeResult | null>(null);
  const [searching, setSearching] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // debounced place search (Open-Meteo geocoder: free, no key; data CC-BY GeoNames)
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!searchOn || place.trim().length < 3 || place === picked?.name) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        setResults(await openMeteoGeocoder.search(place.trim()));
      } catch {
        setResults([]); // offline or rate-limited: manual lat/lon still works
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounce.current);
  }, [place, picked, searchOn]);

  const pick = (r: GeocodeResult) => {
    setPicked(r);
    setPlace(r.name);
    setLat(String(r.lat));
    setLon(String(r.lon));
    setResults([]);
  };

  // navigator.geolocation: the coordinates come from the device, not from us —
  // nothing is sent to a server. Picking a city is the only networked path, so
  // clear any prior pick (and its zone override) when filling coords this way.
  const useMyLocation = () => {
    if (!("geolocation" in navigator)) { setGeoMsg("geolocation not available in this browser"); return; }
    setGeoMsg("locating…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(4));
        setLon(pos.coords.longitude.toFixed(4));
        setPicked(null);
        setGeoMsg("filled from your device (edit if your birthplace differs)");
      },
      () => setGeoMsg("location unavailable or denied — enter coordinates manually"),
    );
  };

  const toggleSearch = (on: boolean) => {
    setSearchOn(on);
    if (!on) { setPlace(""); setResults([]); setPicked(null); } // back to offline-only
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const [y, mo, d] = date.split("-").map(Number);
    const [h, mi] = timeUnknown ? [12, 0] : time.split(":").map(Number);
    const q = new URLSearchParams({
      y: String(y), mo: String(mo), d: String(d), h: String(h), mi: String(mi),
      lat, lon, ...(timeUnknown ? { tu: "1" } : {}),
      ...(picked?.timezone ? { zone: picked.timezone } : {}),
    });
    router.push(`/chart?${q}`);
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: "0.8rem", maxWidth: 480, margin: "1.5rem 0" }}>
      <label>birth date{" "}
        <input style={inp} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <label style={{ opacity: timeUnknown ? 0.4 : 1 }}>local time{" "}
        <input style={inp} type="time" value={time} onChange={(e) => setTime(e.target.value)}
          disabled={timeUnknown} required={!timeUnknown} />
      </label>
      <label>
        <input type="checkbox" checked={timeUnknown} onChange={(e) => setTimeUnknown(e.target.checked)} />
        {" "}time unknown
      </label>

      {/* Coordinates are the default, offline path: type them in, or fill them
          from the device. No place name leaves the browser here. */}
      <fieldset style={{ border: "1px solid #3a3450", borderRadius: 6, padding: "0.8rem", display: "grid", gap: "0.6rem" }}>
        <legend style={{ opacity: 0.7, fontSize: "0.85em", padding: "0 0.4rem" }}>birthplace coordinates</legend>
        <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
          <label>lat <input style={{ ...inp, width: "6rem" }} value={lat} onChange={(e) => { setLat(e.target.value); setPicked(null); }} required /></label>
          <label>lon <input style={{ ...inp, width: "6rem" }} value={lon} onChange={(e) => { setLon(e.target.value); setPicked(null); }} required /></label>
          <span style={{ opacity: 0.5, alignSelf: "center", fontSize: "0.8em" }}>east+</span>
        </div>
        <div style={{ display: "flex", gap: "0.8rem", alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={useMyLocation} style={{ ...inp, cursor: "pointer" }}>
            use my location
          </button>
          {geoMsg && <span style={{ opacity: 0.6, fontSize: "0.8em" }}>{geoMsg}</span>}
        </div>
      </fieldset>

      {/* Opt-in: the only feature that contacts the network. */}
      <label style={{ fontSize: "0.9em" }}>
        <input type="checkbox" checked={searchOn} onChange={(e) => toggleSearch(e.target.checked)} />
        {" "}search by city name instead
      </label>
      {searchOn && (
        <div style={{ position: "relative", display: "grid", gap: "0.4rem" }}>
          <p style={{ opacity: 0.6, fontSize: "0.8em", margin: 0 }}>
            Sends the place name you type to the{" "}
            <a href="https://open-meteo.com/en/docs/geocoding-api" style={{ color: "#8a7fd4" }}>Open-Meteo geocoding API</a>{" "}
            to look up coordinates. Your date and time are never sent.
          </p>
          <label>place{" "}
            <input style={{ ...inp, width: "16rem" }} value={place} placeholder="search a city…"
              onChange={(e) => { setPlace(e.target.value); setPicked(null); }} />
          </label>
          {searching && <span style={{ opacity: 0.5 }}>…</span>}
          {results.length > 0 && (
            <ul style={{
              position: "absolute", top: "100%", zIndex: 2, listStyle: "none", margin: 0, padding: 0,
              background: "#1a1626", border: "1px solid #3a3450", borderRadius: 4, width: "20rem",
            }}>
              {results.map((r) => (
                <li key={`${r.lat},${r.lon}`}>
                  <button type="button" onClick={() => pick(r)} style={{
                    ...inp, border: "none", width: "100%", textAlign: "left", cursor: "pointer",
                  }}>{r.name}</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p style={{ opacity: 0.55, fontSize: "0.8em", margin: 0 }}>
        On the manual / location path, your birth data is computed entirely in
        your browser — it's never transmitted to a server or stored.
      </p>

      <button type="submit" style={{ ...inp, cursor: "pointer", borderColor: "#8a7fd4", width: "10rem" }}>
        compute chart
      </button>
    </form>
  );
}
