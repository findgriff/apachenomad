'use client';

import { FormEvent, useMemo, useState } from "react";
import ItineraryMap from "../components/ItineraryMap";

type JobResult = {
  id: string;
  status: string;
  Result?: Array<{
    rank: number;
    cityOrder: string[];
    dates: string[];
    totalPriceCents: number;
    currency: string;
    legs?: Array<{
      o: string;
      d: string;
      date: string;
      result?: {
        offerId: string | null;
        minPriceCents: number | null;
        currency: string | null;
        legs?: Array<{
          segments?: Array<{
            departure?: { iataCode?: string; at?: string };
            arrival?: { iataCode?: string; at?: string };
            carrierCode?: string;
            number?: string;
            duration?: string;
          }>;
        }>;
      };
    }>;
  }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const legPalette = ["#34d399", "#60a5fa", "#f472b6", "#fbbf24", "#a78bfa", "#fb7185"];

const formatDateTime = (value?: string) => {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originValue, setOriginValue] = useState("");
  const [endValue, setEndValue] = useState("");
  const [citiesValue, setCitiesValue] = useState("");

  const today = useMemo(() => new Date(), []);
  const inTenDays = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d;
  }, []);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const payload = {
      origin: String(formData.get("origin") || "").trim(),
      endFixed: (formData.get("endFixed") as string) || undefined,
      cities: String(formData.get("cities") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      windowStart: formData.get("windowStart"),
      windowEnd: formData.get("windowEnd"),
      nightsMin: Number(formData.get("nightsMin") || 2),
      nightsMax: Number(formData.get("nightsMax") || 4),
      maxConnections: Number(formData.get("maxConnections") || 1),
      includeAirlines: String(formData.get("includeAirlines") || "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
      excludeAirlines: String(formData.get("excludeAirlines") || "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean),
    };

    try {
      const res = await fetch(`${apiUrl}/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg);
      }
      const data = await res.json();
      setJobId(data.id);
      setJob(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create job";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function refresh() {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiUrl}/jobs/${jobId}`);
      if (!res.ok) {
        throw new Error("Unable to load job status");
      }
      const data = await res.json();
      setJob(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch job";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      id="planner"
      className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-400/20 via-black to-black text-yellow-50"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.2em] text-yellow-200">Apache Nomad</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Multi-stop trip planner</h1>
          <p className="text-sm text-yellow-100/70 sm:text-base">
            Plan a 2–6 city loop with Amadeus pricing. Provide your cities, date window, and airline
            preferences; we will queue an optimization job and return the best itinerary.
          </p>
        </header>

        <section
          id="jobs"
          className="grid gap-6 rounded-2xl bg-black/60 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.55)] ring-1 ring-yellow-400/20 backdrop-blur sm:grid-cols-[1.2fr_1fr] sm:gap-10"
        >
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                Origin (city, airport, or IATA)
                <input
                  name="origin"
                  placeholder="London Heathrow or LHR"
                  required
                  value={originValue}
                  onChange={(event) => setOriginValue(event.target.value)}
                  className="rounded-lg border border-yellow-400/20 bg-black/60 px-3 py-2 text-base text-yellow-50 outline-none ring-yellow-300/40 focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                End (optional)
                <input
                  name="endFixed"
                  placeholder="Leave blank to return to origin"
                  value={endValue}
                  onChange={(event) => setEndValue(event.target.value)}
                  className="rounded-lg border border-yellow-400/20 bg-black/60 px-3 py-2 text-base text-yellow-50 outline-none ring-yellow-300/40 focus:ring-2"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm">
              Cities to visit (2–6, comma separated — city, airport, or IATA)
              <input
                name="cities"
                placeholder="Paris, Gatwick, BCN"
                required
                value={citiesValue}
                onChange={(event) => setCitiesValue(event.target.value)}
                className="rounded-lg border border-yellow-400/20 bg-black/60 px-3 py-2 text-base text-yellow-50 outline-none ring-yellow-300/40 focus:ring-2"
              />
            </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm">
              Window start
              <input
                name="windowStart"
                type="date"
                defaultValue={today.toISOString().slice(0, 10)}
                required
                className="rounded-lg border border-yellow-400/20 bg-black/60 px-3 py-2 text-base text-yellow-50 outline-none ring-yellow-300/40 focus:ring-2"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm">
              Window end
              <input
                name="windowEnd"
                type="date"
                defaultValue={inTenDays.toISOString().slice(0, 10)}
                required
                className="rounded-lg border border-yellow-400/20 bg-black/60 px-3 py-2 text-base text-yellow-50 outline-none ring-yellow-300/40 focus:ring-2"
              />
            </label>
          </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm">
                Min nights / city
                <input
                  name="nightsMin"
                  type="number"
                  min={1}
                  defaultValue={2}
                  className="rounded-lg border border-yellow-400/20 bg-black/60 px-3 py-2 text-base text-yellow-50 outline-none ring-yellow-300/40 focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Max nights / city
                <input
                  name="nightsMax"
                  type="number"
                  min={1}
                  defaultValue={4}
                  className="rounded-lg border border-yellow-400/20 bg-black/60 px-3 py-2 text-base text-yellow-50 outline-none ring-yellow-300/40 focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Max connections
                <select
                  name="maxConnections"
                  defaultValue={1}
                  className="rounded-lg border border-yellow-400/20 bg-black/60 px-3 py-2 text-base text-yellow-50 outline-none ring-yellow-300/40 focus:ring-2"
                >
                  <option value={0}>Direct only</option>
                  <option value={1}>Up to 1 stop</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                Include airlines (CSV)
                <input
                  name="includeAirlines"
                  placeholder="W6, U2"
                  className="rounded-lg border border-yellow-400/20 bg-black/60 px-3 py-2 text-base text-yellow-50 outline-none ring-yellow-300/40 focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Exclude airlines (CSV)
                <input
                  name="excludeAirlines"
                  placeholder="FR, U2"
                  className="rounded-lg border border-yellow-400/20 bg-black/60 px-3 py-2 text-base text-yellow-50 outline-none ring-yellow-300/40 focus:ring-2"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-yellow-400 px-5 py-2 text-sm font-semibold text-black shadow-lg shadow-yellow-500/20 transition hover:-translate-y-0.5 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Queuing..." : "Search flights"}
              </button>
              {jobId && (
                <button
                  type="button"
                  onClick={refresh}
                  disabled={loading}
                  className="rounded-full border border-yellow-400/40 px-5 py-2 text-sm font-semibold text-yellow-100 transition hover:-translate-y-0.5 hover:border-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Refreshing..." : "Refresh status"}
                </button>
              )}
              {jobId && (
                <span className="text-xs text-yellow-100/70">Job ID: {jobId}</span>
              )}
            </div>
            {error && <p className="text-sm text-yellow-200">{error}</p>}

            <div className="rounded-xl border border-yellow-400/20 bg-black/60 p-4 shadow-[0_15px_40px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-yellow-200">Search results</p>
                  <p className="text-sm text-yellow-100/70">Optimized options appear once a search finishes.</p>
                </div>
                <span className="rounded-full border border-yellow-400/20 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-yellow-100/80">
                  Live
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {job?.Result && job.Result.length > 0 ? (
                  job.Result.slice(0, 3).map((r) => (
                    <div
                      key={r.rank}
                      className="rounded-lg border border-yellow-400/20 bg-black/70 p-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.25em] text-yellow-100/50">
                            Option #{r.rank}
                          </p>
                          <p className="text-base font-semibold text-yellow-50">{r.cityOrder.join(" → ")}</p>
                          <p className="text-xs text-yellow-100/60">
                            Departures: {r.dates.map((d) => new Date(d).toISOString().slice(0, 10)).join(", ")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-yellow-200">
                            {(r.totalPriceCents / 100).toFixed(2)} {r.currency}
                          </p>
                          <button className="mt-2 w-full rounded-full bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-black shadow-md shadow-yellow-500/30 transition hover:-translate-y-0.5 hover:bg-yellow-300">
                            Book flight
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-yellow-100/60">
                    No results yet. Run “Search flights” and refresh status to populate options.
                  </p>
                )}
              </div>
            </div>
          </form>

          <div className="flex flex-col gap-4 rounded-xl border border-yellow-400/20 bg-black/50 p-4 shadow-inner">
            <ItineraryMap codes={[originValue, ...citiesValue.split(","), endValue]} />

            <div className="space-y-2 rounded-xl border border-yellow-400/15 bg-black/60 p-3">
              <div className="flex items-center justify-between text-xs text-yellow-100/80">
                <span className="uppercase tracking-[0.2em]">Progress</span>
                <span className="font-semibold text-yellow-200">
                  {job?.status ?? (jobId ? "Queued" : "Idle")}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-yellow-100/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-200 transition-[width]"
                  style={{
                    width: `${(() => {
                      const status = (job?.status ?? (jobId ? "QUEUED" : "IDLE")).toLowerCase();
                      if (status.includes("complete")) return 100;
                      if (status.includes("success")) return 95;
                      if (status.includes("run")) return 70;
                      if (status.includes("queue")) return 35;
                      if (status.includes("fail")) return 100;
                      return 45;
                    })()}%`,
                  }}
                />
              </div>
              <p className="text-xs text-yellow-100/70">
                {jobId
                  ? job?.status
                    ? "Optimization running—refresh to update."
                    : "Queued—refresh to poll the optimizer."
                  : "Create a job to start tracking progress."}
              </p>
            </div>

            {!job && !jobId && (
              <p className="text-sm text-yellow-100/70">Submit a request to view progress.</p>
            )}
            {jobId && !job && (
              <p className="text-sm text-yellow-100/70">
                Job queued. Click “Refresh status” to poll the optimizer.
              </p>
            )}
            {job && (
              <div className="space-y-3 text-sm text-yellow-100/80">
                <div className="flex items-center justify-between rounded-lg border border-yellow-400/20 bg-black/60 px-3 py-2">
                  <span>Status</span>
                  <span className="rounded-full bg-yellow-400/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-yellow-100">
                    {job.status}
                  </span>
                </div>
                {job.Result && job.Result.length > 0 && (
                  <div id="itineraries" className="space-y-2">
                    {job.Result.slice(0, 3).map((r) => (
                      <details
                        key={r.rank}
                        className="group rounded-lg border border-yellow-400/20 bg-black/60 px-3 py-3"
                      >
                        <summary className="cursor-pointer list-none">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-yellow-100/50">
                                Booking #{r.rank}
                              </p>
                              <p className="mt-1 text-base font-semibold text-yellow-50">
                                {r.cityOrder.join(" → ")}
                              </p>
                              <p className="text-xs text-yellow-100/50">
                                Departures:{" "}
                                {r.dates.map((d) => new Date(d).toISOString().slice(0, 10)).join(", ")}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-yellow-200">
                                {(r.totalPriceCents / 100).toFixed(2)} {r.currency}
                              </p>
                              <p className="text-xs text-yellow-100/60">View details</p>
                            </div>
                          </div>
                        </summary>
                        <div className="mt-4 space-y-4 border-t border-yellow-400/20 pt-4 text-sm text-yellow-100/80">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-yellow-100/50">
                              Route map
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              {r.cityOrder.slice(0, -1).map((city, index) => {
                                const next = r.cityOrder[index + 1];
                                const color = legPalette[index % legPalette.length];
                                return (
                                  <div key={`${city}-${next}-${index}`} className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-yellow-50">{city}</span>
                                    <span className="inline-flex items-center">
                                      <svg width="56" height="10" viewBox="0 0 56 10" fill="none">
                                        <line
                                          x1="0"
                                          y1="5"
                                          x2="48"
                                          y2="5"
                                          stroke={color}
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                        />
                                        <polyline
                                          points="46,1 54,5 46,9"
                                          fill="none"
                                          stroke={color}
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                        />
                                      </svg>
                                    </span>
                                    <span className="text-xs font-semibold text-yellow-50">{next}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs uppercase tracking-wide text-yellow-100/50">
                              Flight details
                            </p>
                            <div className="mt-3 space-y-3">
                              {r.legs && r.legs.length > 0 ? (
                                r.legs.map((leg, index) => {
                                  const segments = leg.result?.legs?.[0]?.segments ?? [];
                                  return (
                                    <div
                                      key={`${leg.o}-${leg.d}-${leg.date}-${index}`}
                                      className="rounded-lg border border-yellow-400/20 bg-black/70 p-3"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-yellow-50">
                                          {leg.o} → {leg.d}
                                        </p>
                                        <p className="text-xs text-yellow-100/60">{formatDateTime(leg.date)}</p>
                                      </div>
                                      {segments.length > 0 ? (
                                        <div className="mt-2 space-y-2">
                                          {segments.map((segment, segIndex) => (
                                            <div
                                              key={`${segment.departure?.iataCode ?? "seg"}-${segIndex}`}
                                              className="flex flex-col gap-1 text-xs text-yellow-100/70 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                              <span>
                                                {segment.departure?.iataCode ?? leg.o}{" "}
                                                {formatDateTime(segment.departure?.at)} →{" "}
                                                {segment.arrival?.iataCode ?? leg.d}{" "}
                                                {formatDateTime(segment.arrival?.at)}
                                              </span>
                                              <span className="text-yellow-100/60">
                                                {segment.carrierCode ?? "Carrier"}{" "}
                                                {segment.number ?? ""} {segment.duration ? `• ${segment.duration}` : ""}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="mt-2 text-xs text-yellow-100/60">
                                          Flight segment details are not available yet.
                                        </p>
                                      )}
                                      {leg.result?.minPriceCents != null && (
                                        <p className="mt-2 text-xs font-semibold text-yellow-200">
                                          Leg price: {(leg.result.minPriceCents / 100).toFixed(2)}{" "}
                                          {leg.result.currency ?? r.currency}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-xs text-yellow-100/60">
                                  Flight details will appear once pricing loads.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
