import { request } from "undici";

export type SearchLegInput = {
  origin: string;
  dest: string;
  date: string; // YYYY-MM-DD
  currency?: string;
  includeAirlines?: string[];
  excludeAirlines?: string[];
  maxConnections?: 0 | 1;
};

export type SearchLegResult = {
  offerId: string | null;
  minPriceCents: number | null;
  currency: string | null;
  legs: Array<Record<string, unknown>>;
  fetchedAt: string;
};

export type LocationLookupResult = {
  iataCode: string;
  name: string;
  cityName?: string;
  countryCode?: string;
  subType?: string;
};

export interface PricingConfirmInput {
  offerIds: string[];
  currency?: string;
}

export interface PricingConfirmResult {
  pricedTotalCents: number;
  currency: string;
  deltaPct: number;
  legs: unknown;
}

type TokenCache = { accessToken: string; exp: number } | null;

const baseUrl = process.env.AMADEUS_BASE_URL ?? "https://test.api.amadeus.com";
let tokenCache: TokenCache = null;

async function getToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (tokenCache && tokenCache.exp - now > 60) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.AMADEUS_API_KEY ?? "",
    client_secret: process.env.AMADEUS_API_SECRET ?? "",
  });

  const res = await request(`${baseUrl}/v1/security/oauth2/token`, {
    method: "POST",
    body: body.toString(),
    headers: { "content-type": "application/x-www-form-urlencoded" },
  });

  if (res.statusCode >= 400) {
    throw new Error(`Amadeus auth failed with status ${res.statusCode}`);
  }

  const json: any = await res.body.json();
  tokenCache = {
    accessToken: json.access_token,
    exp: now + Number(json.expires_in ?? 0),
  };

  return tokenCache.accessToken;
}

function resolveCarrierFilters(input: SearchLegInput) {
  if (input.includeAirlines && input.includeAirlines.length) {
    return {
      includedCarrierCodes: input.includeAirlines,
      excludedCarrierCodes: undefined,
    };
  }
  return {
    includedCarrierCodes: undefined,
    excludedCarrierCodes: input.excludeAirlines && input.excludeAirlines.length ? input.excludeAirlines : undefined,
  };
}

export async function searchLeg(input: SearchLegInput): Promise<SearchLegResult> {
  const token = await getToken();
  const carriers = resolveCarrierFilters(input);

  const payload = {
    originDestinations: [
      {
        id: "1",
        originLocationCode: input.origin,
        destinationLocationCode: input.dest,
        departureDateTimeRange: { date: input.date },
      },
    ],
    travelers: [{ id: "1", travelerType: "ADULT", fareOptions: ["STANDARD"] }],
    sources: ["GDS"],
    searchCriteria: {
      flightFilters: {
        carrierRestrictions: carriers,
        connectionRestriction: { maxNumberOfConnections: input.maxConnections ?? 1 },
        cabinRestrictions: [{ cabin: "ECONOMY", originDestinationIds: ["1"] }],
      },
      pricingOptions: { includedCheckedBagsOnly: false },
      additionalInformation: { chargeableCheckedBags: false, brandedFares: false },
    },
  };

  const res = await request(`${baseUrl}/v2/shopping/flight-offers`, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });

  if (res.statusCode === 401) {
    tokenCache = null;
  }
  if (res.statusCode >= 400) {
    const body = await res.body.text();
    throw new Error(`Amadeus search failed (${res.statusCode}): ${body}`);
  }

  const json: any = await res.body.json();
  const offers = Array.isArray(json?.data) ? json.data : [];
  if (!offers.length) {
    return {
      offerId: null,
      minPriceCents: null,
      currency: input.currency ?? "EUR",
      legs: [],
      fetchedAt: new Date().toISOString(),
    };
  }

  offers.sort((a: any, b: any) => Number(a?.price?.total ?? Infinity) - Number(b?.price?.total ?? Infinity));
  const cheapest = offers[0];

  return {
    offerId: cheapest.id,
    minPriceCents: Math.round(Number(cheapest.price.total) * 100),
    currency: cheapest.price.currency ?? input.currency ?? "EUR",
    legs: cheapest.itineraries ?? [],
    fetchedAt: new Date().toISOString(),
  };
}

export async function priceOffers(offers: any[]): Promise<any> {
  const token = await getToken();
  const res = await request(`${baseUrl}/v1/shopping/flight-offers/pricing`, {
    method: "POST",
    body: JSON.stringify({
      data: { type: "flight-offers-pricing", flightOffers: offers },
    }),
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
  });

  if (res.statusCode >= 400) {
    const body = await res.body.text();
    throw new Error(`Amadeus pricing failed (${res.statusCode}): ${body}`);
  }

  return res.body.json();
}

export async function lookupCityCode(keyword: string): Promise<LocationLookupResult | null> {
  const token = await getToken();
  const url = new URL(`${baseUrl}/v1/reference-data/locations`);
  url.searchParams.set("subType", "AIRPORT,CITY");
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("page[limit]", "1");

  const res = await request(url.toString(), {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (res.statusCode === 401) {
    tokenCache = null;
  }
  if (res.statusCode >= 400) {
    const body = await res.body.text();
    throw new Error(`Amadeus location lookup failed (${res.statusCode}): ${body}`);
  }

  const json: any = await res.body.json();
  const [entry] = Array.isArray(json?.data) ? json.data : [];
  if (!entry?.iataCode) {
    return null;
  }

  return {
    iataCode: entry.iataCode,
    name: entry.name ?? keyword,
    cityName: entry.address?.cityName,
    countryCode: entry.address?.countryCode,
    subType: entry.subType,
  };
}

export function resetTokenCache() {
  tokenCache = null;
}
