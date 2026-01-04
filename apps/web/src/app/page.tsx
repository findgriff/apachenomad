'use client';

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type JobResult = {
  id: string;
  status: string;
  Result?: Array<{
    rank: number;
    cityOrder: string[];
    dates: string[];
    totalPriceCents: number;
    currency: string;
  }>;
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Home() {
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<JobResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      origin: String(formData.get("origin") || "").toUpperCase(),
      endFixed: (formData.get("endFixed") as string) || undefined,
      cities: String(formData.get("cities") || "")
        .split(",")
        .map((s) => s.trim().toUpperCase())
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
    } catch (err: any) {
      setError(err?.message || "Failed to create job");
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
    } catch (err: any) {
      setError(err?.message || "Failed to fetch job");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">Apache Nomad</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Multi-stop trip planner</h1>
          <p className="text-sm text-slate-300 sm:text-base">
            Plan a 3–6 city loop with Amadeus pricing. Provide your cities, date window, and airline
            preferences; we will queue an optimization job and return the best itinerary.
          </p>
          <div className="flex flex-wrap gap-3 pt-2 text-sm">
            <Link
              href="/bookings"
              className="inline-flex items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 font-medium text-emerald-100 transition hover:border-emerald-300/80 hover:bg-emerald-400/20"
            >
              View upcoming bookings
            </Link>
          </div>
        </header>

        <section className="grid gap-6 rounded-2xl bg-slate-900/60 p-6 shadow-lg ring-1 ring-white/10 backdrop-blur sm:grid-cols-[1.2fr_1fr] sm:gap-10">
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                Origin (IATA)
                <input
                  name="origin"
                  placeholder="SOF"
                  required
                  className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-base text-white outline-none ring-emerald-400/30 focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                End (optional)
                <input
                  name="endFixed"
                  placeholder="Leave blank to return to origin"
                  className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-base text-white outline-none ring-emerald-400/30 focus:ring-2"
                />
              </label>
            </div>

            <label className="flex flex-col gap-2 text-sm">
              Cities to visit (3–6, comma separated)
              <input
                name="cities"
                placeholder="BCN, ROM, PAR"
                required
                className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-base text-white outline-none ring-emerald-400/30 focus:ring-2"
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
                  className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-base text-white outline-none ring-emerald-400/30 focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Window end
                <input
                  name="windowEnd"
                  type="date"
                  defaultValue={inTenDays.toISOString().slice(0, 10)}
                  required
                  className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-base text-white outline-none ring-emerald-400/30 focus:ring-2"
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
                  className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-base text-white outline-none ring-emerald-400/30 focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Max nights / city
                <input
                  name="nightsMax"
                  type="number"
                  min={1}
                  defaultValue={4}
                  className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-base text-white outline-none ring-emerald-400/30 focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Max connections
                <select
                  name="maxConnections"
                  defaultValue={1}
                  className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-base text-white outline-none ring-emerald-400/30 focus:ring-2"
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
                  className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-base text-white outline-none ring-emerald-400/30 focus:ring-2"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                Exclude airlines (CSV)
                <input
                  name="excludeAirlines"
                  placeholder="FR, U2"
                  className="rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-base text-white outline-none ring-emerald-400/30 focus:ring-2"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-slate-900 shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Queuing..." : "Create job"}
              </button>
              {jobId && (
                <button
                  type="button"
                  onClick={refresh}
                  disabled={loading}
                  className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Refreshing..." : "Refresh status"}
                </button>
              )}
              {jobId && (
                <span className="text-xs text-slate-300">Job ID: {jobId}</span>
              )}
            </div>
            {error && <p className="text-sm text-rose-200">{error}</p>}
          </form>

          <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-slate-900/40 p-4 shadow-inner">
            <h2 className="text-lg font-semibold text-white">Status</h2>
            {!job && !jobId && (
              <p className="text-sm text-slate-300">Submit a request to view progress.</p>
            )}
            {jobId && !job && (
              <p className="text-sm text-slate-300">
                Job queued. Click “Refresh status” to poll the optimizer.
              </p>
            )}
            {job && (
              <div className="space-y-3 text-sm text-slate-200">
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-slate-900 px-3 py-2">
                  <span>Status</span>
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-100">
                    {job.status}
                  </span>
                </div>
                {job.Result && job.Result.length > 0 && (
                  <div className="space-y-2">
                    {job.Result.slice(0, 3).map((r) => (
                      <div key={r.rank} className="rounded-lg border border-white/10 bg-slate-900 px-3 py-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">
                          Itinerary #{r.rank}
                        </p>
                        <p className="mt-1 text-base font-semibold text-white">
                          {r.cityOrder.join(" → ")}
                        </p>
                        <p className="text-xs text-slate-400">
                          Departures: {r.dates.map((d) => new Date(d).toISOString().slice(0, 10)).join(", ")}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-emerald-200">
                          {(r.totalPriceCents / 100).toFixed(2)} {r.currency}
                        </p>
                      </div>
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
