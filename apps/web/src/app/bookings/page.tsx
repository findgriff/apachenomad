"use client";

const bookings = [
  {
    id: "bk-4931",
    route: ["SOF", "FCO", "BCN", "LIS", "SOF"],
    bookingDate: "2024-08-12",
    nextTripDate: "2024-11-03",
    totalCostCents: 128900,
    currency: "EUR",
    totalDistanceKm: 4890,
  },
  {
    id: "bk-5104",
    route: ["SOF", "BER", "CPH", "AMS", "SOF"],
    bookingDate: "2024-09-02",
    nextTripDate: "2024-10-12",
    totalCostCents: 104400,
    currency: "EUR",
    totalDistanceKm: 3650,
  },
  {
    id: "bk-5517",
    route: ["SOF", "ATH", "IST", "SOF"],
    bookingDate: "2024-07-28",
    nextTripDate: "2024-12-08",
    totalCostCents: 89900,
    currency: "EUR",
    totalDistanceKm: 2320,
  },
];

const sortedBookings = [...bookings].sort(
  (a, b) => new Date(a.nextTripDate).getTime() - new Date(b.nextTripDate).getTime(),
);

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const currencyFormatter = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default function BookingsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-emerald-200">Upcoming bookings</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Your next trips at a glance</h1>
          <p className="text-sm text-slate-300 sm:text-base">
            Each booking shows the confirmed route, total distance, and overall cost. Trips are
            ordered by the date of the next departure.
          </p>
        </header>

        <section className="grid gap-4">
          {sortedBookings.map((booking) => (
            <article
              key={booking.id}
              className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-lg ring-1 ring-white/10 backdrop-blur"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Booking {booking.id}
                  </p>
                  <h2 className="text-xl font-semibold text-emerald-100">
                    {booking.route.join(" → ")}
                  </h2>
                </div>
                <div className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-100">
                  Next trip: {dateFormatter.format(new Date(booking.nextTripDate))}
                </div>
              </div>

              <div className="mt-6 grid gap-3 text-sm text-slate-200 sm:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Date booked</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {dateFormatter.format(new Date(booking.bookingDate))}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total distance</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {booking.totalDistanceKm.toLocaleString("en-GB")} km
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Total cost</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {currencyFormatter.format(booking.totalCostCents / 100)}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
