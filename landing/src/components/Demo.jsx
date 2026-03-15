import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { PenTool, Share2, BarChart3, ArrowRight } from 'lucide-react';
import SpotlightCard from './SpotlightCard';
import { FadeUp } from './Animations';

const steps = [
  {
    num: '01',
    icon: PenTool,
    title: 'Создайте тест',
    desc: 'Загрузите материал или опишите тему — ИИ сгенерирует вопросы. Или добавьте вручную. Настройте время, попытки, античит.',
    visual: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '4px 0' }}>
        {['Что такое фотосинтез?', 'Формула воды', 'Закон Ома'].map((q, i) => (
          <div key={i} style={{
            padding: '8px 12px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.06)',
            background: i === 0 ? 'rgba(255,255,255,0.04)' : 'transparent',
            fontSize: 12, color: i === 0 ? '#ededed' : '#555',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ color: '#333', fontSize: 11 }}>{i + 1}.</span>
            {q}
          </div>
        ))}
      </div>
    ),
  },
  {
    num: '02',
    icon: Share2,
    title: 'Поделитесь',
    desc: 'Скопируйте ссылку или покажите QR-код. Студенты начинают тест в один клик. Регистрация не нужна.',
    visual: (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, padding: 8,
        }}>
          {[...Array(16)].map((_, i) => (
            <div key={i} style={{
              background: [0,1,4,5,6,9,10,12,14,15].includes(i)
                ? 'rgba(255,255,255,0.6)' : 'transparent',
              borderRadius: 1,
            }} />
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 11, color: '#555', marginBottom: 4,
          }}>Ссылка на тест:</div>
          <div style={{
            padding: '6px 10px', borderRadius: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            fontSize: 11, color: '#888', fontFamily: 'monospace',
          }}>
            unitest.page/t/abc123
          </div>
        </div>
      </div>
    ),
  },
  {
    num: '03',
    icon: BarChart3,
    title: 'Анализируйте',
    desc: 'Результаты в реальном времени. Графики, рейтинг студентов, статистика по каждому вопросу.',
    visual: (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 48, padding: '0 4px' }}>
        {[65, 82, 45, 91, 73, 88, 56, 94, 70, 85, 60, 77].map((h, i) => (
          <div key={i} style={{
            flex: 1,
            height: `${h}%`,
            borderRadius: 2,
            background: h > 80
              ? 'rgba(255,255,255,0.25)'
              : h > 60
                ? 'rgba(255,255,255,0.12)'
                : 'rgba(255,255,255,0.06)',
          }} />
        ))}
      </div>
    ),
  },
];

export default function Demo() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const lineHeight = useTransform(scrollYProgress, [0.1, 0.8], ['0%', '100%']);

  return (
    <section id="demo" ref={sectionRef} style={{ position: 'relative', padding: '120px 0' }}>
      <div className="container-main" style={{ position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <FadeUp>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Как это работает
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: '#ededed', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
              Три шага до результата
            </h2>
          </FadeUp>
        </div>

        {/* Steps with connecting line */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720, margin: '0 auto', position: 'relative' }}>
          {/* Vertical connecting line (animated on scroll) */}
          <div style={{
            position: 'absolute',
            left: 28,
            top: 56,
            bottom: 56,
            width: 1,
            background: 'rgba(255,255,255,0.04)',
          }}>
            <motion.div
              style={{
                width: '100%',
                height: lineHeight,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
              }}
            />
          </div>

          {steps.map((step, i) => (
            <FadeUp key={step.num} delay={i * 0.15}>
              <SpotlightCard style={{ padding: 0, display: 'flex', overflow: 'hidden' }}>
                <div style={{ display: 'flex', width: '100%' }}>
                  {/* Left: number + icon */}
                  <div style={{
                    width: 56, flexShrink: 0,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                    padding: '24px 0',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#333', letterSpacing: '0.05em' }}>
                      {step.num}
                    </span>
                    <step.icon size={18} color="#888" style={{ marginTop: 8 }} />
                  </div>
                  {/* Right: content */}
                  <div style={{ flex: 1, padding: 24, display: 'flex', gap: 24, alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: 17, fontWeight: 600, color: '#ededed', marginBottom: 6 }}>
                        {step.title}
                      </h3>
                      <p style={{ fontSize: 14, color: '#888', lineHeight: 1.65 }}>
                        {step.desc}
                      </p>
                    </div>
                    {/* Mini visual */}
                    <div className="hidden md:block" style={{
                      width: 200, flexShrink: 0,
                      padding: 12, borderRadius: 10,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                    }}>
                      {step.visual}
                    </div>
                  </div>
                </div>
              </SpotlightCard>
            </FadeUp>
          ))}
        </div>
      </div>
    </section>
  );
}
