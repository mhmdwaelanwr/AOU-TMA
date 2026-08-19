import { memo, useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export type ToastMessage = {
  msg: string;
  ok?: boolean;
};

type Props = {
  toast: ToastMessage | null;
  onDismiss: () => void;
};

export const Toast = memo(function Toast({ toast, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);
      const t = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 300);
      }, 2600);
      return () => clearTimeout(t);
    } else {
      setVisible(false);
    }
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className={`toast-container ${visible ? 'toast-visible' : ''}`}>
      <div className={`toast ${toast.ok ? 'toast-ok' : 'toast-default'}`}>
        {toast.ok
          ? <CheckCircle2 size={16} className="toast-icon" />
          : <AlertCircle size={16} className="toast-icon" />
        }
        <span className="toast-msg">{toast.msg}</span>
        <button className="toast-close" onClick={() => { setVisible(false); setTimeout(onDismiss, 300); }} type="button">
          <X size={14} />
        </button>
      </div>
    </div>
  );
});
