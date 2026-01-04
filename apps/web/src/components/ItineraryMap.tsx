'use client';

import { useMemo } from "react";
import { geoGraticule10, geoMercator, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import worldAtlas from "world-atlas/countries-110m.json";
import airports from "airports";

type AirportRecord = {
  iata?: string;
  lat: number;
  lon: number;
  name?: string;
  city?: string;
  country?: string;
};

type Stop = {
  code: string;
  name?: string;
  coordinates: [number, number];
};

const colors = ["#facc15", "#f59e0b", "#22c55e", "#06b6d4", "#8b5cf6", "#f472b6"];

const normalizeCity = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z]/gi, "")
    .toLowerCase();

const airportLookup = new Map(
  (airports as AirportRecord[])
    .filter((airport) => airport.iata)
    .map((airport) => [airport.iata!.toUpperCase(), airport])
);

const cityLookup = new Map(
  (airports as AirportRecord[])
    .filter((airport) => airport.iata && (airport.city || airport.name))
    .flatMap((airport) => {
      const entries: Array<[string, AirportRecord]> = [];
      const city = airport.city;
      const name = airport.name;
      if (city) {
        const cityKey = normalizeCity(city);
        if (cityKey) entries.push([cityKey, airport]);
      }
      if (name) {
        const nameKey = normalizeCity(name);
        if (nameKey) entries.push([nameKey, airport]);
      }
      return entries;
    })
);

const manualCityToIata: Record<string, string> = {
  paris: "CDG",
  rome: "FCO",
  sofia: "SOF",
  berlin: "BER",
  lisbon: "LIS",
  madrid: "MAD",
  vienna: "VIE",
  athens: "ATH",
  amsterdam: "AMS",
  copenhagen: "CPH",
  helsinki: "HEL",
  warsaw: "WAW",
  prague: "PRG",
  budapest: "BUD",
  bucharest: "OTP",
  dublin: "DUB",
  brussels: "BRU",
  oslo: "OSL",
  stockholm: "ARN",
  reykjavik: "KEF",
  zurich: "ZRH",
  munich: "MUC",
  milan: "MXP",
  barcelona: "BCN",
  frankfurt: "FRA",
  london: "LHR",
  heathrow: "LHR",
  gatwick: "LGW",
  stansted: "STN",
  luton: "LTN",
  "london city": "LCY",
};

function resolveAirport(input: string): AirportRecord | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (airportLookup.has(upper)) {
    return airportLookup.get(upper)!;
  }

  const normalized = normalizeCity(trimmed);

  const manual = manualCityToIata[normalized];
  if (manual && airportLookup.has(manual)) {
    return airportLookup.get(manual)!;
  }

  const cityMatch = cityLookup.get(normalized);
  if (cityMatch) return cityMatch;

  // Fuzzy fallback: try prefix/contains matches on normalized keys
  for (const [key, airport] of cityLookup.entries()) {
    if (key.startsWith(normalized) || normalized.startsWith(key)) {
      return airport;
    }
  }
  return null;
}

type ItineraryMapProps = {
  codes: string[];
};

export default function ItineraryMap({ codes }: ItineraryMapProps) {
  const stops = useMemo<Stop[]>(() => {
    const seen = new Set<string>();
    return codes
      .map((value) => resolveAirport(value))
      .filter((airport): airport is AirportRecord => Boolean(airport))
      .map((airport) => {
        const code = airport.iata!.toUpperCase();
        if (seen.has(code)) return null;
        seen.add(code);
        return {
          code,
          name: airport.city || airport.name,
          coordinates: [airport.lon, airport.lat],
        } as Stop;
      })
      .filter((stop): stop is Stop => Boolean(stop));
  }, [codes]);

  const width = 520;
  const height = 320;
  const padding = 24;

  const projection = useMemo(() => {
    const projectionInstance = geoMercator();
    if (stops.length > 0) {
      const points = {
        type: "FeatureCollection",
        features: stops.map((stop) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: stop.coordinates },
          properties: {},
        })),
      } as unknown;

      projectionInstance.fitExtent(
        [
          [padding, padding],
          [width - padding, height - padding],
        ],
        points
      );
    } else {
      projectionInstance.scale(90).translate([width / 2, height / 2]);
    }
    return projectionInstance;
  }, [stops]);

  const path = useMemo(() => geoPath(projection), [projection]);
  const land = useMemo(() => {
    const atlas = worldAtlas as unknown as {
      objects: { countries: unknown };
    };
    return feature(atlas, atlas.objects.countries) as unknown;
  }, []);

  const segments = useMemo(
    () =>
      stops.slice(0, -1).map((stop, index) => ({
        from: stop,
        to: stops[index + 1],
        color: colors[index % colors.length],
        id: `segment-${index}`,
      })),
    [stops]
  );

  return (
    <div className="rounded-2xl border border-yellow-400/20 bg-black/60 p-4 shadow-[0_25px_60px_rgba(0,0,0,0.55)] ring-1 ring-yellow-400/15 backdrop-blur">
      <h2 className="text-lg font-semibold text-yellow-50">Trip map preview</h2>
      <p className="mt-1 text-xs text-yellow-100/70">
        Pins appear as soon as you enter city names, airport names, or IATA codes. The map zooms to fit your route.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[320px] w-full rounded-xl border border-yellow-400/15 bg-black/80"
        >
          <defs>
            {segments.map((segment, index) => (
              <marker
                key={segment.id}
                id={`arrow-${index}`}
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L9,3 L0,6 Z" fill={segment.color} />
              </marker>
            ))}
          </defs>
          <path
            d={path(geoGraticule10()) || undefined}
            fill="none"
            stroke="rgba(250, 204, 21, 0.15)"
            strokeWidth="0.6"
          />
          <path
            d={path(land) || undefined}
            fill="rgba(12, 12, 12, 0.9)"
            stroke="rgba(250, 204, 21, 0.25)"
            strokeWidth="0.6"
          />
          {segments.map((segment, index) => {
            const line = {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: [segment.from.coordinates, segment.to.coordinates],
              },
              properties: {},
            } as unknown;

            return (
              <path
                key={segment.id}
                d={path(line) || undefined}
                fill="none"
                stroke={segment.color}
                strokeWidth="2"
                markerEnd={`url(#arrow-${index})`}
              />
            );
          })}
          {stops.map((stop, index) => {
            const [x, y] = projection(stop.coordinates) ?? [0, 0];
            return (
              <g key={stop.code}>
                <circle
                  cx={x}
                  cy={y}
                  r={5}
                  fill={colors[index % colors.length]}
                  stroke="#0a0a0a"
                  strokeWidth="1"
                />
                <text x={x + 8} y={y + 4} fontSize="10" fill="#fef9c3" className="font-semibold">
                  {stop.code}
                </text>
              </g>
            );
          })}
        </svg>
        {stops.length === 0 ? (
          <p className="text-xs text-yellow-100/70">Enter destinations above to see them plotted on the map.</p>
        ) : (
          <div className="grid gap-2 text-xs text-yellow-100/80 sm:grid-cols-2">
            {stops.map((stop, index) => (
              <div key={stop.code} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="font-semibold text-yellow-50">{stop.code}</span>
                {stop.name && <span className="text-yellow-100/70">{stop.name}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
