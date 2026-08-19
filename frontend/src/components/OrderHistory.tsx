import { memo, useEffect, useState } from 'react';
import { Package, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { API_URL } from '../lib/config';
import { useAuth } from '../lib/auth';

type Props = { lang: 'ar' | 'en' };

type Order = {
  id: string;
  course_code: string;
  course_title: string;
  course_faculty: string;
  currency: string;
  price_egp: number;
  status: string;
  created_at: string;
  payment_method: string;
  branch_code: string;
  referral_discount_pct: number | null;
};

export const OrderHistory = memo(function OrderHistory({ lang }: Props) {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/api/user/orders`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.ok) setOrders(data.orders); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (!token) return null;

  const statusIcon = (s: string) => {
    if (s === 'received') return <Clock size={14} />;
    if (s === 'completed') return <CheckCircle2 size={14} />;
    if (s === 'cancelled') return <XCircle size={14} />;
    return <Package size={14} />;
  };

  const statusColor = (s: string) => {
    if (s === 'received') return 'order-status-pending';
    if (s === 'completed') return 'order-status-completed';
    if (s === 'cancelled') return 'order-status-cancelled';
    return '';
  };

  const statusLabel = (s: string) => {
    const map: Record<string, { ar: string; en: string }> = {
      received: { ar: 'تم الاستلام', en: 'Received' },
      processing: { ar: 'قيد المعالجة', en: 'Processing' },
      completed: { ar: 'مكتمل', en: 'Completed' },
      cancelled: { ar: 'ملغي', en: 'Cancelled' },
    };
    return map[s]?.[lang] || s;
  };

  return (
    <section className="order-history-section" id="order-history">
      <div className="order-history-container">
        <p className="section-eyebrow">{lang === 'ar' ? 'سجل الطلبات' : 'ORDER HISTORY'}</p>
        <h2 className="order-history-title">{lang === 'ar' ? 'طلباتي' : 'My Orders'}</h2>
        <p className="order-history-subtitle">{lang === 'ar' ? 'كل الطلبات اللي عملتها على حسابك' : 'All orders placed with your account'}</p>

        {loading ? (
          <div className="order-history-loading">
            <Loader2 size={24} className="spin" />
            <span>{lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="order-history-empty">
            <Package size={40} />
            <h3>{lang === 'ar' ? 'مفيش طلبات لسه' : 'No orders yet'}</h3>
            <p>{lang === 'ar' ? 'ابدأ بطلب مواد TMA من الكتالوج' : 'Start by ordering TMA materials from the catalog'}</p>
          </div>
        ) : (
          <div className="order-history-list">
            {orders.map(order => (
              <div className="order-history-card" key={order.id}>
                <div className="order-history-card-header">
                  <div className="order-history-course">
                    <strong dir="ltr">{order.course_code}</strong>
                    <span>{order.course_title || order.course_code}</span>
                  </div>
                  <span className={`order-status-badge ${statusColor(order.status)}`}>
                    {statusIcon(order.status)}{statusLabel(order.status)}
                  </span>
                </div>
                <div className="order-history-card-body">
                  <div className="order-history-row">
                    <span>{lang === 'ar' ? 'التاريخ' : 'Date'}</span>
                    <strong dir="ltr">{new Date(order.created_at).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</strong>
                  </div>
                  <div className="order-history-row">
                    <span>{lang === 'ar' ? 'المبلغ' : 'Amount'}</span>
                    <strong dir="ltr">{order.price_egp} {order.currency}</strong>
                  </div>
                  {order.referral_discount_pct && order.referral_discount_pct > 0 && (
                    <div className="order-history-row order-history-discount">
                      <span>{lang === 'ar' ? 'خصم إحالة' : 'Referral discount'}</span>
                      <strong dir="ltr">-{order.referral_discount_pct}%</strong>
                    </div>
                  )}
                  <div className="order-history-row">
                    <span>{lang === 'ar' ? 'رقم الطلب' : 'Order ID'}</span>
                    <strong dir="ltr" className="order-history-id">{order.id}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
});
