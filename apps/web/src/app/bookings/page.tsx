"use client";

import { capitalBookings } from "../../data/mockCapitals";

const sortedBookings = [...capitalBookings].sort(
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
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-400/20 via-black to-black text-yellow-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        <header className="flex flex-col gap-3">
          <p className="text-sm uppercase tracking-[0.2em] text-yellow-200">Upcoming bookings</p>
          <h1 className="text-3xl font-semibold sm:text-4xl">Your next trips at a glance</h1>
          <p className="text-sm text-yellow-100/70 sm:text-base">
            Each booking shows the confirmed route, total distance, and overall cost. Trips are
            ordered by the date of the next departure.
          </p>
        </header>

        <section className="grid gap-4">
          {sortedBookings.map((booking) => (
            <article
              key={booking.id}
              className="rounded-2xl border border-yellow-400/20 bg-black/60 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.55)] ring-1 ring-yellow-400/20 backdrop-blur"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-yellow-100/50">
                    Booking {booking.id}
                  </p>
                  <h2 className="text-xl font-semibold text-yellow-50">
                    {booking.route.join(" → ")}
                  </h2>
                </div>
                <div className="rounded-full border border-yellow-400/40 bg-yellow-400/10 px-4 py-2 text-sm font-medium text-yellow-50">
                  Next trip: {dateFormatter.format(new Date(booking.nextTripDate))}
                </div>
              </div>

              <div className="mt-6 grid gap-3 text-sm text-yellow-100/80 sm:grid-cols-3">
                <div className="rounded-xl border border-yellow-400/20 bg-black/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-yellow-100/50">Date booked</p>
                  <p className="mt-2 text-lg font-semibold text-yellow-50">
                    {dateFormatter.format(new Date(booking.bookingDate))}
                  </p>
                </div>
                <div className="rounded-xl border border-yellow-400/20 bg-black/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-yellow-100/50">Total distance</p>
                  <p className="mt-2 text-lg font-semibold text-yellow-50">
                    {booking.totalDistanceKm.toLocaleString("en-GB")} km
                  </p>
                </div>
                <div className="rounded-xl border border-yellow-400/20 bg-black/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-yellow-100/50">Total cost</p>
                  <p className="mt-2 text-lg font-semibold text-yellow-50">
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
