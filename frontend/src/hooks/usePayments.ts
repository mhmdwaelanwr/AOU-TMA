import { useEffect, useState } from 'react';
import { API_URL } from '../lib/config';
import type { PaymentMethod, PaymentMethodsResponse } from '../types';

export function usePayments() {
  const [items, setItems] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`${API_URL}/api/payment-methods`)
      .then(async (response) => {
        if (!response.ok) throw new Error('payments_failed');
        return response.json() as Promise<PaymentMethodsResponse>;
      })
      .then((data) => { if (active) setItems(data.items); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { items, loading };
}
