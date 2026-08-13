import { useEffect, useMemo, useState } from 'react';
import { branchByCode, branchByCountry, inferBranchFromBrowser, isBranchCode } from '../lib/config';
import type { BranchCode } from '../types';

type DetectionSource = 'saved' | 'edge' | 'browser';

export function useBranch() {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('aou-branch') : null;
  const initial = isBranchCode(saved) ? saved : inferBranchFromBrowser();
  const [code, setCodeState] = useState<BranchCode>(initial);
  const [source, setSource] = useState<DetectionSource>(isBranchCode(saved) ? 'saved' : 'browser');

  useEffect(() => {
    if (isBranchCode(localStorage.getItem('aou-branch'))) return;
    const controller = new AbortController();
    fetch('/api/location', { signal: controller.signal, cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) throw new Error('location_unavailable');
        return response.json() as Promise<{ countryCode?: string | null }>;
      })
      .then((payload) => {
        const detected = branchByCountry[String(payload.countryCode || '').toUpperCase()];
        if (detected) {
          setCodeState(detected);
          setSource('edge');
        }
      })
      .catch(() => setSource('browser'));
    return () => controller.abort();
  }, []);

  const setBranchCode = (next: BranchCode) => {
    setCodeState(next);
    setSource('saved');
    localStorage.setItem('aou-branch', next);
  };

  const branch = useMemo(() => branchByCode[code], [code]);
  return { branch, branchCode: code, setBranchCode, detectionSource: source };
}
