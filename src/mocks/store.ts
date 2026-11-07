import { useSyncExternalStore } from "react";
import { createSeed } from "./seed";
import type { DemoDb } from "./types";

// The demo's "database": one JSON document in this browser's localStorage,
// plus the signed-in user's id. There is no server. Each visitor gets their
// own copy of the mock data, and "Reset demo data" restores the seed.

const DB_KEY = "vizinho-demo-db";
const SESSION_KEY = "vizinho-session";

export type DemoState = { db: DemoDb; userId: string | null };

let state: DemoState | null = null;
const listeners = new Set<() => void>();

// Storage can be unavailable (private mode, blocked site data): the demo then
// still works for the current page, it just doesn't survive a reload.
function readStorage(): DemoState {
  let db: DemoDb | null = null;
  let userId: string | null = null;
  try {
    const raw = localStorage.getItem(DB_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<DemoDb>) : null;
    if (parsed?.version === 1) db = parsed as DemoDb;
    userId = localStorage.getItem(SESSION_KEY);
  } catch {
    // fall through to a fresh seed
  }
  db ??= createSeed();
  if (userId && !db.users.some((user) => user.id === userId)) userId = null;
  return { db, userId };
}

function writeStorage({ db, userId }: DemoState) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    if (userId) localStorage.setItem(SESSION_KEY, userId);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // see readStorage
  }
}

export function getDemoState(): DemoState {
  state ??= readStorage();
  return state;
}

function setDemoState(next: DemoState) {
  state = next;
  writeStorage(next);
  listeners.forEach((listener) => listener());
}

// Another tab changed the data or signed in/out: pick it up here too.
function onStorage(event: StorageEvent) {
  if (event.key === null || event.key === DB_KEY || event.key === SESSION_KEY) {
    state = readStorage();
    listeners.forEach((listener) => listener());
  }
}

export function subscribe(listener: () => void) {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

/**
 * Runs a change like a database transaction: the recipe edits a copy, and the
 * copy is saved only if the recipe finishes. If it throws (a rule was broken),
 * nothing changes and the error reaches the caller.
 */
export function transact<T>(recipe: (draft: DemoDb) => T): T {
  const current = getDemoState();
  const draft = structuredClone(current.db);
  const result = recipe(draft);
  setDemoState({ ...current, db: draft });
  return result;
}

export function setSessionUserId(userId: string | null) {
  setDemoState({ ...getDemoState(), userId });
}

/** Restores the seed. Keeps the session if that user still exists. */
export function resetDemoData() {
  const db = createSeed();
  const { userId } = getDemoState();
  setDemoState({ db, userId: db.users.some((u) => u.id === userId) ? userId : null });
}

/**
 * The demo state for React components, or null while rendering on the server
 * and during hydration (the server has no localStorage). Components show a
 * loading state for null, so server and first client render always match.
 */
export function useDemoState(): DemoState | null {
  return useSyncExternalStore(subscribe, getDemoState, () => null);
}
