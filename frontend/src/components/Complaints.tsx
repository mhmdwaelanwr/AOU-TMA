import { memo, useState } from 'react';
import { CheckCircle2, AlertTriangle, Bug, Lightbulb } from 'lucide-react';
import type { Language } from '../types';
import { API_URL } from '../lib/config';
import { useAuth } from '../lib/auth';

type Props = { lang: Language; text: Record<string, string> };
type ComplaintType = 'bug' | 'complaint' | 'suggestion';

export const Complaints = memo(function Complaints({ lang, text }: Props) {
  const { user, token } = useAuth();
  const [type, setType] = useState<ComplaintType>('bug');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState(false);
  const [sending, setSending] = useState(false);

  const types: { id: ComplaintType; icon: React.ReactNode; label: string }[] = [
    { id: 'bug', icon: <Bug size={16} />, label: text.complaintTypeBug },
    { id: 'complaint', icon: <AlertTriangle size={16} />, label: text.complaintTypeComplaint },
    { id: 'suggestion', icon: <Lightbulb size={16} />, label: text.complaintTypeSuggestion },
  ];

  async function handleSubmit() {
    const complaintName = name.trim() || user?.name || '';
    if (!complaintName || !subject || !description) return;
    setSending(true);
    try {
      await fetch(`${API_URL}/api/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: complaintName, type, subject, description }),
      });
    } catch {}
    setSending(false);
    setSuccess(true);
  }

  if (success) {
    return (
      <section className="complaints-section" id="complaints">
        <div className="complaints-container">
          <div className="complaints-success">
            <CheckCircle2 size={40} className="success-icon" />
            <h2>{text.complaintSuccess}</h2>
            <p>{text.complaintSuccessCopy}</p>
            <button className="primary-button" onClick={() => { setSuccess(false); setSubject(''); setDescription(''); }}>{lang === 'ar' ? 'تقديم شكوى تانية' : 'Submit another'}</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="complaints-section" id="complaints">
      <div className="complaints-container">
        <p className="section-eyebrow">SUPPORT</p>
        <h2 className="complaints-title">{text.complaintTitle}</h2>
        <p className="complaints-subtitle">{text.complaintSubtitle}</p>

        <div className="complaints-form">
          <div className="complaint-type-grid">
            {types.map(t => (
              <button key={t.id} className={`complaint-type-btn ${type === t.id ? 'active' : ''}`} onClick={() => setType(t.id)}>
                {t.icon}<span>{t.label}</span>
              </button>
            ))}
          </div>

          {!user && (
            <label className="form-field">
              <span>{lang === 'ar' ? 'الاسم' : 'Name'}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder={lang === 'ar' ? 'اسمك الكامل' : 'Your full name'} />
            </label>
          )}

          <label className="form-field">
            <span>{text.complaintSubject}</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder={lang === 'ar' ? 'موضوع الشكوى' : 'Complaint subject'} />
          </label>

          <label className="form-field">
            <span>{text.complaintDescription}</span>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={2000} placeholder={text.complaintDescriptionPlaceholder} />
          </label>

          <button className="primary-button complaints-btn" disabled={(!user && !name.trim()) || !subject || !description || sending} onClick={handleSubmit}>
            {sending ? text.submitting : text.complaintSubmit}
          </button>
        </div>
      </div>
    </section>
  );
});
