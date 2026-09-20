// Iqamah API client. Wraps the backend endpoints (proxied via /api/qb/*).
// Server-side fetch is fine — the data is public and small (~a few KB list).

export type Iqamah = {
  fajr: string | null;
  dhuhr: string | null;
  asr: string | null;
  maghrib: string | null;
  isha: string | null;
  jumuah: string | null;
};

export type Masjid = {
  slug: string;
  name: string;
  city: string;
  country: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  iqamah: Iqamah;
  notes: string | null;
  updatedAt: number;
};

const BASE = process.env.BACKEND_URL ?? "http://localhost:8080";

/** Try backend; return null on failure so the UI can render an empty state without crashing. */
async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      // Revalidate every 5 minutes on the server. Masjid data updates slowly.
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function listMasjids(): Promise<Masjid[]> {
  return (await safeFetch<Masjid[]>("/api/masjids")) ?? [];
}

export async function getMasjid(slug: string): Promise<Masjid | null> {
  return safeFetch<Masjid>(`/api/masjids/${encodeURIComponent(slug)}`);
}

export async function listMasjidsByCountry(country: string): Promise<Masjid[]> {
  return (
    (await safeFetch<Masjid[]>(`/api/masjids/by-country/${encodeURIComponent(country)}`)) ?? []
  );
}
