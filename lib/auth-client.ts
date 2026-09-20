"use client";
// Auth + sync client for the frontend.
//
// Strategy:
//   1. Anonymous users: everything stays in localStorage (iw.v1.*).
//   2. On login/register, we merge local state into the server state and vice versa
//      (union for arrays, most-recent for scalars — cheap-and-simple, not a true CRDT).
//   3. Once logged in, every localStorage write triggers a debounced PUT to /api/qb/auth/sync.
//   4. On page load while logged in, we GET /api/qb/auth/sync and merge into localStorage.
//
// Auth state (token, username, expiry) lives in iw.v1.auth — same store as
// everything else, so a "delete my data" wipes login state too.

import type { Store } from "./storage";
import { getStore, writeAll } from "./storage";

const AUTH_KEY = "auth" as const;
const SYNC_DEBOUNCE_MS = 2000;

export type AuthState = {
  token: string;
  username: string;
  userId: number;
  expiresAt: number; // ms since epoch
} | null;

export type ServerSyncPayload = {
  state: string;
  etag: string;
  updatedAt: number;
};

/** Read auth state from the store. Returns null if never signed in or expired. */
export function getAuth(): AuthState {
  if (typeof window === "undefined") return null;
  // Auth is stored alongside settings/bookmarks/etc so exportAll/wipe include it.
  const raw = window.localStorage.getItem("iw.v1.auth");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthState;
    if (parsed && parsed.expiresAt > Date.now()) return parsed;
    // Expired — clear it.
    window.localStorage.removeItem("iw.v1.auth");
    return null;
  } catch {
    return null;
  }
}

function setAuth(auth: AuthState): void {
  if (typeof window === "undefined") return;
  if (auth) {
    window.localStorage.setItem("iw.v1.auth", JSON.stringify(auth));
  } else {
    window.localStorage.removeItem("iw.v1.auth");
  }
  window.dispatchEvent(new Event("iw:auth"));
}

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };

async function apiCall<T>(
  path: string,
  method: "GET" | "POST" | "PUT",
  body?: unknown,
  headers?: Record<string, string>,
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api/qb${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(headers ?? {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await res.json()) as T & { error?: string };
    if (!res.ok) return { ok: false, error: json.error ?? `HTTP ${res.status}`, status: res.status };
    return { ok: true, data: json };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network error", status: 0 };
  }
}

// 90 days matches backend SESSION_TTL_MS.
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

type SessionResponse = { token: string; username: string; userId: number };

export async function register(username: string, passphrase: string): Promise<ApiResult<AuthState>> {
  const res = await apiCall<SessionResponse>("/auth/register", "POST", { username, passphrase });
  if (!res.ok) return res;
  const auth: AuthState = {
    token: res.data.token,
    username: res.data.username,
    userId: res.data.userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  setAuth(auth);
  // On register the server state is empty — push local state up immediately.
  await pushLocalToServer();
  return { ok: true, data: auth };
}

export async function login(username: string, passphrase: string): Promise<ApiResult<AuthState>> {
  const res = await apiCall<SessionResponse>("/auth/login", "POST", { username, passphrase });
  if (!res.ok) return res;
  const auth: AuthState = {
    token: res.data.token,
    username: res.data.username,
    userId: res.data.userId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  setAuth(auth);
  // On login, MERGE server + local into both. This keeps bookmarks made on
  // both devices while offline.
  await mergeFromServer();
  await pushLocalToServer();
  return { ok: true, data: auth };
}

export async function logout(): Promise<void> {
  const auth = getAuth();
  if (auth) {
    // Fire-and-forget — even if the server rejects, we drop local state.
    void apiCall("/auth/logout", "POST", undefined, { Authorization: `Bearer ${auth.token}` });
  }
  setAuth(null);
}

/** Pull the server state and merge into localStorage. */
async function mergeFromServer(): Promise<void> {
  const auth = getAuth();
  if (!auth) return;
  const res = await apiCall<ServerSyncPayload>("/auth/sync", "GET", undefined, {
    Authorization: `Bearer ${auth.token}`,
  });
  if (!res.ok) return;
  let serverState: Partial<Store>;
  try {
    serverState = JSON.parse(res.data.state) as Partial<Store>;
  } catch {
    return;
  }
  const local = getStore();
  const merged = mergeStates(local, serverState);
  writeAll(merged);
  currentEtag = res.data.etag;
}

/** Push the current localStorage state up as the source of truth. */
async function pushLocalToServer(): Promise<void> {
  const auth = getAuth();
  if (!auth) return;
  const local = getStore();
  // Strip auth from the sync payload — it's device-local.
  const stripped: Partial<Store> = { ...local };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (stripped as any).auth;
  const headers: Record<string, string> = { Authorization: `Bearer ${auth.token}` };
  if (currentEtag) headers["If-Match"] = currentEtag;
  const res = await apiCall<ServerSyncPayload>("/auth/sync", "PUT", { state: JSON.stringify(stripped) }, headers);
  if (res.ok) {
    currentEtag = res.data.etag;
  } else if (res.status === 412) {
    // Someone else wrote — pull fresh and retry once.
    await mergeFromServer();
    currentEtag = null; // trigger unconditional PUT next tick
  }
}

let currentEtag: string | null = null;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let installed = false;

/** Wire up automatic sync — call once from a top-level client component. */
export function installAutoSync(): () => void {
  if (typeof window === "undefined") return () => undefined;
  if (installed) return () => undefined;
  installed = true;

  const onStorageChange = () => {
    if (!getAuth()) return;
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      void pushLocalToServer();
    }, SYNC_DEBOUNCE_MS);
  };

  window.addEventListener("iw:storage", onStorageChange);

  // Kick off an initial merge from server if we're already logged in.
  if (getAuth()) {
    void mergeFromServer();
  }

  return () => {
    window.removeEventListener("iw:storage", onStorageChange);
    if (syncTimer) clearTimeout(syncTimer);
    installed = false;
  };
}

// -------- merge helpers --------

/**
 * Merge server state into local state. Simple rules:
 *   - Arrays (bookmarks, pinnedAyat, prayerStreak): set union, dedupe.
 *   - Objects (settings, notes, dhikrCounts, fastingLog, memorization): shallow
 *     merge with local winning for keys that exist locally, server filling gaps.
 *   - Missing top-level keys in either side: use whichever is present.
 *
 * NOT a true CRDT — good enough for a "sync my bookmarks" feature until
 * conflicts become a real problem.
 */
function mergeStates(local: Store, server: Partial<Store>): Store {
  const result: Store = { ...local };

  if (Array.isArray(server.bookmarks)) {
    result.bookmarks = Array.from(new Set([...(local.bookmarks ?? []), ...server.bookmarks]));
  }
  if (Array.isArray(server.pinnedAyat)) {
    result.pinnedAyat = Array.from(new Set([...(local.pinnedAyat ?? []), ...server.pinnedAyat])).slice(0, 5);
  }
  if (server.settings && typeof server.settings === "object") {
    result.settings = { ...server.settings, ...local.settings };
  }
  if (server.notes && typeof server.notes === "object") {
    result.notes = { ...server.notes, ...local.notes };
  }
  if (server.dhikrCounts && typeof server.dhikrCounts === "object") {
    result.dhikrCounts = { ...server.dhikrCounts, ...local.dhikrCounts };
  }
  if (server.fastingLog && typeof server.fastingLog === "object") {
    result.fastingLog = { ...server.fastingLog, ...local.fastingLog };
  }
  if (server.memorization && typeof server.memorization === "object") {
    result.memorization = { ...server.memorization, ...local.memorization };
  }

  return result;
}
