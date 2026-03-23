import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Brain, Shield, BarChart3, Users, Globe, Zap,
  FileText, Shuffle, Award, MessageSquare, Clock, Smartphone,
} from 'lucide-react';
import SpotlightCard from './SpotlightCard';
import { FadeUp, Stagger, StaggerChild } from './Animations';

/*
  Bento grid: mixed sizes for visual interest.
  Wide cards get mini-visuals for richer look.
*/

/* Mini visual: AI generation sparkle animation */
function AIVisual() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
      {['Что такое ДНК?', 'Типы клеток', 'Функции белков'].map((q, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + i * 0.15, duration: 0.3 }}
          style={{
            padding: '5px 8px', borderRadius: 5, fontSize: 10,
            background: i === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.04)',
            color: i === 0 ? '#ededed' : '#555',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <span style={{ color: '#333', fontSize: 9 }}>{i + 1}.</span>
          {q}
          {i === 0 && <span style={{ marginLeft: 'auto', fontSize: 8, color: '#888', padding: '1px 4px', background: 'rgba(255,255,255,0.04)', borderRadius: 3 }}>ИИ</span>}
        </motion.div>
      ))}
    </div>
  );
}

/* Mini visual: 3 language tabs */
function LangVisual() {
  return (
    <div style={{ display: 'flex', gap: 4, minWidth: 140 }}>
      {[
        { lang: 'KZ', label: 'Қазақша', active: false },
        { lang: 'RU', label: 'Русский', active: true },
        { lang: 'EN', label: 'English', active: false },
      ].map((l, i) => (
        <div key={i} style={{
          flex: 1, padding: '6px 4px', borderRadius: 6, textAlign: 'center',
          background: l.active ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
          border: `1px solid rgba(255,255,255,${l.active ? '0.1' : '0.03'})`,
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: l.active ? '#ededed' : '#555' }}>{l.lang}</div>
          <div style={{ fontSize: 8, color: '#444', marginTop: 2 }}>{l.label}</div>
        </div>
      ))}
    </div>
  );
}

/* Mini visual: instant results bar chart */
function ResultsVisual() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 36, minWidth: 120 }}>
      {[40, 72, 55, 88, 65, 92, 78, 50].map((h, i) => (
        <motion.div
          key={i}
          initial={{ height: 0 }}
          whileInView={{ height: `${h}%` }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
          style={{
            flex: 1, borderRadius: 2,
            background: h > 75 ? 'rgba(255,255,255,0.2)' : h > 55 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
          }}
        />
      ))}
    </div>
  );
}

/* Mini visual: timer countdown */
function TimerVisual() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        border: '2px solid rgba(255,255,255,0.08)',
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Animated arc */}
        <svg width="36" height="36" viewBox="0 0 36 36" style={{ position: 'absolute', top: -1, left: -1 }}>
          <motion.circle
            cx="18" cy="18" r="15"
            fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray="94.25"
            initial={{ strokeDashoffset: 94.25 }}
            whileInView={{ strokeDashoffset: 24 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 1.5, ease: 'easeOut' }}
            transform="rotate(-90 18 18)"
          />
        </svg>
        <span style={{ fontSize: 9, fontWeight: 600, color: '#ededed', fontVariantNumeric: 'tabular-nums' }}>45:00</span>
      </div>
      <div>
        <div style={{ fontSize: 10, color: '#888' }}>Попытки: 2/3</div>
        <div style={{ fontSize: 9, color: '#444', marginTop: 1 }}>До 15 мар</div>
      </div>
    </div>
  );
}

const features = [
  { icon: Brain, title: 'ИИ-генерация', desc: 'Загрузите текст или тему — GPT создаст вопросы за секунды. Разные типы: один ответ, несколько, текстовый.', wide: true, visual: <AIVisual /> },
  { icon: Shield, title: 'Античит-система', desc: 'Блокировка вкладок, полноэкранный режим, рандомизация.' },
  { icon: BarChart3, title: 'Аналитика', desc: 'Графики сложности, процент правильных по каждому вопросу.' },
  { icon: Users, title: 'Группы', desc: 'Организуйте студентов, назначайте тесты, отслеживайте прогресс.' },
  { icon: Globe, title: '3 языка', desc: 'Полная поддержка казахского, русского и английского. Интерфейс и контент.', wide: true, visual: <LangVisual /> },
  { icon: Zap, title: 'Мгновенные результаты', desc: 'Автопроверка сразу после сдачи. Студент видит балл, преподаватель — статистику.', wide: true, visual: <ResultsVisual /> },
  { icon: FileText, title: 'Банк вопросов', desc: 'Сохраняйте вопросы и переиспользуйте в разных тестах.' },
  { icon: Shuffle, title: 'Билетная система', desc: 'Каждый студент получает уникальный вариант.' },
  { icon: Award, title: 'Частичные баллы', desc: '3 из 4 правильных — 75% балла. Честная оценка.' },
  { icon: MessageSquare, title: 'Комментарии', desc: 'Обсуждение результатов прямо на платформе.' },
  { icon: Clock, title: 'Таймер и попытки', desc: 'Ограничение по времени, количеству попыток, дате доступа.', wide: true, visual: <TimerVisual /> },
  { icon: Smartphone, title: 'Гостевой доступ', desc: 'Студенты проходят тест по ссылке — без регистрации.' },
];

function FeatureCard({ feature }) {
  return (
    <SpotlightCard style={{
      padding: 28,
      gridColumn: feature.wide ? 'span 2' : 'span 1',
      display: 'flex',
      flexDirection: feature.wide && feature.visual ? 'row' : 'column',
      gap: feature.wide && feature.visual ? 24 : 12,
      alignItems: feature.wide && feature.visual ? 'center' : 'flex-start',
    }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.03)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <feature.icon size={18} color="#ededed" />
        </div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: '#ededed' }}>
          {feature.title}
        </h3>
        <p style={{ fontSize: 14, color: '#888', lineHeight: 1.65 }}>
          {feature.desc}
        </p>
      </div>
      {feature.visual && (
        <div className="hidden md:block" style={{
          flexShrink: 0,
          padding: 12,
          borderRadius: 10,
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          {feature.visual}
        </div>
      )}
    </SpotlightCard>
  );
}

export default function Features() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start end', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], [20, -20]);

  return (
    <section id="features" ref={sectionRef} style={{ position: 'relative', padding: '120px 0', overflow: 'hidden' }}>
      {/* Background dot pattern */}
      <motion.div className="dot-grid" style={{
        y: bgY,
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.5,
      }} />

      <div className="container-main" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <FadeUp>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
              Возможности
            </p>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: '#ededed', letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: 16 }}>
              Всё, что нужно.
              <br />
              <span style={{ color: '#555' }}>Ничего лишнего.</span>
            </h2>
          </FadeUp>
        </div>

        <Stagger stagger={0.06} style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}>
          {features.map((f) => (
            <StaggerChild key={f.title} style={{ gridColumn: f.wide ? 'span 2' : 'span 1' }}>
              <FeatureCard feature={f} />
            </StaggerChild>
          ))}
        </Stagger>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #features [style*="grid-template-columns: repeat(3"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          #features [style*="grid-column: span 2"] {
            grid-column: span 2 !important;
          }
        }
        @media (max-width: 480px) {
          #features [style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
          #features [style*="grid-column: span 2"] {
            grid-column: span 1 !important;
          }
        }
      `}</style>
    </section>
  );
}
