import { useRef, useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { TextReveal, FadeUp } from './Animations';

/* Beam lines that animate across the hero */
function BeamLines() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {/* Vertical beams */}
      {[20, 40, 60, 80].map((left) => (
        <div key={left} style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${left}%`,
          width: 1,
          background: 'rgba(255,255,255,0.03)',
        }}>
          <motion.div
            animate={{ y: ['-100%', '200%'] }}
            transition={{ duration: 4 + left * 0.02, repeat: Infinity, ease: 'linear', delay: left * 0.03 }}
            style={{
              width: '100%',
              height: '15%',
              background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.12), transparent)',
            }}
          />
        </div>
      ))}
      {/* Horizontal beams */}
      {[30, 70].map((top) => (
        <div key={top} style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${top}%`,
          height: 1,
          background: 'rgba(255,255,255,0.03)',
        }}>
          <motion.div
            animate={{ x: ['-100%', '300%'] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear', delay: top * 0.02 }}
            style={{
              width: '20%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* Radial mouse-tracking spotlight */
function MouseSpotlight() {
  const [pos, setPos] = useState({ x: '50%', y: '50%' });

  useEffect(() => {
    const fn = (e) => {
      setPos({ x: `${e.clientX}px`, y: `${e.clientY}px` });
    };
    window.addEventListener('mousemove', fn);
    return () => window.removeEventListener('mousemove', fn);
  }, []);

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background: `radial-gradient(800px circle at ${pos.x} ${pos.y}, rgba(255,255,255,0.015), transparent 50%)`,
      transition: 'background 0.1s',
    }} />
  );
}

export default function Hero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.6], [0, -80]);

  return (
    <section ref={ref} style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <BeamLines />
      <MouseSpotlight />

      {/* Gradient orbs */}
      <div style={{
        position: 'absolute', top: -200, left: '50%', transform: 'translateX(-50%)',
        width: 1000, height: 600, borderRadius: '50%',
        background: 'radial-gradient(ellipse, rgba(255,255,255,0.03) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <motion.div style={{ opacity, y, width: '100%' }}>
        <div className="container-narrow" style={{ textAlign: 'center', paddingTop: 160, paddingBottom: 120, position: 'relative', zIndex: 1 }}>

          {/* Badge */}
          <FadeUp delay={0}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '6px 14px', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 100, marginBottom: 40,
              background: 'rgba(255,255,255,0.03)',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px rgba(34,197,94,0.6)' }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: '#888', letterSpacing: '0.02em' }}>
                Платформа онлайн-тестирования
              </span>
            </div>
          </FadeUp>

          {/* Heading */}
          <h1 style={{
            fontSize: 'clamp(44px, 8vw, 80px)',
            fontWeight: 700,
            letterSpacing: '-0.05em',
            lineHeight: 1.0,
            marginBottom: 28,
            color: '#ededed',
          }}>
            <TextReveal delay={0.1}>Тесты которые</TextReveal>
            <br />
            <span className="shine-text">
              <TextReveal delay={0.25}>работают на вас</TextReveal>
            </span>
          </h1>

          {/* Subtitle */}
          <FadeUp delay={0.4}>
            <p style={{ fontSize: 17, color: '#888', lineHeight: 1.7, maxWidth: 440, margin: '0 auto 44px' }}>
              Создавайте тесты с&nbsp;помощью ИИ, проводите честное тестирование с&nbsp;античитом, анализируйте результаты в&nbsp;реальном времени.
            </p>
          </FadeUp>

          {/* Buttons */}
          <FadeUp delay={0.55}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <a
                href="https://unitest.page/register"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '12px 28px', fontSize: 14, fontWeight: 500,
                  color: '#000', background: '#ededed', borderRadius: 10,
                  textDecoration: 'none', transition: 'background 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.boxShadow = '0 0 24px rgba(255,255,255,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#ededed'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                Начать бесплатно
                <ArrowRight size={15} />
              </a>
              <a
                href="#demo"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '12px 28px', fontSize: 14, fontWeight: 500,
                  color: '#888', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                  textDecoration: 'none', transition: 'color 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#ededed'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = '#888'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              >
                Как это работает
              </a>
            </div>
          </FadeUp>

          {/* Beam separator */}
          <FadeUp delay={0.7}>
            <div style={{ margin: '72px auto 0', maxWidth: 600 }}>
              <div className="beam-line" />
            </div>
          </FadeUp>

          {/* Animated Mock UI preview */}
          <FadeUp delay={0.8}>
            <div style={{
              marginTop: 48,
              maxWidth: 680,
              marginLeft: 'auto',
              marginRight: 'auto',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.06)',
              background: '#0a0a0a',
              overflow: 'hidden',
              boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
            }}>
              {/* Top bar */}
              <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#333' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#333' }} />
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#333' }} />
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ height: 24, width: 200, background: 'rgba(255,255,255,0.04)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 10, color: '#555' }}>unitest.page/test/biology</span>
                  </div>
                </div>
              </div>
              {/* Content */}
              <div style={{ padding: 24, display: 'flex', gap: 16 }}>
                {/* Sidebar */}
                <div className="hidden md:flex" style={{ width: 140, flexShrink: 0, flexDirection: 'column', gap: 6 }}>
                  {['Мои тесты', 'Создать', 'Группы', 'Аналитика', 'Настройки'].map((item, i) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 1.0 + i * 0.08, duration: 0.3 }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 6,
                        background: i === 0 ? 'rgba(255,255,255,0.06)' : 'transparent',
                        fontSize: 12,
                        color: i === 0 ? '#ededed' : '#555',
                      }}
                    >
                      {item}
                    </motion.div>
                  ))}
                </div>
                {/* Main area */}
                <div style={{ flex: 1 }}>
                  {/* Title skeleton */}
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: '55%' }}
                    viewport={{ once: true }}
                    transition={{ delay: 1.1, duration: 0.6, ease: 'easeOut' }}
                    style={{ height: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginBottom: 10, overflow: 'hidden' }}
                  />
                  {/* Progress bar */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: '#555' }}>Прогресс</span>
                      <motion.span
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 2.0 }}
                        style={{ fontSize: 10, color: '#555', fontVariantNumeric: 'tabular-nums' }}
                      >
                        2/3
                      </motion.span>
                    </div>
                    <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: '0%' }}
                        whileInView={{ width: '66%' }}
                        viewport={{ once: true }}
                        transition={{ delay: 1.4, duration: 1.8, ease: 'easeOut' }}
                        style={{ height: '100%', background: '#ededed', borderRadius: 2 }}
                      />
                    </div>
                  </div>
                  {/* Question rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { label: 'Что такое фотосинтез?', checked: true, delay: 1.3 },
                      { label: 'Формула воды', checked: true, delay: 1.7 },
                      { label: 'Закон Ома', checked: false, delay: 2.1 },
                    ].map((row, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: row.delay, duration: 0.35 }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', borderRadius: 8,
                          border: `1px solid rgba(255,255,255,${row.checked ? '0.08' : '0.06'})`,
                          background: row.checked ? 'rgba(255,255,255,0.03)' : 'transparent',
                        }}
                      >
                        <motion.div
                          initial={{ scale: 0.5, opacity: 0 }}
                          whileInView={row.checked ? { scale: 1, opacity: 1, background: '#ededed', borderColor: '#ededed' } : { scale: 1, opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: row.delay + 0.2, duration: 0.25, type: 'spring', stiffness: 300 }}
                          style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                            border: '2px solid rgba(255,255,255,0.1)',
                            background: 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {row.checked && (
                            <motion.svg
                              width="8" height="8" viewBox="0 0 10 10" fill="none"
                              initial={{ pathLength: 0, opacity: 0 }}
                              whileInView={{ pathLength: 1, opacity: 1 }}
                              viewport={{ once: true }}
                              transition={{ delay: row.delay + 0.35, duration: 0.25 }}
                            >
                              <path d="M2 5L4 7L8 3" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </motion.svg>
                          )}
                        </motion.div>
                        <span style={{ fontSize: 12, color: row.checked ? '#888' : '#555' }}>{row.label}</span>
                        {row.checked && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: row.delay + 0.4 }}
                            style={{ marginLeft: 'auto', fontSize: 10, color: '#22c55e' }}
                          >
                            ✓
                          </motion.span>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeUp>

        </div>
      </motion.div>

      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 160,
        background: 'linear-gradient(transparent, #000)',
        pointerEvents: 'none',
      }} />
    </section>
  );
}
