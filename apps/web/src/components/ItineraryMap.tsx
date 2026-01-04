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

const colors = [
  "#34d399",
  "#60a5fa",
  "#f472b6",
  "#fbbf24",
  "#a78bfa",
  "#22d3ee",
];

const airportLookup = new Map(
  (airports as AirportRecord[])
    .filter((airport) => airport.iata)
    .map((airport) => [airport.iata!.toUpperCase(), airport])
);

type ItineraryMapProps = {
  codes: string[];
};

export default function ItineraryMap({ codes }: ItineraryMapProps) {
  const stops = useMemo<Stop[]>(() => {
    const uniqueCodes = Array.from(new Set(codes.map((code) => code.trim().toUpperCase()).filter(Boolean)));
    return uniqueCodes
      .map((code) => {
        const airport = airportLookup.get(code);
        if (!airport) return null;
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
    <div className="rounded-xl border border-white/10 bg-slate-900/40 p-4 shadow-inner">
      <h2 className="text-lg font-semibold text-white">Trip map preview</h2>
      <p className="mt-1 text-xs text-slate-400">
        Pins appear as soon as you enter valid IATA codes. The map zooms to fit your route.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[320px] w-full rounded-lg border border-white/10 bg-slate-950"
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
            stroke="rgba(148, 163, 184, 0.2)"
            strokeWidth="0.6"
          />
          <path
            d={path(land) || undefined}
            fill="rgba(30, 41, 59, 0.9)"
            stroke="rgba(148, 163, 184, 0.35)"
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
                <circle cx={x} cy={y} r={5} fill={colors[index % colors.length]} stroke="#0f172a" strokeWidth="1" />
                <text
                  x={x + 8}
                  y={y + 4}
                  fontSize="10"
                  fill="#e2e8f0"
                  className="font-semibold"
                >
                  {stop.code}
                </text>
              </g>
            );
          })}
        </svg>
        {stops.length === 0 ? (
          <p className="text-xs text-slate-400">Enter destinations above to see them plotted on the map.</p>
        ) : (
          <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
            {stops.map((stop, index) => (
              <div key={stop.code} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className="font-semibold text-slate-100">{stop.code}</span>
                {stop.name && <span className="text-slate-400">{stop.name}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
