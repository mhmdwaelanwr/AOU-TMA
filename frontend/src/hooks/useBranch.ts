import { useEffect, useState } from 'react';
import { branches, detectBranchByTimezone } from '../lib/config';
import type { Branch, BranchId } from '../types';

type DetectionSource = 'saved' | 'browser';

export function useBranch() {
  const saved = typeof window !== 'undefined' ? localStorage.getItem('aou-branch') as BranchId | null : null;
  const initial = saved || detectBranchByTimezone();
  const [branchId, setBranchIdState] = useState<BranchId>(initial);
  const [source, setSource] = useState<DetectionSource>(saved ? 'saved' : 'browser');

  useEffect(() => {
    if (saved) return;
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const match = branches.find((b) => tz.includes(b.timezone.split('/')[0]));
      if (match) {
        setBranchIdState(match.id);
        setSource('browser');
      }
    } catch {}
  }, []);

  const setBranchId = (next: BranchId) => {
    setBranchIdState(next);
    setSource('saved');
    localStorage.setItem('aou-branch', next);
  };

  const branch: Branch = branches.find((b) => b.id === branchId) || branches[0];
  return { branch, branchId, setBranchId, detectionSource: source };
}
