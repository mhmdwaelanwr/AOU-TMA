import { memo } from 'react';
import { CircleCheckBig, Globe2, Search } from 'lucide-react';

type Props = { text: Record<string, string> };

export const HowItWorks = memo(function HowItWorks({ text }: Props) {
  const steps = [
    [Search, '01', text.step1Title, text.step1Copy],
    [Globe2, '02', text.step2Title, text.step2Copy],
    [CircleCheckBig, '03', text.step3Title, text.step3Copy],
  ] as const;
  return (
    <section id="how-it-works" className="how-section">
      <h2>{text.howTitle}</h2>
      <div className="steps-grid">
        {steps.map(([Icon, num, title, body]) => (
          <article className="step-card" key={num}>
            <div className="step-top"><span className="step-icon" aria-hidden="true"><Icon size={17} /></span><span className="step-num">{num}</span></div>
            <h3>{title}</h3>
            <p>{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
});
