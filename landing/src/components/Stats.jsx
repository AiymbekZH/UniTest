import { useRef, useEffect, useState } from 'react';
import { motion, useInView } from 'framer-motion';

const stats = [
  { value: 3, suffix: '', label: 'Языка интерфейса', sub: 'KZ · RU · EN' },
  { value: 12, suffix: '+', label: 'Типов вопросов', sub: 'Один, несколько, текстовый...' },
  { value: 5, suffix: ' мин', label: 'На создание теста', sub: 'С помощью ИИ-генерации' },
  { value: 0, suffix: '₸', label: 'Для начала работы', sub: 'Без кредитной карты' },
];

function Counter({ value, suffix }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView || value === 0) {
      if (isInView) setCount(0);
      return;
    }
    const dur = 1500;
    const start = performance.now();
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * value));
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [isInView, value]);

  return <span ref={ref}>{count}{suffix}</span>;
}

export default function Stats() {
  return (
    <section style={{ position: 'relative', padding: '48px 0', overflow: 'hidden' }}>
      {/* Top beam */}
      <div className="beam-line" />

      <div className="container-main" style={{ padding: '48px 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
        }}>
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              style={{
                textAlign: 'center',
                padding: '16px 0',
                borderRight: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}
            >
              <div style={{
                fontSize: 'clamp(28px, 4vw, 40px)',
                fontWeight: 700,
                color: '#ededed',
                letterSpacing: '-0.03em',
                lineHeight: 1.2,
                fontVariantNumeric: 'tabular-nums',
              }}>
                <Counter value={s.value} suffix={s.suffix} />
              </div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
                {s.label}
              </div>
              {s.sub && (
                <div style={{ fontSize: 11, color: '#444', marginTop: 2 }}>
                  {s.sub}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom beam */}
      <div className="beam-line" />

      <style>{`
        @media (max-width: 640px) {
          section [style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
      `}</style>
    </section>
  );
}
