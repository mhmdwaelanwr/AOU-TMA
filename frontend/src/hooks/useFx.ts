import { useEffect, useRef, useState } from 'react';
import { FX_URL } from '../lib/config';
import type { CurrencyCode, FxResponse } from '../types';

const FX_CACHE_TTL = 5 * 60 * 1000;
const fxCache = new Map<string, { data: FxResponse; ts: number }>();

function baseData(): FxResponse {
  return {
    base: 'EGP',
    currency: 'EGP',
    rate: 1,
    source: 'base',
    cachedAt: new Date().toISOString(),
    status: 'base',
  };
}

function readCached(currency: CurrencyCode): FxResponse | null {
  const entry = fxCache.get(currency);
  if (entry && Date.now() - entry.ts < FX_CACHE_TTL) {
    return { ...entry.data, status: 'stale' };
  }
  try {
    const raw = localStorage.getItem(`aou-fx-${currency}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FxResponse;
    if (!Number.isFinite(parsed.rate) || parsed.rate <= 0) return null;
    return { ...parsed, status: 'stale' };
  } catch {
    return null;
  }
}

export function useFx(currency: CurrencyCode) {
  const [data, setData] = useState<FxResponse>(baseData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();

    if (currency === 'EGP') {
      setData(baseData());
      setLoading(false);
      setError(false);
      return;
    }

    const cached = readCached(currency);
    if (cached) setData(cached);
    setLoading(true);
    setError(false);

    const controller = new AbortController();
    abortRef.current = controller;

    fetch(`${FX_URL}/api/fx?currency=${currency}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('fx_failed');
        return response.json() as Promise<FxResponse>;
      })
      .then((payload) => {
        setData(payload);
        fxCache.set(currency, { data: payload, ts: Date.now() });
        try { localStorage.setItem(`aou-fx-${currency}`, JSON.stringify(payload)); } catch {}
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        const fallback = readCached(currency);
        if (fallback) setData(fallback);
        else setError(true);
      })
      .finally(() => setLoading(false));

    return () => { abortRef.current?.abort(); };
  }, [currency]);

  return { ...data, loading, error };
}
