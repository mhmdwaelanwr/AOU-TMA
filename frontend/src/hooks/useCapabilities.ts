import { useEffect, useState } from 'react';
import { API_URL } from '../lib/config';

type Capabilities = {
  ordersEnabled: boolean;
  accountsEnabled: boolean;
  loading: boolean;
};

const disabled: Capabilities = {
  ordersEnabled: false,
  accountsEnabled: false,
  loading: false,
};

/**
 * Backend is the source of truth for stateful availability.
 * If unreachable or malformed, fail closed so the public catalog stays safe.
 */
export function useCapabilities(): Capabilities {
  const [capabilities, setCapabilities] = useState<Capabilities>({
    ...disabled,
    loading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/api/capabilities`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('capabilities_unavailable');
        return response.json();
      })
      .then((payload) => {
        if (controller.signal.aborted) return;
        if (payload?.ok !== true || !payload?.features || typeof payload.mode !== 'string') {
          throw new Error('invalid_capabilities');
        }
        const writable = payload.mode === 'full_local';
        setCapabilities({
          ordersEnabled: writable && payload.features.orders === true,
          accountsEnabled: writable && payload.features.accounts === true,
          loading: false,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setCapabilities(disabled);
      });
    return () => controller.abort();
  }, []);

  return capabilities;
}
