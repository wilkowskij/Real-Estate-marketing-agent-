"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "marquee_recent_listings";
const MAX_ENTRIES = 5;

export interface RecentListing {
  address: string;
  town:    string;
  price:   string;
  beds:    string;
  baths:   string;
  sqft:    string;
}

function read(): RecentListing[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(entries: RecentListing[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* quota exceeded — silently skip */
  }
}

/**
 * Manages a localStorage-backed list of recently used listing addresses.
 * Calling `save(listing)` prepends it (deduped by address) up to MAX_ENTRIES.
 */
export function useRecentListings() {
  const [recents, setRecents] = useState<RecentListing[]>([]);

  useEffect(() => {
    setRecents(read());
  }, []);

  const save = useCallback((listing: RecentListing) => {
    if (!listing.address.trim()) return;
    const normalized = listing.address.trim().toLowerCase();
    const next = [
      listing,
      ...read().filter((r) => r.address.trim().toLowerCase() !== normalized),
    ].slice(0, MAX_ENTRIES);
    write(next);
    setRecents(next);
  }, []);

  return { recents, save };
}
